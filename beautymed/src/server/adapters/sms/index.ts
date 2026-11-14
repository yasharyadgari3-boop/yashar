import "server-only";
import { mocksAllowed } from "@/server/env";
import { MockSmsProvider } from "./mock";
import type { SmsProvider } from "./types";

let provider: SmsProvider | undefined;

export function smsProviderName(): string {
  return process.env.SMS_PROVIDER || "mock";
}

export function isMockSms(): boolean {
  return smsProviderName() === "mock" && mocksAllowed();
}

export function getSmsProvider(): SmsProvider {
  if (provider) return provider;
  const name = smsProviderName();
  if (name === "mock") {
    if (!mocksAllowed()) throw new Error("The mock SMS provider is disabled in production. Configure SMS_PROVIDER.");
    provider = new MockSmsProvider();
    return provider;
  }
  throw new Error(`SMS provider "${name}" is not implemented yet.`);
}

export type { SmsProvider } from "./types";
