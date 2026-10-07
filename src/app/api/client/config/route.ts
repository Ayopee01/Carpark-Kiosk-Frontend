// Import Library
import { NextResponse, type NextRequest } from "next/server";
// Import Lib
import { proxyJsonRequest } from "../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route ดึง theme สาธารณะ (GET /api/client/config) และต่อ host ของ API ให้ logoUrl ที่เป็น /uploads/...
async function GET(request: NextRequest): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const response = await proxyJsonRequest(request, baseUrl, "/client/config", { method: "GET" });

    if (!response.ok) return response;

    const data = (await response.json()) as { theme?: { logoUrl?: unknown } };
    const logoUrl = data.theme?.logoUrl;

    if (data.theme && typeof logoUrl === "string" && logoUrl.startsWith("/uploads")) {
        data.theme.logoUrl = new URL(logoUrl, baseUrl).toString();
    }

    return NextResponse.json(data, { status: response.status });
}

export { GET };
