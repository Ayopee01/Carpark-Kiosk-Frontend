// Import Types
import type { KioskThemeConfig } from "@/src/app/type/theme.type";

/* -------------------------------------- Config -------------------------------------- */

// Config key ที่เก็บ theme ของ Kiosk ใน localStorage
const KIOSK_THEME_STORAGE_KEY = "kioskThemeConfig";
// Config สีหลักเมื่อสีจาก Backend ว่างหรือไม่ใช่ HEX
const DEFAULT_THEME_COLOR = "#FFD54F";

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงค่าเป็น string หรือ null
function toNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function เลือกสีหลักตาม themeMode (custom ใช้ customThemeColor) และ fallback เป็น DEFAULT_THEME_COLOR
function resolveThemeColor(theme: KioskThemeConfig): string {
    const sourceColor = theme.themeMode === "custom" ? theme.customThemeColor : theme.themeColor;
    const color = sourceColor?.trim();

    return color && /^#[0-9A-F]{6}$/i.test(color) ? color : DEFAULT_THEME_COLOR;
}

// Function แปลงข้อมูล theme ที่ไม่รู้ shape ให้เป็น KioskThemeConfig (ไม่ใช่ object คืน null)
function normalizeKioskTheme(value: unknown): KioskThemeConfig | null {
    if (!value || typeof value !== "object") return null;
    const data = value as Partial<KioskThemeConfig>;

    return {
        systemName: toNullableString(data.systemName),
        themeColor: toNullableString(data.themeColor),
        customThemeColor: toNullableString(data.customThemeColor),
        logoUrl: toNullableString(data.logoUrl),
        themeMode: typeof data.themeMode === "string" ? data.themeMode : "",
        updatedAt: toNullableString(data.updatedAt),
    };
}

// Function ตั้งสีหลักของ theme เป็น CSS variable ของ root element
function applyKioskThemeToRoot(theme: KioskThemeConfig): void {
    if (typeof document === "undefined") return;
    const color = resolveThemeColor(theme);

    document.documentElement.style.setProperty("--theme", color);
    document.documentElement.style.setProperty("--keyboard-confirm", color);
}

// Function บันทึก theme ลง localStorage
function saveKioskThemeToStorage(theme: KioskThemeConfig): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(KIOSK_THEME_STORAGE_KEY, JSON.stringify(theme));
}

// Function ดึง theme จาก localStorage (ไม่มีหรืออ่านไม่ได้คืน null)
function getKioskThemeFromStorage(): KioskThemeConfig | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(KIOSK_THEME_STORAGE_KEY);
        return raw ? normalizeKioskTheme(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

export { KIOSK_THEME_STORAGE_KEY, applyKioskThemeToRoot, getKioskThemeFromStorage, normalizeKioskTheme, resolveThemeColor, saveKioskThemeToStorage };
