// Import Library
import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

/* -------------------------------------- Config -------------------------------------- */

// Config ภาษาที่รองรับ
const SUPPORTED_LOCALES = ["th", "en", "zh"] as const;
// Config ภาษาเริ่มต้นเมื่อ cookie locale ไม่ถูกต้อง
const DEFAULT_LOCALE = "th";

/* -------------------------------------- Functions -------------------------------------- */

// Function เลือก locale จาก cookie แล้วโหลดไฟล์ข้อความแปลภาษาของ locale นั้น
const requestConfig = getRequestConfig(async () => {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("locale")?.value;
    const locale = hasLocale(SUPPORTED_LOCALES, cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});

export default requestConfig;
