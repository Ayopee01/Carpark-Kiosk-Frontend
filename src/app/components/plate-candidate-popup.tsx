"use client";

// Import Library
import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
// Import Types
import type { PlateCandidatePopupProps } from "@/src/app/type/search.type";
// Import CSS
import "@/src/app/css/plate-candidate-popup.css";

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงเวลาเข้าเป็นข้อความตามเวลาไทย (ค่าว่างหรือผิดรูปแบบคืน "-")
function formatEntryAt(value: string | null): string {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(date);
}

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดง Popup ให้เลือกทะเบียนเต็มเมื่อค้นหาแล้วพบหลายคัน
function PlateCandidatePopup({ open, candidates, onClose, onSelect }: PlateCandidatePopupProps): ReactElement | null {
    const t = useTranslations("PlateCandidatePopup");

    if (!open) return null;

    return (
        <div className="plate-candidate-popup__overlay" onClick={onClose}>
            <div
                className="plate-candidate-popup"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="plate-candidate-popup-title"
            >
                <div className="plate-candidate-popup__top">
                    <span className="plate-candidate-popup__dot" />
                    <span>{t("topText")}</span>
                </div>

                <div className="plate-candidate-popup__card">
                    <h2 id="plate-candidate-popup-title">{t("title")}</h2>
                    <p>{t("subtitle")}</p>

                    <div className="plate-candidate-popup__list">
                        {candidates.map((candidate) => (
                            <button
                                key={`${candidate.plateNo}-${candidate.billNo}`}
                                type="button"
                                className="plate-candidate-popup__item"
                                onClick={() => onSelect(candidate.plateNo)}
                            >
                                <span className="plate-candidate-popup__plate">{candidate.plateNo}</span>
                                <span className="plate-candidate-popup__meta">{t("entryAt", { value: formatEntryAt(candidate.entryAt) })}</span>
                            </button>
                        ))}
                    </div>

                    <button type="button" className="plate-candidate-popup__cancel" onClick={onClose}>
                        {t("cancel")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PlateCandidatePopup;
