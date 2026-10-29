// Import Library
import { z } from "zod";
// Import Lib
import { nullableStringSchema } from "@/src/app/lib/schema";
// Import Types
import type { KioskThemeConfig } from "@/src/app/type/theme.type";

/* -------------------------------------- Config -------------------------------------- */

// Config key ที่เก็บ theme ของ Kiosk ใน localStorage
const KIOSK_THEME_STORAGE_KEY = "kioskThemeConfig";
// Config สีหลักเมื่อสีจาก Backend ว่างหรือไม่ใช่ HEX
const DEFAULT_THEME_COLOR = "#FFD54F";

/* -------------------------------------- Schemas -------------------------------------- */

// Schema สีหลักแบบ HEX 6 หลัก (ว่างหรือผิดรูปแบบใช้ DEFAULT_THEME_COLOR)
const themeColorSchema = z
    .string()
    .trim()
    .regex(/^#[0-9A-F]{6}$/i)
    .catch(DEFAULT_THEME_COLOR);

// Schema theme ที่ไม่รู้ shape (field ที่ไม่ใช่ string เป็น null, ไม่ใช่ object ไม่ผ่าน)
const kioskThemeSchema = z.object({
    systemName: nullableStringSchema,
    themeColor: nullableStringSchema,
    customThemeColor: nullableStringSchema,
    logoUrl: nullableStringSchema,
    themeMode: z.string().catch(""),
    updatedAt: nullableStringSchema,
});

/* -------------------------------------- Functions -------------------------------------- */

// Function เลือกสีหลักตาม themeMode (custom ใช้ customThemeColor) และ fallback เป็น DEFAULT_THEME_COLOR
function resolveThemeColor(theme: KioskThemeConfig): string {
    return themeColorSchema.parse(theme.themeMode === "custom" ? theme.customThemeColor : theme.themeColor);
}

// Function แปลงข้อมูล theme ที่ไม่รู้ shape ให้เป็น KioskThemeConfig (ไม่ใช่ object คืน null)
function normalizeKioskTheme(value: unknown): KioskThemeConfig | null {
    return kioskThemeSchema.safeParse(value).data ?? null;
}

// Function ตั้งสีหลักของ theme เป็น CSS variable ของ root element
function applyKioskThemeToRoot(theme: KioskThemeConfig): void {
    if (typeof document === "undefined") return;
    const color = resolveThemeColor(theme);

    document.documentElement.style.setProperty("--theme", color);
    document.documentElement.style.setProperty("--keyboard-confirm", color);
}

export { KIOSK_THEME_STORAGE_KEY, applyKioskThemeToRoot, normalizeKioskTheme, resolveThemeColor };
