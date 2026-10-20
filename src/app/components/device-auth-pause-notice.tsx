"use client";

// Import Library
import { useSyncExternalStore, type ReactElement } from "react";
import { useTranslations } from "next-intl";
// Import Lib
import { getDeviceAuthPauseSeconds, subscribeDeviceAuthPause } from "@/src/app/lib/device-auth-pause";
// Import CSS
import "@/src/app/css/device-auth-pause-notice.css";

// Function คืนค่าตอน prerender (ยังไม่ได้พัก)
function getServerPauseSeconds(): number {
    return 0;
}

// Function แสดงแถบแจ้งว่าพักการเชื่อมต่อชั่วคราวพร้อมวินาทีที่เหลือ เมื่อ Backend ตอบ 429 TOO_MANY_DEVICE_AUTH_ATTEMPTS
function DeviceAuthPauseNotice(): ReactElement | null {
    const t = useTranslations("DeviceAuthPause");
    const seconds = useSyncExternalStore(subscribeDeviceAuthPause, getDeviceAuthPauseSeconds, getServerPauseSeconds);

    if (seconds <= 0) return null;

    return (
        <div className="device-auth-pause-notice" role="status" aria-live="polite">
            <strong>{t("title")}</strong>
            <span>{t("description", { seconds })}</span>
        </div>
    );
}

export default DeviceAuthPauseNotice;
