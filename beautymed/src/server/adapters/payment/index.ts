import "server-only";
import { mocksAllowed } from "@/server/env";
import { randomToken } from "@/server/security";

/**
 * [PAYMENT_GATEWAY]: a Shaparak-connected gateway implements this interface.
 * Amounts are whole Toman. Calls are made outside database transactions.
 */
export interface PaymentGateway {
  readonly name: string;
  /** Ask the gateway for a payment; returns its reference and where to send the buyer. */
  startPayment(input: {
    orderNumber: string;
    amountToman: number;
    callbackUrl: string;
    description: string;
  }): Promise<{ authority: string; redirectUrl: string }>;
  /** Confirm with the gateway that the payment really succeeded. */
  verifyPayment(input: {
    authority: string;
    amountToman: number;
    /** Query parameters the gateway added when it sent the buyer back. */
    callbackParams: Record<string, string>;
  }): Promise<{ ok: true; refId: string } | { ok: false; reason: string }>;
}

/**
 * Development gateway: no money moves. The buyer is sent to /mock-gateway/[authority], where
 * they choose "pay" or "cancel"; the choice comes back as ?status=OK or ?status=NOK.
 */
export class MockPaymentGateway implements PaymentGateway {
  readonly name = "mock";

  async startPayment(): Promise<{ authority: string; redirectUrl: string }> {
    const authority = `mock_${randomToken(18)}`;
    return { authority, redirectUrl: `/mock-gateway/${authority}` };
  }

  async verifyPayment(input: {
    authority: string;
    callbackParams: Record<string, string>;
  }): Promise<{ ok: true; refId: string } | { ok: false; reason: string }> {
    if (!input.authority.startsWith("mock_")) return { ok: false, reason: "unknown authority" };
    if (input.callbackParams.status !== "OK") return { ok: false, reason: "cancelled by buyer" };
    return { ok: true, refId: `mock-ref-${input.authority.slice(5, 13)}` };
  }
}

let gateway: PaymentGateway | undefined;

export function paymentGatewayName(): string {
  return process.env.PAYMENT_GATEWAY || "mock";
}

export function isMockPayment(): boolean {
  return paymentGatewayName() === "mock" && mocksAllowed();
}

export function getPaymentGateway(): PaymentGateway {
  if (gateway) return gateway;
  const name = paymentGatewayName();
  if (name === "mock") {
    if (!mocksAllowed()) throw new Error("The mock payment gateway is disabled in production. Configure PAYMENT_GATEWAY.");
    gateway = new MockPaymentGateway();
    return gateway;
  }
  throw new Error(`Payment gateway "${name}" is not implemented yet.`);
}
