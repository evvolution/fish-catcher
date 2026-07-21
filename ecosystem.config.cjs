const path = require("node:path");
const fs = require("node:fs");
const { parseEnv } = require("node:util");

const envPath = path.join(__dirname, ".env");
const fileEnv = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, "utf8")) : {};

module.exports = {
  apps: [
    {
      name: "moyu",
      cwd: __dirname,
      script: "current/.output/server/index.mjs",
      exec_mode: "cluster",
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: "512M",
      restart_delay: 2_000,
      listen_timeout: 10_000,
      kill_timeout: 10_000,
      time: true,
      env_production: {
        ...fileEnv,
        NODE_ENV: "production",
        NITRO_HOST: fileEnv.NITRO_HOST || "127.0.0.1",
        NITRO_PORT: fileEnv.NITRO_PORT || "7667",
      },
    },
  ],
};
