import { getForestCatalog } from "~~/src/lib/moyu-content";
import { shuffleFishOrder } from "~~/src/lib/fish-order";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const catalog = await getForestCatalog();
  return {
    ok: true,
    apiVersion: 1,
    serverTime: new Date().toISOString(),
    assetBaseUrl: process.env.NUXT_PUBLIC_ASSET_BASE_URL ?? "https://apex-res.nefelibata.ink/fish",
    catalog: { ...catalog, fishes: shuffleFishOrder(catalog.fishes) },
  };
});
