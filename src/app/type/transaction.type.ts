// Import Library
import type { useTranslations } from "next-intl";
// Import Types
import type { ClientTransaction, PlateCandidate } from "./api.type";

/* -------------------------------------- Transaction Lookup Types -------------------------------------- */

// Type ผลการค้นหารายการจอดที่หน้าจอใช้แยกแสดง (แปลงจาก code ของ Backend)
export type TransactionLookupOutcome =
    | { kind: "found"; transaction: ClientTransaction }
    | { kind: "multiple"; candidates: PlateCandidate[] }
    | { kind: "not_found" }
    | { kind: "already_processed" }
    | { kind: "invalid_plate" }
    | { kind: "redirected" }
    | { kind: "error"; error: unknown };

/* -------------------------------------- Detail Page Types -------------------------------------- */

// Type ข้อมูลที่หน้า Detail แสดง
export type DetailData = {
    id: string;
    billNo: string;
    plate: string;
    province: string;
    date: string;
    entryTime: string;
    duration: string;
    paymentStatus: string;
    amount: number;
    raw: ClientTransaction;
};

// Type ระยะเวลาจอดแยกตามหน่วย
export type DurationParts = {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
};

// Type function แปลภาษาของ namespace Detail
export type DetailTranslator = ReturnType<typeof useTranslations<"Detail">>;

// Type key ข้อความแปลภาษาของหน่วยเวลา
export type DurationPartKey = "durationYear" | "durationMonth" | "durationDay" | "durationHour" | "durationMinute";
