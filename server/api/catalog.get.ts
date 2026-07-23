import { getForestCatalog } from "~~/src/lib/moyu-content";
import { shuffleFishOrder } from "~~/src/lib/fish-order";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const catalog = await getForestCatalog();
  return { ...catalog, fishes: shuffleFishOrder(catalog.fishes) };
});
