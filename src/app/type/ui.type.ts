// Import Library
import type { ReactNode } from "react";

/* -------------------------------------- Layout Types -------------------------------------- */

// Type props ของ Provider และ Layout ที่ครอบ children
export type ChildrenProps = {
    children: ReactNode;
};

/* -------------------------------------- Navigation Types -------------------------------------- */

// Type ภาษาที่รองรับ
export type SupportedLocale = "th" | "en" | "zh";

// Type props ของปุ่มเลือกภาษา (nav = บน Navbar, side = ใน Side Menu)
export type LangButtonProps = {
    variant?: "nav" | "side";
};

// Type props ของ Side Menu
export type SideMenuProps = {
    open: boolean;
    onClose: () => void;
};

/* -------------------------------------- Receipt Types -------------------------------------- */

// Type props ของ Popup ชำระเงินสำเร็จ
export type ReceiptSuccessPopupProps = {
    open: boolean;
    onClose: () => void;
    exitTimeLimit?: string | null;
};

// Type props ของเนื้อหา Popup ชำระเงินสำเร็จ
export type ReceiptSuccessPopupContentProps = Omit<ReceiptSuccessPopupProps, "open">;
