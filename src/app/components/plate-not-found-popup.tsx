"use client";

// Import Library
import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
// Import Types
import type { PlateNotFoundPopupProps } from "@/src/app/type/search.type";
// Import CSS
import "@/src/app/css/plate-not-found-popup.css";
// Import Icons
import { MdRefresh, MdSupportAgent } from "react-icons/md";

// Function แสดง Popup เมื่อไม่พบรายการจอดของทะเบียนที่ค้นหา
function PlateNotFoundPopup({ open, onClose, onRetry }: PlateNotFoundPopupProps): ReactElement | null {
    const t = useTranslations("PlateNotFoundPopup");

    if (!open) return null;

    return (
        <div className="plate-popup-overlay" onClick={onClose}>
            <div
                className="plate-popup"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="plate-popup-title"
            >
                <div className="plate-popup__top">
                    <span className="plate-popup__dot" />
                    <span className="plate-popup__top-text">{t("topText")}</span>
                </div>

                <div className="plate-popup__card">
                    <h2 id="plate-popup-title" className="plate-popup__title">
                        {t("title")}
                    </h2>

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
            </div>
        </div>
    );
}

export default PlateNotFoundPopup;
