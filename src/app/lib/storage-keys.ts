// Config key ที่จำ URL กลับไปหน้า Barrier Gate หลังจ่ายเงิน
const BARRIER_RETURN_STORAGE_KEY = "barrierGateReturnUrl";
// Config ชื่อ event ที่หน้า Activate ส่งให้ Provider อัปเดต Config
const KIOSK_CONFIG_UPDATED_EVENT = "kiosk-config-updated";
// Config ชื่อ event ที่ Provider ส่งต่อเมื่อได้ SSE payment_settings_updated
const PAYMENT_SETTINGS_UPDATED_EVENT = "payment-settings-updated";

export { BARRIER_RETURN_STORAGE_KEY, KIOSK_CONFIG_UPDATED_EVENT, PAYMENT_SETTINGS_UPDATED_EVENT };
