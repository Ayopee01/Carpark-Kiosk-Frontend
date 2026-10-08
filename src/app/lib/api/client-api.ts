// Import Lib
import { clearDeviceStorage, getDeviceAuthHeaders, getStoredDeviceCredential } from "@/src/app/lib/device";
// Import Types
import type { ActivateRequest, ActivateResponse, ApiErrorResponse, ClientConfigResponse, ClientPaymentMethodsResponse, ClientPlateLookupMultiple, ClientRequestOptions, ClientTransaction, ClientTransactionLookupResponse, CreateChargeRequest, CreateChargeResponse, EdcPaymentRequest, EdcPaymentResponse, HeartbeatRequest, HeartbeatResponse, TestPaymentRequest, TestPaymentResponse } from "@/src/app/type/api.type";

/* -------------------------------------- Config -------------------------------------- */

// Config origin ของ Backend เช่น https://carpark-uat.biza.me (ไม่มี /api ต่อท้าย ฝังตอน build)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
// Config prefix ของทุกเส้นใน Backend
const API_PREFIX = "/api";
// Config code ที่ frontend ใช้เมื่อ request ไม่ถึง Backend (network หรือ CORS)
const NETWORK_ERROR_CODE = "NETWORK_ERROR";
// Config code ที่ frontend ใช้เมื่อ Backend ตอบสำเร็จแต่ body ไม่ใช่ JSON
const INVALID_RESPONSE_CODE = "INVALID_BACKEND_RESPONSE";
// Config หน้าที่ใช้เมื่อต้องกรอก activation code ใหม่
const ACTIVATE_PATH = "/landing/activate";
// Config หน้าล็อกเมื่ออุปกรณ์ปิดปรับปรุงหรือใช้งานไม่ได้ชั่วคราว
const MAINTENANCE_PATH = "/landing/maintenance";
// Config code ที่แปลว่า token ของอุปกรณ์ใช้ไม่ได้แล้ว ต้องกรอก activation code ใหม่จาก Admin
const DEVICE_REACTIVATE_CODES = new Set(["INVALID_DEVICE", "UNAUTHORIZED_DEVICE", "DEVICE_CREDENTIALS_REQUIRED"]);
// Config reason ของ INVALID_DEVICE_CREDENTIALS ที่ token ยังถูกต้อง (ไม่ล้าง token แต่ล็อกหน้าจอ)
const DEVICE_LOCKED_REASONS = new Set(["inactive", "ip_not_allowed"]);

/* -------------------------------------- Error Helpers -------------------------------------- */

// Class error กลางของทุก request (code ใช้เขียน logic, message ใช้แสดงผลเท่านั้น)
class ApiClientError extends Error {
    readonly status: number;
    readonly code: string;
    readonly body: ApiErrorResponse;

    constructor(status: number, body: ApiErrorResponse) {
        super(body.message);
        this.name = "ApiClientError";
        this.status = status;
        this.code = body.code;
        this.body = body;
    }

    // Function อ่านค่าเพิ่มเติมของ error เช่น reason, candidates, minimumAmount
    detail(key: string): unknown {
        return this.body[key];
    }
}

// Function แปลง body ของ error เป็น ApiErrorResponse (ไม่มี code ใช้ HTTP_<status>)
function toApiErrorResponse(status: number, data: unknown): ApiErrorResponse {
    const body = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

    return {
        ...body,
        message: typeof body.message === "string" ? body.message : `Request failed (${status})`,
        code: typeof body.code === "string" ? body.code : `HTTP_${status}`,
    };
}

// Function ตรวจว่า error เป็น ApiClientError ที่มี code ตามที่ระบุ
function hasErrorCode(error: unknown, ...codes: string[]): error is ApiClientError {
    return error instanceof ApiClientError && codes.includes(error.code);
}

/* -------------------------------------- Helpers -------------------------------------- */

// Function เปลี่ยนหน้าแบบ reload (ไม่ reload ซ้ำถ้าอยู่หน้านั้นแล้ว)
function replaceLocation(path: string): void {
    const [pathname] = path.split("?");
    if (window.location.pathname === pathname) return;
    window.location.replace(path);
}

// Function สร้าง URL เต็มของ Backend จาก path ใต้ /api เช่น "/client/config"
function buildApiUrl(path: string): string {
    return `${API_BASE_URL}${API_PREFIX}${path}`;
}

// Function เรียก Backend ตรงพร้อม device headers (ถ้ามี) และไม่ส่ง cookie (CORS ของ client ไม่รับ credentials)
async function clientRequest<T>(path: string, options: ClientRequestOptions): Promise<T> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value) query.set(key, value);
    }
    const queryString = query.toString();
    const url = queryString ? `${buildApiUrl(path)}?${queryString}` : buildApiUrl(path);

    let response: Response;

    try {
        response = await fetch(url, {
            method: options.method,
            headers: {
                Accept: "application/json",
                ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
                ...getDeviceAuthHeaders(),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            cache: "no-store",
            credentials: "omit",
        });
    } catch (error) {
        throw new ApiClientError(0, {
            message: error instanceof Error ? error.message : "Network error",
            code: NETWORK_ERROR_CODE,
        });
    }

    const data: unknown = await response.json().catch(() => null);

    // ตอบสำเร็จแต่อ่าน body ไม่ได้ ถือเป็น 502 เพื่อให้ผู้เรียกส่งซ้ำได้ (เช่น EDC ส่งซ้ำด้วย reference เดิม)
    if (response.ok && data === null) {
        throw new ApiClientError(502, { message: "Backend returned an invalid response", code: INVALID_RESPONSE_CODE });
    }

    if (!response.ok) {
        throw new ApiClientError(response.status, toApiErrorResponse(response.status, data));
    }

    return data as T;
}

/* -------------------------------------- Device Access -------------------------------------- */

// Function ล้าง token แล้วไปหน้า Activate (ห้ามสร้างอุปกรณ์ใหม่ ต้องใช้ code ใหม่จาก Admin)
function resetDeviceToActivation(): void {
    clearDeviceStorage();
    replaceLocation(ACTIVATE_PATH);
}

// Function พาอุปกรณ์ไปหน้า Activate / Maintenance ตาม code ของ error คืน true ถ้าเปลี่ยนหน้าแล้ว
function handleDeviceAccessError(error: unknown): boolean {
    if (!(error instanceof ApiClientError) || !getStoredDeviceCredential()) return false;

    if (error.code === "DEVICE_MAINTENANCE") {
        replaceLocation(MAINTENANCE_PATH);
        return true;
    }

    if (error.code === "INVALID_DEVICE_CREDENTIALS") {
        const reason = error.detail("reason");

        if (typeof reason === "string" && DEVICE_LOCKED_REASONS.has(reason)) {
            replaceLocation(`${MAINTENANCE_PATH}?reason=${encodeURIComponent(reason)}`);
            return true;
        }

        resetDeviceToActivation();
        return true;
    }

    if (DEVICE_REACTIVATE_CODES.has(error.code)) {
        resetDeviceToActivation();
        return true;
    }

    return false;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function ดึง theme ของ GET /client/config (เรียกได้ก่อน Activate) และต่อ host ของ API ให้ logoUrl ที่เป็น /uploads/...
async function getClientConfig(): Promise<ClientConfigResponse> {
    const config = await clientRequest<ClientConfigResponse>("/client/config", { method: "GET" });
    const { logoUrl } = config.theme;

    if (typeof logoUrl === "string" && logoUrl.startsWith("/uploads")) {
        return { ...config, theme: { ...config.theme, logoUrl: `${API_BASE_URL}${logoUrl}` } };
    }

    return config;
}

// Function เปิดใช้งานอุปกรณ์ด้วย activation code (POST /client/activate)
function activateDevice(body: ActivateRequest): Promise<ActivateResponse> {
    return clientRequest<ActivateResponse>("/client/activate", { method: "POST", body: { code: body.code.trim() } });
}

// Function ส่ง heartbeat ของอุปกรณ์ (POST /client/heartbeat)
function postHeartbeat(body: HeartbeatRequest): Promise<HeartbeatResponse> {
    return clientRequest<HeartbeatResponse>("/client/heartbeat", { method: "POST", body });
}

// Function ค้นหารายการจอดด้วยทะเบียนอย่างน้อย 4 ตัวอักษร (อาจได้ผลหลายคัน)
function lookupTransactionByPlate(plateNo: string): Promise<ClientTransactionLookupResponse> {
    return clientRequest<ClientTransactionLookupResponse>("/client/transactions", { method: "GET", query: { plateNo: plateNo.trim() } });
}

// Function ดึงรายการจอดด้วย transaction id (GET /client/transactions/:id)
function getTransactionById(transactionId: string): Promise<ClientTransaction> {
    return clientRequest<ClientTransaction>(`/client/transactions/${encodeURIComponent(transactionId)}`, { method: "GET" });
}

// Function ตรวจว่าผลค้นหาเป็นทะเบียนที่ตรงหลายคัน
function isPlateLookupMultiple(result: ClientTransactionLookupResponse): result is ClientPlateLookupMultiple {
    return "matchType" in result && result.matchType === "multiple";
}

// Function ดึงวิธีชำระที่ช่องทางนี้ใช้ได้ (เรียกทุกครั้งก่อนแสดงหน้าเลือกวิธีชำระ)
function getPaymentMethods(): Promise<ClientPaymentMethodsResponse> {
    return clientRequest<ClientPaymentMethodsResponse>("/client/payments/methods", { method: "GET" });
}

// Function สร้าง QR PromptPay (POST /client/payments/charges ส่งเฉพาะ plateNo / method / returnUri ห้ามส่ง amount / token / source)
function createPromptPayCharge(body: CreateChargeRequest): Promise<CreateChargeResponse> {
    return clientRequest<CreateChargeResponse>("/client/payments/charges", {
        method: "POST",
        body: { plateNo: body.plateNo, method: "promptpay", ...(body.returnUri ? { returnUri: body.returnUri } : {}) },
    });
}

// Function สร้าง URL รูป QR ของ charge บน Backend ที่ใช้เป็น <img src> ได้ (เฉพาะ charge ที่ยังรอจ่าย)
function getChargeQrImageUrl(chargeId: string): string {
    return buildApiUrl(`/client/payments/charges/${encodeURIComponent(chargeId)}/qr`);
}

// Function บันทึกการชำระด้วยบัตรหลังเครื่อง EDC อนุมัติแล้ว (POST /client/payments/edc)
function recordEdcPayment(body: EdcPaymentRequest): Promise<EdcPaymentResponse> {
    return clientRequest<EdcPaymentResponse>("/client/payments/edc", { method: "POST", body });
}

// Function จำลองการชำระเงินของ Dev Test (POST /client/payments/test)
function simulateTestPayment(body: TestPaymentRequest): Promise<TestPaymentResponse> {
    return clientRequest<TestPaymentResponse>("/client/payments/test", { method: "POST", body });
}

// Function สร้าง URL ของ Payment WebSocket (wss://<host>/api/client/payments/ws) จาก origin ของ Backend
function getPaymentSocketUrl(): string {
    const url = new URL(buildApiUrl("/client/payments/ws"));
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
}

export { ACTIVATE_PATH, ApiClientError, MAINTENANCE_PATH, NETWORK_ERROR_CODE, activateDevice, buildApiUrl, createPromptPayCharge, getChargeQrImageUrl, getClientConfig, getPaymentMethods, getPaymentSocketUrl, getTransactionById, handleDeviceAccessError, hasErrorCode, isPlateLookupMultiple, lookupTransactionByPlate, postHeartbeat, recordEdcPayment, resetDeviceToActivation, simulateTestPayment, toApiErrorResponse };
