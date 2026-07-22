import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = join(root, "android", "app", "src", "main", "assets", "www");
const read = (path) => readFileSync(join(root, path), "utf8");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const version = JSON.parse(read("version.json"));
const html = read("index.html");
const app = read("app.js");
const updater = read("pwa-update.js");
const worker = read("service-worker.js");
const syncScript = read("scripts/sync-web-assets.ps1");

check(version.version === "1.1.1", "version.json Web version must be 1.1.1");
check(html.includes(`<meta name="meh-build" content="${version.build}"`), "index build meta differs from version.json");
check(worker.includes(`const SW_VERSION = "${version.build}"`), "Service Worker version differs from version.json");
check(worker.includes("meh-shell-${SW_VERSION}") && worker.includes("meh-runtime-${SW_VERSION}"), "Meh cache names must include SW_VERSION");

for (const asset of ["style.css", "app.js", "pwa-update.js"]) {
  check(html.includes(`./${asset}?v=${version.build}`), `${asset} does not use the current build query`);
}
check(read("style.css").includes(`material-symbols-rounded.woff2?v=${version.build}`), "font URL build differs");
for (const manifest of ["manifest.webmanifest", "manifest-meh.webmanifest", "manifest-zh.webmanifest"]) {
  const parsed = JSON.parse(read(manifest));
  check(parsed.start_url.includes(`v=${version.build}`), `${manifest} start_url build differs`);
  check(parsed.icons.every((icon) => icon.src.includes(`v=${version.build}`)), `${manifest} icon build differs`);
}

const appShell = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/)?.[1] || "";
check(!appShell.includes("version.json"), "version.json must not be in APP_SHELL");
check(worker.includes('url.pathname.endsWith("/version.json")'), "Service Worker lacks version.json network-only routing");
check(worker.includes('cache: "no-store"'), "version.json request must use cache: no-store");
check(worker.includes('type === "SKIP_WAITING"'), "Service Worker lacks SKIP_WAITING handling");
check(worker.includes("self.clients.claim()"), "Service Worker lacks clients.claim");
check(worker.includes('key.startsWith("meh-")'), "activate must only delete Meh caches");

check(updater.includes('updateViaCache: "none"'), "frontend registration lacks updateViaCache: none");
check(updater.includes('location.hostname === "appassets.androidplatform.net"'), "Android WebView asset host is not excluded");
check(updater.includes("registration.update()"), "frontend lacks registration.update()");
check(updater.includes('addEventListener("updatefound"'), "frontend lacks updatefound handling");
check(updater.includes('addEventListener("controllerchange"'), "frontend lacks controllerchange handling");
check(updater.includes("RELOAD_GUARD_KEY") && updater.includes("sessionStorage.setItem"), "frontend lacks reload loop protection");
check(updater.includes('addEventListener("online"'), "frontend lacks online update check");
check(updater.includes("30 * 60 * 1000") && updater.includes("5 * 60 * 1000"), "periodic interval or throttle is missing");

const registrationCount = [app, updater].reduce(
  (count, source) => count + (source.match(/serviceWorker\s*\.\s*register\s*\(/g) || []).length,
  0
);
check(registrationCount === 1, `expected one Service Worker registration, found ${registrationCount}`);

for (const forbidden of [
  "localStorage.clear(",
  "sessionStorage.clear(",
  "indexedDB.deleteDatabase(",
]) {
  check(![app, updater, worker].some((source) => source.includes(forbidden)), `forbidden data deletion found: ${forbidden}`);
}
for (const key of [
  "meh-shell-state-v1",
  "meh-wheel-presets-v1",
  "meh-number-settings-v1",
  "meh-app-settings-v2",
  "meh-wallpapers-db",
]) {
  check(app.includes(key), `preserved data key missing: ${key}`);
}

const sharedFiles = [
  "index.html", "app.js", "style.css", "pwa-update.js", "service-worker.js", "version.json",
  "manifest.webmanifest", "manifest-meh.webmanifest", "manifest-zh.webmanifest", "favicon.ico",
];
const walk = (directory) => readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path.replaceAll("\\", "/")];
});
sharedFiles.push(...walk("fonts"), ...walk("icons"));

const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
for (const path of sharedFiles) {
  const source = join(root, path);
  const target = join(androidRoot, path);
  check(existsSync(target), `Android asset missing: ${path}`);
  if (existsSync(target)) check(digest(source) === digest(target), `Android asset differs: ${path}`);
}
check(syncScript.includes('"pwa-update.js"') && syncScript.includes('"version.json"'), "sync script lacks new PWA files");

for (const file of ["app.js", "pwa-update.js", "service-worker.js", "scripts/check-pwa-update.mjs", "scripts/test-pwa-update.mjs"]) {
  try {
    execFileSync(process.execPath, ["--check", join(root, file)], { stdio: "pipe" });
  } catch (error) {
    failures.push(`${file} has invalid JavaScript syntax: ${error.stderr?.toString().trim() || error.message}`);
  }
}

const gradle = read("android/app/build.gradle.kts");
check(gradle.includes("versionCode = 2"), "Android versionCode changed");
check(gradle.includes('versionName = "1.1.1"'), "Android versionName changed");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`PWA update checks passed for ${version.build} (${sharedFiles.length} synchronized assets).`);
