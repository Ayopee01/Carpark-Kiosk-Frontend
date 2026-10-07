// Import Types
import type { BarrierHardwareAdapter } from "@/src/app/type/barrier.type";

// Config hardware adapter ของไม้กั้นแบบ mock (ยังไม่ได้เชื่อมต่อไม้กั้นจริง)
const barrierHardwareAdapter: BarrierHardwareAdapter = {
    async openGate() {
        console.info("Mock barrier gate opened");
    },
};

export { barrierHardwareAdapter };
