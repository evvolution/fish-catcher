import { resolveAssetUrl } from "~~/src/lib/asset-url";

export function useAssetUrl() {
  const config = useRuntimeConfig();
  return (path: string) => resolveAssetUrl(String(config.public.assetBaseUrl), path);
}
