// Import Types
import type { PlateCandidate } from "./api.type";

/* -------------------------------------- Plate Keyboard Types -------------------------------------- */

// Type ปุ่มหนึ่งปุ่มของคีย์บอร์ดทะเบียน
export type KeyboardItem =
    | { type: "key"; value: string }
    | { type: "delete" }
    | { type: "confirm" };

// Type props ของคีย์บอร์ดทะเบียน
export type PlateKeyboardProps = {
    rows: KeyboardItem[][];
    loading: boolean;
    confirmText: string;
    onKeyClick: (key: string) => void;
    onDelete: () => void;
    onConfirm: () => void;
};

/* -------------------------------------- Search Popup Types -------------------------------------- */

// Type props ของ Popup เลือกทะเบียนเมื่อพบหลายคัน
export type PlateCandidatePopupProps = {
    open: boolean;
    candidates: PlateCandidate[];
    onClose: () => void;
    onSelect: (plateNo: string) => void;
};

// Type props ของ Popup ไม่พบทะเบียน
export type PlateNotFoundPopupProps = {
    open: boolean;
    onClose: () => void;
    onRetry: () => void;
};

// Type props ของ Popup ระหว่างค้นหา (progress 0-100)
export type PreloadPopupProps = {
    statusText?: string;
    title?: string;
    progress?: number;
};
