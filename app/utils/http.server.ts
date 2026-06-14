export function badRequest(message: string, details?: unknown) {
  return Response.json({ ok: false, message, details }, { status: 400 });
}

export function notFound(message = "Not found") {
  return Response.json({ ok: false, message }, { status: 404 });
}

export function forbidden(message = "Forbidden") {
  return Response.json({ ok: false, message }, { status: 403 });
}

export function created<T>(payload: T) {
  return Response.json({ ok: true, ...payload }, { status: 201 });
}

export function ok<T>(payload: T, init?: ResponseInit) {
  return Response.json({ ok: true, ...payload }, init);
}

export function storefrontJson<T>(payload: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", headers.get("cache-control") ?? "public, max-age=30, stale-while-revalidate=300");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "content-type");

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}
