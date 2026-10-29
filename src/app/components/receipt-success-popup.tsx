"use client";

// Import Library
import { useState, type ReactElement } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useInterval, useTimeout } from "usehooks-ts";
// Import Lib
import { toValidDate } from "@/src/app/lib/date";
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
    const format = useFormatter();
    const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
    const exitDate = toValidDate(exitTimeLimit);

    useTimeout(onClose, AUTO_CLOSE_SECONDS * 1000);
    useInterval(() => setTimeLeft((value) => Math.max(value - 1, 0)), timeLeft > 0 ? 1000 : null);

    return (
        // คลิกนอก Popup ไม่ปิด ต้องกดปุ่มเสร็จสิ้นหรือรอปิดเอง
        <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="receipt-popup-overlay">
                    <Dialog.Content className="receipt-popup" aria-describedby={undefined} onInteractOutside={(event) => event.preventDefault()}>
                        <div className="receipt-popup__header">
                            <span className="receipt-popup__dot" />
                            <Dialog.Title asChild>
                                <h2>{t("title")}</h2>
                            </Dialog.Title>
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
                            {exitDate ? (
                                <p className="receipt-popup__exit-time">{t("exitWithin", { exitTimeLimit: format.dateTime(exitDate, "dateTimeShort") })}</p>
                            ) : null}
                            <p className="receipt-popup__countdown">{t("autoClose", { seconds: timeLeft })}</p>
                            <span className="receipt-popup__line" />
                        </div>

                        <button type="button" className="receipt-popup__finish-btn" onClick={onClose}>
                            {t("finish")}
                        </button>
                    </Dialog.Content>
                </Dialog.Overlay>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดง Popup ชำระเงินสำเร็จเมื่อ open (mount เนื้อหาใหม่ทุกครั้งเพื่อเริ่มนับถอยหลังใหม่)
function ReceiptSuccessPopup({ open, onClose, exitTimeLimit }: ReceiptSuccessPopupProps): ReactElement | null {
    if (!open) return null;

    return <ReceiptSuccessPopupContent onClose={onClose} exitTimeLimit={exitTimeLimit} />;
}

export default ReceiptSuccessPopup;
