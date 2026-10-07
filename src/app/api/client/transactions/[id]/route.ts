// Import Library
import type { NextRequest, NextResponse } from "next/server";
// Import Lib
import { proxyJsonRequest } from "../../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route ดึงรายการจอดด้วย transaction id (GET /api/client/transactions/:id)
async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const { id } = await params;

    return proxyJsonRequest(request, baseUrl, `/client/transactions/${encodeURIComponent(id)}`, { method: "GET" });
}

export { GET };
