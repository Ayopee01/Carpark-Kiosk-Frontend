/* -------------------------------------- Common Types -------------------------------------- */

// Type วันเวลา ISO 8601 แบบ UTC เช่น "2026-10-01T03:00:00.000Z"
export type DateTimeString = string;
// Type วันที่ "YYYY-MM-DD" ตามเวลาไทย
export type DateString = string;
// Type เงินบาท ทศนิยมไม่เกิน 2 ตำแหน่ง
export type Baht = number;
// Type เงินสตางค์ของ Omise (integer) 4000 = 40.00 บาท
export type Satang = number;

// Type ประเภทรถ
export type VehicleType = "car" | "motorcycle";
// Type ทิศทางของไม้กั้น/กล้อง
export type Direction = "IN" | "OUT";
// Type สถานะรายการจอด
export type TransactionStatus = "pending" | "partially_paid" | "paid_waiting_exit" | "completed" | "cancelled";
// Type ช่องทางที่บันทึกการชำระเงิน
export type PaymentChannelCode = "cashier" | "kiosk" | "gate" | "mobile";
// Type รหัสวิธีชำระเงิน (Backend เพิ่ม method ใหม่ได้)
export type PaymentMethodId = "cash" | "qr" | "promptpay" | "card" | "mobile_banking" | "bank1" | "wallet" | "other" | (string & {});
// Type ประเภทอุปกรณ์ทั้งหมดในระบบ
export type DeviceType = "kiosk" | "barrier_gate" | "camera" | "printer" | "edc";
// Type สถานะอุปกรณ์
export type DeviceStatus = "pending_activation" | "active" | "offline" | "maintenance" | "inactive" | (string & {});

// Type รูปแบบ error ของทุกเส้น (code ใช้เขียน logic, message ใช้แสดงผล, details อยู่ระดับเดียวกัน)
export interface ApiErrorResponse {
    message: string;
    code: string;
    errors?: { field: string | null; message: string }[];
    [detail: string]: unknown;
}

/* -------------------------------------- Transaction Types -------------------------------------- */

// Type ช่วงชั่วโมงที่คิดเงินในหนึ่งวัน
export interface FeeRange {
    feeType: "base_hour" | "next_hour" | null;
    ruleId: string | null;
    hourStart: number;
    hourEnd: number;
    hours: number;
    pricePerHour: Baht;
    amount: Baht;
}

// Type รายละเอียดค่าจอดรายวันและค้างคืน
export interface FeeBreakdown {
    days: { date: DateString; hours: number; amount: Baht; ranges: FeeRange[] }[];
    overnight: { ruleId: string | null; nights: number; pricePerNight: Baht; amount: Baht } | null;
}

// Type ประวัติการชำระเงินหนึ่งครั้งของรายการจอด
export interface PaymentRecord {
    id: string;
    method: PaymentMethodId;
    channel: PaymentChannelCode;
    source: "kiosk" | "barrier_gate" | "mobile" | "admin";
    sourceContext: Record<string, unknown>;
    paidAmount: Baht;
    paidAt: DateTimeString;
    expiryAt: DateTimeString;
    processedBy: string;
    reference?: string;
    terminalId?: string;
    edcDeviceId?: string;
    deviceId?: string;
    deviceType?: string;
    deviceName?: string;
    deviceLocation?: string;
}

// Type รายการจอดแบบเต็มที่ response ของ EDC และ Dev Test ส่งกลับ (remainingAmount ใช้เสมอ ห้ามคำนวณเอง)
export interface Transaction {
    id: string;
    billNo: string;
    plateNo: string;
    vehicleType: VehicleType;
    entryAt: DateTimeString | null;
    exitAt: DateTimeString | null;
    calculatedAt: DateTimeString;
    exitTimeLimit: DateTimeString | null;
    isOverstay: boolean;
    status: TransactionStatus;
    baseAmount: Baht;
    netAmount: Baht;
    totalPaid: Baht;
    remainingAmount: Baht;
    serviceDisplay: string;
    durationHour: number;
    totalMinutes: number;
    feeBreakdown: FeeBreakdown;
    payments: PaymentRecord[];
    qrData: string;
    createdAt: DateTimeString;
    updatedAt: DateTimeString;
}

// Type รถหนึ่งคันในผลค้นหาที่ทะเบียนตรงหลายคัน
export interface PlateCandidate {
    plateNo: string;
    billNo: string;
    vehicleType: VehicleType;
    status: TransactionStatus;
    entryAt: DateTimeString | null;
    exitAt: DateTimeString | null;
    exitTimeLimit: DateTimeString | null;
}

// Type ผลค้นหาด้วยทะเบียนที่ตรงหลายคัน (ให้เลือกแล้วค้นใหม่ด้วยทะเบียนเต็ม)
export interface PlateLookupMultiple {
    matchType: "multiple";
    requiresSelection: true;
    query: string;
    candidates: PlateCandidate[];
}

/* -------------------------------------- Device Types -------------------------------------- */

// Type อุปกรณ์ที่ response ของ heartbeat ส่งกลับ
export interface Device {
    id: string;
    deviceId: string | null;
    deviceCode: string;
    deviceName: string;
    deviceType: DeviceType;
    connectionType: string;
    ipAddress: string | null;
    location: string | null;
    status: DeviceStatus;
    isOnline: boolean;
    note: string;
    lastSeen?: DateTimeString | null;
    activatedAt?: DateTimeString;
    deviceTokenIssuedAt?: DateTimeString | null;
    activationCode?: string | null;
    activationExpiresAt?: DateTimeString | null;
    allowedIps?: string[];
    gateId?: string | null;
    direction?: Direction | null;
    cameraIds?: string[];
    printerIds?: string[];
    edcDeviceId?: string | null;
    cameraRole?: string | null;
    printerRole?: string | null;
    terminalId?: string;
    merchantId?: string | null;
    provider?: string | null;
    serialNo?: string | null;
    usage?: "cashier" | "device";
}

/* -------------------------------------- Omise Charge Types -------------------------------------- */

// Type QR PromptPay ที่สร้างแล้ว (amount เป็นสตางค์, reused = ได้ QR เดิมที่ยังสแกนได้)
export interface OmiseChargeResponse {
    provider: "omise";
    reused: boolean;
    chargeId: string;
    status: "pending" | "successful" | "failed" | "expired" | "reversed" | (string & {});
    amount: Satang;
    currency: string;
    plateNo: string;
    method: PaymentMethodId;
    channel: PaymentChannelCode;
    authorizeUri: string | null;
    expiresAt: DateTimeString | null;
    transaction: { plateNo: string; status: TransactionStatus; remainingAmount: Baht; exitTimeLimit: DateTimeString | null };
    qr: Record<string, unknown> | null;
}

// Type เหตุผลที่ต้องคืนเงิน
export type RefundReason = "already_paid" | "transaction_not_payable" | "transaction_not_found" | "overpaid";

// Type charge ของ payment gateway ที่ส่งมากับ payment_updated
export interface GatewayCharge {
    id: string;
    provider: "omise";
    chargeId: string;
    transactionId: string;
    plateNo: string;
    amount: Satang;
    currency: string;
    method: PaymentMethodId;
    channel: PaymentChannelCode;
    status: string;
    paidAt: DateTimeString | null;
    processedAt: DateTimeString | null;
    raw?: Record<string, unknown> | null;
    refundAmount: Satang | null;
    refundReason: RefundReason | null;
    refundResolvedAt: DateTimeString | null;
    refundNote: string | null;
    refundResolvedBy: string | null;
    refundMethod: "manual" | null;
    refundId: string | null;
    createdAt: DateTimeString;
    updatedAt: DateTimeString;
}

/* -------------------------------------- Payment Method Types -------------------------------------- */

// Type วิธีชำระเงินที่ช่องทางนี้ใช้ได้
export interface AvailablePaymentMethod {
    id: PaymentMethodId;
    label: string;
    icon: string | null;
}

/* -------------------------------------- Client Types -------------------------------------- */

// Type อุปกรณ์ที่ส่ง request (null เมื่อเป็น Mobile)
export interface ClientDevice {
    deviceId: string;
    deviceType: "kiosk" | "barrier_gate";
    deviceName: string;
    deviceLocation: string | null;
    status: DeviceStatus;
}

// Type ช่องทางที่ Backend แยกจากการมีหรือไม่มี deviceId
export type ClientType = "kiosk" | "barrier_gate" | "mobile";

// Type รายการจอดที่ client ใช้แสดงยอดและชำระเงิน
export interface ClientTransaction {
    transactionId: string;
    billNo: string;
    plateNo: string;
    vehicleType: VehicleType;
    entryAt: DateTimeString | null;
    calculatedAt: DateTimeString;
    exitTimeLimit: DateTimeString | null;
    isOverstay: boolean;
    status: TransactionStatus;
    amount: { netAmount: Baht; paidAmount: Baht; remainingAmount: Baht };
    duration: { display: string; hours: number; totalMinutes: number };
    feeBreakdown: FeeBreakdown;
    qrData: string;
    clientType: ClientType;
    device: ClientDevice | null;
}

// Type theme ของ GET /client/config
export interface ClientTheme {
    systemName: string | null;
    themeColor: string | null;
    logoUrl: string | null;
    themeMode: string;
    customThemeColor: string | null;
    updatedAt: DateTimeString | null;
}

// Type response ของ GET /client/config
export interface ClientConfigResponse {
    theme: ClientTheme;
}

// Type body ของ POST /client/activate
export interface ActivateRequest {
    code: string;
}

// Type response ของ POST /client/activate (deviceToken แสดงครั้งเดียว, gateId ถึง printerIds เฉพาะ barrier_gate)
export interface ActivateResponse {
    success: true;
    message: string;
    deviceToken: string;
    deviceId: string;
    deviceType: "kiosk" | "barrier_gate";
    deviceName: string;
    location: string | null;
    status: DeviceStatus;
    gateId?: string | null;
    direction?: Direction | null;
    cameraIds?: string[];
    printerIds?: string[];
}

// Type body ของ POST /client/heartbeat
export interface HeartbeatRequest {
    name?: string;
    location?: string;
}

// Type response ของ POST /client/heartbeat
export interface HeartbeatResponse {
    message: string;
    deviceType: DeviceType;
    status: DeviceStatus;
    device: Device;
}

// Type ผลค้นหาที่ทะเบียนตรงหลายคันของ client
export type ClientPlateLookupMultiple = PlateLookupMultiple & { clientType: ClientType; device: ClientDevice | null };

// Type response ของ GET /client/transactions?plateNo=
export type ClientTransactionLookupResponse = ClientTransaction | ClientPlateLookupMultiple;

// Type response ของ GET /client/payments/methods (edc มีเฉพาะ Kiosk/Gate ที่ผูกเครื่อง EDC ที่ active)
export interface ClientPaymentMethodsResponse {
    channel: "kiosk" | "gate" | "mobile";
    methods: AvailablePaymentMethod[];
    edc: { deviceId: string; deviceName: string; terminalId: string } | null;
    clientType: ClientType;
}

// Type body ของ POST /client/payments/charges (plateNo ต้องเป็นทะเบียนเต็ม ห้ามส่ง amount และ token)
export interface CreateChargeRequest {
    plateNo: string;
    method: "promptpay";
    sourceType?: string;
    source?: string;
    returnUri?: string;
}

// Type response ของ POST /client/payments/charges
export interface CreateChargeResponse {
    message: string;
    clientType: ClientType;
    device: ClientDevice | null;
    charge: OmiseChargeResponse;
}

// Type body ของ POST /client/payments/edc (amount = บาทที่เครื่องตัดจริง, reference = เลขอนุมัติ, terminalId = TID)
export interface EdcPaymentRequest {
    transactionId?: string;
    plateNo?: string;
    amount: number | string;
    reference: string;
    terminalId: string;
}

// Type response ของ POST /client/payments/edc (duplicate = เคยบันทึก reference นี้แล้ว)
export interface EdcPaymentResponse {
    message: string;
    duplicate: boolean;
    transaction: Transaction;
    clientType: ClientType;
    device: ClientDevice;
}

// Type body ของ POST /client/payments/test (Dev Test)
export interface TestPaymentRequest {
    transactionId?: string;
    plateNo?: string;
    method?: PaymentMethodId;
}

// Type response ของ POST /client/payments/test
export interface TestPaymentResponse {
    message: string;
    transaction: Transaction;
    clientType: ClientType;
    device: ClientDevice | null;
}

/* -------------------------------------- Client Stream Types -------------------------------------- */

// Type event ping ของ SSE
export interface PingEvent {
    type: "ping";
    at: DateTimeString;
}

// Type event แรกหลังเปิด stream (pingIntervalMs = รอบ ping จริงของ server)
export interface ConnectedEvent {
    type: "connected";
    message: string;
    pingIntervalMs: number;
    clientType?: ClientType | "public";
}

// Type ผลตัดสินของไม้กั้นจาก event กล้อง
export type GateAction = "OPEN_GATE" | "PAYMENT_REQUIRED" | "TRANSACTION_NOT_FOUND" | "IGNORE_DUPLICATE" | "IGNORE_ACTIVE_TRANSACTION";

// Type event กล้องตรวจพบทะเบียน (เปิดไม้กั้นเมื่อ openGate === true เท่านั้น, success แค่บอกว่าประมวลผลสำเร็จ)
export interface LprDetectedEvent {
    type: "lpr_detected";
    success: boolean;
    openGate: boolean;
    action: GateAction | null;
    message: string | null;
    transactionId: string | null;
    plateNo: string;
    vehicleType: VehicleType;
    cameraId: string;
    gateId: string | null;
    direction: Direction;
    status: TransactionStatus | "not_found" | null;
    exitTimeLimit: DateTimeString | null;
    paymentRequired: boolean;
    reason: string | null;
    remainingAmount: Baht;
    netAmount: Baht;
    totalPaid: Baht;
    checkedAt: DateTimeString;
    capturedAt: DateTimeString;
    emittedAt: DateTimeString;
}

// Type event เมื่อ Admin แก้ theme
export interface ThemeUpdatedEvent {
    type: "theme_updated";
    theme: Record<string, unknown>;
}

// Type event เมื่อ Admin แก้วิธีชำระเงิน (ให้เรียก GET /client/payments/methods ใหม่)
export interface PaymentSettingsUpdatedEvent {
    type: "payment_settings_updated";
    at: DateTimeString;
}

// Type event เมื่อ token ของอุปกรณ์ถูกยกเลิก (ล้าง token แล้วไปหน้า activation)
export interface DeviceRevokedEvent {
    type: "device_revoked";
    reason: string;
    at: DateTimeString;
}

// Type event ทั้งหมดของ GET /client/events
export type ClientStreamEvent = ConnectedEvent | PingEvent | ThemeUpdatedEvent | PaymentSettingsUpdatedEvent | DeviceRevokedEvent | LprDetectedEvent;

// Type query ของ GET /client/events (ตัวกรองของ lpr_detected)
export interface ClientEventsQuery {
    deviceId?: string;
    gateId?: string;
    direction?: Direction;
    cameraId?: string;
}

/* -------------------------------------- Payment Socket Types -------------------------------------- */

// Type ข้อความ subscribe ที่ client ส่งได้ (ไม่ต้องส่งเมื่อใส่ chargeId ใน URL แล้ว)
export interface PaymentSocketSubscribe {
    type: "subscribe";
    chargeId?: string;
    plateNo?: string;
}

// Type ผลการชำระเงินของ charge (applied = false แปลว่าเงินเข้าแต่ลงรายการไม่ได้, replayed = สถานะล่าสุดตอน subscribe)
export interface PaymentUpdatedEvent {
    type: "payment_updated";
    provider: "omise";
    chargeId: string;
    plateNo: string;
    transactionId?: string;
    paymentStatus: "successful" | "failed" | "expired" | "reversed" | "pending" | (string & {});
    transactionStatus?: TransactionStatus | null;
    remainingAmount?: Baht | null;
    exitTimeLimit?: DateTimeString | null;
    applied?: boolean;
    refundRequired?: boolean;
    refundAmount?: Satang | null;
    refundReason?: RefundReason | null;
    gatewayCharge: Omit<GatewayCharge, "raw">;
    replayed?: true;
    emittedAt: DateTimeString;
}

// Type ข้อความทั้งหมดที่ server ส่งทาง Payment WebSocket
export type PaymentSocketMessage =
    | { type: "connected"; message: string; subscribed: { plateNo: string | null; chargeId: string | null } }
    | { type: "subscribed" }
    | { type: "error"; message: string }
    | PaymentUpdatedEvent;

/* -------------------------------------- Next Route Types -------------------------------------- */

// Type method ที่ Browser ใช้เรียก Backend
export type ClientRequestMethod = "GET" | "POST";

// Type option ของการเรียก Backend จาก Browser
export interface ClientRequestOptions {
    method: ClientRequestMethod;
    query?: Record<string, string | undefined>;
    body?: unknown;
}
