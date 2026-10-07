// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { proxyErrorResponse, proxyJsonRequest, readJsonObject } from "../../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route บันทึกการชำระด้วยบัตรผ่านเครื่อง EDC (POST /api/client/payments/edc) ใช้ได้เฉพาะ Kiosk / Barrier Gate
async function POST(request: NextRequest): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const body = await readJsonObject(request);

    if (!body) {
        return proxyErrorResponse(400, "VALIDATION_ERROR", "Invalid EDC payment payload");
    }

    return proxyJsonRequest(request, baseUrl, "/client/payments/edc", { method: "POST", body });
}

export { POST };
