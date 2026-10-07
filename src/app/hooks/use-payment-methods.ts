"use client";

// Import Library
import { useCallback, useEffect, useState } from "react";
// Import Lib
import { getPaymentMethods, handleDeviceAccessError } from "@/src/app/lib/api/client-api";
import { PAYMENT_SETTINGS_UPDATED_EVENT } from "@/src/app/lib/storage-keys";
// Import Types
import type { ClientPaymentMethodsResponse } from "@/src/app/type/api.type";
import type { PaymentMethodOption, PaymentMethodsState } from "@/src/app/type/payment.type";

/* -------------------------------------- Helpers -------------------------------------- */

// Function คัดเฉพาะ method ที่ client รองรับ (card ต้องมีเครื่อง EDC ที่ผูกไว้ใน edc, เงินสดมีเฉพาะ Admin)
function toSupportedMethods(response: ClientPaymentMethodsResponse): PaymentMethodOption[] {
    return response.methods.flatMap((method): PaymentMethodOption[] => {
        if (method.id === "promptpay") return [{ id: "promptpay", label: method.label }];
        if (method.id === "card" && response.edc) return [{ id: "card", label: method.label }];
        return [];
    });
}

/* -------------------------------------- Functions -------------------------------------- */

// Function hook โหลด GET /client/payments/methods เมื่อพร้อมแสดงหน้าเลือกวิธีชำระ และโหลดใหม่เมื่อได้ payment_settings_updated
function usePaymentMethods(enabled: boolean): PaymentMethodsState {
    const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
    const [edc, setEdc] = useState<ClientPaymentMethodsResponse["edc"]>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    const reload = useCallback(async (): Promise<void> => {
        setLoading(true);
        setFailed(false);

        try {
            const response = await getPaymentMethods();
            setMethods(toSupportedMethods(response));
            setEdc(response.edc);
        } catch (error) {
            if (handleDeviceAccessError(error)) return;
            console.warn("Unable to load payment methods:", error);
            setMethods([]);
            setEdc(null);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        void reload();

        const handleSettingsUpdated = (): void => void reload();
        window.addEventListener(PAYMENT_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);

        return () => {
            window.removeEventListener(PAYMENT_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
        };
    }, [enabled, reload]);

    return { methods, edc, loading, failed, reload };
}

export { usePaymentMethods };
