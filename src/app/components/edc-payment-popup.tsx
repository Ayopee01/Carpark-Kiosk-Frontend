"use client";

// Import Library
import { useCallback, useState, type ReactElement } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
// Import Lib
import { recordEdcPayment } from "@/src/app/lib/api/client-api";
import { EdcNotConnectedError, edcAdapter } from "@/src/app/lib/edc-adapter";
import { classifyEdcSaveError } from "@/src/app/lib/payment/edc-save-error";
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
    const format = useFormatter();

    const isBusy = step === "card" || step === "saving";

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
                const { reference } = nextApproval;

                switch (classifyEdcSaveError(saveError)) {
                    case "retry":
                        setStep("retry");
                        setError(t("saveNetworkFailed", { reference }));
                        return;
                    case "limited":
                        setStep("retry");
                        setError(t("saveLimited", { reference }));
                        return;
                    // ผู้ให้บริการ EDC ไม่พบเลขอนุมัติ: ไม่ถือว่าจ่ายแล้ว ให้เจ้าหน้าที่ตรวจสอบ
                    case "rejected":
                        setStep("rejected");
                        setError(t("approvalRejected", { reference }));
                        return;
                    // Backend ปฏิเสธหลังเครื่องอนุมัติแล้ว ไม่เปลี่ยนหน้า เพื่อให้พนักงานเห็นเลขอนุมัติและ void ที่เครื่อง EDC
                    case "void":
                        setStep("void");
                        setError(t("voidRequired", { message: saveError instanceof Error ? saveError.message : "", reference }));
                        return;
                }
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
        // ระหว่างรอบัตรหรือบันทึกผลปิด Popup ไม่ได้
        <Dialog.Root open onOpenChange={(open) => !open && !isBusy && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="payment-popup-overlay">
                    <Dialog.Content className="payment-popup" aria-describedby={undefined}>
                        <div className="payment-popup__header">
                            <span className="payment-popup__dot" />
                            <Dialog.Title>{t("title")}</Dialog.Title>
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
                                    <span className="payment-popup__amount">{format.number(transaction.amount.remainingAmount)}</span>
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
                    </Dialog.Content>
                </Dialog.Overlay>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดง Popup ชำระด้วยบัตรเมื่อ open และอุปกรณ์ผูกเครื่อง EDC ไว้
function EdcPaymentPopup(props: EdcPaymentPopupProps): ReactElement | null {
    if (!props.open || !props.transaction || !props.edc) return null;

    return <EdcPaymentPopupContent onClose={props.onClose} onSuccess={props.onSuccess} transaction={props.transaction} edc={props.edc} />;
}

export default EdcPaymentPopup;
