import { createHash, randomUUID } from "node:crypto";
import { env } from "../config/env.server";

export function anonymousHash(value?: string | null) {
  if (!value) return undefined;
  return createHash("sha256")
    .update(env.analyticsSalt)
    .update(":")
    .update(value)
    .digest("hex");
}

export function randomToken() {
  return randomUUID().replace(/-/g, "");
}
