// Import Library
import type { Metadata } from "next";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { Inter, Noto_Sans_Thai } from "next/font/google";
// Import Components
import Navbar from "@/src/app/components/navbar";
// Import Providers
import DeviceRouteGuard from "@/src/app/providers/device-route-guard";
import HeartbeatProvider from "@/src/app/providers/heartbeat-provider";
import { KioskThemeRealtimeProvider } from "@/src/app/providers/kiosk-theme-realtime-provider";
import { LocaleProvider } from "@/src/app/providers/locale-provider";
// Import CSS
import "./globals.css";
import "@/src/app/css/preload-popup.css";

/* -------------------------------------- Config -------------------------------------- */

// Config font ภาษาอังกฤษ
const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

// Config font ภาษาไทย
const notoThai = Noto_Sans_Thai({
    subsets: ["thai"],
    variable: "--font-thai",
    weight: ["400", "700"],
    display: "swap",
});

// Config metadata ของทุกหน้า (Next.js ต้องการ export const)
export const metadata: Metadata = {
    title: "Carpark",
    description: "Carpark",
};

/* -------------------------------------- Functions -------------------------------------- */

// Function layout หลัก: ภาษา (เลือกฝั่ง client), ตรวจ route ตามประเภทอุปกรณ์, heartbeat, theme/SSE และ Navbar
// Suspense รองรับ useSearchParams ของ DeviceRouteGuard และหน้าต่าง ๆ เพื่อให้ build เป็น static ได้
function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
    return (
        <html lang="th" className={`${inter.variable} ${notoThai.variable}`}>
            <body>
                <LocaleProvider>
                    <Suspense fallback={null}>
                        <DeviceRouteGuard />
                    </Suspense>
                    <HeartbeatProvider>
                        <KioskThemeRealtimeProvider>
                            <Navbar />
                            <Suspense fallback={null}>{children}</Suspense>
                        </KioskThemeRealtimeProvider>
                    </HeartbeatProvider>
                </LocaleProvider>
            </body>
        </html>
    );
}

export default RootLayout;
