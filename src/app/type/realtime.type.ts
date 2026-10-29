// Import Types
import type { ClientSocketEvent, PaymentUpdatedEvent } from "./api.type";

/* -------------------------------------- Client Socket Types -------------------------------------- */

// Type สถานะการเชื่อมต่อ Socket.IO /client
export type ClientSocketState = "connecting" | "connected" | "disconnected";

// Type ผู้รับ event และสถานะของ socket /client
export type ClientSocketListener = {
    onEvent?: (event: ClientSocketEvent) => void;
    onStateChange?: (state: ClientSocketState) => void;
};

/* -------------------------------------- Payment Types -------------------------------------- */

// Type callback เมื่อได้ payments:updated ของ charge ที่ subscribe
export type PaymentUpdatedListener = (event: PaymentUpdatedEvent) => void;
