import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { ShopifyProductSearchResult } from "../services/shopify/products.server";

type ProductSearchData = {
  ok: boolean;
  products: ShopifyProductSearchResult[];
};

export function ProductSearch({
  onSelect,
}: {
  onSelect: (product: ShopifyProductSearchResult, variantId?: string) => void;
}) {
  const fetcher = useFetcher<ProductSearchData>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (query.trim().length >= 2) {
        fetcher.load(`/app/products/search?q=${encodeURIComponent(query)}`);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="tvc-stack">
      <label className="tvc-label">
        Product search
        <input
          className="tvc-input"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search products by title or SKU"
        />
      </label>
      <div className="tvc-stack">
        {fetcher.data?.products?.map((product) => (
          <button
            className="tvc-card"
            key={product.id}
            type="button"
            onClick={() => onSelect(product, product.variants[0]?.id)}
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <div className="tvc-card__body tvc-row">
              <div className="tvc-row" style={{ justifyContent: "flex-start" }}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" width={44} height={44} style={{ borderRadius: 6, objectFit: "cover" }} />
                ) : null}
                <div>
                  <strong>{product.title}</strong>
                  <div className="tvc-muted">{product.handle}</div>
                </div>
              </div>
              <span className="tvc-badge">{product.variants[0]?.price ?? "No price"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
