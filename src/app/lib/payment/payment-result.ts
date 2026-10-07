// Import Types
import type { PaymentUpdatedEvent, Transaction } from "@/src/app/type/api.type";
import type { PaymentCompletion } from "@/src/app/type/payment.type";

// Function แปลง Transaction (response ของ EDC / Dev Test) เป็น PaymentCompletion
function completionFromTransaction(transaction: Transaction): PaymentCompletion {
    return {
        exitTimeLimit: transaction.exitTimeLimit,
        transactionStatus: transaction.status,
        remainingAmount: transaction.remainingAmount,
    };
}

// Function แปลง payment_updated ของ WebSocket เป็น PaymentCompletion
function completionFromPaymentEvent(event: PaymentUpdatedEvent): PaymentCompletion {
    return {
        exitTimeLimit: event.exitTimeLimit ?? null,
        transactionStatus: event.transactionStatus ?? null,
        remainingAmount: event.remainingAmount ?? null,
    };
}

export { completionFromPaymentEvent, completionFromTransaction };
