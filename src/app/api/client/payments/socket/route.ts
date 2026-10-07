// Import Library
import { NextResponse } from "next/server";
// Import Lib
import { buildBackendUrl, proxyErrorResponse } from "../../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route คืน URL ของ Payment WebSocket ของ Backend (Next.js ส่งต่อ WebSocket ไม่ได้ Browser จึงต่อ Backend ตรง)
async function GET(): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";

    if (!baseUrl) {
        return proxyErrorResponse(500, "API_BASE_URL_NOT_CONFIGURED", "API base URL is not configured");
    }

    const url = buildBackendUrl(baseUrl, "/client/payments/ws");
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    return NextResponse.json({ url: url.toString() });
}

export { GET };
