import "server-only";
import { prisma } from "@/server/db";

/**
 * Admin-editable settings with their defaults. Compliance rules live here so they can change
 * after the owner confirms the legal requirements, without a code change.
 */
export const settingDefaults = {
  /** Whether visitors (and unverified accounts) see prices. */
  visitorsSeePrices: false as boolean,
  /** Compliance fields a product must have before it can be published. */
  complianceRequiredFields: ["ircCode", "importerName", "authenticityDetails"] as string[],
  /** Before/after images need the patient-consent flag before they are shown. */
  beforeAfterRequiresConsent: true as boolean,
};

export type SettingKey = keyof typeof settingDefaults;
export type Settings = typeof settingDefaults;

function coerce<K extends SettingKey>(key: K, value: unknown): Settings[K] {
  const fallback = settingDefaults[key];
  if (typeof fallback === "boolean") return (typeof value === "boolean" ? value : fallback) as Settings[K];
  if (Array.isArray(fallback)) {
    return (Array.isArray(value) && value.every((v) => typeof v === "string") ? value : fallback) as Settings[K];
  }
  return fallback;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row ? coerce(key, row.value) : settingDefaults[key];
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
