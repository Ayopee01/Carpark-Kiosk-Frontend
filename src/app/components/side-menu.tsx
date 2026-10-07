"use client";

// Import Library
import { useEffect, type ReactElement } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
// Import Components
import LangButton from "@/src/app/components/lang-button";
// Import Types
import type { SideMenuProps } from "@/src/app/type/ui.type";
// Import CSS
import "@/src/app/css/side-menu.css";
// Import Icons
import { CiCircleQuestion } from "react-icons/ci";

// Function แสดง Side Menu ของ Mobile View (ปิดด้วย Escape และล็อก scroll ระหว่างเปิด)
function SideMenu({ open, onClose }: SideMenuProps): ReactElement {
    const t = useTranslations("SideMenu");

    useEffect(() => {
        const handleKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";

        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <>
            <div className={`overlay ${open ? "show" : ""}`} onClick={onClose} />

            <aside className={`sidebar ${open ? "open" : ""}`}>
                <div className="sidebar-content">
                    <LangButton />

                    <Link className="helpButton_side" href="/landing/help" onClick={onClose}>
                        <CiCircleQuestion />
                        {t("help")}
                    </Link>
                </div>
            </aside>
        </>
    );
}

export default SideMenu;
