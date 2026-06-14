import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { PageHeader } from "../components/ui/PageHeader";
import { ensureMerchant, updateMerchantSettings } from "../services/merchant.server";
import { badRequest } from "../utils/http.server";
import { booleanValue, optionalStringValue, stringValue } from "../utils/validation.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);

  return {
    merchant: {
      shop: merchant.shop,
      name: merchant.name,
      email: merchant.email,
      publicApiToken: merchant.publicApiToken,
      settings: merchant.settings as Record<string, unknown>,
      installedAt: merchant.installedAt.toISOString(),
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const formData = await request.formData();

  if (stringValue(formData, "intent") === "update_settings") {
    await updateMerchantSettings(merchant, {
      brandName: optionalStringValue(formData, "brandName"),
      defaultCurrency: stringValue(formData, "defaultCurrency", "USD"),
      enableAttribution: booleanValue(formData, "enableAttribution", true),
      enableAiRecommendations: booleanValue(formData, "enableAiRecommendations", true),
      storefrontTheme: stringValue(formData, "storefrontTheme", "auto"),
    });
    return redirect("/app/settings");
  }

  return badRequest("Unsupported settings action.");
};

export default function SettingsPage() {
  const { merchant } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const settings = merchant.settings ?? {};

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow="Settings"
          title="Workspace and storefront defaults"
          subtitle="These defaults are read by services and widgets without hard-coding merchant-specific behavior in route files."
        />

        <div className="tvc-grid tvc-grid--2">
          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Merchant</h2>
              <table className="tvc-table">
                <tbody>
                  <tr><td>Shop</td><td>{merchant.shop}</td></tr>
                  <tr><td>Name</td><td>{merchant.name ?? "Unknown"}</td></tr>
                  <tr><td>Email</td><td>{merchant.email ?? "Unknown"}</td></tr>
                  <tr><td>Installed</td><td>{new Date(merchant.installedAt).toLocaleDateString()}</td></tr>
                  <tr><td>Public API token</td><td><code>{merchant.publicApiToken}</code></td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Defaults</h2>
              <Form method="post" className="tvc-stack">
                <input type="hidden" name="intent" value="update_settings" />
                <label className="tvc-label">
                  Brand name
                  <input className="tvc-input" name="brandName" defaultValue={String(settings.brandName ?? merchant.name ?? "")} />
                </label>
                <label className="tvc-label">
                  Currency
                  <input className="tvc-input" name="defaultCurrency" defaultValue={String(settings.defaultCurrency ?? "USD")} />
                </label>
                <label className="tvc-label">
                  Storefront theme
                  <select className="tvc-select" name="storefrontTheme" defaultValue={String(settings.storefrontTheme ?? "auto")}>
                    <option value="auto">Auto</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
                <label className="tvc-row" style={{ justifyContent: "flex-start" }}>
                  <input type="checkbox" name="enableAttribution" defaultChecked={Boolean(settings.enableAttribution ?? true)} />
                  Enable storefront attribution
                </label>
                <label className="tvc-row" style={{ justifyContent: "flex-start" }}>
                  <input type="checkbox" name="enableAiRecommendations" defaultChecked={Boolean(settings.enableAiRecommendations ?? true)} />
                  Enable AI recommendations
                </label>
                <s-button variant="primary" type="submit" disabled={busy}>Save settings</s-button>
              </Form>
            </div>
          </section>
        </div>
      </div>
    </s-page>
  );
}
