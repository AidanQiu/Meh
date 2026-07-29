import { readFileSync } from "node:fs";
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
const platform = read("platform.js");
const navigation = read("navigation-controller.js");
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
  check(platform.includes(`"${platformClass}"`), `missing explicit ${platformClass} runtime class`);
}
check(!/navigator\.(?:userAgent|platform|standalone)/.test(app), "business code must not repeat platform detection");
check(!html.includes("navigator.userAgent") && html.includes("window.MehPlatform.current"), "HTML bootstrap must consume the platform module");

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
check(css.includes("left: var(--dock-inline-start)") && css.includes("right: var(--dock-inline-end)"), "dock width must respect both side safe areas");
check(css.includes("max-width: 448px"), "wide viewports must not stretch the dock past its design width");
check(css.includes("bottom: var(--dock-bottom-offset)"), "dock positioner must use the exact configured gap");
check(css.includes("--bottom-nav-height: calc(") && css.includes("height: var(--bottom-nav-height)"), "dock positioner must have a safe-area-independent fixed height");
check(css.includes(".floating-dock-surface {") && css.includes("padding: 6px"), "dock surface must retain symmetric internal padding");
check(!/floating-dock-surface[\s\S]{0,300}content-inset-bottom/.test(css), "dock surface still consumes bottom inset");
check(/\.dock-item\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?height:\s*100%;/.test(css), "dock items must fill the padded inner surface");
check(/\.dock-indicator\s*\{[\s\S]*?top:\s*0;[\s\S]*?bottom:\s*0;/.test(css), "active dock pill must fill the padded inner surface");
check(html.includes('class="floating-dock-surface bottom-nav-surface"') && html.includes('class="floating-dock-content bottom-nav-content"'), "dock position, surface, and content layers must remain separate");
check(/<\/div>\s*<div class="page-actions"[\s\S]*?<nav class="floating-dock bottom-nav-positioner"/.test(html), "fixed actions and dock must be body-level siblings of #app");
check(!/els\.(?:dock|pageActions)\.style\.setProperty\("(?:left|right|bottom|width|max-width|margin)/.test(app), "JavaScript must not own dock or page-action positioning");
check(!app.includes("`calc(${dockBottomGap}px + var(--content-inset-bottom))`"), "JavaScript still adds an inset to the user dock offset");
check(!css.includes(".settings-sheet::after") && !css.includes(".editor-sheet::after"), "bottom sheet safe-area spacer pseudo-elements must be absent");
check(!/--top-extra:\s*(20|24|44|47|59)px/.test(css), "fixed status-bar-sized top spacer found");
check(html.includes('<div id="viewport-background" aria-hidden="true">') && /#viewport-background\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?width:\s*auto;[\s\S]*?height:\s*auto;/.test(css), "viewport background must cover the current viewport with fixed inset zero");
check(/html\s*\{[\s\S]*?background-color:\s*var\(--surface\);[\s\S]*?background-image:\s*var\(--app-background\);/.test(css), "html must provide an opaque themed root background");
check(/body\s*\{[\s\S]*?background-color:\s*var\(--surface\);[\s\S]*?background-image:\s*var\(--app-background\);/.test(css), "body must provide an opaque themed root background");
check(/\.phone-frame\s*\{[\s\S]*?background-color:\s*var\(--surface\);[\s\S]*?background-image:\s*var\(--app-background\);/.test(css), "content root must provide an opaque themed background");
check(/#app\s*\{[\s\S]*?background-color:\s*var\(--surface\);/.test(css), "app root must not be transparent");
check(app.includes("topHeight: 0"), "the real top safe area must not receive a second default spacer");
check(app.includes("systemBarLayoutVersion: 6"), "layout settings migration must target the body-level fixed dock model");
check(!html.includes("customBgLayer") && !css.includes("#customBgLayer"), "an internal wallpaper painter still competes with the root canvas");
check(
  css.includes("--app-wallpaper-image: none")
    && css.includes("--app-wallpaper-opacity: 0.5")
    && /#viewport-background::before\s*\{[\s\S]*?background-image:\s*var\(--app-wallpaper-image\);[\s\S]*?opacity:\s*var\(--app-wallpaper-opacity\);/.test(css),
  "the viewport wallpaper sublayer must use standards-based opacity"
);
check(/#viewport-background\s*\{[\s\S]*?background-color:\s*var\(--surface\);[\s\S]*?background-image:\s*var\(--app-background\);/.test(css), "the dedicated viewport layer must own the production theme and wallpaper sublayer");
check(app.includes('els.root.style.setProperty("--app-wallpaper-image", wallpaperLayer)'), "custom wallpapers must update the root canvas background");
check(app.includes('els.root.style.removeProperty("--app-height")'), "restored sessions must clear stale pixel viewport overrides");
check(css.includes("--app-height: 100vh") && css.includes("--app-height: 100dvh"), "the full-screen canvas needs vh and dvh fallbacks");
check(!css.includes("--viewport-paint-height") && !app.includes('"--viewport-paint-height"'), "pixel viewport paint height ownership must be removed");
check(!/style\.setProperty\(\s*"--app-height"/.test(app), "JavaScript must not write a pixel app height");
check(css.includes("html.page-scroll-locked") && app.includes('classList.add("page-scroll-locked")'), "sheet scroll locking must use an overflow class");
check(!app.includes('document.body.style.position = "fixed"') && !app.includes("document.body.style.top = `-"), "sheet opening must not put body into iOS fixed positioning");
for (const state of ["stable", "keyboard-opening", "keyboard-open", "keyboard-closing", "navigation-transition", "orientation-changing", "settling"]) {
  check(app.includes(`"${state}"`), `KeyboardViewportController is missing ${state}`);
}
check(app.includes('handleViewportChange("visual-viewport-resize")') && app.includes('window.visualViewport.addEventListener("scroll"'), "visual viewport events must feed the single keyboard controller");
check(app.includes("stableFrameCount >= 2") && app.includes("settleFallback") && app.includes("600"), "keyboard closure must require stable geometry with one safety fallback");
check(app.includes("keyboardViewportController.interceptBack") && app.includes('source !== "android-back"'), "keyboard and navigation back serialization is missing");
check(!app.includes("scheduleViewportRecovery") && !app.includes("nudgeWebKitViewport"), "legacy multi-pass viewport recovery remains");
check(!css.includes("viewport-recovery-active") && !css.includes("--viewport-recovery-height"), "layout-changing viewport recovery CSS remains");
check(/#viewport-background\.is-repainting/.test(css), "fixed background repaint workaround is missing");
check(/platform-ios-pwa[\s\S]{0,500}font-size:\s*16px/.test(css), "iOS PWA editable controls must be at least 16px");
for (const method of ["pushItem", "replaceItem", "removeItem", "requestBack", "canGoBack", "getTopItem", "getStack", "registerItemType", "onSettled"]) {
  check(new RegExp(`\\b${method}\\(`).test(navigation), `SPA navigation controller is missing ${method}()`);
}
check((navigation.match(/addEventListener\("popstate"/g) || []).length === 1, "SPA navigation must have exactly one popstate entry point");
check(navigation.includes("history.replaceState(historyState(0") && navigation.includes("history.pushState(historyState(index)"), "normal-browser History adapter writes are missing");
check(navigation.includes("sessionId") && navigation.includes("pendingTraversalToken") && navigation.includes("historyOperationQueue"), "session-scoped serialized History adapter is missing");
check(navigation.includes('"ui-stack-only"') && navigation.includes('"history-adapter"') && navigation.includes("usesHistoryAdapter"), "platform navigation modes are missing");
check(navigation.includes("window.MehPlatform?.RUNTIME?.IOS_PWA") && navigation.includes("window.MehPlatform?.RUNTIME?.ANDROID_APP"), "iOS PWA and Android App must select UI Stack-only navigation");
check(/historyMode:\s*usesHistoryAdapter[\s\S]*?:\s*"none"/.test(navigation), "internal platforms must force every UI item to historyMode none");
for (const type of ["settings", "preset-editor", "number-settings", "language-menu", "dark-mode-menu", "advanced-color-picker", "wheel-history", "number-history"]) {
  check(app.includes(`"${type}"`), `UI Stack registration is missing ${type}`);
}
check(app.includes('openTopLevelItem("settings")') && app.includes('openTopLevelItem("preset-editor"'), "full-page entry points must use the UI Stack controller");
check(app.includes("window.mehNavigation.back("), "page back controls must use the SPA controller");
check(!css.includes("is-navigation-entering") && !css.includes("is-navigation-exiting") && !css.includes("is-navigation-leaving"), "obsolete horizontal SPA transition states remain");
check(
  /\.settings-sheet,[\s\S]*?transform:\s*translateY\(105%\)/.test(css)
    && /\.settings-sheet\.is-open,[\s\S]*?transform:\s*translateY\(0\)/.test(css),
  "Bottom Sheets must use vertical-only open and close transforms"
);
check(navigation.includes('"browser-history"'), "normal browser History source is missing");
check(navigation.includes("createIosEdgeNavigationGuard") && navigation.includes("passive: false") && navigation.includes("capture: true"), "iOS edge navigation guard must use capture non-passive listeners");
check(navigation.includes('document.addEventListener("touchcancel"') && navigation.includes("event.preventDefault()"), "iOS edge navigation guard must cancel and suppress claimed gestures");
check(!navigation.includes('"ios-edge-back"') && !navigation.includes("possibleEdge") && !navigation.includes("history.forward("), "legacy edge-back inference or compensating forward traversal remains");
check(!html.includes("sheet-handle") && !css.includes(".sheet-handle") && !app.includes("bindSheetHandleGestures"), "Bottom Sheet handle or drag-close implementation remains");
check((html.match(/sheet-close-button/g) || []).length === 3, "all three Bottom Sheets must use the dedicated close button class");
check(css.includes(".sheet-close-button") && css.includes("var(--primary-container)") && css.includes("var(--primary)") && css.includes(".sheet-close-button:focus-visible") && css.includes(".sheet-close-button:active") && css.includes(".theme-dark .sheet-close-button"), "Bottom Sheet close button states must use the accent tokens");
check(html.indexOf('id="githubProjectLink"') < html.indexOf('id="checkUpdateButton"') && /id="checkUpdateButton"[\s\S]*?system_update_alt[\s\S]*?data-i18n="checkUpdate"/.test(html), "version actions must place GitHub above the icon-labelled update button");
for (const label of ["界面布局", "Interface & Layout", "画面レイアウト", "Интерфейс және орналасу"]) {
  check(app.includes(`personalization: "${label}"`), `missing personalization label: ${label}`);
}
check(!app.includes('personalization: "个性化"') && !app.includes('personalization: "Personalization"'), "old personalization translations remain");
check(css.includes("@media (prefers-reduced-motion: reduce)"), "navigation transitions must respect reduced motion");
check(app.includes("isIosPwaRuntime()") && app.includes("meta.remove()"), "iOS standalone theme-color removal is missing");
check(html.includes('if (platformClass === "platform-ios-pwa")') && html.includes("themeMeta.remove()"), "bootstrap must remove theme-color before the first iOS PWA paint");
check(app.includes("window.MehLayoutDiagnostics") && app.includes("surfacePhysicalGap") && app.includes("console.table(geometry)"), "real geometry diagnostics are missing");
check(app.includes("logStandaloneStartupDiagnostics()") && app.includes("measureSafeAreaInsets()"), "standalone/meta/safe-area startup diagnostics are missing");
check(app.includes("navigatorStandalone: window.MehPlatform.standalone") && app.includes("displayModeFullscreen"), "standalone viewport geometry table is incomplete");
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
check(activity.includes("getSafeAreaInsets") && activity.includes("MehPlatform?.applyAndroidInsets"), "native-to-CSS inset bridge is missing");
check(activity.includes("EDGE_TO_EDGE_ENABLED") && activity.includes('.put("edgeToEdge", EDGE_TO_EDGE_ENABLED)'), "Android inset policy is not tied to native edge-to-edge state");
check(activity.includes("cacheMode = WebSettings.LOAD_NO_CACHE"), "packaged Android web assets must bypass stale WebView caches");
check(activity.includes("window.mehNavigation?.requestBack(") && activity.includes('"android-back"'), "Android back must invoke requestBack with a native token");
check(activity.includes("onNavigationSettled") && activity.includes("pendingSystemBackToken") && activity.includes("SYSTEM_BACK_SETTLE_TIMEOUT_MS"), "Android back must wait for the matching web settled callback");
check(!activity.includes("webView.canGoBack()") && !activity.includes("webView.goBack()"), "Android back must not fall through to WebView browsing history");
check(!activity.includes("webView.restoreState(savedInstanceState)"), "Android must not restore an old packaged page after an incremental reinstall");
check(layout.includes('android:layout_width="match_parent"') && layout.includes('android:layout_height="match_parent"'), "root and WebView must fill the window");
check(!layout.includes("fitsSystemWindows") && !layout.includes("paddingTop") && !layout.includes("paddingBottom"), "layout XML must not consume system insets");
check(manifest.includes('android:windowSoftInputMode="adjustResize"'), "Activity must resize the WebView viewport for the IME");
for (const theme of [dayTheme, nightTheme]) {
  check(theme.includes("<item name=\"android:statusBarColor\">@android:color/transparent</item>"), "theme status bar is not transparent");
  check(theme.includes("<item name=\"android:navigationBarColor\">@android:color/transparent</item>"), "theme navigation bar is not transparent");
}
check(gradle.includes('layout.buildDirectory.dir("generated/webAssets")'), "Android generated web asset directory is missing");
check(gradle.includes("assets.srcDir(generatedWebAssets)"), "Android main source set must consume generated web assets");
check(gradle.includes("val syncWebAssets by tasks.registering(Sync::class)"), "Gradle web asset sync task is missing");
check(gradle.includes('tasks.named("preBuild")') && gradle.includes("dependsOn(syncWebAssets)"), "Android preBuild must depend on web asset synchronization");
check(worker.includes("networkFirstForPage(request)"), "Service Worker navigation must remain network-first");
check(!gradle.includes('into(layout.projectDirectory.dir("src/main/assets/www"))'), "Android web sync must not recreate checked-in source duplicates");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("System bar audit checks passed: runtime-safe inset fallback, full-window WebView, transparent bars, synchronized assets.");
