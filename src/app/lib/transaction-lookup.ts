// Import Lib
import { getTransactionById, handleDeviceAccessError, hasErrorCode, isPlateLookupMultiple, lookupTransactionByPlate } from "@/src/app/lib/api/client-api";
// Import Types
import type { TransactionLookupOutcome } from "@/src/app/type/transaction.type";

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลง error ของการค้นหาเป็นผลที่หน้าจอใช้ (error ของอุปกรณ์จะเปลี่ยนหน้าให้ก่อน)
function toLookupErrorOutcome(error: unknown): TransactionLookupOutcome {
    if (handleDeviceAccessError(error)) return { kind: "redirected" };
    if (hasErrorCode(error, "TRANSACTION_NOT_FOUND")) return { kind: "not_found" };
    if (hasErrorCode(error, "TRANSACTION_ALREADY_PROCESSED")) return { kind: "already_processed" };
    if (hasErrorCode(error, "INVALID_PLATE_NO", "PLATE_NO_REQUIRED")) return { kind: "invalid_plate" };
    return { kind: "error", error };
}

/* -------------------------------------- Functions -------------------------------------- */

// Function ค้นหารายการจอดด้วยทะเบียน (GET /client/transactions?plateNo=)
async function lookupPlate(plateNo: string): Promise<TransactionLookupOutcome> {
    try {
        const result = await lookupTransactionByPlate(plateNo);

        return isPlateLookupMultiple(result)
            ? { kind: "multiple", candidates: result.candidates }
            : { kind: "found", transaction: result };
    } catch (error) {
        return toLookupErrorOutcome(error);
    }
}

// Function ดึงรายการจอดด้วย transaction id (GET /client/transactions/:id)
async function lookupTransactionId(transactionId: string): Promise<TransactionLookupOutcome> {
    try {
        return { kind: "found", transaction: await getTransactionById(transactionId) };
    } catch (error) {
        return toLookupErrorOutcome(error);
    }
}

export { lookupPlate, lookupTransactionId };
