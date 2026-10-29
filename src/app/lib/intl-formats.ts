// Import Library
import type { Formats } from "next-intl";

// Config รูปแบบวันเวลาที่ใช้ร่วมกันทุกหน้า (timezone มาจาก LocaleProvider, ภาษาไทยใช้ปีพุทธศักราชตาม locale th)
const INTL_FORMATS = {
    dateTime: {
        // วันที่ + เวลา เช่น เวลาที่ต้องออกจากลานจอด
        dateTimeShort: { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false },
        // วันที่แบบตัวเลข + เวลา เช่น เวลาเข้าในรายการทะเบียนที่ตรงหลายคัน
        dateTimeNumeric: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false },
        // วันที่ + เวลาถึงวินาที เช่น เวลาที่กล้องจับภาพ
        dateTimeMedium: { dateStyle: "medium", timeStyle: "medium" },
        // วันที่อย่างเดียว
        dateShort: { day: "2-digit", month: "short", year: "numeric" },
        // เวลา HH:mm
        time: { hour: "2-digit", minute: "2-digit", hour12: false },
    },
} satisfies Formats;

export { INTL_FORMATS };
