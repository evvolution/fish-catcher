export default defineNuxtConfig({
  compatibilityDate: "2026-07-21",
  devtools: { enabled: false },
  css: ["~/assets/css/global.css"],
  runtimeConfig: {
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL ?? "https://fish.nefelibata.ink",
      assetBaseUrl: process.env.NUXT_PUBLIC_ASSET_BASE_URL ?? "https://apex-res.nefelibata.ink/fish",
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      title: "摸鱼",
      meta: [
        { name: "description", content: "把碎片时间轻轻收好。" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
        { name: "theme-color", content: "#152b31" },
        { name: "referrer", content: "strict-origin-when-cross-origin" },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
});
