// Import Lib
import { handleDeviceAccessError, postHeartbeat } from "@/src/app/lib/api/client-api";
import { getStoredDeviceCredential, normalizeBarrierDirection, updateStoredDeviceCredential } from "@/src/app/lib/device";
// Import Types
import type { HeartbeatResponse } from "@/src/app/type/api.type";

/* -------------------------------------- Config -------------------------------------- */

// Config รอบส่ง heartbeat (ทางเสริม เพราะ ping ของ SSE ทำให้อุปกรณ์ online อยู่แล้ว)
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
            ...(device.cameraIds ? { cameraIds: device.cameraIds } : {}),
            ...(device.printerIds ? { printerIds: device.printerIds } : {}),
        });

        return heartbeat;
    } catch (error) {
        if (handleDeviceAccessError(error)) return null;
        throw error;
    }
}

// Function เริ่มส่ง heartbeat ทันทีและส่งซ้ำทุก HEARTBEAT_INTERVAL_MS คืน id ของ interval
function startHeartbeat(onSuccess?: () => void): number {
    const run = (): void => {
        void sendHeartbeat()
            .then((heartbeat) => {
                if (heartbeat) onSuccess?.();
            })
            .catch((error) => {
                console.warn("Device heartbeat failed:", error);
            });
    };

    run();
    return window.setInterval(run, HEARTBEAT_INTERVAL_MS);
}

export { sendHeartbeat, startHeartbeat };
