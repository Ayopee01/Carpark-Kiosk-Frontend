"use client";

// Import Library
import { useEffect, type ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// Import Lib
import { getActivatedDeviceType } from "@/src/app/lib/device";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storage-keys";
// Import Types
import type { ChildrenProps } from "@/src/app/type/ui.type";

/* -------------------------------------- Config -------------------------------------- */

// Config route หลักของ Barrier Gate
const BARRIER_PATH = "/landing/barrier-gate";
// Config route ชำระเงินที่ Barrier Gate เข้าได้ชั่วคราวจาก PAYMENT_REQUIRED
const BARRIER_PAYMENT_PATH = "/landing/check-payment";
// Config route หลักของ Kiosk
const KIOSK_HOME_PATH = "/landing/dashboard";
// Config route หลักของ Mobile
const MOBILE_HOME_PATH = "/landing/search";
// Config route ที่ทุกประเภทอุปกรณ์เข้าได้
const SHARED_PATHS = new Set(["/landing/activate", "/landing/maintenance"]);
// Config route ที่ Mobile (ไม่มี credential) เข้าได้
const MOBILE_PATHS = new Set(["/landing/search", "/landing/detail", "/landing/check-payment"]);

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่า pathname อยู่ในกลุ่ม route ของ Barrier Gate
function isBarrierPath(pathname: string): boolean {
    return pathname === BARRIER_PATH || pathname.startsWith(`${BARRIER_PATH}/`);
}

// Function ตรวจว่า pathname อยู่ใต้ /landing
function isLandingPath(pathname: string): boolean {
    return pathname === "/landing" || pathname.startsWith("/landing/");
}

/* -------------------------------------- Functions -------------------------------------- */

// Function จำกัด route ให้ตรงกับประเภทอุปกรณ์ที่ Activate (ตรวจทุกครั้งที่ route หรือ query เปลี่ยน)
function DeviceRouteGuard({ children }: ChildrenProps): ReactElement {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const deviceType = getActivatedDeviceType();

        // Barrier Gate เข้าหน้าชำระเงินได้ชั่วคราวเมื่อมาจาก PAYMENT_REQUIRED
        const isBarrierPayment =
            pathname === BARRIER_PAYMENT_PATH &&
            Boolean(searchParams.get("plateNo") || searchParams.get("transactionId")) &&
            Boolean(sessionStorage.getItem(BARRIER_RETURN_STORAGE_KEY));

        if (!isLandingPath(pathname) || SHARED_PATHS.has(pathname)) return;

        if (!deviceType) {
            if (!MOBILE_PATHS.has(pathname)) router.replace(MOBILE_HOME_PATH);
            return;
        }

        if (deviceType === "kiosk" && isBarrierPath(pathname)) {
            router.replace(KIOSK_HOME_PATH);
            return;
        }

        if (deviceType === "barrier-gate" && !isBarrierPath(pathname) && !isBarrierPayment) {
            router.replace(BARRIER_PATH);
        }
    }, [pathname, router, searchParams]);

    return <>{children}</>;
}

export default DeviceRouteGuard;
