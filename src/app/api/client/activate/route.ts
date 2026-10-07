// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { proxyErrorResponse, proxyJsonRequest, readJsonObject } from "../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route เปิดใช้งานอุปกรณ์ด้วย activation code (POST /api/client/activate)
async function POST(request: NextRequest): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const body = await readJsonObject(request);

    if (!body) {
        return proxyErrorResponse(400, "VALIDATION_ERROR", "Invalid activation payload");
    }

    return proxyJsonRequest(request, baseUrl, "/client/activate", {
        method: "POST",
        body: { code: typeof body.code === "string" ? body.code.trim() : "" },
    });
}

export { POST };
