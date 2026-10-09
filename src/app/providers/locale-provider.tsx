"use client";

// Import Library
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactElement } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
// Import Lib
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
// Config ชื่อ event ที่แจ้งว่าเปลี่ยนภาษาในแท็บเดียวกัน (event storage ยิงเฉพาะแท็บอื่น)
const LOCALE_CHANGED_EVENT = "locale-changed";
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

// Function อ่านภาษาที่เลือกล่าสุดจาก localStorage (อ่านไม่ได้คืนภาษาเริ่มต้น)
function getStoredLocale(): SupportedLocale {
    try {
        const value = localStorage.getItem(LOCALE_STORAGE_KEY);
        return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE;
    }
}

// Function ภาษาที่ใช้ตอน render ฝั่ง server / build
function getServerLocale(): SupportedLocale {
    return DEFAULT_LOCALE;
}

// Function ติดตามการเปลี่ยนภาษาทั้งในแท็บนี้และแท็บอื่น
function subscribeLocale(onChange: () => void): () => void {
    window.addEventListener(LOCALE_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);

    return () => {
        window.removeEventListener(LOCALE_CHANGED_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

/* -------------------------------------- Functions -------------------------------------- */

// Function hook อ่านภาษาปัจจุบันและเปลี่ยนภาษา
function useLocaleSetting(): LocaleContextValue {
    return useContext(LocaleContext);
}

// Function เลือกภาษาฝั่ง client จากค่าที่เลือกล่าสุด (จำไว้ใน localStorage ไม่ reset) แล้วส่ง messages ให้ next-intl
function LocaleProvider({ children }: ChildrenProps): ReactElement {
    const locale = useSyncExternalStore(subscribeLocale, getStoredLocale, getServerLocale);

    const setLocale = useCallback((nextLocale: SupportedLocale): void => {
        try {
            localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
        } catch {
            // ใช้ localStorage ไม่ได้: เปลี่ยนภาษาไม่ได้ ใช้ภาษาเดิมต่อ
        }
        window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
    }, []);

    // ตั้ง lang ของ <html> ให้ตรงกับภาษาที่แสดง
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);

    return (
        <LocaleContext.Provider value={value}>
            <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={TIME_ZONE}>
                {children}
            </NextIntlClientProvider>
        </LocaleContext.Provider>
    );
}

export { LocaleProvider, useLocaleSetting };
