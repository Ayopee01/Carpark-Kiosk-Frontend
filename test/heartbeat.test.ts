// Import Library
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
// Import Lib
import { DEVICE_AUTH_LIMIT_CODE } from "@/src/app/lib/api/client-api";
import { getStoredDeviceCredential } from "@/src/app/lib/device";
import { leaveMaintenanceAfterHeartbeat, startHeartbeat } from "@/src/app/lib/heartbeat";
// Import Support
import { advance, flushPromises, mockFetch, setupBrowser, teardownBrowser } from "@/test/support/browser";

/* -------------------------------------- Config -------------------------------------- */

// Config response ของ heartbeat ที่ผ่าน
const HEARTBEAT_OK = {
    status: 200,
    body: { message: "ok", status: "active", device: { deviceName: "Kiosk 1", location: null } },
};

// Config response 429 ของ device auth
const DEVICE_AUTH_LIMITED = { status: 429, body: { code: DEVICE_AUTH_LIMIT_CODE, message: "Too many" } };

/* -------------------------------------- Tests -------------------------------------- */

describe("heartbeat", () => {
    let stop: (() => void) | null = null;
    afterEach(() => {
        stop?.();
        stop = null;
        teardownBrowser();
    });

    it("ส่งทุก 45 วินาที", async () => {
        setupBrowser();
        const fetchMock = mockFetch(HEARTBEAT_OK);

        stop = startHeartbeat();
        await flushPromises();
        assert.equal(fetchMock.mock.callCount(), 1);

        await advance(45000);
        assert.equal(fetchMock.mock.callCount(), 2);
    });

    it("ได้ 429 พร้อม Retry-After: 120 หยุด 120 วินาที แล้วส่งใหม่ และ token ยังอยู่", async () => {
        setupBrowser();
        const fetchMock = mockFetch({ ...DEVICE_AUTH_LIMITED, headers: { "Retry-After": "120" } }, HEARTBEAT_OK);

        stop = startHeartbeat();
        await flushPromises();
        assert.equal(fetchMock.mock.callCount(), 1);

        await advance(119000);
        assert.equal(fetchMock.mock.callCount(), 1, "ต้องไม่ส่งก่อนครบ Retry-After");

        await advance(1000);
        assert.equal(fetchMock.mock.callCount(), 2);
        assert.ok(getStoredDeviceCredential());
    });

    it("ได้ 429 ไม่มี Retry-After รอ 60 วินาที", async () => {
        setupBrowser();
        const fetchMock = mockFetch(DEVICE_AUTH_LIMITED, HEARTBEAT_OK);

        stop = startHeartbeat();
        await flushPromises();

        await advance(59000);
        assert.equal(fetchMock.mock.callCount(), 1);

        await advance(1000);
        assert.equal(fetchMock.mock.callCount(), 2);
    });

    it("หน้า Maintenance ยังส่ง heartbeat และกลับหน้าปกติเมื่อผ่าน", async () => {
        const location = setupBrowser("/landing/maintenance");
        const fetchMock = mockFetch({ status: 403, body: { code: "INVALID_DEVICE_CREDENTIALS", message: "Invalid", reason: "inactive" } }, HEARTBEAT_OK);

        stop = startHeartbeat(leaveMaintenanceAfterHeartbeat);
        await flushPromises();
        assert.equal(fetchMock.mock.callCount(), 1);
        assert.deepEqual(location.replaced, [], "อยู่หน้า Maintenance แล้วไม่ต้อง replace ซ้ำ");
        assert.ok(getStoredDeviceCredential(), "inactive ต้องเก็บ token ไว้");

        // Admin ตั้งตู้กลับเป็น active: heartbeat รอบถัดไปผ่าน
        await advance(45000);
        assert.equal(fetchMock.mock.callCount(), 2);
        assert.deepEqual(location.replaced, ["/"]);
    });
});
