"use client";

// Import Library
import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Dialog, Progress } from "radix-ui";
// Import Types
import type { PreloadPopupProps } from "@/src/app/type/search.type";
// Import Icons
import { FaCar } from "react-icons/fa6";
import { RiLoopRightFill } from "react-icons/ri";

// Function แสดง Popup ระหว่างค้นหาพร้อมแถบ progress (จำกัดค่า 0-100, ปิดเองไม่ได้จนกว่าจะค้นหาเสร็จ)
function PreloadPopup({ statusText, title, progress = 0 }: PreloadPopupProps): ReactElement {
    const t = useTranslations("PreloadPopup");
    const safeProgress = Math.max(0, Math.min(progress, 100));

    return (
        <Dialog.Root open>
            <Dialog.Portal>
                <Dialog.Overlay className="plate-popup-overlay">
                    <Dialog.Content
                        className="plate-popup"
                        aria-describedby={undefined}
                        onEscapeKeyDown={(event) => event.preventDefault()}
                        onInteractOutside={(event) => event.preventDefault()}
                    >
                        <div className="plate-popup__preload">
                            <div className="plate-popup__preload-status">
                                <span className="plate-popup__preload-status-dot" />
                                <span>{statusText ?? t("processing")}</span>
                            </div>

                            <div className="plate-popup__preload-body">
                                <div className="plate-popup__preload-card">
                                    <div className="plate-popup__preload-visual">
                                        <div className="plate-popup__preload-ring plate-popup__preload-ring--outer" />
                                        <div className="plate-popup__preload-ring plate-popup__preload-ring--inner" />
                                        <div className="plate-popup__preload-core-disc" />

                                        <div className="plate-popup__preload-orbit">
                                            <div className="plate-popup__preload-orbit-rotator">
                                                <div className="plate-popup__preload-car-badge">
                                                    <div className="plate-popup__preload-car-badge-inner">
                                                        <FaCar className="plate-popup__preload-car-icon" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="plate-popup__preload-center-core">
                                            <RiLoopRightFill className="plate-popup__preload-loop-icon" />
                                        </div>
                                    </div>

                                    <Dialog.Title className="plate-popup__preload-title">{title ?? t("loadingData")}</Dialog.Title>
                                    <p className="plate-popup__preload-subtext">{t("pleaseWait")}</p>
                                </div>

                                <Progress.Root className="plate-popup__preload-progress-track" value={safeProgress}>
                                    <Progress.Indicator className="plate-popup__preload-progress-fill" style={{ width: `${safeProgress}%` }} />
                                </Progress.Root>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Overlay>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default PreloadPopup;
