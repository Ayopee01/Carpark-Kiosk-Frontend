// Import Types
import type { Direction } from "./api.type";

/* -------------------------------------- Barrier Gate Types -------------------------------------- */

// Type สถานะหน้าจอไม้กั้น
export type GateState = "waiting" | "checking" | "open" | "denied" | "error";

// Type ตัวกรอง lpr_detected ของหน้าไม้กั้น (ส่งเป็น query ของ GET /client/events)
export type BarrierSubscription = {
    gateId: string | null;
    direction: Direction | null;
    cameraId: string | null;
};

// Type สถานะหน้าชำระเงินที่ไม้กั้น
export type CheckPaymentPageState = "loading" | "ready" | "paid" | "error";

/* -------------------------------------- Hardware Types -------------------------------------- */

// Type hardware adapter ของไม้กั้น แยกจาก UI เพื่อเปลี่ยนเป็น serial/relay/MQTT/API ได้ภายหลัง
export type BarrierHardwareAdapter = {
    openGate: () => Promise<void>;
    closeGate?: () => Promise<void>;
    getStatus?: () => Promise<unknown>;
};
