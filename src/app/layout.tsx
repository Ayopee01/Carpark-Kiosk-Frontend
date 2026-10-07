// Import Library
import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
// Import Components
import Navbar from "@/src/app/components/navbar";
// Import Providers
import DeviceRouteGuard from "@/src/app/providers/device-route-guard";
import HeartbeatProvider from "@/src/app/providers/heartbeat-provider";
import { KioskThemeRealtimeProvider } from "@/src/app/providers/kiosk-theme-realtime-provider";
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

// Function layout หลัก: ภาษา, ตรวจ route ตามประเภทอุปกรณ์, heartbeat, theme/SSE และ Navbar
async function RootLayout({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
    const locale = await getLocale();

    return (
        <html lang={locale} className={`${inter.variable} ${notoThai.variable}`}>
            <body>
                <NextIntlClientProvider>
                    <DeviceRouteGuard>
                        <HeartbeatProvider>
                            <KioskThemeRealtimeProvider>
                                <Navbar />
                                {children}
                            </KioskThemeRealtimeProvider>
                        </HeartbeatProvider>
                    </DeviceRouteGuard>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}

export default RootLayout;
