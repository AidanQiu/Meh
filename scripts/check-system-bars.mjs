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
check(viewportTags[0]?.includes("content=\"width=device-width, initial-scale=1, viewport-fit=cover\""), "viewport meta must use the standard edge-to-edge configuration");
check(themeTags.length === 1, `expected one theme-color meta, found ${themeTags.length}`);
check(html.includes('name="apple-mobile-web-app-capable" content="yes"'), "missing Apple standalone capability meta");
check(html.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), "Apple status bar must be black-translucent");
check(html.includes('name="mobile-web-app-capable" content="yes"'), "missing generic standalone capability meta");
for (const platformClass of ["platform-ios-pwa", "platform-android-app", "platform-browser"]) {
  check(html.includes(`"${platformClass}"`), `missing explicit ${platformClass} runtime class`);
}

const directSafeAreaUses = [...css.matchAll(/env\(safe-area-inset-(top|right|bottom|left),\s*0px\)/g)];
check(directSafeAreaUses.length === 4, `iOS safe-area adapter must have exactly four env() sources, found ${directSafeAreaUses.length}`);
const iosAdapter = css.match(/:root\.platform-ios-pwa\s*\{([\s\S]*?)\}/)?.[1] || "";
check((iosAdapter.match(/env\(safe-area-inset-/g) || []).length === 4, "all safe-area env() reads must be inside platform-ios-pwa");
check(!css.replace(iosAdapter, "").includes("env(safe-area-inset-"), "safe-area env() leaked outside platform-ios-pwa");
check(!css.includes("constant(safe-area"), "legacy constant(safe-area...) handling must not coexist");
check(css.includes(":root.platform-android-app") && css.includes("--content-inset-top: var(--android-inset-top)"), "Android must consume native WindowInsets only");
check(!css.includes("--browser-safe-") && !css.includes("--native-safe-") && !css.includes("--app-safe-"), "legacy cross-platform safe-area variables remain");
check(css.includes("padding-top: calc(var(--content-inset-top) + var(--top-extra))"), "top content must consume the platform inset once");
check(css.includes("--dock-bottom-offset: var(--dock-bottom-gap)"), "dock position must equal the configured physical edge distance");
check(css.includes("left: var(--dock-inline-start) !important") && css.includes("right: var(--dock-inline-end) !important"), "dock width must respect both side safe areas");
check(css.includes("max-width: 448px !important"), "wide viewports must not stretch the dock past its design width");
check(css.includes("bottom: var(--dock-bottom-offset) !important"), "dock positioner must use the exact configured gap");
check(css.includes("--bottom-nav-height: calc(") && css.includes("height: var(--bottom-nav-height) !important"), "dock positioner must have a safe-area-independent fixed height");
check(css.includes(".floating-dock-surface {\n  padding: 6px") || css.includes("padding: 6px !important"), "dock surface must retain symmetric internal padding");
check(!/floating-dock-surface[\s\S]{0,300}content-inset-bottom/.test(css), "dock surface still consumes bottom inset");
check(css.includes(".dock-item {\n  min-height: 0 !important;\n  height: 100% !important;"), "dock items must fill the padded inner surface");
check(css.includes("top: 0 !important") && css.includes("bottom: 0 !important"), "active dock pill must fill the padded inner surface");
check(html.includes('class="floating-dock-surface bottom-nav-surface"') && html.includes('class="floating-dock-content bottom-nav-content"'), "dock position, surface, and content layers must remain separate");
check(/<\/div>\s*<div class="page-actions"[\s\S]*?<nav class="floating-dock bottom-nav-positioner"/.test(html), "fixed actions and dock must be body-level siblings of #app");
check(app.includes('els.dock.style.setProperty("bottom", `${dockBottomGap}px`, "important")'), "JavaScript must not add safe-area to the user dock offset");
check(!app.includes("`calc(${dockBottomGap}px + var(--content-inset-bottom))`"), "JavaScript still adds an inset to the user dock offset");
check(!css.includes(".settings-sheet::after") && !css.includes(".editor-sheet::after"), "bottom sheet safe-area spacer pseudo-elements must be absent");
check(!/--top-extra:\s*(20|24|44|47|59)px/.test(css), "fixed status-bar-sized top spacer found");
check(html.includes('<div id="viewport-background" aria-hidden="true">') && /#viewport-background\s*\{[\s\S]*?inset:\s*-1px -1px auto\s*!important;[\s\S]*?height:\s*calc\(var\(--viewport-paint-height\) \+ 2px\)\s*!important;/.test(css), "viewport background must overscan a stable non-keyboard paint height");
check(/html\s*\{[\s\S]*?background-color:\s*transparent\s*!important;[\s\S]*?background-image:\s*none\s*!important;/.test(css), "html must remain transparent instead of supplying an iOS status-bar color");
check(/body\s*\{[\s\S]*?background-color:\s*transparent\s*!important;[\s\S]*?background-image:\s*none\s*!important;/.test(css), "body must reveal the dedicated viewport background");
check(css.includes(".phone-frame") && css.includes("background: transparent !important"), "content root must reveal the full-screen background layer");
check(app.includes("topHeight: 0"), "the real top safe area must not receive a second default spacer");
check(app.includes("systemBarLayoutVersion: 6"), "layout settings migration must target the body-level fixed dock model");
check(!html.includes("customBgLayer") && !css.includes("#customBgLayer"), "an internal wallpaper painter still competes with the root canvas");
check(css.includes("--app-wallpaper-image: linear-gradient(transparent, transparent)") && css.includes("var(--app-wallpaper-image),"), "the complete theme/wallpaper background must be composed in one root variable");
check(/#viewport-background\s*\{[\s\S]*?background-color:\s*var\(--surface\)\s*!important;[\s\S]*?background-image:\s*var\(--app-background\)\s*!important;/.test(css), "the dedicated viewport layer must own the complete production background");
check(app.includes('els.root.style.setProperty("--app-wallpaper-image", wallpaperLayer)'), "custom wallpapers must update the root canvas background");
check(app.includes('els.root.style.removeProperty("--app-height")'), "restored sessions must clear stale pixel viewport overrides");
check(css.includes("--app-height: 100vh") && css.includes("--app-height: 100dvh"), "the full-screen canvas needs vh and dvh fallbacks");
check(css.includes("--viewport-paint-height: var(--app-height)") && app.includes('els.root.style.setProperty("--viewport-paint-height"'), "iOS keyboard recovery needs a stable viewport paint height");
check(css.includes("html.page-scroll-locked") && app.includes('classList.add("page-scroll-locked")'), "sheet scroll locking must use an overflow class");
check(!app.includes('document.body.style.position = "fixed"') && !app.includes("document.body.style.top = `-"), "sheet opening must not put body into iOS fixed positioning");
check(app.includes('scheduleViewportRecovery("keyboard-dismiss")') && app.includes('scheduleViewportRecovery("history-pop")'), "keyboard dismissal and interactive history return must schedule viewport recovery");
check(app.includes("isVisualViewportSettled()") && app.includes("viewportRestorePending"), "scroll restoration must wait for visual/layout viewport convergence");
check(app.includes('scheduleViewportRecovery("visual-viewport-resize")') && app.includes('window.visualViewport.addEventListener("scroll"'), "visual viewport resize/pan recovery listeners are missing");
check(app.includes("reconcileKeyboardViewport") && app.includes("visibleThreshold") && app.includes("viewportNudgePending"), "number-keyboard dismissal must be detected from viewport geometry even without blur");
check(css.includes("html.viewport-recovery-active") && css.includes("--viewport-recovery-height") && app.includes("nudgeWebKitViewport"), "temporary WebKit viewport relayout pulse is missing");
check(css.includes(".settings-sheet.is-history-closing") && css.includes("display: none !important"), "history-return sheets need an immediate non-animated hidden state");
check(app.includes("closeAllSheets({ fromHistory: true, immediate: true })"), "popstate must close sheets immediately without replaying the close transition");
check(app.includes('classList.contains("platform-ios-pwa")') && app.includes("meta.remove()"), "iOS standalone theme-color removal is missing");
check(html.includes('if (platformClass === "platform-ios-pwa")') && html.includes("themeMeta.remove()"), "bootstrap must remove theme-color before the first iOS PWA paint");
check(app.includes("window.MehLayoutDiagnostics") && app.includes("surfacePhysicalGap") && app.includes("console.table(geometry)"), "real geometry diagnostics are missing");
check(app.includes("logStandaloneStartupDiagnostics()") && app.includes("measureSafeAreaInsets()"), "standalone/meta/safe-area startup diagnostics are missing");
check(app.includes("navigatorStandalone: window.navigator.standalone") && app.includes("displayModeFullscreen"), "standalone viewport geometry table is incomplete");
check(app.includes('readStaticMetaContent("viewport")') && app.includes('readStaticMetaContent("apple-mobile-web-app-capable")') && app.includes('readStaticMetaContent("apple-mobile-web-app-status-bar-style")'), "live meta diagnostics are incomplete");
check(app.includes("classifyViewportOwnership") && app.includes('"webview-excludes-screen-region"') && app.includes('"dom-internal-gap"'), "viewport diagnostics do not distinguish WebView-external and DOM-internal gaps");
check(app.includes("screenMinusInner") && app.includes("domCoversAllocatedViewport"), "viewport ownership evidence is incomplete");
check(app.includes("statusBarStrategyValid") && app.includes('"ios-transparent-status-bar"') && app.includes('readStaticMetaContent("theme-color")'), "system-bar transparency diagnostics are missing");
check(app.includes("controllerVersion") && app.includes("cachedIndexes") && app.includes("stale-html-or-worker"), "Service Worker HTML consistency diagnostics are incomplete");
check(app.includes('get("safeAreaDebug")') && app.includes("background: red !important") && app.includes("background: magenta !important"), "opt-in background source diagnostics are missing");
check(worker.includes('cache: "reload"'), "navigation HTML must revalidate through the network before using the cached shell");
check(worker.includes('"__meh_pwa_diagnostic"') && worker.includes('cache: "no-store"'), "diagnostic index request must bypass Service Worker and HTTP caches");

check((activity.match(/WindowCompat\.enableEdgeToEdge\(window\)/g) || []).length === 1, "edge-to-edge must be configured exactly once");
check(activity.indexOf("configureEdgeToEdgeWindow()") < activity.indexOf("setContentView(R.layout.activity_main)"), "edge-to-edge must be configured before the first content frame");
check(!activity.includes("WindowCompat.setDecorFitsSystemWindows"), "manual decor fitting must not compete with enableEdgeToEdge");
check(!activity.includes("setMargins("), "WebView must not receive native inset margins");
check(!activity.includes("view.setPadding(") && !activity.includes("webView.setPadding("), "WebView must not receive native inset padding");
check(activity.includes("WindowInsetsCompat.Type.statusBars()") && activity.includes("WindowInsetsCompat.Type.navigationBars()"), "native status/navigation inset reads are missing");
check(activity.includes("WindowInsetsCompat.Type.systemGestures()") && activity.includes("WindowInsetsCompat.Type.ime()"), "native gesture/IME diagnostics are missing");
check(activity.includes("value / safeDensity"), "native physical px must be converted to CSS px using density");
check(activity.includes("window.statusBarColor = Color.TRANSPARENT"), "status bar must be transparent");
check(activity.includes("window.navigationBarColor = Color.TRANSPARENT"), "navigation bar must be transparent");
check(activity.includes("window.isNavigationBarContrastEnforced = false"), "navigation bar contrast enforcement must be disabled on supported APIs");
check(activity.includes("isAppearanceLightStatusBars") && activity.includes("isAppearanceLightNavigationBars"), "system bar icon appearance must be explicit");
check(activity.includes("getSafeAreaInsets") && activity.includes("--android-inset-${'$'}{side}"), "native-to-CSS inset bridge is missing");
check(activity.includes("EDGE_TO_EDGE_ENABLED") && activity.includes('.put("edgeToEdge", EDGE_TO_EDGE_ENABLED)'), "Android inset policy is not tied to native edge-to-edge state");
check(activity.includes("cacheMode = WebSettings.LOAD_NO_CACHE"), "packaged Android web assets must bypass stale WebView caches");
check(!activity.includes("webView.restoreState(savedInstanceState)"), "Android must not restore an old packaged page after an incremental reinstall");
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

console.log("System bar audit checks passed: runtime-safe inset fallback, full-window WebView, transparent bars, synchronized assets.");
