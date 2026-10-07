"use client";

// Import Library
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Import Lib
import { getActivatedDeviceType } from "@/src/app/lib/device";

// Function พาไปหน้าหลักตามประเภทอุปกรณ์ (ไม่มี credential ไปหน้าค้นหาของ Mobile)
function Page(): null {
    const router = useRouter();

    useEffect(() => {
        const deviceType = getActivatedDeviceType();

        if (deviceType === "kiosk") {
            router.replace("/landing/dashboard");
            return;
        }

        if (deviceType === "barrier-gate") {
            router.replace("/landing/barrier-gate");
            return;
        }

        router.replace("/landing/search");
    }, [router]);

    return null;
}

export default Page;
