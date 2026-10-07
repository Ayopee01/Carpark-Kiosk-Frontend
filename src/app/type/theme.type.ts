// Import Types
import type { ClientConfigResponse, ClientTheme } from "./api.type";

/* -------------------------------------- Theme Types -------------------------------------- */

// Type theme ของ Kiosk (GET /client/config)
export type KioskThemeConfig = ClientTheme;

// Type response ของการดึง theme ของ Kiosk
export type KioskConfigResponse = ClientConfigResponse;

// Type ข้อมูลประกอบที่เก็บใน localStorage
export type KioskConfigMeta = {
    status: string | null;
};

// Type ค่าที่ KioskThemeRealtimeProvider ส่งผ่าน Context
export type KioskThemeContextValue = {
    theme: KioskThemeConfig | null;
    systemName: string | null;
    status: string | null;
    loading: boolean;
    refreshTheme: () => Promise<void>;
};
