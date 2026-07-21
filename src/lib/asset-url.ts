export const DEFAULT_ASSET_BASE_URL = "https://apex-res.nefelibata.ink/fish";

export function resolveAssetUrl(baseUrl: string, path: string) {
  const assetPath = path.trim();
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new Error(`Invalid OSS asset base URL: ${baseUrl}`);
  }
  const baseHref = base.href.replace(/\/+$/, "");
  if (assetPath.startsWith(`${baseHref}/assets/`)) return assetPath;
  if (!assetPath.startsWith("/assets/") || assetPath.split("/").includes("..")) {
    throw new Error(`Invalid OSS asset path: ${path}`);
  }
  return `${baseHref}${assetPath}`;
}
