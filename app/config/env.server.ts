const optional = (key: string) => process.env[key]?.trim() || undefined;

export const env = {
  nodeEnv: optional("NODE_ENV") ?? "development",
  shopifyAppUrl: optional("SHOPIFY_APP_URL") ?? "",
  shopifyApiKey: optional("SHOPIFY_API_KEY") ?? "",
  shopifyApiSecret: optional("SHOPIFY_API_SECRET") ?? "",
  scopes: optional("SCOPES") ?? "",
  databaseUrl: optional("DATABASE_URL"),
  videoProvider: optional("VIDEO_PROVIDER") ?? "mux",
  muxTokenId: optional("MUX_TOKEN_ID"),
  muxTokenSecret: optional("MUX_TOKEN_SECRET"),
  cloudflareAccountId: optional("CLOUDFLARE_ACCOUNT_ID"),
  cloudflareStreamToken: optional("CLOUDFLARE_STREAM_TOKEN"),
  aiProvider: optional("AI_PROVIDER") ?? "local",
  openAiApiKey: optional("OPENAI_API_KEY"),
  openAiModel: optional("OPENAI_MODEL") ?? "gpt-4.1-mini",
  billingTestMode:
    optional("SHOPIFY_BILLING_TEST_MODE") !== "false" &&
    optional("NODE_ENV") !== "production",
  analyticsSalt: optional("ANALYTICS_SALT") ?? optional("SHOPIFY_API_SECRET") ?? "",
};

export function requireEnv(key: keyof typeof env) {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }

  return value;
}

export function appUrl(path = "") {
  const base = env.shopifyAppUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
