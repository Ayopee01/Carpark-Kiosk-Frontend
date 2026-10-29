"use client";

// Import Library
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { differenceInSeconds } from "date-fns";
import { useFormatter, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useInterval } from "usehooks-ts";
// Import Components
import PlateCandidatePopup from "@/src/app/components/plate-candidate-popup";
// Import Lib
import { createPromptPayCharge, getChargeQrImageUrl, handleDeviceAccessError, hasErrorCode, simulatePaidCharge } from "@/src/app/lib/api/client-api";
import { subscribePaymentUpdates } from "@/src/app/lib/api/client-socket";
import { toValidDate } from "@/src/app/lib/date";
import { getActivatedDeviceType } from "@/src/app/lib/device";
import { isPaymentTestEnabled } from "@/src/app/lib/feature-flags";
import { completionFromPaymentEvent } from "@/src/app/lib/payment/payment-result";
// Import Types
import type { OmiseChargeResponse, PaymentUpdatedEvent, PlateCandidate, Satang } from "@/src/app/type/api.type";
import type { PaymentPopupContentProps, PaymentPopupProps, PaymentStep } from "@/src/app/type/payment.type";
// Import CSS
import "@/src/app/css/payment-popup.css";
// Import Icons
import { BsQrCodeScan } from "react-icons/bs";
import { FiXCircle } from "react-icons/fi";

/* -------------------------------------- Config -------------------------------------- */

// Config เวลาที่หน้าจอรอสแกนก่อนปิด Popup (ถ้า QR หมดอายุก่อนจะใช้เวลาหมดอายุของ QR แทน)
const PAYMENT_TIMEOUT_SECONDS = 60;

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงเงินสตางค์ของ Omise เป็นบาทก่อนแสดง
function satangToBaht(amount: Satang): number {
    return amount / 100;
}

// Function คำนวณวินาทีที่เหลือก่อนปิด Popup จาก expiresAt ของ charge (ไม่เกิน PAYMENT_TIMEOUT_SECONDS)
function getTimeoutSeconds(expiresAt: string | null): number {
    const expiresDate = toValidDate(expiresAt);
    if (!expiresDate) return PAYMENT_TIMEOUT_SECONDS;

    return Math.max(0, Math.min(PAYMENT_TIMEOUT_SECONDS, differenceInSeconds(expiresDate, new Date())));
}

// Function แสดง QR PromptPay ของรายการ และรอผลผ่าน payments:updated ของ Socket.IO
function PaymentPopupContent({ onClose, transaction, onSuccess }: PaymentPopupContentProps): ReactElement {
    const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT_SECONDS);
    const [step, setStep] = useState<PaymentStep>("creating");
    const [error, setError] = useState("");
    const [charge, setCharge] = useState<OmiseChargeResponse | null>(null);
    const [candidates, setCandidates] = useState<PlateCandidate[]>([]);
    const [simulating, setSimulating] = useState(false);
    const hasStartedPaymentRef = useRef(false);

    const t = useTranslations("PaymentPopup");
    const common = useTranslations("Common");
    const format = useFormatter();

    // มี charge แล้วแสดงยอดของ QR (สตางค์) ไม่งั้นแสดง remainingAmount จาก Backend
    const amount = charge ? satangToBaht(charge.amount) : transaction.amount.remainingAmount;
    const qrImageSrc = charge && step === "waiting" ? getChargeQrImageUrl(charge.chargeId) : null;
    const isBusy = step === "creating";

    // นับถอยหลังระหว่างรอสแกน ครบเวลาแล้วปิด Popup
    useInterval(
        () => {
            if (timeLeft <= 1) {
                onClose();
                return;
            }

            setTimeLeft(timeLeft - 1);
        },
        step === "waiting" ? 1000 : null
    );

    // successful = จ่ายสำเร็จ (applied = false แปลว่าเงินเข้าแต่ลงรายการไม่ได้), failed / expired / reversed ให้เริ่มใหม่ได้
    const handlePaymentUpdated = useCallback(
        (event: PaymentUpdatedEvent): void => {
            switch (event.paymentStatus) {
                case "successful":
                    if (event.applied === false) {
                        setStep("failed");
                        setError(t("paymentNotApplied"));
                        return;
                    }

                    setStep("successful");
                    onSuccess?.(completionFromPaymentEvent(event));
                    return;
                case "failed":
                    setStep("failed");
                    setError(t("paymentFailed"));
                    return;
                case "expired":
                    setStep("failed");
                    setError(t("paymentExpired"));
                    return;
                case "reversed":
                    setStep("failed");
                    setError(t("paymentReversed"));
                    return;
            }
        },
        [onSuccess, t]
    );

    useEffect(() => {
        if (!charge?.chargeId || step !== "waiting") return;

        return subscribePaymentUpdates(charge.chargeId, handlePaymentUpdated);
    }, [charge?.chargeId, handlePaymentUpdated, step]);

    const applyCharge = useCallback((nextCharge: OmiseChargeResponse): void => {
        setCharge(nextCharge);
        setTimeLeft(getTimeoutSeconds(nextCharge.expiresAt));
        setStep("waiting");
    }, []);

    const handleChargeError = useCallback(
        (paymentError: unknown): void => {
            if (handleDeviceAccessError(paymentError)) return;

            setStep("failed");

            if (hasErrorCode(paymentError, "MULTIPLE_PLATE_MATCHES")) {
                const nextCandidates = paymentError.detail("candidates");
                if (Array.isArray(nextCandidates)) {
                    setCandidates(nextCandidates as PlateCandidate[]);
                    return;
                }
            }

            // PromptPay ยอดค้างต่ำกว่าขั้นต่ำของ gateway (minimumAmount / remainingAmount เป็นบาท)
            if (hasErrorCode(paymentError, "AMOUNT_BELOW_GATEWAY_MINIMUM")) {
                const minimumAmount = paymentError.detail("minimumAmount");
                const remainingAmount = paymentError.detail("remainingAmount");

                setError(
                    t("amountBelowMinimum", {
                        minimumAmount: typeof minimumAmount === "number" ? format.number(minimumAmount) : "-",
                        remainingAmount: format.number(typeof remainingAmount === "number" ? remainingAmount : transaction.amount.remainingAmount),
                    })
                );
                return;
            }

            if (hasErrorCode(paymentError, "NO_REMAINING_AMOUNT")) {
                setError(t("noRemainingAmount"));
                return;
            }

            console.warn("Create PromptPay charge failed:", paymentError);
            setError(t("paymentFailed"));
        },
        [format, t, transaction.amount.remainingAmount]
    );

    // ส่งทะเบียนเต็มเท่านั้น ห้ามส่ง amount (Backend คืน QR เดิมพร้อม reused: true ถ้ายังสแกนได้)
    // Mobile ต้องส่ง transactionId จาก QR บนตั๋วด้วย เพราะ Backend ไม่ให้ Mobile อ้างรายการด้วยทะเบียนอย่างเดียว
    const requestCharge = useCallback(
        () =>
            createPromptPayCharge({
                plateNo: transaction.plateNo,
                method: "promptpay",
                ...(getActivatedDeviceType() === null ? { transactionId: transaction.transactionId } : {}),
            })
                .then(({ charge: nextCharge }) => applyCharge(nextCharge))
                .catch(handleChargeError),
        [applyCharge, handleChargeError, transaction.plateNo, transaction.transactionId]
    );

    useEffect(() => {
        if (hasStartedPaymentRef.current) return;
        hasStartedPaymentRef.current = true;
        void requestCharge();
    }, [requestCharge]);

    // Dev Test: จำลองว่า QR นี้ถูกสแกนจ่ายแล้ว ผลส่งกลับมาทาง payments:updated เหมือนจ่ายจริง
    // Backend ต้องเปิด ENABLE_PAYMENT_SIMULATION ไม่งั้นได้ 403 PAYMENT_SIMULATION_DISABLED
    const simulatePaid = async (): Promise<void> => {
        if (!charge) return;

        setSimulating(true);
        setError("");

        try {
            await simulatePaidCharge({ chargeId: charge.chargeId });
        } catch (simulateError) {
            setError(t("devTestFailed", { message: simulateError instanceof Error ? simulateError.message : "-" }));
        } finally {
            setSimulating(false);
        }
    };

    const retryPayment = (): void => {
        setStep("creating");
        setError("");
        setCharge(null);
        void requestCharge();
    };

    return (
        <>
            {/* ระหว่างสร้าง QR ปิด Popup ไม่ได้ */}
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
                                    <div className="payment-popup__brand-icon">P</div>
                                    <h3>{common("smartCarpark")}</h3>
                                    <p>{common("paymentService")}</p>
                                    <strong>{common("promptPay")}</strong>
                                </div>

                                <div className="payment-popup__qr-frame">
                                    {qrImageSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- รูป QR ของ charge โหลดจาก API ตรง ห้ามผ่าน optimizer/cache
                                        <img className="payment-popup__qr-icon" src={qrImageSrc} alt={t("qrAlt")} />
                                    ) : (
                                        <div className="payment-popup__qr-empty">{step === "creating" ? t("creatingQr") : t("qrUnavailable")}</div>
                                    )}

                                    <div className="payment-popup__price">
                                        <span className="payment-popup__amount">{format.number(amount)}</span>
                                        <span className="payment-popup__currency">{common("baht")}</span>
                                    </div>
                                </div>
                            </div>

                            {step === "waiting" ? (
                                <div className="payment-popup__countdown">
                                    {t("payWithin")} <strong>{timeLeft}</strong> {common("seconds")}
                                </div>
                            ) : null}

                            {error ? <p className="payment-popup__error">{error}</p> : null}

                            {step === "failed" ? (
                                <button type="button" className="payment-popup__close-btn" onClick={retryPayment}>
                                    <BsQrCodeScan />
                                    <span>{t("retry")}</span>
                                </button>
                            ) : (
                                <button type="button" className="payment-popup__close-btn" disabled>
                                    <BsQrCodeScan />
                                    <span>{step === "creating" ? t("creatingQr") : t("waitingVerification")}</span>
                                </button>
                            )}

                            {isPaymentTestEnabled() && step === "waiting" ? (
                                <button type="button" className="payment-popup__close-btn" onClick={() => void simulatePaid()} disabled={simulating}>
                                    <span>{t("devTestTitle")}</span>
                                </button>
                            ) : null}

                            <button type="button" className="payment-popup__close-btn" onClick={onClose} disabled={isBusy}>
                                <FiXCircle />
                                <span>{t("cancel")}</span>
                            </button>
                        </Dialog.Content>
                    </Dialog.Overlay>
                </Dialog.Portal>
            </Dialog.Root>

            <PlateCandidatePopup
                open={candidates.length > 0}
                candidates={candidates}
                onClose={() => setCandidates([])}
                onSelect={(plateNo) => {
                    setCandidates([]);
                    const targetParams = new URLSearchParams({ plateNo });

                    window.location.replace(
                        getActivatedDeviceType() === "barrier-gate"
                            ? `/landing/check-payment?${targetParams.toString()}`
                            : `/landing/detail?${targetParams.toString()}`
                    );
                }}
            />
        </>
    );
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดง Popup ชำระด้วย QR PromptPay เมื่อ open และมีรายการจอด
function PaymentPopup(props: PaymentPopupProps): ReactElement | null {
    if (!props.open || !props.transaction) return null;

    return <PaymentPopupContent onClose={props.onClose} onSuccess={props.onSuccess} transaction={props.transaction} />;
}

export default PaymentPopup;
