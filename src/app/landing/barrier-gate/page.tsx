"use client";

// Import Library
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
// Import Lib
import { resetDeviceToActivation } from "@/src/app/lib/api/client-api";
import { openClientEventStream } from "@/src/app/lib/api/client-events";
import { getStoredDeviceCredential, normalizeBarrierDirection } from "@/src/app/lib/device";
import { barrierHardwareAdapter } from "@/src/app/lib/hardware-adapter";
import { normalizePlateNo } from "@/src/app/lib/plate";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storage-keys";
// Import Types
import type { LprDetectedEvent } from "@/src/app/type/api.type";
import type { BarrierSubscription, GateState } from "@/src/app/type/barrier.type";
import type { ClientStreamState } from "@/src/app/type/realtime.type";
// Import CSS
import "@/src/app/css/barrier-gate.css";
// Import Icons
import { LuCamera, LuCheck, LuLoader, LuRefreshCw, LuX } from "react-icons/lu";

/* -------------------------------------- Config -------------------------------------- */

// Config จำนวน event ล่าสุดที่จำไว้กันประมวลผลซ้ำ
const MAX_PROCESSED_EVENTS = 200;
// Config เวลาที่แสดงผลก่อนรีเซ็ตกลับไปรอรถคันถัดไป
const AUTO_RESET_MS = 10000;
// Config เวลาที่แสดงยอดค้างก่อนพาไปหน้าชำระเงิน
const PAYMENT_NAVIGATION_DELAY_MS = 1500;

/* -------------------------------------- Helpers -------------------------------------- */

// Function เลือก key ข้อความแปลภาษาของสถานะการเชื่อมต่อ
function getConnectionTranslationKey(state: ClientStreamState): "connectionConnected" | "connectionDisconnected" | "connectionConnecting" {
    switch (state) {
        case "connected":
            return "connectionConnected";
        case "disconnected":
            return "connectionDisconnected";
        default:
            return "connectionConnecting";
    }
}

// Function ตรวจว่า event ต้องชำระเงินก่อนออก
function hasPaymentRequired(event: LprDetectedEvent): boolean {
    return event.action === "PAYMENT_REQUIRED" || event.paymentRequired;
}

// Function แปลงยอดเงินเป็นข้อความ (ไม่ใช่ตัวเลขคืน "-")
function formatAmount(value?: number | null): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return value.toLocaleString("th-TH");
}

// Function แสดง log ของหน้าไม้กั้นเฉพาะตอนไม่ใช่ production
function logBarrierDebug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === "production") return;
    console.info(`[BarrierGate] ${message}`, data ?? "");
}

// Function เลือกตัวกรองจาก query ของหน้า หรือค่าที่ได้ตอน Activate / Heartbeat (กรองกล้องเมื่อระบุใน query หรือผูกกล้องตัวเดียว)
function resolveBarrierSubscription(requestedDirection: string | undefined, requestedGateId: string, requestedCameraId: string): BarrierSubscription {
    const credential = getStoredDeviceCredential();
    const cameraIds = credential?.cameraIds ?? [];

    return {
        gateId: requestedGateId || credential?.gateId || null,
        direction: normalizeBarrierDirection(requestedDirection) ?? credential?.direction ?? null,
        cameraId: requestedCameraId || (cameraIds.length === 1 ? cameraIds[0] : null),
    };
}

// Function ตรวจว่า event ตรงกับตัวกรองของหน้านี้ (Backend กรองให้แล้ว ตรวจซ้ำกรณี query ไม่ครบ)
function matchesSubscription(event: LprDetectedEvent, subscription: BarrierSubscription): boolean {
    if (subscription.gateId && event.gateId && event.gateId !== subscription.gateId) return false;
    if (subscription.direction && event.direction !== subscription.direction) return false;
    if (subscription.cameraId && event.cameraId && event.cameraId !== subscription.cameraId) return false;
    return true;
}

// Function แปลงเวลาที่กล้องจับภาพเป็นข้อความตามเวลาไทย
function formatCapturedAt(value: string, locale: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "Asia/Bangkok",
    }).format(date);
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงหน้าไม้กั้นที่รอ lpr_detected จาก SSE และเปิดไม้กั้นเมื่อ openGate === true เท่านั้น
function BarrierGatePage(): ReactElement {
    const t = useTranslations("BarrierGate");
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedDirection = searchParams.get("direction")?.toUpperCase();
    const requestedGateId = searchParams.get("gateId")?.trim() ?? "";
    const requestedCameraId = searchParams.get("cameraId")?.trim() ?? "";

    const subscription = useMemo(() => {
        const nextSubscription = resolveBarrierSubscription(requestedDirection, requestedGateId, requestedCameraId);
        logBarrierDebug("Barrier mapping resolved", nextSubscription);
        return nextSubscription;
    }, [requestedCameraId, requestedDirection, requestedGateId]);

    const [inputValue, setInputValue] = useState("");
    const [lastDetectedValue, setLastDetectedValue] = useState("");
    const [gateState, setGateState] = useState<GateState>("waiting");
    const [message, setMessage] = useState("");
    const [connectionState, setConnectionState] = useState<ClientStreamState>("connecting");
    const [lprEvent, setLprEvent] = useState<LprDetectedEvent | null>(null);
    const processedEventsRef = useRef(new Set<string>());
    const navigationTimerRef = useRef<number | null>(null);

    const resetCapture = useCallback((): void => {
        if (navigationTimerRef.current !== null) {
            window.clearTimeout(navigationTimerRef.current);
            navigationTimerRef.current = null;
        }
        setInputValue("");
        setMessage("");
        setLprEvent(null);
        setGateState("waiting");
    }, []);

    const deny = useCallback((reason: string): void => {
        setGateState("denied");
        setMessage(reason);
    }, []);

    const handleLprEvent = useCallback(
        async (event: LprDetectedEvent): Promise<void> => {
            if (!matchesSubscription(event, subscription)) {
                logBarrierDebug("LPR event ignored: mapping mismatch", { event, subscription });
                return;
            }

            if (event.action === "IGNORE_DUPLICATE") return;

            // กัน event ซ้ำด้วย transactionId + action + capturedAt
            const eventKey = `${event.transactionId ?? event.plateNo}:${event.action}:${event.capturedAt}`;
            if (processedEventsRef.current.has(eventKey)) return;

            processedEventsRef.current.add(eventKey);
            if (processedEventsRef.current.size > MAX_PROCESSED_EVENTS) {
                const oldestKey = processedEventsRef.current.values().next().value;
                if (oldestKey) processedEventsRef.current.delete(oldestKey);
            }

            setInputValue(normalizePlateNo(event.plateNo));
            setLastDetectedValue(normalizePlateNo(event.plateNo));
            setLprEvent(event);

            // success แปลว่าแค่ Backend ประมวลผลสำเร็จ จึงตัดสินเปิดไม้กั้นจาก openGate อย่างเดียว
            if (event.openGate) {
                try {
                    await barrierHardwareAdapter.openGate();
                    setGateState("open");
                    setMessage(event.direction === "OUT" ? t("actionExitOpenGate") : t("actionOpenGate"));
                } catch (error) {
                    console.error("Barrier hardware open failed:", error);
                    setGateState("error");
                    setMessage(t("offline"));
                }
                return;
            }

            if (hasPaymentRequired(event)) {
                deny(event.message || t("actionPaymentRequired"));
                sessionStorage.setItem(BARRIER_RETURN_STORAGE_KEY, `/landing/barrier-gate?${searchParams.toString()}`);

                const paymentParams = new URLSearchParams({ plateNo: event.plateNo });
                if (event.transactionId) paymentParams.set("transactionId", event.transactionId);

                if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
                navigationTimerRef.current = window.setTimeout(() => {
                    navigationTimerRef.current = null;
                    router.push(`/landing/check-payment?${paymentParams.toString()}`);
                }, PAYMENT_NAVIGATION_DELAY_MS);
                return;
            }

            switch (event.action) {
                case "IGNORE_ACTIVE_TRANSACTION":
                    deny(t("actionActiveTransaction"));
                    break;
                case "TRANSACTION_NOT_FOUND":
                    deny(t("actionTransactionNotFound"));
                    break;
                default:
                    deny(event.message || t("actionUnknown"));
                    break;
            }
        },
        [deny, router, searchParams, subscription, t]
    );

    // เก็บ handler ล่าสุดใน ref เพื่อไม่ต้องเปิด stream ใหม่เมื่อ handler เปลี่ยน (เช่น เปลี่ยนภาษา)
    const handleLprEventRef = useRef(handleLprEvent);
    useEffect(() => {
        handleLprEventRef.current = handleLprEvent;
    }, [handleLprEvent]);

    useEffect(() => {
        if (gateState !== "open" && gateState !== "denied" && gateState !== "error") return;

        const timer = window.setTimeout(resetCapture, AUTO_RESET_MS);
        return () => window.clearTimeout(timer);
    }, [gateState, resetCapture]);

    useEffect(() => {
        const credential = getStoredDeviceCredential();
        const query = {
            deviceId: credential?.deviceId,
            gateId: subscription.gateId ?? undefined,
            direction: subscription.direction ?? undefined,
            cameraId: subscription.cameraId ?? undefined,
        };

        logBarrierDebug("SSE subscribe", query);

        const closeStream = openClientEventStream({
            query,
            onStateChange: setConnectionState,
            onEvent: (event) => {
                if (event.type === "lpr_detected") {
                    logBarrierDebug("SSE lpr_detected received", event);
                    void handleLprEventRef.current(event);
                    return;
                }

                if (event.type === "device_revoked") {
                    closeStream();
                    resetDeviceToActivation();
                }
            },
        });

        return () => {
            closeStream();
            if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
        };
    }, [subscription]);

    return (
        <main className="barrier-gate-page">
            <section className="barrier-gate-page__content">
                <header className="barrier-gate-header">
                    <div className="barrier-gate-header__icon">
                        {gateState === "checking" ? (
                            <LuLoader className="barrier-gate-spin" />
                        ) : gateState === "open" ? (
                            <LuCheck />
                        ) : gateState === "denied" || gateState === "error" ? (
                            <LuX />
                        ) : (
                            <LuCamera />
                        )}
                    </div>
                    <h1>{t("title")}</h1>
                    <p>{t("subtitle")}</p>
                    <div className={`barrier-gate-connection barrier-gate-connection--${connectionState}`} aria-live="polite">
                        <span />
                        {t(getConnectionTranslationKey(connectionState))}
                    </div>
                    <p className="barrier-gate-header__gate">
                        {t("gateInfo", { gateId: subscription.gateId ?? "-", direction: subscription.direction ?? "-" })}
                    </p>
                </header>

                <section className="barrier-gate-capture" aria-live="polite">
                    <span className="barrier-gate-capture__label">{t("inputLabel")}</span>
                    <strong>{inputValue || t("waiting")}</strong>
                    <p>
                        {gateState === "checking"
                            ? t("checking")
                            : lprEvent
                                ? t("lprDetectedAt", { value: formatCapturedAt(lprEvent.capturedAt, locale) })
                                : lastDetectedValue
                                    ? t("lastDetected", { value: lastDetectedValue })
                                    : t("inputHint")}
                    </p>
                </section>

                {message ? <div className={`barrier-gate-alert barrier-gate-alert--${gateState}`}>{message}</div> : null}

                {lprEvent ? (
                    <section className="barrier-gate-event">
                        <div>
                            <span>{t("transactionId")}</span>
                            <strong>{lprEvent.transactionId ?? "-"}</strong>
                        </div>
                        <div>
                            <span>{t("eventStatus")}</span>
                            <strong>{lprEvent.status ?? "-"}</strong>
                        </div>
                        <div>
                            <span>{t("eventAction")}</span>
                            <strong>{lprEvent.action ?? "-"}</strong>
                        </div>
                        <div>
                            <span>Gate</span>
                            <strong>{lprEvent.gateId ?? "-"}</strong>
                        </div>
                        <div>
                            <span>Camera</span>
                            <strong>{lprEvent.cameraId || "-"}</strong>
                        </div>
                        <div>
                            <span>Direction</span>
                            <strong>{lprEvent.direction}</strong>
                        </div>
                        {hasPaymentRequired(lprEvent) ? (
                            <>
                                <div>
                                    <span>{t("remaining")}</span>
                                    <strong>{formatAmount(lprEvent.remainingAmount)}</strong>
                                </div>
                                <div>
                                    <span>{t("netAmount")}</span>
                                    <strong>{formatAmount(lprEvent.netAmount)}</strong>
                                </div>
                                <div>
                                    <span>{t("totalPaid")}</span>
                                    <strong>{formatAmount(lprEvent.totalPaid)}</strong>
                                </div>
                            </>
                        ) : null}
                        <p>{lprEvent.message}</p>
                    </section>
                ) : null}

                <button type="button" onClick={resetCapture} className="barrier-gate-reset" disabled={gateState === "checking"}>
                    <LuRefreshCw />
                    <span>{t("reset")}</span>
                </button>
            </section>
        </main>
    );
}

export default BarrierGatePage;
