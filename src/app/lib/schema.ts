// Import Library
import { z } from "zod";

/* -------------------------------------- Schemas -------------------------------------- */

// Schema string ที่ไม่ใช่ string ให้เป็น null
const nullableStringSchema = z.string().nullable().catch(null);

// Schema ตัวเลขที่ไม่ใช่ตัวเลขให้เป็น 0
const numberOrZeroSchema = z.number().catch(0);

// Schema array ของ string ที่ไม่ว่าง (ตัดค่าที่ไม่ใช่ string หรือว่างทิ้ง, ไม่ใช่ array ได้ array ว่าง)
const nonEmptyStringArraySchema = z
    .array(z.unknown())
    .catch([])
    .transform((items) => items.filter((item): item is string => typeof item === "string" && item.trim() !== ""));

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงข้อความ JSON (อ่านไม่ได้คืน null แล้วให้ schema ตัดสินต่อ)
function parseJsonText(raw: string): unknown {
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return null;
    }
}

export { nonEmptyStringArraySchema, nullableStringSchema, numberOrZeroSchema, parseJsonText };
