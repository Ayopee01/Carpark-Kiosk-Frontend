// Import Library
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
// Import Lib
import { ApiClientError, DEVICE_AUTH_LIMIT_CODE, handleDeviceRevoked, lookupTransactionByPlate, parseRetryAfterMs } from "@/src/app/lib/api/client-api";
import { getStoredDeviceCredential } from "@/src/app/lib/device";
import { getDeviceAuthPauseRemainingMs } from "@/src/app/lib/device-auth-pause";
// Import Support
import { mockFetch, setupBrowser, teardownBrowser, type FakeLocation } from "@/test/support/browser";

/* -------------------------------------- Tests -------------------------------------- */

describe("parseRetryAfterMs", () => {
    beforeEach(() => setupBrowser());
    afterEach(teardownBrowser);

    it("แปลงวินาทีเป็น ms", () => {
        assert.equal(parseRetryAfterMs("120"), 120000);
    });

    it("แปลง HTTP date เป็นเวลาที่เหลือ", () => {
        assert.equal(parseRetryAfterMs(new Date(Date.now() + 30000).toUTCString()), 30000);
    });

    it("ไม่มีหรืออ่านไม่ได้คืน null", () => {
        assert.equal(parseRetryAfterMs(null), null);
        assert.equal(parseRetryAfterMs("soon"), null);
    });
});

describe("429 TOO_MANY_DEVICE_AUTH_ATTEMPTS ของ REST", () => {
    let location: FakeLocation;
    beforeEach(() => {
        location = setupBrowser();
    });
    afterEach(teardownBrowser);

    it("พักตาม Retry-After, ไม่ล้าง token และไม่เปลี่ยนหน้า", async () => {
        mockFetch({ status: 429, body: { code: DEVICE_AUTH_LIMIT_CODE, message: "Too many" }, headers: { "Retry-After": "120" } });

        const error = await lookupTransactionByPlate("1234").catch((caught: unknown) => caught);

        assert.ok(error instanceof ApiClientError);
        assert.equal(error.code, DEVICE_AUTH_LIMIT_CODE);
        assert.equal(error.retryAfterMs, 120000);
        assert.equal(getDeviceAuthPauseRemainingMs(), 120000);
        assert.ok(getStoredDeviceCredential());
        assert.deepEqual(location.replaced, []);
    });

    it("ไม่มี Retry-After พัก 60 วินาที", async () => {
        mockFetch({ status: 429, body: { code: DEVICE_AUTH_LIMIT_CODE, message: "Too many" } });

        await lookupTransactionByPlate("1234").catch(() => null);

        assert.equal(getDeviceAuthPauseRemainingMs(), 60000);
    });

    it("429 อื่น (rate limit ทั่วไป) ไม่พัก heartbeat / SSE", async () => {
        mockFetch({ status: 429, body: { code: "TOO_MANY_REQUESTS", message: "Too many" }, headers: { "Retry-After": "30" } });

        await lookupTransactionByPlate("1234").catch(() => null);

        assert.equal(getDeviceAuthPauseRemainingMs(), 0);
    });
});

describe("device_revoked", () => {
    let location: FakeLocation;
    beforeEach(() => {
        location = setupBrowser();
    });
    afterEach(teardownBrowser);

    it("reason device_activation_reissued ล้าง token แล้วไปหน้า Activate", () => {
        handleDeviceRevoked("device_activation_reissued");

        assert.equal(getStoredDeviceCredential(), null);
        assert.deepEqual(location.replaced, ["/landing/activate"]);
    });

    it("reason invalid_token ล้าง token แล้วไปหน้า Activate", () => {
        handleDeviceRevoked("invalid_token");

        assert.equal(getStoredDeviceCredential(), null);
        assert.deepEqual(location.replaced, ["/landing/activate"]);
    });

    it("reason inactive (ถ้าได้) ไปหน้า Maintenance และเก็บ token", () => {
        handleDeviceRevoked("inactive");

        assert.ok(getStoredDeviceCredential());
        assert.deepEqual(location.replaced, ["/landing/maintenance?reason=inactive"]);
    });
});
