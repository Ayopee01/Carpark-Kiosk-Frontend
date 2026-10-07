// Import Types
import type { ClientEventsQuery, ClientStreamEvent, PaymentUpdatedEvent } from "./api.type";

/* -------------------------------------- Client Stream Types -------------------------------------- */

// Type สถานะการเชื่อมต่อ SSE ของ GET /client/events
export type ClientStreamState = "connecting" | "connected" | "disconnected";

// Type option ของการเปิด client event stream
export type ClientEventStreamOptions = {
    query?: ClientEventsQuery;
    onEvent: (event: ClientStreamEvent) => void;
    onStateChange?: (state: ClientStreamState) => void;
};

/* -------------------------------------- Payment Socket Types -------------------------------------- */

// Type callback เมื่อได้ payment_updated ของ charge ที่ subscribe
export type PaymentUpdatedListener = (event: PaymentUpdatedEvent) => void;
