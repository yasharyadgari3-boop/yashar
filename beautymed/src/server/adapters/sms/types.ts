/** [SMS_PROVIDER]: implement this interface for the real provider and select it in ./index.ts. */
export interface SmsProvider {
  readonly name: string;
  sendOtp(mobile: string, code: string): Promise<void>;
}
