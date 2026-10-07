// Import Lib
import { clearDeviceStorage, getDeviceAuthHeaders, getStoredDeviceCredential } from "@/src/app/lib/device";
// Import Types
import type { ActivateRequest, ActivateResponse, ApiErrorResponse, ClientConfigResponse, ClientPaymentMethodsResponse, ClientPlateLookupMultiple, ClientRequestOptions, ClientTransaction, ClientTransactionLookupResponse, CreateChargeRequest, CreateChargeResponse, EdcPaymentRequest, EdcPaymentResponse, HeartbeatRequest, HeartbeatResponse, PaymentSocketUrlResponse, TestPaymentRequest, TestPaymentResponse } from "@/src/app/type/api.type";

/* -------------------------------------- Config -------------------------------------- */

// Config code ที่ frontend ใช้เมื่อ request ไม่ถึง Next.js API route
const NETWORK_ERROR_CODE = "NETWORK_ERROR";
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

// Function เรียก Next.js API route พร้อม device headers (ถ้ามี) และไม่ส่ง cookie
async function clientRequest<T>(path: string, options: ClientRequestOptions): Promise<T> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value) query.set(key, value);
    }
    const queryString = query.toString();
    const url = queryString ? `${path}?${queryString}` : path;

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

    if (!response.ok || data === null) {
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

// Function ดึง theme ของ GET /client/config (เรียกได้ก่อน Activate)
function getClientConfig(): Promise<ClientConfigResponse> {
    return clientRequest<ClientConfigResponse>("/api/client/config", { method: "GET" });
}

// Function เปิดใช้งานอุปกรณ์ด้วย activation code (POST /client/activate)
function activateDevice(body: ActivateRequest): Promise<ActivateResponse> {
    return clientRequest<ActivateResponse>("/api/client/activate", { method: "POST", body });
}

// Function ส่ง heartbeat ของอุปกรณ์ (POST /client/heartbeat)
function postHeartbeat(body: HeartbeatRequest): Promise<HeartbeatResponse> {
    return clientRequest<HeartbeatResponse>("/api/client/heartbeat", { method: "POST", body });
}

// Function ค้นหารายการจอดด้วยทะเบียนอย่างน้อย 4 ตัวอักษร (อาจได้ผลหลายคัน)
function lookupTransactionByPlate(plateNo: string): Promise<ClientTransactionLookupResponse> {
    return clientRequest<ClientTransactionLookupResponse>("/api/client/transactions", { method: "GET", query: { plateNo } });
}

// Function ดึงรายการจอดด้วย transaction id (GET /client/transactions/:id)
function getTransactionById(transactionId: string): Promise<ClientTransaction> {
    return clientRequest<ClientTransaction>(`/api/client/transactions/${encodeURIComponent(transactionId)}`, { method: "GET" });
}

// Function ตรวจว่าผลค้นหาเป็นทะเบียนที่ตรงหลายคัน
function isPlateLookupMultiple(result: ClientTransactionLookupResponse): result is ClientPlateLookupMultiple {
    return "matchType" in result && result.matchType === "multiple";
}

// Function ดึงวิธีชำระที่ช่องทางนี้ใช้ได้ (เรียกทุกครั้งก่อนแสดงหน้าเลือกวิธีชำระ)
function getPaymentMethods(): Promise<ClientPaymentMethodsResponse> {
    return clientRequest<ClientPaymentMethodsResponse>("/api/client/payments/methods", { method: "GET" });
}

// Function สร้าง QR PromptPay (POST /client/payments/charges ห้ามส่ง amount / token / source)
function createPromptPayCharge(body: CreateChargeRequest): Promise<CreateChargeResponse> {
    return clientRequest<CreateChargeResponse>("/api/client/payments/charges", { method: "POST", body });
}

// Function สร้าง URL รูป QR ของ charge ที่ใช้เป็น <img src> ได้ (เฉพาะ charge ที่ยังรอจ่าย)
function getChargeQrImageUrl(chargeId: string): string {
    return `/api/client/payments/charges/${encodeURIComponent(chargeId)}/qr`;
}

// Function บันทึกการชำระด้วยบัตรหลังเครื่อง EDC อนุมัติแล้ว (POST /client/payments/edc)
function recordEdcPayment(body: EdcPaymentRequest): Promise<EdcPaymentResponse> {
    return clientRequest<EdcPaymentResponse>("/api/client/payments/edc", { method: "POST", body });
}

// Function จำลองการชำระเงินของ Dev Test (POST /client/payments/test)
function simulateTestPayment(body: TestPaymentRequest): Promise<TestPaymentResponse> {
    return clientRequest<TestPaymentResponse>("/api/client/payments/test", { method: "POST", body });
}

// Function ดึง URL ของ Payment WebSocket (wss://<host>/api/client/payments/ws) จาก Next.js API route
async function getPaymentSocketUrl(): Promise<string> {
    const { url } = await clientRequest<PaymentSocketUrlResponse>("/api/client/payments/socket", { method: "GET" });
    return url;
}

export { ACTIVATE_PATH, ApiClientError, MAINTENANCE_PATH, NETWORK_ERROR_CODE, activateDevice, createPromptPayCharge, getChargeQrImageUrl, getClientConfig, getPaymentMethods, getPaymentSocketUrl, getTransactionById, handleDeviceAccessError, hasErrorCode, isPlateLookupMultiple, lookupTransactionByPlate, postHeartbeat, recordEdcPayment, resetDeviceToActivation, simulateTestPayment, toApiErrorResponse };
