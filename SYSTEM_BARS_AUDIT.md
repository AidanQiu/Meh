# iOS PWA / Android WebView 系统栏专项审计

构建标识：`1.1.1-pwa-r8`

## r8 iOS 真机截图复盘

- r7 把 `visualViewport.height` 直接写入全屏根变量 `--app-height`。WebKit standalone 在 `viewport-fit=cover` 下可能返回已扣除顶部和底部安全区的 visual viewport；因此 `body/.phone-frame/.app` 一起缩成中间内容区，截图底部新增的白带由这条 r7 高度覆盖直接创建。
- r8 删除所有 JavaScript 对 `--app-height` 的写入。普通浏览器和 Android WebView 由 CSS `100dvh` 管理画布；iOS standalone 单独使用 `100vh`，`visualViewport` 只参与诊断，不再控制背景或根布局。
- r7 的 `html/body` 只设置了渐变 `background`，其 computed `background-color` 仍可能是透明。r8 将实色 `--surface` 与渐变背景图拆开设置，并在外部 CSS 前提供相同的内联首帧色，避免 iOS 宿主栏、启动退场和 overscroll 取到默认白色。
- 2026-07-20 的 WebKit 301994 最新复现记录指出，iOS 26.5.2 standalone 可能在 DOM 之外保留约 62 CSS px 顶部系统区域；DOM 无法绘制进入该区域。这与截图顶部白带形态一致，但必须读取真机 iOS 版本和 r8 诊断值才能最终确认是否命中该系统缺陷。r8 能修复网页画布缩短与透明回退，不能伪造一个 DOM 无法访问的系统区域。

## 架构结论

- Android APK 是 `AppCompatActivity + XML + 原生 WebView`，不是 TWA、Capacitor、Cordova 或 Compose。
- `MainActivity` 使用 `Theme.Meh`（Material 3 DayNight、NoActionBar）。根 `FrameLayout` 和 WebView 均为 `match_parent`。
- WebView 通过 `WebViewAssetLoader` 加载 APK 内的 `android/app/src/main/assets/www/index.html`，实际 URL 为 `https://appassets.androidplatform.net/assets/www/index.html`，不加载远程站点。
- 网页没有框架构建目录；根目录的 `index.html`、`style.css`、`app.js` 等静态文件是唯一主版本。Gradle `preBuild` 的 `syncWebAssets` 任务会把它们精确同步到 Android assets，并清理旧文件。
- 网页实际根链路为 `html -> body -> .phone-frame -> main.app`。顶部交互容器为 `.top-bar`；底部交互容器为 `.floating-dock` 和 `.page-actions`；设置、预设编辑及随机数输入均使用共用的 `.settings-sheet/.editor-sheet`。

## 修改前的实际 inset 链路与根因

### Android 顶部

1. Activity 调用 `WindowCompat.setDecorFitsSystemWindows(window, false)`，表面上开启 edge-to-edge。
2. 随后的 `OnApplyWindowInsetsListener` 却读取 `systemBars | displayCutout`，再把四边值设置成 WebView margin。
3. 因此 WebView 实际重新位于状态栏下方，状态栏后只剩根容器/Window 背景，形成额外顶部区域。
4. `statusBarColor` 又被设置成页面实色而非透明色，使该区域更容易与网页渐变背景形成色差。

实际创建顶部空间的原生代码是旧 `MainActivity.applyWindowInsets()` 内的 `params.setMargins(bars.left, bars.top, bars.right, bars.bottom)`。

### Android 底部

1. 同一条 margin 逻辑把 WebView bottom margin 设为导航栏 inset，网页背景到达不了手势导航区。
2. `navigationBarColor` 被设置成页面实色，且未关闭 Android 10+ 的导航栏对比色蒙层。
3. 网页的 `env(safe-area-inset-bottom)` 在 Android WebView 中没有被可靠地作为真实导航栏 inset 来源。

这三点共同造成手势小白条区域与网页背景不连续，且底部交互区没有可靠的三键/手势导航动态避让。

### iOS PWA 顶部

1. `.app` 同时使用 `env(safe-area-inset-top)` 与默认 `--top-extra: 16px`；后者不是设备 inset，却默认在安全区下再制造 16px 顶部空段。
2. HTML 同时存在按系统明暗模式选择的两条 `theme-color`，而应用又允许使用独立于系统的明暗设置并在启动后动态改写两条 meta。安装启动阶段可能选中与实际页面主题不同的颜色。
3. `html/body/.phone-frame` 分别绘制顶层背景，自定义背景又只挂在受 480px 宽度和 `overflow: hidden` 约束的 `.phone-frame` 内；这使状态栏、横屏外侧和内容区不总由同一视觉背景层负责。

实际创建额外纵向空段的 CSS 是旧 `.app { padding-top: calc(env(safe-area-inset-top) + var(--top-extra)); }` 配合默认 `--top-extra: 16px`。颜色分割来自多条启动颜色配置和多背景所有者，而不是缺少 `viewport-fit=cover`。

### 网页底部重复处理

`.settings-sheet/.editor-sheet` 已在 `padding-bottom` 使用 safe-area，随后 `::after` 又创建一个高度为 safe-area 的占位块，构成明确的双重 bottom inset。该伪元素已删除。

## 修改后的唯一处理原则

### 视觉背景层

- `html` 与 `body` 使用同一 `--app-background`，覆盖完整视口，不添加 safe-area padding。
- `.phone-frame` 和 `.app` 背景透明；自定义背景 `#customBgLayer` 是 `body` 的 fixed 全屏子层。
- Android Window、根容器和 WebView 的实色只作为网页首帧前的启动回退；状态栏和导航栏本身透明，WebView 背景实际延伸到两者后方。

### 内容避让层

- 浏览器/iOS：`--app-safe-*` 唯一来源是四个 `env(safe-area-inset-*)` 变量。
- Android WebView：原生读取 `systemBars | displayCutout`，按 density 从物理 px 转成 CSS px，写入 `--native-safe-*`；`.android-webview` 只把这些变量映射为 `--app-safe-*`，不再叠加 `env()`。
- 顶部 inset 只由 `.app` 的内容 padding 使用一次；默认非系统顶部间距已改为 0。r6 若曾把旧默认 16px 写入本地设置，r7 会做一次版本化迁移，避免旧值继续制造空段；用户主动设置的其他数值保留。
- 底部背景不缩进；`.floating-dock`、`.page-actions` 和共用 sheet 的交互内容分别使用同一个 `--app-safe-bottom` 来源完成必要避让。
- IME inset 仅记录诊断，不会保存为 bottom safe-area。WebView 使用 `adjustResize`；全屏背景高度始终由 CSS viewport 单位负责，`visualViewport` 只记录诊断，避免 iOS standalone 将扣过 safe-area 的值错误应用到根画布。

## Android Window 最终配置

- `decorFitsSystemWindows = false`，只配置一次。
- `statusBarColor = Color.TRANSPARENT`。
- `navigationBarColor = Color.TRANSPARENT`。
- API 29+：`isNavigationBarContrastEnforced = false`。
- API 28+：透明 navigation bar divider，display cutout 使用 `shortEdges`。
- 深色背景：状态栏和导航栏均使用浅色图标；浅色背景按实际颜色亮度切换深色图标。
- 不隐藏状态栏，不隐藏导航栏，不使用 fullscreen 或 immersive-sticky flag。

## PWA 与缓存

- 最终 HTML 只有一条 viewport meta，包含 `viewport-fit=cover`。
- 最终 HTML 只有一条 `theme-color`，启动脚本在 CSS 加载前按已保存主题同步其实际 surface 色。
- 保留 `apple-mobile-web-app-capable=yes`、`apple-mobile-web-app-status-bar-style=black-translucent`，并补齐 `mobile-web-app-capable=yes`。
- Service Worker 对导航继续使用 network-first；入口 HTML不会被长期 cache-first 固定。
- r8 使用新的 shell/runtime cache 名称，activate 时删除旧 `meh-*` cache，`skipWaiting + clients.claim` 保持启用。

## 诊断入口

- Debug APK：原生日志输出 API、导航模式、status/navigation/gesture/cutout/IME inset、density、CSS px、系统栏颜色和图标模式，以及根容器/WebView bounds、padding、margin。
- 网页：URL 加 `?debugInsets=1`，或控制台执行 `MehLayoutDiagnostics.enable()`；日志包含 standalone 状态、viewport、DPR、browser/native/final inset、根背景、各层 padding、dock bottom 和构建号。

## 本机可验证范围

- 已做静态全量关键词审计、JavaScript 语法检查、PWA 更新模拟、源码/assets 哈希一致性检查、Kotlin debug 编译和 JVM 单元测试。
- 已用桌面 Chromium 对 390×844 竖屏和 844×390 横屏做视觉检查，并自动遍历首页四个功能页、设置/自定义背景、预设编辑和随机数输入面板；另以 59/34 CSS px 和 24/24 CSS px 分别模拟 iOS、Android inset，验证最终来源只生效一次。这仍不能替代 iOS safe-area 或 Android WindowInsets 真机验证。
- 未声称完成 iPhone、Android 10–15、手势/三键导航、打孔屏或 IME 真机矩阵；这些项目必须用真机或对应模拟器验证。
