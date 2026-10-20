// Import Library
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
// Import Lib
import { DEVICE_AUTH_LIMIT_CODE } from "@/src/app/lib/api/client-api";
import { openClientEventStream } from "@/src/app/lib/api/client-events";
import { getStoredDeviceCredential } from "@/src/app/lib/device";
// Import Types
import type { ClientStreamEvent } from "@/src/app/type/api.type";
// Import Support
import { advance, flushPromises, mockFetch, setupBrowser, teardownBrowser } from "@/test/support/browser";

/* -------------------------------------- Config -------------------------------------- */

// Config เวลาที่รอเผื่อ backoff สูงสุดของ SSE (30 วินาที + jitter 0.5 วินาที)
const MAX_BACKOFF_MS = 31000;

/* -------------------------------------- Tests -------------------------------------- */

describe("SSE /client/events", () => {
    let close: (() => void) | null = null;
    afterEach(() => {
        close?.();
        close = null;
        teardownBrowser();
    });

    it("ต่อใหม่ได้ 403 reason inactive ไปหน้า Maintenance เก็บ token และไม่ต่อซ้ำ", async () => {
        const location = setupBrowser();
        const fetchMock = mockFetch({ status: 403, body: { code: "INVALID_DEVICE_CREDENTIALS", message: "Invalid", reason: "inactive" } });

        close = openClientEventStream({ onEvent: () => undefined });
        await flushPromises();

        assert.deepEqual(location.replaced, ["/landing/maintenance?reason=inactive"]);
        assert.ok(getStoredDeviceCredential());

        await advance(MAX_BACKOFF_MS);
        assert.equal(fetchMock.mock.callCount(), 1);
    });

    it("ต่อใหม่ได้ 401 reason invalid_token ล้าง token ไปหน้า Activate และไม่ต่อซ้ำ", async () => {
        const location = setupBrowser();
        const fetchMock = mockFetch({ status: 401, body: { code: "INVALID_DEVICE_CREDENTIALS", message: "Invalid", reason: "invalid_token" } });

        close = openClientEventStream({ onEvent: () => undefined });
        await flushPromises();

        assert.deepEqual(location.replaced, ["/landing/activate"]);
        assert.equal(getStoredDeviceCredential(), null);

        await advance(MAX_BACKOFF_MS);
        assert.equal(fetchMock.mock.callCount(), 1);
    });

    it("ได้ 429 พร้อม Retry-After: 120 ไม่ต่อใหม่จนครบ 120 วินาที และ token ยังอยู่", async () => {
        const location = setupBrowser();
        const fetchMock = mockFetch({ status: 429, body: { code: DEVICE_AUTH_LIMIT_CODE, message: "Too many" }, headers: { "Retry-After": "120" } });

        close = openClientEventStream({ onEvent: () => undefined });
        await flushPromises();
        assert.equal(fetchMock.mock.callCount(), 1);

        await advance(119000);
        assert.equal(fetchMock.mock.callCount(), 1, "ต้องไม่ต่อใหม่ก่อนครบ Retry-After");

        await advance(1000);
        assert.equal(fetchMock.mock.callCount(), 2);
        assert.ok(getStoredDeviceCredential());
        assert.deepEqual(location.replaced, []);
    });

    it("ส่ง event device_revoked พร้อม reason ให้หน้าจอ", async () => {
        setupBrowser();
        mockFetch({ status: 200, stream: 'data: {"type":"device_revoked","reason":"device_activation_reissued","at":"2026-01-01T00:00:00Z"}\n\n' });
        const events: ClientStreamEvent[] = [];

        close = openClientEventStream({ onEvent: (event) => events.push(event) });
        await flushPromises();

        assert.deepEqual(events[0], { type: "device_revoked", reason: "device_activation_reissued", at: "2026-01-01T00:00:00Z" });
    });

    it("ส่ง device credential ทาง header ไม่ใส่ deviceId ใน query", async () => {
        setupBrowser();
        const fetchMock = mockFetch({ status: 403, body: { code: "DEVICE_MAINTENANCE", message: "Maintenance" } });

        close = openClientEventStream({ query: { gateId: "gate-1" }, onEvent: () => undefined });
        await flushPromises();

        const [url, init] = fetchMock.mock.calls[0]!.arguments as unknown as [string, RequestInit];
        // ตรวจเฉพาะ path + query เพราะ origin ขึ้นกับ NEXT_PUBLIC_API_BASE_URL (CI ตั้งไว้ local อาจไม่ได้ตั้ง)
        const { pathname, search } = new URL(url, "http://localhost");
        assert.equal(`${pathname}${search}`, "/api/client/events?gateId=gate-1");
        assert.deepEqual(
            { id: (init.headers as Record<string, string>)["x-device-id"], token: (init.headers as Record<string, string>)["x-device-token"] },
            { id: "kiosk-1", token: "token-1" }
        );
    });
});
