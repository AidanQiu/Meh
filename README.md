# ![随便吧 / Meh 图标](icons/meh_icon.png) 随便吧 / Meh

「随便吧 / Meh」是一款简洁的决策辅助应用：在犹豫时，用一次随机结果帮你快速做出选择。它提供可安装的网页 PWA，也提供基于本地 WebView 的 Android APK。

网页会根据已选语言使用不同名称：中文为“随便吧”，其他语言为“Meh”。Android 当前应用标签为 “Meh”。网页核心资源由 Service Worker 缓存，因此在首次成功加载后，核心功能可在离线时继续使用。

## 主要功能

- 抛硬币：随机给出数字或无语脸图案结果，并保留本次页面会话的记录。
- 摇骰子：生成 1–6 的随机点数。
- 大转盘：编辑选项和权重、保存转盘预设，再随机抽取一个选项。
- 随机数：设置范围、数量与是否允许重复后批量生成随机数。
- 个性化设置：可调整主题颜色、深色模式、界面尺寸、语言和背景图片。

## iPhone / iPad 安装 PWA

推荐使用 Safari 打开在线版：[https://aidanqiu.github.io/Meh/](https://aidanqiu.github.io/Meh/)。无需从 App Store 安装。

1. 在 iPhone 或 iPad 上使用 Safari 打开上述网页。
2. 点击 Safari 底部或顶部的“分享”按钮。
3. 在分享菜单中选择“添加到主屏幕”。
4. 确认显示的名称。
5. 点击“添加”。
6. 回到主屏幕，点击图标即可像独立应用一样打开。

如果没有看到“添加到主屏幕”，请在分享菜单中继续向下滑动，或通过“编辑操作”将它加入菜单。添加后会获得接近独立应用的使用体验。

## Android 安装 APK

APK 发布在 [GitHub Releases](https://github.com/AidanQiu/Meh/releases)。进入最新版本，下载其中列出的 APK；当前已发布资源名为 `Meh-1.0.0-release.apk`。

1. 打开 [GitHub Releases](https://github.com/AidanQiu/Meh/releases) 并进入最新版本。
2. 下载 APK 文件。
3. 下载完成后，点击该 APK 开始安装。
4. 若系统提示不允许安装未知应用，进入提示页，临时允许当前浏览器或文件管理器安装未知应用。
5. 返回安装流程并完成安装，然后打开应用。
6. 安装完成后，可重新关闭“允许安装未知应用”。

请只从本项目官方 Releases 页面下载 APK，不要从来源不明的第三方网站下载修改版 APK。

## 功能介绍

### 抛硬币

每次操作都会随机显示数字 1 或无语脸图案，并在当前会话中记录结果。刷新或重新打开页面后，这些临时统计不会保留。

### 摇骰子

骰子会在动画结束后给出 1–6 之间的随机点数，并展示当前会话中的历史结果。

### 大转盘

转盘支持新增、编辑和保存预设；每项可配置权重。已保存的预设会存储在浏览器本地，便于下次继续使用。

### 随机数

可指定最小值、最大值、生成数量，以及是否允许重复；应用会在设定条件内生成随机数。

## 平台支持

| 平台 | 使用方式 |
| --- | --- |
| iOS / iPadOS | 通过 Safari 添加到主屏幕安装 PWA |
| Android | 通过浏览器使用 PWA，或安装 APK |
| Windows / macOS / Linux | 使用支持现代 Web 标准的浏览器直接打开在线版 |

Android APK 的最低支持版本为 Android 7.0（API 24）。网页 PWA 需要支持 Service Worker 的现代浏览器；Service Worker 仅在 `localhost` 或 HTTPS 环境下工作，GitHub Pages 使用 HTTPS。

## Material You 图标

Android 13 及以上设备可在支持的系统与桌面启动器中启用“主题图标”。系统会根据壁纸为图标自动取色；是否显示主题图标取决于系统和桌面启动器的支持。普通图标为黄色背景与黑色无语脸图案。

## 隐私和权限

项目不包含服务端或统计分析代码，网页代码也未发现向外部服务发送用户数据的请求。Android 清单未声明定位、相机、麦克风、联系人等敏感权限。

应用会在设备本地保存必要的使用设置：转盘预设、随机数设置、界面偏好等保存在浏览器本地存储；上传的背景图片使用 IndexedDB 保存。Android 版通过 WebView 加载 APK 内置的本地网页资源，并启用 DOM 存储以支持这些本地设置。

## 更新应用

### PWA

在线页面更新后通常会在下次访问时获取新版资源。若仍显示旧内容，请关闭后重新打开应用；必要时清除该网站的缓存后再访问。

### Android APK

从 [GitHub Releases](https://github.com/AidanQiu/Meh/releases) 下载新版 APK。若新旧 APK 使用相同签名，可以覆盖安装；本项目的设置保存在 WebView 本地存储中，是否保留取决于安装/卸载方式与系统处理，升级前建议自行确认重要的本地预设。

## 开发与构建

网页使用 HTML、CSS 和 JavaScript；Android 工程位于 [android/](android/)，使用 Kotlin。它通过 `WebViewAssetLoader` 加载 [android/app/src/main/assets/www/](android/app/src/main/assets/www/) 中的本地网页资源。

当前 Android 配置为：`minSdk 24`、`compileSdk 36`、`targetSdk 36`、`versionCode 1`、`versionName 1.0`；构建环境由项目的 Gradle Wrapper（Gradle 8.13）配置，并需要 Android Studio、JDK 11 和已安装的 Android SDK 36。

1. 克隆仓库。
2. 使用 Android Studio 打开 [android/](android/) 文件夹。
3. 等待 Gradle Sync 完成。
4. 选择模拟器或实体设备。
5. 点击 Run 运行调试版本。
6. 通过 Build → Generate Signed Bundle / APK 生成正式 APK。

请勿将 keystore、签名密码或本机 `local.properties` 提交到仓库。

## 网页开发

请通过本地 HTTP 服务运行网页，例如 VS Code Live Server；不要直接双击打开 [index.html](index.html)。Service Worker 通常需要 `localhost` 或 HTTPS 才能注册。

根目录网页文件与 [android/app/src/main/assets/www/](android/app/src/main/assets/www/) 存在副本。修改网页代码后，请同步更新 Android `assets/www` 中对应的文件；仓库当前未提供自动同步脚本。

## 项目结构

```text
.
├── index.html                    # 网页入口
├── style.css                     # 网页样式
├── app.js                        # 交互与随机逻辑
├── service-worker.js             # PWA 离线缓存
├── manifest*.webmanifest         # PWA 安装清单
├── fonts/                        # 本地字体
├── icons/                        # 网页图标资源
├── icons/meh_icon.png            # 项目图标
└── android/
    ├── gradlew*                  # Gradle Wrapper
    └── app/src/main/
        ├── assets/www/           # Android 内置网页副本
        ├── java/                 # Kotlin WebView 代码
        └── res/                  # 布局、Adaptive Icon 与其他 Android 资源
```

## 下载

- 在线使用：[https://aidanqiu.github.io/Meh/](https://aidanqiu.github.io/Meh/)
- Android APK：[GitHub Releases](https://github.com/AidanQiu/Meh/releases)

## 常见问题

### iPhone 为什么没有 APK？

APK 是 Android 的安装包格式。iPhone 和 iPad 请通过 Safari 将网页添加到主屏幕。

### 为什么 iOS 要通过 Safari 添加到主屏幕？

iOS / iPadOS 的网页应用安装入口位于 Safari 的分享菜单，无需从 App Store 下载。

### Android 为什么提示未知来源？

从浏览器或文件管理器安装 APK 时，Android 会要求针对该来源单独授权。这是系统安装保护机制。

### 为什么 Material You 图标没有显示？

主题图标需要 Android 13 以上，并且系统和桌面启动器都支持该功能。

### 为什么更新网页后仍然显示旧内容？

PWA 会缓存资源。请关闭后重新打开，或清除该网站缓存后再试。

### 为什么 APK 无法覆盖安装？

通常是新旧 APK 的应用 ID 或签名不同，或版本号不符合升级要求。请使用同一发布渠道的正式包。

### 网页版和 APK 版有什么区别？

两者提供同一套网页功能。网页版由浏览器运行并可安装为 PWA；APK 将本地网页资源封装在 Android WebView 中。

## 开源许可证

当前仓库暂未添加明确的开源许可证。

## 版本信息

当前 Android 配置版本：`versionName 1.0`（`versionCode 1`）。
