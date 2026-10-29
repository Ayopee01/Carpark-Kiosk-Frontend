"use client";

// Import Library
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Import Lib
import { getActivatedDeviceType } from "@/src/app/lib/device";

// Function พาไปหน้าหลักตามประเภทอุปกรณ์ (ไม่มี credential ต้อง Activate ก่อน, Mobile เข้าผ่าน /payment?tx= เท่านั้น)
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

        router.replace("/landing/activate");
    }, [router]);

    return null;
}

export default Page;
