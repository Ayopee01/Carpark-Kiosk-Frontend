// Import Lib
import { ApiClientError, buildApiUrl, handleDeviceAccessError, toApiErrorResponse } from "@/src/app/lib/api/client-api";
import { getDeviceAuthHeaders } from "@/src/app/lib/device";
// Import Types
import type { ClientStreamEvent, GateAction, LprDetectedEvent } from "@/src/app/type/api.type";
import type { ClientEventStreamOptions } from "@/src/app/type/realtime.type";

/* -------------------------------------- Config -------------------------------------- */

// Config ระยะ reconnect ครั้งแรก (เพิ่มเป็น 2 เท่าทุกครั้งที่ต่อไม่ติด)
const RECONNECT_BASE_MS = 1000;
// Config ระยะ reconnect สูงสุด
const RECONNECT_MAX_MS = 30000;
// Config เวลาเผื่อ: ไม่มีข้อมูลนานเกิน pingIntervalMs x 2 + ค่านี้ ถือว่า connection ตาย
const PING_GRACE_MS = 5000;
// Config action ที่รู้จักของ lpr_detected
const GATE_ACTIONS = new Set<GateAction>(["OPEN_GATE", "PAYMENT_REQUIRED", "TRANSACTION_NOT_FOUND", "IGNORE_DUPLICATE", "IGNORE_ACTIVE_TRANSACTION"]);

/* -------------------------------------- Parsers -------------------------------------- */

// Function ตรวจว่าค่าเป็น object ที่ไม่ใช่ array
function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Function แปลงค่าเป็น string หรือ null
function toStringOrNull(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

// Function แปลงค่าเป็นตัวเลข (ไม่ใช่ตัวเลขคืน 0)
function toNumberOrZero(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// Function narrow lpr_detected (openGate ที่ไม่ใช่ boolean ถือเป็น false เพื่อไม่เปิดไม้กั้นโดยไม่ตั้งใจ)
function parseLprDetectedEvent(value: Record<string, unknown>): LprDetectedEvent | null {
    const direction = value.direction;
    if (typeof value.plateNo !== "string" || (direction !== "IN" && direction !== "OUT")) return null;

    const action = GATE_ACTIONS.has(value.action as GateAction) ? (value.action as GateAction) : null;
    const capturedAt = toStringOrNull(value.capturedAt) ?? new Date().toISOString();

    return {
        type: "lpr_detected",
        success: value.success === true,
        openGate: value.openGate === true,
        action,
        message: toStringOrNull(value.message),
        transactionId: toStringOrNull(value.transactionId),
        plateNo: value.plateNo,
        vehicleType: value.vehicleType === "motorcycle" ? "motorcycle" : "car",
        cameraId: toStringOrNull(value.cameraId) ?? "",
        gateId: toStringOrNull(value.gateId),
        direction,
        status: toStringOrNull(value.status) as LprDetectedEvent["status"],
        exitTimeLimit: toStringOrNull(value.exitTimeLimit),
        paymentRequired: value.paymentRequired === true,
        reason: toStringOrNull(value.reason),
        remainingAmount: toNumberOrZero(value.remainingAmount),
        netAmount: toNumberOrZero(value.netAmount),
        totalPaid: toNumberOrZero(value.totalPaid),
        checkedAt: toStringOrNull(value.checkedAt) ?? capturedAt,
        capturedAt,
        emittedAt: toStringOrNull(value.emittedAt) ?? capturedAt,
    };
}

// Function narrow JSON ของ SSE เป็น ClientStreamEvent (event ที่ไม่รู้จักคืน null)
function parseClientStreamEvent(value: unknown): ClientStreamEvent | null {
    if (!isRecord(value)) return null;

    switch (value.type) {
        case "connected":
            return {
                type: "connected",
                message: toStringOrNull(value.message) ?? "",
                pingIntervalMs: toNumberOrZero(value.pingIntervalMs),
                clientType:
                    value.clientType === "kiosk" ||
                    value.clientType === "barrier_gate" ||
                    value.clientType === "mobile" ||
                    value.clientType === "public"
                        ? value.clientType
                        : undefined,
            };
        case "ping":
            return { type: "ping", at: toStringOrNull(value.at) ?? new Date().toISOString() };
        case "theme_updated":
            return { type: "theme_updated", theme: isRecord(value.theme) ? value.theme : {} };
        case "payment_settings_updated":
            return { type: "payment_settings_updated", at: toStringOrNull(value.at) ?? "" };
        case "device_revoked":
            return { type: "device_revoked", reason: toStringOrNull(value.reason) ?? "", at: toStringOrNull(value.at) ?? "" };
        case "lpr_detected":
            return parseLprDetectedEvent(value);
        default:
            return null;
    }
}

// Function แปลงข้อความ SSE หนึ่งก้อน (คั่นด้วยบรรทัดว่าง) เป็น JSON จากบรรทัด data:
function parseSseMessage(rawMessage: string): unknown {
    const data = rawMessage
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n");

    if (!data) return null;

    try {
        return JSON.parse(data) as unknown;
    } catch {
        return null;
    }
}

/* -------------------------------------- Functions -------------------------------------- */

// Function เปิด GET /client/events ด้วย fetch (ส่ง device headers ได้) พร้อม reconnect แบบ backoff คืน function ปิด stream
function openClientEventStream({ query, onEvent, onStateChange }: ClientEventStreamOptions): () => void {
    let stopped = false;
    let attempt = 0;
    let controller: AbortController | null = null;
    let reconnectTimer: number | null = null;
    let watchdogTimer: number | null = null;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
        if (typeof value === "string" && value) params.set(key, value);
    }
    const queryString = params.toString();
    const url = queryString ? `${buildApiUrl("/client/events")}?${queryString}` : buildApiUrl("/client/events");

    const clearWatchdog = (): void => {
        if (watchdogTimer !== null) window.clearInterval(watchdogTimer);
        watchdogTimer = null;
    };

    const scheduleReconnect = (): void => {
        if (stopped) return;
        onStateChange?.("disconnected");

        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
        attempt += 1;
        reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            void connect();
        }, delay + Math.random() * 500);
    };

    const connect = async (): Promise<void> => {
        if (stopped) return;

        const currentController = new AbortController();
        controller = currentController;
        onStateChange?.("connecting");

        let lastActivityAt = Date.now();

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { Accept: "text/event-stream", ...getDeviceAuthHeaders() },
                cache: "no-store",
                credentials: "omit",
                signal: currentController.signal,
            });

            if (!response.ok || !response.body) {
                const data: unknown = await response.json().catch(() => null);
                const error = new ApiClientError(response.status, toApiErrorResponse(response.status, data));

                // token ใช้ไม่ได้หรือ maintenance: เปลี่ยนหน้าแล้วหยุด reconnect
                if (handleDeviceAccessError(error)) {
                    stopped = true;
                    return;
                }

                throw error;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (!stopped) {
                const { done, value } = await reader.read();
                if (done) break;

                lastActivityAt = Date.now();
                buffer += decoder.decode(value, { stream: true });
                const messages = buffer.split(/\r?\n\r?\n/);
                buffer = messages.pop() ?? "";

                for (const rawMessage of messages) {
                    const event = parseClientStreamEvent(parseSseMessage(rawMessage));
                    if (!event) continue;

                    if (event.type === "connected") {
                        attempt = 0;
                        onStateChange?.("connected");
                        clearWatchdog();

                        // ตั้ง watchdog จากรอบ ping จริงของ server เพื่อ reconnect เมื่อ stream เงียบ
                        if (event.pingIntervalMs > 0) {
                            const timeoutMs = event.pingIntervalMs * 2 + PING_GRACE_MS;
                            watchdogTimer = window.setInterval(() => {
                                if (Date.now() - lastActivityAt > timeoutMs) currentController.abort();
                            }, event.pingIntervalMs);
                        }
                    }

                    onEvent(event);
                }
            }
        } catch (error) {
            if (!currentController.signal.aborted && !stopped) {
                console.warn("Client event stream disconnected:", error);
            }
        } finally {
            clearWatchdog();
        }

        if (controller === currentController) controller = null;
        scheduleReconnect();
    };

    void connect();

    return () => {
        stopped = true;
        clearWatchdog();
        if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
        controller?.abort();
    };
}

export { openClientEventStream, parseClientStreamEvent };
