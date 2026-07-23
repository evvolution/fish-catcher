import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (process.platform !== "darwin") {
  throw new Error("DMG 只能在 macOS 上构建；H5、App 和小程序构建不受影响。");
}

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const h5Root = path.join(appRoot, "dist", "build", "h5");
const outputRoot = path.join(appRoot, "dist", "macos");
const appBundle = path.join(outputRoot, "摸鱼.app");
const contents = path.join(appBundle, "Contents");
const macosDir = path.join(contents, "MacOS");
const resourcesDir = path.join(contents, "Resources");
const dmgPath = path.join(outputRoot, "Moyu-0.1.0.dmg");

if (!existsSync(path.join(h5Root, "index.html"))) {
  throw new Error(`没有找到 H5 构建产物：${h5Root}`);
}

// ponytail: 桌面端只需要系统 WKWebView；若以后要托盘、自动更新或多窗口，再升级到 Tauri。
rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(macosDir, { recursive: true });
mkdirSync(resourcesDir, { recursive: true });
cpSync(h5Root, path.join(resourcesDir, "www"), { recursive: true });
cpSync(path.join(appRoot, "desktop", "macos", "Info.plist"), path.join(contents, "Info.plist"));

execFileSync("swiftc", [
  path.join(appRoot, "desktop", "macos", "MoyuApp.swift"),
  "-O",
  "-framework", "Cocoa",
  "-framework", "WebKit",
  "-o", path.join(macosDir, "Moyu"),
], { stdio: "inherit" });
execFileSync("codesign", ["--force", "--deep", "--sign", "-", appBundle], { stdio: "inherit" });
execFileSync("hdiutil", [
  "create",
  "-volname", "摸鱼",
  "-srcfolder", appBundle,
  "-format", "UDZO",
  "-ov",
  dmgPath,
], { stdio: "inherit" });

console.log(`DMG 已生成：${dmgPath}`);
