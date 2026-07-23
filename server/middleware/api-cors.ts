import { getHeader, getMethod, setResponseStatus } from "h3";

function allowedOrigins() {
  const configured = process.env.API_ALLOWED_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean);
  return new Set(configured?.length ? configured : [
    process.env.NUXT_PUBLIC_APP_URL ?? "https://fish.nefelibata.ink",
    "http://localhost:3000",
    "http://localhost:5173",
    "null",
  ]);
}

export default defineEventHandler((event) => {
  if (!event.path.startsWith("/api/")) return;
  const origin = getHeader(event, "origin");
  const allowed = allowedOrigins();
  const originAllowed = Boolean(origin && (allowed.has(origin) || allowed.has("*")));

  if (originAllowed && origin) {
    setResponseHeaders(event, {
      "Access-Control-Allow-Origin": allowed.has("*") ? "*" : origin,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    });
  }

  if (getMethod(event) !== "OPTIONS") return;
  if (origin && !originAllowed) {
    setResponseStatus(event, 403);
    return "Origin is not allowed.";
  }
  setResponseStatus(event, 204);
  return "";
});
