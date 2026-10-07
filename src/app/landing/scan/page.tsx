"use client";

// Import Library
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
// Import Components
import BackBtn from "@/src/app/components/back-btn";
import PlateNotFoundPopup from "@/src/app/components/plate-not-found-popup";
// Import Lib
import { MIN_PLATE_NO_LENGTH, normalizePlateNo } from "@/src/app/lib/plate";
import { lookupPlate } from "@/src/app/lib/transaction-lookup";
// Import Types
import type { ClientTransaction } from "@/src/app/type/api.type";
// Import CSS
import "@/src/app/css/scan.css";

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าไม่มียอดต้องจ่าย (ใช้ remainingAmount จาก Backend เสมอ)
function hasNoPaymentRequired(transaction: ClientTransaction): boolean {
    return transaction.amount.remainingAmount <= 0;
}

// Function decode URI component (decode ไม่ได้คืนค่าเดิม)
function safeDecodeURIComponent(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

// Function ดึงทะเบียนจากค่าที่สแกนได้ (รองรับ URL ที่มี plate / plateNo / plate_no หรือทะเบียนตรง ๆ)
function extractPlateFromScanValue(value: string): string {
    const trimmedValue = value.trim();
    if (!trimmedValue) return "";

    const decodedValue = safeDecodeURIComponent(trimmedValue).trim();

    try {
        const url = new URL(decodedValue, window.location.origin);
        const plateFromUrl = url.searchParams.get("plate") || url.searchParams.get("plateNo") || url.searchParams.get("plate_no");

        if (plateFromUrl) return safeDecodeURIComponent(plateFromUrl).trim();
    } catch {
        // ไม่ใช่ URL ให้ลองหา query ด้วย regex ด้านล่าง
    }

    const plateMatch = decodedValue.match(/[?&](plate|plateNo|plate_no)=([^&]+)/);
    if (plateMatch?.[2]) return safeDecodeURIComponent(plateMatch[2]).trim();

    return decodedValue;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงหน้าสแกน รับค่าจากเครื่องสแกน (keyboard input / paste) แล้วค้นหาทะเบียน
function ScanPage(): ReactElement {
    const router = useRouter();
    const t = useTranslations("Scan");

    const [scannedPlate, setScannedPlate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isAlreadyProcessedError, setIsAlreadyProcessedError] = useState(false);
    const [isSuccessValidation, setIsSuccessValidation] = useState(false);
    const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);

    const bufferRef = useRef("");
    const loadingRef = useRef(false);

    const resetScanBuffer = useCallback((): void => {
        bufferRef.current = "";
        setScannedPlate("");
    }, []);

    const handleSearch = useCallback(
        async (scanValue: string): Promise<void> => {
            const trimmedPlate = normalizePlateNo(extractPlateFromScanValue(scanValue));

            if (!trimmedPlate || loadingRef.current) return;

            try {
                loadingRef.current = true;
                setLoading(true);
                setError("");
                setIsAlreadyProcessedError(false);
                setIsSuccessValidation(false);
                setScannedPlate(trimmedPlate);

                const outcome = await lookupPlate(trimmedPlate);

                switch (outcome.kind) {
                    case "redirected":
                        return;
                    case "not_found":
                        setShowNotFoundPopup(true);
                        resetScanBuffer();
                        return;
                    case "invalid_plate":
                        setError(t("errorPlateTooShort", { min: MIN_PLATE_NO_LENGTH }));
                        resetScanBuffer();
                        return;
                    case "already_processed":
                        setIsAlreadyProcessedError(true);
                        setError(t("errorAlreadyProcessed"));
                        resetScanBuffer();
                        return;
                    case "error":
                        console.error("Scan search failed:", outcome.error);
                        setError(t("errorSearchFailed"));
                        resetScanBuffer();
                        return;
                    case "multiple":
                        // ทะเบียนตรงหลายคัน: ให้เลือกที่หน้า Detail แล้วค้นใหม่ด้วยทะเบียนเต็ม
                        router.push(`/landing/detail?plateNo=${encodeURIComponent(trimmedPlate)}`);
                        return;
                    case "found":
                        if (hasNoPaymentRequired(outcome.transaction)) {
                            setIsSuccessValidation(true);
                            setError(t("noPaymentRequired"));
                            resetScanBuffer();
                            return;
                        }

                        router.push(`/landing/detail?plateNo=${encodeURIComponent(outcome.transaction.plateNo)}`);
                        return;
                }
            } catch (err) {
                console.error("Unexpected scan search error:", err);
                setError(t("errorUnexpected"));
                resetScanBuffer();
            } finally {
                loadingRef.current = false;
                setLoading(false);
            }
        },
        [resetScanBuffer, router, t]
    );

    // เครื่องสแกนส่งค่าเป็นการกดแป้นทีละตัวแล้วปิดด้วย Enter/Tab หรือ paste ทั้งก้อน
    useEffect(() => {
        const handleBarcodeInput = (event: KeyboardEvent): void => {
            if (loadingRef.current) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();

                const value = bufferRef.current.trim();
                if (!value) return;

                bufferRef.current = "";
                void handleSearch(value);
                return;
            }

            if (event.key === "Backspace") {
                event.preventDefault();
                bufferRef.current = bufferRef.current.slice(0, -1);
                setScannedPlate(bufferRef.current);
                return;
            }

            if (event.key.length === 1) {
                event.preventDefault();
                bufferRef.current += event.key;
                setScannedPlate(bufferRef.current);
                setError("");
                setIsAlreadyProcessedError(false);
                setIsSuccessValidation(false);
            }
        };

        const handlePaste = (event: ClipboardEvent): void => {
            if (loadingRef.current) return;

            const pastedValue = event.clipboardData?.getData("text") ?? "";
            if (!pastedValue.trim()) return;

            event.preventDefault();
            bufferRef.current = "";

            const plate = extractPlateFromScanValue(pastedValue);
            setScannedPlate(plate || pastedValue.trim());

            void handleSearch(pastedValue);
        };

        window.addEventListener("keydown", handleBarcodeInput);
        window.addEventListener("paste", handlePaste);

        return () => {
            window.removeEventListener("keydown", handleBarcodeInput);
            window.removeEventListener("paste", handlePaste);
        };
    }, [handleSearch]);

    return (
        <>
            <section className="scan-page">
                <div className="scan-page__content">
                    <div>
                        <BackBtn />
                    </div>

                    <div className="scan-page__header">
                        <h1>Smart Carpark</h1>
                        <p>{t("subtitle")}</p>
                    </div>

                    <div className="scan-page__icon">
                        <div className="scan-page__divider" />

                        <Image src="/icon/Scanner_Viewfinder.png" alt={t("viewfinderAlt")} className="scan-page__viewfinder" width={384} height={338} />
                    </div>

                    <div className="scan-page__hint">
                        <p>{t("hintLine1")}</p>
                        <p>{t("hintLine2")}</p>
                    </div>

                    <div className="scan-page__result">
                        <p className="scan-page__result-label">{t("resultLabel")}</p>

                        <strong className="scan-page__result-value">{scannedPlate || t("waitingInput")}</strong>

                        {loading ? <p className="scan-page__status">{t("searching")}</p> : null}

                        {error ? (
                            <p className={`scan-page__error ${isAlreadyProcessedError || isSuccessValidation ? "scan-page__error--processed" : ""}`}>
                                {error}
                            </p>
                        ) : null}
                    </div>
                </div>
            </section>

            <PlateNotFoundPopup open={showNotFoundPopup} onClose={() => setShowNotFoundPopup(false)} onRetry={() => setShowNotFoundPopup(false)} />
        </>
    );
}

export default ScanPage;
