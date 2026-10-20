// Import Library
import { mock } from "node:test";
// Import Lib
import { clearDeviceAuthPause } from "@/src/app/lib/device-auth-pause";
import { saveDeviceCredential } from "@/src/app/lib/device";
// Import Types
import type { StoredDeviceCredential } from "@/src/app/type/device.type";

/* -------------------------------------- Types -------------------------------------- */

// Type location จำลองที่จำว่าถูกสั่ง replace ไปที่ไหน
type FakeLocation = { pathname: string; origin: string; replaced: string[]; replace: (path: string) => void };

// Type response จำลองของ fetch
type FakeResponse = { status: number; body?: unknown; headers?: Record<string, string>; stream?: string };

/* -------------------------------------- Config -------------------------------------- */

// Config credential ของตู้ทดสอบ
const TEST_CREDENTIAL: StoredDeviceCredential = {
    deviceId: "kiosk-1",
    deviceToken: "token-1",
    deviceType: "kiosk",
    deviceName: "Kiosk 1",
    location: null,
    status: "active",
    gateId: null,
    direction: null,
    cameraIds: [],
    printerIds: [],
};

/* -------------------------------------- Helpers -------------------------------------- */

// Function สร้าง Storage ในหน่วยความจำ
function createStorage(): Storage {
    const values = new Map<string, string>();
    return {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => [...values.keys()][index] ?? null,
        removeItem: (key) => void values.delete(key),
        setItem: (key, value) => void values.set(key, String(value)),
    };
}

// Function ตั้ง property ของ globalThis ให้เขียนทับได้ใน test ถัดไป
function setGlobal(name: string, value: unknown): void {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

/* -------------------------------------- Functions -------------------------------------- */

// Function จำลอง browser (window = globalThis, location, localStorage, sessionStorage) และตั้ง timer จำลอง พร้อม credential ของตู้
function setupBrowser(pathname = "/landing/dashboard"): FakeLocation {
    const location: FakeLocation = {
        pathname,
        origin: "https://kiosk.test",
        replaced: [],
        replace(path) {
            this.replaced.push(path);
            this.pathname = path.split("?")[0] ?? path;
        },
    };

    setGlobal("window", globalThis);
    setGlobal("location", location);
    setGlobal("localStorage", createStorage());
    setGlobal("sessionStorage", createStorage());

    // heartbeat / SSE log warning ทุกครั้งที่ล้มเหลว ซึ่งเป็นกรณีที่ test ตั้งใจ
    mock.method(console, "warn", () => undefined);
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"], now: Date.parse("2026-01-01T00:00:00Z") });
    clearDeviceAuthPause();
    saveDeviceCredential(TEST_CREDENTIAL);
    return location;
}

// Function คืนค่า timer จริงและล้าง mock หลังจบแต่ละ test
function teardownBrowser(): void {
    clearDeviceAuthPause();
    mock.timers.reset();
    mock.restoreAll();
}

// Function แทน fetch ด้วย response ตามลำดับ (ครั้งเกินจำนวนใช้ตัวสุดท้าย) คืน mock ไว้นับจำนวนครั้งที่เรียก
function mockFetch(...responses: FakeResponse[]) {
    let index = 0;
    const fetchMock = mock.fn(async (): Promise<Response> => {
        const next = responses[Math.min(index, responses.length - 1)]!;
        index += 1;
        if (next.stream !== undefined) {
            return new Response(next.stream, { status: next.status, headers: { "Content-Type": "text/event-stream", ...next.headers } });
        }
        return new Response(next.body === undefined ? null : JSON.stringify(next.body), { status: next.status, headers: { "Content-Type": "application/json", ...next.headers } });
    });
    setGlobal("fetch", fetchMock);
    return fetchMock;
}

// Function รอให้ promise ที่ค้างอยู่ทำงานจนจบ (setImmediate ไม่ถูก mock)
async function flushPromises(): Promise<void> {
    for (let round = 0; round < 10; round += 1) {
        await new Promise((resolve) => setImmediate(resolve));
    }
}

// Function เลื่อนเวลาจำลองแล้วรอ promise ที่เกิดจาก timer
async function advance(ms: number): Promise<void> {
    mock.timers.tick(ms);
    await flushPromises();
}

export { TEST_CREDENTIAL, advance, flushPromises, mockFetch, setupBrowser, teardownBrowser };
export type { FakeLocation };
