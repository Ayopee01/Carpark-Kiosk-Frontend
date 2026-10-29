// Import Library
import { z } from "zod";
// Import Lib
import { nonEmptyStringArraySchema, nullableStringSchema, parseJsonText } from "@/src/app/lib/schema";
// Import Types
import type { Direction } from "@/src/app/type/api.type";
import type { ClientDeviceType, StoredDeviceCredential, UiDeviceType } from "@/src/app/type/device.type";

/* -------------------------------------- Config -------------------------------------- */

// Config key ที่เก็บข้อมูลอุปกรณ์ใน localStorage
const DEVICE_CREDENTIAL_KEY = "carparkDeviceCredential";

/* -------------------------------------- Schemas -------------------------------------- */

// Schema device type ที่รับทั้ง barrier_gate และ barrier-gate แล้วแปลงเป็นค่าที่ Backend ใช้
const deviceTypeSchema = z
    .enum(["kiosk", "barrier_gate", "barrier-gate"])
    .transform((value): ClientDeviceType => (value === "kiosk" ? "kiosk" : "barrier_gate"));

// Schema direction ที่ตัดช่องว่างและทำเป็นตัวใหญ่ก่อนตรวจ
const directionSchema = z.string().trim().toUpperCase().pipe(z.enum(["IN", "OUT"]));

// Schema ข้อมูลอุปกรณ์ใน localStorage (ต้องมี deviceId / deviceToken / deviceType, field อื่นผิดรูปแบบใช้ค่าเริ่มต้น)
// credential ที่บันทึกก่อนมี cameraIds เก็บกล้องเป็น cameraId ตัวเดียว
const storedDeviceCredentialSchema = z
    .object({
        deviceId: z.string().min(1),
        deviceToken: z.string().min(1),
        deviceType: deviceTypeSchema,
        deviceName: z.string().catch(""),
        location: nullableStringSchema,
        status: z.string().catch("active"),
        activatedAt: z.string().optional().catch(undefined),
        gateId: z.string().min(1).nullable().catch(null),
        direction: directionSchema.nullable().catch(null),
        cameraId: z.string().min(1).optional().catch(undefined),
        cameraIds: nonEmptyStringArraySchema,
        printerIds: nonEmptyStringArraySchema,
    })
    .transform(({ cameraId, ...credential }): StoredDeviceCredential => ({
        ...credential,
        cameraIds: credential.cameraIds.length === 0 && cameraId ? [cameraId] : credential.cameraIds,
    }));

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าใช้ localStorage ได้หรือไม่
function canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && Boolean(window.localStorage);
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลง device type ให้เป็นค่าที่ Backend ใช้ (ไม่รู้จักคืน null)
function normalizeDeviceType(value: unknown): ClientDeviceType | null {
    return deviceTypeSchema.safeParse(value).data ?? null;
}

// Function แปลง direction ให้เป็น "IN" | "OUT" (ไม่รู้จักคืน null)
function normalizeBarrierDirection(value: unknown): Direction | null {
    return directionSchema.safeParse(value).data ?? null;
}

// Function แปลง device type ของ Backend เป็นค่าที่ใช้เลือก route
function toUiDeviceType(type: ClientDeviceType): UiDeviceType {
    return type === "barrier_gate" ? "barrier-gate" : "kiosk";
}

// Function ดึงข้อมูลอุปกรณ์จาก localStorage (ไม่มี deviceId / deviceToken / deviceType คืน null)
function getStoredDeviceCredential(): StoredDeviceCredential | null {
    if (!canUseLocalStorage()) return null;

    try {
        const raw = localStorage.getItem(DEVICE_CREDENTIAL_KEY);
        if (!raw) return null;

        return storedDeviceCredentialSchema.safeParse(parseJsonText(raw)).data ?? null;
    } catch {
        return null;
    }
}

// Function บันทึกข้อมูลอุปกรณ์ลง localStorage
function saveDeviceCredential(credential: StoredDeviceCredential): void {
    if (!canUseLocalStorage()) return;
    localStorage.setItem(DEVICE_CREDENTIAL_KEY, JSON.stringify(credential));
}

// Function แก้ข้อมูลอุปกรณ์ใน localStorage บาง field โดยคงค่าเดิมที่เหลือ
function updateStoredDeviceCredential(updates: Partial<StoredDeviceCredential>): void {
    const current = getStoredDeviceCredential();
    if (!current) return;
    saveDeviceCredential({ ...current, ...updates });
}

// Function ลบข้อมูลอุปกรณ์ออกจาก localStorage เมื่อ token ใช้ไม่ได้หรือถูก revoke
function clearDeviceStorage(): void {
    if (!canUseLocalStorage()) return;
    localStorage.removeItem(DEVICE_CREDENTIAL_KEY);
}

// Function สร้าง device headers ของ request (Mobile ไม่มี credential จึงได้ object ว่าง)
function getDeviceAuthHeaders(): Record<string, string> {
    const credential = getStoredDeviceCredential();
    if (!credential) return {};

    return {
        "x-device-id": credential.deviceId.trim(),
        "x-device-token": credential.deviceToken.trim(),
    };
}

// Function ดึงประเภทของอุปกรณ์ที่ Activate อยู่ (ไม่มีคืน null)
function getActivatedDeviceType(): UiDeviceType | null {
    const credential = getStoredDeviceCredential();
    return credential ? toUiDeviceType(credential.deviceType) : null;
}

export { clearDeviceStorage, getActivatedDeviceType, getDeviceAuthHeaders, getStoredDeviceCredential, normalizeBarrierDirection, normalizeDeviceType, saveDeviceCredential, toUiDeviceType, updateStoredDeviceCredential };
