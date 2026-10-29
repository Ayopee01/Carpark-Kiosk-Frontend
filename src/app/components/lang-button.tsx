"use client";

// Import Library
import type { ReactElement } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { DropdownMenu } from "radix-ui";
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

// Function แสดงปุ่มเลือกภาษาแบบ Dropdown (เปลี่ยนภาษาทันทีและจำภาษาที่เลือกล่าสุดไว้, ปิดเมื่อคลิกนอกพื้นที่หรือกด Escape)
function LangButton({ variant = "side" }: LangButtonProps): ReactElement {
    const { locale, setLocale } = useLocaleSetting();
    const t = useTranslations("SideMenu");

    return (
        <div className={clsx("langDropdown", variant === "nav" ? "langDropdown--nav" : "langDropdown--side")}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button type="button" className={variant === "nav" ? "langButton" : "langButton_side"}>
                        <span>{locale.toUpperCase()}</span>
                        <FiChevronDown />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content className="langDropdownMenu" align="start" sideOffset={2}>
                        <DropdownMenu.RadioGroup value={locale} onValueChange={(value) => setLocale(value as SupportedLocale)}>
                            {LANGUAGE_OPTIONS.map((option) => (
                                <DropdownMenu.RadioItem key={option.locale} value={option.locale} className="langDropdownItem">
                                    {option.locale.toUpperCase()} - {t(option.labelKey)}
                                </DropdownMenu.RadioItem>
                            ))}
                        </DropdownMenu.RadioGroup>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
}

export default LangButton;
