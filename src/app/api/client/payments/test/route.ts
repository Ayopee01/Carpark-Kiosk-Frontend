// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { isPaymentTestEnabled } from "@/src/app/lib/feature-flags";
import { proxyErrorResponse, proxyJsonRequest, readJsonObject } from "../../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route จำลองการชำระเงินของ Dev Test (POST /api/client/payments/test) ตอบ 404 เมื่อปิด flag หรือเป็น production
async function POST(request: NextRequest): Promise<NextResponse> {
    if (!isPaymentTestEnabled()) {
        return proxyErrorResponse(404, "ROUTE_NOT_FOUND", "Not found");
    }

    const baseUrl = process.env.BASE_URL ?? "";
    const body = await readJsonObject(request);

    if (!body) {
        return proxyErrorResponse(400, "VALIDATION_ERROR", "Invalid test payment payload");
    }

    return proxyJsonRequest(request, baseUrl, "/client/payments/test", { method: "POST", body });
}

export { POST };
