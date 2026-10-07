"use client";

// Import Library
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactElement } from "react";
// Import Lib
import { getClientConfig, resetDeviceToActivation } from "@/src/app/lib/api/client-api";
import { openClientEventStream } from "@/src/app/lib/api/client-events";
import { getStoredDeviceCredential } from "@/src/app/lib/device";
import { KIOSK_THEME_STORAGE_KEY, applyKioskThemeToRoot, getKioskThemeFromStorage, normalizeKioskTheme, saveKioskThemeToStorage } from "@/src/app/lib/kiosk-theme";
import { KIOSK_CONFIG_UPDATED_EVENT, PAYMENT_SETTINGS_UPDATED_EVENT } from "@/src/app/lib/storage-keys";
// Import Types
import type { ClientStreamState } from "@/src/app/type/realtime.type";
import type { KioskConfigMeta, KioskConfigResponse, KioskThemeConfig, KioskThemeContextValue } from "@/src/app/type/theme.type";
import type { ChildrenProps } from "@/src/app/type/ui.type";

/* -------------------------------------- Config -------------------------------------- */

// Config key ที่เก็บสถานะอุปกรณ์ใน localStorage
const KIOSK_META_STORAGE_KEY = "kioskConfigMeta";
// Config รอบโหลด config สำรองระหว่างที่ SSE หลุด
const CONFIG_POLLING_MS = 60000;
// Config Context ของ theme และสถานะอุปกรณ์ (ค่าเริ่มต้นก่อนโหลดจาก Storage หรือ API)
const KioskThemeContext = createContext<KioskThemeContextValue>({
    theme: null,
    systemName: null,
    status: null,
    loading: true,
    refreshTheme: async () => {},
});

/* -------------------------------------- Helpers -------------------------------------- */

// Function บันทึกสถานะอุปกรณ์ลง localStorage
function saveKioskMetaToStorage(data: KioskConfigMeta): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(KIOSK_META_STORAGE_KEY, JSON.stringify(data));
}

// Function อ่านสถานะอุปกรณ์จาก localStorage (ไม่มีหรืออ่านไม่ได้คืน status null)
function getKioskMetaFromStorage(): KioskConfigMeta {
    if (typeof window === "undefined") return { status: null };

    try {
        const raw = localStorage.getItem(KIOSK_META_STORAGE_KEY);
        if (!raw) return { status: null };

        const parsed = JSON.parse(raw) as { status?: unknown };
        return { status: typeof parsed.status === "string" ? parsed.status : null };
    } catch {
        return { status: null };
    }
}

/* -------------------------------------- Functions -------------------------------------- */

// Function hook อ่าน theme และสถานะอุปกรณ์จาก Context
function useKioskTheme(): KioskThemeContextValue {
    return useContext(KioskThemeContext);
}

// Function โหลด theme จาก Storage / API และเปิด SSE (GET /client/events) ค้างไว้ แล้วส่งต่อผ่าน Context
function KioskThemeRealtimeProvider({ children }: ChildrenProps): ReactElement {
    const [theme, setTheme] = useState<KioskThemeConfig | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sseVersion, setSseVersion] = useState(0);
    const [streamState, setStreamState] = useState<ClientStreamState>("connecting");

    const commitTheme = useCallback((nextTheme: KioskThemeConfig): void => {
        applyKioskThemeToRoot(nextTheme);
        saveKioskThemeToStorage(nextTheme);
        setTheme(nextTheme);
    }, []);

    const commitMeta = useCallback((data: { status?: unknown }): void => {
        const nextStatus = typeof data.status === "string" ? data.status : null;
        setStatus(nextStatus);
        saveKioskMetaToStorage({ status: nextStatus });
    }, []);

    const commitConfig = useCallback(
        (config: KioskConfigResponse): void => {
            const nextTheme = normalizeKioskTheme(config.theme);
            if (!nextTheme) throw new Error("ข้อมูล theme จาก API ไม่ถูกต้อง");

            commitTheme(nextTheme);
            commitMeta({ status: getStoredDeviceCredential()?.status });
        },
        [commitTheme, commitMeta]
    );

    const refreshTheme = useCallback(async (): Promise<void> => {
        try {
            commitConfig(await getClientConfig());
        } catch (err) {
            console.warn("โหลด theme ไม่สำเร็จ:", err);
        } finally {
            setLoading(false);
        }
    }, [commitConfig]);

    // แสดง theme ที่เก็บไว้ก่อน แล้วโหลด config ล่าสุดจาก API
    useEffect(() => {
        const cachedTheme = getKioskThemeFromStorage();
        const cachedMeta = getKioskMetaFromStorage();

        if (cachedTheme) {
            commitTheme(cachedTheme);
            setLoading(false);
        }

        if (cachedMeta.status) setStatus(cachedMeta.status);

        void refreshTheme();
    }, [commitTheme, refreshTheme]);

    // หน้า Activate ส่ง config มาหลังเปิดใช้งานสำเร็จ: ใช้ theme นั้นและเปิด SSE ใหม่ด้วย credential ที่ได้
    useEffect(() => {
        const handleKioskConfigUpdated = (event: Event): void => {
            const config = (event as CustomEvent<KioskConfigResponse>).detail;
            if (!config?.theme) return;

            try {
                commitConfig(config);
                setSseVersion((version) => version + 1);
                setLoading(false);
            } catch (err) {
                console.warn("อัปเดต theme จาก Activate ไม่สำเร็จ:", err);
            }
        };

        window.addEventListener(KIOSK_CONFIG_UPDATED_EVENT, handleKioskConfigUpdated);
        return () => window.removeEventListener(KIOSK_CONFIG_UPDATED_EVENT, handleKioskConfigUpdated);
    }, [commitConfig]);

    // ซิงก์ theme เมื่อ localStorage ถูกเปลี่ยนจาก tab อื่น
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent): void => {
            if (event.key !== KIOSK_THEME_STORAGE_KEY && event.key !== KIOSK_META_STORAGE_KEY) return;

            const cachedTheme = getKioskThemeFromStorage();
            if (cachedTheme) commitTheme(cachedTheme);

            setStatus(getKioskMetaFromStorage().status);
            setLoading(false);
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [commitTheme]);

    // ping ของ SSE ทำให้อุปกรณ์ online เอง
    useEffect(() => {
        const closeStream = openClientEventStream({
            onStateChange: setStreamState,
            onEvent: (event) => {
                switch (event.type) {
                    // โหลด config ใหม่เพื่อรับ logoUrl และ updatedAt หลัง Backend บันทึกไฟล์สำเร็จ
                    case "theme_updated":
                        void refreshTheme();
                        break;
                    case "payment_settings_updated":
                        window.dispatchEvent(new Event(PAYMENT_SETTINGS_UPDATED_EVENT));
                        break;
                    // Admin ออก activation code ใหม่: token เดิมใช้ไม่ได้แล้ว
                    case "device_revoked":
                        closeStream();
                        resetDeviceToActivation();
                        break;
                }
            },
        });

        return closeStream;
    }, [refreshTheme, sseVersion]);

    // โหลด config สำรองเฉพาะตอนที่ SSE หลุด
    useEffect(() => {
        if (streamState === "connected") return;

        const pollingTimer = window.setInterval(() => void refreshTheme(), CONFIG_POLLING_MS);
        return () => window.clearInterval(pollingTimer);
    }, [refreshTheme, streamState]);

    const value = useMemo(
        () => ({ theme, systemName: theme?.systemName ?? null, status, loading, refreshTheme }),
        [theme, status, loading, refreshTheme]
    );

    return <KioskThemeContext.Provider value={value}>{children}</KioskThemeContext.Provider>;
}

export { KioskThemeRealtimeProvider, useKioskTheme };
