// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { proxyJsonRequest, readJsonObject } from "../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route ส่ง heartbeat ของอุปกรณ์ (POST /api/client/heartbeat) ส่งต่อเฉพาะ name และ location
async function POST(request: NextRequest): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const body = (await readJsonObject(request)) ?? {};

    return proxyJsonRequest(request, baseUrl, "/client/heartbeat", {
        method: "POST",
        body: {
            ...(typeof body.name === "string" ? { name: body.name } : {}),
            ...(typeof body.location === "string" ? { location: body.location } : {}),
        },
    });
}

export { POST };
