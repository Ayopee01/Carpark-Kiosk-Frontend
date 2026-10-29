"use client";

// Import Library
import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Dialog, VisuallyHidden } from "radix-ui";
// Import Components
import LangButton from "@/src/app/components/lang-button";
// Import Types
import type { SideMenuProps } from "@/src/app/type/ui.type";
// Import CSS
import "@/src/app/css/side-menu.css";
// Import Icons
import { CiCircleQuestion } from "react-icons/ci";

// Function แสดง Side Menu ของ Mobile View (ปิดด้วย Escape หรือคลิกนอกเมนู และล็อก scroll ระหว่างเปิด)
function SideMenu({ open, onClose }: SideMenuProps): ReactElement {
    const t = useTranslations("SideMenu");

    return (
        <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="overlay" />

                <Dialog.Content className="sidebar" aria-describedby={undefined}>
                    <VisuallyHidden.Root>
                        <Dialog.Title>{t("title")}</Dialog.Title>
                    </VisuallyHidden.Root>

                    <div className="sidebar-content">
                        <LangButton />

                        <Link className="helpButton_side" href="/landing/help" onClick={onClose}>
                            <CiCircleQuestion />
                            {t("help")}
                        </Link>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default SideMenu;
