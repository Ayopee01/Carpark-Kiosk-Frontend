"use client";

// Import Library
import { createContext, useContext, useEffect, useMemo, type ReactElement } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { useLocalStorage } from "usehooks-ts";
// Import Lib
import { INTL_FORMATS } from "@/src/app/lib/intl-formats";
import { LOCALE_STORAGE_KEY } from "@/src/app/lib/storage-keys";
// Import Types
import type { ChildrenProps, LocaleContextValue, SupportedLocale } from "@/src/app/type/ui.type";
// Import Messages
import enMessages from "@/messages/en.json";
import thMessages from "@/messages/th.json";
import zhMessages from "@/messages/zh.json";

/* -------------------------------------- Config -------------------------------------- */

// Config ภาษาเริ่มต้นเมื่อยังไม่เคยเลือกหรือค่าที่เก็บไว้ไม่ถูกต้อง (ใช้ตอน build static ด้วย)
const DEFAULT_LOCALE: SupportedLocale = "th";
// Config timezone ของ next-intl (ตรงกับที่แอปใช้แสดงวันเวลา)
const TIME_ZONE = "Asia/Bangkok";
// Config ข้อความแปลภาษาของแต่ละภาษา
const MESSAGES: Record<SupportedLocale, AbstractIntlMessages> = { th: thMessages, en: enMessages, zh: zhMessages };
// Config Context ของภาษา
const LocaleContext = createContext<LocaleContextValue>({
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
});

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าค่าเป็นภาษาที่รองรับ
function isSupportedLocale(value: unknown): value is SupportedLocale {
    return typeof value === "string" && value in MESSAGES;
}

// Function แปลงค่าใน localStorage เป็นภาษา (เก็บเป็นข้อความตรง ๆ ไม่ใช่ JSON, ไม่รู้จักคืนภาษาเริ่มต้น)
function deserializeLocale(value: string): SupportedLocale {
    return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

// Function แปลงภาษาเป็นค่าที่เก็บใน localStorage
function serializeLocale(locale: SupportedLocale): string {
    return locale;
}

/* -------------------------------------- Functions -------------------------------------- */

// Function hook อ่านภาษาปัจจุบันและเปลี่ยนภาษา
function useLocaleSetting(): LocaleContextValue {
    return useContext(LocaleContext);
}

// Function เลือกภาษาฝั่ง client จากค่าที่เลือกล่าสุด (จำไว้ใน localStorage ไม่ reset, ซิงก์ข้ามแท็บ) แล้วส่ง messages ให้ next-intl
// initializeWithValue: false ให้ render แรกตรงกับหน้า static ที่ build ด้วยภาษาเริ่มต้น แล้วค่อยอ่าน localStorage หลัง hydrate
function LocaleProvider({ children }: ChildrenProps): ReactElement {
    const [locale, setLocale] = useLocalStorage<SupportedLocale>(LOCALE_STORAGE_KEY, DEFAULT_LOCALE, {
        initializeWithValue: false,
        serializer: serializeLocale,
        deserializer: deserializeLocale,
    });

    // ตั้ง lang ของ <html> ให้ตรงกับภาษาที่แสดง
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);

    return (
        <LocaleContext.Provider value={value}>
            <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={TIME_ZONE} formats={INTL_FORMATS}>
                {children}
            </NextIntlClientProvider>
        </LocaleContext.Provider>
    );
}

export { LocaleProvider, useLocaleSetting };
