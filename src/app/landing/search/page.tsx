"use client";

// Import Library
import { useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
// Import Components
import BackBtn from "@/src/app/components/back-btn";
import PlateCandidatePopup from "@/src/app/components/plate-candidate-popup";
import PlateKeyboard, { plateKeyboardRows } from "@/src/app/components/plate-keyboard";
import PlateNotFoundPopup from "@/src/app/components/plate-not-found-popup";
import PreloadPopup from "@/src/app/components/preload-popup";
// Import Lib
import { MIN_PLATE_NO_LENGTH, isValidPlateNo, normalizePlateNo } from "@/src/app/lib/plate";
import { lookupPlate } from "@/src/app/lib/transaction-lookup";
// Import Types
import type { ClientTransaction, PlateCandidate } from "@/src/app/type/api.type";
// Import CSS
import "@/src/app/css/search.css";

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าไม่มียอดต้องจ่าย (ใช้ remainingAmount จาก Backend เสมอ)
function hasNoPaymentRequired(transaction: ClientTransaction): boolean {
    return transaction.amount.remainingAmount <= 0;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงหน้าค้นหาทะเบียน (พบหลายคันให้เลือก แล้วค้นใหม่ด้วยทะเบียนเต็ม)
function SearchPage(): ReactElement {
    const router = useRouter();
    const t = useTranslations("Search");

    const [progress, setProgress] = useState(0);
    const [plate, setPlate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isAlreadyProcessedError, setIsAlreadyProcessedError] = useState(false);
    const [isSuccessValidation, setIsSuccessValidation] = useState(false);
    const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);
    const [candidatePlates, setCandidatePlates] = useState<PlateCandidate[]>([]);
    const [showCandidatePopup, setShowCandidatePopup] = useState(false);

    const clearError = (): void => {
        setError("");
        setIsAlreadyProcessedError(false);
        setIsSuccessValidation(false);
    };

    const resetSearchState = (): void => {
        clearError();
        setShowNotFoundPopup(false);
        setShowCandidatePopup(false);
        setCandidatePlates([]);
        setProgress(0);
    };

    const updatePlate = (value: string | ((prev: string) => string)): void => {
        if (loading) return;

        setPlate((prev) => (typeof value === "function" ? value(prev) : value));
        clearError();
    };

    const searchPlate = async (plateValue: string): Promise<void> => {
        const trimmedPlate = normalizePlateNo(plateValue);

        if (!trimmedPlate) {
            setError(t("errorRequired"));
            return;
        }

        if (!isValidPlateNo(trimmedPlate)) {
            setError(t("errorPlateTooShort", { min: MIN_PLATE_NO_LENGTH }));
            return;
        }

        setLoading(true);
        resetSearchState();
        setProgress(35);

        try {
            const outcome = await lookupPlate(trimmedPlate);
            setProgress(100);

            switch (outcome.kind) {
                case "redirected":
                    return;
                case "not_found":
                    setShowNotFoundPopup(true);
                    return;
                case "invalid_plate":
                    setError(t("errorPlateTooShort", { min: MIN_PLATE_NO_LENGTH }));
                    return;
                case "already_processed":
                    setIsAlreadyProcessedError(true);
                    setError(t("errorAlreadyProcessed"));
                    return;
                case "error":
                    console.error("Plate search failed:", outcome.error);
                    setError(t("errorSearchFailed"));
                    return;
                case "multiple":
                    if (outcome.candidates.length === 1) {
                        setPlate(outcome.candidates[0].plateNo);
                        await searchPlate(outcome.candidates[0].plateNo);
                        return;
                    }

                    setCandidatePlates(outcome.candidates);
                    setShowCandidatePopup(true);
                    return;
                case "found":
                    if (hasNoPaymentRequired(outcome.transaction)) {
                        setIsSuccessValidation(true);
                        setError(t("noPaymentRequired"));
                        return;
                    }

                    router.push(`/landing/detail?plateNo=${encodeURIComponent(outcome.transaction.plateNo)}`);
                    return;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (): Promise<void> => {
        await searchPlate(plate);
    };

    const handleMobileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
        updatePlate(event.target.value);
    };

    const handleMobileInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
        if (event.key === "Enter") {
            event.preventDefault();
            void handleConfirm();
        }
    };

    const handleSelectCandidate = (plateNo: string): void => {
        setPlate(plateNo);
        setShowCandidatePopup(false);
        setCandidatePlates([]);
        void searchPlate(plateNo);
    };

    const confirmText = loading ? t("loadingButton") : t("confirm");

    return (
        <>
            <section className="search-page">
                <div className="search-page__content">
                    <div>
                        <BackBtn />
                    </div>

                    <div className="search-page__header">
                        <h1>Smart Carpark</h1>
                        <p>{t("subtitle")}</p>
                    </div>

                    <div className="search-page__hint">
                        <div className="plate-card">
                            <span className="plate-card__label">{t("plateLabel")}</span>

                            <input
                                type="text"
                                className={`plate-card__input plate-card__input--mobile ${plate ? "is-filled" : ""}`}
                                value={plate}
                                onChange={handleMobileInputChange}
                                onKeyDown={handleMobileInputKeyDown}
                                placeholder={t("platePlaceholder")}
                                aria-label={t("plateLabel")}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                inputMode="text"
                                enterKeyHint="search"
                                disabled={loading}
                            />

                            <input
                                type="text"
                                className={`plate-card__input plate-card__input--desktop ${plate ? "is-filled" : ""} is-readonly`}
                                value={plate}
                                placeholder={t("platePlaceholder")}
                                aria-label={t("plateLabel")}
                                readOnly
                            />
                        </div>

                        <p
                            className={
                                error
                                    ? `search-page__error ${isAlreadyProcessedError || isSuccessValidation ? "search-page__error--processed" : ""}`
                                    : "search-page__subtitle"
                            }
                        >
                            {error || t("subtitle")}
                        </p>
                    </div>

                    <PlateKeyboard
                        rows={plateKeyboardRows}
                        loading={loading}
                        confirmText={confirmText}
                        onKeyClick={(key) => updatePlate((prev) => `${prev}${key}`)}
                        onDelete={() => updatePlate((prev) => prev.slice(0, -1))}
                        onConfirm={handleConfirm}
                    />
                </div>
            </section>

            {loading ? <PreloadPopup statusText={t("processing")} title={t("loadingData")} progress={progress} /> : null}

            <PlateNotFoundPopup open={showNotFoundPopup} onClose={() => setShowNotFoundPopup(false)} onRetry={() => setShowNotFoundPopup(false)} />

            <PlateCandidatePopup
                open={showCandidatePopup}
                candidates={candidatePlates}
                onClose={() => setShowCandidatePopup(false)}
                onSelect={handleSelectCandidate}
            />
        </>
    );
}

export default SearchPage;
