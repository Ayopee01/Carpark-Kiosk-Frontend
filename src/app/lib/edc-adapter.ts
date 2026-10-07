// Import Types
import type { EdcAdapter } from "@/src/app/type/payment.type";

/* -------------------------------------- Error Helpers -------------------------------------- */

// Class error เมื่อยังไม่ได้เชื่อมต่อเครื่อง EDC จริง
class EdcNotConnectedError extends Error {
    constructor() {
        super("EDC terminal is not connected");
        this.name = "EdcNotConnectedError";
    }
}

/* -------------------------------------- Config -------------------------------------- */

// Config adapter ของเครื่อง EDC ที่แจ้งว่าไม่ได้เชื่อมต่อ จนกว่าจะเปลี่ยนเป็น adapter ของเครื่องจริง
const edcAdapter: EdcAdapter = {
    async charge() {
        throw new EdcNotConnectedError();
    },
};

export { EdcNotConnectedError, edcAdapter };
