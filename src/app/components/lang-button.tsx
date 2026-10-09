"use client";

// Import Library
import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
// Import Providers
import { useLocaleSetting } from "@/src/app/providers/locale-provider";
// Import Types
import type { LangButtonProps, SupportedLocale } from "@/src/app/type/ui.type";
// Import CSS
import "@/src/app/css/lang-button.css";
// Import Icons
import { FiChevronDown } from "react-icons/fi";

/* -------------------------------------- Config -------------------------------------- */

// Config ภาษาที่แสดงใน Dropdown และ key ข้อความแปลภาษาของชื่อภาษา
const LANGUAGE_OPTIONS: { locale: SupportedLocale; labelKey: "thai" | "english" | "chinese" }[] = [
    { locale: "th", labelKey: "thai" },
    { locale: "en", labelKey: "english" },
    { locale: "zh", labelKey: "chinese" },
];

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงปุ่มเลือกภาษาแบบ Dropdown (เปลี่ยนภาษาทันทีและจำภาษาที่เลือกล่าสุดไว้)
function LangButton({ variant = "side" }: LangButtonProps): ReactElement {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    const { locale, setLocale } = useLocaleSetting();
    const t = useTranslations("SideMenu");

    // ปิด Dropdown เมื่อคลิกนอกพื้นที่หรือกด Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleSelectLanguage = (nextLocale: SupportedLocale): void => {
        setOpen(false);
        if (nextLocale === locale) return;

        setLocale(nextLocale);
    };

    return (
        <div className={variant === "nav" ? "langDropdown langDropdown--nav" : "langDropdown langDropdown--side"} ref={wrapRef}>
            <button
                type="button"
                className={variant === "nav" ? "langButton" : "langButton_side"}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span>{locale.toUpperCase()}</span>
                <FiChevronDown className={open ? "rotate" : ""} />
            </button>

            {open ? (
                <div className="langDropdownMenu">
                    {LANGUAGE_OPTIONS.map((option) => (
                        <button
                            key={option.locale}
                            type="button"
                            className={`langDropdownItem ${locale === option.locale ? "active" : ""}`}
                            onClick={() => handleSelectLanguage(option.locale)}
                        >
                            {option.locale.toUpperCase()} - {t(option.labelKey)}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default LangButton;
