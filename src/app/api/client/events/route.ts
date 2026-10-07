// Import Library
import { NextResponse, type NextRequest } from "next/server";
// Import Lib
import { buildBackendUrl, getForwardedDeviceHeaders, proxyErrorResponse } from "../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";
// Config ให้ stream ทำงานบน Node.js runtime
export const runtime = "nodejs";
// Config query ที่ Backend รับ (ตัวกรองของ lpr_detected) ส่วน device token ต้องมาทาง header เท่านั้น
const EVENT_QUERY_KEYS = ["deviceId", "gateId", "direction", "cameraId"] as const;

/* -------------------------------------- Routes -------------------------------------- */

// Route ส่ง SSE ของ GET /client/events ต่อให้ Browser (ping มาจาก Backend เพื่อให้ client ตรวจ connection ตายได้)
async function GET(request: NextRequest): Promise<Response> {
    const baseUrl = process.env.BASE_URL ?? "";

    if (!baseUrl) {
        return proxyErrorResponse(500, "API_BASE_URL_NOT_CONFIGURED", "API base URL is not configured");
    }

    const query = new URLSearchParams();
    for (const key of EVENT_QUERY_KEYS) {
        const value = request.nextUrl.searchParams.get(key)?.trim();
        if (value) query.set(key, value);
    }

    let upstream: Response;

    try {
        upstream = await fetch(buildBackendUrl(baseUrl, "/client/events", query), {
            method: "GET",
            headers: { Accept: "text/event-stream", ...getForwardedDeviceHeaders(request) },
            cache: "no-store",
            signal: request.signal,
        });
    } catch (error) {
        return proxyErrorResponse(502, "BACKEND_UNREACHABLE", error instanceof Error ? error.message : "Cannot connect to client event stream");
    }

    // Backend ตอบ error เป็น JSON ก่อนเปิด stream เช่น INVALID_DEVICE_CREDENTIALS, DEVICE_MAINTENANCE
    if (!upstream.ok || !upstream.body) {
        const data: unknown = await upstream.json().catch(() => null);

        return data
            ? NextResponse.json(data, { status: upstream.status })
            : proxyErrorResponse(upstream.status || 502, "EVENT_STREAM_UNAVAILABLE", "Cannot connect to client event stream");
    }

    return new Response(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}

export { GET };
