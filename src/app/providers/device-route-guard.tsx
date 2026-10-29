"use client";

// Import Library
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// Import Lib
import { getActivatedDeviceType } from "@/src/app/lib/device";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storage-keys";

/* -------------------------------------- Config -------------------------------------- */

// Config route หลักของ Barrier Gate
const BARRIER_PATH = "/landing/barrier-gate";
// Config route ชำระเงินที่ Barrier Gate เข้าได้ชั่วคราวจาก PAYMENT_REQUIRED
const BARRIER_PAYMENT_PATH = "/landing/check-payment";
// Config route หลักของ Kiosk
const KIOSK_HOME_PATH = "/landing/dashboard";
// Config route ที่อุปกรณ์ที่ยังไม่ Activate ถูกส่งไป
const ACTIVATE_PATH = "/landing/activate";
// Config route ที่ทุกประเภทอุปกรณ์เข้าได้
const SHARED_PATHS = new Set([ACTIVATE_PATH, "/landing/maintenance"]);
// Config route ที่ Mobile (ไม่มี credential) เข้าได้ ต้องมี tx จาก QR บนตั๋วเท่านั้น
const MOBILE_DETAIL_PATH = "/landing/detail";

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
function DeviceRouteGuard(): null {
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

        // ไม่มี credential เข้าได้เฉพาะรายการจาก QR บนตั๋ว (tx) นอกนั้นต้อง Activate ก่อน
        if (!deviceType) {
            const isMobileTicket = pathname === MOBILE_DETAIL_PATH && Boolean(searchParams.get("tx")?.trim());
            if (!isMobileTicket) router.replace(ACTIVATE_PATH);
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

    return null;
}

export default DeviceRouteGuard;
