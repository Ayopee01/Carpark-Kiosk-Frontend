// Import Library
import { isValid } from "date-fns";

// Function แปลงวันเวลาจาก Backend เป็น Date (ค่าว่างหรือผิดรูปแบบคืน null)
function toValidDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    const date = new Date(value);
    return isValid(date) ? date : null;
}

export { toValidDate };
