"use client";

// Import Library
import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
// Import Types
import type { PlateNotFoundPopupProps } from "@/src/app/type/search.type";
// Import CSS
import "@/src/app/css/plate-not-found-popup.css";
// Import Icons
import { MdRefresh, MdSupportAgent } from "react-icons/md";

// Function แสดง Popup เมื่อไม่พบรายการจอดของทะเบียนที่ค้นหา
function PlateNotFoundPopup({ open, onClose, onRetry }: PlateNotFoundPopupProps): ReactElement {
    const t = useTranslations("PlateNotFoundPopup");

    return (
        <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="plate-popup-overlay">
                    <Dialog.Content className="plate-popup" aria-describedby={undefined}>
                        <div className="plate-popup__top">
                            <span className="plate-popup__dot" />
                            <span className="plate-popup__top-text">{t("topText")}</span>
                        </div>

                        <div className="plate-popup__card">
                            <Dialog.Title className="plate-popup__title">{t("title")}</Dialog.Title>

                            <div className="plate-popup__icon-wrap">
                                <div className="plate-popup__icon-btn">
                                    <MdRefresh />
                                </div>
                            </div>

                            <button type="button" className="plate-popup__retry-btn" onClick={onRetry}>
                                {t("retry")}
                            </button>

                            <div className="plate-popup__divider" />

                            <button type="button" className="plate-popup__contact-btn" onClick={onClose}>
                                <MdSupportAgent />
                                <span>{t("contactStaff")}</span>
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Overlay>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default PlateNotFoundPopup;
