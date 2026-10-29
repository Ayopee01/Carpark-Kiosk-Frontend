// Import Library
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
// Import Lib
import { DEVICE_AUTH_LIMIT_CODE } from "@/src/app/lib/api/client-api";
import { handleClientConnectError, parseClientSocketEvent } from "@/src/app/lib/api/client-socket";
import { getStoredDeviceCredential } from "@/src/app/lib/device";
import { getDeviceAuthPauseRemainingMs } from "@/src/app/lib/device-auth-pause";
// Import Support
import { setupBrowser, teardownBrowser } from "@/test/support/browser";

/* -------------------------------------- Tests -------------------------------------- */

describe("Socket.IO /client connect_error", () => {
    afterEach(teardownBrowser);

    it("403 reason inactive ไปหน้า Maintenance และเก็บ token", () => {
        const location = setupBrowser();

        const handled = handleClientConnectError({ statusCode: 403, code: "INVALID_DEVICE_CREDENTIALS", reason: "inactive" });

        assert.equal(handled, true);
        assert.deepEqual(location.replaced, ["/landing/maintenance?reason=inactive"]);
        assert.ok(getStoredDeviceCredential());
    });

    it("401 reason invalid_token ล้าง token ไปหน้า Activate", () => {
        const location = setupBrowser();

        const handled = handleClientConnectError({ statusCode: 401, code: "INVALID_DEVICE_CREDENTIALS", reason: "invalid_token" });

        assert.equal(handled, true);
        assert.deepEqual(location.replaced, ["/landing/activate"]);
        assert.equal(getStoredDeviceCredential(), null);
    });

    it("403 DEVICE_MAINTENANCE ไปหน้า Maintenance", () => {
        const location = setupBrowser();

        assert.equal(handleClientConnectError({ statusCode: 403, code: "DEVICE_MAINTENANCE" }), true);
        assert.deepEqual(location.replaced, ["/landing/maintenance"]);
    });

    it("429 พักการยืนยันตัวตนตาม details.retryAfter (วินาที) ไม่เปลี่ยนหน้าและเก็บ token", () => {
        const location = setupBrowser();

        const handled = handleClientConnectError({ statusCode: 429, code: DEVICE_AUTH_LIMIT_CODE, details: { retryAfter: 120 } });

        assert.equal(handled, false);
        assert.equal(getDeviceAuthPauseRemainingMs(), 120000);
        assert.deepEqual(location.replaced, []);
        assert.ok(getStoredDeviceCredential());
    });

    it("500 internal_error ไม่เปลี่ยนหน้า (ให้ต่อใหม่เอง)", () => {
        const location = setupBrowser();

        assert.equal(handleClientConnectError({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", reason: "internal_error" }), false);
        assert.deepEqual(location.replaced, []);
    });
});

describe("Socket.IO /client events", () => {
    it("แปลงชื่อ event เป็น type ที่หน้าจอใช้", () => {
        assert.deepEqual(parseClientSocketEvent("ready", { clientType: "kiosk", heartbeatIntervalMs: 25000 }), {
            type: "ready",
            clientType: "kiosk",
            heartbeatIntervalMs: 25000,
        });
        assert.deepEqual(parseClientSocketEvent("device:revoked", { reason: "device_activation_reissued", at: "2026-01-01T00:00:00Z" }), {
            type: "device_revoked",
            reason: "device_activation_reissued",
            at: "2026-01-01T00:00:00Z",
        });
        assert.equal(parseClientSocketEvent("theme:updated", { theme: { themeColor: "#112233" } })?.type, "theme_updated");
        assert.equal(parseClientSocketEvent("payment_settings:updated", { type: "payment_settings_updated", at: "x" })?.type, "payment_settings_updated");
    });

    it("lpr:detected ที่ openGate ไม่ใช่ boolean ถือเป็น false และไม่มี plateNo ไม่ผ่าน", () => {
        const event = parseClientSocketEvent("lpr:detected", { type: "lpr_detected", plateNo: "1กข1234", direction: "OUT", openGate: "yes", capturedAt: "2026-01-01T00:00:00Z" });

        assert.equal(event?.type, "lpr_detected");
        assert.equal(event?.type === "lpr_detected" && event.openGate, false);
        assert.equal(parseClientSocketEvent("lpr:detected", { direction: "OUT" }), null);
    });

    it("event ที่ไม่รู้จักคืน null", () => {
        assert.equal(parseClientSocketEvent("unknown:event", {}), null);
    });
});
