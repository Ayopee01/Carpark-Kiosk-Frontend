// Import Types
import type { DateTimeString, DeviceStatus, Direction } from "./api.type";

/* -------------------------------------- Device Storage Types -------------------------------------- */

// Type ประเภทอุปกรณ์ที่ Activate ได้ (ค่าที่ Backend ใช้)
export type ClientDeviceType = "kiosk" | "barrier_gate";

// Type ประเภทอุปกรณ์ที่ใช้เลือก route ของหน้าจอ
export type UiDeviceType = "kiosk" | "barrier-gate";

// Type ข้อมูลอุปกรณ์ที่เก็บใน localStorage หลัง Activate (gateId ถึง printerIds ใช้กับ barrier_gate)
export type StoredDeviceCredential = {
    deviceId: string;
    deviceToken: string;
    deviceType: ClientDeviceType;
    deviceName: string;
    location: string | null;
    status: DeviceStatus;
    activatedAt?: DateTimeString;
    gateId: string | null;
    direction: Direction | null;
    cameraIds: string[];
    printerIds: string[];
};
