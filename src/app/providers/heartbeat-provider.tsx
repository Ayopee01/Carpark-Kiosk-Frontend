"use client";

// Import Library
import { useEffect, type ReactElement } from "react";
// Import Lib
import { MAINTENANCE_PATH } from "@/src/app/lib/api/client-api";
import { startHeartbeat } from "@/src/app/lib/heartbeat";
// Import Types
import type { ChildrenProps } from "@/src/app/type/ui.type";

// Function เริ่มส่ง heartbeat ตลอดอายุของแอป และพาออกจากหน้า Maintenance เมื่อ heartbeat ผ่าน
function HeartbeatProvider({ children }: ChildrenProps): ReactElement {
    useEffect(() => {
        const timer = startHeartbeat(() => {
            if (window.location.pathname === MAINTENANCE_PATH) {
                window.location.replace("/");
            }
        });

        return () => clearInterval(timer);
    }, []);

    return <>{children}</>;
}

export default HeartbeatProvider;
