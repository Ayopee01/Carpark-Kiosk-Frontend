/* -------------------------------------- Config -------------------------------------- */

// Config ความยาวขั้นต่ำของทะเบียนที่ GET /client/transactions รับ
const MIN_PLATE_NO_LENGTH = 4;

/* -------------------------------------- Functions -------------------------------------- */

// Function ตัดช่องว่างและทำตัวอักษรอังกฤษของทะเบียนเป็นตัวใหญ่
function normalizePlateNo(value: string): string {
    return value.trim().replace(/\s+/g, "").toUpperCase();
}

// Function ตรวจว่าทะเบียนยาวถึง MIN_PLATE_NO_LENGTH
function isValidPlateNo(value: string): boolean {
    return normalizePlateNo(value).length >= MIN_PLATE_NO_LENGTH;
}

export { MIN_PLATE_NO_LENGTH, isValidPlateNo, normalizePlateNo };
