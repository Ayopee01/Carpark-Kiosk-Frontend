// Import Library
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

/* -------------------------------------- Config -------------------------------------- */

// Config root ของ repo (alias "@/..." ใน tsconfig ชี้มาที่นี่)
const ROOT = new URL("../../", import.meta.url);
// Config นามสกุลที่ลองต่อท้ายเมื่อ import ไม่ระบุนามสกุล (Node รัน .ts ได้เอง แต่ไม่รองรับ .tsx)
const EXTENSIONS = [".ts", "/index.ts", ""];

/* -------------------------------------- Functions -------------------------------------- */

// ให้ node --test resolve "@/src/..." แบบเดียวกับ Next.js (ใช้ผ่าน node --import ./test/support/register.mjs)
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

        const base = fileURLToPath(new URL(specifier.slice(2), ROOT));
        const match = EXTENSIONS.map((extension) => `${base}${extension}`).find((path) => existsSync(path));
        return nextResolve(match ? pathToFileURL(match).href : specifier, context);
    },
});
