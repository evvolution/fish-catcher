import { getForestCatalog } from "~~/src/lib/moyu-content";
import { shuffleFishOrder } from "~~/src/lib/fish-order";

export default defineEventHandler(async () => {
  const catalog = await getForestCatalog();
  return { ...catalog, fishes: shuffleFishOrder(catalog.fishes) };
});
