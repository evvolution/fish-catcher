import ForestClient from "@/app/forest/forest-client";
import { getForestCatalog } from "@/lib/gap-content";

export const dynamic = "force-dynamic";

export default async function Page() {
  const catalog = await getForestCatalog();

  return <ForestClient catalog={catalog} />;
}
