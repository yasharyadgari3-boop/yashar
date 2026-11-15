import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/server/services/orders";

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * The payment gateway sends the buyer's browser back here. The payment is verified with the
 * gateway and applied once (see confirmPayment); the buyer then lands on their order page,
 * which itself requires them to be signed in as the order's owner.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const authority = (params.authority ?? params.Authority ?? "").slice(0, 200);
  try {
    const outcome = authority ? await confirmPayment(authority, params) : null;
    if (!outcome) return NextResponse.redirect(`${appUrl()}/orders`, 303);
    return NextResponse.redirect(`${appUrl()}/orders/${outcome.orderId}?payment=${outcome.paid ? "ok" : "failed"}`, 303);
  } catch (error) {
    console.error("Payment callback failed:", error);
    return NextResponse.redirect(`${appUrl()}/orders`, 303);
  }
}
