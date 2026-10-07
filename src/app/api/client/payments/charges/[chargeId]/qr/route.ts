// Import Library
import { NextResponse, type NextRequest } from "next/server";
// Import Lib
import { buildBackendUrl, proxyErrorResponse } from "../../../../backend";

/* -------------------------------------- Config -------------------------------------- */

// Config ให้ route ทำงานทุก request (Next.js ต้องการ export const ของ segment config)
export const dynamic = "force-dynamic";

/* -------------------------------------- Routes -------------------------------------- */

// Route ดึงรูป QR ของ charge ที่ยังรอจ่าย (GET /api/client/payments/charges/:chargeId/qr) ใช้เป็น <img src> ได้
async function GET(_request: NextRequest, { params }: { params: Promise<{ chargeId: string }> }): Promise<NextResponse> {
    const baseUrl = process.env.BASE_URL ?? "";
    const { chargeId } = await params;

    if (!baseUrl) {
        return proxyErrorResponse(500, "API_BASE_URL_NOT_CONFIGURED", "API base URL is not configured");
    }

    try {
        const response = await fetch(buildBackendUrl(baseUrl, `/client/payments/charges/${encodeURIComponent(chargeId)}/qr`), {
            method: "GET",
            cache: "no-store",
        });

        return new NextResponse(await response.arrayBuffer(), {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        return proxyErrorResponse(502, "BACKEND_UNREACHABLE", error instanceof Error ? error.message : "Unable to load QR image");
    }
}

export { GET };
