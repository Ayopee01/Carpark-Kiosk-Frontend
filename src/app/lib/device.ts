// Import Types
import type { Direction } from "@/src/app/type/api.type";
import type { ClientDeviceType, StoredDeviceCredential, UiDeviceType } from "@/src/app/type/device.type";

/* -------------------------------------- Config -------------------------------------- */

// Config key ที่เก็บข้อมูลอุปกรณ์ใน localStorage
const DEVICE_CREDENTIAL_KEY = "carparkDeviceCredential";

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าใช้ localStorage ได้หรือไม่
function canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && Boolean(window.localStorage);
}

// Function แปลงค่าเป็น array ของ string ที่ไม่ว่าง
function toStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
        : [];
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลง device type ให้เป็นค่าที่ Backend ใช้ (ไม่รู้จักคืน null)
function normalizeDeviceType(value: unknown): ClientDeviceType | null {
    if (value === "kiosk") return "kiosk";
    if (value === "barrier_gate" || value === "barrier-gate") return "barrier_gate";
    return null;
}

// Function แปลง direction ให้เป็น "IN" | "OUT" (ไม่รู้จักคืน null)
function normalizeBarrierDirection(value: unknown): Direction | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toUpperCase();
    if (normalized === "IN" || normalized === "OUT") return normalized;
    return null;
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

        const value = JSON.parse(raw) as Record<string, unknown>;
        const deviceType = normalizeDeviceType(value.deviceType);

        if (
            typeof value.deviceId !== "string" ||
            !value.deviceId ||
            typeof value.deviceToken !== "string" ||
            !value.deviceToken ||
            !deviceType
        ) {
            return null;
        }

        // credential ที่บันทึกก่อนมี cameraIds เก็บกล้องเป็น cameraId ตัวเดียว
        const cameraIds = toStringArray(value.cameraIds);
        if (cameraIds.length === 0 && typeof value.cameraId === "string" && value.cameraId) {
            cameraIds.push(value.cameraId);
        }

        return {
            deviceId: value.deviceId,
            deviceToken: value.deviceToken,
            deviceType,
            deviceName: typeof value.deviceName === "string" ? value.deviceName : "",
            location: typeof value.location === "string" ? value.location : null,
            status: typeof value.status === "string" ? value.status : "active",
            activatedAt: typeof value.activatedAt === "string" ? value.activatedAt : undefined,
            gateId: typeof value.gateId === "string" && value.gateId ? value.gateId : null,
            direction: normalizeBarrierDirection(value.direction),
            cameraIds,
            printerIds: toStringArray(value.printerIds),
        };
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
