import ForestClient from "@/app/forest/forest-client";
import { getForestCatalog } from "@/lib/gap-content";
import { shuffleFishOrder } from "@/lib/fish-order";

export const dynamic = "force-dynamic";

export default async function Page() {
  const catalog = await getForestCatalog();

  return <ForestClient catalog={{ ...catalog, fishes: shuffleFishOrder(catalog.fishes) }} />;
}
