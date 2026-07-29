// Meh 基础框架：负责导航、设置面板、主题和缩放持久化。
// 当前阶段已实现四个页面：抛硬币、摇骰子、大转盘、随机数。
const STORAGE_KEY = "meh-shell-state-v1";
const WHEEL_PRESETS_KEY = "meh-wheel-presets-v1";
const NUMBER_SETTINGS_KEY = "meh-number-settings-v1";
const APP_SETTINGS_KEY = "meh-app-settings-v2";

const offlineIconPaths = {
  add: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
  casino:
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4v2h2V7H7zm8 0v2h2V7h-2zm-4 4v2h2v-2h-2zm-4 4v2h2v-2H7zm8 0v2h2v-2h-2z",
  close: "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z",
  dark_mode: "M21 14.3A8.5 8.5 0 0 1 9.7 3 7 7 0 1 0 21 14.3z",
  data_usage:
    "M12 3a9 9 0 1 1-6.4 2.6l1.4 1.4A7 7 0 1 0 12 5V3zm-1 1h2v8h-2V4zm1 13a5 5 0 0 1-4.6-3H5.3A7 7 0 0 0 12 19v-2z",
  delete:
    "M7 21a2 2 0 0 1-2-2V8h14v11a2 2 0 0 1-2 2H7zM9 4h6l1 2h4v2H4V6h4l1-2zm0 6v7h2v-7H9zm4 0v7h2v-7h-2z",
  edit:
    "M5 18.1V21h2.9L18.6 10.3l-2.9-2.9L5 18.1zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.2 3.2L20.7 7z",
  expand_more: "M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z",
  history: "M13 3a9 9 0 1 1-8.3 5.5H2l3.8-3.8L9.6 8.5H6.8A7 7 0 1 0 13 5v5l4 2-.9 1.6L11 10.7V3h2z",
  image:
    "M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2zm1 11h12l-4-5-3 4-2-2.5L6 16zm2-7.5A1.5 1.5 0 1 0 8 5a1.5 1.5 0 0 0 0 3z",
  language:
    "M12.9 15.5a15 15 0 0 0 2.6-5.5H18V8h-6V5h-2v3H4v2h9.4a12.5 12.5 0 0 1-2 4.1A13 13 0 0 1 9.7 12h-2.3a16 16 0 0 0 2.6 3.5l-3.2 3.2L8.2 20l3.2-3.2 2 2 1.4-1.4-1.9-1.9zM18 12h2l3 8h-2l-.6-1.8h-2.8L17 20h-2l3-8zm-.8 4.7h1.8l-.9-2.7-.9 2.7z",
  more_horiz: "M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  paid:
    "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 4h-2v2.1c-1.8.3-3 1.4-3 3 0 1.9 1.6 2.7 4 3.2 1.6.4 2 .8 2 1.4 0 .7-.7 1.2-1.8 1.2-1.3 0-2.4-.5-3.2-1.3l-1.3 1.5c.9.9 2 1.4 3.3 1.6V20h2v-2.1c1.9-.3 3.2-1.5 3.2-3.1 0-1.9-1.3-2.8-3.9-3.4-1.8-.4-2.2-.7-2.2-1.3 0-.6.6-1.1 1.7-1.1 1 0 1.9.3 2.8 1l1.2-1.6c-.8-.7-1.7-1.1-2.8-1.3V6z",
  palette:
    "M12 3a9 9 0 0 0 0 18h1.5a1.8 1.8 0 0 0 1.2-3.1 1.2 1.2 0 0 1 .8-2.1H17a6 6 0 0 0 0-12h-5zm-4 7a1.4 1.4 0 1 1 0-2.8A1.4 1.4 0 0 1 8 10zm3-3a1.4 1.4 0 1 1 0-2.8A1.4 1.4 0 0 1 11 7zm5 3a1.4 1.4 0 1 1 0-2.8A1.4 1.4 0 0 1 16 10zM7 14a1.4 1.4 0 1 1 0-2.8A1.4 1.4 0 0 1 7 14z",
  query_stats:
    "M4 19h16v2H2V3h2v16zm3-2V9h3v8H7zm5 0V5h3v12h-3zm5 0v-6h3v6h-3zM18.5 4 21 6.5l-1.4 1.4-.8-.8-3.6 3.6-2-2L9.4 12 8 10.6l5.2-5.2 2 2 2.2-2.2-.8-.8L18.5 4z",
  info:
    "M11 10h2v7h-2v-7zm0-4h2v2h-2V6zm1-4a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
  settings:
    "M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 3a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z",
  tag: "M20 10v10H4V10h16zM6 12v6h12v-6H6zm5-8h2v5h-2V4zM5 6h4v2H5V6zm10 0h4v2h-4V6z",
  tune:
    "M3 6h10v2H3V6zm12-1h2v4h-2V5zm2 1h4v2h-4V6zM3 16h4v2H3v-2zm6-1h2v4H9v-4zm2 1h10v2H11v-2z",
};

const i18n = {
  zh: {
    appName: "随便吧",
    coin: "抛硬币",
    dice: "摇骰子",
    wheel: "大转盘",
    number: "随机数",
    settings: "设置",
    reset: "清零",
    continue: "继续",
    start: "开始",
    lastTime: "上一次",
    lastRound: "上一轮",
    nthTime: "第 {n} 次",
    nthRound: "第 {n} 轮",
    numberSide: "数字面",
    patternSide: "图案面",
    displaySize: "显示大小",
    themeColor: "主题颜色",
    primaryThemeColor: "首选主题色（背景）",
    secondaryThemeColor: "次选主题色（字体/按钮）",
    darkMode: "深色模式",
    lightMode: "浅色",
    darkModeOnly: "深色",
    autoMode: "自动",
    personalization: "个性化",
    topHeight: "顶部高度",
    dockThickness: "竖向厚度",
    dockSideGap: "左右边距",
    dockBottomGap: "离底部距离",
    backgroundImage: "自定义背景图",
    backgroundOpacity: "背景图透明度",
    clear: "清除",
    uploadWallpaper: "上传壁纸",
    deleteWallpaper: "删除壁纸",
    exitDeleteWallpaper: "退出删除壁纸",
    removeWallpaper: "移除壁纸",
    language: "语言",
    min: "最小值",
    max: "最大值",
    count: "生成数量",
    allowRepeat: "允许重复",
    latestResult: "最近结果",
    noResult: "暂无结果",
    noHistory: "还没有历史结果",
    editWheel: "编辑转盘",
    tuneNumber: "设置随机数范围",
    wheelEditorTitle: "编辑预设",
    choosePreset: "当前预设",
    saveName: "保存名称",
    optionCount: "选项数量",
    optionWeight: "选项和权重",
    add: "添加",
    saveWheelPreset: "保存当前转盘预设",
    newPreset: "新增预设",
    unnamedWheelPreset: "未命名转盘",
    defaultWheelPreset: "默认转盘",
    option: "选项",
    coinFlipping: "抛起中",
    coinFlippingHint: "硬币正在翻转。",
    coinNumberHint: "这次结果是数字 1。",
    coinPatternHint: "这次结果是随便表情。",
    coinReadyTitle: "准备抛硬币",
    coinReadyHint: "点击继续开始第一次抛硬币。",
    diceRolling: "摇动中",
    diceRollingHint: "骰子正在翻滚。",
    diceResultHint: "这是刚刚摇出的结果。",
    diceReadyTitle: "准备摇骰子",
    diceReadyHint: "点击继续开始第一次摇骰子。",
    point: "点",
    wheelSpinning: "旋转中",
    wheelSpinningHint: "旋转中...",
    wheelReadyTitle: "准备转动",
    wheelReadyHint: "点击继续，让转盘帮你选一个。",
    numberReadyTitle: "准备生成",
    numberReadyHint: "默认范围是 {range}，点击继续生成随机数。",
    numberSingleHint: "这个数字来自 {range}。",
    numberGroupTitle: "随机数组",
    numberGroupHint: "这一组数字来自 {range}。",
    rangeTo: "{min} 到 {max}",
    aboutVersion: "关于 / 版本",
    webVersion: "Web 版本",
    buildVersion: "构建",
    checkUpdate: "检查更新",
    viewGithubProject: "查看 GitHub 项目",
    updateChecking: "正在检查…",
    updateInstalling: "正在更新…",
    updateLatest: "已是最新版本",
    updateOffline: "当前离线，暂时无法检查更新",
    updateUnavailable: "当前环境不支持 PWA 更新检查",
    updateError: "暂时无法检查更新",
  },
  en: {
    appName: "Meh",
    coin: "Coin",
    dice: "Dice",
    wheel: "Wheel",
    number: "Random",
    settings: "Settings",
    reset: "Reset",
    continue: "Continue",
    start: "Start",
    lastTime: "Last",
    lastRound: "Last round",
    nthTime: "Run {n}",
    nthRound: "Round {n}",
    numberSide: "Number side",
    patternSide: "Pattern side",
    displaySize: "Display size",
    themeColor: "Theme color",
    primaryThemeColor: "Primary theme color (background)",
    secondaryThemeColor: "Secondary theme color (text/buttons)",
    darkMode: "Dark mode",
    lightMode: "Light",
    darkModeOnly: "Dark",
    autoMode: "Auto",
    personalization: "Personalization",
    topHeight: "Top height",
    dockThickness: "Dock height",
    dockSideGap: "Side margins",
    dockBottomGap: "Bottom spacing",
    backgroundImage: "Custom background",
    backgroundOpacity: "Background opacity",
    clear: "Clear",
    uploadWallpaper: "Upload wallpaper",
    deleteWallpaper: "Delete wallpapers",
    exitDeleteWallpaper: "Exit delete mode",
    removeWallpaper: "Remove wallpaper",
    language: "Language",
    min: "Minimum",
    max: "Maximum",
    count: "Generate count",
    allowRepeat: "Allow repeats",
    latestResult: "Recent results",
    noResult: "No result",
    noHistory: "No history yet",
    editWheel: "Edit wheel",
    tuneNumber: "Number settings",
    wheelEditorTitle: "Edit preset",
    choosePreset: "Current preset",
    saveName: "Save name",
    optionCount: "Option count",
    optionWeight: "Options and weights",
    add: "Add",
    saveWheelPreset: "Save current wheel preset",
    newPreset: "New preset",
    unnamedWheelPreset: "Untitled wheel",
    defaultWheelPreset: "Default wheel",
    option: "Option",
    coinFlipping: "Flipping",
    coinFlippingHint: "The coin is flipping.",
    coinNumberHint: "The result is number 1.",
    coinPatternHint: "The result is the meh face.",
    coinReadyTitle: "Ready to flip",
    coinReadyHint: "Tap Continue to flip the first coin.",
    diceRolling: "Rolling",
    diceRollingHint: "The die is rolling.",
    diceResultHint: "This is the result you just rolled.",
    diceReadyTitle: "Ready to roll",
    diceReadyHint: "Tap Continue to roll the first die.",
    point: "pts",
    wheelSpinning: "Spinning",
    wheelSpinningHint: "Spinning...",
    wheelResultHint: "This is the option just selected.",
    wheelReadyTitle: "Ready to spin",
    wheelReadyHint: "Tap Continue and let the wheel choose.",
    numberReadyTitle: "Ready",
    numberReadyHint: "Default range is {range}. Tap Continue to generate.",
    numberSingleHint: "This number is from {range}.",
    numberGroupTitle: "Random group",
    numberGroupHint: "This group is from {range}.",
    rangeTo: "{min} to {max}",
    aboutVersion: "About / Version",
    webVersion: "Web version",
    buildVersion: "Build",
    checkUpdate: "Check for updates",
    viewGithubProject: "View project on GitHub",
    updateChecking: "Checking…",
    updateInstalling: "Updating…",
    updateLatest: "Up to date",
    updateOffline: "Offline; updates cannot be checked right now",
    updateUnavailable: "PWA updates are unavailable in this environment",
    updateError: "Unable to check for updates right now",
  },
  ja: {
    appName: "まかせる",
    coin: "コイン",
    dice: "サイコロ",
    wheel: "ルーレット",
    number: "乱数",
    settings: "設定",
    reset: "クリア",
    continue: "続ける",
    start: "開始",
    lastTime: "前回",
    lastRound: "前回",
    nthTime: "{n}回目",
    nthRound: "{n}周目",
    numberSide: "数字面",
    patternSide: "模様面",
    displaySize: "表示サイズ",
    themeColor: "テーマカラー",
    primaryThemeColor: "メイン色（背景）",
    secondaryThemeColor: "サブ色（文字/ボタン）",
    darkMode: "ダークモード",
    lightMode: "ライト",
    darkModeOnly: "ダーク",
    autoMode: "自動",
    personalization: "カスタマイズ",
    topHeight: "上部の高さ",
    dockThickness: "ドックの高さ",
    dockSideGap: "左右の余白",
    dockBottomGap: "下部の距離",
    backgroundImage: "背景画像",
    backgroundOpacity: "背景画像の透明度",
    clear: "クリア",
    uploadWallpaper: "壁紙をアップロード",
    deleteWallpaper: "壁紙を削除",
    exitDeleteWallpaper: "削除モードを終了",
    removeWallpaper: "壁紙を削除",
    language: "言語",
    min: "最小値",
    max: "最大値",
    count: "生成数",
    allowRepeat: "重複を許可",
    latestResult: "最近の結果",
    noResult: "結果なし",
    noHistory: "履歴はまだありません",
    editWheel: "ルーレット編集",
    tuneNumber: "乱数設定",
    wheelEditorTitle: "プリセット編集",
    choosePreset: "現在のプリセット",
    saveName: "保存名",
    optionCount: "項目数",
    optionWeight: "項目と重み",
    add: "追加",
    saveWheelPreset: "現在のプリセットを保存",
    newPreset: "新規プリセット",
    unnamedWheelPreset: "名前なしルーレット",
    defaultWheelPreset: "標準ルーレット",
    option: "項目",
    coinFlipping: "投げています",
    coinFlippingHint: "コインが回転しています。",
    coinNumberHint: "結果は数字 1 です。",
    coinPatternHint: "結果はぼんやり顔です。",
    coinReadyTitle: "コイン準備",
    coinReadyHint: "続けるを押して最初のコインを投げます。",
    diceRolling: "転がしています",
    diceRollingHint: "サイコロが転がっています。",
    diceResultHint: "いま出た結果です。",
    diceReadyTitle: "サイコロ準備",
    diceReadyHint: "続けるを押して最初のサイコロを振ります。",
    point: "点",
    wheelSpinning: "回転中",
    wheelSpinningHint: "回転中...",
    wheelResultHint: "いま当たった項目です。",
    wheelReadyTitle: "回転準備",
    wheelReadyHint: "続けるを押してルーレットに選ばせます。",
    numberReadyTitle: "生成準備",
    numberReadyHint: "範囲は {range} です。続けるで生成します。",
    numberSingleHint: "この数字は {range} から生成されました。",
    numberGroupTitle: "乱数グループ",
    numberGroupHint: "この数字群は {range} から生成されました。",
    rangeTo: "{min} から {max}",
    aboutVersion: "情報 / バージョン",
    webVersion: "Web バージョン",
    buildVersion: "ビルド",
    checkUpdate: "更新を確認",
    viewGithubProject: "GitHub でプロジェクトを見る",
    updateChecking: "確認中…",
    updateInstalling: "更新中…",
    updateLatest: "最新バージョンです",
    updateOffline: "オフラインのため更新を確認できません",
    updateUnavailable: "この環境では PWA 更新を確認できません",
    updateError: "現在、更新を確認できません",
  },
  kk: {
    appName: "Таңдай сал",
    coin: "Тиын",
    dice: "Зар",
    wheel: "Дөңгелек",
    number: "Сан",
    settings: "Баптаулар",
    reset: "Тазалау",
    continue: "Жалғастыру",
    start: "Бастау",
    lastTime: "Соңғысы",
    lastRound: "Соңғы айналым",
    nthTime: "{n}-рет",
    nthRound: "{n}-айналым",
    numberSide: "Сан жағы",
    patternSide: "Өрнек жағы",
    displaySize: "Көрініс өлшемі",
    themeColor: "Тақырып түсі",
    primaryThemeColor: "Негізгі түс (фон)",
    secondaryThemeColor: "Қосымша түс (мәтін/батырма)",
    darkMode: "Қараңғы режим",
    lightMode: "Жарық",
    darkModeOnly: "Қараңғы",
    autoMode: "Авто",
    personalization: "Жекелеу",
    topHeight: "Жоғарғы биіктік",
    dockThickness: "Төменгі жолақ биіктігі",
    dockSideGap: "Бүйір аралығы",
    dockBottomGap: "Төменгі аралық",
    backgroundImage: "Фон суреті",
    backgroundOpacity: "Фон мөлдірлігі",
    clear: "Тазалау",
    uploadWallpaper: "Фон суретін жүктеу",
    deleteWallpaper: "Фондарды өшіру",
    exitDeleteWallpaper: "Өшіру режимінен шығу",
    removeWallpaper: "Фонды жою",
    language: "Тіл",
    min: "Ең кіші мән",
    max: "Ең үлкен мән",
    count: "Саны",
    allowRepeat: "Қайталауға рұқсат",
    latestResult: "Соңғы нәтижелер",
    noResult: "Нәтиже жоқ",
    noHistory: "Тарих әлі жоқ",
    editWheel: "Дөңгелекті өңдеу",
    tuneNumber: "Сан баптауы",
    wheelEditorTitle: "Үлгіні өңдеу",
    choosePreset: "Қазіргі үлгі",
    saveName: "Атын сақтау",
    optionCount: "Нұсқа саны",
    optionWeight: "Нұсқалар мен салмақ",
    add: "Қосу",
    saveWheelPreset: "Қазіргі дөңгелек үлгісін сақтау",
    newPreset: "Жаңа үлгі",
    unnamedWheelPreset: "Атаусыз дөңгелек",
    defaultWheelPreset: "Әдепкі дөңгелек",
    option: "Нұсқа",
    coinFlipping: "Лақтырылып жатыр",
    coinFlippingHint: "Тиын айналып жатыр.",
    coinNumberHint: "Нәтиже — 1 саны.",
    coinPatternHint: "Нәтиже — бейтарап бет.",
    coinReadyTitle: "Тиын дайын",
    coinReadyHint: "Алғашқы тиынды лақтыру үшін Жалғастыруды басыңыз.",
    diceRolling: "Домалап жатыр",
    diceRollingHint: "Зар домалап жатыр.",
    diceResultHint: "Бұл жаңа түскен нәтиже.",
    diceReadyTitle: "Зар дайын",
    diceReadyHint: "Алғашқы зарды тастау үшін Жалғастыруды басыңыз.",
    point: "ұпай",
    wheelSpinning: "Айналып жатыр",
    wheelSpinningHint: "Айналып жатыр...",
    wheelResultHint: "Жаңа түскен нұсқа осы.",
    wheelReadyTitle: "Айналдыруға дайын",
    wheelReadyHint: "Жалғастыруды басып, дөңгелекке таңдауды тапсырыңыз.",
    numberReadyTitle: "Дайын",
    numberReadyHint: "Әдепкі аралық: {range}. Генерация үшін Жалғастыруды басыңыз.",
    numberSingleHint: "Бұл сан {range} аралығынан алынды.",
    numberGroupTitle: "Сандар тобы",
    numberGroupHint: "Бұл сандар {range} аралығынан алынды.",
    rangeTo: "{min} - {max}",
    aboutVersion: "Қолданба туралы / Нұсқа",
    webVersion: "Web нұсқасы",
    buildVersion: "Құрастырылым",
    checkUpdate: "Жаңартуды тексеру",
    viewGithubProject: "GitHub жобасын ашу",
    updateChecking: "Тексерілуде…",
    updateInstalling: "Жаңартылуда…",
    updateLatest: "Соңғы нұсқа орнатылған",
    updateOffline: "Қазір офлайн, жаңартуды тексеру мүмкін емес",
    updateUnavailable: "Бұл ортада PWA жаңартуын тексеру мүмкін емес",
    updateError: "Жаңартуды қазір тексеру мүмкін емес",
  },
};

const pages = {
  coin: {
    title: "抛硬币",
    icon: "paid",
    copy: "点击继续，让硬币替你做一次轻量决定。",
  },
  dice: {
    title: "摇骰子",
    icon: "casino",
    copy: "点击继续，摇出一个 1 到 6 的点数。",
  },
  wheel: {
    title: "大转盘",
    icon: "data_usage",
    copy: "点击继续，让转盘在选项里挑一个。",
  },
  number: {
    title: "随机数",
    icon: "tag",
    copy: "点击继续，在设定范围内生成随机数。",
  },
};

const wheelColors = [
  "#c9b8f5",
  "#9be3ce",
  "#f5bdcb",
  "#ffd086",
  "#9dccf3",
  "#d8bfd2",
  "#b9dfae",
  "#f2b8a8",
  "#c5d98b",
  "#f0c38f",
  "#b8c7f0",
  "#e0b7db",
];
const wheelDarkColors = [
  "#7f6ac3",
  "#4c9d87",
  "#b7687b",
  "#b77f36",
  "#4d7fb0",
  "#8c6389",
  "#6f985e",
  "#b06d5d",
  "#7e9442",
  "#a87543",
  "#6377b0",
  "#9b5d94",
];

const defaultWheelOptions = [
  { text: "选项 1", weight: 1 },
  { text: "选项 2", weight: 1 },
  { text: "选项 3", weight: 1 },
  { text: "选项 4", weight: 1 },
];

const defaultNumberSettings = {
  min: 1,
  max: 100,
  count: 1,
  allowRepeat: true,
};

const defaultState = {
  page: "coin",
};
function detectInitialLanguage() {
  const supportedLanguages = ["zh", "en", "ja", "kk"];
  const browserLanguages = navigator.languages || [navigator.language || "en"];
  return browserLanguages
    .map((language) => String(language).toLowerCase().split("-")[0])
    .find((language) => supportedLanguages.includes(language)) || "en";
}

const defaultAppSettings = {
  primaryThemeColor: "#6b9c94",
  secondaryThemeColor: "#6750a4",
  uiScale: 1,
  // The real safe-area inset already clears the status bar; this is user spacing only.
  topHeight: 0,
  dockThickness: 58,
  dockSideGap: 28,
  dockBottomGap: 18,
  darkMode: "auto",
  backgroundImage: "",
  activeWallpaperId: "",
  backgroundOpacity: 0.5,
  language: detectInitialLanguage(),
  systemBarLayoutVersion: 6,
};
const primarySwatches = ["#e8e3e8", "#c9b0f6", "#94e8bd", "#87c7f4", "#f9aaa5", "#55beb4", "#ffbd4a",  "#ffffff", "#2d7434"];
const secondarySwatches = ["#4f6670", "#6750a4", "#0b7f86", "#0b6ecb", "#bf4d00", "#2d7434", "#ad1f4f", "#000000",  "#6b9c94"];
const languageNames = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  kk: "Қазақша",
};
const WALLPAPER_DB_NAME = "meh-wallpapers-db";
const WALLPAPER_STORE_NAME = "wallpapers";
const MAX_WALLPAPERS = 16;
let wallpapers = [];
let isWallpaperDeleteMode = false;
const customPickerState = {
  primary: { hue: 0, saturation: 0.65, value: 0.78 },
  secondary: { hue: 0, saturation: 0.65, value: 0.78 },
};
let dockSuppressClick = false;

// 功能统计按阶段要求只放在当前 JS 状态里，不写入 localStorage。
const coinState = {
  result: null,
  isFlipping: false,
  history: [],
  stats: {
    number: 0,
    pattern: 0,
  },
};

const diceState = {
  result: null,
  displayValue: 1,
  isRolling: false,
  history: [],
};

const wheelState = {
  result: null,
  isSpinning: false,
  history: [],
  options: cloneOptions(defaultWheelOptions),
  presets: [],
  selectedPresetId: "",
  rotation: 0,
  duration: 3000,
  historyExpanded: false,
};

const numberState = {
  result: null,
  history: [],
  historyExpanded: false,
  shouldAnimate: false,
  settings: { ...defaultNumberSettings },
};

let state = loadState();
let appSettings = loadAppSettings();
let coinFlipTimer = null;
let diceRollTimer = null;
let diceFaceTimer = null;
let diceFaceTimers = [];
let wheelSpinTimer = null;
let renderedNavigationState = {
  mehApp: true,
  screen: "home",
  depth: 0,
  params: {},
};
const navigationScrollPositions = new Map();
let pageScrollLock = {
  active: false,
  y: 0,
  htmlOverflow: "",
  bodyStyles: null,
};

const els = {
  root: document.documentElement,
  topBar: document.querySelector("#topBar"),
  appName: document.querySelector("#appName"),
  pageTitle: document.querySelector("#pageTitle"),
  pageContent: document.querySelector("#pageContent"),
  topStats: document.querySelector("#topStats"),
  dock: document.querySelector(".floating-dock"),
  dockSurface: document.querySelector(".floating-dock-surface"),
  dockContent: document.querySelector(".floating-dock-content"),
  dockIndicator: document.querySelector("#dockIndicator"),
  dockItems: document.querySelectorAll(".dock-item"),
  settingsButton: document.querySelector("#settingsButton"),
  featureButton: document.querySelector("#featureButton"),
  closeSettingsButton: document.querySelector("#closeSettingsButton"),
  settingsSheet: document.querySelector("#settingsSheet"),
  wheelEditorSheet: document.querySelector("#wheelEditorSheet"),
  closeWheelEditorButton: document.querySelector("#closeWheelEditorButton"),
  numberSettingsSheet: document.querySelector("#numberSettingsSheet"),
  closeNumberSettingsButton: document.querySelector("#closeNumberSettingsButton"),
  scrim: document.querySelector("#scrim"),
  primaryThemeColorInput: document.querySelector("#primaryThemeColorInput"),
  secondaryThemeColorInput: document.querySelector("#secondaryThemeColorInput"),
  primarySwatches: document.querySelector("#primarySwatches"),
  secondarySwatches: document.querySelector("#secondarySwatches"),
  uiScaleRange: document.querySelector("#uiScaleRange"),
  uiScaleValue: document.querySelector("#uiScaleValue"),
  topHeightRange: document.querySelector("#topHeightRange"),
  topHeightValue: document.querySelector("#topHeightValue"),
  dockThicknessRange: document.querySelector("#dockThicknessRange"),
  dockThicknessValue: document.querySelector("#dockThicknessValue"),
  dockSideGapRange: document.querySelector("#dockSideGapRange"),
  dockSideGapValue: document.querySelector("#dockSideGapValue"),
  dockBottomGapRange: document.querySelector("#dockBottomGapRange"),
  dockBottomGapValue: document.querySelector("#dockBottomGapValue"),
  presetWallpaperGrid: document.querySelector("#presetWallpaperGrid"),
  backgroundImageInput: document.querySelector("#backgroundImageInput"),
  clearBackgroundButton: document.querySelector("#clearBackgroundButton"),
  wallpaperDeleteToggle: document.querySelector("#wallpaperDeleteToggle"),
  languageSelect: document.querySelector("#languageSelect"),
  languageMenuButton: document.querySelector("#languageMenuButton"),
  languageMenuText: document.querySelector("#languageMenuText"),
  languageMenu: document.querySelector("#languageMenu"),
  darkModeSelect: document.querySelector("#darkModeSelect"),
  darkModeMenuButton: document.querySelector("#darkModeMenuButton"),
  darkModeMenuText: document.querySelector("#darkModeMenuText"),
  darkModeMenu: document.querySelector("#darkModeMenu"),
  bgOpacityRange: document.querySelector("#bgOpacityRange"),
  bgOpacityValue: document.querySelector("#bgOpacityValue"),
  pageActions: document.querySelector("#pageActions"),
  resetButton: document.querySelector("#resetButton"),
  continueButton: document.querySelector("#continueButton"),
  wheelPresetSelect: document.querySelector("#wheelPresetSelect"),
  wheelPresetList: document.querySelector("#wheelPresetList"),
  wheelPresetName: document.querySelector("#wheelPresetName"),
  wheelOptionCount: document.querySelector("#wheelOptionCount"),
  wheelOptionList: document.querySelector("#wheelOptionList"),
  addWheelPresetButton: document.querySelector("#addWheelPresetButton"),
  addWheelOptionButton: document.querySelector("#addWheelOptionButton"),
  saveWheelPresetButton: document.querySelector("#saveWheelPresetButton"),
  numberMinInput: document.querySelector("#numberMinInput"),
  numberMaxInput: document.querySelector("#numberMaxInput"),
  numberCountInput: document.querySelector("#numberCountInput"),
  numberRepeatInput: document.querySelector("#numberRepeatInput"),
  saveNumberSettingsButton: document.querySelector("#saveNumberSettingsButton"),
  checkUpdateButton: document.querySelector("#checkUpdateButton"),
  pwaUpdateStatus: document.querySelector("#pwaUpdateStatus"),
  githubProjectLink: document.querySelector("#githubProjectLink"),
};

let layoutDiagnosticTimer = 0;
let lastLayoutDiagnosticSignature = "";
let stableViewportHeight = 0;
let keyboardViewportController = null;

keyboardViewportController = createKeyboardViewportController();
window.MehKeyboardViewport = keyboardViewportController;

init();

async function init() {
  installSafeAreaDebugMode();
  logStandaloneStartupDiagnostics();
  window.setTimeout(() => logServiceWorkerDiagnostics(), 1000);
  requestPersistentStorage();
  syncPwaAppHeight();

  const runtime = window.MehPlatform.androidApp
    ? "Android WebView"
    : window.MehPlatform.standalone
      ? "PWA standalone"
      : "browser";
  console.info(`[Meh] Runtime environment: ${runtime}`);

  numberState.settings = loadNumberSettings();
  wheelState.presets = loadWheelPresets();
  if (wheelState.presets.length) {
    applyWheelPreset(wheelState.presets[0].id);
  }

  await initSettings();
  bindEvents();
  applyI18n();
  renderPage();
  configureNavigation();
  hydrateOfflineIcons();
  scheduleLayoutDiagnostics("initial-render");
}

function renderIconElement(iconElement, iconName) {
  if (!iconElement) return;
  const name = iconName || iconElement.dataset.icon || iconElement.textContent.trim();
  iconElement.dataset.icon = name;
  iconElement.textContent = name;
}

function hydrateOfflineIcons(root = document) {
  root.querySelectorAll(".material-symbols-rounded").forEach((iconElement) => {
    renderIconElement(iconElement);
  });
}

function bindEvents() {
  els.dockItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      if (dockSuppressClick) {
        event.preventDefault();
        return;
      }
      setPage(item.dataset.page);
    });
  });

  els.settingsButton.addEventListener("click", openSettings);
  els.featureButton.addEventListener("click", handleFeatureButton);
  els.closeSettingsButton.addEventListener("click", () => window.mehNavigation.back("ui-button"));
  els.closeWheelEditorButton.addEventListener("click", () => window.mehNavigation.back("ui-button"));
  els.closeNumberSettingsButton.addEventListener("click", () => window.mehNavigation.back("ui-button"));
  els.scrim.addEventListener("click", () => window.mehNavigation.back("ui-button"));
  bindSheetHandleGestures();
  bindDockDragGesture();

  els.resetButton.addEventListener("click", handleReset);
  els.continueButton.addEventListener("click", handleContinue);

  els.wheelPresetSelect.addEventListener("change", () => {
    applyWheelPreset(els.wheelPresetSelect.value);
    renderWheelEditor();
    renderWheelPageIfActive();
  });
  els.wheelPresetName.addEventListener("input", updateCurrentWheelPresetName);
  els.wheelOptionCount.addEventListener("change", syncWheelOptionCount);
  els.addWheelPresetButton.addEventListener("click", createNewWheelPreset);
  els.addWheelOptionButton.addEventListener("click", addWheelOption);
  els.saveWheelPresetButton.addEventListener("click", saveCurrentWheelPreset);
  els.saveNumberSettingsButton.addEventListener("click", saveNumberSettingsFromPanel);
  els.checkUpdateButton?.addEventListener("click", async () => {
    setPwaUpdateStatus("checking");
    if (window.MehAndroid?.checkForUpdates) {
      els.checkUpdateButton.disabled = true;
      console.info("[Meh] Manual Android update check requested");
      window.MehAndroid.checkForUpdates();
      return;
    }
    await window.MehPwaUpdate?.checkForUpdates({ manual: true, force: true });
  });
  els.githubProjectLink?.addEventListener("click", (event) => {
    if (!window.MehAndroid?.openProjectPage) return;
    event.preventDefault();
    window.MehAndroid.openProjectPage();
  });
  window.MehAndroidUpdateResult = (status) => {
    if (els.checkUpdateButton) els.checkUpdateButton.disabled = false;
    setPwaUpdateStatus(status === "available" ? "" : status);
  };
  if (window.MehAndroid?.getVersionName) {
    const detail = document.querySelector("#androidVersionDetail");
    const value = document.querySelector("#androidVersionValue");
    if (detail && value) {
      value.textContent = String(window.MehAndroid.getVersionName());
      detail.hidden = false;
    }
  }
  window.addEventListener("meh:pwa-update-status", (event) => {
    setPwaUpdateStatus(event.detail?.status);
  });
  if (window.MehPwaUpdate?.status) setPwaUpdateStatus(window.MehPwaUpdate.status);
  window.addEventListener("resize", () => {
    updateDockIndicator();
    scheduleLayoutDiagnostics("window-resize");
    keyboardViewportController.handleViewportChange("window-resize");
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      scheduleLayoutDiagnostics("visual-viewport-resize");
      keyboardViewportController.handleViewportChange("visual-viewport-resize");
    });
    window.visualViewport.addEventListener("scroll", () => {
      scheduleLayoutDiagnostics("visual-viewport-scroll");
      keyboardViewportController.handleViewportChange("visual-viewport-scroll");
    });
  }
  window.addEventListener("orientationchange", () => {
    keyboardViewportController.handleOrientationChange();
    scheduleLayoutDiagnostics("orientation-change");
  });
  window.addEventListener("pageshow", () => {
    keyboardViewportController.requestSettle("page-show");
    scheduleLayoutDiagnostics("page-show");
  });
  document.addEventListener("focusin", (event) => {
    if (!isKeyboardEditable(event.target)) return;
    keyboardViewportController.handleFocusIn(event.target);
    scheduleLayoutDiagnostics("keyboard-open");
  });
  document.addEventListener("focusout", (event) => {
    if (!isKeyboardEditable(event.target)) return;
    keyboardViewportController.handleFocusOut(event.target);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) keyboardViewportController.requestSettle("visibility-restored");
  });
  window.addEventListener("meh:native-insets", () => scheduleLayoutDiagnostics("native-insets"));
  bindDocumentScrollLock();
}

async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return;

  try {
    const alreadyPersisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    if (!alreadyPersisted) await navigator.storage.persist();
  } catch (error) {
    console.warn("Persistent storage request failed:", error);
  }
}

function isIosPwaRuntime() {
  return window.MehPlatform.is(window.MehPlatform.RUNTIME.IOS_PWA);
}

function isKeyboardEditable(element) {
  return element instanceof Element
    && Boolean(element.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), textarea, [contenteditable="true"]'));
}

function createKeyboardViewportController() {
  const STATE = Object.freeze({
    STABLE: "stable",
    OPENING: "keyboard-opening",
    OPEN: "keyboard-open",
    CLOSING: "keyboard-closing",
    NAVIGATION: "navigation-transition",
    ORIENTATION: "orientation-changing",
    SETTLING: "settling",
  });
  let stateName = STATE.STABLE;
  let baseline = null;
  let keyboardScrollY = 0;
  let lastGeometry = null;
  let lastChangeAt = performance.now();
  let stableFrameCount = 0;
  let settleRaf = 0;
  let settleFallback = 0;
  let settleRequested = false;
  let settleReason = "";
  let settlePromise = Promise.resolve();
  let resolveSettle = null;

  function visualExtent() {
    return window.visualViewport
      ? window.visualViewport.height + Math.max(0, window.visualViewport.offsetTop)
      : window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function layoutHeight() {
    return Math.max(
      1,
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0
    );
  }

  function measure() {
    const referenceHeight = Math.max(
      1,
      baseline?.layoutHeight || stableViewportHeight || layoutHeight()
    );
    const extent = visualExtent();
    const occlusion = Math.max(0, referenceHeight - extent);
    const visibleThreshold = Math.max(96, Math.min(140, referenceHeight * 0.16));
    return {
      layoutHeight: layoutHeight(),
      visualExtent: extent,
      occlusion,
      visibleThreshold,
      visible: occlusion >= visibleThreshold,
    };
  }

  function log(event, detail = {}) {
    window.mehNavigation?.recordDebug?.(event, {
      state: stateName,
      ...detail,
    });
  }

  function setState(next, event, detail = {}) {
    if (stateName !== next) stateName = next;
    log(event, detail);
  }

  function updatePaintHeight(height) {
    els.root.style.removeProperty("--app-height");
    if (!isIosPwaRuntime()) {
      stableViewportHeight = 0;
      els.root.style.removeProperty("--viewport-paint-height");
      return 0;
    }
    stableViewportHeight = Math.max(1, Number(height) || layoutHeight());
    els.root.style.setProperty(
      "--viewport-paint-height",
      `${Math.ceil(stableViewportHeight)}px`
    );
    return stableViewportHeight;
  }

  function refreshBackground() {
    const background = document.querySelector("#viewport-background");
    if (!background) return;
    background.classList.add("is-repainting");
    background.getBoundingClientRect();
    requestAnimationFrame(() => background.classList.remove("is-repainting"));
  }

  function startPromise() {
    if (resolveSettle) return;
    settlePromise = new Promise((resolve) => {
      resolveSettle = resolve;
    });
  }

  function finishPromise() {
    const resolve = resolveSettle;
    resolveSettle = null;
    resolve?.();
  }

  function clearScheduler() {
    cancelAnimationFrame(settleRaf);
    window.clearTimeout(settleFallback);
    settleRaf = 0;
    settleFallback = 0;
  }

  function finalSettle(reason, forced = false) {
    if (!settleRequested && stateName === STATE.STABLE) return;
    clearScheduler();
    setState(STATE.SETTLING, "viewport-settle", { reason, forced });
    settleRequested = false;
    const currentHeight = layoutHeight();
    baseline = {
      layoutHeight: currentHeight,
      visualExtent: visualExtent(),
      scrollY: window.scrollY,
    };
    updatePaintHeight(currentHeight);
    els.root.classList.remove("keyboard-viewport-active");
    if (!pageScrollLock.active && Math.abs(window.scrollY - keyboardScrollY) > 1) {
      window.scrollTo(0, keyboardScrollY);
    }
    updateDockIndicator();
    refreshBackground();
    stateName = STATE.STABLE;
    log("keyboard-settled", { reason, forced, baseline });
    window.dispatchEvent(new CustomEvent("meh:keyboard-settled", {
      detail: { reason, forced },
    }));
    finishPromise();
  }

  function evaluateStability(timestamp) {
    const geometry = measure();
    const previous = lastGeometry;
    const heightStable = previous
      && Math.abs(previous.visualExtent - geometry.visualExtent) <= 1
      && Math.abs(previous.layoutHeight - geometry.layoutHeight) <= 1;
    if (heightStable) {
      stableFrameCount += 1;
    } else {
      stableFrameCount = 0;
      lastChangeAt = timestamp;
    }
    lastGeometry = geometry;

    const focused = isKeyboardEditable(document.activeElement);
    if ((stateName === STATE.OPENING || stateName === STATE.OPEN) && focused) {
      if (geometry.visible && (stableFrameCount >= 2 || timestamp - lastChangeAt >= 80)) {
        setState(STATE.OPEN, "keyboard-open", { geometry });
        clearScheduler();
        return;
      }
    }

    if (settleRequested) {
      const keyboardGone = !focused && geometry.occlusion < Math.min(64, geometry.visibleThreshold);
      const stableLongEnough = stableFrameCount >= 2 || timestamp - lastChangeAt >= 100;
      if (keyboardGone && stableLongEnough) {
        finalSettle(settleReason || "geometry-stable");
        return;
      }
    }
    settleRaf = requestAnimationFrame(evaluateStability);
  }

  function ensureScheduler() {
    if (!settleRaf) {
      lastGeometry = measure();
      lastChangeAt = performance.now();
      stableFrameCount = 0;
      settleRaf = requestAnimationFrame(evaluateStability);
    }
    if (settleRequested && !settleFallback) {
      settleFallback = window.setTimeout(() => {
        const focused = isKeyboardEditable(document.activeElement);
        if (focused) return;
        finalSettle(`${settleReason || "settle"}:fallback`, true);
      }, 600);
    }
  }

  function requestSettle(reason) {
    settleRequested = true;
    settleReason = reason;
    startPromise();
    ensureScheduler();
    return settlePromise;
  }

  function handleFocusIn() {
    if (stateName === STATE.STABLE) {
      const height = layoutHeight();
      baseline = {
        layoutHeight: height,
        visualExtent: visualExtent(),
        scrollY: window.scrollY,
      };
      keyboardScrollY = window.scrollY;
      updatePaintHeight(height);
    }
    settleRequested = false;
    window.clearTimeout(settleFallback);
    settleFallback = 0;
    els.root.classList.add("keyboard-viewport-active");
    log("keyboard-focus", { baseline });
    setState(STATE.OPENING, "keyboard-opening", { baseline });
    ensureScheduler();
  }

  function handleFocusOut() {
    setState(STATE.CLOSING, "keyboard-closing");
    requestSettle("focusout");
  }

  function handleViewportChange(reason) {
    const geometry = measure();
    log("viewport-resize", { reason, geometry });
    if (stateName === STATE.STABLE && !isKeyboardEditable(document.activeElement)) {
      baseline = {
        layoutHeight: geometry.layoutHeight,
        visualExtent: geometry.visualExtent,
        scrollY: window.scrollY,
      };
      updatePaintHeight(geometry.layoutHeight);
      refreshBackground();
      return;
    }
    if (
      isKeyboardEditable(document.activeElement)
      && stateName === STATE.OPENING
      && geometry.visible
    ) {
      ensureScheduler();
      return;
    }
    if (!isKeyboardEditable(document.activeElement) && stateName !== STATE.STABLE) {
      if (stateName !== STATE.ORIENTATION && stateName !== STATE.NAVIGATION) {
        stateName = STATE.CLOSING;
      }
      requestSettle(reason);
    }
  }

  function handleOrientationChange() {
    clearScheduler();
    baseline = null;
    stableViewportHeight = 0;
    setState(STATE.ORIENTATION, "viewport-resize", { reason: "orientation-change" });
    requestSettle("orientation-change");
  }

  function isKeyboardActive() {
    return isKeyboardEditable(document.activeElement)
      || [STATE.OPENING, STATE.OPEN, STATE.CLOSING].includes(stateName);
  }

  async function interceptBack(source) {
    if (!isKeyboardActive()) return { handled: false, proceed: true };
    const focused = isKeyboardEditable(document.activeElement)
      ? document.activeElement
      : null;
    focused?.blur();
    if (stateName !== STATE.CLOSING) {
      setState(STATE.CLOSING, "keyboard-closing", { source });
    }
    await requestSettle(`navigation:${source}`);
    return {
      handled: true,
      proceed: source !== "android-back",
    };
  }

  function navigationStarted() {
    if (stateName === STATE.STABLE) {
      setState(STATE.NAVIGATION, "viewport-resize", { reason: "navigation-transition" });
    }
  }

  function navigationEnded(source) {
    if (stateName === STATE.NAVIGATION) requestSettle(`navigation-settled:${source}`);
    if (source === "ios-edge-back" && stateName !== STATE.STABLE) {
      requestSettle("ios-edge-back");
    }
  }

  function initialize() {
    const height = layoutHeight();
    baseline = {
      layoutHeight: height,
      visualExtent: visualExtent(),
      scrollY: window.scrollY,
    };
    keyboardScrollY = window.scrollY;
    updatePaintHeight(height);
  }

  initialize();

  return Object.freeze({
    STATE,
    handleFocusIn,
    handleFocusOut,
    handleViewportChange,
    handleOrientationChange,
    requestSettle,
    interceptBack,
    navigationStarted,
    navigationEnded,
    waitUntilSettled() {
      return stateName === STATE.STABLE ? Promise.resolve() : settlePromise;
    },
    isSettled() {
      return stateName === STATE.STABLE && !settleRequested;
    },
    isKeyboardActive,
    getGeometry: measure,
    getState() {
      return {
        state: stateName,
        baseline: clonePlainObject(baseline),
        geometry: measure(),
        settleRequested,
      };
    },
  });
}

function clonePlainObject(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function measureAllocatedViewportHeight() {
  return Math.max(
    window.innerHeight || 0,
    document.documentElement.clientHeight || 0
  );
}

function measureVisualViewportExtent() {
  return window.visualViewport
    ? window.visualViewport.height + Math.max(0, window.visualViewport.offsetTop)
    : measureAllocatedViewportHeight();
}

function getKeyboardViewportGeometry() {
  return keyboardViewportController.getGeometry();
}

function syncPwaAppHeight() {
  return stableViewportHeight;
}

function refreshViewportBackgroundLayer() {
  const background = document.querySelector("#viewport-background");
  if (!background) return;
  background.classList.add("is-repainting");
  background.getBoundingClientRect();
  requestAnimationFrame(() => background.classList.remove("is-repainting"));
}

function isVisualViewportSettled() {
  const geometry = getKeyboardViewportGeometry();
  return geometry.occlusion < Math.min(64, geometry.visibleThreshold);
}

function readStaticMetaContent(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content;
}

function measureSafeAreaInsets() {
  const rootStyle = getComputedStyle(document.documentElement);
  const read = (side) => rootStyle.getPropertyValue(`--content-inset-${side}`).trim() || "0px";
  return {
    safeTop: read("top"),
    safeBottom: read("bottom"),
    safeLeft: read("left"),
    safeRight: read("right"),
  };
}

function getViewportPaintGeometry() {
  const rect = (selector) => {
    const bounds = document.querySelector(selector)?.getBoundingClientRect();
    return bounds ? { top: bounds.top, bottom: bounds.bottom, height: bounds.height } : null;
  };

  const htmlBounds = document.documentElement.getBoundingClientRect();
  const bodyBounds = document.body.getBoundingClientRect();
  return {
    html: { top: htmlBounds.top, bottom: htmlBounds.bottom, height: htmlBounds.height },
    body: { top: bodyBounds.top, bottom: bodyBounds.bottom, height: bodyBounds.height },
    appRoot: rect("#app"),
    viewportMarker: rect("#viewport-background"),
  };
}

function normalizeCssColor(value) {
  if (!value || !window.CSS?.supports?.("color", value)) return null;
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const normalized = getComputedStyle(probe).color;
  probe.remove();
  return normalized;
}

function getSystemBarColorDiagnostics() {
  const rootStyle = getComputedStyle(document.documentElement);
  const htmlColor = getComputedStyle(document.documentElement).backgroundColor;
  const bodyColor = getComputedStyle(document.body).backgroundColor;
  const viewportStyle = getComputedStyle(document.querySelector("#viewport-background"));
  const viewportColor = viewportStyle.backgroundColor;
  const viewportImage = viewportStyle.backgroundImage;
  const themeColor = readStaticMetaContent("theme-color") || "";
  const surfaceColor = rootStyle.getPropertyValue("--surface").trim();
  const isIosPwa = document.documentElement.classList.contains("platform-ios-pwa");
  const normalized = {
    themeColor: normalizeCssColor(themeColor),
    surfaceColor: normalizeCssColor(surfaceColor),
    htmlBackgroundColor: normalizeCssColor(htmlColor),
    bodyBackgroundColor: normalizeCssColor(bodyColor),
    viewportBackgroundColor: normalizeCssColor(viewportColor),
  };
  const transparent = normalizeCssColor("transparent");
  const htmlIsTransparent = normalized.htmlBackgroundColor === transparent;
  const bodyIsTransparent = normalized.bodyBackgroundColor === transparent;
  const viewportMatchesSurface =
    normalized.viewportBackgroundColor === normalized.surfaceColor
    && viewportImage !== "none";
  const themeMatchesSurface =
    normalized.themeColor !== null
    && normalized.themeColor === normalized.surfaceColor;
  const statusBarStrategyValid = isIosPwa
    ? !themeColor && htmlIsTransparent && bodyIsTransparent && viewportMatchesSurface
    : themeMatchesSurface && htmlIsTransparent && bodyIsTransparent && viewportMatchesSurface;

  return {
    strategy: isIosPwa ? "ios-transparent-status-bar" : "theme-color-fallback",
    isIosPwa,
    themeColor,
    themeColorPresent: Boolean(themeColor),
    surfaceColor,
    htmlBackgroundColor: htmlColor,
    bodyBackgroundColor: bodyColor,
    viewportBackgroundColor: viewportColor,
    viewportBackgroundImage: viewportImage,
    htmlIsTransparent,
    bodyIsTransparent,
    viewportMatchesSurface,
    statusBarStrategyValid,
    fallbackColorsMatch: statusBarStrategyValid,
  };
}

function classifyViewportOwnership({
  standaloneInfo,
  metaInfo,
  safeArea,
  paintGeometry,
  statusBarColors,
}) {
  const tolerance = 2;
  const finite = (value) => value !== null && value !== "" && Number.isFinite(Number(value));
  const near = (left, right) => finite(left) && finite(right) && Math.abs(Number(left) - Number(right)) <= tolerance;
  const atViewportTop = (rect) => rect && finite(rect.top) && Number(rect.top) <= tolerance;
  const coversViewportBottom = (rect, viewportHeight) =>
    rect && finite(rect.bottom) && finite(viewportHeight) && Number(rect.bottom) >= Number(viewportHeight) - tolerance;
  const isStandalone =
    standaloneInfo.navigatorStandalone === true
    || standaloneInfo.displayModeStandalone === true;
  const metadata = {
    viewportFitCover: /(?:^|,\s*)viewport-fit\s*=\s*cover(?:\s*,|$)/i.test(metaInfo.viewport || ""),
    appleCapable: String(metaInfo.appleMobileWebAppCapable || "").toLowerCase() === "yes",
    translucentStatusBar:
      String(metaInfo.appleMobileWebAppStatusBarStyle || "").toLowerCase() === "black-translucent",
  };
  metadata.valid = metadata.viewportFitCover && metadata.appleCapable && metadata.translucentStatusBar;

  const innerHeight = Number(standaloneInfo.innerHeight);
  const screenHeight = Number(standaloneInfo.screenHeight);
  const documentHeight = Number(standaloneInfo.documentClientHeight);
  const visualHeight = standaloneInfo.visualViewportHeight == null
    ? null
    : Number(standaloneInfo.visualViewportHeight);
  const visualOffsetTop = standaloneInfo.visualViewportOffsetTop == null
    ? null
    : Number(standaloneInfo.visualViewportOffsetTop);
  const screenMinusInner = finite(screenHeight) && finite(innerHeight) ? screenHeight - innerHeight : null;
  const documentMatchesInner = near(documentHeight, innerHeight);
  const visualMatchesInner = visualHeight == null || near(visualHeight, innerHeight);
  const visualStartsAtZero = visualOffsetTop == null || Math.abs(visualOffsetTop) <= tolerance;
  const requiredRects = [
    paintGeometry.html,
    paintGeometry.body,
    paintGeometry.appRoot,
    paintGeometry.viewportMarker,
  ].filter(Boolean);
  const domStartsAtViewportTop =
    requiredRects.length >= 3 && requiredRects.every((rect) => atViewportTop(rect));
  const domCoversAllocatedViewport =
    domStartsAtViewportTop
    && requiredRects.every((rect) => coversViewportBottom(rect, innerHeight));
  const domInternalTopGap = requiredRects.some((rect) => finite(rect.top) && Number(rect.top) > tolerance);
  const allocatedViewportIsShorterThanScreen =
    finite(screenMinusInner) && screenMinusInner > tolerance;

  let verdict = "inconclusive";
  if (!isStandalone) {
    verdict = "not-standalone";
  } else if (!metadata.valid) {
    verdict = "metadata-mismatch";
  } else if (domInternalTopGap) {
    verdict = "dom-internal-gap";
  } else if (
    allocatedViewportIsShorterThanScreen
    && documentMatchesInner
    && visualMatchesInner
    && visualStartsAtZero
    && domCoversAllocatedViewport
  ) {
    verdict = "webview-excludes-screen-region";
  } else if (
    documentMatchesInner
    && visualStartsAtZero
    && domCoversAllocatedViewport
  ) {
    verdict = "dom-fills-allocated-viewport";
  }

  return {
    verdict,
    isStandalone,
    metadata,
    deltas: {
      screenMinusInner,
      innerMinusDocument: finite(innerHeight) && finite(documentHeight) ? innerHeight - documentHeight : null,
      innerMinusVisual: finite(innerHeight) && finite(visualHeight) ? innerHeight - visualHeight : null,
      visualViewportOffsetTop: visualOffsetTop,
    },
    evidence: {
      documentMatchesInner,
      visualMatchesInner,
      visualStartsAtZero,
      domStartsAtViewportTop,
      domCoversAllocatedViewport,
      domInternalTopGap,
      allocatedViewportIsShorterThanScreen,
      safeAreaTop: safeArea.safeTop,
      safeAreaBottom: safeArea.safeBottom,
      fallbackColorsMatch: statusBarColors.fallbackColorsMatch,
    },
  };
}

function logStandaloneStartupDiagnostics() {
  const standaloneInfo = {
    navigatorStandalone: window.MehPlatform.standalone,
    displayModeStandalone: window.MehPlatform.standalone,
    displayModeFullscreen: window.matchMedia("(display-mode: fullscreen)").matches,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    documentClientWidth: document.documentElement.clientWidth,
    documentClientHeight: document.documentElement.clientHeight,
    visualViewportWidth: window.visualViewport?.width,
    visualViewportHeight: window.visualViewport?.height,
    visualViewportOffsetTop: window.visualViewport?.offsetTop,
    visualViewportOffsetLeft: window.visualViewport?.offsetLeft,
  };
  const metaInfo = {
    viewport: readStaticMetaContent("viewport"),
    appleMobileWebAppCapable: readStaticMetaContent("apple-mobile-web-app-capable"),
    appleMobileWebAppStatusBarStyle: readStaticMetaContent("apple-mobile-web-app-status-bar-style"),
  };
  const safeArea = measureSafeAreaInsets();
  const paintGeometry = getViewportPaintGeometry();
  const statusBarColors = getSystemBarColorDiagnostics();
  const audit = classifyViewportOwnership({
    standaloneInfo,
    metaInfo,
    safeArea,
    paintGeometry,
    statusBarColors,
  });
  document.documentElement.dataset.viewportOwnership = audit.verdict;

  console.info("[Meh][SafeArea] Standalone startup diagnostics");
  console.table(standaloneInfo);
  console.table(metaInfo);
  console.table(safeArea);
  console.table(audit.deltas);
  console.info(`[Meh][SafeArea] Viewport ownership: ${audit.verdict}`, {
    audit,
    paintGeometry,
    statusBarColors,
  });
  if (audit.verdict === "not-standalone") {
    console.warn("[Meh][SafeArea] This launch is not an iOS/Home Screen standalone session; do not use it to accept safe-area behavior.");
  }
  if (audit.verdict === "metadata-mismatch") {
    console.warn("[Meh][SafeArea] The loaded document is missing required standalone metadata. Check the current index.html, Service Worker diagnostics, and reinstall the Home Screen app.");
  }
  if (audit.isStandalone && safeArea.safeTop === "0px" && safeArea.safeBottom === "0px") {
    console.warn("[Meh][SafeArea] Both vertical safe-area insets are zero in standalone mode. Check the installed metadata, viewport-fit=cover, cached index.html, and whether the Home Screen app was reinstalled.");
  }
  if (audit.verdict === "dom-internal-gap") {
    console.warn("[Meh][SafeArea] The measured DOM/background roots begin below the allocated viewport top. This is an internal layout gap and may be repaired in CSS after inspecting the reported rects.");
  }
  if (audit.verdict === "webview-excludes-screen-region") {
    console.warn("[Meh][SafeArea] The DOM fills the entire allocated WebView, but the WebView is shorter than screen.height. The missing screen region is outside the DOM paintable area; do not add negative safe-area offsets.");
  }
  if (!statusBarColors.statusBarStrategyValid) {
    console.warn("[Meh][SafeArea] The status-bar background strategy is inconsistent with this runtime.", statusBarColors);
  }

  return { standaloneInfo, metaInfo, safeArea, paintGeometry, statusBarColors, audit };
}

function getSafeAreaDebugMode() {
  try {
    const requested = new URLSearchParams(location.search).get("safeAreaDebug");
    if (requested !== null) return requested;
    return localStorage.getItem("meh-safe-area-debug") || "";
  } catch {
    return "";
  }
}

function installSafeAreaDebugMode() {
  const requestedMode = getSafeAreaDebugMode().toLowerCase();
  const mode = requestedMode === "1" ? "all" : requestedMode;
  if (!["all", "html", "body", "app", "viewport"].includes(mode)) return "";

  const layers = {
    all: `
      html { background: red !important; }
      body { background: lime !important; }
      #app { background: blue !important; }
      #viewport-background { background: magenta !important; }
    `,
    html: `
      html { background: red !important; }
      body, #app, #viewport-background { background: transparent !important; }
    `,
    body: `
      html { background: red !important; }
      body { background: lime !important; }
      #app, #viewport-background { background: transparent !important; }
    `,
    app: `
      html { background: red !important; }
      body { background: lime !important; }
      #app { background: blue !important; }
      #viewport-background { background: transparent !important; }
    `,
    viewport: `
      html { background: red !important; }
      body { background: lime !important; }
      #app { background: transparent !important; }
      #viewport-background { background: magenta !important; }
    `,
  };
  const style = document.createElement("style");
  style.id = "safe-area-debug-styles";
  style.textContent = layers[mode];
  document.head.appendChild(style);
  document.documentElement.dataset.safeAreaDebug = mode;
  console.warn(`[Meh][SafeArea] Temporary background-source debug mode is active: ${mode}`);
  return mode;
}

function readHtmlMetaSnapshot(html) {
  if (!html) return null;
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return {
    build: parsed.querySelector('meta[name="meh-build"]')?.content || null,
    viewport: parsed.querySelector('meta[name="viewport"]')?.content || null,
    appleMobileWebAppCapable: parsed.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content || null,
    appleMobileWebAppStatusBarStyle: parsed.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content || null,
    viewportCount: parsed.querySelectorAll('meta[name="viewport"]').length,
  };
}

async function logServiceWorkerDiagnostics() {
  const build = readStaticMetaContent("meh-build") || "unknown";
  const result = {
    documentUrl: location.href,
    documentBuild: build,
    controllerUrl: navigator.serviceWorker?.controller?.scriptURL || null,
    controllerState: navigator.serviceWorker?.controller?.state || null,
    controllerVersion: null,
    registrations: [],
    cacheKeys: [],
    cachedIndexes: [],
    networkIndex: null,
    consistency: null,
    cachedIndex: null,
    error: null,
  };

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      result.registrations = registrations.map((registration) => ({
        scope: registration.scope,
        active: registration.active?.scriptURL || null,
        activeState: registration.active?.state || null,
        waiting: registration.waiting?.scriptURL || null,
        installing: registration.installing?.scriptURL || null,
      }));
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        result.controllerVersion = await new Promise((resolve) => {
          let settled = false;
          const finish = (version = null) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            navigator.serviceWorker.removeEventListener("message", onMessage);
            resolve(version);
          };
          const onMessage = (event) => {
            if (event.data?.type === "SW_VERSION") finish(event.data.version || null);
          };
          const timeout = window.setTimeout(() => finish(null), 1200);
          navigator.serviceWorker.addEventListener("message", onMessage);
          controller.postMessage({ type: "GET_VERSION" });
        });
      }
    }
    if ("caches" in window) {
      result.cacheKeys = await caches.keys();
      for (const cacheName of result.cacheKeys.filter((name) => name.startsWith("meh-shell-"))) {
        const shell = await caches.open(cacheName);
        const cachedResponse = await shell.match(new URL("./index.html", location.href));
        const snapshot = cachedResponse ? readHtmlMetaSnapshot(await cachedResponse.text()) : null;
        result.cachedIndexes.push({ cacheName, index: snapshot });
        if (cacheName === `meh-shell-${build}`) result.cachedIndex = snapshot;
      }
    }
    const networkUrl = new URL("./index.html", location.href);
    networkUrl.searchParams.set("__meh_pwa_diagnostic", `${build}-${Date.now()}`);
    const networkResponse = await fetch(networkUrl, { cache: "no-store" });
    if (networkResponse.ok) result.networkIndex = readHtmlMetaSnapshot(await networkResponse.text());
  } catch (error) {
    result.error = String(error?.message || error);
  }

  const requiredMetaIsValid = (snapshot) => Boolean(
    snapshot
    && /(?:^|,\s*)viewport-fit\s*=\s*cover(?:\s*,|$)/i.test(snapshot.viewport || "")
    && String(snapshot.appleMobileWebAppCapable || "").toLowerCase() === "yes"
    && String(snapshot.appleMobileWebAppStatusBarStyle || "").toLowerCase() === "black-translucent"
    && snapshot.viewportCount === 1
  );
  const staleSources = [];
  if (result.controllerVersion && result.controllerVersion !== build) {
    staleSources.push(`controller:${result.controllerVersion}`);
  }
  if (result.networkIndex?.build && result.networkIndex.build !== build) {
    staleSources.push(`network-index:${result.networkIndex.build}`);
  }
  if (result.cachedIndex?.build && result.cachedIndex.build !== build) {
    staleSources.push(`current-shell-index:${result.cachedIndex.build}`);
  }
  for (const entry of result.cachedIndexes) {
    if (entry.cacheName !== `meh-shell-${build}`) staleSources.push(`old-cache:${entry.cacheName}`);
  }
  const loadedMeta = readHtmlMetaSnapshot(document.documentElement.outerHTML);
  const metadataSourcesValid = {
    document: requiredMetaIsValid(loadedMeta),
    network: result.networkIndex ? requiredMetaIsValid(result.networkIndex) : null,
    currentShell: result.cachedIndex ? requiredMetaIsValid(result.cachedIndex) : null,
  };
  let verdict = "consistent";
  if (staleSources.length) verdict = "stale-html-or-worker";
  else if (!metadataSourcesValid.document || metadataSourcesValid.network === false || metadataSourcesValid.currentShell === false) {
    verdict = "metadata-mismatch";
  } else if (!result.networkIndex) {
    verdict = "network-unavailable";
  } else if (!navigator.serviceWorker?.controller) {
    verdict = "uncontrolled";
  }
  result.consistency = {
    verdict,
    expectedBuild: build,
    staleSources,
    metadataSourcesValid,
  };

  console.info("[Meh][PWA] Loaded build and Service Worker diagnostics", result);
  if (result.networkIndex) console.table({ source: "network-only index", ...result.networkIndex });
  for (const entry of result.cachedIndexes) {
    if (entry.index) console.table({ source: entry.cacheName, ...entry.index });
  }
  if (verdict === "stale-html-or-worker" || verdict === "metadata-mismatch") {
    console.warn(`[Meh][PWA] ${verdict}`, result.consistency);
  }
  return result;
}

window.MehSafeAreaDiagnostics = {
  snapshot: logStandaloneStartupDiagnostics,
  serviceWorker: logServiceWorkerDiagnostics,
  classify: classifyViewportOwnership,
  enableBackgroundDebug(mode = "all") {
    try { localStorage.setItem("meh-safe-area-debug", mode); } catch {}
    location.reload();
  },
  disableBackgroundDebug() {
    try { localStorage.removeItem("meh-safe-area-debug"); } catch {}
    const url = new URL(location.href);
    url.searchParams.delete("safeAreaDebug");
    location.replace(url);
  },
};

function isLayoutDiagnosticsEnabled() {
  try {
    if (new URLSearchParams(location.search).get("debugInsets") === "1") return true;
    if (localStorage.getItem("meh-debug-insets") === "1") return true;
    if (window.MehAndroid?.isInsetDebugEnabled?.()) return true;
  } catch {
    // Diagnostics remain opt-in when URL, storage, or the native bridge is unavailable.
  }
  return false;
}

function scheduleLayoutDiagnostics(reason) {
  if (!isLayoutDiagnosticsEnabled()) return;
  window.clearTimeout(layoutDiagnosticTimer);
  layoutDiagnosticTimer = window.setTimeout(() => logLayoutDiagnostics(reason), 120);
}

function getFixedAncestorDiagnostics(element) {
  const diagnostics = [];
  for (let ancestor = element?.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    diagnostics.push({
      element: ancestor === document.body ? "body" : ancestor === document.documentElement ? "html" : ancestor.id ? `#${ancestor.id}` : ancestor.className ? `.${String(ancestor.className).trim().replace(/\s+/g, ".")}` : ancestor.tagName.toLowerCase(),
      transform: style.transform,
      filter: style.filter,
      backdropFilter: style.backdropFilter,
      perspective: style.perspective,
      contain: style.contain,
      willChange: style.willChange,
      contentVisibility: style.contentVisibility,
      overflow: style.overflow,
      clipPath: style.clipPath,
    });
  }
  return diagnostics;
}

function logLayoutDiagnostics(reason = "manual", force = false) {
  if (!force && !isLayoutDiagnosticsEnabled()) return null;
  const rootStyle = getComputedStyle(els.root);
  const htmlStyle = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);
  const frame = document.querySelector("#app");
  const app = document.querySelector(".app");
  const background = document.querySelector("#viewport-background");
  const top = document.querySelector(".top-bar");
  const bottom = document.querySelector(".bottom-nav-positioner");
  const bottomSurface = document.querySelector(".bottom-nav-surface");
  const frameStyle = frame ? getComputedStyle(frame) : null;
  const appStyle = app ? getComputedStyle(app) : null;
  const backgroundStyle = background ? getComputedStyle(background) : null;
  const topStyle = top ? getComputedStyle(top) : null;
  const bottomStyle = bottom ? getComputedStyle(bottom) : null;
  const bottomSurfaceStyle = bottomSurface ? getComputedStyle(bottomSurface) : null;
  const bottomParentStyle = bottom?.parentElement ? getComputedStyle(bottom.parentElement) : null;
  const variable = (name) => rootStyle.getPropertyValue(name).trim() || "0px";
  const build = document.querySelector('meta[name="meh-build"]')?.content || "unknown";
  const savedSettings = safeReadStorage(APP_SETTINGS_KEY, {});
  const frameRect = frame?.getBoundingClientRect();
  const backgroundRect = background?.getBoundingClientRect();
  const bottomRect = bottom?.getBoundingClientRect();
  const bottomSurfaceRect = bottomSurface?.getBoundingClientRect();
  const viewportOwnership = classifyViewportOwnership({
    standaloneInfo: {
      navigatorStandalone: window.MehPlatform.standalone,
      displayModeStandalone: window.MehPlatform.standalone,
      innerHeight: window.innerHeight,
      screenHeight: window.screen.height,
      documentClientHeight: document.documentElement.clientHeight,
      visualViewportHeight: window.visualViewport?.height ?? null,
      visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
    },
    metaInfo: {
      viewport: readStaticMetaContent("viewport"),
      appleMobileWebAppCapable: readStaticMetaContent("apple-mobile-web-app-capable"),
      appleMobileWebAppStatusBarStyle: readStaticMetaContent("apple-mobile-web-app-status-bar-style"),
    },
    safeArea: measureSafeAreaInsets(),
    paintGeometry: getViewportPaintGeometry(),
    statusBarColors: getSystemBarColorDiagnostics(),
  });
  const geometry = {
    screenHeight: window.screen.height,
    innerHeight: window.innerHeight,
    screenMinusInner: window.screen.height - window.innerHeight,
    documentClientHeight: document.documentElement.clientHeight,
    visualViewportHeight: window.visualViewport?.height ?? null,
    visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
    appTop: frameRect?.top ?? null,
    appBottom: frameRect?.bottom ?? null,
    backgroundTop: backgroundRect?.top ?? null,
    backgroundBottom: backgroundRect?.bottom ?? null,
    navTop: bottomRect?.top ?? null,
    navBottom: bottomRect?.bottom ?? null,
    surfaceTop: bottomSurfaceRect?.top ?? null,
    surfaceBottom: bottomSurfaceRect?.bottom ?? null,
    navPhysicalGap: bottomRect ? window.innerHeight - bottomRect.bottom : null,
    surfacePhysicalGap: bottomSurfaceRect ? window.innerHeight - bottomSurfaceRect.bottom : null,
    computedBottom: bottomStyle?.bottom ?? null,
    viewportPaintHeight: variable("--viewport-paint-height"),
    stableViewportHeight,
    windowScrollY: window.scrollY,
    bodyPosition: bodyStyle.position,
    bodyTop: bodyStyle.top,
    bodyBackground: bodyStyle.background,
    htmlBackground: htmlStyle.background,
    viewportBackground: backgroundStyle?.background ?? null,
  };
  const payload = {
    reason,
    runtime: els.root.dataset.runtime || "unknown",
    displayModeStandalone: window.MehPlatform.standalone,
    navigatorStandalone: window.MehPlatform.standalone,
    screenHeight: window.screen.height,
    innerHeight: window.innerHeight,
    documentClientHeight: document.documentElement.clientHeight,
    visualViewportHeight: window.visualViewport?.height ?? null,
    visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
    devicePixelRatio: window.devicePixelRatio,
    androidNativeInsets: {
      top: variable("--android-inset-top"),
      right: variable("--android-inset-right"),
      bottom: variable("--android-inset-bottom"),
      left: variable("--android-inset-left"),
    },
    finalSafeArea: {
      top: variable("--content-inset-top"),
      right: variable("--content-inset-right"),
      bottom: variable("--content-inset-bottom"),
      left: variable("--content-inset-left"),
    },
    backgrounds: {
      html: htmlStyle.background,
      body: bodyStyle.background,
      viewport: backgroundStyle?.background || null,
      root: frameStyle?.background || null,
    },
    padding: {
      bodyTop: bodyStyle.paddingTop,
      bodyBottom: bodyStyle.paddingBottom,
      rootTop: frameStyle?.paddingTop || null,
      rootBottom: frameStyle?.paddingBottom || null,
      contentTop: appStyle?.paddingTop || null,
      contentBottom: appStyle?.paddingBottom || null,
      topContainer: topStyle?.paddingTop || null,
      bottomContainer: bottomStyle?.paddingBottom || null,
    },
    dockPosition: {
      rawUserValue: appSettings.dockBottomGap,
      savedValue: savedSettings.dockBottomGap ?? null,
      cssVariable: variable("--dock-bottom-gap"),
      computedBottom: bottomStyle?.bottom || null,
      physicalViewportGap: bottomRect ? Math.round(window.innerHeight - bottomRect.bottom) : null,
      safeAreaBottom: variable("--content-inset-bottom"),
      positionerPaddingBottom: bottomStyle?.paddingBottom || null,
      positionerMarginBottom: bottomStyle?.marginBottom || null,
      parentPaddingBottom: bottomParentStyle?.paddingBottom || null,
      parentMarginBottom: bottomParentStyle?.marginBottom || null,
      surfacePaddingBottom: bottomSurfaceStyle?.paddingBottom || null,
    },
    geometry,
    fixedAncestors: {
      background: getFixedAncestorDiagnostics(background),
      nav: getFixedAncestorDiagnostics(bottom),
      surface: getFixedAncestorDiagnostics(bottomSurface),
    },
    viewportOwnership,
    viewportRecovery: {
      stableViewportHeight,
      paintHeight: variable("--viewport-paint-height"),
      keyboardActive: keyboardViewportController.isKeyboardActive(),
      keyboardState: keyboardViewportController.getState().state,
      keyboardGeometry: getKeyboardViewportGeometry(),
      scrollLocked: pageScrollLock.active,
      visualViewportSettled: isVisualViewportSettled(),
    },
    appHeight: variable("--app-height"),
    canvasHeight: {
      html: document.documentElement.getBoundingClientRect().height,
      body: document.body.getBoundingClientRect().height,
      root: frame?.getBoundingClientRect().height || null,
    },
    build,
  };
  const signature = JSON.stringify({ ...payload, reason: undefined });
  if (signature === lastLayoutDiagnosticSignature && reason !== "manual" && !force) return payload;
  lastLayoutDiagnosticSignature = signature;
  console.info("[Meh][Insets]", payload);
  console.table(geometry);
  return payload;
}

window.MehLayoutDiagnostics = {
  enable() {
    try { localStorage.setItem("meh-debug-insets", "1"); } catch {}
    logLayoutDiagnostics("manual");
  },
  disable() {
    try { localStorage.removeItem("meh-debug-insets"); } catch {}
  },
  log: logLayoutDiagnostics,
  snapshot() {
    return logLayoutDiagnostics("snapshot", true);
  },
};

function bindDocumentScrollLock() {
  document.addEventListener(
    "touchmove",
    (event) => {
      if (document.body.classList.contains("sheet-open")) {
        const isInsideOpenSheet = event.target.closest(".settings-sheet.is-open, .editor-sheet.is-open");
        if (!isInsideOpenSheet) event.preventDefault();
        return;
      }

      // 主页面不应该被上下拖动。输入控件、底部弹窗不在这里处理。
      if (!event.target.closest(".settings-sheet.is-open, .editor-sheet.is-open")) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}

function bindSheetHandleGestures() {
  document.querySelectorAll(".settings-sheet, .editor-sheet").forEach((sheet) => {
    let startY = 0;
    let shouldTrack = false;
    let startedFromHandle = false;
    let startScrollTop = 0;
    let closeRequested = false;

    const isInteractiveTarget = (target) => {
      return Boolean(
        target.closest(
          "button, input, select, textarea, label, .picker-field, .picker-hue-range, .range-input, .language-menu"
        )
      );
    };

    const startDrag = (event) => {
      if (event.touches.length !== 1) return;

      startedFromHandle = Boolean(event.target.closest(".sheet-handle"));
      shouldTrack = startedFromHandle || !isInteractiveTarget(event.target);
      if (!shouldTrack) return;

      startY = event.touches[0].clientY;
      startScrollTop = sheet.scrollTop;
      closeRequested = false;
    };

    const moveDrag = (event) => {
      if (!shouldTrack || event.touches.length !== 1) return;

      const deltaY = event.touches[0].clientY - startY;
      const isAtTop = sheet.scrollTop <= 1 && startScrollTop <= 1;
      if (isAtTop && deltaY > 0 && event.cancelable) {
        event.preventDefault();
      }

      const shouldCloseFromTop = (startedFromHandle || isAtTop) && deltaY > 10;
      if (!shouldCloseFromTop || closeRequested) return;

      closeRequested = true;
      shouldTrack = false;
      sheet.classList.remove("is-dragging");
      sheet.style.transform = "";
      window.mehNavigation.back("sheet-gesture");
    };

    const finishDrag = () => {
      if (!shouldTrack) return;

      shouldTrack = false;
      sheet.classList.remove("is-dragging");
      sheet.style.transform = "";
    };

    sheet.addEventListener("touchstart", startDrag, { passive: true });
    sheet.addEventListener("touchmove", moveDrag, { passive: false });
    sheet.addEventListener("touchend", finishDrag);
    sheet.addEventListener("touchcancel", finishDrag);
  });
}

function bindDockDragGesture() {
  const dock = els.dock;
  if (!dock) return;

  let startX = 0;
  let startY = 0;
  let indicatorStartX = 0;
  let itemSlots = [];
  let activePointerId = null;
  let activeItem = null;
  let isDragging = false;
  let hasDragged = false;

  const startDrag = (event) => {
    const item = event.target.closest(".dock-item");
    if (!item) return;

    updateDockIndicator();
    itemSlots = getDockItemSlots();
    indicatorStartX = getActiveDockSlot()?.x ?? 8;
    startX = event.clientX;
    startY = event.clientY;
    activePointerId = event.pointerId;
    activeItem = item;
    isDragging = true;
    hasDragged = false;
    item.setPointerCapture(event.pointerId);
    dock.classList.add("is-dragging");
  };

  const moveDrag = (event) => {
    if (!isDragging || event.pointerId !== activePointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      hasDragged = true;
      event.preventDefault();
      const minX = itemSlots[0]?.x ?? indicatorStartX;
      const maxX = itemSlots.at(-1)?.x ?? indicatorStartX;
      const nextX = Math.max(minX, Math.min(maxX, indicatorStartX + deltaX));
      dock.style.setProperty("--dock-indicator-x", `${nextX}px`);
    }
  };

  const finishDrag = (event) => {
    if (!isDragging || event.pointerId !== activePointerId) return;
    isDragging = false;
    dock.classList.remove("is-dragging");
    if (activeItem?.hasPointerCapture(event.pointerId)) activeItem.releasePointerCapture(event.pointerId);

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    activePointerId = null;
    activeItem = null;

    if (!hasDragged || Math.abs(deltaX) < 24 || Math.abs(deltaX) < Math.abs(deltaY)) {
      updateDockIndicator();
      return;
    }

    dockSuppressClick = true;
    window.setTimeout(() => {
      dockSuppressClick = false;
    }, 260);

    const currentX = Math.max(itemSlots[0]?.x ?? 0, Math.min(itemSlots.at(-1)?.x ?? 0, indicatorStartX + deltaX));
    const targetSlot = itemSlots.reduce((closest, slot) => {
      return Math.abs(slot.x - currentX) < Math.abs(closest.x - currentX) ? slot : closest;
    }, itemSlots[0]);

    if (targetSlot?.page) {
      setPage(targetSlot.page);
      return;
    }

    updateDockIndicator();
  };

  els.dockItems.forEach((item) => {
    item.addEventListener("pointerdown", startDrag);
    item.addEventListener("pointermove", moveDrag);
    item.addEventListener("pointerup", finishDrag);
    item.addEventListener("pointercancel", finishDrag);
  });
}

function getDockItemSlots() {
  const dockContent = els.dockIndicator?.parentElement;
  const dockContentRect = dockContent?.getBoundingClientRect() ?? els.dock.getBoundingClientRect();
  return Array.from(els.dockItems).map((item) => {
    const rect = item.getBoundingClientRect();
    return {
      page: item.dataset.page,
      x: rect.left - dockContentRect.left,
      width: rect.width,
    };
  });
}

function getActiveDockSlot() {
  return getDockItemSlots().find((slot) => slot.page === state.page);
}

function updateDockIndicator() {
  if (!els.dock || !els.dockIndicator) return;
  const activeSlot = getActiveDockSlot();
  if (!activeSlot) return;

  els.dock.style.setProperty("--dock-indicator-x", `${activeSlot.x}px`);
  els.dock.style.setProperty("--dock-indicator-w", `${activeSlot.width}px`);
}

function movePage(direction) {
  const pageKeys = Object.keys(pages);
  const currentIndex = pageKeys.indexOf(state.page);
  const nextIndex = Math.max(0, Math.min(pageKeys.length - 1, currentIndex + direction));
  if (nextIndex === currentIndex) return;

  setPage(pageKeys[nextIndex]);
}

async function setPage(pageKey) {
  if (!pages[pageKey]) return;
  const topType = window.mehNavigation?.getTopItem?.()?.type;
  if (["wheel-history", "number-history"].includes(topType)) {
    await new Promise((resolve) => {
      const unsubscribe = window.mehNavigation.onSettled(() => {
        unsubscribe();
        resolve();
      });
      window.mehNavigation.requestBack("page-change");
    });
  }

  state.page = pageKey;
  wheelState.historyExpanded = false;
  numberState.historyExpanded = false;
  saveState();
  renderPage();
}

function renderPage() {
  const page = pages[state.page] || pages.coin;

  els.pageTitle.textContent = t(state.page);
  els.pageActions.hidden = !["coin", "dice", "wheel", "number"].includes(state.page);
  updateFeatureButton();

  if (state.page === "coin") {
    renderCoinPage();
  } else if (state.page === "dice") {
    renderDicePage();
  } else if (state.page === "wheel") {
    renderWheelPage();
  } else if (state.page === "number") {
    renderNumberPage();
  } else {
    renderPlaceholderPage(page);
    renderDefaultTopStats();
  }

  updateActionButtons();
  els.dockItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.page === state.page);
  });
  hydrateOfflineIcons();
  updateDockIndicator();
}

function renderPlaceholderPage(page) {
  els.pageContent.innerHTML = `
    <div>
      <div class="placeholder-icon">
        <span class="material-symbols-rounded" aria-hidden="true">${page.icon}</span>
      </div>
      <p class="placeholder-title">${page.title}</p>
      <p class="placeholder-copy">${page.copy}</p>
    </div>
  `;
}

function renderDefaultTopStats() {
  resetTopStatsClasses();
  els.topStats.innerHTML = `
    <span class="material-symbols-rounded" aria-hidden="true">query_stats</span>
    <span>${t("latestResult")}</span>
  `;
}

function hideTopStats() {
  resetTopStatsClasses();
  els.topStats.classList.add("is-empty");
  els.topStats.setAttribute("aria-hidden", "true");
  els.topStats.innerHTML = "";
}

function resetTopStatsClasses() {
  els.topStats.classList.remove("is-coin", "is-dice", "is-wheel", "is-number-single", "is-number-group", "is-expanded", "is-empty");
  els.topStats.removeAttribute("aria-hidden");
}

function handleReset() {
  if (state.page === "coin") resetCoin();
  if (state.page === "dice") resetDice();
  if (state.page === "wheel") resetWheelHistory();
  if (state.page === "number") resetNumberHistory();
}

function handleContinue() {
  if (state.page === "coin") flipCoin();
  if (state.page === "dice") rollDice();
  if (state.page === "wheel") spinWheel();
  if (state.page === "number") generateRandomNumbers();
}

function handleFeatureButton() {
  if (state.page === "wheel") openWheelEditor();
  if (state.page === "number") openNumberSettings();
}

function updateFeatureButton() {
  const icon = els.featureButton.querySelector(".material-symbols-rounded");
  const isWheel = state.page === "wheel";
  const isNumber = state.page === "number";
  const isUseful = isWheel || isNumber;
  els.featureButton.hidden = !isUseful;
  els.topBar.classList.toggle("no-feature", !isUseful);
  const iconName = isWheel || isNumber ? "edit" : "more_horiz";
  icon.textContent = iconName;
  renderIconElement(icon, iconName);
  els.featureButton.classList.toggle("is-feature-active", isUseful);
  els.featureButton.setAttribute("aria-label", isWheel ? t("editWheel") : isNumber ? t("tuneNumber") : "");
}

function updateActionButtons() {
  const isBusy =
    (state.page === "coin" && coinState.isFlipping) ||
    (state.page === "dice" && diceState.isRolling) ||
    (state.page === "wheel" && wheelState.isSpinning);
  els.continueButton.disabled = isBusy;
  els.resetButton.disabled = isBusy;
  els.continueButton.textContent = isCurrentPageEmpty() ? t("start") : t("continue");
}

function isCurrentPageEmpty() {
  if (state.page === "coin") return !coinState.result && coinState.history.length === 0;
  if (state.page === "dice") return diceState.history.length === 0;
  if (state.page === "wheel") return wheelState.history.length === 0;
  if (state.page === "number") return numberState.history.length === 0;
  return true;
}

function randomDiceValue() {
  return Math.floor(Math.random() * 6) + 1;
}

function randomDiceValueExcept(excludedValues = []) {
  const excluded = new Set(excludedValues.filter((value) => Number.isInteger(value)));
  const candidates = [1, 2, 3, 4, 5, 6].filter((value) => !excluded.has(value));
  return candidates[Math.floor(Math.random() * candidates.length)] || randomDiceValue();
}

// 抛硬币相关逻辑
function renderCoinPage() {
  const resultText = getCoinResultText();
  const side = coinState.result || "number";

  updateCoinStats();
  els.pageContent.innerHTML = `
    <div class="coin-stage">
      <div class="coin-content">
        <div class="coin ${coinState.isFlipping ? "is-flipping" : ""}" data-side="${side}" id="coin">
          <div class="coin-face coin-number" aria-hidden="true">1</div>

            <div class="coin-face coin-pattern" aria-hidden="true">
              <div class="coin-meh-face">
                <span class="meh-eye meh-eye-left"></span>
                <span class="meh-eye meh-eye-right"></span>
                <span class="meh-mouth"></span>
              </div>
            </div>

        </div>
        <p class="coin-result">${resultText.title}</p>
        <p class="coin-hint">${resultText.hint}</p>
      </div>
    </div>
  `;
}

function updateCoinStats() {
  resetTopStatsClasses();
  els.topStats.classList.add("is-coin");
  els.topStats.innerHTML = `
    <div class="top-stat-item">
      <span class="top-stat-label">${t("numberSide")}</span>
      <span class="top-stat-value">${coinState.stats.number}</span>
    </div>
    <div class="top-stat-item">
      <span class="top-stat-label">${t("patternSide")}</span>
      <span class="top-stat-value">${coinState.stats.pattern}</span>
    </div>
  `;
}

function flipCoin() {
  if (coinState.isFlipping || state.page !== "coin") return;

  const result = Math.random() < 0.5 ? "number" : "pattern";
  coinState.isFlipping = true;
  updateActionButtons();

  const coin = document.querySelector("#coin");

  if (coin) {
    coin.classList.remove("is-flipping", "flip-to-number", "flip-to-pattern");
    coin.style.setProperty("--coin-start-rotation", result === "number" ? "180deg" : "0deg");
    coin.style.setProperty("--coin-end-rotation", result === "pattern" ? "1260deg" : "1080deg");
    coin.offsetWidth;
    window.requestAnimationFrame(() => {
      coin.classList.add("is-flipping", result === "number" ? "flip-to-number" : "flip-to-pattern");
    });
  }

  window.clearTimeout(coinFlipTimer);
  coinFlipTimer = window.setTimeout(() => {
    coinState.result = result;
    coinState.history.push(result);
    coinState.stats[result] += 1;
    coinState.isFlipping = false;
    if (state.page === "coin") renderCoinPage();
    updateActionButtons();
  }, 1350);
}

function resetCoin() {
  window.clearTimeout(coinFlipTimer);
  coinState.result = null;
  coinState.isFlipping = false;
  coinState.history = [];
  coinState.stats.number = 0;
  coinState.stats.pattern = 0;
  renderCoinPage();
  updateActionButtons();
}

function getCoinResultText() {
  if (coinState.isFlipping) {
    return { title: t("coinFlipping"), hint: t("coinFlippingHint") };
  }
  if (coinState.result === "number") {
    return { title: t("numberSide"), hint: t("coinNumberHint") };
  }
  if (coinState.result === "pattern") {
    return { title: t("patternSide"), hint: t("coinPatternHint") };
  }
  return { title: t("coinReadyTitle"), hint: t("coinReadyHint") };
}

// 摇骰子相关逻辑
function renderDicePage() {
  const resultText = getDiceResultText();

  updateDiceHistoryBar();
  els.pageContent.innerHTML = `
    <div class="dice-stage">
      <div class="dice-content">
        <div class="dice ${diceState.isRolling ? "is-rolling" : ""}" id="dice" aria-label="骰子点数 ${diceState.displayValue}">
          ${renderDiceDots(diceState.displayValue)}
        </div>
        <p class="dice-result">${resultText.title}</p>
        <p class="dice-hint">${resultText.hint}</p>
      </div>
    </div>
  `;
}

function renderDiceDots(value) {
  const dotPositions = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  return dotPositions[value]
    .map((position) => {
      const row = Math.ceil(position / 3);
      const column = ((position - 1) % 3) + 1;
      return `<span class="dice-dot" style="grid-area: ${row} / ${column};"></span>`;
    })
    .join("");
}

function updateDiceFace(value) {
  diceState.displayValue = value;
  const dice = document.querySelector("#dice");
  if (!dice) return;

  dice.setAttribute("aria-label", `骰子点数 ${value}`);
  dice.innerHTML = renderDiceDots(value);
}

function updateDiceHistoryBar() {
  resetTopStatsClasses();
  els.topStats.classList.add("is-dice");

  if (!diceState.history.length) {
    hideTopStats();
    return;
  }

  els.topStats.innerHTML = diceState.history
    .slice()
    .reverse()
    .map((value) => `<span class="dice-history-chip">${value}</span>`)
    .join("");
}

function rollDice() {
  if (diceState.isRolling || state.page !== "dice") return;

  const result = randomDiceValue();
  let previousFace = diceState.displayValue;

  // 前面只随机跳 3 次，最后一次直接进入最终结果
  const faceSequence = [0, 1, 2].map(() => {
    const next = randomDiceValueExcept([previousFace]);
    previousFace = next;
    return next;
  });

  faceSequence.push(result);

  diceState.isRolling = true;
  updateActionButtons();
  renderDicePage();

  const dice = document.querySelector("#dice");
  if (dice) {
    dice.classList.remove("is-rolling");
    dice.offsetWidth;
    dice.classList.add("is-rolling");
  }

  clearDiceFaceTimers();

  // 最终点数在 1400ms 出现，后面 600ms 只做“落地稳定”
  [240, 560, 960, 1400].forEach((delay, index) => {
    diceFaceTimers.push(
      window.setTimeout(() => {
        if (diceState.isRolling && state.page === "dice") {
          updateDiceFace(faceSequence[index]);
        }
      }, delay)
    );
  });

  window.clearTimeout(diceRollTimer);
  diceRollTimer = window.setTimeout(() => {
    clearDiceFaceTimers();

    diceState.result = result;
    diceState.displayValue = result;
    diceState.history.push(result);
    diceState.isRolling = false;

    if (state.page === "dice") renderDicePage();
    updateActionButtons();
  }, 2000);
}

function resetDice() {
  window.clearTimeout(diceRollTimer);
  clearDiceFaceTimers();
  diceState.result = null;
  diceState.displayValue = 1;
  diceState.isRolling = false;
  diceState.history = [];
  renderDicePage();
  updateActionButtons();
}

function clearDiceFaceTimers() {
  window.clearInterval(diceFaceTimer);
  diceFaceTimers.forEach((timer) => window.clearTimeout(timer));
  diceFaceTimers = [];
}

function getDiceResultText() {
  if (diceState.isRolling) {
    return { title: t("diceRolling"), hint: t("diceRollingHint") };
  }
  if (diceState.result) {
    return { title: `${diceState.result} ${t("point")}`, hint: t("diceResultHint") };
  }
  return { title: t("diceReadyTitle"), hint: t("diceReadyHint") };
}

// 大转盘相关逻辑
function renderWheelPage() {
  const resultText = getWheelResultText();
  updateWheelStats();

  els.pageContent.innerHTML = `
    <div class="wheel-stage">
      <div class="wheel-content">
        <div class="wheel-wrap">
          <div class="wheel-pointer" aria-hidden="true"></div>
          ${renderWheelSvg()}
          <div class="wheel-hub">
            <span class="material-symbols-rounded" aria-hidden="true">data_usage</span>
          </div>
        </div>
        <p class="wheel-result">${resultText.title}</p>
        <p class="wheel-hint">${resultText.hint}</p>
      </div>
    </div>
  `;
  hydrateOfflineIcons(els.pageContent);
}

function renderWheelSvg() {
  const sectors = buildWheelSectors();
  const isDark = els.root.classList.contains("theme-dark");
  const parts = sectors
    .map((sector, index) => {
      const labelPoint = polarToCartesian(100, 100, 58, sector.centerAngle);
      const rotate = sector.centerAngle + 90;
      const fillColor = getWheelSectorColor(index, isDark);
      return `
        <path d="${describeSector(100, 100, 96, sector.startAngle, sector.endAngle)}" fill="${fillColor}"></path>
        <text
          x="${labelPoint.x}"
          y="${labelPoint.y}"
          text-anchor="middle"
          dominant-baseline="middle"
          transform="rotate(${rotate} ${labelPoint.x} ${labelPoint.y})"
          fill="${isDark ? "#f7f0ff" : "#2d2831"}"
          font-size="9"
          font-weight="700"
        >${escapeHtml(truncateLabel(sector.option.text))}</text>
      `;
    })
    .join("");

  return `
    <svg
      class="wheel-svg"
      id="wheelSvg"
      viewBox="0 0 200 200"
      role="img"
      aria-label="大转盘"
      style="transform: rotate(${wheelState.rotation}deg); --wheel-duration: ${wheelState.duration}ms;"
    >
      ${parts}
      <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="3"></circle>
    </svg>
  `;
}

function getWheelSectorColor(index, isDark = false) {
  const palette = isDark ? wheelDarkColors : wheelColors;
  return palette[index % palette.length];
}

function buildWheelSectors() {
  const validOptions = getValidWheelOptions();
  const totalWeight = validOptions.reduce((sum, option) => sum + option.weight, 0);
  let cursor = -90;

  return validOptions.map((option) => {
    const span = (option.weight / totalWeight) * 360;
    const sector = {
      option,
      startAngle: cursor,
      endAngle: cursor + span,
      centerAngle: cursor + span / 2,
    };
    cursor += span;
    return sector;
  });
}

function spinWheel() {
  if (wheelState.isSpinning || state.page !== "wheel") return;
  if (window.mehNavigation.getTopItem()?.type === "wheel-history") {
    window.mehNavigation.requestBack("wheel-spin");
  }

  const sectors = buildWheelSectors();
  const selected = pickWeightedSector(sectors);
  const targetRotation = calculateWheelRotation(selected.centerAngle);

  wheelState.isSpinning = true;
  wheelState.duration = 2200 + Math.floor(Math.random() * 1600);
  updateActionButtons();
  renderWheelPage();

  window.clearTimeout(wheelSpinTimer);
  window.requestAnimationFrame(() => {
    const wheel = document.querySelector("#wheelSvg");
    if (wheel) {
      wheel.style.setProperty("--wheel-duration", `${wheelState.duration}ms`);
      wheel.style.transform = `rotate(${targetRotation}deg)`;
    }
  });

  wheelSpinTimer = window.setTimeout(() => {
    wheelState.rotation = targetRotation;
    wheelState.result = selected.option.text;
    wheelState.history.push(selected.option.text);
    wheelState.isSpinning = false;
    wheelState.historyExpanded = false;
    if (state.page === "wheel") renderWheelPage();
    updateActionButtons();
  }, wheelState.duration);
}

function pickWeightedSector(sectors) {
  const total = sectors.reduce((sum, sector) => sum + sector.option.weight, 0);
  let ticket = Math.random() * total;

  for (const sector of sectors) {
    ticket -= sector.option.weight;
    if (ticket <= 0) return sector;
  }

  return sectors.at(-1);
}

function calculateWheelRotation(centerAngle) {
  const current = normalizeDegrees(wheelState.rotation);
  const delta = normalizeDegrees(-90 - centerAngle - current);
  const spins = 4 + Math.floor(Math.random() * 3);
  return wheelState.rotation + spins * 360 + delta;
}

function updateWheelStats() {
  resetTopStatsClasses();
  els.topStats.classList.add("is-wheel");
  els.topStats.classList.toggle("is-expanded", wheelState.historyExpanded);

  const total = wheelState.history.length;
  const latest = total ? formatWheelHistoryItem(0, total, wheelState.history.at(-1)) : t("noResult");
  const items = wheelState.history
    .slice()
    .reverse()
    .map((item, index) => `<div class="wheel-history-item">${escapeHtml(formatWheelHistoryItem(index, total, item))}</div>`)
    .join("");

  els.topStats.innerHTML = `
    <button class="wheel-last-button" id="wheelHistoryButton" type="button">
      <span class="material-symbols-rounded" aria-hidden="true">history</span>
      <span>${escapeHtml(latest)}</span>
    </button>
    <div class="wheel-history-menu">
      ${items || `<div class="wheel-history-item">${t("noHistory")}</div>`}
    </div>
  `;
  hydrateOfflineIcons(els.topStats);

  document.querySelector("#wheelHistoryButton").addEventListener("click", () => {
    openTransientItem("wheel-history", { page: "wheel" });
  });
}

function resetWheelHistory() {
  if (window.mehNavigation.getTopItem()?.type === "wheel-history") {
    window.mehNavigation.requestBack("reset");
  }
  window.clearTimeout(wheelSpinTimer);
  wheelState.result = null;
  wheelState.isSpinning = false;
  wheelState.history = [];
  wheelState.historyExpanded = false;
  renderWheelPage();
  updateActionButtons();
}

function getWheelResultText() {
  const presetName = getActiveWheelPresetName();

  if (wheelState.isSpinning) {
    return { title: presetName, hint: t("wheelSpinningHint") };
  }
  if (wheelState.result) {
    return { title: presetName, hint: wheelState.result };
  }
  return { title: presetName, hint: t("wheelReadyHint") };
}

function openWheelEditor() {
  openTopLevelItem("preset-editor", {
    presetId: wheelState.selectedPresetId,
  });
}

function renderWheelEditor() {
  renderWheelPresetSelect();
  if (wheelState.selectedPresetId) {
    els.wheelPresetName.value = getActiveWheelPresetName();
  } else if (!els.wheelPresetName.value.trim()) {
    els.wheelPresetName.value = `新预设 ${wheelState.presets.length + 1}`;
  }
  els.wheelOptionCount.value = wheelState.options.length;
  renderWheelOptionRows();
}

function renderWheelPresetSelect() {
  els.wheelPresetSelect.innerHTML = wheelState.presets
    .map((preset) => `<option value="${preset.id}">${escapeHtml(preset.name)}</option>`)
    .join("");
  els.wheelPresetSelect.value = wheelState.selectedPresetId;
  renderWheelPresetChips();
}

function renderWheelPresetChips() {
  els.wheelPresetList.innerHTML = wheelState.presets
    .map(
      (preset) => `
        <button class="preset-chip ${preset.id === wheelState.selectedPresetId ? "is-active" : ""}" type="button" data-preset-id="${preset.id}">
          ${escapeHtml(preset.name)}
        </button>
      `
    )
    .join("");

  els.wheelPresetList.querySelectorAll(".preset-chip").forEach((button) => {
    let pressTimer = null;
    let didLongPress = false;
    const presetId = button.dataset.presetId;

    button.addEventListener("click", () => {
      if (didLongPress) {
        didLongPress = false;
        return;
      }
      applyWheelPreset(presetId);
      renderWheelEditor();
      renderWheelPageIfActive();
    });
    button.addEventListener("pointerdown", () => {
      didLongPress = false;
      button.classList.add("is-pressing");
      pressTimer = window.setTimeout(() => {
        didLongPress = true;
        deleteWheelPreset(presetId);
      }, 650);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
      button.addEventListener(eventName, () => {
        window.clearTimeout(pressTimer);
        button.classList.remove("is-pressing");
      });
    });
  });
}

function renderWheelOptionRows() {
  els.wheelOptionList.innerHTML = wheelState.options
    .map((option, index) => `
      <div class="wheel-option-row">
        <input class="editor-field" type="text" value="${escapeHtml(option.text)}" data-wheel-text="${index}" aria-label="${t("option")} ${index + 1}" />
        <input class="editor-field" type="number" min="0.1" step="0.1" value="${option.weight}" data-wheel-weight="${index}" aria-label="${t("optionWeight")} ${index + 1}" />
        <button class="delete-option-button" type="button" data-wheel-delete="${index}" aria-label="${t("clear")} ${t("option")} ${index + 1}">
          <span class="material-symbols-rounded" aria-hidden="true">delete</span>
        </button>
      </div>
    `)
    .join("");

  els.wheelOptionList.querySelectorAll("[data-wheel-text]").forEach((input) => {
    input.addEventListener("input", () => {
      wheelState.options[Number(input.dataset.wheelText)].text = input.value || t("unnamedWheelPreset");
      renderWheelPageIfActive();
    });
  });
  els.wheelOptionList.querySelectorAll("[data-wheel-weight]").forEach((input) => {
    input.addEventListener("input", () => {
      wheelState.options[Number(input.dataset.wheelWeight)].weight = normalizeWeight(input.value);
      renderWheelPageIfActive();
    });
  });
  els.wheelOptionList.querySelectorAll("[data-wheel-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteWheelOption(Number(button.dataset.wheelDelete)));
  });
  hydrateOfflineIcons(els.wheelOptionList);
}

function syncWheelOptionCount() {
  const nextCount = Math.max(2, Math.min(12, Number(els.wheelOptionCount.value) || 2));

  while (wheelState.options.length < nextCount) {
    wheelState.options.push({ text: `${t("option")} ${wheelState.options.length + 1}`, weight: 1 });
  }
  while (wheelState.options.length > nextCount) {
    wheelState.options.pop();
  }

  renderWheelEditor();
  renderWheelPageIfActive();
}

function addWheelOption() {
  if (wheelState.options.length >= 12) return;
  wheelState.options.push({ text: `${t("option")} ${wheelState.options.length + 1}`, weight: 1 });
  renderWheelEditor();
  renderWheelPageIfActive();
}

function deleteWheelOption(index) {
  if (wheelState.options.length <= 2) return;
  wheelState.options.splice(index, 1);
  renderWheelEditor();
  renderWheelPageIfActive();
}

function createNewWheelPreset() {
  const preset = {
    id: createId(),
    name: `${t("newPreset")} ${wheelState.presets.length + 1}`,
    options: createDefaultWheelOptions(),
  };

  wheelState.presets.push(preset);
  wheelState.selectedPresetId = preset.id;
  wheelState.options = cloneOptions(preset.options);
  wheelState.result = null;
  wheelState.rotation = 0;
  saveWheelPresets();
  renderWheelEditor();
  renderWheelPageIfActive();
}

function updateCurrentWheelPresetName() {
  const preset = wheelState.presets.find((item) => item.id === wheelState.selectedPresetId);
  if (!preset) return;

  preset.name = els.wheelPresetName.value.trim() || t("unnamedWheelPreset");
  saveWheelPresets();
  updateWheelPresetNameViews(preset);
  renderWheelPageIfActive();
}

function updateWheelPresetNameViews(preset) {
  Array.from(els.wheelPresetSelect.options).forEach((option) => {
    if (option.value === preset.id) option.textContent = preset.name;
  });

  els.wheelPresetList.querySelectorAll(".preset-chip").forEach((button) => {
    if (button.dataset.presetId === preset.id) button.textContent = preset.name;
  });
}

function deleteWheelPreset(id) {
  if (wheelState.presets.length <= 1) return;

  wheelState.presets = wheelState.presets.filter((preset) => preset.id !== id);
  if (wheelState.selectedPresetId === id) {
    applyWheelPreset(wheelState.presets[0].id);
  }
  saveWheelPresets();
  renderWheelEditor();
  renderWheelPageIfActive();
}

function saveCurrentWheelPreset() {
  const name = els.wheelPresetName.value.trim() || t("unnamedWheelPreset");
  const preset = {
    id: wheelState.selectedPresetId || createId(),
    name,
    options: cloneOptions(wheelState.options),
  };
  const index = wheelState.presets.findIndex((item) => item.id === preset.id);

  if (index >= 0) {
    wheelState.presets[index] = preset;
  } else {
    wheelState.presets.push(preset);
  }

  wheelState.selectedPresetId = preset.id;
  saveWheelPresets();
  renderWheelEditor();
  renderWheelPageIfActive();
}

function applyWheelPreset(id) {
  const preset = wheelState.presets.find((item) => item.id === id) || wheelState.presets[0];
  if (!preset) return;

  wheelState.selectedPresetId = preset.id;
  wheelState.options = cloneOptions(preset.options);
  wheelState.result = null;
  wheelState.rotation = 0;
}

function loadWheelPresets() {
  const saved = safeReadStorage(WHEEL_PRESETS_KEY, null);
  if (Array.isArray(saved) && saved.length) return normalizeWheelPresets(saved);

  const initial = [
    {
      id: createId(),
      name: t("defaultWheelPreset"),
      options: createDefaultWheelOptions(),
    },
  ];
  safeWriteStorage(WHEEL_PRESETS_KEY, initial);
  return initial;
}

function saveWheelPresets() {
  safeWriteStorage(WHEEL_PRESETS_KEY, wheelState.presets);
}

function normalizeWheelPresets(presets) {
  return presets.map((preset) => ({
    id: preset.id || createId(),
    name: preset.name || t("unnamedWheelPreset"),
    options: sanitizeWheelOptions(preset.options),
  }));
}

function sanitizeWheelOptions(options) {
  const list = Array.isArray(options) && options.length >= 2 ? options : createDefaultWheelOptions();
  return list.slice(0, 12).map((option, index) => ({
    text: String(option.text || `${t("option")} ${index + 1}`),
    weight: normalizeWeight(option.weight),
  }));
}

function getValidWheelOptions() {
  return sanitizeWheelOptions(wheelState.options).filter((option) => option.weight > 0);
}

function getActiveWheelPresetName() {
  const preset = wheelState.presets.find((item) => item.id === wheelState.selectedPresetId);
  return preset?.name || t("defaultWheelPreset");
}

function createDefaultWheelOptions() {
  return [1, 2, 3, 4].map((number) => ({ text: `${t("option")} ${number}`, weight: 1 }));
}

function renderWheelPageIfActive() {
  if (state.page === "wheel") renderWheelPage();
}

// 随机数相关逻辑
function renderNumberPage() {
  const resultText = getNumberResultText();
  updateNumberHistoryStats();

  els.pageContent.innerHTML = `
    <div class="number-stage">
      <div class="number-content">
        <div id="numberDisplay" class="number-display ${numberState.shouldAnimate ? "is-pop" : ""}">
          ${renderNumberResultDisplay()}
        </div>
        <p class="number-result">${resultText.title}</p>
        <p class="number-hint">${resultText.hint}</p>
      </div>
    </div>
  `;
}

function renderNumberResultDisplay() {
  if (!numberState.result) {
    return `<span class="number-display-single">?</span>`;
  }

  if (numberState.result.length === 1) {
    return `<span class="number-display-single">${numberState.result[0]}</span>`;
  }

  return `
    <div class="number-display-group">
      ${numberState.result.map((value) => `<span class="number-result-chip">${value}</span>`).join("")}
    </div>
  `;
}

function generateRandomNumbers() {
  if (state.page !== "number") return;
  if (window.mehNavigation.getTopItem()?.type === "number-history") {
    window.mehNavigation.requestBack("number-generate");
  }

  const result = createRandomNumberResult();

  numberState.result = result;
  numberState.history.push(result);
  numberState.historyExpanded = false;

  // 只有点击“开始 / 继续”时才开启动画
  numberState.shouldAnimate = true;
  renderNumberPage();

  // 渲染后立刻关掉状态，避免切换导航回来时再次动画
  numberState.shouldAnimate = false;

  const numberDisplay = document.querySelector("#numberDisplay");
  if (numberDisplay) {
    numberDisplay.classList.remove("is-pop");
    numberDisplay.offsetWidth; // 强制重排，保证连续点击也能重新播放动画
    numberDisplay.classList.add("is-pop");

    window.setTimeout(() => {
      numberDisplay.classList.remove("is-pop");
    }, 420);
  }

  updateActionButtons();
}

function createRandomNumberResult() {
  const settings = normalizeNumberSettings(numberState.settings);
  const low = Math.min(settings.min, settings.max);
  const high = Math.max(settings.min, settings.max);
  const available = high - low + 1;
  const count = settings.allowRepeat ? settings.count : Math.min(settings.count, available);

  if (settings.allowRepeat) {
    return Array.from({ length: count }, () => randomInt(low, high));
  }

  const pool = Array.from({ length: available }, (_, index) => low + index);
  const result = [];

  while (result.length < count && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }

  return result;
}

function updateNumberHistoryStats() {
  resetTopStatsClasses();
  els.topStats.classList.add("is-number-group");
  els.topStats.classList.toggle("is-expanded", numberState.historyExpanded);

  const total = numberState.history.length;
  const latest = total
    ? formatRandomGroupHistoryItem(0, total, numberState.history.at(-1))
    : t("noResult");

  const items = total
    ? numberState.history
        .slice()
        .reverse()
        .map((group, index) => {
          return `<div class="wheel-history-item">${escapeHtml(formatRandomGroupHistoryItem(index, total, group))}</div>`;
        })
        .join("")
    : `<div class="wheel-history-item">${t("noHistory")}</div>`;

  els.topStats.innerHTML = `
    <button class="wheel-last-button" id="numberHistoryButton" type="button">
      <span class="material-symbols-rounded" aria-hidden="true">history</span>
      <span>${escapeHtml(latest)}</span>
    </button>
    <div class="wheel-history-menu">
      ${items}
    </div>
  `;
  hydrateOfflineIcons(els.topStats);

  const button = document.querySelector("#numberHistoryButton");
  if (button) {
    button.addEventListener("click", () => {
      openTransientItem("number-history", { page: "number" });
    });
  }
}

function resetNumberHistory() {
  if (window.mehNavigation.getTopItem()?.type === "number-history") {
    window.mehNavigation.requestBack("reset");
  }
  numberState.result = null;
  numberState.history = [];
  numberState.historyExpanded = false;
  numberState.shouldAnimate = false;
  renderNumberPage();
  updateActionButtons();
}

function openNumberSettings() {
  openTopLevelItem("number-settings");
}

function renderNumberSettingsPanel() {
  const settings = normalizeNumberSettings(numberState.settings);
  els.numberMinInput.value = settings.min;
  els.numberMaxInput.value = settings.max;
  els.numberCountInput.value = settings.count;
  els.numberRepeatInput.checked = settings.allowRepeat;
}

function saveNumberSettingsFromPanel() {
  numberState.settings = normalizeNumberSettings({
    min: Number(els.numberMinInput.value),
    max: Number(els.numberMaxInput.value),
    count: Number(els.numberCountInput.value),
    allowRepeat: els.numberRepeatInput.checked,
  });
  saveNumberSettings();
  numberState.historyExpanded = false;
  if (state.page === "number") renderNumberPage();
  window.mehNavigation.back("save-action");
}

function loadNumberSettings() {
  const saved = safeReadStorage(NUMBER_SETTINGS_KEY, {});
  return normalizeNumberSettings({ ...defaultNumberSettings, ...saved });
}

function saveNumberSettings() {
  safeWriteStorage(NUMBER_SETTINGS_KEY, numberState.settings);
}

function normalizeNumberSettings(settings) {
  const min = Number.isFinite(Number(settings.min)) ? Number(settings.min) : defaultNumberSettings.min;
  const max = Number.isFinite(Number(settings.max)) ? Number(settings.max) : defaultNumberSettings.max;
  const count = Math.max(1, Math.min(50, Math.floor(Number(settings.count) || defaultNumberSettings.count)));

  return {
    min,
    max,
    count,
    allowRepeat: Boolean(settings.allowRepeat),
  };
}

function getNumberResultText() {
  const settings = numberState.settings;
  const rangeText = t("rangeTo", { min: Math.min(settings.min, settings.max), max: Math.max(settings.min, settings.max) });

  if (!numberState.result) {
    return { title: t("numberReadyTitle"), hint: t("numberReadyHint", { range: rangeText }) };
  }

  if (numberState.result.length === 1) {
    return { title: t("number"), hint: t("numberSingleHint", { range: rangeText }) };
  }

  return { title: t("numberGroupTitle"), hint: t("numberGroupHint", { range: rangeText }) };
}

function formatNumberGroup(group) {
  return group.join(", ");
}
async function initSettings() {
  els.primaryThemeColorInput.value = appSettings.primaryThemeColor;
  els.secondaryThemeColorInput.value = appSettings.secondaryThemeColor;
  els.uiScaleRange.value = appSettings.uiScale;
  els.languageSelect.value = appSettings.language;
  if (els.darkModeSelect) els.darkModeSelect.value = appSettings.darkMode;
  applyLayoutSettings();
  if (els.bgOpacityRange && els.bgOpacityValue) {
    els.bgOpacityRange.value = appSettings.backgroundOpacity ?? 0.5;
    els.bgOpacityValue.textContent = Number(appSettings.backgroundOpacity ?? 0.5).toFixed(2);
    
    els.bgOpacityRange.addEventListener("input", () => {
      appSettings.backgroundOpacity = Number(els.bgOpacityRange.value);
      els.bgOpacityValue.textContent = appSettings.backgroundOpacity.toFixed(2);
      const activeWallpaper = getActiveWallpaper();
      applyBackgroundImage(activeWallpaper?.dataUrl || "", appSettings.backgroundOpacity);
      saveAppSettings();
    });
  }

  renderColorSwatches();
  initCustomColorPickers();
  applyThemeColor(appSettings.primaryThemeColor, appSettings.secondaryThemeColor);
  applyUiScale(appSettings.uiScale);
  await loadWallpapers();

  els.uiScaleRange.addEventListener("input", () => {
    appSettings.uiScale = Number(els.uiScaleRange.value);
    applyUiScale(appSettings.uiScale);
    saveAppSettings();
  });

  bindLayoutRange(els.topHeightRange, els.topHeightValue, "topHeight");
  bindLayoutRange(els.dockThicknessRange, els.dockThicknessValue, "dockThickness");
  bindLayoutRange(els.dockSideGapRange, els.dockSideGapValue, "dockSideGap");
  bindLayoutRange(els.dockBottomGapRange, els.dockBottomGapValue, "dockBottomGap");
  
  if (els.presetWallpaperGrid) {
    els.presetWallpaperGrid.addEventListener("click", handleWallpaperGridClick);
    els.presetWallpaperGrid.addEventListener("keydown", handleWallpaperGridKeydown);
  }

  if (els.backgroundImageInput) {
    els.backgroundImageInput.addEventListener("change", handleBackgroundImageSelect);
  }

  if (els.wallpaperDeleteToggle) {
    els.wallpaperDeleteToggle.addEventListener("click", toggleWallpaperDeleteMode);
  }

  if (els.clearBackgroundButton) {
    els.clearBackgroundButton.addEventListener("click", clearCurrentBackground);
  }

  els.languageSelect.addEventListener("change", () => {
    setLanguage(els.languageSelect.value);
  });

  els.languageMenuButton.addEventListener("click", () => {
    openTransientItem("language-menu", { owner: "settings" });
  });

  els.languageMenu.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.langOption);
      if (window.mehNavigation.getTopItem()?.type === "language-menu") {
        window.mehNavigation.requestBack("selection");
      } else {
        closeLanguageMenu();
      }
    });
  });
  bindDarkModeMenu();
}

function renderColorSwatches() {
  syncColorPickerPreviews();

  renderSwatchGroup(els.primarySwatches, primarySwatches, appSettings.primaryThemeColor, (color) => {
    setThemeColor("primary", color);
  }, () => toggleCustomColorPicker("primary"));

  renderSwatchGroup(els.secondarySwatches, secondarySwatches, appSettings.secondaryThemeColor, (color) => {
    setThemeColor("secondary", color);
  }, () => toggleCustomColorPicker("secondary"));
}

function syncColorPickerPreviews() {
  updateColorPickerPreview(els.primaryThemeColorInput, appSettings.primaryThemeColor);
  updateColorPickerPreview(els.secondaryThemeColorInput, appSettings.secondaryThemeColor);
}

function updateColorPickerPreview(input, color) {
  const picker = input.closest(".advanced-color-picker");
  if (!picker) return;

  const normalized = normalizeHexColor(color, defaultAppSettings.secondaryThemeColor);
  const kind = picker.dataset.colorPicker;
  const hsv = hexToHsv(normalized);
  customPickerState[kind] = { hue: hsv.h, saturation: hsv.s, value: hsv.v };

  picker.style.setProperty("--picker-color", normalized);
  picker.style.setProperty("--hue-color", hsvToHex(hsv.h, 1, 1));
  picker.style.setProperty("--picker-x", `${Math.round(hsv.s * 100)}%`);
  picker.style.setProperty("--picker-y", `${Math.round((1 - hsv.v) * 100)}%`);
  picker.style.setProperty("--hue-x", `${Math.round((hsv.h / 360) * 100)}%`);
  picker.querySelector(".picker-hue-range").value = Math.round(hsv.h);
}

function renderSwatchGroup(container, colors, activeColor, onPick, onAdd) {
  container.innerHTML = colors
    .map(
      (color) => `
        <button class="swatch-button ${color.toLowerCase() === activeColor.toLowerCase() ? "is-active" : ""}" type="button" style="--swatch: ${color}" aria-label="${color}" data-color="${color}"></button>
      `
    )
    .join("") +
    `
      <button class="swatch-button swatch-add-button" type="button" aria-label="Custom color">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
      </button>
    `;

  container.querySelectorAll(".swatch-button").forEach((button) => {
    if (button.dataset.color) {
      button.addEventListener("click", () => onPick(button.dataset.color));
    }
  });

  container.querySelector(".swatch-add-button").addEventListener("click", onAdd);
  hydrateOfflineIcons(container);
}
function initCustomColorPickers() {
  document.querySelectorAll(".advanced-color-picker").forEach((picker) => {
    const kind = picker.dataset.colorPicker;
    const field = picker.querySelector(".picker-field");
    const hueRange = picker.querySelector(".picker-hue-range");

    let isDragging = false;
    let animationFrameId = null;

    field.addEventListener("pointerdown", (event) => {
      field.setPointerCapture(event.pointerId);
      isDragging = true;
      updateCustomColorFromField(kind, field, event, false);
    });

    field.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        updateCustomColorFromField(kind, field, event, false);
      });
    });

    const stopDrag = (event) => {
      if (isDragging) {
        field.releasePointerCapture(event.pointerId);
        isDragging = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        updateCustomColorFromField(kind, field, event, true);
      }
    };

    field.addEventListener("pointerup", stopDrag);
    field.addEventListener("pointercancel", stopDrag);

    hueRange.addEventListener("input", () => {
      customPickerState[kind].hue = Number(hueRange.value);
      setThemeColor(kind, hsvToHex(customPickerState[kind].hue, customPickerState[kind].saturation, customPickerState[kind].value), true);
    });
  });
}

function setColorPickerVisibility(kind) {
  document.querySelectorAll(".advanced-color-picker").forEach((picker) => {
    picker.hidden = picker.dataset.colorPicker !== kind;
  });
}

function toggleCustomColorPicker(kind) {
  const top = window.mehNavigation.getTopItem();
  if (top?.type === "advanced-color-picker" && top.context.kind === kind) {
    window.mehNavigation.requestBack("toggle");
    return;
  }
  openTransientItem("advanced-color-picker", {
    owner: "settings",
    kind,
  });
}
function updateCustomColorFromField(kind, field, event, isFinal = false) {
  const rect = field.getBoundingClientRect();
  const saturation = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const value = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

  customPickerState[kind].saturation = saturation;
  customPickerState[kind].value = value;
  setThemeColor(kind, hsvToHex(customPickerState[kind].hue, saturation, value), isFinal);
}

function setThemeColor(kind, color, isFinal = true) {
  const normalized = normalizeHexColor(color, kind === "primary" ? defaultAppSettings.primaryThemeColor : defaultAppSettings.secondaryThemeColor);

  if (kind === "primary") {
    appSettings.primaryThemeColor = normalized;
    els.primaryThemeColorInput.value = normalized;
  } else {
    appSettings.secondaryThemeColor = normalized;
    els.secondaryThemeColorInput.value = normalized;
  }

  applyThemeColor(appSettings.primaryThemeColor, appSettings.secondaryThemeColor);
  syncColorPickerPreviews();

  if (isFinal) {
    renderColorSwatches();
    saveAppSettings();
  }
}

function applyThemeColor(primaryColor, secondaryColor) {
  const background = normalizeHexColor(primaryColor, defaultAppSettings.primaryThemeColor);
  const accent = normalizeHexColor(secondaryColor, defaultAppSettings.secondaryThemeColor);
  const isDark = getResolvedDarkMode();

  const primaryContainer = isDark
    ? mixHex(accent, "#1d1b20", 0.62)
    : mixHex(accent, "#ffffff", 0.78);

  const surface = isDark
    ? mixHex(background, "#111014", 0.82)
    : mixHex(background, "#ffffff", 0.72);

  const surfaceContainer = isDark
    ? mixHex(background, "#1d1b20", 0.72)
    : mixHex(background, "#ffffff", 0.58);

  const surfaceContainerHigh = isDark
    ? mixHex(background, "#24212a", 0.66)
    : mixHex(background, "#ffffff", 0.48);

  els.root.classList.toggle("theme-dark", isDark);
  els.root.style.colorScheme = isDark ? "dark" : "light";

  els.root.style.setProperty("--primary", accent);
  els.root.style.setProperty("--on-primary", getReadableTextColor(accent));
  els.root.style.setProperty("--primary-container", primaryContainer);
  els.root.style.setProperty("--on-primary-container", isDark ? "#f7eef7" : getReadableTextColor(primaryContainer));
  els.root.style.setProperty("--secondary", background);
  els.root.style.setProperty("--surface", surface);
  els.root.style.setProperty("--surface-container", surfaceContainer);
  els.root.style.setProperty("--surface-container-high", surfaceContainerHigh);
  els.root.style.setProperty("--on-surface", isDark ? "#f2edf4" : "#1d1b20");
  els.root.style.setProperty("--on-surface-variant", isDark ? "#d0c4cf" : "#4d444c");
  els.root.style.setProperty("--outline", isDark ? mixHex(accent, "#d0c4cf", 0.62) : mixHex(accent, "#6f6770", 0.72));
  els.root.style.setProperty("--dock-bg", isDark ? "rgba(28, 27, 31, 0.88)" : mixHex(background, "#ffffff", 0.56));

  const statusColor = surface;
  const isIosPwa = isIosPwaRuntime();
  if (isIosPwa) {
    document.querySelectorAll("meta[name='theme-color']").forEach((meta) => meta.remove());
  } else {
    document.querySelectorAll("meta[name='theme-color']").forEach((meta) => {
      meta.setAttribute("content", statusColor);
    });
  }

  if (window.MehAndroid?.setSystemBarColor) {
    window.MehAndroid.setSystemBarColor(surface, isDark);
  }
}

function getResolvedDarkMode() {
  if (appSettings.darkMode === "dark") return true;
  if (appSettings.darkMode === "light") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (appSettings.darkMode === "auto") {
      applyThemeColor(appSettings.primaryThemeColor, appSettings.secondaryThemeColor);
      refreshThemeSensitivePage();
    }
  });
}

function refreshThemeSensitivePage() {
  if (state.page === "wheel") renderWheelPage();
}

function applyUiScale(scale) {
  const safeScale = Math.max(0.85, Math.min(1.25, Number(scale) || 1));
  appSettings.uiScale = safeScale;
  els.root.style.setProperty("--ui-scale", safeScale);
  els.uiScaleRange.value = safeScale;
  els.uiScaleValue.textContent = safeScale.toFixed(2);
}
function bindLayoutRange(input, valueNode, key) {
  if (!input || !valueNode) return;

  input.value = appSettings[key];
  valueNode.textContent = appSettings[key];

  const applyRangeValue = () => {
    appSettings[key] = Number(input.value);
    valueNode.textContent = appSettings[key];
    applyLayoutSettings();
    saveAppSettings();
  };

  input.addEventListener("input", applyRangeValue);
  // Some iOS standalone versions only commit the native range control on release.
  input.addEventListener("change", applyRangeValue);
}

function renderDarkModeMenu() {
  if (!els.darkModeSelect || !els.darkModeMenuText || !els.darkModeMenu) return;

  const mode = appSettings.darkMode || "auto";
  els.darkModeSelect.value = mode;

  const textMap = {
    light: t("lightMode"),
    dark: t("darkModeOnly"),
    auto: t("autoMode"),
  };

  els.darkModeMenuText.textContent = textMap[mode] || textMap.auto;

  els.darkModeMenu.querySelectorAll("[data-dark-option]").forEach((button) => {
    const isActive = button.dataset.darkOption === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function applyLayoutSettings() {
  const topHeight = clampNumber(appSettings.topHeight, 0, 56, defaultAppSettings.topHeight);
  const dockThickness = clampNumber(appSettings.dockThickness, 46, 76, defaultAppSettings.dockThickness);
  const dockSideGap = clampNumber(appSettings.dockSideGap, 12, 64, defaultAppSettings.dockSideGap);
  const dockBottomGap = clampNumber(appSettings.dockBottomGap, 0, 40, defaultAppSettings.dockBottomGap);

  appSettings.topHeight = topHeight;
  appSettings.dockThickness = dockThickness;
  appSettings.dockSideGap = dockSideGap;
  appSettings.dockBottomGap = dockBottomGap;

  els.root.style.setProperty("--top-extra", `${topHeight}px`);
  els.root.style.setProperty("--dock-thickness", `${dockThickness}px`);
  els.root.style.setProperty("--dock-side-gap", `${dockSideGap}px`);
  els.root.style.setProperty("--dock-bottom-gap", `${dockBottomGap}px`);

  if (els.topHeightRange) els.topHeightRange.value = topHeight;
  if (els.topHeightValue) els.topHeightValue.textContent = topHeight;

  if (els.dockThicknessRange) els.dockThicknessRange.value = dockThickness;
  if (els.dockThicknessValue) els.dockThicknessValue.textContent = dockThickness;

  if (els.dockSideGapRange) els.dockSideGapRange.value = dockSideGap;
  if (els.dockSideGapValue) els.dockSideGapValue.textContent = dockSideGap;

  if (els.dockBottomGapRange) els.dockBottomGapRange.value = dockBottomGap;
  if (els.dockBottomGapValue) els.dockBottomGapValue.textContent = dockBottomGap;

  updateDockIndicator();
  scheduleLayoutDiagnostics("layout-setting");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function applyBackgroundImage(dataUrl, opacity = defaultAppSettings.backgroundOpacity) {
  const parsedOpacity = Number(opacity);
  const safeOpacity = Number.isFinite(parsedOpacity) ? Math.max(0, Math.min(1, parsedOpacity)) : defaultAppSettings.backgroundOpacity;
  const wallpaperLayer = dataUrl ? `url(${JSON.stringify(String(dataUrl))})` : "none";

  els.root.style.setProperty("--app-wallpaper-image", wallpaperLayer);
  els.root.style.setProperty("--app-wallpaper-opacity", safeOpacity);
  scheduleLayoutDiagnostics("background-image");
}

async function loadWallpapers() {
  try {
    wallpapers = await getAllWallpapersFromDb();
    wallpapers.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    await migrateLegacyBackgroundImage();
    applyActiveWallpaperFromSettings();
  } catch (error) {
    console.error("Failed to load wallpapers from IndexedDB:", error);
    wallpapers = [];

    // 极端情况下 IndexedDB 不可用时，保留旧版 localStorage 里的 dataURL 作为临时兜底，
    // 不再主动把新壁纸写进 localStorage。
    if (appSettings.backgroundImage && appSettings.backgroundImage.startsWith("data:image/")) {
      applyBackgroundImage(appSettings.backgroundImage, appSettings.backgroundOpacity);
    } else {
      appSettings.activeWallpaperId = "";
      appSettings.backgroundImage = "";
      applyBackgroundImage("", appSettings.backgroundOpacity);
      saveAppSettings();
    }
  }

  renderWallpaperGrid();
}

function renderWallpaperGrid() {
  if (!els.presetWallpaperGrid) return;

  const wallpaperButtons = wallpapers
    .map((wallpaper) => {
      const id = escapeHtml(wallpaper.id);
      const name = escapeHtml(wallpaper.name || t("uploadWallpaper"));
      const isActive = wallpaper.id === appSettings.activeWallpaperId;
      const deleteButton = isWallpaperDeleteMode
        ? `
          <span class="wallpaper-remove-button" role="button" tabindex="0" data-remove-wallpaper="${id}" aria-label="${escapeHtml(t("removeWallpaper"))}">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </span>
        `
        : "";

      return `
        <button class="preset-wallpaper-button ${isActive ? "is-active" : ""} ${isWallpaperDeleteMode ? "is-delete-mode" : ""}" type="button" data-wallpaper-id="${id}" aria-label="${name}">
          <img src="${wallpaper.dataUrl}" alt="" loading="lazy" />
          ${deleteButton}
        </button>
      `;
    })
    .join("");

  const addButton = wallpapers.length < MAX_WALLPAPERS
    ? `
      <button class="preset-wallpaper-button wallpaper-add-button" type="button" data-wallpaper-add aria-label="${escapeHtml(t("uploadWallpaper"))}">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
      </button>
    `
    : "";

  els.presetWallpaperGrid.innerHTML = wallpaperButtons + addButton;
  hydrateOfflineIcons(els.presetWallpaperGrid);

  if (els.wallpaperDeleteToggle) {
    const hasWallpapers = wallpapers.length > 0;
    if (!hasWallpapers) isWallpaperDeleteMode = false;

    const label = isWallpaperDeleteMode ? t("exitDeleteWallpaper") : t("deleteWallpaper");
    els.wallpaperDeleteToggle.hidden = !hasWallpapers;
    els.wallpaperDeleteToggle.classList.toggle("is-active", isWallpaperDeleteMode);
    els.wallpaperDeleteToggle.setAttribute("aria-label", label);
    els.wallpaperDeleteToggle.title = label;
  }
}

function handleWallpaperGridClick(event) {
  const removeButton = event.target.closest("[data-remove-wallpaper]");
  if (removeButton) {
    event.preventDefault();
    event.stopPropagation();
    removeWallpaper(removeButton.dataset.removeWallpaper);
    return;
  }

  if (event.target.closest("[data-wallpaper-add]")) {
    console.info("[Meh] Custom background button clicked");
    els.backgroundImageInput.value = "";
    els.backgroundImageInput.click();
    return;
  }

  const wallpaperButton = event.target.closest("[data-wallpaper-id]");
  if (!wallpaperButton || isWallpaperDeleteMode) return;

  selectWallpaper(wallpaperButton.dataset.wallpaperId);
}

function handleWallpaperGridKeydown(event) {
  if (!["Enter", " "].includes(event.key)) return;

  const removeButton = event.target.closest("[data-remove-wallpaper]");
  if (removeButton) {
    event.preventDefault();
    removeWallpaper(removeButton.dataset.removeWallpaper);
  }
}

async function clearCurrentBackground() {
  const activeId = appSettings.activeWallpaperId;
  try {
    if (activeId) {
      await deleteWallpaperFromDb(activeId);
      wallpapers = wallpapers.filter((item) => item.id !== activeId);
    }
    appSettings.activeWallpaperId = "";
    appSettings.backgroundImage = "";
    applyBackgroundImage("", appSettings.backgroundOpacity);
    saveAppSettings();
    if (els.backgroundImageInput) els.backgroundImageInput.value = "";
    if (wallpapers.length === 0) isWallpaperDeleteMode = false;
    renderWallpaperGrid();
    console.info("[Meh] Custom background deleted successfully");
  } catch (error) {
    console.error("[Meh] Failed to delete custom background:", error);
  }
}

function toggleWallpaperDeleteMode() {
  if (wallpapers.length === 0) {
    isWallpaperDeleteMode = false;
    renderWallpaperGrid();
    return;
  }

  isWallpaperDeleteMode = !isWallpaperDeleteMode;
  renderWallpaperGrid();
}

function getActiveWallpaper() {
  return wallpapers.find((wallpaper) => wallpaper.id === appSettings.activeWallpaperId) || null;
}

function applyActiveWallpaperFromSettings() {
  const activeWallpaper = getActiveWallpaper();

  if (activeWallpaper) {
    appSettings.backgroundImage = "";
    applyBackgroundImage(activeWallpaper.dataUrl, appSettings.backgroundOpacity);
    saveAppSettings();
    return;
  }

  if (appSettings.activeWallpaperId || appSettings.backgroundImage) {
    appSettings.activeWallpaperId = "";
    appSettings.backgroundImage = "";
    saveAppSettings();
  }

  applyBackgroundImage("", appSettings.backgroundOpacity);
}

async function selectWallpaper(id) {
  const wallpaper = wallpapers.find((item) => item.id === id);
  if (!wallpaper) return;

  appSettings.activeWallpaperId = wallpaper.id;
  appSettings.backgroundImage = "";
  applyBackgroundImage(wallpaper.dataUrl, appSettings.backgroundOpacity);
  requestPersistentStorage();
  saveAppSettings();
  renderWallpaperGrid();
}

async function removeWallpaper(id) {
  const wallpaper = wallpapers.find((item) => item.id === id);
  if (!wallpaper) return;
  try {
    await deleteWallpaperFromDb(id);
    wallpapers = wallpapers.filter((item) => item.id !== id);

    if (appSettings.activeWallpaperId === id) {
      appSettings.activeWallpaperId = "";
      appSettings.backgroundImage = "";
      applyBackgroundImage("", appSettings.backgroundOpacity);
      saveAppSettings();
    }

    if (wallpapers.length === 0) isWallpaperDeleteMode = false;
    if (els.backgroundImageInput) els.backgroundImageInput.value = "";
    renderWallpaperGrid();
    console.info("[Meh] Wallpaper deleted successfully");
  } catch (error) {
    console.error("[Meh] Failed to delete wallpaper:", error);
  }
}

async function handleBackgroundImageSelect(event) {
  console.info("[Meh] Background file selection callback received");
  const slotsLeft = MAX_WALLPAPERS - wallpapers.length;
  const files = Array.from(event.target.files || [])
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, Math.max(0, slotsLeft));

  if (!files.length) {
    console.info("[Meh] Background file selection cancelled or contained no supported image");
    event.target.value = "";
    return;
  }

  const createdWallpapers = [];
  try {
    for (const [index, file] of files.entries()) {
      const dataUrl = await readWallpaperFile(file);
      const wallpaper = {
        id: createWallpaperId(),
        name: file.name || t("uploadWallpaper"),
        type: file.type || "image/*",
        dataUrl,
        createdAt: Date.now() + index,
      };

      await saveWallpaperToDb(wallpaper);
      wallpapers.push(wallpaper);
      createdWallpapers.push(wallpaper);
    }

    wallpapers.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    const latestWallpaper = createdWallpapers.at(-1);
    console.info(`[Meh] Saved ${createdWallpapers.length} background image(s) to IndexedDB`);
    if (latestWallpaper) await selectWallpaper(latestWallpaper.id);
    else renderWallpaperGrid();
  } catch (error) {
    console.error("[Meh] Failed to read or save background image:", error);
    renderWallpaperGrid();
  } finally {
    event.target.value = "";
  }
}

async function readWallpaperFile(file) {
  if (file.size <= 8 * 1024 * 1024) return readFileAsDataUrl(file);
  if (typeof createImageBitmap !== "function") return readFileAsDataUrl(file);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    console.warn("[Meh] Large image resize unavailable; preserving original image data", error);
    return readFileAsDataUrl(file);
  }
  try {
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    bitmap.close();
  }
}

async function migrateLegacyBackgroundImage() {
  const legacyImage = appSettings.backgroundImage;
  if (appSettings.activeWallpaperId || !legacyImage) return;

  if (!legacyImage.startsWith("data:image/")) {
    appSettings.backgroundImage = "";
    saveAppSettings();
    return;
  }

  if (wallpapers.length >= MAX_WALLPAPERS) return;

  const migratedWallpaper = {
    id: createWallpaperId(),
    name: "legacy-background",
    type: "image/*",
    dataUrl: legacyImage,
    createdAt: Date.now(),
  };

  await saveWallpaperToDb(migratedWallpaper);
  wallpapers.push(migratedWallpaper);
  appSettings.activeWallpaperId = migratedWallpaper.id;
  appSettings.backgroundImage = "";
  saveAppSettings();
}

function openWallpaperDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }

    const request = indexedDB.open(WALLPAPER_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WALLPAPER_STORE_NAME)) {
        db.createObjectStore(WALLPAPER_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllWallpapersFromDb() {
  const db = await openWallpaperDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WALLPAPER_STORE_NAME, "readonly");
    const store = transaction.objectStore(WALLPAPER_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function saveWallpaperToDb(wallpaper) {
  const db = await openWallpaperDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WALLPAPER_STORE_NAME, "readwrite");
    const store = transaction.objectStore(WALLPAPER_STORE_NAME);
    store.put(wallpaper);

    transaction.oncomplete = () => {
      db.close();
      requestPersistentStorage();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function deleteWallpaperFromDb(id) {
  const db = await openWallpaperDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WALLPAPER_STORE_NAME, "readwrite");
    const store = transaction.objectStore(WALLPAPER_STORE_NAME);
    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function createWallpaperId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `wallpaper-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setLanguage(lang) {
  appSettings.language = i18n[lang] ? lang : defaultAppSettings.language;
  els.languageSelect.value = appSettings.language;
  updateLanguageMenu();
  saveAppSettings();
  applyI18n();
  if (els.wheelEditorSheet.classList.contains("is-open")) renderWheelEditor();
  if (els.numberSettingsSheet.classList.contains("is-open")) renderNumberSettingsPanel();
  renderPage();
}

function applyI18n() {
  const lang = appSettings.language;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  updateLanguageMenu();
  updateAppIdentity(lang);
  els.resetButton.textContent = t("reset");
  els.continueButton.textContent = isCurrentPageEmpty() ? t("start") : t("continue");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-nav-label]").forEach((node) => {
    node.textContent = t(node.dataset.navLabel);
  });
  renderWallpaperGrid();
  renderDarkModeMenu();
  updateDarkModeMenu();
  if (els.pwaUpdateStatus?.dataset.status) {
    setPwaUpdateStatus(els.pwaUpdateStatus.dataset.status);
  }
}

function setPwaUpdateStatus(status) {
  if (!els.pwaUpdateStatus) return;
  const statusKeys = {
    checking: "updateChecking",
    updating: "updateInstalling",
    latest: "updateLatest",
    offline: "updateOffline",
    unavailable: "updateUnavailable",
    error: "updateError",
  };
  els.pwaUpdateStatus.dataset.status = status || "";
  els.pwaUpdateStatus.textContent = statusKeys[status] ? t(statusKeys[status]) : "";
}

function updateAppIdentity(lang) {
  const appName = lang === "zh" ? "随便吧" : "Meh";
  els.appName.textContent = appName;
  document.title = appName;

  const appleTitle = document.querySelector("#appleWebAppTitle");
  if (appleTitle) appleTitle.content = appName;

  const manifest = document.querySelector("#appManifest");
  if (manifest) {
    const pwaBuild = document.querySelector('meta[name="meh-build"]')?.content || "";
    manifest.href = lang === "zh"
      ? `./manifest-zh.webmanifest?v=${encodeURIComponent(pwaBuild)}`
      : `./manifest-meh.webmanifest?v=${encodeURIComponent(pwaBuild)}`;
  }
}

function updateLanguageMenu() {
  if (!els.languageMenu || !els.languageMenuText) return;
  els.languageMenuText.textContent = languageNames[appSettings.language] || languageNames.zh;
  els.languageMenu.querySelectorAll("[data-lang-option]").forEach((button) => {
    const isActive = button.dataset.langOption === appSettings.language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}
function closeLanguageMenu() {
  if (!els.languageMenu || !els.languageMenuButton) return;

  els.languageMenu.hidden = true;
  els.languageMenuButton.setAttribute("aria-expanded", "false");
}
function openSettings() {
  openTopLevelItem("settings");
}

function lockPageScroll() {
  if (pageScrollLock.active) return;

  pageScrollLock = {
    active: true,
    y: window.scrollY || document.documentElement.scrollTop || 0,
    htmlOverflow: document.documentElement.style.overflow,
    bodyStyles: {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      height: document.body.style.height,
      overflow: document.body.style.overflow,
      paddingBottom: document.body.style.paddingBottom,
      transform: document.body.style.transform,
    },
  };
  document.documentElement.classList.add("page-scroll-locked");
}

function unlockPageScroll() {
  const scrollY = pageScrollLock.active
    ? pageScrollLock.y
    : window.scrollY;
  const htmlOverflow = pageScrollLock.htmlOverflow || "";
  const bodyStyles = pageScrollLock.bodyStyles;
  pageScrollLock = {
    active: false,
    y: 0,
    htmlOverflow: "",
    bodyStyles: null,
  };
  document.documentElement.classList.remove("page-scroll-locked");
  document.documentElement.style.overflow = htmlOverflow;
  const safeBodyStyles = bodyStyles || {
    position: "",
    top: "",
    left: "",
    right: "",
    width: "",
    height: "",
    overflow: "",
    paddingBottom: "",
    transform: "",
  };
  Object.entries(safeBodyStyles).forEach(([property, value]) => {
    document.body.style[property] = value;
  });
  if (Math.abs(window.scrollY - scrollY) > 1) window.scrollTo(0, scrollY);
  keyboardViewportController.requestSettle("sheet-unlock");
}

function configureNavigation() {
  const registerSheet = (type, screen, sheet, options = {}) => {
    window.mehNavigation.registerItemType(type, {
      screen,
      historyMode: "push",
      validate: options.validate,
      async onOpen({ item, canAnimate, restored }) {
        const route = { screen, params: item.context };
        prepareNavigationScreen(route);
        [els.settingsSheet, els.wheelEditorSheet, els.numberSettingsSheet].forEach((candidate) => {
          if (candidate !== sheet) setBottomSheetImmediate(candidate, false);
        });
        sheet.scrollTop = navigationScrollPositions.get(navigationStateKey(route)) || 0;
        renderedNavigationState = {
          ...window.mehNavigation.getState(),
          screen,
          params: clonePlainObject(item.context),
        };
        keyboardViewportController.navigationStarted();
        await openBottomSheet(sheet, {
          item,
          immediate: !canAnimate || restored,
        });
      },
      async onBack({ item, source, canAnimate, transitionToken }) {
        navigationScrollPositions.set(
          navigationStateKey({ screen, params: item.context }),
          sheet.scrollTop
        );
        const focused = isKeyboardEditable(document.activeElement)
          ? document.activeElement
          : null;
        focused?.blur();
        keyboardViewportController.navigationStarted();
        await closeBottomSheet(sheet, {
          item,
          immediate: !canAnimate,
          transitionToken,
        });
        renderedNavigationState = {
          ...window.mehNavigation.getState(),
          screen: "home",
          params: {},
        };
        if (source === "ios-edge-back") {
          keyboardViewportController.requestSettle("ios-edge-back");
        }
      },
    });
  };

  registerSheet("settings", "settings", els.settingsSheet);
  registerSheet("preset-editor", "preset-editor", els.wheelEditorSheet, {
    validate(context) {
      const presetId = String(context?.presetId || "");
      return Boolean(presetId && wheelState.presets.some((preset) => preset.id === presetId));
    },
  });
  registerSheet("number-settings", "number-settings", els.numberSettingsSheet);

  window.mehNavigation.registerItemType("language-menu", {
    screen: "settings",
    historyMode: "push",
    onOpen() {
      els.languageMenu.hidden = false;
      els.languageMenuButton.setAttribute("aria-expanded", "true");
    },
    onBack() {
      closeLanguageMenu();
    },
  });
  window.mehNavigation.registerItemType("dark-mode-menu", {
    screen: "settings",
    historyMode: "push",
    onOpen() {
      els.darkModeMenu.hidden = false;
      els.darkModeMenuButton.setAttribute("aria-expanded", "true");
      els.darkModeMenuButton.classList.add("is-open");
    },
    onBack() {
      closeDarkModeMenu();
    },
  });
  window.mehNavigation.registerItemType("advanced-color-picker", {
    screen: "settings",
    historyMode: "push",
    onOpen({ item }) {
      setColorPickerVisibility(item.context.kind);
    },
    onBack() {
      setColorPickerVisibility("");
    },
  });
  window.mehNavigation.registerItemType("wheel-history", {
    screen: "home",
    historyMode: "push",
    onOpen() {
      wheelState.historyExpanded = true;
      updateWheelStats();
    },
    onBack() {
      wheelState.historyExpanded = false;
      updateWheelStats();
    },
  });
  window.mehNavigation.registerItemType("number-history", {
    screen: "home",
    historyMode: "push",
    onOpen() {
      numberState.historyExpanded = true;
      updateNumberHistoryStats();
    },
    onBack() {
      numberState.historyExpanded = false;
      updateNumberHistoryStats();
    },
  });

  window.mehNavigation.setBackGuard({
    canHandle() {
      return keyboardViewportController.isKeyboardActive();
    },
    run(source) {
      return keyboardViewportController.interceptBack(source);
    },
  });
  window.mehNavigation.onSettled((detail) => {
    keyboardViewportController.navigationEnded(detail.source);
  });
}

function navigationStateKey(route) {
  return `${route.screen}:${JSON.stringify(route.params || {})}`;
}

function getNavigationSheet(screen) {
  if (screen === "settings") return els.settingsSheet;
  if (screen === "preset-editor") return els.wheelEditorSheet;
  if (screen === "number-settings") return els.numberSettingsSheet;
  return null;
}

function prepareNavigationScreen(route) {
  if (route.screen === "preset-editor") {
    const presetId = String(route.params?.presetId || "");
    if (presetId !== wheelState.selectedPresetId) applyWheelPreset(presetId);
    renderWheelEditor();
  }
  if (route.screen === "number-settings") renderNumberSettingsPanel();
}

const sheetTransitions = new WeakMap();

function cancelBottomSheetTransition(sheet) {
  const active = sheetTransitions.get(sheet);
  active?.finish();
}

function waitForBottomSheetTransition(sheet, item, transitionToken) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return Promise.resolve();
  }
  cancelBottomSheetTransition(sheet);
  return new Promise((resolve) => {
    let finished = false;
    const itemId = item?.id || sheet.dataset.navigationItemId || "";
    const finish = () => {
      if (finished) return;
      const current = sheetTransitions.get(sheet);
      if (
        current
        && (current.itemId !== itemId || current.transitionToken !== transitionToken)
      ) {
        return;
      }
      finished = true;
      sheet.removeEventListener("transitionend", handleTransitionEnd);
      window.clearTimeout(fallback);
      if (sheetTransitions.get(sheet)?.finish === finish) sheetTransitions.delete(sheet);
      resolve();
    };
    const handleTransitionEnd = (event) => {
      const current = sheetTransitions.get(sheet);
      if (
        event.target === sheet
        && event.propertyName === "transform"
        && current?.itemId === itemId
        && current.transitionToken === transitionToken
      ) {
        finish();
      }
    };
    const fallback = window.setTimeout(finish, 360);
    sheetTransitions.set(sheet, { itemId, transitionToken, finish });
    sheet.addEventListener("transitionend", handleTransitionEnd);
  });
}

function clearBottomSheetState(sheet) {
  if (!sheet) return;
  sheet.classList.remove("is-closing", "is-dragging", "is-transition-suppressed");
  sheet.style.transform = "";
}

function setBottomSheetImmediate(sheet, visible) {
  if (!sheet) return;
  clearBottomSheetState(sheet);
  sheet.classList.add("is-transition-suppressed");
  sheet.classList.toggle("is-open", visible);
  sheet.setAttribute("aria-hidden", String(!visible));
  sheet.style.transform = "";
  window.requestAnimationFrame(() => {
    sheet.classList.remove("is-transition-suppressed");
  });
}

function showScrim(immediate = false) {
  if (!els.scrim) return;
  const alreadyVisible = !els.scrim.hidden && els.scrim.classList.contains("is-open");
  els.scrim.hidden = false;
  if (immediate) {
    els.scrim.classList.add("is-transition-suppressed", "is-open");
    window.requestAnimationFrame(() => {
      els.scrim.classList.remove("is-transition-suppressed");
    });
  } else if (!alreadyVisible) {
    els.scrim.classList.remove("is-open");
    els.scrim.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      els.scrim.classList.add("is-open");
    });
  }
}

function hideScrim(immediate = false) {
  if (!els.scrim) return;
  if (immediate) els.scrim.classList.add("is-transition-suppressed");
  els.scrim.classList.remove("is-open");
  if (immediate) {
    els.scrim.hidden = true;
    window.requestAnimationFrame(() => {
      els.scrim.classList.remove("is-transition-suppressed");
    });
  }
}

async function openBottomSheet(sheet, options = {}) {
  if (!sheet) return;
  cancelBottomSheetTransition(sheet);
  clearBottomSheetState(sheet);
  sheet.dataset.navigationItemId = options.item?.id || "";
  lockPageScroll();
  document.body.classList.add("sheet-open");

  if (options.immediate) {
    showScrim(true);
    setBottomSheetImmediate(sheet, true);
    return;
  }

  sheet.classList.add("is-transition-suppressed");
  sheet.classList.remove("is-open");
  sheet.setAttribute("aria-hidden", "false");
  sheet.style.transform = "";
  showScrim(false);
  sheet.getBoundingClientRect();
  sheet.classList.remove("is-transition-suppressed");
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  sheet.classList.add("is-open");
  await waitForBottomSheetTransition(sheet, options.item, 0);
}

async function closeBottomSheet(sheet, options = {}) {
  if (!sheet) {
    hideScrim(true);
    document.body.classList.remove("sheet-open");
    unlockPageScroll();
    return;
  }

  cancelBottomSheetTransition(sheet);
  sheet.setAttribute("aria-hidden", "true");
  sheet.classList.add("is-closing");
  sheet.style.transform = "";

  if (options.immediate) {
    sheet.classList.add("is-transition-suppressed");
    sheet.classList.remove("is-open");
  } else {
    sheet.classList.remove("is-open");
    hideScrim(false);
    await waitForBottomSheetTransition(
      sheet,
      options.item,
      options.transitionToken || 0
    );
  }
  sheet.classList.remove("is-open");
  clearBottomSheetState(sheet);
  delete sheet.dataset.navigationItemId;
  hideScrim(true);
  document.body.classList.remove("sheet-open");
  unlockPageScroll();
}

function openTransientItem(type, context = {}) {
  const top = window.mehNavigation.getTopItem();
  const transientTypes = new Set([
    "language-menu",
    "dark-mode-menu",
    "advanced-color-picker",
    "wheel-history",
    "number-history",
  ]);
  if (top?.type === type) return window.mehNavigation.requestBack("toggle");
  if (top && transientTypes.has(top.type)) {
    return window.mehNavigation.replaceItem({ type, context });
  }
  return window.mehNavigation.pushItem({ type, context, historyMode: "push" });
}

function openTopLevelItem(type, context = {}) {
  const top = window.mehNavigation.getTopItem();
  if (top && ["wheel-history", "number-history"].includes(top.type)) {
    return window.mehNavigation.replaceItem({ type, screen: type, context });
  }
  return window.mehNavigation.open(type, context);
}

function bindDarkModeMenu() {
  if (!els.darkModeMenuButton || !els.darkModeMenu) return;

  if (els.darkModeMenuButton.dataset.bound === "1") {
    updateDarkModeMenu();
    return;
  }

  els.darkModeMenuButton.dataset.bound = "1";
  updateDarkModeMenu();

  els.darkModeMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openTransientItem("dark-mode-menu", { owner: "settings" });
  });

  els.darkModeMenu.querySelectorAll("[data-dark-option]").forEach((button) => {
    button.addEventListener("click", () => {
      setDarkMode(button.dataset.darkOption);
      if (window.mehNavigation.getTopItem()?.type === "dark-mode-menu") {
        window.mehNavigation.requestBack("selection");
      } else {
        closeDarkModeMenu();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (
      !event.target.closest(
        ".dark-mode-picker, .language-picker, .swatch-button, .advanced-color-picker"
      )
      && window.mehNavigation.getTopItem()?.type === "dark-mode-menu"
    ) {
      window.mehNavigation.requestBack("outside-click");
    }
  });
}

function setDarkMode(mode) {
  appSettings.darkMode = ["light", "dark", "auto"].includes(mode) ? mode : "auto";

  if (els.darkModeSelect) {
    els.darkModeSelect.value = appSettings.darkMode;
  }

  updateDarkModeMenu();
  applyThemeColor(appSettings.primaryThemeColor, appSettings.secondaryThemeColor);
  refreshThemeSensitivePage();
  saveAppSettings();
}

function updateDarkModeMenu() {
  if (!els.darkModeMenu || !els.darkModeMenuText) return;

  const mode = ["light", "dark", "auto"].includes(appSettings.darkMode)
    ? appSettings.darkMode
    : "auto";

  els.darkModeMenuText.textContent = getDarkModeName(mode);

  els.darkModeMenu.querySelectorAll("[data-dark-option]").forEach((button) => {
    const isActive = button.dataset.darkOption === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function getDarkModeName(mode) {
  if (mode === "light") return t("lightMode");
  if (mode === "dark") return t("darkModeOnly");
  return t("autoMode");
}

function closeDarkModeMenu() {
  if (!els.darkModeMenu || !els.darkModeMenuButton) return;

  els.darkModeMenu.hidden = true;
  els.darkModeMenuButton.setAttribute("aria-expanded", "false");
  els.darkModeMenuButton.classList.remove("is-open");
}

function loadState() {
  const saved = safeReadStorage(STORAGE_KEY, {});
  return normalizeState({ ...defaultState, ...saved });
}

function saveState() {
  safeWriteStorage(STORAGE_KEY, state);
}

function loadAppSettings() {
  const saved = safeReadStorage(APP_SETTINGS_KEY, {});
  const migrated = { ...saved };
  const previousLayoutVersion = Number(migrated.systemBarLayoutVersion) || 0;
  const needsSystemBarMigration = previousLayoutVersion !== 6;
  if (previousLayoutVersion < 6 && Number(migrated.topHeight) === 16) {
    // Older builds could persist an iOS-only default spacer on top of the real safe area.
    migrated.topHeight = 0;
  }
  migrated.systemBarLayoutVersion = 6;
  const normalized = normalizeAppSettings({ ...defaultAppSettings, ...migrated });
  if (needsSystemBarMigration) safeWriteStorage(APP_SETTINGS_KEY, normalized);
  return normalized;
}

function saveAppSettings() {
  safeWriteStorage(APP_SETTINGS_KEY, appSettings);
}
function normalizeAppSettings(settings) {
  return {
    primaryThemeColor: normalizeHexColor(settings.primaryThemeColor || settings.themeColor, defaultAppSettings.primaryThemeColor),
    secondaryThemeColor: normalizeHexColor(settings.secondaryThemeColor || settings.themeColor, defaultAppSettings.secondaryThemeColor),
    uiScale: Math.max(0.85, Math.min(1.25, Number(settings.uiScale) || defaultAppSettings.uiScale)),
    backgroundImage: typeof settings.backgroundImage === "string" ? settings.backgroundImage : "",
    activeWallpaperId: typeof settings.activeWallpaperId === "string" ? settings.activeWallpaperId : "",
    backgroundOpacity: Number.isFinite(Number(settings.backgroundOpacity)) ? Math.max(0, Math.min(1, Number(settings.backgroundOpacity))) : defaultAppSettings.backgroundOpacity,
    language: i18n[settings.language] ? settings.language : defaultAppSettings.language,
    topHeight: clampNumber(settings.topHeight, 0, 56, defaultAppSettings.topHeight),
    dockThickness: clampNumber(settings.dockThickness, 46, 76, defaultAppSettings.dockThickness),
    dockSideGap: clampNumber(settings.dockSideGap, 12, 64, defaultAppSettings.dockSideGap),
    dockBottomGap: clampNumber(settings.dockBottomGap, 0, 40, defaultAppSettings.dockBottomGap),
    darkMode: ["light", "dark", "auto"].includes(settings.darkMode) ? settings.darkMode : defaultAppSettings.darkMode,
    systemBarLayoutVersion: 6,
  };
}

// 轻量校正，避免手动改 localStorage 后页面进入不存在的配置。
function normalizeState(nextState) {
  return {
    page: pages[nextState.page] ? nextState.page : defaultState.page,
  };
}

function safeReadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储不可用时保持当前会话可用即可，不阻断应用运行。
  }
}

function t(key, values = {}) {
  const dictionary = i18n[appSettings.language] || i18n.zh;
  const template = dictionary[key] || i18n.zh[key] || key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatWheelHistoryItem(index, total, result) {
  const round = total - index;
  const label = index === 0 ? t("lastRound") : t("nthRound", { n: round });
  return `${label}: ${result}`;
}

function formatRandomGroupHistoryItem(index, total, result) {
  const round = total - index;
  const label = index === 0 ? t("lastTime") : t("nthTime", { n: round });
  return `${label}: ${formatNumberGroup(result)}`;
}

function normalizeHexColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value) : fallback;
}

function hexToRgb(hex) {
  const value = normalizeHexColor(hex, "#6750a4").slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(a, b, amount) {
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  return rgbToHex({
    r: colorA.r * (1 - amount) + colorB.r * amount,
    g: colorA.g * (1 - amount) + colorB.g * amount,
    b: colorA.b * (1 - amount) + colorB.b * amount,
  });
}

function getReadableTextColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#1d1b20" : "#ffffff";
}

function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    if (max === green) hue = (blue - red) / delta + 2;
    if (max === blue) hue = (red - green) / delta + 4;
  }

  return {
    h: (hue * 60 + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToHex(hue, saturation, value) {
  const h = ((Number(hue) % 360) + 360) % 360;
  const s = Math.max(0, Math.min(1, Number(saturation)));
  const v = Math.max(0, Math.min(1, Number(value)));
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  let rgb = [0, 0, 0];

  if (h < 60) rgb = [chroma, x, 0];
  else if (h < 120) rgb = [x, chroma, 0];
  else if (h < 180) rgb = [0, chroma, x];
  else if (h < 240) rgb = [0, x, chroma];
  else if (h < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];

  return rgbToHex({
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  });
}

function describeSector(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, "Z"].join(" ");
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function normalizeWeight(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cloneOptions(options) {
  return options.map((option) => ({ text: option.text, weight: option.weight }));
}

function truncateLabel(value) {
  const text = String(value);
  return text.length > 6 ? `${text.slice(0, 6)}…` : text;
}

function createId() {
  return `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
