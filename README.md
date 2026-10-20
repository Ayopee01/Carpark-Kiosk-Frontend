This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment

ตั้งค่าใน `.env.local` (ไฟล์ `.env*` ถูก ignore ไม่ commit)

| ตัวแปร | ใช้ที่ | ความหมาย |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | browser (ฝังตอน build) | origin ของ Backend เช่น `https://api.<domain>` หรือ `http://localhost:8080` ตอน dev (ไม่ต้องใส่ `/api` และไม่มี `/` ปิดท้าย) Browser เรียก `<NEXT_PUBLIC_API_BASE_URL>/api/client/*` ตรง และ Payment WebSocket ใช้ `wss://<host>/api/client/payments/ws` เปลี่ยนค่าแล้วต้อง build ใหม่ (ตั้งใน `.env` บน server ไม่มีผล เพราะ image ถูก build ใน CI) |
| `NEXT_PUBLIC_ENABLE_PAYMENT_TEST` | browser | `true` = แสดงปุ่ม Dev Test (`POST /api/client/payments/test`) เฉพาะ `next dev` เท่านั้น production build ปิดเสมอ (backend ต้องเปิด `ENABLE_PAYMENT_SIMULATION` ด้วย) |

Browser เรียก Backend เองทั้งหมด (REST, SSE, Payment WebSocket, รูป QR และ logo) ไม่มี Next.js API route และไม่ผ่าน server ของ Next (ไม่ใช่ BFF แบบ Admin) ส่ง device token ทาง header `x-device-id` / `x-device-token`

ทุกหน้ามี Content-Security-Policy (`next.config.ts`) ให้โหลด script, รูป และ request ได้เฉพาะโดเมนนี้และ origin ของ `NEXT_PUBLIC_API_BASE_URL` (รวม `wss://`) เพื่อไม่ให้ script แปลกปลอมส่ง device token ออกไปที่อื่น ถ้าตั้ง logo ของ theme เป็น URL ของโดเมนอื่น รูปจะไม่แสดง (logo ที่ upload ผ่าน Admin อยู่ที่ `<API>/uploads` ใช้ได้ปกติ)

Backend ต้องใส่ origin ที่เปิดแอปนี้ (Kiosk / Barrier Gate / Mobile) ใน `CLIENT_ORIGINS` เช่น `https://kiosk.example.com` (ตรงตัว ไม่มี `/` ปิดท้าย) ไม่งั้นได้ `403 CORS_NOT_ALLOWED`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## CI/CD

ใช้ Node 24 (`.nvmrc`) ตรวจก่อน push: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (test ใช้ `node:test` ของ Node 24 ไม่ต้องติดตั้งเพิ่ม ทดสอบเฉพาะไฟล์ `.ts` ใน `src/app/lib`)

| Workflow | เมื่อไหร่ | ทำอะไร |
| --- | --- | --- |
| `.github/workflows/ci.yml` job `check` | pull request และ push เข้า `main` | lint, typecheck, test, build |
| `.github/workflows/ci.yml` job `deploy` | push เข้า `main` หลัง `check` ผ่าน | build Docker image → push ไป GHCR → SSH เข้า server แล้ว `docker compose up` |
| `.github/dependabot.yml` | ทุกสัปดาห์ | เปิด PR อัปเดต npm, GitHub Actions และ Docker image (minor/patch รวม PR เดียว, major แยก PR) |

ยังไม่มี server: ไม่ต้องตั้งอะไร ถ้าไม่มี secret `DEPLOY_HOST` job `deploy` จะข้ามทุกขั้นตอนโดยไม่ fail ตั้ง secret ครบเมื่อไรจะ deploy เองโดยไม่ต้องแก้ workflow

image: `ghcr.io/ayopee01/carpark-kiosk-frontend:<commit sha>` (และ `:latest`)
`NEXT_PUBLIC_API_BASE_URL` ถูกฝังตอน build image ถ้าเปลี่ยนค่าต้อง deploy ใหม่ (แก้ Variable ใน GitHub แล้ว Re-run job deploy)

### ตั้งค่าครั้งแรก

**GitHub** (Settings → Environments → `production`)

| ชนิด | ชื่อ | ค่า |
| --- | --- | --- |
| Variable | `NEXT_PUBLIC_API_BASE_URL` | origin ของ API เช่น `https://api.<domain>` |
| Variable | `DEPLOY_PATH` | โฟลเดอร์บน server เช่น `/srv/smart-carpark/kiosk` (ห้ามซ้ำกับของ Admin) |
| Secret | `DEPLOY_HOST` | IP หรือ hostname ของ server |
| Secret | `DEPLOY_PORT` | port ของ SSH (ไม่ตั้ง = `22`) |
| Secret | `DEPLOY_USER` | user ที่ใช้ docker ได้ |
| Secret | `DEPLOY_SSH_KEY` | private key ของ user นั้น |

ใส่ Required reviewers ใน environment `production` ได้ถ้าต้องการให้มีคนกดอนุมัติก่อน deploy

**Server**

1. ติดตั้ง Docker และ Docker Compose v2.17 ขึ้นไป (ใช้ `--wait`)
2. สร้างโฟลเดอร์ตาม `DEPLOY_PATH` ให้ user ใน `DEPLOY_USER` เขียนได้
3. มี network `npm-network` ของ Nginx Proxy Manager อยู่แล้ว (เดียวกับ API)
4. Nginx Proxy Manager: Proxy Host ของโดเมน Kiosk → `smart-carpark-kiosk:3000` เปิด SSL (ไม่ต้องตั้ง location ของ API เพิ่ม browser เรียกโดเมน API ตรง)
5. ใส่โดเมน Kiosk ใน `CLIENT_ORIGINS` ของ Backend เช่น `CLIENT_ORIGINS=https://kiosk.<domain>` แล้ว restart Backend
6. Proxy Host ของโดเมน API ต้องรองรับ realtime: เปิด **Websockets Support** (Payment WebSocket) และใส่ในแท็บ Advanced `proxy_buffering off; proxy_read_timeout 120s;` (SSE ต้องส่งทันทีและค้างได้นานกว่า 2 รอบ ping)
7. ตรวจหลัง deploy: เปิดหน้า Kiosk แล้วดู DevTools → Network ว่า `https://api.<domain>/api/client/config` ได้ 200 ไม่ติด CORS และ Console ไม่มี error ของ Content-Security-Policy

workflow จะ copy `docker-compose.yml` ไปที่ `DEPLOY_PATH` ทุกครั้ง และ login GHCR ด้วย token ชั่วคราวของ job จึงไม่ต้องเก็บ token ไว้บน server

### เครื่องตู้ Kiosk / Barrier Gate

device token เก็บใน `localStorage` ของ browser ในตู้ ใครเปิด DevTools ได้ก็คัดลอก token ได้ จึงต้องล็อก browser ด้วย Chrome Enterprise policy:

| Policy | ค่า | เหตุผล |
| --- | --- | --- |
| เปิด Chrome ด้วย `--kiosk https://<โดเมน Kiosk>` | | เต็มจอ ไม่มีแถบ URL |
| `DeveloperToolsAvailability` | `2` | ปิด DevTools (กันคัดลอก token) |
| `URLBlocklist` / `URLAllowlist` | `*` / `https://<โดเมน Kiosk>`, `https://api.<domain>` | เปิดได้เฉพาะโดเมน Kiosk และ API ที่หน้าเว็บเรียก |
| `ExtensionInstallBlocklist` | `*` | ห้ามติดตั้ง extension |
| `PasswordManagerEnabled` | `false` | |
| `IncognitoModeAvailability` | `1` | ปิด Incognito (localStorage หายเมื่อปิดหน้าต่าง) |
| `BrowserSignin` | `0` | |

Windows ใช้ Assigned Access หรือ Shell Launcher ให้เครื่องเปิดได้แค่ Chrome และตั้ง `allowedIps` ของตู้ใน Admin ทุกเครื่อง (token ที่หลุดจะใช้จากที่อื่นไม่ได้)

### Rollback

image ทุกตัวมี tag เป็น commit sha บน server รัน:

```bash
cd $DEPLOY_PATH
cat .deployed-image                       # image ที่ deploy ล่าสุด
KIOSK_IMAGE=ghcr.io/ayopee01/carpark-kiosk-frontend:<sha เดิม> docker compose up -d --wait
```

ถ้า package บน GHCR เป็น private ต้อง `docker login ghcr.io` ด้วย token ที่มีสิทธิ์ `read:packages` ก่อน หรือเปิด run ของ CI ครั้งก่อนในแท็บ Actions แล้วกด Re-run all jobs (จะ deploy commit เดิม)
