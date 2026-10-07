// Import Lib
import { getPaymentSocketUrl } from "@/src/app/lib/api/client-api";
// Import Types
import type { PaymentSocketMessage, PaymentUpdatedEvent } from "@/src/app/type/api.type";
import type { PaymentUpdatedListener } from "@/src/app/type/realtime.type";

/* -------------------------------------- Config -------------------------------------- */

// Config ระยะ reconnect ครั้งแรกของ Payment WebSocket (เพิ่มเป็น 2 เท่าทุกครั้งที่ต่อไม่ติด)
const RECONNECT_BASE_MS = 1000;
// Config ระยะ reconnect สูงสุดของ Payment WebSocket
const RECONNECT_MAX_MS = 15000;

/* -------------------------------------- Parsers -------------------------------------- */

// Function narrow ข้อความจาก server (payment_updated ต้องมี chargeId และ paymentStatus)
function parsePaymentSocketMessage(raw: unknown): PaymentSocketMessage | null {
    if (typeof raw !== "string") return null;

    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, unknown>;

    switch (data.type) {
        case "payment_updated":
            return typeof data.chargeId === "string" && typeof data.paymentStatus === "string"
                ? (data as unknown as PaymentUpdatedEvent)
                : null;
        case "connected":
        case "subscribed":
        case "error":
            return data as unknown as PaymentSocketMessage;
        default:
            return null;
    }
}

/* -------------------------------------- Functions -------------------------------------- */

// Function เปิด WS /api/client/payments/ws?chargeId= และต่อใหม่ด้วย chargeId เดิมเมื่อหลุด คืน function ปิด socket
function openPaymentSocket(chargeId: string, onPaymentUpdated: PaymentUpdatedListener): () => void {
    let stopped = false;
    let attempt = 0;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const scheduleReconnect = (): void => {
        if (stopped) return;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
        attempt += 1;
        reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            void connect();
        }, delay);
    };

    const connect = async (): Promise<void> => {
        try {
            const baseUrl = await getPaymentSocketUrl();
            if (stopped) return;

            // ใส่ chargeId ใน URL แล้วไม่ต้องส่ง subscribe และจะได้สถานะล่าสุด (replayed) ทันที
            const url = new URL(baseUrl);
            url.searchParams.set("chargeId", chargeId);

            const nextSocket = new WebSocket(url.toString());
            socket = nextSocket;

            nextSocket.onopen = () => {
                attempt = 0;
            };

            nextSocket.onmessage = (message) => {
                const event = parsePaymentSocketMessage(message.data);
                if (event?.type === "payment_updated" && event.chargeId === chargeId) {
                    onPaymentUpdated(event);
                }
            };

            nextSocket.onclose = () => {
                if (socket === nextSocket) socket = null;
                scheduleReconnect();
            };
        } catch (error) {
            console.warn("Payment WebSocket connect failed:", error);
            scheduleReconnect();
        }
    };

    void connect();

    return () => {
        stopped = true;
        if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
        socket?.close();
        socket = null;
    };
}

export { openPaymentSocket, parsePaymentSocketMessage };
