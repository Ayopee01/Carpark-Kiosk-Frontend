"use client";

// Import Library
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Function รับ qrData ("<frontendUrl>/payment?tx=<id>") ที่ Mobile สแกน แล้วส่งต่อไปหน้า Detail ที่โหลดด้วย transaction id
function MobilePaymentEntryPage(): null {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const transactionId = searchParams.get("tx")?.trim();

        router.replace(transactionId ? `/landing/detail?${new URLSearchParams({ tx: transactionId }).toString()}` : "/landing/search");
    }, [router, searchParams]);

    return null;
}

export default MobilePaymentEntryPage;
