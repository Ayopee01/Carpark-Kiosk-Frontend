"use client";

// Import Library
import type { ReactElement } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

// Function แสดงหน้าล็อกเมื่ออุปกรณ์ปิดปรับปรุง หรือ token ใช้ไม่ได้ชั่วคราว (reason inactive / ip_not_allowed)
function MaintenancePage(): ReactElement {
    const t = useTranslations("Maintenance");
    const reason = useSearchParams().get("reason");

    const description =
        reason === "inactive" ? t("inactiveDescription") : reason === "ip_not_allowed" ? t("ipNotAllowedDescription") : t("description");

    return (
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <h1>{t("title")}</h1>
            <p>{description}</p>
        </main>
    );
}

export default MaintenancePage;
