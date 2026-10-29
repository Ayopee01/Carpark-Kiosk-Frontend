"use client";

// Import Library
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
// Import CSS
import "@/src/app/css/back-btn.css";
// Import Icons
import { FiChevronLeft } from "react-icons/fi";

// Function แสดงปุ่มย้อนกลับ (ไม่มีประวัติให้กลับหน้าแรก)
function BackBtn(): ReactElement {
    const router = useRouter();
    const t = useTranslations("Common");

    const handleBack = (): void => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push("/");
        }
    };

    return (
        <section>
            <button type="button" className="back-btn" onClick={handleBack}>
                <FiChevronLeft />
                <span>{t("back")}</span>
            </button>
        </section>
    );
}

export default BackBtn;
