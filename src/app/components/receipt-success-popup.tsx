"use client";

// Import Library
import { useEffect, useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
// Import Lib
import { formatExitTime } from "@/src/app/lib/date";
// Import Types
import type { ReceiptSuccessPopupContentProps, ReceiptSuccessPopupProps } from "@/src/app/type/ui.type";
// Import CSS
import "@/src/app/css/receipt-success-popup.css";
// Import Icons
import { FiCheck, FiPrinter } from "react-icons/fi";

/* -------------------------------------- Config -------------------------------------- */

// Config เวลานับถอยหลังก่อนปิด Popup อัตโนมัติ (วินาที)
const AUTO_CLOSE_SECONDS = 5;

/* -------------------------------------- Helpers -------------------------------------- */

// Function แสดงเนื้อหา Popup ชำระเงินสำเร็จและปิดเองเมื่อครบ AUTO_CLOSE_SECONDS
function ReceiptSuccessPopupContent({ onClose, exitTimeLimit }: ReceiptSuccessPopupContentProps): ReactElement {
    const t = useTranslations("ReceiptSuccessPopup");
    const common = useTranslations("Common");
    const locale = useLocale();
    const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
    const formattedExitTime = formatExitTime(exitTimeLimit ?? null, locale);

    useEffect(() => {
        const closeTimer = window.setTimeout(onClose, AUTO_CLOSE_SECONDS * 1000);
        const countdownTimer = window.setInterval(() => {
            setTimeLeft((value) => Math.max(value - 1, 0));
        }, 1000);

        return () => {
            window.clearTimeout(closeTimer);
            window.clearInterval(countdownTimer);
        };
    }, [onClose]);

    return (
        <div className="receipt-popup-overlay">
            <div className="receipt-popup" role="dialog" aria-modal="true" aria-labelledby="receipt-popup-title">
                <div className="receipt-popup__header">
                    <span className="receipt-popup__dot" />
                    <h2 id="receipt-popup-title">{t("title")}</h2>
                </div>

                <div className="receipt-popup__brand-card">
                    <div className="receipt-popup__brand-icon">P</div>
                    <h3>{common("smartCarpark")}</h3>
                    <p>{common("paymentService")}</p>
                </div>

                <div className="receipt-popup__body-card">
                    <h4>{t("printReceipt")}</h4>

                    <div className="receipt-popup__check-circle">
                        <FiCheck />
                    </div>

                    <div className="receipt-popup__print-btn" aria-live="polite">
                        <FiPrinter />
                        {t("takeReceipt")}
                    </div>

                    <p className="receipt-popup__thankyou">{t("thankYou")}</p>
                    {formattedExitTime ? <p className="receipt-popup__exit-time">{t("exitWithin", { exitTimeLimit: formattedExitTime })}</p> : null}
                    <p className="receipt-popup__countdown">{t("autoClose", { seconds: timeLeft })}</p>
                    <span className="receipt-popup__line" />
                </div>

                <button type="button" className="receipt-popup__finish-btn" onClick={onClose}>
                    {t("finish")}
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดง Popup ชำระเงินสำเร็จเมื่อ open (mount เนื้อหาใหม่ทุกครั้งเพื่อเริ่มนับถอยหลังใหม่)
function ReceiptSuccessPopup({ open, onClose, exitTimeLimit }: ReceiptSuccessPopupProps): ReactElement | null {
    if (!open) return null;

    return <ReceiptSuccessPopupContent onClose={onClose} exitTimeLimit={exitTimeLimit} />;
}

export default ReceiptSuccessPopup;
