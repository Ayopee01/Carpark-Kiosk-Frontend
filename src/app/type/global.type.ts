// Import Lib
import type { INTL_FORMATS } from "@/src/app/lib/intl-formats";
import type { KIOSK_CONFIG_UPDATED_EVENT, PAYMENT_SETTINGS_UPDATED_EVENT } from "@/src/app/lib/storage-keys";
// Import Types
import type { KioskConfigResponse } from "./theme.type";

/* -------------------------------------- next-intl Types -------------------------------------- */

// Type ชื่อรูปแบบวันเวลาที่ useFormatter รับ
declare module "next-intl" {
    interface AppConfig {
        Formats: typeof INTL_FORMATS;
    }
}

/* -------------------------------------- Window Event Types -------------------------------------- */

// Type event ภายในแอปที่ส่งผ่าน window (ให้ useEventListener รู้ type ของ event)
declare global {
    interface WindowEventMap {
        [KIOSK_CONFIG_UPDATED_EVENT]: CustomEvent<KioskConfigResponse>;
        [PAYMENT_SETTINGS_UPDATED_EVENT]: Event;
    }
}
