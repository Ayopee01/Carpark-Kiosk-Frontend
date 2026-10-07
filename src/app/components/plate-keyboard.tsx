"use client";

// Import Library
import type { ReactElement } from "react";
// Import Types
import type { KeyboardItem, PlateKeyboardProps } from "@/src/app/type/search.type";
// Import Icons
import { FiDelete } from "react-icons/fi";

/* -------------------------------------- Config -------------------------------------- */

// Config ปุ่มของคีย์บอร์ดทะเบียนแยกตามแถว (ตัวเลข, พยัญชนะไทย, ลบ, ยืนยัน)
const plateKeyboardRows: KeyboardItem[][] = [
    [
        { type: "key", value: "1" },
        { type: "key", value: "6" },
        { type: "key", value: "ก" },
        { type: "key", value: "ข" },
        { type: "key", value: "ค" },
        { type: "key", value: "ง" },
        { type: "key", value: "จ" },
        { type: "key", value: "ฉ" },
        { type: "key", value: "ช" },
        { type: "key", value: "ซ" },
        { type: "key", value: "ญ" },
    ],
    [
        { type: "key", value: "2" },
        { type: "key", value: "7" },
        { type: "key", value: "ฎ" },
        { type: "key", value: "ฏ" },
        { type: "key", value: "ฐ" },
        { type: "key", value: "ณ" },
        { type: "key", value: "ด" },
        { type: "key", value: "ต" },
        { type: "key", value: "ถ" },
        { type: "key", value: "ท" },
        { type: "key", value: "ธ" },
    ],
    [
        { type: "key", value: "3" },
        { type: "key", value: "8" },
        { type: "key", value: "น" },
        { type: "key", value: "บ" },
        { type: "key", value: "ป" },
        { type: "key", value: "ผ" },
        { type: "key", value: "ฝ" },
        { type: "key", value: "พ" },
        { type: "key", value: "ฟ" },
        { type: "key", value: "ภ" },
        { type: "key", value: "ม" },
    ],
    [
        { type: "key", value: "4" },
        { type: "key", value: "9" },
        { type: "key", value: "ย" },
        { type: "key", value: "ร" },
        { type: "key", value: "ล" },
        { type: "key", value: "ว" },
        { type: "key", value: "ศ" },
        { type: "key", value: "ษ" },
        { type: "key", value: "ส" },
        { type: "delete" },
    ],
    [
        { type: "key", value: "5" },
        { type: "key", value: "0" },
        { type: "key", value: "ห" },
        { type: "key", value: "อ" },
        { type: "key", value: "ฮ" },
        { type: "confirm" },
    ],
];

/* -------------------------------------- Functions -------------------------------------- */

// Function แสดงคีย์บอร์ดทะเบียนบนหน้าจอ
function PlateKeyboard({ rows, loading, confirmText, onKeyClick, onDelete, onConfirm }: PlateKeyboardProps): ReactElement {
    const renderButton = (item: KeyboardItem, key: string): ReactElement => {
        switch (item.type) {
            case "key":
                return (
                    <button key={key} type="button" className="plate-keyboard__key" onClick={() => onKeyClick(item.value)} disabled={loading}>
                        {item.value}
                    </button>
                );
            case "delete":
                return (
                    <button
                        key={key}
                        type="button"
                        className="plate-keyboard__action plate-keyboard__action--delete"
                        onClick={onDelete}
                        aria-label="delete"
                        disabled={loading}
                    >
                        <FiDelete />
                    </button>
                );
            case "confirm":
                return (
                    <button
                        key={key}
                        type="button"
                        className="plate-keyboard__action plate-keyboard__action--confirm"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {confirmText}
                    </button>
                );
        }
    };

    return (
        <div className="plate-keyboard-container">
            <div className="plate-keyboard">
                {rows.map((row, rowIndex) => row.map((item, itemIndex) => renderButton(item, `${rowIndex}-${itemIndex}`)))}
            </div>
        </div>
    );
}

export { plateKeyboardRows };
export default PlateKeyboard;
