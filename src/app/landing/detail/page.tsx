"use client";

// Import Library
import { useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
// Import Components
import BackBtn from "@/src/app/components/back-btn";
import PaymentOptions from "@/src/app/components/payment-options";
import PlateCandidatePopup from "@/src/app/components/plate-candidate-popup";
import PlateNotFoundPopup from "@/src/app/components/plate-not-found-popup";
import ReceiptSuccessPopup from "@/src/app/components/receipt-success-popup";
// Import Lib
import { getActivatedDeviceType } from "@/src/app/lib/device";
import { normalizePlateNo } from "@/src/app/lib/plate";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storage-keys";
import { lookupPlate, lookupTransactionId } from "@/src/app/lib/transaction-lookup";
// Import Types
import type { ClientTransaction, PlateCandidate } from "@/src/app/type/api.type";
import type { PaymentCompletion } from "@/src/app/type/payment.type";
import type { DetailData, DetailTranslator, DurationPartKey, DurationParts } from "@/src/app/type/transaction.type";
// Import CSS
import "@/src/app/css/detail.css";
// Import Icons
import { FaCheck } from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";

/* -------------------------------------- Helpers -------------------------------------- */

// Function เลือก locale ของวันที่ (ภาษาไทยใช้ปีพุทธศักราช)
function getDateLocale(locale: string): string {
    if (locale === "zh") return "zh-CN";
    if (locale === "en") return "en-US";
    return "th-TH-u-ca-buddhist";
}

// Function แปลงวันที่เป็นข้อความตามเวลาไทย (ค่าว่างหรือผิดรูปแบบคืน "-")
function formatDate(value: string | null, locale: string): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(getDateLocale(locale), {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Bangkok",
    }).format(date);
}

// Function แปลงเวลาเป็น HH:mm ตามเวลาไทย (ค่าว่างหรือผิดรูปแบบคืน "-")
function formatTime(value: string | null, locale: string): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(date);
}

// Function เพิ่มจำนวนปีให้วันที่ (วันที่ 29 ก.พ. ที่ไม่มีในปีปลายทางเลื่อนเป็นสิ้นเดือน)
function addYears(date: Date, years: number): Date {
    const next = new Date(date);
    const month = next.getMonth();
    next.setFullYear(next.getFullYear() + years);

    if (next.getMonth() !== month) next.setDate(0);

    return next;
}

// Function เพิ่มจำนวนเดือนให้วันที่ (วันที่ไม่มีในเดือนปลายทางเลื่อนเป็นสิ้นเดือน)
function addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    const month = next.getMonth();
    next.setMonth(next.getMonth() + months);

    if (next.getMonth() !== (month + months) % 12) next.setDate(0);

    return next;
}

// Function นับจำนวนหน่วยปฏิทินเต็มระหว่าง start ถึง end และคืนวันที่ที่นับถึง
function countCalendarUnits(start: Date, end: Date, addUnit: (date: Date, value: number) => Date): { count: number; cursor: Date } {
    let count = 0;
    let cursor = new Date(start);

    while (true) {
        const next = addUnit(cursor, 1);
        if (next.getTime() > end.getTime()) break;

        cursor = next;
        count += 1;
    }

    return { count, cursor };
}

// Function แยกนาทีเป็นวัน/ชั่วโมง/นาที (ค่าติดลบหรือไม่ใช่ตัวเลขคืน null)
function durationPartsFromMinutes(totalMinutes: number, initial: Partial<Pick<DurationParts, "years" | "months">> = {}): DurationParts | null {
    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return null;

    return {
        years: initial.years ?? 0,
        months: initial.months ?? 0,
        days: Math.floor(totalMinutes / 1440),
        hours: Math.floor((totalMinutes % 1440) / 60),
        minutes: Math.floor(totalMinutes % 60),
    };
}

// Function คำนวณระยะเวลาจอดจากเวลาเข้าถึงเวลาคำนวณ แยกเป็นปี/เดือน/วัน/ชั่วโมง/นาที
function durationPartsFromDates(startValue: string | null, endValue: string | null): DurationParts | null {
    if (!startValue || !endValue) return null;

    const start = new Date(startValue);
    const end = new Date(endValue);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) return null;

    const years = countCalendarUnits(start, end, addYears);
    const months = countCalendarUnits(years.cursor, end, addMonths);
    const remainingMinutes = Math.floor((end.getTime() - months.cursor.getTime()) / 60000);

    return durationPartsFromMinutes(remainingMinutes, { years: years.count, months: months.count });
}

// Function แปลงระยะเวลาเป็นข้อความ (มีหน่วยวันขึ้นไปจะแสดงชั่วโมงและนาทีเสมอ)
function formatDurationParts(parts: DurationParts | null, t: DetailTranslator): string {
    if (!parts) return "-";

    const hasDateUnit = parts.years > 0 || parts.months > 0 || parts.days > 0;
    const items: Array<[DurationPartKey, number]> = [];

    if (parts.years > 0) items.push(["durationYear", parts.years]);
    if (parts.months > 0) items.push(["durationMonth", parts.months]);
    if (parts.days > 0) items.push(["durationDay", parts.days]);
    if (hasDateUnit || parts.hours > 0) items.push(["durationHour", parts.hours]);
    if (hasDateUnit || parts.hours > 0 || parts.minutes > 0) items.push(["durationMinute", parts.minutes]);
    if (items.length === 0) items.push(["durationMinute", 0]);

    return items.map(([key, count]) => t(key, { count })).join(" ");
}

// Function แสดงระยะเวลาจอดจาก entryAt ถึง calculatedAt (ไม่มีวันที่ใช้ duration.totalMinutes)
function formatDuration(item: ClientTransaction, t: DetailTranslator): string {
    const totalMinutes = item.duration?.totalMinutes ?? 0;
    let durationEndAt: string | null = item.calculatedAt;

    if (!durationEndAt && item.entryAt && Number.isFinite(totalMinutes)) {
        const start = new Date(item.entryAt);
        if (!Number.isNaN(start.getTime())) durationEndAt = new Date(start.getTime() + totalMinutes * 60000).toISOString();
    }

    const fromDates = durationPartsFromDates(item.entryAt, durationEndAt);
    return formatDurationParts(fromDates ?? durationPartsFromMinutes(totalMinutes), t);
}

// Function แปลงสถานะรายการจอดเป็นข้อความแปลภาษา
function getPaymentStatusLabel(status: string, t: DetailTranslator): string {
    switch (status) {
        case "pending":
            return t("statusPending");
        case "partially_paid":
            return t("statusPartiallyPaid");
        case "paid_waiting_exit":
            return t("statusPaidWaitingExit");
        case "completed":
            return t("statusCompleted");
        case "cancelled":
            return t("statusCancelled");
        default:
            return status || "-";
    }
}

// Function แปลงรายการจอดเป็นข้อมูลที่หน้า Detail แสดง (ยอดใช้ remainingAmount จาก Backend)
function mapKioskItemToDetailData(item: ClientTransaction, locale: string, t: DetailTranslator): DetailData {
    return {
        id: item.transactionId,
        billNo: item.billNo,
        plate: item.plateNo,
        province: "-",
        date: formatDate(item.entryAt, locale),
        entryTime: formatTime(item.entryAt, locale),
        duration: formatDuration(item, t),
        paymentStatus: getPaymentStatusLabel(item.status, t),
        amount: item.amount.remainingAmount,
        raw: item,
    };
}

// Function ตรวจว่ารายการไม่มียอดต้องจ่าย
function hasNoPaymentRequired(data: DetailData | null): boolean {
    return data ? data.amount <= 0 : false;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงรายละเอียดรายการจอดและช่องทางชำระ (ค้นด้วย plateNo หรือ tx = transaction id จาก qrData)
function DetailPage(): ReactElement {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const t = useTranslations("Detail");
    const common = useTranslations("Common");

    const plate = normalizePlateNo(searchParams.get("plateNo") ?? searchParams.get("plate") ?? "");
    const transactionId = searchParams.get("tx")?.trim() ?? "";
    const lookupKey = transactionId || plate;

    const [candidates, setCandidates] = useState<PlateCandidate[]>([]);
    const [isReceiptPopupOpen, setIsReceiptPopupOpen] = useState(false);
    const [data, setData] = useState<DetailData | null>(null);
    const [fetchError, setFetchError] = useState("");
    const [resolvedPlate, setResolvedPlate] = useState("");
    const [loading, setLoading] = useState(false);
    const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);
    const [paymentExitTimeLimit, setPaymentExitTimeLimit] = useState<string | null>(null);

    useEffect(() => {
        if (!lookupKey) return;

        let cancelled = false;

        const loadData = async (): Promise<void> => {
            setLoading(true);
            setFetchError("");
            setShowNotFoundPopup(false);

            const outcome = transactionId ? await lookupTransactionId(transactionId) : await lookupPlate(plate);

            if (cancelled || outcome.kind === "redirected") return;

            setResolvedPlate(lookupKey);
            setLoading(false);

            switch (outcome.kind) {
                case "found":
                    setData(mapKioskItemToDetailData(outcome.transaction, locale, t));
                    return;
                case "multiple":
                    setData(null);
                    setCandidates(outcome.candidates);
                    return;
                case "not_found":
                case "invalid_plate":
                    setData(null);
                    setShowNotFoundPopup(true);
                    return;
                case "already_processed":
                    setData(null);
                    setFetchError(t("errorAlreadyProcessed"));
                    return;
                case "error":
                    setData(null);
                    setFetchError(t("errorLoadFailed"));
                    return;
            }
        };

        void loadData();

        return () => {
            cancelled = true;
        };
    }, [locale, lookupKey, plate, t, transactionId]);

    const handlePaymentSuccess = (result: PaymentCompletion): void => {
        setPaymentExitTimeLimit(result.exitTimeLimit);
        setData((current) =>
            current
                ? {
                    ...current,
                    amount: result.remainingAmount ?? current.amount,
                    paymentStatus: result.transactionStatus ? getPaymentStatusLabel(result.transactionStatus, t) : current.paymentStatus,
                }
                : current
        );
        setIsReceiptPopupOpen(true);
    };

    const handleReceiptClose = (): void => {
        setIsReceiptPopupOpen(false);
        const barrierReturnUrl = sessionStorage.getItem(BARRIER_RETURN_STORAGE_KEY);

        if (barrierReturnUrl?.startsWith("/landing/barrier-gate")) {
            sessionStorage.removeItem(BARRIER_RETURN_STORAGE_KEY);
            router.replace(barrierReturnUrl);
            return;
        }

        router.replace(getActivatedDeviceType() === "kiosk" ? "/landing/dashboard" : "/landing/search");
    };

    const currentData = resolvedPlate === lookupKey ? data : null;
    const noPaymentRequired = hasNoPaymentRequired(currentData);
    const error = !lookupKey ? t("errorNoPlate") : resolvedPlate === lookupKey ? fetchError : "";
    const plateValue = currentData?.plate || plate || "-";

    return (
        <>
            <section className="detail-page">
                <div className="detail-page__content">
                    <div>
                        <BackBtn />
                    </div>

                    <header className="detail-page__header">
                        <h1>{t("title")}</h1>
                        <p>{t("subtitle")}</p>
                    </header>

                    <div className="detail-plate">
                        <div className="detail-plate-card">
                            <span className="detail-plate-card__label">{t("plateLabel")}</span>

                            <div className="detail-plate-card__input">
                                <span className="detail-plate-card__value">{plateValue}</span>

                                <span className="detail-plate-card__edit detail-plate-card__edit--done" aria-hidden="true">
                                    <FaCheck />
                                </span>
                            </div>
                        </div>

                        <div className="detail-section-title">{t("sectionTitle")}</div>

                        {loading ? <div className="detail-error">{t("loading")}</div> : null}

                        {error ? <div className="detail-error">{error}</div> : null}

                        {!error && noPaymentRequired ? <div className="detail-error detail-error--success">{t("noPaymentRequired")}</div> : null}

                        <div className="detail-info-grid">
                            <div className="detail-info-card">
                                <span className="detail-info-card__label">{t("dateLabel")}</span>
                                <strong>{currentData?.date || "-"}</strong>
                            </div>

                            <div className="detail-info-card">
                                <span className="detail-info-card__label">{t("entryTimeLabel")}</span>
                                <strong>{currentData?.entryTime || "-"}</strong>
                            </div>

                            <div className="detail-info-card">
                                <span className="detail-info-card__label">{t("durationLabel")}</span>
                                <strong>{currentData?.duration || "-"}</strong>
                            </div>

                            <div className="detail-info-card detail-info-card--fee">
                                <div className="detail-info-card__fee-left">
                                    <span className="detail-info-card__label">{t("paymentStatusLabel")}</span>
                                    <strong className="detail-info-card__danger">{currentData?.paymentStatus || "-"}</strong>
                                </div>

                                <div className="detail-fee-box">
                                    <span>{t("serviceFee")}</span>
                                    <strong>{currentData?.amount != null ? `${currentData.amount} ${common("baht")}` : "-"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="payment-panel">
                        <div className="payment-panel__content">
                            <h2>{t("paymentChannels")}</h2>

                            <p className="payment-panel__note">{t("paymentNote")}</p>

                            <PaymentOptions
                                variant="card"
                                transaction={currentData?.raw ?? null}
                                disabled={!currentData || noPaymentRequired}
                                onSuccess={handlePaymentSuccess}
                            />

                            <div className="payment-panel__help">
                                <span>{t("paymentProblem")}</span>

                                <Link className="contact_staff" href="tel:+66123123456">
                                    <MdSupportAgent />
                                    <span>{common("contactStaff")}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ReceiptSuccessPopup open={isReceiptPopupOpen} exitTimeLimit={paymentExitTimeLimit} onClose={handleReceiptClose} />

            <PlateCandidatePopup
                open={candidates.length > 0}
                candidates={candidates}
                onClose={() => setCandidates([])}
                onSelect={(plateNo) => {
                    setCandidates([]);
                    router.replace(`/landing/detail?plateNo=${encodeURIComponent(plateNo)}`);
                }}
            />

            <PlateNotFoundPopup open={showNotFoundPopup} onClose={() => setShowNotFoundPopup(false)} onRetry={() => setShowNotFoundPopup(false)} />
        </>
    );
}

export default DetailPage;
