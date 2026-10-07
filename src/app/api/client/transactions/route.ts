// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { proxyJsonRequest } from "../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route ค้นหารายการจอดด้วยทะเบียน (GET /api/client/transactions?plateNo=) Backend ตรวจความยาวทะเบียนเอง
async function GET(request: NextRequest): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const query = new URLSearchParams();
    const plateNo = request.nextUrl.searchParams.get("plateNo")?.trim();
    const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();

    if (plateNo) query.set("plateNo", plateNo);
    if (deviceId) query.set("deviceId", deviceId);

    return proxyJsonRequest(request, baseUrl, "/client/transactions", { method: "GET", query });
}

export { GET };
