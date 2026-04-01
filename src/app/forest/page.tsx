import { getForestCatalog } from "@/lib/gap-content";
import ForestClient from "@/app/forest/forest-client";

export const dynamic = "force-dynamic";

export default async function ForestPage() {
  const catalog = await getForestCatalog();

  return <ForestClient catalog={catalog} />;
}
