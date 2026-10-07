"use client";

// Import Library
import { useState, type ReactElement } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
// Import Components
import EdcPaymentPopup from "@/src/app/components/edc-payment-popup";
import PaymentPopup from "@/src/app/components/payment-popup";
// Import Hooks
import { usePaymentMethods } from "@/src/app/hooks/use-payment-methods";
// Import Lib
import { handleDeviceAccessError, simulateTestPayment } from "@/src/app/lib/api/client-api";
import { isPaymentTestEnabled } from "@/src/app/lib/feature-flags";
import { completionFromTransaction } from "@/src/app/lib/payment/payment-result";
// Import Types
import type { PaymentCompletion, PaymentOptionsProps, SupportedPaymentMethod } from "@/src/app/type/payment.type";
// Import Icons
import { BsCreditCard } from "react-icons/bs";
import { FaChevronRight } from "react-icons/fa";

// Function แสดงเฉพาะวิธีชำระที่ GET /client/payments/methods ส่งมา พร้อม Popup ของแต่ละวิธีและปุ่ม Dev Test
function PaymentOptions({ transaction, disabled, onSuccess, variant }: PaymentOptionsProps): ReactElement {
    const t = useTranslations("Detail");
    const common = useTranslations("Common");

    const { methods, edc, loading, failed } = usePaymentMethods(Boolean(transaction));
    const [activeMethod, setActiveMethod] = useState<SupportedPaymentMethod | null>(null);
    const [testing, setTesting] = useState(false);
    const [testError, setTestError] = useState("");

    const showDevTest = isPaymentTestEnabled();
    const status = loading
        ? t("methodsLoading")
        : failed
            ? t("methodsLoadFailed")
            : transaction && methods.length === 0
                ? t("methodsEmpty")
                : "";

    const handleSuccess = (result: PaymentCompletion): void => {
        setActiveMethod(null);
        onSuccess(result);
    };

    // Dev Test ต้องเปิด ENABLE_PAYMENT_SIMULATION ที่ Backend ด้วย ไม่งั้นได้ 403 PAYMENT_SIMULATION_DISABLED
    const runTestPayment = async (): Promise<void> => {
        if (!transaction) return;

        setTesting(true);
        setTestError("");

        try {
            const result = await simulateTestPayment({ transactionId: transaction.transactionId });
            onSuccess(completionFromTransaction(result.transaction));
        } catch (error) {
            if (handleDeviceAccessError(error)) return;
            setTestError(t("devTestFailed", { message: error instanceof Error ? error.message : "-" }));
        } finally {
            setTesting(false);
        }
    };

    return (
        <>
            {status ? <p className="payment-panel__note">{status}</p> : null}

            {methods.map((method) =>
                variant === "card" ? (
                    <div className="payment-card" key={method.id}>
                        <div className="payment-card__top">
                            {method.id === "promptpay" ? (
                                <Image
                                    src="/icon/PromptPay-logo.png"
                                    alt="PromptPay"
                                    className="promptpay-logo__img"
                                    width={64}
                                    height={64}
                                    style={{ objectFit: "contain" }}
                                />
                            ) : (
                                <BsCreditCard size={48} aria-hidden="true" />
                            )}

                            <div className="payment-card__tag">
                                <span>{t("fastSecure")}</span>
                                <i />
                            </div>
                        </div>

                        <div className="payment-card__body">
                            <h3>{method.label}</h3>
                            <p>{method.id === "promptpay" ? t("promptPayDescription") : t("cardDescription")}</p>
                        </div>

                        <div className="payment-card__button">
                            <button type="button" onClick={() => setActiveMethod(method.id)} disabled={disabled}>
                                {common("continue")}
                            </button>
                            <FaChevronRight />
                        </div>
                    </div>
                ) : (
                    <button
                        key={method.id}
                        type="button"
                        className="barrier-gate-payment__button"
                        onClick={() => setActiveMethod(method.id)}
                        disabled={disabled}
                    >
                        {method.label}
                    </button>
                )
            )}

            {showDevTest ? (
                <button
                    type="button"
                    className={variant === "button" ? "barrier-gate-payment__button" : "payment-panel__dev-test"}
                    onClick={() => void runTestPayment()}
                    disabled={disabled || testing || !transaction}
                >
                    {t("devTestTitle")}
                </button>
            ) : null}

            {testError ? <p className="payment-panel__note">{testError}</p> : null}

            <PaymentPopup open={activeMethod === "promptpay"} onClose={() => setActiveMethod(null)} transaction={transaction} onSuccess={handleSuccess} />

            <EdcPaymentPopup
                open={activeMethod === "card"}
                onClose={() => setActiveMethod(null)}
                transaction={transaction}
                edc={edc}
                onSuccess={handleSuccess}
            />
        </>
    );
}

export default PaymentOptions;
