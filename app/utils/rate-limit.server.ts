type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertRateLimit(key: string, limit = 120, windowMs = 60_000) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    throw new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        "retry-after": Math.ceil((existing.resetAt - now) / 1000).toString(),
      },
    });
  }
}

export function requestIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
