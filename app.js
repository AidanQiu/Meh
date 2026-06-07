// Meh 基础框架：负责导航、设置面板、主题和缩放持久化。
// 当前阶段已实现四个页面：抛硬币、摇骰子、大转盘、随机数。
const STORAGE_KEY = "meh-shell-state-v1";
const WHEEL_PRESETS_KEY = "meh-wheel-presets-v1";
const NUMBER_SETTINGS_KEY = "meh-number-settings-v1";
const APP_SETTINGS_KEY = "meh-app-settings-v2";

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
    choosePreset: "选择预设",
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
    wheelSpinningHint: "转盘正在减速靠近结果。",
    wheelResultHint: "这是刚刚命中的选项。",
    wheelReadyTitle: "准备转动",
    wheelReadyHint: "点击继续，让转盘帮你选一个。",
    numberReadyTitle: "准备生成",
    numberReadyHint: "默认范围是 {range}，点击继续生成随机数。",
    numberSingleHint: "这个数字来自 {range}。",
    numberGroupTitle: "随机数组",
    numberGroupHint: "这一组数字来自 {range}。",
    rangeTo: "{min} 到 {max}",
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
    choosePreset: "Choose preset",
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
    wheelSpinningHint: "The wheel is slowing toward the result.",
    wheelResultHint: "This is the option just selected.",
    wheelReadyTitle: "Ready to spin",
    wheelReadyHint: "Tap Continue and let the wheel choose.",
    numberReadyTitle: "Ready",
    numberReadyHint: "Default range is {range}. Tap Continue to generate.",
    numberSingleHint: "This number is from {range}.",
    numberGroupTitle: "Random group",
    numberGroupHint: "This group is from {range}.",
    rangeTo: "{min} to {max}",
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
    choosePreset: "プリセット選択",
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
    wheelSpinningHint: "ルーレットが結果に向かって減速しています。",
    wheelResultHint: "いま当たった項目です。",
    wheelReadyTitle: "回転準備",
    wheelReadyHint: "続けるを押してルーレットに選ばせます。",
    numberReadyTitle: "生成準備",
    numberReadyHint: "範囲は {range} です。続けるで生成します。",
    numberSingleHint: "この数字は {range} から生成されました。",
    numberGroupTitle: "乱数グループ",
    numberGroupHint: "この数字群は {range} から生成されました。",
    rangeTo: "{min} から {max}",
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
    choosePreset: "Үлгіні таңдау",
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
    wheelSpinningHint: "Дөңгелек нәтижеге қарай баяулап келеді.",
    wheelResultHint: "Жаңа түскен нұсқа осы.",
    wheelReadyTitle: "Айналдыруға дайын",
    wheelReadyHint: "Жалғастыруды басып, дөңгелекке таңдауды тапсырыңыз.",
    numberReadyTitle: "Дайын",
    numberReadyHint: "Әдепкі аралық: {range}. Генерация үшін Жалғастыруды басыңыз.",
    numberSingleHint: "Бұл сан {range} аралығынан алынды.",
    numberGroupTitle: "Сандар тобы",
    numberGroupHint: "Бұл сандар {range} аралығынан алынды.",
    rangeTo: "{min} - {max}",
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
 // 新增加设置项与控件绑定
const defaultAppSettings = {
  primaryThemeColor: "#6b9c94",
  secondaryThemeColor: "#6750a4",
  uiScale: 1,
  topHeight: 16,
  dockThickness: 58,
  dockSideGap: 28,
  dockBottomGap: 18,
  darkMode: "auto",
  backgroundImage: "",
  activeWallpaperId: "",
  backgroundOpacity: 0.5,
  language: "zh",
};
// 新增加设置项与控件绑定
const primarySwatches = ["#e8e3e8", "#c9b0f6", "#94e8bd", "#87c7f4", "#f9aaa5", "#55beb4", "#ffbd4a",  "#ffffff", "#2d7434"];
const secondarySwatches = ["#4f6670", "#6750a4", "#0b7f86", "#0b6ecb", "#bf4d00", "#2d7434", "#ad1f4f", "#000000",  "#6b9c94"];
const languageNames = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  kk: "Қазақша",
};
function getDarkModeName(mode) {
  if (mode === "light") return t("lightMode");
  if (mode === "dark") return t("darkModeOnly");
  return t("autoMode");
}
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
let sheetCloseTimer = null;
let pageScrollLock = {
  active: false,
  y: 0,
};

const els = {
  root: document.documentElement,
  topBar: document.querySelector("#topBar"),
  appName: document.querySelector("#appName"),
  pageTitle: document.querySelector("#pageTitle"),
  pageContent: document.querySelector("#pageContent"),
  topStats: document.querySelector("#topStats"),
  dock: document.querySelector(".floating-dock"),
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
  // 新增加设置项与控件绑定
  topHeightRange: document.querySelector("#topHeightRange"),
  topHeightValue: document.querySelector("#topHeightValue"),
  dockThicknessRange: document.querySelector("#dockThicknessRange"),
  dockThicknessValue: document.querySelector("#dockThicknessValue"),
  dockSideGapRange: document.querySelector("#dockSideGapRange"),
  dockSideGapValue: document.querySelector("#dockSideGapValue"),
  dockBottomGapRange: document.querySelector("#dockBottomGapRange"),
  dockBottomGapValue: document.querySelector("#dockBottomGapValue"),
// 新增加设置项与控件绑定
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
  // 使用gemini修改
  bgOpacityRange: document.querySelector("#bgOpacityRange"),
  bgOpacityValue: document.querySelector("#bgOpacityValue"),
  // 修改结束
  pageActions: document.querySelector("#pageActions"),
  resetButton: document.querySelector("#resetButton"),
  continueButton: document.querySelector("#continueButton"),
  wheelPresetSelect: document.querySelector("#wheelPresetSelect"),
  wheelPresetList: document.querySelector("#wheelPresetList"),
  wheelPresetName: document.querySelector("#wheelPresetName"),
  wheelOptionCount: document.querySelector("#wheelOptionCount"),
  wheelOptionList: document.querySelector("#wheelOptionList"),
  addWheelOptionButton: document.querySelector("#addWheelOptionButton"),
  saveWheelPresetButton: document.querySelector("#saveWheelPresetButton"),
  numberMinInput: document.querySelector("#numberMinInput"),
  numberMaxInput: document.querySelector("#numberMaxInput"),
  numberCountInput: document.querySelector("#numberCountInput"),
  numberRepeatInput: document.querySelector("#numberRepeatInput"),
  saveNumberSettingsButton: document.querySelector("#saveNumberSettingsButton"),
};

init();

async function init() {
  registerServiceWorker();
  requestPersistentStorage();
  syncAppHeight();

  numberState.settings = loadNumberSettings();
  wheelState.presets = loadWheelPresets();
  if (wheelState.presets.length) {
    applyWheelPreset(wheelState.presets[0].id);
  }

  await initSettings();
  bindEvents();
  applyI18n();
  renderPage();
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
  els.closeSettingsButton.addEventListener("click", closeAllSheets);
  els.closeWheelEditorButton.addEventListener("click", closeAllSheets);
  els.closeNumberSettingsButton.addEventListener("click", closeAllSheets);
  els.scrim.addEventListener("click", closeAllSheets);
  bindSheetHandleGestures();
  bindDockDragGesture();

  els.resetButton.addEventListener("click", handleReset);
  els.continueButton.addEventListener("click", handleContinue);

  els.wheelPresetSelect.addEventListener("change", () => {
    if (els.wheelPresetSelect.value === "__new__") {
      createDraftWheelPreset();
      renderWheelEditor();
      if (state.page === "wheel") renderWheelPage();
      return;
    }
    applyWheelPreset(els.wheelPresetSelect.value);
    renderWheelEditor();
    if (state.page === "wheel") renderWheelPage();
  });
  els.wheelOptionCount.addEventListener("change", syncWheelOptionCount);
  els.addWheelOptionButton.addEventListener("click", addWheelOption);
  els.saveWheelPresetButton.addEventListener("click", saveCurrentWheelPreset);
  els.saveNumberSettingsButton.addEventListener("click", saveNumberSettingsFromPanel);
  window.addEventListener("resize", () => {
    syncAppHeight();
    updateDockIndicator();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncAppHeight);
  }
  bindDocumentScrollLock();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
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

function syncAppHeight() {
  const viewportHeight = Math.max(
    window.innerHeight || 0,
    document.documentElement.clientHeight || 0,
    window.visualViewport?.height || 0
  );
  if (!viewportHeight) return;

  els.root.style.setProperty("--app-height", `${Math.round(viewportHeight)}px`);
}

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
      sheet.scrollTop = 0;
      sheet.classList.remove("is-dragging");
      sheet.style.transform = "";
      closeAllSheets();
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
  const dockRect = els.dock.getBoundingClientRect();
  return Array.from(els.dockItems).map((item) => {
    const rect = item.getBoundingClientRect();
    return {
      page: item.dataset.page,
      x: rect.left - dockRect.left,
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

function setPage(pageKey) {
  if (!pages[pageKey]) return;

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
  icon.textContent = isWheel || isNumber ? "edit" : "more_horiz";
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

  document.querySelector("#wheelHistoryButton").addEventListener("click", () => {
    wheelState.historyExpanded = !wheelState.historyExpanded;
    updateWheelStats();
  });
}

function resetWheelHistory() {
  window.clearTimeout(wheelSpinTimer);
  wheelState.result = null;
  wheelState.isSpinning = false;
  wheelState.history = [];
  wheelState.historyExpanded = false;
  renderWheelPage();
  updateActionButtons();
}

function getWheelResultText() {
  if (wheelState.isSpinning) {
    return { title: t("wheelSpinning"), hint: t("wheelSpinningHint") };
  }
  if (wheelState.result) {
    return { title: wheelState.result, hint: t("wheelResultHint") };
  }
  return { title: t("wheelReadyTitle"), hint: t("wheelReadyHint") };
}

function openWheelEditor() {
  renderWheelEditor();
  openSheet(els.wheelEditorSheet);
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
  els.wheelPresetSelect.innerHTML =
    `<option value="__new__">＋ ${t("newPreset")}</option>` +
    wheelState.presets
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

function createDraftWheelPreset() {
  wheelState.selectedPresetId = "";
  wheelState.options = createDefaultWheelOptions();
  wheelState.result = null;
  wheelState.rotation = 0;
  els.wheelPresetName.value = `${t("newPreset")} ${wheelState.presets.length + 1}`;
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

  const button = document.querySelector("#numberHistoryButton");
  if (button) {
    button.addEventListener("click", () => {
      numberState.historyExpanded = !numberState.historyExpanded;
      updateNumberHistoryStats();
    });
  }
}

function resetNumberHistory() {
  numberState.result = null;
  numberState.history = [];
  numberState.historyExpanded = false;
  numberState.shouldAnimate = false;
  renderNumberPage();
  updateActionButtons();
}

function openNumberSettings() {
  renderNumberSettingsPanel();
  openSheet(els.numberSettingsSheet);
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
  closeAllSheets();
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
    const willOpen = els.languageMenu.hidden;

    closeDarkModeMenu();

    els.languageMenu.hidden = !willOpen;
    els.languageMenuButton.setAttribute("aria-expanded", String(willOpen));
  });

  els.languageMenu.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.langOption);
      closeLanguageMenu();
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
}
// 原代码
// function initCustomColorPickers() {
//   document.querySelectorAll(".advanced-color-picker").forEach((picker) => {
//     const kind = picker.dataset.colorPicker;
//     const field = picker.querySelector(".picker-field");
//     const hueRange = picker.querySelector(".picker-hue-range");

//     field.addEventListener("pointerdown", (event) => {
//       field.setPointerCapture(event.pointerId);
//       updateCustomColorFromField(kind, field, event);
//     });

//     field.addEventListener("pointermove", (event) => {
//       if (event.buttons !== 1) return;
//       updateCustomColorFromField(kind, field, event);
//     });
  //     hueRange.addEventListener("input", () => {
  //       customPickerState[kind].hue = Number(hueRange.value);
  //       setThemeColor(kind, hsvToHex(customPickerState[kind].hue, customPickerState[kind].saturation, customPickerState[kind].value));
  //     });
  //   });
  // }


// ==============使用gemini修改==============
function initCustomColorPickers() {
  document.querySelectorAll(".advanced-color-picker").forEach((picker) => {
    const kind = picker.dataset.colorPicker;
    const field = picker.querySelector(".picker-field");
    const hueRange = picker.querySelector(".picker-hue-range");

    let isDragging = false;
    let animationFrameId = null; // 动画帧锁

    field.addEventListener("pointerdown", (event) => {
      field.setPointerCapture(event.pointerId);
      isDragging = true;
      updateCustomColorFromField(kind, field, event, false);
    });

    field.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      // 节流处理：限制极高频的回报率，避免主线程卡死
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
// ===============修改结束==================



function toggleCustomColorPicker(kind) {
  document.querySelectorAll(".advanced-color-picker").forEach((picker) => {
    picker.hidden = picker.dataset.colorPicker === kind ? !picker.hidden : true;
  });
}
// 原代码
// function updateCustomColorFromField(kind, field, event) {
//   const rect = field.getBoundingClientRect();
//   const saturation = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
//   const value = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

//   customPickerState[kind].saturation = saturation;
//   customPickerState[kind].value = value;
//   setThemeColor(kind, hsvToHex(customPickerState[kind].hue, saturation, value));
// }

// function setThemeColor(kind, color) {
//   const normalized = normalizeHexColor(color, kind === "primary" ? defaultAppSettings.primaryThemeColor : defaultAppSettings.secondaryThemeColor);

//   if (kind === "primary") {
//     appSettings.primaryThemeColor = normalized;
//     els.primaryThemeColorInput.value = normalized;
//   } else {
//     appSettings.secondaryThemeColor = normalized;
//     els.secondaryThemeColorInput.value = normalized;
//   }

// 使用gemini进行修改

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

  // 性能优化核心：只有在松手（isFinal 为 true）时才触发高耗能的网格重绘和数据磁盘写入
  if (isFinal) {
    renderColorSwatches();
    saveAppSettings();
  }
}
// 修改结束


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
  document.querySelectorAll("meta[name='theme-color']").forEach((meta) => {
    meta.setAttribute("content", statusColor);
  });

  document.body.style.backgroundColor = surfaceContainer;
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

  input.addEventListener("input", () => {
    appSettings[key] = Number(input.value);
    valueNode.textContent = appSettings[key];
    applyLayoutSettings();
    saveAppSettings();
  });
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
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function applyBackgroundImage(dataUrl, opacity = defaultAppSettings.backgroundOpacity) {
  const parsedOpacity = Number(opacity);
  const safeOpacity = Number.isFinite(parsedOpacity) ? Math.max(0, Math.min(1, parsedOpacity)) : defaultAppSettings.backgroundOpacity;
  els.root.style.setProperty("--bg-opacity", safeOpacity);
  
  let bgLayer = document.querySelector("#customBgLayer");
  if (!bgLayer) {
    bgLayer = document.createElement("div");
    bgLayer.id = "customBgLayer";
    const frame = document.querySelector(".phone-frame") || document.body;
    frame.insertBefore(bgLayer, frame.firstChild);
  }
  
  bgLayer.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : "none";
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

function clearCurrentBackground() {
  appSettings.activeWallpaperId = "";
  appSettings.backgroundImage = "";
  applyBackgroundImage("", appSettings.backgroundOpacity);
  saveAppSettings();
  renderWallpaperGrid();
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

  await deleteWallpaperFromDb(id);
  wallpapers = wallpapers.filter((item) => item.id !== id);

  if (appSettings.activeWallpaperId === id) {
    appSettings.activeWallpaperId = "";
    appSettings.backgroundImage = "";
    applyBackgroundImage("", appSettings.backgroundOpacity);
    saveAppSettings();
  }

  if (wallpapers.length === 0) {
    isWallpaperDeleteMode = false;
  }

  renderWallpaperGrid();
}

async function handleBackgroundImageSelect(event) {
  const slotsLeft = MAX_WALLPAPERS - wallpapers.length;
  const files = Array.from(event.target.files || [])
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, Math.max(0, slotsLeft));

  if (!files.length) {
    event.target.value = "";
    return;
  }

  const createdWallpapers = [];

  for (const [index, file] of files.entries()) {
    const dataUrl = await readFileAsDataUrl(file);
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
  event.target.value = "";

  const latestWallpaper = createdWallpapers.at(-1);
  if (latestWallpaper) {
    await selectWallpaper(latestWallpaper.id);
    return;
  }

  renderWallpaperGrid();
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
  els.appName.textContent = t("appName");
  document.title = t("appName");
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
  openSheet(els.settingsSheet);
}

function closeSettings() {
  closeAllSheets();
}

function lockPageScroll() {
  if (pageScrollLock.active) return;

  pageScrollLock = {
    active: true,
    y: window.scrollY || document.documentElement.scrollTop || 0,
  };
  document.documentElement.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${pageScrollLock.y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPageScroll() {
  if (!pageScrollLock.active) return;

  const scrollY = pageScrollLock.y;
  pageScrollLock = {
    active: false,
    y: 0,
  };
  document.documentElement.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, scrollY);
}

function openSheet(sheet) {
  if (!sheet) return;
  window.clearTimeout(sheetCloseTimer);
  syncAppHeight();
  lockPageScroll();
  els.scrim.hidden = false;
  document.body.classList.add("sheet-open");

  sheet.style.transform = "";
  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");
}

function closeAllSheets() {
  window.clearTimeout(sheetCloseTimer);
  closeLanguageMenu();

  if (typeof closeDarkModeMenu === "function") {
    closeDarkModeMenu();
  }

  [els.settingsSheet, els.wheelEditorSheet, els.numberSettingsSheet].forEach((sheet) => {
    if (!sheet) return;
    sheet.classList.remove("is-open", "is-expanded", "is-dragging");
    sheet.setAttribute("aria-hidden", "true");
    sheet.style.transform = "";
  });

  if (els.scrim) {
    els.scrim.hidden = true;
  }

  document.body.classList.remove("sheet-open");
  unlockPageScroll();
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

    const willOpen = els.darkModeMenu.hidden;

    closeLanguageMenu();

    els.darkModeMenu.hidden = !willOpen;
    els.darkModeMenuButton.setAttribute("aria-expanded", String(willOpen));
  });

  els.darkModeMenu.querySelectorAll("[data-dark-option]").forEach((button) => {
    button.addEventListener("click", () => {
      setDarkMode(button.dataset.darkOption);
      closeDarkModeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".dark-mode-picker")) {
      closeDarkModeMenu();
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
  return normalizeAppSettings({ ...defaultAppSettings, ...saved });
}

function saveAppSettings() {
  safeWriteStorage(APP_SETTINGS_KEY, appSettings);
}
// 原代码
// function normalizeAppSettings(settings) {
//   return {
//     primaryThemeColor: normalizeHexColor(settings.primaryThemeColor || settings.themeColor, defaultAppSettings.primaryThemeColor),
//     secondaryThemeColor: normalizeHexColor(settings.secondaryThemeColor || settings.themeColor, defaultAppSettings.secondaryThemeColor),
//     uiScale: Math.max(0.85, Math.min(1.25, Number(settings.uiScale) || defaultAppSettings.uiScale)),
//     backgroundImage: typeof settings.backgroundImage === "string" ? settings.backgroundImage : "",
//     language: i18n[settings.language] ? settings.language : defaultAppSettings.language,
//   };
// }


// ==============使用gemini修改============
function normalizeAppSettings(settings) {
  return {
    primaryThemeColor: normalizeHexColor(settings.primaryThemeColor || settings.themeColor, defaultAppSettings.primaryThemeColor),
    secondaryThemeColor: normalizeHexColor(settings.secondaryThemeColor || settings.themeColor, defaultAppSettings.secondaryThemeColor),
    uiScale: Math.max(0.85, Math.min(1.25, Number(settings.uiScale) || defaultAppSettings.uiScale)),
    backgroundImage: typeof settings.backgroundImage === "string" ? settings.backgroundImage : "",
    activeWallpaperId: typeof settings.activeWallpaperId === "string" ? settings.activeWallpaperId : "",
    backgroundOpacity: Number.isFinite(Number(settings.backgroundOpacity)) ? Math.max(0, Math.min(1, Number(settings.backgroundOpacity))) : defaultAppSettings.backgroundOpacity,
    language: i18n[settings.language] ? settings.language : defaultAppSettings.language,
    //以下是新增加的 
    topHeight: clampNumber(settings.topHeight, 0, 56, defaultAppSettings.topHeight),
    dockThickness: clampNumber(settings.dockThickness, 46, 76, defaultAppSettings.dockThickness),
    dockSideGap: clampNumber(settings.dockSideGap, 12, 64, defaultAppSettings.dockSideGap),
    dockBottomGap: clampNumber(settings.dockBottomGap, 0, 40, defaultAppSettings.dockBottomGap),
    darkMode: ["light", "dark", "auto"].includes(settings.darkMode) ? settings.darkMode : defaultAppSettings.darkMode,
  };
}
//==================修改结束 ===============


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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}
