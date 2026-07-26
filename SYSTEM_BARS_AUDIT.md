# iOS PWA / Android WebView 系统栏专项审计

构建标识：`1.1.1-pwa-r15`

## r15 iOS PWA 全视口背景与底栏定位语义修复

- 直接根因是 r14 同时在 CSS `--dock-bottom-offset` 和 JavaScript `applyLayoutSettings()` 中使用 `用户距离 + --app-safe-bottom`。因此设置值为 0 时，底栏 computed `bottom` 仍等于 Home Indicator inset，无法到达物理屏幕底边。
- 底栏现拆分为 `.floating-dock` 定位器、`.floating-dock-surface` 背景和 `.floating-dock-content` 按钮内容。定位器最终公式固定为 `bottom = --dock-bottom-gap`；surface 使用 `padding-bottom = 6px + --app-safe-bottom`，背景因此覆盖到用户指定的物理边缘，按钮仍避开 Home Indicator。
- `dockBottomGap` 的 range 最小值保持 0；`clampNumber()` 通过 `Number.isFinite()` 保留 0，没有 `value || 默认值` 覆盖。诊断日志补充原始值、存储值、CSS 变量、computed bottom、物理边距、父级 padding/margin 和 surface 内部 safe-area。
- 四个 `env(safe-area-inset-*)` 收敛为 `--safe-area-*` 唯一来源；iOS standalone 不再复制第二组 env 声明。Android 仍逐边取 browser/native inset 的较大值，不做相加。
- 全屏画布改由 CSS `100vh` → `100dvh` 渐进增强统一负责。启动、resize、横竖屏和 pageshow 会清除旧会话遗留的像素 `--app-height`，不再把任一可能已扣安全区的 viewport 测量写回根高度。
- viewport 使用 `width=device-width, initial-scale=1, viewport-fit=cover`；PWA 仍为 `display: standalone` 与 `black-translucent`，未隐藏状态栏或 Home Indicator。manifest 的 orientation 从锁定 portrait 改为 `any`，让横屏左右 safe-area 验收可以真实发生。
- Service Worker/cache/build 升级为 r15，继续使用 `skipWaiting`、`clients.claim`、`controllerchange` 单次刷新和页面/同源资源 network-first。

## r14 iOS PWA 底栏尺寸与重复留白修复

- `.floating-dock` 的 Home Indicator 安全区从胶囊内部 padding 移到胶囊外部 bottom offset。导航按钮、选中指示器和胶囊本体保持统一的 6px 内边距，不再因为 34px bottom safe-area 形成一段看似无法调掉的内部空白。
- 底栏宽度重新限制为最多 448px；左右定位同时取用户边距与 `safe-area-inset-left/right` 的较大值。横屏、iPad 和宽视口不再把四项导航强行拉满整屏，刘海与圆角区域也不会压住导航。
- `topHeight` 默认值恢复为 0，并通过布局版本 4 把 r13 自动写入的 16px 默认值迁移为 0。顶部安全区只避让一次，用户仍可在设置中主动增加额外顶部间距。
- WebKit 301994 在部分 iOS 26.5.2 Home Screen standalone 环境中会把顶部约 62 CSS px 留在 DOM 画布之外；该系统拥有的区域无法由 CSS 背景、fixed 元素或 JavaScript 高度绘制覆盖。r14 只消除应用自身制造的重复空白，不伪造对系统级缺陷的网页修复。

## r13 Android / iOS 安全区修复

- 底栏外观直接使用用户设置的物理屏幕边距，底栏内部始终保留完整的 bottom safe-area。安全区 padding 不再随“离底部距离”反向缩小，因此滑块会移动整个底栏，而不是改变底栏厚度；背景仍可沉浸到手势条后方，按钮和选中指示器也不会压住 Android 手势条或 iPhone Home Indicator。
- `applyLayoutSettings()` 会把 range 的最终数值直接写入底栏 `bottom` 与相关安全内边距；回归测试通过真实 `input/change` 事件驱动 0/18/40 三档，不再绕过设置逻辑直接修改 CSS 变量。
- Android WebView 对 APK 内置页面使用 `LOAD_NO_CACHE`，Activity 启动始终重新加载本地入口，不恢复旧 WebView 页面快照，避免 Android Studio 增量安装继续运行 r11 样式。
- Android WebView 不再只信任单一 inset 来源。CSS `env(safe-area-inset-*)` 与原生 `WindowInsets` 桥接值逐边取较大值，避免首帧或个别 WebView 版本原生值暂时为 0 时顶部状态栏失去避让。
- `enableEdgeToEdge()` 在 `setContentView()` 前执行，透明状态栏、透明导航栏及对比度设置从首帧生效；原生容器和 WebView 仍保持全窗口尺寸。
- 页面增加固定全视口背景层，系统状态栏、手势导航区、普通内容区和自定义壁纸使用连续的视觉画布，不再依赖 WebView 外的纯色回退来拼接。
- iOS 原生 range 控件同时监听 `input` 与 `change`，解决部分 standalone PWA 只在松手时提交滑块值的问题。
- iOS standalone 恢复 r3 的两项关键行为：四边直接读取 `env(safe-area-inset-*)`，并由 JavaScript 将根画布同步到最大的真实 viewport 高度。r7–r12 把旧的 16px iOS 内容偏移迁移为 0；r13 只在 PWA standalone 中恢复该值，Android 仍保持 0。

## iOS 真机截图复盘

- r7 把 `visualViewport.height` 直接写入全屏根变量 `--app-height`。WebKit standalone 在 `viewport-fit=cover` 下可能返回已扣除顶部和底部安全区的 visual viewport；因此 `body/.phone-frame/.app` 一起缩成中间内容区，截图底部新增的白带由这条 r7 高度覆盖直接创建。
- r13 按用户确认可用的 r3 规则恢复高度同步，但取 `innerHeight`、`documentElement.clientHeight`、`visualViewport.height` 三者最大值，避免单独采用已扣安全区的 visual viewport 高度。该逻辑只在 `.pwa-standalone` 执行，Android 与浏览器标签页继续由 CSS `100dvh` 管理。
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
- Android WebView：原生读取 `systemBars | displayCutout`，按 density 从物理 px 转成 CSS px，写入 `--native-safe-*`；`.android-webview` 将它与 WebView 的 `env()` 逐边取较大值，既避免重复相加，也能在其中一个来源暂时为 0 时保留安全区。
- 顶部 inset 只由 `.app` 的内容 padding 使用一次；所有运行环境的默认额外顶部间距均为 0，用户仍可通过设置主动增加。
- 底部背景不缩进；`.floating-dock` 定位器使用 `bottom = 用户距离`，安全区只进入 `.floating-dock-surface` 内部，避免抬高整个胶囊。`.page-actions` 和共用 sheet 使用同一个来源完成各自的内容避让。
- IME inset 仅记录诊断，不会保存为 bottom safe-area。WebView 使用 `adjustResize`；Android、普通浏览器与 iOS standalone 的高度都由 CSS `100dvh` 负责。

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
- r15 新增真实 Chromium/localhost Service Worker 回归：验证新 worker 进入 `activated`、主动 claim 当前页面、旧 `meh-*` cache 被清理、r15 HTML/CSS/JS shell 完整，并在模拟离线后重新加载到 r15 CSS 与全屏背景。

## 诊断入口

- Debug APK：原生日志输出 API、导航模式、status/navigation/gesture/cutout/IME inset、density、CSS px、系统栏颜色和图标模式，以及根容器/WebView bounds、padding、margin。
- 网页：URL 加 `?debugInsets=1`，或控制台执行 `MehLayoutDiagnostics.enable()`；日志包含 standalone 状态、viewport、DPR、browser/native/final inset、根背景、各层 padding、dock bottom 和构建号。

## 本机可验证范围

- 已做静态全量关键词审计、JavaScript 语法检查、PWA 更新模拟、源码/assets 哈希一致性检查、Kotlin debug 编译和 JVM 单元测试。
- 已用桌面 Chromium 对 390×844 竖屏和 844×390 横屏做视觉检查，并自动遍历首页四个功能页、设置/自定义背景、预设编辑和随机数输入面板；另以 59/34 CSS px 和 24/30 CSS px 分别模拟 iOS、Android inset，验证底栏 0/5/10/20px 的 computed bottom 与物理边距一一对应。这仍不能替代 iOS safe-area 或 Android WindowInsets 真机验证。
- 未声称完成 iPhone、Android 10–15、手势/三键导航、打孔屏或 IME 真机矩阵；这些项目必须用真机或对应模拟器验证。
