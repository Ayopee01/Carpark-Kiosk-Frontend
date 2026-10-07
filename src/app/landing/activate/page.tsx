"use client";

// Import Library
import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
// Import Lib
import { activateDevice, getClientConfig, hasErrorCode } from "@/src/app/lib/api/client-api";
import { normalizeBarrierDirection, saveDeviceCredential } from "@/src/app/lib/device";
import { sendHeartbeat } from "@/src/app/lib/heartbeat";
import { applyKioskThemeToRoot, normalizeKioskTheme, saveKioskThemeToStorage } from "@/src/app/lib/kiosk-theme";
import { KIOSK_CONFIG_UPDATED_EVENT } from "@/src/app/lib/storage-keys";
// Import Types
import type { ActivateResponse } from "@/src/app/type/api.type";
import type { KioskConfigResponse } from "@/src/app/type/theme.type";
// Import CSS
import "@/src/app/css/kiosk-activate.css";
// Import Icons
import { LuCheck, LuDelete, LuLoader, LuMonitor, LuX } from "react-icons/lu";

/* -------------------------------------- Config -------------------------------------- */

// Config จำนวนหลักของ activation code
const MAX_CODE_LENGTH = 6;
// Config ปุ่มของคีย์บอร์ดตัวเลขบนหน้าจอ
const NUMERIC_KEYBOARD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "delete", "0", "enter"] as const;
// Config เวลาที่แสดงข้อความสำเร็จก่อนเข้าหน้าของอุปกรณ์
const REDIRECT_DELAY_MS = 800;

/* -------------------------------------- Helpers -------------------------------------- */

// Function บันทึก theme หลัง Activate แล้วแจ้ง Provider ให้ใช้ config นี้และเปิด SSE ใหม่
function saveKioskConfigToLocalStorage(config: KioskConfigResponse): void {
    const nextTheme = normalizeKioskTheme(config.theme);
    if (!nextTheme) throw new Error("invalid_theme");

    saveKioskThemeToStorage(nextTheme);
    applyKioskThemeToRoot(nextTheme);
    window.dispatchEvent(new CustomEvent<KioskConfigResponse>(KIOSK_CONFIG_UPDATED_EVENT, { detail: config }));
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงหน้ากรอก activation code แล้วบันทึก credential และพาไปหน้าตาม deviceType
function KioskActivatePage(): ReactElement {
    const router = useRouter();
    const t = useTranslations("Activate");
    const common = useTranslations("Common");

    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [successTarget, setSuccessTarget] = useState<"dashboard" | "barrier">("dashboard");

    const isLocked = submitting || Boolean(successMessage);
    const canSubmit = useMemo(() => code.trim().length === MAX_CODE_LENGTH && !isLocked, [code, isLocked]);

    const clearMessage = useCallback((): void => {
        setError("");
        setSuccessMessage("");
    }, []);

    const handleNumberClick = useCallback(
        (value: string): void => {
            if (isLocked) return;

            setCode((prev) => (prev.length >= MAX_CODE_LENGTH ? prev : `${prev}${value}`));
            clearMessage();
        },
        [clearMessage, isLocked]
    );

    const handleDelete = useCallback((): void => {
        if (isLocked) return;

        setCode((prev) => prev.slice(0, -1));
        clearMessage();
    }, [clearMessage, isLocked]);

    const handleConfirm = useCallback(async (): Promise<void> => {
        if (isLocked) return;

        const activationCode = code.trim();

        if (!activationCode) {
            setError(t("errorRequired"));
            return;
        }

        if (activationCode.length !== MAX_CODE_LENGTH) {
            setError(t("errorLength", { length: MAX_CODE_LENGTH }));
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccessMessage("");
            setSuccessTarget("dashboard");

            let result: ActivateResponse;

            try {
                result = await activateDevice({ code: activationCode });
            } catch (activateError) {
                throw new Error(
                    hasErrorCode(activateError, "INVALID_ACTIVATION_CODE", "ACTIVATION_CODE_REQUIRED")
                        ? t("errorInvalidCode")
                        : hasErrorCode(activateError, "TOO_MANY_REQUESTS")
                            ? t("errorTooManyRequests")
                            : t("errorActivateFailed")
                );
            }

            // deviceToken แสดงครั้งเดียว ต้องเก็บไว้ในเครื่องทันที
            saveDeviceCredential({
                deviceId: result.deviceId,
                deviceToken: result.deviceToken,
                deviceType: result.deviceType,
                deviceName: result.deviceName,
                location: result.location,
                status: result.status,
                activatedAt: new Date().toISOString(),
                gateId: result.gateId ?? null,
                direction: normalizeBarrierDirection(result.direction),
                cameraIds: result.cameraIds ?? [],
                printerIds: result.printerIds ?? [],
            });

            let kioskConfig: KioskConfigResponse;

            try {
                kioskConfig = await getClientConfig();
            } catch {
                throw new Error(t("errorConfigFailed"));
            }

            try {
                saveKioskConfigToLocalStorage(kioskConfig);
            } catch {
                throw new Error(t("errorThemeInvalid"));
            }

            await sendHeartbeat().catch((err) => {
                console.warn("Heartbeat after activation failed:", err);
            });

            const isBarrierGate = result.deviceType === "barrier_gate";

            setSuccessTarget(isBarrierGate ? "barrier" : "dashboard");
            setSuccessMessage(result.message || t("successFallback"));

            setTimeout(() => {
                router.replace(isBarrierGate ? "/landing/barrier-gate" : "/landing/dashboard");
            }, REDIRECT_DELAY_MS);
        } catch (err) {
            // แสดงเฉพาะข้อความที่แปลภาษาไว้ ข้อความอื่นใช้ข้อความกลาง
            const localizedErrors = new Set([
                t("errorActivateFailed"),
                t("errorInvalidCode"),
                t("errorTooManyRequests"),
                t("errorConfigFailed"),
                t("errorThemeInvalid"),
            ]);
            const message = err instanceof Error ? err.message : "";

            setError(localizedErrors.has(message) ? message : t("errorUnexpected"));
        } finally {
            setSubmitting(false);
        }
    }, [code, isLocked, router, t]);

    // รองรับการกรอกผ่าน physical keyboard นอกจากปุ่มบนหน้าจอ
    useEffect(() => {
        const handlePhysicalKeyboard = (event: KeyboardEvent): void => {
            if (isLocked) return;

            if (/^\d$/.test(event.key)) {
                event.preventDefault();
                handleNumberClick(event.key);
                return;
            }

            if (event.key === "Backspace") {
                event.preventDefault();
                handleDelete();
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                void handleConfirm();
            }
        };

        window.addEventListener("keydown", handlePhysicalKeyboard);
        return () => window.removeEventListener("keydown", handlePhysicalKeyboard);
    }, [handleNumberClick, handleDelete, handleConfirm, isLocked]);

    return (
        <main className="kiosk-activate-page">
            <div className="kiosk-activate-page__content">
                <section className="kiosk-activate">
                    <div className="kiosk-activate__icon">
                        <LuMonitor size={34} />
                    </div>

                    <div className="kiosk-activate__header">
                        <h1>{t("title")}</h1>
                        <p>{t("subtitle")}</p>
                    </div>

                    <div className="kiosk-activate__form-area">
                        <div className="kiosk-code-card">
                            <label className="kiosk-code-card__label">{t("codeLabel")}</label>

                            <div className="kiosk-code-card__input-box">
                                <input
                                    value={code}
                                    placeholder="000000"
                                    readOnly
                                    aria-label={t("codeLabel")}
                                    className={`kiosk-code-card__input ${code ? "is-filled" : ""}`}
                                />
                            </div>
                        </div>

                        <p className={error ? "kiosk-activate__message kiosk-activate__message--error" : "kiosk-activate__message"}>
                            {error || t("hint")}
                        </p>

                        {successMessage ? (
                            <div className="kiosk-alert kiosk-alert--success">
                                <LuCheck size={18} />
                                <span>
                                    {t(successTarget === "barrier" ? "redirectingBarrier" : "redirectingDashboard", { message: successMessage })}
                                </span>
                            </div>
                        ) : null}

                        {error ? (
                            <div className="kiosk-alert kiosk-alert--error">
                                <LuX size={18} />
                                <span>{error}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="kiosk-keyboard" aria-label="Numeric Keyboard">
                        {NUMERIC_KEYBOARD_KEYS.map((key) => {
                            if (key === "delete") {
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className="kiosk-keyboard__key kiosk-keyboard__key--delete"
                                        onClick={handleDelete}
                                        disabled={isLocked}
                                        aria-label={t("delete")}
                                    >
                                        <LuDelete size={24} />
                                    </button>
                                );
                            }

                            if (key === "enter") {
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className="kiosk-keyboard__key kiosk-keyboard__key--enter"
                                        onClick={() => void handleConfirm()}
                                        disabled={!canSubmit}
                                    >
                                        {submitting ? <LuLoader className="kiosk-keyboard__loader" size={22} /> : common("enter")}
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className="kiosk-keyboard__key"
                                    onClick={() => handleNumberClick(key)}
                                    disabled={isLocked || code.length >= MAX_CODE_LENGTH}
                                >
                                    {key}
                                </button>
                            );
                        })}
                    </div>

                    <p className="kiosk-activate__footer">{t("footer")}</p>
                </section>
            </div>
        </main>
    );
}

export default KioskActivatePage;
