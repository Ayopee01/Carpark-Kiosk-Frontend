/* -------------------------------------- Config -------------------------------------- */

// Config เวลารอเมื่อ Backend ตอบ 429 TOO_MANY_DEVICE_AUTH_ATTEMPTS โดยไม่ส่ง Retry-After
const DEFAULT_DEVICE_AUTH_PAUSE_MS = 60000;
// Config รอบอัปเดตวินาทีที่เหลือให้หน้าจอ
const PAUSE_TICK_MS = 1000;

/* -------------------------------------- State -------------------------------------- */

// เวลาที่พักการยืนยันตัวตนของอุปกรณ์ถึง (ms, 0 = ไม่ได้พัก) ใช้ร่วมกันทั้ง heartbeat, Socket.IO และหน้าจอ
let pausedUntil = 0;
// วินาทีที่เหลือล่าสุด (เก็บไว้ให้ useSyncExternalStore ได้ค่าเดิมจนกว่าจะ tick)
let remainingSeconds = 0;
let tickTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

/* -------------------------------------- Helpers -------------------------------------- */

// Function คำนวณวินาทีที่เหลือ แจ้ง listener และหยุด tick เมื่อครบเวลา
function tick(): void {
    remainingSeconds = Math.ceil(getDeviceAuthPauseRemainingMs() / 1000);

    if (remainingSeconds <= 0 && tickTimer !== null) {
        clearInterval(tickTimer);
        tickTimer = null;
    }

    listeners.forEach((listener) => listener());
}

/* -------------------------------------- Functions -------------------------------------- */

// Function คืนเวลาที่ยังต้องพักการยืนยันตัวตนของอุปกรณ์ (ms, 0 = ไม่ได้พัก)
function getDeviceAuthPauseRemainingMs(): number {
    return Math.max(0, pausedUntil - Date.now());
}

// Function คืนวินาทีที่เหลือของการพัก (ใช้เป็น snapshot ของหน้าจอ)
function getDeviceAuthPauseSeconds(): number {
    return remainingSeconds;
}

// Function พักการยืนยันตัวตนของอุปกรณ์ตาม Retry-After (ไม่มี = 60 วินาที) ไม่ลดเวลาที่พักอยู่แล้วให้สั้นลง
function pauseDeviceAuth(retryAfterMs: number | null): void {
    const until = Date.now() + (retryAfterMs ?? DEFAULT_DEVICE_AUTH_PAUSE_MS);
    if (until <= pausedUntil) return;

    pausedUntil = until;
    if (tickTimer === null) tickTimer = setInterval(tick, PAUSE_TICK_MS);
    tick();
}

// Function ยกเลิกการพัก (เช่นตอนเริ่ม test ใหม่)
function clearDeviceAuthPause(): void {
    pausedUntil = 0;
    tick();
}

// Function รับแจ้งเมื่อสถานะการพักเปลี่ยน คืน function เลิกรับ
function subscribeDeviceAuthPause(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export { DEFAULT_DEVICE_AUTH_PAUSE_MS, clearDeviceAuthPause, getDeviceAuthPauseRemainingMs, getDeviceAuthPauseSeconds, pauseDeviceAuth, subscribeDeviceAuthPause };
