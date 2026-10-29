// Import Lib
import { MAINTENANCE_PATH, handleDeviceAccessError, postHeartbeat } from "@/src/app/lib/api/client-api";
import { getStoredDeviceCredential, normalizeBarrierDirection, updateStoredDeviceCredential } from "@/src/app/lib/device";
import { getDeviceAuthPauseRemainingMs } from "@/src/app/lib/device-auth-pause";
// Import Types
import type { HeartbeatResponse } from "@/src/app/type/api.type";

/* -------------------------------------- Config -------------------------------------- */

// Config รอบส่ง heartbeat (ทางเสริม เพราะ Backend refresh heartbeat ให้ระหว่างที่ Socket.IO ต่ออยู่แล้ว)
const HEARTBEAT_INTERVAL_MS = 45000;

/* -------------------------------------- Functions -------------------------------------- */

// Function ส่ง POST /client/heartbeat แล้วอัปเดตข้อมูลอุปกรณ์ (ไม่มี credential หรือถูกพาไปหน้าอื่นคืน null)
async function sendHeartbeat(): Promise<HeartbeatResponse | null> {
    const credential = getStoredDeviceCredential();
    if (!credential) return null;

    try {
        const heartbeat = await postHeartbeat({
            ...(credential.deviceName ? { name: credential.deviceName } : {}),
            ...(credential.location ? { location: credential.location } : {}),
        });
        const { device } = heartbeat;

        updateStoredDeviceCredential({
            status: heartbeat.status,
            deviceName: device.deviceName,
            location: device.location,
            ...(device.gateId !== undefined ? { gateId: device.gateId } : {}),
            ...(device.direction !== undefined ? { direction: normalizeBarrierDirection(device.direction) } : {}),
            ...("cameraIds" in device && device.cameraIds ? { cameraIds: device.cameraIds } : {}),
            ...("printerIds" in device && device.printerIds ? { printerIds: device.printerIds } : {}),
        });

        return heartbeat;
    } catch (error) {
        if (handleDeviceAccessError(error)) return null;
        throw error;
    }
}

// Function เริ่มส่ง heartbeat ทันทีและส่งซ้ำทุก HEARTBEAT_INTERVAL_MS (ระหว่างถูกพักจาก 429 จะรอจนครบ Retry-After) คืน function หยุด
// หน้า Maintenance ยังส่งต่อ เพื่อให้รู้ตอนที่ Admin ตั้งตู้กลับเป็น active หรือแก้ allowedIps แล้ว
function startHeartbeat(onSuccess?: () => void): () => void {
    let stopped = false;
    let timer: number | null = null;

    const schedule = (): void => {
        if (stopped) return;
        const pauseMs = getDeviceAuthPauseRemainingMs();
        timer = window.setTimeout(run, pauseMs > 0 ? pauseMs : HEARTBEAT_INTERVAL_MS);
    };

    const run = (): void => {
        timer = null;
        if (stopped) return;

        if (getDeviceAuthPauseRemainingMs() > 0) {
            schedule();
            return;
        }

        void sendHeartbeat()
            .then((heartbeat) => {
                if (heartbeat && !stopped) onSuccess?.();
            })
            .catch((error) => {
                console.warn("Device heartbeat failed:", error);
            })
            .finally(schedule);
    };

    run();

    return () => {
        stopped = true;
        if (timer !== null) window.clearTimeout(timer);
    };
}

// Function ออกจากหน้า Maintenance เมื่อ heartbeat ผ่าน (ตู้กลับมาใช้งานได้โดยไม่ต้อง Activate ใหม่)
function leaveMaintenanceAfterHeartbeat(): void {
    if (window.location.pathname === MAINTENANCE_PATH) {
        window.location.replace("/");
    }
}

export { leaveMaintenanceAfterHeartbeat, sendHeartbeat, startHeartbeat };
