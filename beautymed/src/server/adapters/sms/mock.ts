import type { SmsProvider } from "./types";

// Kept on globalThis so the last code survives hot reloads and is shared across server bundles.
const store = globalThis as unknown as { __bmMockOtp?: Map<string, string> };
const lastCodes = (store.__bmMockOtp ??= new Map<string, string>());

/** Development SMS: prints the code in the terminal and remembers it for the verify page. */
export class MockSmsProvider implements SmsProvider {
  readonly name = "mock";

  async sendOtp(mobile: string, code: string): Promise<void> {
    lastCodes.set(mobile, code);
    console.log(`[mock SMS] کد ورود برای ${mobile}: ${code}`);
  }
}

/** The last code "sent" to this number by the mock provider (never available with a real provider). */
export function peekMockOtp(mobile: string): string | undefined {
  return lastCodes.get(mobile);
}
