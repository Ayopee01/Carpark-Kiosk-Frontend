// Import Types
import type { Baht, ClientPaymentMethodsResponse, ClientTransaction, DateTimeString, TransactionStatus } from "./api.type";

/* -------------------------------------- Payment Result Types -------------------------------------- */

// Type ผลหลังชำระเงินสำเร็จที่หน้าจอใช้แสดง (ค่าจาก Backend ห้ามคำนวณยอดเอง)
export type PaymentCompletion = {
    exitTimeLimit: DateTimeString | null;
    transactionStatus: TransactionStatus | null;
    remainingAmount: Baht | null;
};

/* -------------------------------------- Payment Method Types -------------------------------------- */

// Type วิธีชำระที่ client รองรับ (promptpay = QR ผ่าน charges, card = บัตรผ่านเครื่อง EDC)
export type SupportedPaymentMethod = "promptpay" | "card";

// Type วิธีชำระที่แสดงบนหน้าจอ (label มาจาก Backend)
export type PaymentMethodOption = {
    id: SupportedPaymentMethod;
    label: string;
};

// Type ข้อมูลที่ hook usePaymentMethods คืนให้หน้าจอ
export type PaymentMethodsState = {
    methods: PaymentMethodOption[];
    edc: ClientPaymentMethodsResponse["edc"];
    loading: boolean;
    failed: boolean;
    reload: () => Promise<void>;
};

/* -------------------------------------- EDC Types -------------------------------------- */

// Type ผลอนุมัติจากเครื่อง EDC (amount = บาทที่ตัดจริง, reference = เลขอนุมัติ, terminalId = TID บนสลิป)
export type EdcApproval = {
    amount: Baht;
    reference: string;
    terminalId: string;
};

// Type hardware adapter ของเครื่อง EDC (charge throw เมื่อลูกค้ายกเลิกหรือเครื่องปฏิเสธ)
export type EdcAdapter = {
    charge: (request: { amount: Baht; terminalId: string }) => Promise<EdcApproval>;
};

// Type ขั้นตอนของ Popup EDC (retry = ส่งบันทึกซ้ำด้วย reference เดิมได้, void = ต้องให้พนักงาน void ที่เครื่อง)
export type EdcStep = "idle" | "card" | "saving" | "retry" | "void" | "failed";

/* -------------------------------------- Payment Component Types -------------------------------------- */

// Type ขั้นตอนของ Popup PromptPay
export type PaymentStep = "creating" | "waiting" | "successful" | "failed";

// Type props ของ Popup PromptPay
export type PaymentPopupProps = {
    open: boolean;
    onClose: () => void;
    transaction: ClientTransaction | null;
    onSuccess?: (result: PaymentCompletion) => void;
};

// Type props ของเนื้อหา Popup PromptPay ที่มี transaction แน่นอนแล้ว
export type PaymentPopupContentProps = Omit<PaymentPopupProps, "open" | "transaction"> & {
    transaction: ClientTransaction;
};

// Type props ของ Popup ชำระด้วยบัตร
export type EdcPaymentPopupProps = {
    open: boolean;
    onClose: () => void;
    transaction: ClientTransaction | null;
    edc: ClientPaymentMethodsResponse["edc"];
    onSuccess?: (result: PaymentCompletion) => void;
};

// Type props ของเนื้อหา Popup EDC ที่มี transaction และเครื่อง EDC แน่นอนแล้ว
export type EdcPaymentPopupContentProps = {
    onClose: () => void;
    onSuccess?: (result: PaymentCompletion) => void;
    transaction: ClientTransaction;
    edc: NonNullable<ClientPaymentMethodsResponse["edc"]>;
};

// Type props ของรายการวิธีชำระ (card = การ์ดของหน้า Detail, button = ปุ่มของหน้า Barrier Gate)
export type PaymentOptionsProps = {
    transaction: ClientTransaction | null;
    disabled: boolean;
    onSuccess: (result: PaymentCompletion) => void;
    variant: "card" | "button";
};
