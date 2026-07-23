export default defineEventHandler(() => ({
  ok: true,
  service: "moyu-backend",
  apiVersion: 1,
  uptimeSec: Math.floor(process.uptime()),
  serverTime: new Date().toISOString(),
}));
