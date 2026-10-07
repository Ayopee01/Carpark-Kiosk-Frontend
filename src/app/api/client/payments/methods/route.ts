// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { proxyJsonRequest } from "../../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route ดึงวิธีชำระเงินที่ช่องทางนี้ใช้ได้ (GET /api/client/payments/methods)
async function GET(request: NextRequest): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";

    return proxyJsonRequest(request, baseUrl, "/client/payments/methods", { method: "GET" });
}

export { GET };
