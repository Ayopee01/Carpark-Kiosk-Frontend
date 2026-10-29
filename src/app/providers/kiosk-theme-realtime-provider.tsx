"use client";

// Import Library
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactElement } from "react";
import { useEventListener, useInterval, useLocalStorage } from "usehooks-ts";
import { z } from "zod";
// Import Lib
import { getClientConfig } from "@/src/app/lib/api/client-api";
import { reconnectClientSocket, subscribeClientSocket } from "@/src/app/lib/api/client-socket";
import { getStoredDeviceCredential } from "@/src/app/lib/device";
import { KIOSK_THEME_STORAGE_KEY, applyKioskThemeToRoot, normalizeKioskTheme } from "@/src/app/lib/kiosk-theme";
import { nullableStringSchema, parseJsonText } from "@/src/app/lib/schema";
import { KIOSK_CONFIG_UPDATED_EVENT, PAYMENT_SETTINGS_UPDATED_EVENT } from "@/src/app/lib/storage-keys";
// Import Types
import type { ClientSocketState } from "@/src/app/type/realtime.type";
import type { KioskConfigMeta, KioskConfigResponse, KioskThemeConfig, KioskThemeContextValue } from "@/src/app/type/theme.type";
import type { ChildrenProps } from "@/src/app/type/ui.type";

/* -------------------------------------- Config -------------------------------------- */

// Config key ที่เก็บสถานะอุปกรณ์ใน localStorage
const KIOSK_META_STORAGE_KEY = "kioskConfigMeta";
// Config รอบโหลด config สำรองระหว่างที่ Socket.IO หลุด
const CONFIG_POLLING_MS = 60000;
// Config สถานะอุปกรณ์เมื่อยังไม่เคยบันทึก
const EMPTY_META: KioskConfigMeta = { status: null };
// Config Context ของ theme และสถานะอุปกรณ์ (ค่าเริ่มต้นก่อนโหลดจาก Storage หรือ API)
const KioskThemeContext = createContext<KioskThemeContextValue>({
    theme: null,
    systemName: null,
    status: null,
    loading: true,
    refreshTheme: async () => {},
});

/* -------------------------------------- Schemas -------------------------------------- */

// Schema สถานะอุปกรณ์ใน localStorage (อ่านไม่ได้ได้ status null)
const kioskMetaSchema = z.object({ status: nullableStringSchema }).catch({ status: null });

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลง theme ใน localStorage (อ่านไม่ได้คืน null)
function deserializeTheme(raw: string): KioskThemeConfig | null {
    return normalizeKioskTheme(parseJsonText(raw));
}

// Function แปลงสถานะอุปกรณ์ใน localStorage (อ่านไม่ได้ได้ status null)
function deserializeMeta(raw: string): KioskConfigMeta {
    return kioskMetaSchema.parse(parseJsonText(raw));
}

/* -------------------------------------- Functions -------------------------------------- */

// Function hook อ่าน theme และสถานะอุปกรณ์จาก Context
function useKioskTheme(): KioskThemeContextValue {
    return useContext(KioskThemeContext);
}

// Function โหลด theme จาก Storage / API และต่อ Socket.IO /client ค้างไว้ แล้วส่งต่อผ่าน Context
// useLocalStorage เก็บ theme / สถานะและซิงก์ข้ามแท็บให้ (initializeWithValue: false ให้ render แรกตรงกับหน้า static แล้วค่อยอ่านหลัง hydrate)
function KioskThemeRealtimeProvider({ children }: ChildrenProps): ReactElement {
    const [theme, setTheme] = useLocalStorage<KioskThemeConfig | null>(KIOSK_THEME_STORAGE_KEY, null, {
        initializeWithValue: false,
        deserializer: deserializeTheme,
    });
    const [meta, setMeta] = useLocalStorage<KioskConfigMeta>(KIOSK_META_STORAGE_KEY, EMPTY_META, {
        initializeWithValue: false,
        deserializer: deserializeMeta,
    });
    const [configLoaded, setConfigLoaded] = useState(false);
    const [socketState, setSocketState] = useState<ClientSocketState>("connecting");

    // ตั้งสีของ theme ทุกครั้งที่ theme เปลี่ยน (รวมค่าจาก Storage และจากแท็บอื่น)
    useEffect(() => {
        if (theme) applyKioskThemeToRoot(theme);
    }, [theme]);

    const commitConfig = useCallback(
        (config: KioskConfigResponse): void => {
            const nextTheme = normalizeKioskTheme(config.theme);
            if (!nextTheme) throw new Error("ข้อมูล theme จาก API ไม่ถูกต้อง");

            setTheme(nextTheme);
            setMeta(kioskMetaSchema.parse({ status: getStoredDeviceCredential()?.status }));
        },
        [setMeta, setTheme]
    );

    const refreshTheme = useCallback(async (): Promise<void> => {
        try {
            commitConfig(await getClientConfig());
        } catch (err) {
            console.warn("โหลด theme ไม่สำเร็จ:", err);
        } finally {
            setConfigLoaded(true);
        }
    }, [commitConfig]);

    // แสดง theme ที่เก็บไว้ก่อน แล้วโหลด config ล่าสุดจาก API
    useEffect(() => {
        void refreshTheme();
    }, [refreshTheme]);

    // หน้า Activate ส่ง config มาหลังเปิดใช้งานสำเร็จ: บันทึก theme นั้นและต่อ Socket.IO ใหม่ด้วย credential ที่ได้
    useEventListener(KIOSK_CONFIG_UPDATED_EVENT, (event) => {
        const config: KioskConfigResponse | undefined = event.detail;
        if (!config?.theme) return;

        try {
            commitConfig(config);
            reconnectClientSocket();
        } catch (err) {
            console.warn("อัปเดต theme จาก Activate ไม่สำเร็จ:", err);
        }
    });

    // Backend ตรวจ token และ refresh heartbeat ของอุปกรณ์ทุกรอบระหว่างที่ socket ต่ออยู่
    useEffect(
        () =>
            subscribeClientSocket({
                onStateChange: setSocketState,
                onEvent: (event) => {
                    switch (event.type) {
                        // โหลด config ใหม่เพื่อรับ logoUrl และ updatedAt หลัง Backend บันทึกไฟล์สำเร็จ
                        case "theme_updated":
                            void refreshTheme();
                            break;
                        case "payment_settings_updated":
                            window.dispatchEvent(new Event(PAYMENT_SETTINGS_UPDATED_EVENT));
                            break;
                    }
                },
            }),
        [refreshTheme]
    );

    // โหลด config สำรองเฉพาะตอนที่ Socket.IO หลุด
    useInterval(() => void refreshTheme(), socketState === "connected" ? null : CONFIG_POLLING_MS);

    // มี theme ที่เก็บไว้แล้วไม่ต้องรอ API
    const loading = !theme && !configLoaded;
    const value = useMemo(
        () => ({ theme, systemName: theme?.systemName ?? null, status: meta.status, loading, refreshTheme }),
        [theme, meta.status, loading, refreshTheme]
    );

    return <KioskThemeContext.Provider value={value}>{children}</KioskThemeContext.Provider>;
}

export { KioskThemeRealtimeProvider, useKioskTheme };
