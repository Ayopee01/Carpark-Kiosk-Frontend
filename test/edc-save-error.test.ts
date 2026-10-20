// Import Library
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
// Import Lib
import { ApiClientError, DEVICE_AUTH_LIMIT_CODE, NETWORK_ERROR_CODE, recordEdcPayment } from "@/src/app/lib/api/client-api";
import { EDC_APPROVAL_REJECTED_CODE, classifyEdcSaveError } from "@/src/app/lib/payment/edc-save-error";
// Import Support
import { mockFetch, setupBrowser, teardownBrowser } from "@/test/support/browser";

/* -------------------------------------- Helpers -------------------------------------- */

// Function สร้าง ApiClientError ของ status และ code ที่ระบุ
function apiError(status: number, code: string): ApiClientError {
    return new ApiClientError(status, { code, message: code });
}

/* -------------------------------------- Tests -------------------------------------- */

describe("classifyEdcSaveError", () => {
    beforeEach(() => setupBrowser());
    afterEach(teardownBrowser);

    it("402 EDC_APPROVAL_REJECTED จาก Backend ไม่ถือว่าจ่ายแล้ว", async () => {
        mockFetch({ status: 402, body: { code: EDC_APPROVAL_REJECTED_CODE, message: "Approval not found", reason: "approval_not_found" } });

        const error = await recordEdcPayment({ transactionId: "tx-1", amount: 30, reference: "A1", terminalId: "T1" }).then(
            () => null,
            (caught: unknown) => caught
        );

        assert.ok(error instanceof ApiClientError, "ต้อง throw ไม่ใช่สำเร็จ");
        assert.equal(classifyEdcSaveError(error), "rejected");
    });

    it("429 TOO_MANY_DEVICE_AUTH_ATTEMPTS ส่งซ้ำด้วย reference เดิมได้ ไม่ใช่ void", () => {
        assert.equal(classifyEdcSaveError(apiError(429, DEVICE_AUTH_LIMIT_CODE)), "limited");
    });

    it("เชื่อมต่อไม่ได้หรือ 5xx ส่งซ้ำได้", () => {
        assert.equal(classifyEdcSaveError(apiError(0, NETWORK_ERROR_CODE)), "retry");
        assert.equal(classifyEdcSaveError(apiError(502, "BAD_GATEWAY")), "retry");
        assert.equal(classifyEdcSaveError(new Error("unknown")), "retry");
    });

    it("4xx อื่นต้อง void ที่เครื่อง EDC", () => {
        assert.equal(classifyEdcSaveError(apiError(409, "EDC_TERMINAL_MISMATCH")), "void");
    });
});
