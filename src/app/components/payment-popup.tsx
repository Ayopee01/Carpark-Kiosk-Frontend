"use client";

// Import Library
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
// Import Components
import PlateCandidatePopup from "@/src/app/components/plate-candidate-popup";
// Import Lib
import { createPromptPayCharge, getChargeQrImageUrl, handleDeviceAccessError, hasErrorCode } from "@/src/app/lib/api/client-api";
import { openPaymentSocket } from "@/src/app/lib/api/payment-socket";
import { getActivatedDeviceType } from "@/src/app/lib/device";
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
    if (!expiresAt) return PAYMENT_TIMEOUT_SECONDS;

    const secondsLeft = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Number.isFinite(secondsLeft) ? Math.max(0, Math.min(PAYMENT_TIMEOUT_SECONDS, secondsLeft)) : PAYMENT_TIMEOUT_SECONDS;
}

// Function แสดง QR PromptPay ของรายการ และรอผลผ่าน Payment WebSocket
function PaymentPopupContent({ onClose, transaction, onSuccess }: PaymentPopupContentProps): ReactElement {
    const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT_SECONDS);
    const [step, setStep] = useState<PaymentStep>("creating");
    const [error, setError] = useState("");
    const [charge, setCharge] = useState<OmiseChargeResponse | null>(null);
    const [candidates, setCandidates] = useState<PlateCandidate[]>([]);
    const hasStartedPaymentRef = useRef(false);

    const t = useTranslations("PaymentPopup");
    const common = useTranslations("Common");
    const locale = useLocale();

    const numberLocale = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "th-TH";
    // มี charge แล้วแสดงยอดของ QR (สตางค์) ไม่งั้นแสดง remainingAmount จาก Backend
    const amount = charge ? satangToBaht(charge.amount) : transaction.amount.remainingAmount;
    const qrImageSrc = charge && step === "waiting" ? getChargeQrImageUrl(charge.chargeId) : null;
    const isBusy = step === "creating";

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // นับถอยหลังระหว่างรอสแกน ครบเวลาแล้วปิด Popup
    useEffect(() => {
        if (step !== "waiting") return;

        if (timeLeft <= 0) {
            onClose();
            return;
        }

        const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [onClose, step, timeLeft]);

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

        return openPaymentSocket(charge.chargeId, handlePaymentUpdated);
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
                        minimumAmount: typeof minimumAmount === "number" ? minimumAmount.toLocaleString(numberLocale) : "-",
                        remainingAmount:
                            typeof remainingAmount === "number"
                                ? remainingAmount.toLocaleString(numberLocale)
                                : transaction.amount.remainingAmount.toLocaleString(numberLocale),
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
        [numberLocale, t, transaction.amount.remainingAmount]
    );

    // ส่งทะเบียนเต็มเท่านั้น ห้ามส่ง amount (Backend คืน QR เดิมพร้อม reused: true ถ้ายังสแกนได้)
    const requestCharge = useCallback(
        () =>
            createPromptPayCharge({ plateNo: transaction.plateNo, method: "promptpay" })
                .then(({ charge: nextCharge }) => applyCharge(nextCharge))
                .catch(handleChargeError),
        [applyCharge, handleChargeError, transaction.plateNo]
    );

    useEffect(() => {
        if (hasStartedPaymentRef.current) return;
        hasStartedPaymentRef.current = true;
        void requestCharge();
    }, [requestCharge]);

    const retryPayment = (): void => {
        setStep("creating");
        setError("");
        setCharge(null);
        void requestCharge();
    };

    return (
        <>
            <div className="payment-popup-overlay" onClick={isBusy ? undefined : onClose}>
                <div
                    className="payment-popup"
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="payment-popup-title"
                >
                    <div className="payment-popup__header">
                        <span className="payment-popup__dot" />
                        <h2 id="payment-popup-title">{t("title")}</h2>
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
                                <img className="payment-popup__qr-icon" src={qrImageSrc} alt={t("qrAlt")} />
                            ) : (
                                <div className="payment-popup__qr-empty">{step === "creating" ? t("creatingQr") : t("qrUnavailable")}</div>
                            )}

                            <div className="payment-popup__price">
                                <span className="payment-popup__amount">{amount.toLocaleString(numberLocale)}</span>
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

                    <button type="button" className="payment-popup__close-btn" onClick={onClose} disabled={isBusy}>
                        <FiXCircle />
                        <span>{t("cancel")}</span>
                    </button>
                </div>
            </div>

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
