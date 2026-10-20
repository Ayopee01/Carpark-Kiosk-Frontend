// Import Lib
import { ApiClientError, DEVICE_AUTH_LIMIT_CODE, NETWORK_ERROR_CODE } from "@/src/app/lib/api/client-api";
// Import Types
import type { EdcSaveFailure } from "@/src/app/type/payment.type";

/* -------------------------------------- Config -------------------------------------- */

// Config code เมื่อผู้ให้บริการ EDC ไม่พบเลขอนุมัติ (402) Backend ไม่ได้บันทึกการจ่าย
const EDC_APPROVAL_REJECTED_CODE = "EDC_APPROVAL_REJECTED";

/* -------------------------------------- Functions -------------------------------------- */

// Function แยกผลของ POST /client/payments/edc ที่ไม่สำเร็จ หลังเครื่อง EDC อนุมัติแล้ว
// - retry: ไม่ถึง Backend หรือ Backend ล่ม ส่งซ้ำด้วย reference เดิมได้ (ได้ duplicate: true ถ้าเคยบันทึกแล้ว)
// - limited: ถูกพักการยืนยันตัวตน (429) ยังไม่ได้บันทึก ส่งซ้ำด้วย reference เดิมได้เมื่อครบเวลา
// - rejected: ผู้ให้บริการ EDC ไม่พบเลขอนุมัติ ไม่ได้บันทึกการจ่าย ต้องให้เจ้าหน้าที่ตรวจสอบ
// - void: Backend ปฏิเสธด้วยเหตุผลอื่น ต้องให้พนักงาน void ที่เครื่อง EDC
function classifyEdcSaveError(error: unknown): EdcSaveFailure {
    if (!(error instanceof ApiClientError) || error.code === NETWORK_ERROR_CODE || error.status >= 500) return "retry";
    if (error.code === DEVICE_AUTH_LIMIT_CODE) return "limited";
    if (error.code === EDC_APPROVAL_REJECTED_CODE) return "rejected";
    return "void";
}

export { EDC_APPROVAL_REJECTED_CODE, classifyEdcSaveError };
