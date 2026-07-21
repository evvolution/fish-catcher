import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const deployPath = path.join(projectRoot, "deploy/deploy.sh");
const deploySource = fs.readFileSync(deployPath, "utf8");

execFileSync("bash", ["-n", deployPath]);
assert(fs.statSync(deployPath).mode & 0o111, "deploy/deploy.sh must be executable");

const stages = [
  "git clone --depth 1",
  "npm ci --include=dev",
  "npm run typecheck",
  "npm run build",
  "npm run prisma:migrate:deploy",
  "mv \"$source_dir/.output\"",
  "pm2 startOrReload",
  "pm2 save",
];
let previousStage = -1;
for (const stage of stages) {
  const stageIndex = deploySource.indexOf(stage);
  assert(stageIndex > previousStage, `deployment stage is missing or out of order: ${stage}`);
  previousStage = stageIndex;
}
for (const forbiddenCommand of ["reset --hard", "checkout --", "clean -fd"]) {
  assert(!deploySource.includes(forbiddenCommand), `deployment script contains destructive command: ${forbiddenCommand}`);
}
assert(deploySource.includes('"$runtime_parent"/.moyu-build.*) rm -rf -- "$temporary_root"'));
assert(deploySource.includes('rm -rf -- "$old_release"'));
assert(deploySource.includes('PRISMA_ENGINES_MIRROR="${PRISMA_ENGINES_MIRROR:-https://cdn.npmmirror.com/binaries/prisma}"'));

const require = createRequire(import.meta.url);
const ecosystemPath = path.join(projectRoot, "ecosystem.config.cjs");
const ecosystemSource = fs.readFileSync(ecosystemPath, "utf8");
const ecosystem = require(ecosystemPath);
const app = ecosystem.apps?.[0];
assert.equal(app?.name, "moyu");
assert.equal(app?.script, "current/.output/server/index.mjs");
assert.equal(app?.watch, false);
assert.equal(app?.env_production?.NODE_ENV, "production");
assert.equal(app?.env_production?.NITRO_HOST, "127.0.0.1");
assert(ecosystemSource.includes('NITRO_PORT: fileEnv.NITRO_PORT || "7667"'));

const nginxSource = fs.readFileSync(path.join(projectRoot, "deploy/nginx-location.conf"), "utf8");
assert(nginxSource.includes("proxy_pass http://127.0.0.1:7667;"));
assert(nginxSource.includes("proxy_set_header X-Forwarded-Proto $scheme;"));

console.log("server deployment: temporary shallow build, artifact-only runtime and PM2 proxy are valid");
