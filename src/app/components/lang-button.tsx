"use client";

// Import Library
import { useEffect, useRef, useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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

/* -------------------------------------- Helpers -------------------------------------- */

// Function บันทึกภาษาที่เลือกลง cookie locale ที่ i18n/request.ts อ่าน
function saveLocaleCookie(locale: SupportedLocale): void {
    document.cookie = `locale=${locale}; path=/; samesite=lax`;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงปุ่มเลือกภาษาแบบ Dropdown (บันทึก locale ใน cookie แล้ว refresh หน้า)
function LangButton({ variant = "side" }: LangButtonProps): ReactElement {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const wrapRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const locale = useLocale();
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

        saveLocaleCookie(nextLocale);
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <div className={variant === "nav" ? "langDropdown langDropdown--nav" : "langDropdown langDropdown--side"} ref={wrapRef}>
            <button
                type="button"
                className={variant === "nav" ? "langButton" : "langButton_side"}
                onClick={() => setOpen((prev) => !prev)}
                disabled={isPending}
            >
                <span>{isPending ? "..." : locale.toUpperCase()}</span>
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
                            disabled={isPending}
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
