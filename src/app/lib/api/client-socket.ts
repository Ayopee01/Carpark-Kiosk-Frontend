// Import Library
import { io, type Socket } from "socket.io-client";
import { z } from "zod";
// Import Lib
import { API_BASE_URL, ApiClientError, DEVICE_AUTH_LIMIT_CODE, handleDeviceAccessError, handleDeviceRevoked } from "@/src/app/lib/api/client-api";
import { getStoredDeviceCredential } from "@/src/app/lib/device";
import { getDeviceAuthPauseRemainingMs, pauseDeviceAuth } from "@/src/app/lib/device-auth-pause";
import { nullableStringSchema, numberOrZeroSchema } from "@/src/app/lib/schema";
// Import Types
import type { ClientLprFilter, ClientSocketEvent, GateAction, LprDetectedEvent, PaymentUpdatedEvent, RealtimeConnectErrorData, SocketAck } from "@/src/app/type/api.type";
import type { ClientSocketListener, ClientSocketState, PaymentUpdatedListener } from "@/src/app/type/realtime.type";

/* -------------------------------------- Config -------------------------------------- */

// Config namespace ของ Kiosk / Barrier Gate / Mobile บน Socket.IO
const CLIENT_NAMESPACE = "/client";
// Config path ของ Socket.IO บน host เดียวกับ API
const SOCKET_PATH = "/socket.io";
// Config ระยะต่อใหม่ครั้งแรกเมื่อ server ปฏิเสธ handshake (Socket.IO ไม่ reconnect ให้ในกรณีนี้) เพิ่มเป็น 2 เท่าทุกครั้ง
const RECONNECT_BASE_MS = 1000;
// Config ระยะต่อใหม่สูงสุด
const RECONNECT_MAX_MS = 30000;
// Config action ที่รู้จักของ lpr:detected
const GATE_ACTIONS: GateAction[] = ["OPEN_GATE", "PAYMENT_REQUIRED", "TRANSACTION_NOT_FOUND", "IGNORE_DUPLICATE", "IGNORE_ACTIVE_TRANSACTION"];

/* -------------------------------------- Schemas -------------------------------------- */

// Schema เวลาที่ไม่มีให้ใช้เวลาปัจจุบัน
const nowIfMissingSchema = z.string().catch(() => new Date().toISOString());

// Schema lpr:detected (openGate ที่ไม่ใช่ boolean ถือเป็น false เพื่อไม่เปิดไม้กั้นโดยไม่ตั้งใจ, ต้องมี plateNo และ direction)
const lprDetectedEventSchema = z
    .object({
        success: z.boolean().catch(false),
        openGate: z.boolean().catch(false),
        action: z.enum(GATE_ACTIONS).nullable().catch(null),
        message: nullableStringSchema,
        transactionId: nullableStringSchema,
        plateNo: z.string(),
        vehicleType: z.enum(["car", "motorcycle"]).catch("car"),
        cameraId: z.string().catch(""),
        gateId: nullableStringSchema,
        direction: z.enum(["IN", "OUT"]),
        status: nullableStringSchema.transform((status) => status as LprDetectedEvent["status"]),
        exitTimeLimit: nullableStringSchema,
        paymentRequired: z.boolean().catch(false),
        reason: nullableStringSchema,
        remainingAmount: numberOrZeroSchema,
        netAmount: numberOrZeroSchema,
        totalPaid: numberOrZeroSchema,
        checkedAt: nullableStringSchema,
        capturedAt: nowIfMissingSchema,
        emittedAt: nullableStringSchema,
    })
    .transform((event): LprDetectedEvent => ({
        ...event,
        type: "lpr_detected",
        checkedAt: event.checkedAt ?? event.capturedAt,
        emittedAt: event.emittedAt ?? event.capturedAt,
    }));

// Schema payments:updated (ต้องมี chargeId และ paymentStatus, คง field อื่นไว้)
const paymentUpdatedEventSchema = z.looseObject({ chargeId: z.string(), paymentStatus: z.string() });

// Schema ของ event แต่ละชื่อบน namespace /client แปลงเป็น ClientSocketEvent ที่หน้าจอใช้
const clientSocketEventSchemas = {
    ready: z
        .object({
            clientType: z.enum(["kiosk", "barrier_gate", "mobile", "public"]).catch("public"),
            heartbeatIntervalMs: numberOrZeroSchema,
        })
        .transform((event): ClientSocketEvent => ({ type: "ready", ...event })),
    "theme:updated": z
        .object({ theme: z.record(z.string(), z.unknown()).catch({}) })
        .transform((event): ClientSocketEvent => ({ type: "theme_updated", ...event })),
    "payment_settings:updated": z
        .object({ at: z.string().catch("") })
        .transform((event): ClientSocketEvent => ({ type: "payment_settings_updated", ...event })),
    "device:revoked": z
        .object({ reason: z.string().catch(""), at: z.string().catch("") })
        .transform((event): ClientSocketEvent => ({ type: "device_revoked", ...event })),
    "lpr:detected": lprDetectedEventSchema,
} satisfies Record<string, z.ZodType<ClientSocketEvent, unknown>>;

// Schema data ของ connect_error ที่ server ปฏิเสธ
const connectErrorDataSchema = z
    .object({
        statusCode: numberOrZeroSchema,
        code: nullableStringSchema,
        reason: z.string().optional().catch(undefined),
        details: z.record(z.string(), z.unknown()).optional().catch(undefined),
    })
    .nullable()
    .catch(null);

/* -------------------------------------- State -------------------------------------- */

// socket เดียวของทั้งแอป (Provider, หน้าไม้กั้น และ Popup ชำระเงินใช้ร่วมกัน)
let socket: Socket | null = null;
let state: ClientSocketState = "connecting";
let lprFilter: ClientLprFilter = {};
let revoked = false;
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<ClientSocketListener>();

/* -------------------------------------- Helpers -------------------------------------- */

// Function เปลี่ยนสถานะการเชื่อมต่อแล้วแจ้งทุก listener
function setState(nextState: ClientSocketState): void {
    state = nextState;
    listeners.forEach((listener) => listener.onStateChange?.(nextState));
}

// Function ส่ง event ให้ทุก listener
function emitToListeners(event: ClientSocketEvent): void {
    listeners.forEach((listener) => listener.onEvent?.(event));
}

// Function สร้าง auth ของ handshake ทุกครั้งที่ต่อ (ใช้ credential และตัวกรองล่าสุด) Mobile ไม่มี credential จึงส่ง object ว่าง
function buildAuth(): Record<string, string> {
    const credential = getStoredDeviceCredential();
    if (!credential) return {};

    const auth: Record<string, string> = { deviceId: credential.deviceId.trim(), deviceToken: credential.deviceToken.trim() };
    for (const [key, value] of Object.entries(lprFilter)) {
        if (typeof value === "string" && value) auth[key] = value;
    }
    return auth;
}

// Function ยกเลิกการต่อใหม่ที่ตั้งเวลาไว้
function clearRetry(): void {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
}

// Function ต่อใหม่เองหลังเวลาที่กำหนด (ใช้เมื่อ Socket.IO ไม่ reconnect ให้ เช่น server ปฏิเสธ handshake หรือตัด connection เอง)
function scheduleConnect(delayMs: number): void {
    clearRetry();
    setState("disconnected");
    retryTimer = setTimeout(() => {
        retryTimer = null;
        connectNow();
    }, delayMs);
}

// Function ต่อ socket ทันที ยกเว้นยังถูกพักจาก 429 (รอจนครบ Retry-After)
function connectNow(): void {
    if (!socket || revoked) return;

    const pauseMs = getDeviceAuthPauseRemainingMs();
    if (pauseMs > 0) {
        scheduleConnect(pauseMs);
        return;
    }

    setState("connecting");
    socket.connect();
}

// Function คำนวณ backoff ของการต่อใหม่เอง
function nextBackoffMs(): number {
    const backoff = Math.min(RECONNECT_BASE_MS * 2 ** retryAttempt, RECONNECT_MAX_MS) + Math.random() * 500;
    retryAttempt += 1;
    return backoff;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลง payload ของ event ตามชื่อ event เป็น ClientSocketEvent (ชื่อหรือรูปแบบที่ไม่รู้จักคืน null)
function parseClientSocketEvent(name: string, payload: unknown): ClientSocketEvent | null {
    const schema = clientSocketEventSchemas[name as keyof typeof clientSocketEventSchemas];
    return schema?.safeParse(payload).data ?? null;
}

// Function จัดการ connect_error ที่ server ปฏิเสธ ใช้กฎเดียวกับ REST คืน true ถ้าเปลี่ยนหน้าแล้ว (ไม่ต้องต่อใหม่)
// 429 TOO_MANY_DEVICE_AUTH_ATTEMPTS พักการยืนยันตัวตนตาม details.retryAfter (วินาที) แล้วคืน false ให้ผู้เรียกต่อใหม่หลังครบเวลา
function handleClientConnectError(data: RealtimeConnectErrorData): boolean {
    if (!data.code) return false;

    if (data.code === DEVICE_AUTH_LIMIT_CODE) {
        const retryAfter = Number(data.details?.retryAfter);
        pauseDeviceAuth(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null);
        return false;
    }

    return handleDeviceAccessError(new ApiClientError(data.statusCode, { message: data.code, code: data.code, ...data.details, reason: data.reason }));
}

// Function สร้าง socket ของ namespace /client (ยังไม่ต่อ) พร้อมผูก listener ทันทีก่อนต่อ เพราะ server ส่ง ready ทันทีที่ต่อได้
function createClientSocket(): Socket {
    const nextSocket = io(`${API_BASE_URL || window.location.origin}${CLIENT_NAMESPACE}`, {
        path: SOCKET_PATH,
        autoConnect: false,
        withCredentials: false,
        auth: (cb) => cb(buildAuth()),
    });

    nextSocket.on("connect", () => {
        retryAttempt = 0;
        clearRetry();
        setState("connected");
    });

    nextSocket.on("connect_error", (error) => {
        const data = connectErrorDataSchema.parse((error as Error & { data?: unknown }).data);

        // ไม่มี data = network ขัดข้อง Socket.IO reconnect ให้เอง
        if (!data || nextSocket.active) {
            setState("disconnected");
            return;
        }

        if (handleClientConnectError(data)) {
            clearRetry();
            setState("disconnected");
            return;
        }

        // server ปฏิเสธ handshake (เช่น 429, 500) Socket.IO ไม่ reconnect ให้ จึงต่อใหม่เองหลัง backoff หรือหลังครบเวลาพัก
        scheduleConnect(Math.max(nextBackoffMs(), getDeviceAuthPauseRemainingMs()));
    });

    nextSocket.on("disconnect", (reason) => {
        setState("disconnected");
        // server ตัดเอง (ไม่ใช่ device:revoked) = อุปกรณ์ถูกปิดหรือ IP ไม่อยู่ใน allowedIps ต่อใหม่เพื่อรับ connect_error reason ที่แท้จริง
        if (reason === "io server disconnect" && !revoked) scheduleConnect(nextBackoffMs());
    });

    nextSocket.onAny((name: string, payload: unknown) => {
        const event = parseClientSocketEvent(name, payload);
        if (!event) return;

        // token ใช้ไม่ได้แล้ว (Admin ออก activation code ใหม่ หรือลบอุปกรณ์) ห้ามต่อใหม่
        if (event.type === "device_revoked") {
            revoked = true;
            clearRetry();
        }

        emitToListeners(event);
        if (event.type === "device_revoked") handleDeviceRevoked(event.reason);
    });

    return nextSocket;
}

// Function ปิด socket เมื่อไม่มีผู้ใช้แล้ว
function closeClientSocket(): void {
    clearRetry();
    socket?.removeAllListeners();
    socket?.offAny();
    socket?.disconnect();
    socket = null;
    revoked = false;
    retryAttempt = 0;
    state = "connecting";
}

// Function รับ event และสถานะของ socket /client (ต่อเมื่อมีผู้ใช้คนแรก ปิดเมื่อไม่มีผู้ใช้แล้ว) คืน function เลิกรับ
function subscribeClientSocket(listener: ClientSocketListener): () => void {
    listeners.add(listener);
    listener.onStateChange?.(state);

    if (!socket) {
        socket = createClientSocket();
        connectNow();
    }

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) closeClientSocket();
    };
}

// Function ต่อใหม่ทันทีด้วย credential และตัวกรองล่าสุด (เช่นหลัง Activate) handshake auth ส่งได้ตอนต่อเท่านั้น
function reconnectClientSocket(): void {
    if (!socket) return;

    revoked = false;
    retryAttempt = 0;
    clearRetry();
    socket.disconnect();
    connectNow();
}

// Function ตั้งตัวกรอง lpr:detected (gateId / direction / cameraId) แล้วต่อใหม่ถ้าค่าเปลี่ยน
function setClientLprFilter(filter: ClientLprFilter): void {
    const changed = (["gateId", "direction", "cameraId"] as const).some((key) => (filter[key] ?? null) !== (lprFilter[key] ?? null));
    lprFilter = { ...filter };
    if (changed) reconnectClientSocket();
}

// Function ติดตามผลชำระเงินของ chargeId ผ่าน payments:subscribe (subscribe ใหม่ทุกครั้งที่ต่อได้ รวม reconnect) คืน function เลิกติดตาม
// ack ได้สถานะล่าสุด (replayed: true) ถ้า charge จบแล้ว ไม่งั้น null
function subscribePaymentUpdates(chargeId: string, onPaymentUpdated: PaymentUpdatedListener): () => void {
    let stopped = false;

    const notify = (payload: unknown): void => {
        const event = paymentUpdatedEventSchema.safeParse(payload).data;
        if (!stopped && event?.chargeId === chargeId) onPaymentUpdated(event as unknown as PaymentUpdatedEvent);
    };

    const subscribe = async (): Promise<void> => {
        const current = socket;
        if (!current?.connected) return;

        try {
            const ack = (await current.emitWithAck("payments:subscribe", { chargeId })) as SocketAck<unknown>;
            if (!ack.ok) {
                console.warn("payments:subscribe failed:", ack.error);
                return;
            }
            if (ack.data) notify(ack.data);
        } catch (error) {
            console.warn("payments:subscribe failed:", error);
        }
    };

    const unsubscribe = subscribeClientSocket({
        onStateChange: (nextState) => {
            if (nextState === "connected") void subscribe();
        },
    });
    socket?.on("payments:updated", notify);

    return () => {
        stopped = true;
        if (socket?.connected) socket.emit("payments:unsubscribe");
        socket?.off("payments:updated", notify);
        unsubscribe();
    };
}

export { handleClientConnectError, parseClientSocketEvent, reconnectClientSocket, setClientLprFilter, subscribeClientSocket, subscribePaymentUpdates };
