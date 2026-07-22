import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = join(root, "android", "app", "src", "main", "assets", "www");
const read = (path) => readFileSync(join(root, path), "utf8");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

function decodePng(path) {
  const data = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (data.length < 33 || !data.subarray(0, 8).equals(signature)) throw new Error("invalid PNG signature");

  let offset = 8;
  let header = null;
  let sawEnd = false;
  const imageData = [];
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > data.length) throw new Error(`truncated ${type || "unknown"} chunk`);
    if (type === "IHDR") {
      if (length !== 13 || header) throw new Error("invalid IHDR chunk");
      header = {
        width: data.readUInt32BE(dataStart),
        height: data.readUInt32BE(dataStart + 4),
        bitDepth: data[dataStart + 8],
        colorType: data[dataStart + 9],
        compression: data[dataStart + 10],
        filter: data[dataStart + 11],
        interlace: data[dataStart + 12],
      };
    } else if (type === "IDAT") {
      imageData.push(data.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      sawEnd = true;
      break;
    }
    offset = dataEnd + 4;
  }

  if (!header?.width || !header?.height || !imageData.length || !sawEnd) throw new Error("incomplete PNG");
  if (header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) throw new Error("unsupported PNG encoding");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.colorType];
  if (!channels || ![1, 2, 4, 8, 16].includes(header.bitDepth)) throw new Error("unsupported PNG color format");
  const rowBytes = Math.ceil(header.width * channels * header.bitDepth / 8);
  const decoded = inflateSync(Buffer.concat(imageData));
  if (decoded.length !== (rowBytes + 1) * header.height) throw new Error("invalid decoded PNG data length");
  return { width: header.width, height: header.height };
}

function decodeIco(path) {
  const data = readFileSync(path);
  if (data.length < 22 || data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) throw new Error("invalid ICO header");
  const count = data.readUInt16LE(4);
  if (!count || data.length < 6 + count * 16) throw new Error("invalid ICO directory");
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    const length = data.readUInt32LE(entry + 8);
    const offset = data.readUInt32LE(entry + 12);
    if (!length || offset < 6 + count * 16 || offset + length > data.length) throw new Error("invalid ICO image entry");
  }
  return count;
}

const version = JSON.parse(read("version.json"));
const html = read("index.html");
const app = read("app.js");
const updater = read("pwa-update.js");
const worker = read("service-worker.js");
const syncScript = read("scripts/sync-web-assets.ps1");
const currentBuild = "1.1.1-pwa-r8";
const iconPath = `./icons/meh_icon.png?v=${currentBuild}`;
const expectedIcons = ["icon_monochrome.svg", "meh_background.svg", "meh_foreground.svg", "meh_icon.png"];

check(version.version === "1.1.1", "version.json Web version must be 1.1.1");
check(version.build === currentBuild, `version.json build must be ${currentBuild}`);
check(html.includes(`<meta name="meh-build" content="${currentBuild}"`), "index build meta differs from version.json");
check(worker.includes(`const SW_VERSION = "${currentBuild}"`), "Service Worker version differs from version.json");
check(worker.includes("meh-shell-${SW_VERSION}") && worker.includes("meh-runtime-${SW_VERSION}"), "Meh cache names must include SW_VERSION");
check(html.includes(`<span id="pwaBuildValue">${currentBuild}</span>`), "settings build label differs from version.json");

for (const asset of ["style.css", "app.js", "pwa-update.js"]) {
  check(html.includes(`./${asset}?v=${currentBuild}`), `${asset} does not use the current build query`);
}
check(read("style.css").includes(`material-symbols-rounded.woff2?v=${currentBuild}`), "font URL build differs");

const linkTags = html.match(/<link\b[^>]*>/gi) || [];
const regularFavicons = linkTags.filter((tag) => /\brel="icon"/i.test(tag));
const shortcutFavicons = linkTags.filter((tag) => /\brel="shortcut icon"/i.test(tag));
const appleIcons = linkTags.filter((tag) => /\brel="apple-touch-icon"/i.test(tag));
check(regularFavicons.length === 1, `expected one regular favicon link, found ${regularFavicons.length}`);
check(regularFavicons[0]?.includes(`href="./favicon.ico?v=${currentBuild}"`) && regularFavicons[0]?.includes('type="image/x-icon"'), "regular favicon must use root favicon.ico");
check(shortcutFavicons.length <= 1, `expected at most one shortcut favicon link, found ${shortcutFavicons.length}`);
check(shortcutFavicons.every((tag) => tag.includes(`href="./favicon.ico?v=${currentBuild}"`) && tag.includes('type="image/x-icon"')), "shortcut favicon must use root favicon.ico");
check(appleIcons.length === 1, `expected one apple-touch-icon link, found ${appleIcons.length}`);
check(appleIcons[0]?.includes(`href="${iconPath}"`), "apple-touch-icon must use icons/meh_icon.png");

let pngSize = null;
try {
  pngSize = decodePng(join(root, "icons", "meh_icon.png"));
} catch (error) {
  failures.push(`meh_icon.png cannot be decoded: ${error.message}`);
}
try {
  decodeIco(join(root, "favicon.ico"));
} catch (error) {
  failures.push(`favicon.ico cannot be read: ${error.message}`);
}
check(existsSync(join(root, "favicon.ico")), "favicon.ico is missing from the repository root");

for (const manifest of ["manifest.webmanifest", "manifest-meh.webmanifest", "manifest-zh.webmanifest"]) {
  const parsed = JSON.parse(read(manifest));
  check(parsed.start_url === `./index.html?v=${currentBuild}`, `${manifest} start_url build differs`);
  check(Array.isArray(parsed.icons) && parsed.icons.length === 1, `${manifest} must contain exactly one icon`);
  const icon = parsed.icons?.[0];
  check(icon?.src === iconPath, `${manifest} must use only icons/meh_icon.png`);
  check(icon?.sizes === `${pngSize?.width}x${pngSize?.height}`, `${manifest} icon size differs from the PNG dimensions`);
  check(icon?.type === "image/png" && icon?.purpose === "any", `${manifest} icon type or purpose is invalid`);
}
check(JSON.parse(read("manifest-zh.webmanifest")).name === "随便吧", "Chinese manifest name changed");
check(JSON.parse(read("manifest-meh.webmanifest")).name === "Meh", "non-Chinese manifest name changed");
check(JSON.parse(read("manifest.webmanifest")).name === "Meh", "fallback manifest name changed");

const appShell = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/)?.[1] || "";
check(!appShell.includes("version.json"), "version.json must not be in APP_SHELL");
check(worker.includes('url.pathname.endsWith("/version.json")'), "Service Worker lacks version.json network-only routing");
check(worker.includes('cache: "no-store"'), "version.json request must use cache: no-store");
check(worker.includes('type === "SKIP_WAITING"'), "Service Worker lacks SKIP_WAITING handling");
check(worker.includes("self.clients.claim()"), "Service Worker lacks clients.claim");
check(worker.includes('key.startsWith("meh-")'), "activate must only delete Meh caches");
check(worker.includes(`./favicon.ico?v=\${SW_VERSION}`), "Service Worker does not cache favicon.ico");
check(worker.includes(`./icons/meh_icon.png?v=\${SW_VERSION}`), "Service Worker does not cache meh_icon.png");

check(updater.includes('updateViaCache: "none"'), "frontend registration lacks updateViaCache: none");
check(updater.includes('location.hostname === "appassets.androidplatform.net"'), "Android WebView asset host is not excluded");
check(updater.includes("registration.update()"), "frontend lacks registration.update()");
check(updater.includes('addEventListener("updatefound"'), "frontend lacks updatefound handling");
check(updater.includes('addEventListener("controllerchange"'), "frontend lacks controllerchange handling");
check(updater.includes("RELOAD_GUARD_KEY") && updater.includes("sessionStorage.setItem"), "frontend lacks reload loop protection");
check(updater.includes("scheduleReloadFallback") && updater.includes("window.setTimeout"), "frontend lacks stalled-update reload fallback");
check(updater.includes('addEventListener("online"'), "frontend lacks online update check");
check(updater.includes("30 * 60 * 1000") && updater.includes("5 * 60 * 1000"), "periodic interval or throttle is missing");

const registrationCount = [app, updater].reduce(
  (count, source) => count + (source.match(/serviceWorker\s*\.\s*register\s*\(/g) || []).length,
  0
);
check(registrationCount === 1, `expected one Service Worker registration, found ${registrationCount}`);

for (const forbidden of ["localStorage.clear(", "sessionStorage.clear(", "indexedDB.deleteDatabase("]) {
  check(![app, updater, worker].some((source) => source.includes(forbidden)), `forbidden data deletion found: ${forbidden}`);
}
for (const key of ["meh-shell-state-v1", "meh-wheel-presets-v1", "meh-number-settings-v1", "meh-app-settings-v2", "meh-wallpapers-db"]) {
  check(app.includes(key), `preserved data key missing: ${key}`);
}

const removedIconNames = [
  ["apple", "touch", "icon", `${180}.png`].join("-"),
  `icon-${1024}.png`,
  `icon-${180}.png`,
  `icon-${192}.png`,
  `icon-${512}.png`,
  ["icon", "maskable", "192.png"].join("-"),
  ["icon", "maskable", "512.png"].join("-"),
];
for (const directory of [join(root, "icons"), join(androidRoot, "icons")]) {
  const actual = readdirSync(directory).sort();
  check(JSON.stringify(actual) === JSON.stringify(expectedIcons), `${directory} must contain only the approved icon files`);
  for (const removed of removedIconNames) check(!existsSync(join(directory, removed)), `removed icon still exists: ${join(directory, removed)}`);
}

const trackedAndUntracked = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter((path) => path && path !== "LICENSE.txt" && existsSync(join(root, path)));
for (const path of trackedAndUntracked) {
  const content = readFileSync(join(root, path)).toString("utf8");
  for (const removed of removedIconNames) check(!content.includes(removed), `obsolete icon reference found in ${path}: ${removed}`);
}

const productionBuildFiles = [
  "index.html", "style.css", "service-worker.js", "version.json",
  "manifest.webmanifest", "manifest-meh.webmanifest", "manifest-zh.webmanifest",
];
const oldBuild = "1.1.1-pwa-" + "r4";
for (const path of productionBuildFiles) check(!read(path).includes(oldBuild), `old PWA build remains in ${path}`);

const walk = (directory) => readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path.replaceAll("\\", "/")];
});
const sharedFiles = [
  "index.html", "app.js", "style.css", "pwa-update.js", "service-worker.js", "version.json",
  "manifest.webmanifest", "manifest-meh.webmanifest", "manifest-zh.webmanifest", "favicon.ico",
  ...expectedIcons.map((name) => `icons/${name}`),
  ...walk("fonts"),
];
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
for (const path of sharedFiles) {
  const source = join(root, path);
  const target = join(androidRoot, path);
  check(existsSync(target), `Android asset missing: ${path}`);
  if (existsSync(target)) check(digest(source) === digest(target), `Android asset differs: ${path}`);
}
for (const icon of expectedIcons) check(syncScript.includes(`"${icon}"`), `sync script does not explicitly copy ${icon}`);
check(syncScript.includes('"favicon.ico"'), "sync script does not copy favicon.ico");
for (const removed of removedIconNames) check(!syncScript.includes(removed), `sync script still names removed icon: ${removed}`);

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

console.log(`PWA update checks passed for ${version.build}; decoded ${pngSize.width}x${pngSize.height} PNG and synchronized ${sharedFiles.length} assets.`);
