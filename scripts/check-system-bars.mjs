import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const html = read("index.html");
const css = read("style.css");
const app = read("app.js");
const worker = read("service-worker.js");
const activity = read("android/app/src/main/java/om/aidanqiu/meh/MainActivity.kt");
const layout = read("android/app/src/main/res/layout/activity_main.xml");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const dayTheme = read("android/app/src/main/res/values/themes.xml");
const nightTheme = read("android/app/src/main/res/values-night/themes.xml");
const gradle = read("android/app/build.gradle.kts");

const viewportTags = html.match(/<meta\s+name="viewport"[^>]*>/gi) || [];
const themeTags = html.match(/<meta[^>]+name="theme-color"[^>]*>/gi) || [];
check(viewportTags.length === 1, `expected one viewport meta, found ${viewportTags.length}`);
check(viewportTags[0]?.includes("viewport-fit=cover"), "viewport meta must contain viewport-fit=cover");
check(themeTags.length === 1, `expected one theme-color meta, found ${themeTags.length}`);
check(html.includes('name="apple-mobile-web-app-capable" content="yes"'), "missing Apple standalone capability meta");
check(html.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), "Apple status bar must be black-translucent");
check(html.includes('name="mobile-web-app-capable" content="yes"'), "missing generic standalone capability meta");
check(html.includes('classList.add(isAndroidWebView ? "android-webview"'), "runtime class must be established before CSS loads");

const directSafeAreaUses = [...css.matchAll(/env\(safe-area-inset-(top|right|bottom|left),\s*0px\)/g)];
check(directSafeAreaUses.length === 4, `safe-area env() must appear only in four browser source variables, found ${directSafeAreaUses.length}`);
check(!css.includes("constant(safe-area"), "legacy constant(safe-area...) handling must not coexist");
check(css.includes(":root.android-webview") && css.includes("--app-safe-top: var(--native-safe-top)"), "Android must select native safe-area variables");
check(css.includes("padding-top: calc(var(--app-safe-top) + var(--top-extra))"), "top content must consume the unified top inset once");
check(css.includes("--dock-bottom-offset: calc(var(--dock-bottom-gap) + var(--app-safe-bottom))"), "bottom dock must consume the unified bottom inset");
check(!css.includes(".settings-sheet::after") && !css.includes(".editor-sheet::after"), "bottom sheet safe-area spacer pseudo-elements must be absent");
check(!/--top-extra:\s*(20|24|44|47|59)px/.test(css), "fixed status-bar-sized top spacer found");
check(css.includes("#customBgLayer {\n  position: fixed;\n  inset: 0;"), "custom background must cover the viewport behind system bars");
check(css.includes(".phone-frame") && css.includes("background: transparent !important"), "content root must reveal the full-screen background layer");
check(app.includes("topHeight: 0"), "default non-system top spacing must be zero");
check(app.includes('document.body.insertBefore(bgLayer, document.body.firstChild)'), "custom background must live at the visual root");
check(!app.includes('setProperty("--app-height"'), "JavaScript must not size the full-screen canvas from visualViewport");
check(css.includes(":root.pwa-standalone") && css.includes("--app-height: 100vh"), "iOS standalone must use the full-screen vh canvas instead of WebKit's inset dvh/visualViewport height");
check(css.includes("background-color: var(--surface) !important") && css.includes("background-image: var(--app-background) !important"), "root canvas needs a non-transparent system fallback color behind its visual background");
check(app.includes("window.MehLayoutDiagnostics"), "web inset diagnostics are missing");

check((activity.match(/WindowCompat\.setDecorFitsSystemWindows\(window, false\)/g) || []).length === 1, "decorFitsSystemWindows=false must be configured exactly once");
check(!activity.includes("setMargins("), "WebView must not receive native inset margins");
check(!activity.includes("view.setPadding(") && !activity.includes("webView.setPadding("), "WebView must not receive native inset padding");
check(activity.includes("WindowInsetsCompat.Type.statusBars()") && activity.includes("WindowInsetsCompat.Type.navigationBars()"), "native status/navigation inset reads are missing");
check(activity.includes("WindowInsetsCompat.Type.systemGestures()") && activity.includes("WindowInsetsCompat.Type.ime()"), "native gesture/IME diagnostics are missing");
check(activity.includes("value / safeDensity"), "native physical px must be converted to CSS px using density");
check(activity.includes("window.statusBarColor = Color.TRANSPARENT"), "status bar must be transparent");
check(activity.includes("window.navigationBarColor = Color.TRANSPARENT"), "navigation bar must be transparent");
check(activity.includes("window.isNavigationBarContrastEnforced = false"), "navigation bar contrast enforcement must be disabled on supported APIs");
check(activity.includes("isAppearanceLightStatusBars") && activity.includes("isAppearanceLightNavigationBars"), "system bar icon appearance must be explicit");
check(activity.includes("getSafeAreaInsets") && activity.includes("--native-safe-${'$'}{side}"), "native-to-CSS inset bridge is missing");
check(layout.includes('android:layout_width="match_parent"') && layout.includes('android:layout_height="match_parent"'), "root and WebView must fill the window");
check(!layout.includes("fitsSystemWindows") && !layout.includes("paddingTop") && !layout.includes("paddingBottom"), "layout XML must not consume system insets");
check(manifest.includes('android:windowSoftInputMode="adjustResize"'), "Activity must resize the WebView viewport for the IME");
for (const theme of [dayTheme, nightTheme]) {
  check(theme.includes("<item name=\"android:statusBarColor\">@android:color/transparent</item>"), "theme status bar is not transparent");
  check(theme.includes("<item name=\"android:navigationBarColor\">@android:color/transparent</item>"), "theme navigation bar is not transparent");
}
check(gradle.includes("val syncWebAssets by tasks.registering(Sync::class)"), "Gradle web asset sync task is missing");
check(gradle.includes('tasks.named("preBuild")') && gradle.includes("dependsOn(syncWebAssets)"), "Android preBuild must depend on web asset synchronization");
check(worker.includes("networkFirstForPage(request)"), "Service Worker navigation must remain network-first");

const sharedFiles = [
  "index.html", "app.js", "pwa-update.js", "style.css", "service-worker.js", "version.json",
  "manifest.webmanifest", "manifest-meh.webmanifest", "manifest-zh.webmanifest", "favicon.ico",
];
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
for (const path of sharedFiles) {
  const source = join(root, path);
  const asset = join(root, "android", "app", "src", "main", "assets", "www", path);
  check(existsSync(asset), `Android asset is missing: ${path}`);
  if (existsSync(asset)) check(digest(source) === digest(asset), `Android asset is stale: ${path}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("System bar audit checks passed: one inset source per runtime, full-window WebView, transparent bars, synchronized assets.");
