"use client";

// Import Library
import { useEffect, type ReactElement } from "react";
// Import Lib
import { leaveMaintenanceAfterHeartbeat, startHeartbeat } from "@/src/app/lib/heartbeat";
// Import Types
import type { ChildrenProps } from "@/src/app/type/ui.type";

// Function เริ่มส่ง heartbeat ตลอดอายุของแอป และพาออกจากหน้า Maintenance เมื่อ heartbeat ผ่าน
function HeartbeatProvider({ children }: ChildrenProps): ReactElement {
    useEffect(() => startHeartbeat(leaveMaintenanceAfterHeartbeat), []);

    return <>{children}</>;
}

export default HeartbeatProvider;
