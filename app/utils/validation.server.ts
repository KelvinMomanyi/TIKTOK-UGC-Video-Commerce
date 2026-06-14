export type FieldErrors = Record<string, string>;

export function stringValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

export function optionalStringValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value.length > 0 ? value : undefined;
}

export function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = stringValue(formData, key);
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function booleanValue(formData: FormData, key: string, fallback = false) {
  const value = stringValue(formData, key);
  if (!value) return fallback;
  return ["1", "true", "on", "yes"].includes(value.toLowerCase());
}

export function requireFields(fields: Record<string, string | undefined | null>) {
  const errors: FieldErrors = {};

  for (const [key, value] of Object.entries(fields)) {
    if (!value || value.trim().length === 0) {
      errors[key] = "Required";
    }
  }

  return errors;
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isTikTokUrl(value: string) {
  if (!isHttpUrl(value)) return false;
  const hostname = new URL(value).hostname.replace(/^www\./, "");
  return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com");
}
