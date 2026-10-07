// Function ตรวจว่าเปิดปุ่ม Dev Test หรือไม่ (ต้องตั้ง NEXT_PUBLIC_ENABLE_PAYMENT_TEST=true และไม่ใช่ production)
function isPaymentTestEnabled(): boolean {
    return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_PAYMENT_TEST === "true";
}

export { isPaymentTestEnabled };
