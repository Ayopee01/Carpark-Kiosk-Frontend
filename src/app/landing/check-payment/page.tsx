"use client";

// Import Library
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
// Import Components
import PaymentOptions from "@/src/app/components/payment-options";
// Import Lib
import { normalizePlateNo } from "@/src/app/lib/plate";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storage-keys";
import { lookupPlate, lookupTransactionId } from "@/src/app/lib/transaction-lookup";
// Import Types
import type { ClientTransaction } from "@/src/app/type/api.type";
import type { CheckPaymentPageState } from "@/src/app/type/barrier.type";
// Import CSS
import "@/src/app/css/barrier-gate.css";
// Import Icons
import { LuCheck, LuLoader, LuX } from "react-icons/lu";

/* -------------------------------------- Config -------------------------------------- */

// Config เวลาที่แสดงผลชำระสำเร็จก่อนกลับไปหน้าไม้กั้น
const RETURN_TO_BARRIER_MS = 2500;

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงหน้าชำระเงินที่ไม้กั้น (ไม่เปิดไม้กั้นเอง ต้องรอ LPR ส่ง openGate === true ที่หน้าไม้กั้น)
function BarrierCheckPaymentPage(): ReactElement {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("BarrierGate");
    const common = useTranslations("Common");
    const plateNo = normalizePlateNo(searchParams.get("plateNo") ?? "");
    const transactionId = searchParams.get("transactionId")?.trim() ?? "";

    const [transaction, setTransaction] = useState<ClientTransaction | null>(null);
    const [state, setState] = useState<CheckPaymentPageState>("loading");
    const [message, setMessage] = useState("");

    const remainingAmount = transaction?.amount.remainingAmount ?? 0;

    const returnToBarrier = useCallback((): void => {
        const returnUrl = sessionStorage.getItem(BARRIER_RETURN_STORAGE_KEY);

        if (returnUrl?.startsWith("/landing/barrier-gate")) {
            sessionStorage.removeItem(BARRIER_RETURN_STORAGE_KEY);
            router.replace(returnUrl);
            return;
        }

        router.replace("/landing/barrier-gate");
    }, [router]);

    useEffect(() => {
        let cancelled = false;

        const loadTransaction = async (): Promise<void> => {
            if (!plateNo && !transactionId) {
                setState("error");
                setMessage(t("errorNotFound"));
                return;
            }

            setState("loading");
            setMessage("");

            // lpr_detected มี transactionId จึงค้นด้วย id ก่อนเพื่อให้ตรงคันแน่นอน
            const outcome = transactionId ? await lookupTransactionId(transactionId) : await lookupPlate(plateNo);

            if (cancelled || outcome.kind === "redirected") return;

            switch (outcome.kind) {
                case "found":
                    setTransaction(outcome.transaction);
                    setState("ready");
                    setMessage(t("actionPaymentRequired"));
                    return;
                case "not_found":
                case "invalid_plate":
                case "multiple":
                    setState("error");
                    setMessage(t("errorNotFound"));
                    return;
                case "already_processed":
                    setState("error");
                    setMessage(t("denyProcessed"));
                    return;
                case "error":
                    setState("error");
                    setMessage(t("errorCheckFailed"));
                    return;
            }
        };

        void loadTransaction();

        return () => {
            cancelled = true;
        };
    }, [plateNo, t, transactionId]);

    // ช่องทาง gate ปิดรายการเป็น completed ให้แล้ว จึงกลับไปรอ lpr_detected ขาออกที่หน้าไม้กั้น
    const handlePaymentSuccess = (): void => {
        setState("paid");
        setMessage(t("paymentSuccessWaitLpr"));
        window.setTimeout(returnToBarrier, RETURN_TO_BARRIER_MS);
    };

    return (
        <main className="barrier-gate-page">
            <section className="barrier-gate-page__content">
                <header className="barrier-gate-header">
                    <div className="barrier-gate-header__icon">
                        {state === "loading" ? <LuLoader className="barrier-gate-spin" /> : state === "paid" ? <LuCheck /> : <LuX />}
                    </div>
                    <h1>{t("checkPaymentTitle")}</h1>
                    <p>{t("checkPaymentSubtitle")}</p>
                </header>

                <section className="barrier-gate-capture" aria-live="polite">
                    <span className="barrier-gate-capture__label">{plateNo ? t("inputLabel") : t("transactionId")}</span>
                    <strong>{transaction?.plateNo || plateNo || transactionId || "-"}</strong>
                    <p>{message || common("pleaseWait")}</p>
                </section>

                {transaction ? (
                    <section className="barrier-gate-payment">
                        <div>
                            <span>{t("remaining")}</span>
                            <h2>
                                {remainingAmount.toLocaleString("th-TH")} {common("baht")}
                            </h2>
                            <p>{t("paymentRequiredDescription")}</p>
                        </div>

                        <div className="barrier-gate-payment__amount">
                            <span>{t("eventStatus")}</span>
                            <strong>{transaction.status}</strong>
                        </div>

                        <PaymentOptions
                            variant="button"
                            transaction={transaction}
                            disabled={state !== "ready" || remainingAmount <= 0}
                            onSuccess={handlePaymentSuccess}
                        />
                    </section>
                ) : null}

                {state === "error" ? (
                    <button type="button" className="barrier-gate-reset" onClick={returnToBarrier}>
                        {t("reset")}
                    </button>
                ) : null}
            </section>
        </main>
    );
}

export default BarrierCheckPaymentPage;
