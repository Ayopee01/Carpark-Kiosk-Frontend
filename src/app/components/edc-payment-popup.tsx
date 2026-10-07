"use client";

// Import Library
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
// Import Lib
import { ApiClientError, NETWORK_ERROR_CODE, recordEdcPayment } from "@/src/app/lib/api/client-api";
import { EdcNotConnectedError, edcAdapter } from "@/src/app/lib/edc-adapter";
import { completionFromTransaction } from "@/src/app/lib/payment/payment-result";
// Import Types
import type { EdcApproval, EdcPaymentPopupContentProps, EdcPaymentPopupProps, EdcStep } from "@/src/app/type/payment.type";
// Import CSS
import "@/src/app/css/payment-popup.css";
// Import Icons
import { BsCreditCard } from "react-icons/bs";
import { FiXCircle } from "react-icons/fi";

/* -------------------------------------- Helpers -------------------------------------- */

// Function สั่งเครื่อง EDC ตัดบัตรตามยอดค้างแล้วบันทึกผลที่ Backend (ส่งซ้ำด้วย reference เดิมได้อย่างปลอดภัย)
function EdcPaymentPopupContent({ onClose, transaction, edc, onSuccess }: EdcPaymentPopupContentProps): ReactElement {
    const [step, setStep] = useState<EdcStep>("idle");
    const [error, setError] = useState("");
    const [approval, setApproval] = useState<EdcApproval | null>(null);

    const t = useTranslations("EdcPopup");
    const common = useTranslations("Common");
    const locale = useLocale();

    const numberLocale = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "th-TH";
    const isBusy = step === "card" || step === "saving";

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const saveApproval = useCallback(
        async (nextApproval: EdcApproval): Promise<void> => {
            setStep("saving");
            setError("");

            try {
                const result = await recordEdcPayment({
                    transactionId: transaction.transactionId,
                    amount: nextApproval.amount,
                    reference: nextApproval.reference,
                    terminalId: nextApproval.terminalId,
                });

                onSuccess?.(completionFromTransaction(result.transaction));
            } catch (saveError) {
                // ไม่ถึง Backend หรือ Backend ล่ม: ส่งซ้ำด้วย reference เดิมได้ (ได้ duplicate: true ถ้าเคยบันทึกแล้ว)
                if (!(saveError instanceof ApiClientError) || saveError.code === NETWORK_ERROR_CODE || saveError.status >= 500) {
                    setStep("retry");
                    setError(t("saveNetworkFailed", { reference: nextApproval.reference }));
                    return;
                }

                // Backend ปฏิเสธหลังเครื่องอนุมัติแล้ว ไม่เปลี่ยนหน้า เพื่อให้พนักงานเห็นเลขอนุมัติและ void ที่เครื่อง EDC
                setStep("void");
                setError(t("voidRequired", { message: saveError.message, reference: nextApproval.reference }));
            }
        },
        [onSuccess, t, transaction.transactionId]
    );

    const startCardPayment = useCallback(async (): Promise<void> => {
        setStep("card");
        setError("");
        setApproval(null);

        let nextApproval: EdcApproval;

        try {
            nextApproval = await edcAdapter.charge({ amount: transaction.amount.remainingAmount, terminalId: edc.terminalId });
        } catch (cardError) {
            setStep("failed");
            setError(t(cardError instanceof EdcNotConnectedError ? "notConnected" : "cardFailed"));
            return;
        }

        setApproval(nextApproval);
        await saveApproval(nextApproval);
    }, [edc.terminalId, saveApproval, t, transaction.amount.remainingAmount]);

    return (
        <div className="payment-popup-overlay" onClick={isBusy ? undefined : onClose}>
            <div
                className="payment-popup"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edc-popup-title"
            >
                <div className="payment-popup__header">
                    <span className="payment-popup__dot" />
                    <h2 id="edc-popup-title">{t("title")}</h2>
                </div>

                <div className="payment-popup__card">
                    <div className="payment-popup__brand">
                        <div className="payment-popup__brand-icon">
                            <BsCreditCard />
                        </div>
                        <h3>{common("smartCarpark")}</h3>
                        <p>{t("terminal", { name: edc.deviceName, terminalId: edc.terminalId })}</p>
                    </div>

                    <div className="payment-popup__qr-frame">
                        <div className="payment-popup__qr-empty">
                            {step === "card" ? t("waitingCard") : step === "saving" ? t("saving") : t("instruction")}
                        </div>

                        <div className="payment-popup__price">
                            <span className="payment-popup__amount">{transaction.amount.remainingAmount.toLocaleString(numberLocale)}</span>
                            <span className="payment-popup__currency">{common("baht")}</span>
                        </div>
                    </div>
                </div>

                {error ? <p className="payment-popup__error">{error}</p> : null}

                {step === "retry" && approval ? (
                    <button type="button" className="payment-popup__close-btn" onClick={() => void saveApproval(approval)}>
                        <BsCreditCard />
                        <span>{t("retrySave")}</span>
                    </button>
                ) : step === "idle" || step === "failed" ? (
                    <button type="button" className="payment-popup__close-btn" onClick={() => void startCardPayment()}>
                        <BsCreditCard />
                        <span>{t("start")}</span>
                    </button>
                ) : null}

                <button type="button" className="payment-popup__close-btn" onClick={onClose} disabled={isBusy}>
                    <FiXCircle />
                    <span>{common("cancel")}</span>
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดง Popup ชำระด้วยบัตรเมื่อ open และอุปกรณ์ผูกเครื่อง EDC ไว้
function EdcPaymentPopup(props: EdcPaymentPopupProps): ReactElement | null {
    if (!props.open || !props.transaction || !props.edc) return null;

    return <EdcPaymentPopupContent onClose={props.onClose} onSuccess={props.onSuccess} transaction={props.transaction} edc={props.edc} />;
}

export default EdcPaymentPopup;
