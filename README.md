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
| `NEXT_PUBLIC_API_BASE_URL` | browser (ฝังตอน build) | origin ของ Backend เช่น `https://carpark-uat.biza.me` (ไม่ต้องใส่ `/api` และไม่มี `/` ปิดท้าย) Browser เรียก `<NEXT_PUBLIC_API_BASE_URL>/api/client/*` ตรง และ Payment WebSocket ใช้ `wss://<host>/api/client/payments/ws` เปลี่ยนค่าแล้วต้อง build ใหม่ |
| `NEXT_PUBLIC_ENABLE_PAYMENT_TEST` | browser | `true` = แสดงปุ่ม Dev Test (`POST /api/client/payments/test`) เฉพาะ `next dev` เท่านั้น production build ปิดเสมอ (backend ต้องเปิด `ENABLE_PAYMENT_SIMULATION` ด้วย) |

Browser เรียก Backend ตรงทั้งหมด (REST, SSE, Payment WebSocket, รูป QR และ logo) ไม่มี Next.js API route

Backend ต้องใส่ origin ที่เปิดแอปนี้ (Kiosk / Barrier Gate / Mobile) ใน `CLIENT_ORIGINS` เช่น `https://kiosk.example.com` ไม่งั้นได้ `403 CORS_NOT_ALLOWED`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
