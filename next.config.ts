// Import Library
import type { NextConfig } from "next";

/* -------------------------------------- Config -------------------------------------- */

// Config โหมด dev (React ต้องใช้ eval และ dev server ใช้ http)
const isDev = process.env.NODE_ENV === "development";

// Config origin ของ Backend เมื่ออยู่คนละโดเมน (ว่าง = โดเมนเดียวกัน ผ่าน Nginx) ต้องตรงกับที่ client-api.ts ใช้
const API_ORIGIN = (() => {
    const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
    if (!raw) return null;
    try {
        return new URL(raw).origin;
    } catch {
        throw new Error(`NEXT_PUBLIC_API_BASE_URL is not a valid URL: ${raw}`);
    }
})();

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลง origin http(s) เป็น ws(s) สำหรับ Payment WebSocket
function toSocketOrigin(origin: string): string {
    return origin.replace(/^http/, "ws");
}

// Function สร้าง Content-Security-Policy: โหลด script / รูป / request ได้เฉพาะโดเมนนี้และ Backend
// ถ้ามี script แปลกปลอมก็ส่ง device token ออกไปโดเมนอื่นไม่ได้ (Next ใส่ inline script ตอน prerender จึงต้องมี 'unsafe-inline')
function buildContentSecurityPolicy(): string {
    const apiSources = API_ORIGIN ? [API_ORIGIN] : [];
    const socketSources = API_ORIGIN ? [toSocketOrigin(API_ORIGIN)] : [];
    const directives = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        ["img-src 'self' data: blob:", ...apiSources].join(" "),
        "font-src 'self'",
        ["connect-src 'self'", ...apiSources, ...socketSources].join(" "),
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ];
    return directives.join("; ");
}

// Config header ความปลอดภัยของทุกหน้า (หน้า scan รับค่าจากเครื่องสแกนแบบ keyboard จึงปิดกล้องได้)
const SECURITY_HEADERS = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

// Config ของ Next.js (standalone = build เป็น server.js ที่รันใน Docker ได้โดยไม่ต้องมี node_modules ทั้งหมด)
const nextConfig: NextConfig = {
    output: "standalone",
    poweredByHeader: false,
    async headers() {
        return [{ source: "/:path*", headers: SECURITY_HEADERS }];
    },
};

export default nextConfig;
