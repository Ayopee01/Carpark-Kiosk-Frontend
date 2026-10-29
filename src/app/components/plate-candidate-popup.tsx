"use client";

// Import Library
import type { ReactElement } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
// Import Lib
import { toValidDate } from "@/src/app/lib/date";
// Import Types
import type { PlateCandidatePopupProps } from "@/src/app/type/search.type";
// Import CSS
import "@/src/app/css/plate-candidate-popup.css";

// Function แสดง Popup ให้เลือกทะเบียนเต็มเมื่อค้นหาแล้วพบหลายคัน
function PlateCandidatePopup({ open, candidates, onClose, onSelect }: PlateCandidatePopupProps): ReactElement {
    const t = useTranslations("PlateCandidatePopup");
    const format = useFormatter();

    // Function แปลงเวลาเข้าเป็นข้อความตามภาษาที่เลือก (ค่าว่างหรือผิดรูปแบบคืน "-")
    const formatEntryAt = (value: string | null): string => {
        const date = toValidDate(value);
        return date ? format.dateTime(date, "dateTimeNumeric") : "-";
    };

    return (
        <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="plate-candidate-popup__overlay">
                    <Dialog.Content className="plate-candidate-popup" aria-describedby={undefined}>
                        <div className="plate-candidate-popup__top">
                            <span className="plate-candidate-popup__dot" />
                            <span>{t("topText")}</span>
                        </div>

                        <div className="plate-candidate-popup__card">
                            <Dialog.Title>{t("title")}</Dialog.Title>
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
                    </Dialog.Content>
                </Dialog.Overlay>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default PlateCandidatePopup;
