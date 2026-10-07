// Import Library
import { NextResponse, type NextRequest } from "next/server";
// Import Types
import type { BackendRequestOptions } from "@/src/app/type/api.type";

/* -------------------------------------- Config -------------------------------------- */

// Config prefix ของทุกเส้นใน Backend (ที่เดียวที่ระบุ path ของ Backend)
const BACKEND_API_PREFIX = "/api";
// Config header ของอุปกรณ์ที่ส่งต่อให้ Backend (Mobile ไม่ส่ง header เหล่านี้)
const DEVICE_HEADER_NAMES = ["x-device-id", "x-device-token"] as const;

/* -------------------------------------- Functions -------------------------------------- */

// Function สร้าง URL ของ Backend จาก BASE_URL และ path ใต้ /api เช่น "/client/config"
function buildBackendUrl(baseUrl: string, path: string, query?: URLSearchParams): URL {
    const url = new URL(`${BACKEND_API_PREFIX}${path}`, baseUrl);
    if (query) url.search = query.toString();
    return url;
}

// Function คัด device headers จาก request ของ Browser เพื่อส่งต่อให้ Backend
function getForwardedDeviceHeaders(request: NextRequest): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const name of DEVICE_HEADER_NAMES) {
        const value = request.headers.get(name)?.trim();
        if (value) headers[name] = value;
    }

    return headers;
}

// Function สร้าง error response รูปแบบเดียวกับ ApiErrorResponse ของ Backend
function proxyErrorResponse(status: number, code: string, message: string): NextResponse {
    return NextResponse.json({ message, code }, { status });
}

// Function ส่ง request ต่อไปที่ Backend แล้วคืน JSON และ status เดิมให้ Browser
async function proxyJsonRequest(request: NextRequest, baseUrl: string, path: string, options: BackendRequestOptions): Promise<NextResponse> {
    if (!baseUrl) {
        return proxyErrorResponse(500, "API_BASE_URL_NOT_CONFIGURED", "API base URL is not configured");
    }

    try {
        const response = await fetch(buildBackendUrl(baseUrl, path, options.query), {
            method: options.method,
            headers: {
                Accept: "application/json",
                ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
                ...getForwardedDeviceHeaders(request),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            cache: "no-store",
        });

        const data: unknown = await response.json().catch(() => null);

        if (data === null) {
            return proxyErrorResponse(response.ok ? 502 : response.status, "INVALID_BACKEND_RESPONSE", "Backend returned an invalid response");
        }

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return proxyErrorResponse(502, "BACKEND_UNREACHABLE", error instanceof Error ? error.message : "Unable to connect to the carpark API");
    }
}

// Function อ่าน JSON body ของ request จาก Browser (ไม่ใช่ object คืน null)
async function readJsonObject(request: NextRequest): Promise<Record<string, unknown> | null> {
    const body: unknown = await request.json().catch(() => null);
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export { BACKEND_API_PREFIX, buildBackendUrl, getForwardedDeviceHeaders, proxyErrorResponse, proxyJsonRequest, readJsonObject };
