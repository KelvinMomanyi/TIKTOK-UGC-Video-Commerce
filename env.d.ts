/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    SHOPIFY_API_KEY?: string;
    SHOPIFY_API_SECRET?: string;
    SHOPIFY_APP_URL?: string;
    SCOPES?: string;
    SHOP_CUSTOM_DOMAIN?: string;
    SHOPIFY_BILLING_TEST_MODE?: "true" | "false";
    VIDEO_PROVIDER?: "mux" | "cloudflare";
    MUX_TOKEN_ID?: string;
    MUX_TOKEN_SECRET?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_STREAM_TOKEN?: string;
    AI_PROVIDER?: "local" | "openai";
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    ANALYTICS_SALT?: string;
  }
}
