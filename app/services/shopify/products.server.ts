type AdminContext = {
  graphql: (query: string, options?: Record<string, unknown>) => Promise<Response>;
};

export type ShopifyProductSearchResult = {
  id: string;
  title: string;
  handle: string;
  imageUrl?: string;
  onlineStoreUrl?: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    currencyCode?: string;
  }>;
};

export async function searchProducts(admin: AdminContext, query: string) {
  const response = await admin.graphql(
    `#graphql
      query ProductSearch($query: String!) {
        products(first: 10, query: $query, sortKey: RELEVANCE) {
          edges {
            node {
              id
              title
              handle
              onlineStoreUrl
              featuredImage {
                url(transform: { maxWidth: 240, maxHeight: 240, crop: CENTER })
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price
                  }
                }
              }
            }
          }
        }
      }
    `,
    { variables: { query: query ? `title:*${query}* OR sku:${query}` : "" } },
  );

  const json = (await response.json()) as {
    data?: {
      products?: {
        edges?: Array<{
          node: {
            id: string;
            title: string;
            handle: string;
            onlineStoreUrl?: string;
            featuredImage?: { url?: string };
            variants?: {
              edges?: Array<{
                node: { id: string; title: string; price: string };
              }>;
            };
          };
        }>;
      };
    };
  };

  return (
    json.data?.products?.edges?.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      imageUrl: node.featuredImage?.url,
      onlineStoreUrl: node.onlineStoreUrl,
      variants:
        node.variants?.edges?.map(({ node: variant }) => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
        })) ?? [],
    })) ?? []
  ) satisfies ShopifyProductSearchResult[];
}
