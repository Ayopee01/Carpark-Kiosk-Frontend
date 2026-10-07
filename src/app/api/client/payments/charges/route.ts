// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { proxyErrorResponse, proxyJsonRequest, readJsonObject } from "../../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route สร้าง QR PromptPay (POST /api/client/payments/charges) ส่งต่อเฉพาะ field ที่ Backend รับ ห้ามส่ง amount/token
async function POST(request: NextRequest): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const body = await readJsonObject(request);

    if (!body) {
        return proxyErrorResponse(400, "VALIDATION_ERROR", "Invalid charge payload");
    }

    return proxyJsonRequest(request, baseUrl, "/client/payments/charges", {
        method: "POST",
        body: {
            plateNo: typeof body.plateNo === "string" ? body.plateNo : "",
            method: "promptpay",
            ...(typeof body.returnUri === "string" ? { returnUri: body.returnUri } : {}),
        },
    });
}

export { POST };
