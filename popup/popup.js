// Popup — Control Panel & Select-to-Translate TTS Controls

const LANGUAGES = [
  ['ar', 'Arabic'], ['bg', 'Bulgarian'], ['bn', 'Bengali'], ['cs', 'Czech'],
  ['da', 'Danish'], ['de', 'German'], ['el', 'Greek'], ['en', 'English'],
  ['es', 'Spanish'], ['fi', 'Finnish'], ['fr', 'French'], ['hi', 'Hindi'],
  ['hr', 'Croatian'], ['hu', 'Hungarian'], ['id', 'Indonesian'], ['it', 'Italian'],
  ['iw', 'Hebrew'], ['ja', 'Japanese'], ['kn', 'Kannada'], ['ko', 'Korean'],
  ['lt', 'Lithuanian'], ['mr', 'Marathi'], ['nl', 'Dutch'], ['no', 'Norwegian'],
  ['pl', 'Polish'], ['pt', 'Portuguese'], ['ro', 'Romanian'], ['ru', 'Russian'],
  ['sk', 'Slovak'], ['sl', 'Slovenian'], ['sv', 'Swedish'], ['ta', 'Tamil'],
  ['te', 'Telugu'], ['th', 'Thai'], ['tr', 'Turkish'], ['uk', 'Ukrainian'],
  ['vi', 'Vietnamese'], ['zh', 'Chinese (Simplified)'], ['zh-Hant', 'Chinese (Traditional)']
];

const I18N = {
  en: {
    appTitle: "Nano local translator",
    autoDetect: "Auto Detect",
    tabTranslate: "Translate", backBtn: "Back",
    sourceLang: "Source Language", targetLang: "Target Language", displayMode: "Display Mode",
    translateOnly: "Translate Only", bilingual: "Bilingual",
    translateBtn: "Translate Page", restoreBtn: "Restore Original",
    translatingBtn: "Translating...", reTranslateBtn: "Re-translate", statusTranslating: "Translating...", statusActive: "Active (Scroll to translate)", statusReady: "Ready",
    s2tTrigger: "Trigger Mode", s2tTriggerBubble: "Show Bubble", s2tTriggerAlt: "Alt + Select", s2tTriggerCtrl: "Ctrl/Cmd + Select", s2tTriggerDirect: "Direct Translate",
    showReaderCapsule: "Floating Reader Capsule", excludedDomains: "Excluded Domains (One per line)", modelDownloading: "Downloading Model",
    pageStatus: "Page status:", translatedNodes: "Translated:",
    uiLang: "UI Language", saveSettings: "Save Settings",
    supportDev: "If you find this project helpful, you can Buy Me a Coffee.", buyCoffee: "Buy me a coffee ☕",
    shortcutTip: "Shortcut: Alt+T (Mac: ⌥+T) to toggle.", shortcutChange: "To change, visit",
    selectToTranslateTitle: "Select/Hover Translation", selectToTranslateLabel: "Status",
    s2tTranslate: "Select Translation", hoverTranslate: "Hover Translation", youtubeDualSubs: "YouTube Dual Subs", s2tSpeak: "Speak Aloud (TTS)",
    optionalFeaturesTitle: "Optional Features", ocrTranslateTitle: "Screenshot Translate (Alt+S)", ocrDownloadInfo: "Requires downloading models (~15MB) on first use", closeAllOcrBtn: "Close All Popups", ocrAutoClose: "Auto-close (s)", ocrSetupTip: "OCR requires local binaries (~4.8MB). Run node scripts/download_ocr_libs.js if not installed.",
    youtubeSettingsTitle: "YouTube dual subs settings", ytSubColorMode: "Color Mode", ytSubColorCustom: "Custom", ytSubColorInherit: "Original", ytSubColor: "Custom Color", ytSubOpacity: "Opacity", ytSubPosition: "Position (Translation)", ytSubBelow: "Below Original", ytSubAbove: "Above Original",
    statusOff: "Off", statusOn: "On", shortcutSettings: "Shortcuts",
    fullPageShortcut: "Full Page Translation", editShortcuts: "Edit (Alt+T)",
    translationSettings: "Translation Settings", cacheResults: "Cache Translation Results",
    cacheTooltip: "Enabling cache can improve translation speed and reduce duplicate requests, but may result in translations not being the most up-to-date.",
    pluginSettings: "Plugin Settings", uiLanguage: "UI Language",
    saveSettingsBtn: "Save Settings",
    openSourceNotice: "This is an open-source project.",
    welcomeTitle: "Welcome!",
    welcomeP1: "This is an open-source, fast translator based on Chrome Built-in AI.",
    welcomeP2: "All translations are processed locally on your device for complete privacy.",
    welcomeImportant: "Important:",
    welcomeP3: "First-time use requires downloading translation packs. The first translation may be slightly slow.",
    welcomeNeverShow: "Close & Never Show Again",
    welcomeClose: "Close",
    ttsSettings: "TTS Settings", ttsVoice: "Voice", ttsRate: "Speed", ttsPitch: "Pitch", ttsVolume: "Volume",
    engineSettings: "Translation Engine",
    engineHintTooltip: "Recommended: Local models (e.g. Ollama, LM Studio) for 100% on-device privacy. External cloud providers are also supported.",
    engineChromeTitle: "Chrome Built-in AI",
    badgeBuiltin: "Default",
    engineChromeDesc: "Gemini Nano (100% local, zero-config, fast)",
    engineCustomTitle: "Custom LLM",
    badgeOpenAI: "OpenAI Spec",
    engineCustomDesc: "Ollama, LM Studio or Cloud API (Fallback)",
    customApiUrl: "API Base URL",
    customModel: "Model Name",
    customApiKey: "API Key (Optional for Local)",
    testConnectionBtn: "⚡ Test Connection",
    perfTitle: "Throughput & Concurrency Settings",
    customConcurrency: "Concurrent Requests",
    concurrencyHint: "Number of simultaneous API requests. Lower values save GPU memory.",
    customChunkSize: "Batch Context Limit (Items / Request)",
    chunkSizeHint: "Number of sentences grouped in each LLM prompt batch.",
    advancedPromptTitle: "Advanced: Custom Prompt",
    warningModalTitle: "Privacy & Provider Notice",
    warningLocalTag: "Local Models (Recommended):",
    warningLocalP: "Using local models (Ollama, LM Studio) processes all translations on your device with 100% privacy.",
    warningCloudTag: "External Providers:",
    warningCloudP: "If using third-party cloud endpoints, translated page text is sent to their servers. Ensure you trust the provider.",
    warningNeverShow: "Do not show again",
    warningConfirm: "I Understand & Enable",
    warningCancel: "Cancel"
  },
  zh: {
    appTitle: "Nano local translator",
    autoDetect: "自动检测",
    tabTranslate: "翻译", backBtn: "返回",
    sourceLang: "源语言", targetLang: "目标语言", displayMode: "显示模式",
    translateOnly: "仅翻译", bilingual: "双语对照",
    translateBtn: "翻译页面", restoreBtn: "恢复原文",
    translatingBtn: "翻译中...", reTranslateBtn: "重新翻译", statusTranslating: "翻译中...", statusActive: "活动中 (滚动自动翻译)", statusReady: "就绪",
    s2tTrigger: "触发方式", s2tTriggerBubble: "显示小球", s2tTriggerAlt: "按住 Alt 选词", s2tTriggerCtrl: "按住 Ctrl/Cmd 选词", s2tTriggerDirect: "直接划词翻译",
    showReaderCapsule: "页面悬浮阅读胶囊", excludedDomains: "排除域名（免翻列表，每行一个）", modelDownloading: "正在下载翻译模型",
    pageStatus: "页面状态:", translatedNodes: "已翻译:",
    uiLang: "界面语言", saveSettings: "保存设置",
    supportDev: "如果你觉得这个项目有帮助，可以请我喝杯咖啡。", buyCoffee: "请我喝杯咖啡 ☕",
    shortcutTip: "快捷键：Alt+T (Mac: ⌥+T) 切换翻译", shortcutChange: "修改快捷键请访问",
    selectToTranslateTitle: "划词/悬停翻译", selectToTranslateLabel: "状态",
    s2tTranslate: "划词翻译", hoverTranslate: "悬停选词翻译", youtubeDualSubs: "YouTube双语字幕", s2tSpeak: "划词朗读 (TTS)",
    optionalFeaturesTitle: "可选功能", ocrTranslateTitle: "截屏翻译 (Alt+S)", ocrDownloadInfo: "初次使用需下载识别模型（约15MB），以后可离线使用", closeAllOcrBtn: "关闭所有弹窗", ocrAutoClose: "自动关闭 (秒)", ocrSetupTip: "截屏识别依赖 OCR 本地离线库（~4.8MB）。若未安装请执行：node scripts/download_ocr_libs.js",
    youtubeSettingsTitle: "YouTube 双语字幕设置", ytSubColorMode: "颜色模式", ytSubColorCustom: "自定义", ytSubColorInherit: "跟随原文", ytSubColor: "自定义颜色", ytSubOpacity: "透明度", ytSubPosition: "翻译位置", ytSubBelow: "在原文下方", ytSubAbove: "在原文上方",
    statusOff: "关闭", statusOn: "开启", shortcutSettings: "快捷键设置",
    fullPageShortcut: "全文翻译快捷键", editShortcuts: "编辑 (Alt+T)",
    translationSettings: "翻译设置", cacheResults: "缓存翻译结果",
    cacheTooltip: "开启缓存可以提高翻译速度，减少重复请求，但可能导致翻译结果不是最新的",
    pluginSettings: "常规设置", uiLanguage: "界面语言",
    saveSettingsBtn: "保存设置",
    openSourceNotice: "这是一个开源项目。",
    welcomeTitle: "欢迎！",
    welcomeP1: "这是一个基于 Chrome Built-in AI 的开源快速翻译器。",
    welcomeP2: "所有翻译结果均保存在本地，以保护您的隐私。",
    welcomeImportant: "注意：",
    welcomeP3: "第一次使用时需要下载翻译包。第一次翻译速度可能略慢。",
    welcomeNeverShow: "关闭并再也不显示",
    welcomeClose: "关闭",
    ttsSettings: "朗读设置 (TTS)", ttsVoice: "发音人/音色", ttsRate: "语速", ttsPitch: "音调", ttsVolume: "音量",
    engineSettings: "翻译引擎设置",
    engineHintTooltip: "推荐优先使用本地部署的模型（如 Ollama、LM Studio），数据不出机器、100% 隐私安全；亦支持外部云端供应商。",
    engineChromeTitle: "Chrome 内置 AI",
    badgeBuiltin: "推荐·内置",
    engineChromeDesc: "Gemini Nano（端侧运行、零配置、极速）",
    engineCustomTitle: "自定义模型",
    badgeOpenAI: "OpenAI 规范",
    engineCustomDesc: "本地 Ollama / LM Studio 或外部 API (备用)",
    customApiUrl: "API 基础地址 (Base URL)",
    customModel: "模型名称 (Model)",
    customApiKey: "API 密钥 (本地模型留空即可)",
    testConnectionBtn: "⚡ 测试连接",
    perfTitle: "吞吐量与并发设置",
    customConcurrency: "并发请求数",
    concurrencyHint: "同时发起的请求数量。较低数值更省显存，较高数值提高全文速度。",
    customChunkSize: "单并发上下文分块条数",
    chunkSizeHint: "每次并发请求打包发送给 LLM 的文本段落数量上限。",
    advancedPromptTitle: "高级：自定义系统 Prompt",
    warningModalTitle: "隐私与供应商安全提示",
    warningLocalTag: "本地部署（推荐）：",
    warningLocalP: "使用本地部署模型（如 Ollama、LM Studio）时，翻译全程在您的设备本地运行，数据零外泄、100% 隐私安全。",
    warningCloudTag: "外部供应商注意：",
    warningCloudP: "若填入第三方云端供应商的 API 地址与密钥，您网页中被翻译的文本将被发送到该供应商服务器。请确认您信任该供应商的隐私政策与安全性。",
    warningNeverShow: "不再提示",
    warningConfirm: "我已知晓并开启",
    warningCancel: "取消"
  },
  'zh-Hant': {
    appTitle: "Nano local translator",
    autoDetect: "自動檢測",
    tabTranslate: "翻譯", backBtn: "返回",
    sourceLang: "來源語言", targetLang: "目標語言", displayMode: "顯示模式",
    translateOnly: "僅翻譯", bilingual: "雙語對照",
    translateBtn: "翻譯頁面", restoreBtn: "恢復原文",
    translatingBtn: "翻譯中...", reTranslateBtn: "重新翻譯", statusTranslating: "翻譯中...", statusActive: "活動中 (滾動自動翻譯)", statusReady: "就緒",
    s2tTrigger: "觸發方式", s2tTriggerBubble: "顯示小球", s2tTriggerAlt: "按住 Alt 選詞", s2tTriggerCtrl: "按住 Ctrl/Cmd 選詞", s2tTriggerDirect: "直接劃詞翻譯",
    showReaderCapsule: "頁面懸浮閱讀膠囊", excludedDomains: "排除域名（免翻列表，每行一個）", modelDownloading: "正在下載翻譯模型",
    pageStatus: "頁面狀態:", translatedNodes: "已翻譯:",
    uiLang: "介面語言", saveSettings: "保存設置",
    supportDev: "如果您覺得這個專案有幫助，可以請我喝杯咖啡。", buyCoffee: "請我喝杯咖啡 ☕",
    shortcutTip: "快捷鍵：Alt+T (Mac: ⌥+T) 切換翻譯", shortcutChange: "修改快捷鍵請訪問",
    selectToTranslateTitle: "劃詞/懸停翻譯", selectToTranslateLabel: "狀態",
    s2tTranslate: "劃詞翻譯", hoverTranslate: "懸停選詞翻譯", youtubeDualSubs: "YouTube雙語字幕", s2tSpeak: "劃詞朗讀 (TTS)",
    optionalFeaturesTitle: "可選功能", ocrTranslateTitle: "截屏翻譯 (Alt+S)", ocrDownloadInfo: "初次使用需下載識別模型（約15MB），以後可離線使用", closeAllOcrBtn: "關閉所有彈窗", ocrAutoClose: "自動關閉 (秒)", ocrSetupTip: "截屏識別依賴 OCR 本地離線庫（~4.8MB）。若未安裝請執行：node scripts/download_ocr_libs.js",
    youtubeSettingsTitle: "YouTube 雙語字幕設置", ytSubColorMode: "顏色模式", ytSubColorCustom: "自定義", ytSubColorInherit: "跟隨原文", ytSubColor: "自定義顏色", ytSubOpacity: "透明度", ytSubPosition: "翻譯位置", ytSubBelow: "在原文下方", ytSubAbove: "在原文上方",
    statusOff: "關閉", statusOn: "開啟", shortcutSettings: "快捷鍵設置",
    fullPageShortcut: "全文翻譯快捷鍵", editShortcuts: "編輯 (Alt+T)",
    translationSettings: "翻譯設置", cacheResults: "緩存翻譯結果",
    cacheTooltip: "開啟緩存可以提高翻譯速度，減少重複請求，但可能導致翻譯結果不是最新的",
    pluginSettings: "常規設置", uiLanguage: "介面語言",
    saveSettingsBtn: "保存設置",
    openSourceNotice: "這是一個開源專案。",
    welcomeTitle: "歡迎！",
    welcomeP1: "這是一個基於 Chrome Built-in AI 的開源快速翻譯器。",
    welcomeP2: "所有翻譯結果均保存在本地，以保護您的隱私。",
    welcomeImportant: "注意：",
    welcomeP3: "第一次使用時需要下載翻譯包。第一次翻譯速度可能略慢。",
    welcomeNeverShow: "關閉並再也不顯示",
    welcomeClose: "關閉",
    ttsSettings: "朗讀設置 (TTS)", ttsVoice: "發音人/音色", ttsRate: "語速", ttsPitch: "音調", ttsVolume: "音量",
    engineSettings: "翻譯引擎設置",
    engineHintTooltip: "推薦優先使用本地部署的模型（如 Ollama、LM Studio），資料不出機器、100% 隱私安全；亦支援外部雲端供應商。",
    engineChromeTitle: "Chrome 內建 AI",
    badgeBuiltin: "推薦·內建",
    engineChromeDesc: "Gemini Nano（端側運行、零配置、極速）",
    engineCustomTitle: "自定義模型",
    badgeOpenAI: "OpenAI 規範",
    engineCustomDesc: "本地 Ollama / LM Studio 或外部 API (備用)",
    customApiUrl: "API 基礎地址 (Base URL)",
    customModel: "模型名稱 (Model)",
    customApiKey: "API 金鑰 (本地模型留空即可)",
    testConnectionBtn: "⚡ 測試連接",
    perfTitle: "吞吐量與並發設置",
    customConcurrency: "並發請求數",
    concurrencyHint: "同時發起的請求數量。較低數值更省顯存，較高數值提高全文速度。",
    customChunkSize: "單並發上下文分塊條數",
    chunkSizeHint: "每次並發請求打包發送給 LLM 的文本段落數量上限。",
    advancedPromptTitle: "高級：自定義系統 Prompt",
    warningModalTitle: "隱私與供應商安全提示",
    warningLocalTag: "本地部署（推薦）：",
    warningLocalP: "使用本地部署模型（如 Ollama、LM Studio）時，翻譯全程在您的設備本地運行，資料零外泄、100% 隱私安全。",
    warningCloudTag: "外部供應商注意：",
    warningCloudP: "若填入第三方雲端供應商的 API 地址與金鑰，您網頁中被翻譯的文本將被發送到該供應商伺服器。請確認您信任該供應商的隱私政策與安全性。",
    warningNeverShow: "不再提示",
    warningConfirm: "我已知曉並開啟",
    warningCancel: "取消"
  },
  ja: {
    appTitle: "Nano local translator",
    autoDetect: "自動検出",
    tabTranslate: "翻訳", backBtn: "戻る",
    sourceLang: "翻訳元", targetLang: "翻訳先", displayMode: "表示モード",
    translateOnly: "翻訳のみ", bilingual: "2言語表示",
    translateBtn: "ページを翻訳", restoreBtn: "原文に戻す",
    translatingBtn: "翻訳中...", reTranslateBtn: "再翻訳", statusTranslating: "翻訳中...", statusActive: "有効 (スクロールで自動翻訳)", statusReady: "準備完了",
    s2tTrigger: "トリガー方式", s2tTriggerBubble: "バブル表示", s2tTriggerAlt: "Alt 押しながら選択", s2tTriggerCtrl: "Ctrl/Cmd 押しながら選択", s2tTriggerDirect: "即時選択翻訳",
    showReaderCapsule: "フローティング読書カプセル", excludedDomains: "除外ドメイン（1行に1つ）", modelDownloading: "モデルダウンロード中",
    pageStatus: "ステータス:", translatedNodes: "翻訳済み:",
    uiLang: "UI言語", saveSettings: "設定を保存",
    supportDev: "このプロジェクトが役立ったら、コーヒーをご馳走してください。", buyCoffee: "コーヒーを奢る ☕",
    shortcutTip: "ショートカット: Alt+T (Mac: ⌥+T) で切り替え", shortcutChange: "変更するには次へ:",
    selectToTranslateTitle: "選択して翻訳", selectToTranslateLabel: "状態",
    s2tTranslate: "選択翻訳", s2tSpeak: "テキスト読み上げ (TTS)",
    statusOff: "オフ", statusOn: "オン", shortcutSettings: "ショートカット設定",
    fullPageShortcut: "ページ全体翻訳", editShortcuts: "編集 (Alt+T)",
    translationSettings: "翻訳設定", cacheResults: "翻訳結果をキャッシュ",
    cacheTooltip: "キャッシュを有効にすると翻訳速度が向上しますが、最新の翻訳結果でない場合があります。",
    pluginSettings: "一般設定", uiLanguage: "UI言語",
    saveSettingsBtn: "設定を保存",
    openSourceNotice: "これはオープンソースプロジェクトです。",
    welcomeTitle: "ようこそ！",
    welcomeP1: "これはChrome Built-in AIベースのオープンソース高速翻訳ツールです。",
    welcomeP2: "翻訳はすべてデバイス上でローカルに処理され、プライバシーが保護されます。",
    welcomeImportant: "重要：",
    welcomeP3: "初回使用時は翻訳パックのダウンロードが必要です。初回の翻訳は少し時間がかかる場合があります。",
    welcomeNeverShow: "閉じて二度と表示しない",
    welcomeClose: "閉じる",
    ttsSettings: "音声読み上げ設定 (TTS)", ttsVoice: "音声/話者", ttsRate: "速度", ttsPitch: "ピッチ", ttsVolume: "音量",
    engineSettings: "翻訳エンジン設定",
    engineHintTooltip: "推奨：Ollama や LM Studio などのローカルモデル（100%端末内で完結・プライバシー保護）。外部クラウドAPIも利用可能です。",
    engineChromeTitle: "Chrome 組み込み AI",
    badgeBuiltin: "推奨・内蔵",
    engineChromeDesc: "Gemini Nano（完全ローカル、設定不要、高速）",
    engineCustomTitle: "カスタム LLM",
    badgeOpenAI: "OpenAI 互換",
    engineCustomDesc: "Ollama / LM Studio または外部 API（代替用）",
    customApiUrl: "API ベース URL",
    customModel: "モデル名",
    customApiKey: "API キー (ローカルの場合は空欄)",
    testConnectionBtn: "⚡ 接続テスト",
    perfTitle: "スループットと同時並行設定",
    customConcurrency: "同時リクエスト数",
    concurrencyHint: "同時に送信するリクエスト数。低いとGPUメモリを節約できます。",
    customChunkSize: "1回あたりのテキスト文脈数",
    chunkSizeHint: "各プロンプトにまとめて含める文の最大数。",
    advancedPromptTitle: "高度な設定：カスタムプロンプト",
    warningModalTitle: "プライバシーとプロバイダーに関する注意事項",
    warningLocalTag: "ローカル配置（推奨）：",
    warningLocalP: "ローカルモデル（Ollama、LM Studio 等）を使用する場合、翻訳は端末内でのみ行われ、データは外部に出ません。",
    warningCloudTag: "外部プロバイダーの注意点：",
    warningCloudP: "外部クラウド API を使用する場合、翻訳されるWebテキストは外部サーバーに送信されます。信頼できる提供元かご確認ください。",
    warningNeverShow: "今後表示しない",
    warningConfirm: "理解して有効化",
    warningCancel: "キャンセル"
  },
  es: {
    appTitle: "Nano local translator",
    autoDetect: "Detección automática",
    tabTranslate: "Traducir", backBtn: "Atrás",
    sourceLang: "Idioma de origen", targetLang: "Idioma de destino", displayMode: "Modo de visualización",
    translateOnly: "Solo traducir", bilingual: "Bilingüe",
    translateBtn: "Traducir página", restoreBtn: "Restaurar original",
    translatingBtn: "Traduciendo...", reTranslateBtn: "Volver a traducir", statusTranslating: "Traduciendo...", statusActive: "Activo (Desplaza para traducir)", statusReady: "Listo",
    pageStatus: "Estado:", translatedNodes: "Traducidos:",
    uiLang: "Idioma de UI", saveSettings: "Guardar",
    supportDev: "Si encuentras útil este proyecto, invítame a un café.", buyCoffee: "Invítame un café ☕",
    shortcutTip: "Atajo: Alt+T para alternar.", shortcutChange: "Para cambiar, visita",
    selectToTranslateTitle: "Seleccionar/Flotar traducción", selectToTranslateLabel: "Estado",
    s2tTranslate: "Traducción", hoverTranslate: "Traducción al pasar el cursor", youtubeDualSubs: "YouTube Subs", s2tSpeak: "Leer en voz alta (TTS)",
    optionalFeaturesTitle: "Características opcionales", ocrTranslateTitle: "Traducción OCR (Alt+S)", closeAllOcrBtn: "Cerrar todo", ocrAutoClose: "Cierre auto (10s)",
    youtubeSettingsTitle: "Ajustes de YouTube dual subs", ytSubColorMode: "Modo de color", ytSubColorCustom: "Personalizado", ytSubColorInherit: "Original", ytSubColor: "Color", ytSubOpacity: "Opacidad", ytSubPosition: "Posición", ytSubBelow: "Debajo", ytSubAbove: "Arriba",
    statusOff: "Apagado", statusOn: "Encendido", shortcutSettings: "Atajos",
    fullPageShortcut: "Traducción de página completa", editShortcuts: "Editar",
    translationSettings: "Ajustes de traducción", cacheResults: "Caché de traducción",
    cacheTooltip: "El caché mejora la velocidad, pero puede no estar actualizado.",
    pluginSettings: "Ajustes de extensión", uiLanguage: "Idioma de UI",
    saveSettingsBtn: "Guardar Ajustes",
    openSourceNotice: "Este es un proyecto de código abierto.",
    welcomeTitle: "¡Bienvenido!",
    welcomeP1: "Este es un traductor rápido de código abierto basado en la IA integrada de Chrome.",
    welcomeP2: "Todas las traducciones se procesan localmente en su dispositivo para total privacidad.",
    welcomeImportant: "Importante:",
    welcomeP3: "El primer uso requiere descargar paquetes de traducción. La primera traducción puede ser un poco lenta.",
    welcomeNeverShow: "Cerrar y no volver a mostrar",
    welcomeClose: "Cerrar",
    ttsSettings: "Ajustes de TTS", ttsVoice: "Voz", ttsRate: "Velocidad", ttsPitch: "Tono", ttsVolume: "Volumen"
  },
  fr: {
    appTitle: "Nano local translator",
    autoDetect: "Détection automatique",
    tabTranslate: "Traduire", backBtn: "Retour",
    sourceLang: "Langue source", targetLang: "Langue cible", displayMode: "Mode d'affichage",
    translateOnly: "Traduire uniquement", bilingual: "Bilingue",
    translateBtn: "Traduire la page", restoreBtn: "Restaurer l'original",
    translatingBtn: "Traduction...", reTranslateBtn: "Retraduire", statusTranslating: "Traduction...", statusActive: "Actif (Faites défiler pour traduire)", statusReady: "Prêt",
    pageStatus: "Statut :", translatedNodes: "Traduits :",
    uiLang: "Langue de l'interface", saveSettings: "Enregistrer",
    supportDev: "Si ce projet vous est utile, offrez-moi un café.", buyCoffee: "Offrez-moi un café ☕",
    shortcutTip: "Raccourci : Alt+T pour basculer.", shortcutChange: "Pour modifier, visitez",
    selectToTranslateTitle: "Sélection/Survol", selectToTranslateLabel: "Statut",
    s2tTranslate: "Traduction", hoverTranslate: "Traduction au survol", youtubeDualSubs: "YouTube Subs", s2tSpeak: "Lire à haute voix (TTS)",
    optionalFeaturesTitle: "Fonctionnalités optionnelles", ocrTranslateTitle: "Traduction OCR (Alt+S)", closeAllOcrBtn: "Fermer tout", ocrAutoClose: "Fermeture auto (10s)",
    youtubeSettingsTitle: "Paramètres YouTube dual subs", ytSubColorMode: "Mode couleur", ytSubColorCustom: "Personnalisé", ytSubColorInherit: "Original", ytSubColor: "Couleur", ytSubOpacity: "Opacité", ytSubPosition: "Position", ytSubBelow: "En dessous", ytSubAbove: "Au dessus",
    statusOff: "Désactivé", statusOn: "Activé", shortcutSettings: "Raccourcis",
    fullPageShortcut: "Traduction de page complète", editShortcuts: "Modifier",
    translationSettings: "Paramètres de traduction", cacheResults: "Mise en cache",
    cacheTooltip: "Le cache améliore la vitesse mais peut ne pas être à jour.",
    pluginSettings: "Paramètres de l'extension", uiLanguage: "Langue de l'interface",
    saveSettingsBtn: "Enregistrer",
    openSourceNotice: "Ceci est un projet open source.",
    welcomeTitle: "Bienvenue !",
    welcomeP1: "Il s'agit d'un traducteur rapide open-source basé sur l'IA intégrée de Chrome.",
    welcomeP2: "Toutes les traductions sont traitées localement sur votre appareil pour une confidentialité totale.",
    welcomeImportant: "Important :",
    welcomeP3: "La première utilisation nécessite le téléchargement de packs de traduction. La première traduction peut être légèrement lente.",
    welcomeNeverShow: "Fermer et ne plus afficher",
    welcomeClose: "Fermer",
    ttsSettings: "Paramètres TTS", ttsVoice: "Voix", ttsRate: "Vitesse", ttsPitch: "Hauteur", ttsVolume: "Volume"
  },
  de: {
    appTitle: "Nano local translator",
    autoDetect: "Automatische Erkennung",
    tabTranslate: "Übersetzen", backBtn: "Zurück",
    sourceLang: "Ausgangssprache", targetLang: "Zielsprache", displayMode: "Anzeigemodus",
    translateOnly: "Nur übersetzen", bilingual: "Zweisprachig",
    translateBtn: "Seite übersetzen", restoreBtn: "Original wiederherstellen",
    translatingBtn: "Übersetzen...", reTranslateBtn: "Erneut übersetzen", statusTranslating: "Wird übersetzt...", statusActive: "Aktiv (Scrollen zum Übersetzen)", statusReady: "Bereit",
    pageStatus: "Status:", translatedNodes: "Übersetzt:",
    uiLang: "UI-Sprache", saveSettings: "Speichern",
    supportDev: "Wenn dieses Projekt hilfreich ist, spendiere mir einen Kaffee.", buyCoffee: "Kaffee spendieren ☕",
    shortcutTip: "Verknüpfung: Alt+T zum Umschalten.", shortcutChange: "Zum Ändern besuchen Sie",
    selectToTranslateTitle: "Auswählen/Schweben", selectToTranslateLabel: "Status",
    s2tTranslate: "Übersetzung", hoverTranslate: "Hover-Übersetzung", youtubeDualSubs: "YouTube Subs", s2tSpeak: "Vorlesen (TTS)",
    optionalFeaturesTitle: "Optionale Funktionen", ocrTranslateTitle: "OCR-Übersetzung (Alt+S)", closeAllOcrBtn: "Alle schließen", ocrAutoClose: "Auto-Schließen (10s)",
    youtubeSettingsTitle: "YouTube dual subs Einstellungen", ytSubColorMode: "Farbmodus", ytSubColorCustom: "Benutzerdefiniert", ytSubColorInherit: "Original", ytSubColor: "Farbe", ytSubOpacity: "Deckkraft", ytSubPosition: "Position", ytSubBelow: "Unterhalb", ytSubAbove: "Oberhalb",
    statusOff: "Aus", statusOn: "Ein", shortcutSettings: "Verknüpfungen",
    fullPageShortcut: "Vollbildübersetzung", editShortcuts: "Bearbeiten",
    translationSettings: "Übersetzungseinstellungen", cacheResults: "Übersetzungscache",
    cacheTooltip: "Cache verbessert die Geschwindigkeit, ist aber möglicherweise nicht aktuell.",
    pluginSettings: "Plugin-Einstellungen", uiLanguage: "UI-Sprache",
    saveSettingsBtn: "Einstellungen speichern",
    openSourceNotice: "Dies ist ein Open-Source-Projekt.",
    welcomeTitle: "Willkommen!",
    welcomeP1: "Dies ist ein schneller Open-Source-Übersetzer, der auf der integrierten KI von Chrome basiert.",
    welcomeP2: "Alle Übersetzungen werden lokal auf Ihrem Gerät verarbeitet, um vollständige Privatsphäre zu gewährleisten.",
    welcomeImportant: "Wichtig:",
    welcomeP3: "Bei der ersten Verwendung müssen Übersetzungspakete heruntergeladen werden. Die erste Übersetzung kann etwas langsam sein.",
    welcomeNeverShow: "Schließen und nicht mehr anzeigen",
    welcomeClose: "Schließen",
    ttsSettings: "TTS-Einstellungen", ttsVoice: "Stimme", ttsRate: "Geschwindigkeit", ttsPitch: "Tonhöhe", ttsVolume: "Lautstärke"
  },
  ru: {
    appTitle: "Nano local translator",
    autoDetect: "Автоопределение",
    tabTranslate: "Перевод", backBtn: "Назад",
    sourceLang: "Исходный язык", targetLang: "Целевой язык", displayMode: "Режим отображения",
    translateOnly: "Только перевод", bilingual: "Двуязычный",
    translateBtn: "Перевести страницу", restoreBtn: "Восстановить оригинал",
    translatingBtn: "Перевод...", reTranslateBtn: "Перевести снова", statusTranslating: "Переводится...", statusActive: "Активно (Прокрутите для перевода)", statusReady: "Готово",
    pageStatus: "Статус:", translatedNodes: "Переведено:",
    uiLang: "Язык интерфейса", saveSettings: "Сохранить",
    supportDev: "Если проект был полезен, купите мне кофе.", buyCoffee: "Купить мне кофе ☕",
    shortcutTip: "Ярлык: Alt+T для переключения.", shortcutChange: "Для изменения посетите",
    selectToTranslateTitle: "Выделить/Навести для перевода", selectToTranslateLabel: "Статус",
    s2tTranslate: "Перевод", hoverTranslate: "Перевод при наведении", youtubeDualSubs: "YouTube Subs", s2tSpeak: "Вслух (TTS)",
    optionalFeaturesTitle: "Доп. функции", ocrTranslateTitle: "OCR-перевод (Alt+S)", closeAllOcrBtn: "Закрыть все", ocrAutoClose: "Авто-закрытие (10с)",
    youtubeSettingsTitle: "Настройки YouTube dual subs", ytSubColorMode: "Цветовой режим", ytSubColorCustom: "Пользовательский", ytSubColorInherit: "Оригинал", ytSubColor: "Цвет", ytSubOpacity: "Непрозрачность", ytSubPosition: "Позиция", ytSubBelow: "Ниже", ytSubAbove: "Выше",
    statusOff: "Выкл", statusOn: "Вкл", shortcutSettings: "Ярлыки",
    fullPageShortcut: "Перевод всей страницы", editShortcuts: "Изменить",
    translationSettings: "Настройки перевода", cacheResults: "Кэшировать перевод",
    cacheTooltip: "Кэш повышает скорость, но результаты могут быть не самыми свежими.",
    pluginSettings: "Настройки плагина", uiLanguage: "Язык интерфейса",
    saveSettingsBtn: "Сохранить настройки",
    openSourceNotice: "Это проект с открытым исходным кодом.",
    welcomeTitle: "Добро пожаловать!",
    welcomeP1: "Это быстрый переводчик с открытым исходным кодом на базе встроенного ИИ Chrome.",
    welcomeP2: "Все переводы обрабатываются локально на вашем устройстве для обеспечения полной конфиденциальности.",
    welcomeImportant: "Важно:",
    welcomeP3: "При первом использовании необходимо загрузить языковые пакеты. Первый перевод может быть немного медленным.",
    welcomeNeverShow: "Закрыть и больше не показывать",
    welcomeClose: "Закрыть",
    ttsSettings: "Настройки TTS", ttsVoice: "Голос", ttsRate: "Скорость", ttsPitch: "Тональность", ttsVolume: "Громкость"
  },
  ar: {
    appTitle: "Nano local translator",
    autoDetect: "اكتشاف تلقائي",
    tabTranslate: "ترجمة", backBtn: "عودة",
    sourceLang: "اللغة المصدر", targetLang: "اللغة الهدف", displayMode: "وضع العرض",
    translateOnly: "ترجمة فقط", bilingual: "ثنائي اللغة",
    translateBtn: "ترجمة الصفحة", restoreBtn: "استعادة الأصل",
    translatingBtn: "جاري الترجمة...", reTranslateBtn: "إعادة الترجمة", statusTranslating: "جاري الترجمة...", statusActive: "نشط (مرر للترجمة)", statusReady: "جاهز",
    pageStatus: "الحالة:", translatedNodes: "المترجمة:",
    uiLang: "لغة الواجهة", saveSettings: "حفظ",
    supportDev: "إذا وجدت هذا المشروع مفيداً، يمكنك شراء قهوة لي.", buyCoffee: "اشترِ لي قهوة ☕",
    shortcutTip: "اختصار: Alt+T للتبديل.", shortcutChange: "للتغيير، قم بزيارة",
    selectToTranslateTitle: "حدد للترجمة", selectToTranslateLabel: "الحالة",
    s2tTranslate: "ترجمة", s2tSpeak: "القراءة بصوت عالٍ (TTS)",
    statusOff: "إيقاف", statusOn: "تشغيل", shortcutSettings: "اختصارات",
    fullPageShortcut: "ترجمة الصفحة كاملة", editShortcuts: "تعديل",
    translationSettings: "إعدادات الترجمة", cacheResults: "ذاكرة التخزين المؤقت",
    cacheTooltip: "يحسن التخزين المؤقت السرعة ولكنه قد لا يكون الأحدث.",
    pluginSettings: "إعدادات الإضافة", uiLanguage: "لغة الواجهة",
    saveSettingsBtn: "حفظ الإعدادات",
    openSourceNotice: "هذا مشروع مفتوح المصدر.",
    welcomeTitle: "مرحباً!",
    welcomeP1: "هذا مترجم سريع مفتوح المصدر يعتمد على الذكاء الاصطناعي المدمج في Chrome.",
    welcomeP2: "تتم معالجة جميع الترجمات محليًا على جهازك لضمان الخصوصية الكاملة.",
    welcomeImportant: "مهم:",
    welcomeP3: "يتطلب الاستخدام لأول مرة تنزيل حزم الترجمة. قد تكون الترجمة الأولى بطيئة بعض الشيء.",
    welcomeNeverShow: "إغلاق وعدم العرض مرة أخرى",
    welcomeClose: "إغلاق",
    ttsSettings: "إعدادات القراءة الصوتية", ttsVoice: "الصوت", ttsRate: "السرعة", ttsPitch: "طبقة الصوت", ttsVolume: "مستوى الصوت"
  }
};

const I18N_PLACEHOLDERS = {
  en: {}, zh: {}, 'zh-Hant': {}, ja: {}, es: {}, fr: {}, de: {}, ru: {}, ar: {}
};

let currentTabId = null;
let currentMode = 'translate-only';
let isExtEnabled = true;

const $ = id => document.getElementById(id);
const apiStatus = $('apiStatus');
const sourceLang = $('sourceLang');
const targetLang = $('targetLang');
const modeTranslate = $('modeTranslate');
const modeBilingual = $('modeBilingual');
const translateBtn = $('translateBtn');
const restoreBtn = $('restoreBtn');
const statusMsg = $('statusMsg');
const pageStatus = $('pageStatus');
const translatedCount = $('translatedCount');

const masterSwitch = $('masterSwitch');
const uiLangSelect = $('uiLangSelect');
const useCacheSwitch = $('useCacheSwitch');
const saveSettingsBtn = $('saveSettingsBtn');
const settingsStatusMsg = $('settingsStatusMsg');
const backBtn = $('backBtn');
const s2tTranslateSwitch = $('s2tTranslateSwitch');
const hoverTranslateSwitch = $('hoverTranslateSwitch');
const youtubeDualSubsSwitch = $('youtubeDualSubsSwitch');
const ocrTranslateSwitch = $('ocrTranslateSwitch');
const ocrAutoCloseSwitch = $('ocrAutoCloseSwitch');
const ocrAutoCloseTime = $('ocrAutoCloseTime');
const closeAllOcrBtn = $('closeAllOcrBtn');

const ytSubColorMode = $('ytSubColorMode');
const ytSubColorField = $('ytSubColorField');
const ytSubColor = $('ytSubColor');
const ytSubOpacity = $('ytSubOpacity');
const ytSubOpacityVal = $('ytSubOpacityVal');
const ytSubPosition = $('ytSubPosition');

// New UI Elements
const swapLangBtn = $('swapLangBtn');
const modelDownloadContainer = $('modelDownloadContainer');
const modelProgressBar = $('modelProgressBar');
const modelDownloadText = $('modelDownloadText');
const s2tTriggerMode = $('s2tTriggerMode');
const showReaderCapsuleSwitch = $('showReaderCapsuleSwitch');
const excludedDomains = $('excludedDomains');

// TTS elements
const ttsVoiceSelect = $('ttsVoiceSelect');
const ttsRate = $('ttsRateSlider');
const ttsPitch = $('ttsPitchSlider');
const ttsVolume = $('ttsVolumeSlider');
const ttsRateVal = $('ttsRateVal');
const ttsPitchVal = $('ttsPitchVal');
const ttsVolumeVal = $('ttsVolumeVal');

// Engine & Custom LLM elements
const engineRadioChrome = $('engineRadioChrome');
const engineRadioCustom = $('engineRadioCustom');
const customEnginePanel = $('customEnginePanel');
const customApiUrl = $('customApiUrl');
const customModel = $('customModel');
const customApiKey = $('customApiKey');
const testCustomBtn = $('testCustomBtn');
const testStatusMsg = $('testStatusMsg');
const customConcurrency = $('customConcurrency');
const customConcurrencyVal = $('customConcurrencyVal');
const customChunkSize = $('customChunkSize');
const customChunkSizeVal = $('customChunkSizeVal');
const customPrompt = $('customPrompt');

// Custom LLM warning modal elements
const customWarningModal = $('customWarningModal');
const warningNeverShow = $('warningNeverShow');
const warningConfirmBtn = $('warningConfirmBtn');
const warningCancelBtn = $('warningCancelBtn');

// ── Populate language selects ─────────────────────────

function populateLanguages() {
  const autoOpt = new Option('Auto Detect', 'auto');
  autoOpt.setAttribute('data-i18n', 'autoDetect');
  sourceLang.appendChild(autoOpt);
  for (const [code, name] of LANGUAGES) {
    sourceLang.appendChild(new Option(name, code));
    targetLang.appendChild(new Option(name, code));
  }
  sourceLang.value = 'en';
  
  let browserLang = navigator.language || 'en';
  if (browserLang.startsWith('zh')) {
    targetLang.value = browserLang.toLowerCase() === 'zh-tw' || browserLang.toLowerCase() === 'zh-hk' ? 'zh-Hant' : 'zh';
  } else {
    const shortCode = browserLang.split('-')[0];
    const match = LANGUAGES.find(l => l[0] === shortCode);
    targetLang.value = match ? shortCode : 'zh';
  }
}

// ── Populate TTS voices ──────────────────────────────

async function populateTtsVoices() {
  return new Promise((resolve) => {
    chrome.tts.getVoices((voices) => {
      if (!ttsVoiceSelect) {
        resolve();
        return;
      }
      ttsVoiceSelect.innerHTML = '';
      ttsVoiceSelect.appendChild(new Option('System Default', ''));
      
      voices.sort((a, b) => {
        const langA = a.lang || '';
        const langB = b.lang || '';
        if (langA !== langB) return langA.localeCompare(langB);
        return (a.voiceName || '').localeCompare(b.voiceName || '');
      });
      
      for (const voice of voices) {
        if (voice.voiceName) {
          const label = `${voice.voiceName} (${voice.lang || 'unknown'})`;
          ttsVoiceSelect.appendChild(new Option(label, voice.voiceName));
        }
      }
      resolve();
    });
  });
}

// ── Init ──────────────────────────────────────────────

async function init() {
  populateLanguages();
  await populateTtsVoices();

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) {
    showStatus('Could not get current tab', 'error');
    return;
  }
  currentTabId = tabs[0].id;

  $('btnSettings').addEventListener('click', () => {
    const isSettings = document.getElementById('settingsTab').style.display !== 'none';
    switchTab(isSettings ? 'translate' : 'settings');
  });

  document.querySelectorAll('.section-label').forEach(label => {
    label.addEventListener('click', () => {
      const section = label.closest('.section');
      if (section) {
        const content = section.querySelector('.section-content');
        if (content) {
          if (section.classList.contains('collapsed')) {
            section.classList.remove('collapsed');
            content.style.overflow = 'hidden';
            setTimeout(() => {
              if (!section.classList.contains('collapsed')) {
                content.style.overflow = 'visible';
              }
            }, 300);
          } else {
            content.style.overflow = 'hidden';
            section.classList.add('collapsed');
          }
        }
      }
    });
  });

  await checkTranslatorApi();
  const saved = await chrome.storage.local.get([
    'isEnabled', 'uiLang', 'sourceLang', 'targetLang', 'mode', 
    's2tTranslate', 'hoverTranslate', 'youtubeDualSubs', 'ocrTranslate', 'ocrAutoClose', 'ocrAutoCloseTime', 'ocrFontColor', 'ytSubColorMode', 'ytSubColor', 'ytSubOpacity', 'ytSubPosition', 'useCache', 'totalTranslates', 'hideWelcome', 'selectToTranslate',
    'ttsVoice', 'ttsRate', 'ttsPitch', 'ttsVolume',
    'translationEngine', 'customApiUrl', 'customModel', 'customApiKey', 'customConcurrency', 'customChunkSize', 'customPrompt', 'hideCustomModelWarning',
    's2tTriggerMode', 'showReaderCapsule', 'excludedDomains'
  ]);
  
  if (saved.totalTranslates) {
    const el = $('totalTranslateCount');
    if (el) el.textContent = saved.totalTranslates;
  }

  if (saved.isEnabled !== undefined) {
    isExtEnabled = saved.isEnabled;
    masterSwitch.checked = isExtEnabled;
  }
  updateEnableState();

  if (saved.uiLang) {
    uiLangSelect.value = saved.uiLang;
    applyI18n(saved.uiLang);
  } else {
    const lang = (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
    uiLangSelect.value = lang;
    applyI18n(lang);
  }

  if (saved.sourceLang) sourceLang.value = saved.sourceLang;
  if (saved.targetLang) {
    targetLang.value = saved.targetLang;
  }
  if (saved.mode) setMode(saved.mode);

  // Engine settings load
  const engine = saved.translationEngine || 'chrome';
  if (engine === 'custom') {
    if (engineRadioCustom) engineRadioCustom.checked = true;
    if (customEnginePanel) customEnginePanel.style.display = 'flex';
  } else {
    if (engineRadioChrome) engineRadioChrome.checked = true;
    if (customEnginePanel) customEnginePanel.style.display = 'none';
  }
  if (customApiUrl && saved.customApiUrl !== undefined) customApiUrl.value = saved.customApiUrl;
  if (customModel && saved.customModel !== undefined) customModel.value = saved.customModel;
  if (customApiKey && saved.customApiKey !== undefined) customApiKey.value = saved.customApiKey;
  if (customConcurrency && saved.customConcurrency !== undefined) {
    customConcurrency.value = saved.customConcurrency;
    if (customConcurrencyVal) customConcurrencyVal.textContent = saved.customConcurrency;
  }
  if (customChunkSize && saved.customChunkSize !== undefined) {
    customChunkSize.value = saved.customChunkSize;
    if (customChunkSizeVal) customChunkSizeVal.textContent = saved.customChunkSize;
  }
  if (customPrompt && saved.customPrompt !== undefined) customPrompt.value = saved.customPrompt;
  
  // Set switches state with legacy selectToTranslate migration
  let s2tTrans = saved.s2tTranslate;
  if (s2tTrans === undefined) {
    s2tTrans = saved.selectToTranslate !== undefined ? saved.selectToTranslate : 'on';
  }
  s2tTranslateSwitch.checked = (s2tTrans === 'on');
  hoverTranslateSwitch.checked = (saved.hoverTranslate === 'on');
  youtubeDualSubsSwitch.checked = (saved.youtubeDualSubs === 'on');
  
  if (ocrTranslateSwitch) ocrTranslateSwitch.checked = (saved.ocrTranslate === 'on');
  const ocrBilingualSwitch = $('ocrBilingualSwitch');
  if (ocrBilingualSwitch) ocrBilingualSwitch.checked = (saved.ocrBilingual !== 'off'); // default on
  if (ocrAutoCloseSwitch) ocrAutoCloseSwitch.checked = (saved.ocrAutoClose === 'on');
  if (ocrAutoCloseTime && saved.ocrAutoCloseTime !== undefined) ocrAutoCloseTime.value = saved.ocrAutoCloseTime;
  
  const ocrFontColor = $('ocrFontColor');
  if (ocrFontColor && saved.ocrFontColor !== undefined) ocrFontColor.value = saved.ocrFontColor;
  
  const ocrOpacitySlider = $('ocrOpacitySlider');
  const ocrOpacityVal = $('ocrOpacityVal');
  if (ocrOpacitySlider && saved.ocrOpacity) {
    ocrOpacitySlider.value = saved.ocrOpacity;
    if (ocrOpacityVal) ocrOpacityVal.textContent = saved.ocrOpacity;
  }
  
  // Call the sorting once on load (no animation)
  setTimeout(() => sortFeatures(false), 50);
  
  if (saved.ytSubColorMode) ytSubColorMode.value = saved.ytSubColorMode;
  ytSubColorField.style.display = ytSubColorMode.value === 'inherit' ? 'none' : 'flex';
  if (saved.ytSubColor) ytSubColor.value = saved.ytSubColor;
  if (saved.ytSubOpacity) {
    ytSubOpacity.value = saved.ytSubOpacity;
    if (ytSubOpacityVal) ytSubOpacityVal.textContent = saved.ytSubOpacity;
  }
  if (saved.ytSubPosition) ytSubPosition.value = saved.ytSubPosition;

  if (saved.useCache !== undefined) useCacheSwitch.checked = saved.useCache;
  
  // TTS Settings load
  if (saved.ttsVoice !== undefined) ttsVoiceSelect.value = saved.ttsVoice;
  if (saved.ttsRate !== undefined) {
    ttsRate.value = saved.ttsRate;
    ttsRateVal.textContent = saved.ttsRate;
  }
  if (saved.ttsPitch !== undefined) {
    ttsPitch.value = saved.ttsPitch;
    ttsPitchVal.textContent = saved.ttsPitch;
  }
  if (saved.ttsVolume !== undefined) {
    ttsVolume.value = saved.ttsVolume;
    ttsVolumeVal.textContent = saved.ttsVolume;
  }

  // Load new feature settings
  if (s2tTriggerMode && saved.s2tTriggerMode) s2tTriggerMode.value = saved.s2tTriggerMode;
  if (showReaderCapsuleSwitch && saved.showReaderCapsule !== undefined) {
    showReaderCapsuleSwitch.checked = saved.showReaderCapsule;
  }
  if (excludedDomains && saved.excludedDomains !== undefined) {
    excludedDomains.value = saved.excludedDomains;
  }

  await refreshStatus();

  translateBtn.addEventListener('click', onTranslate);
  restoreBtn.addEventListener('click', onRestore);
  modeTranslate.addEventListener('click', () => setMode('translate-only'));
  modeBilingual.addEventListener('click', () => setMode('bilingual'));
  sourceLang.addEventListener('change', saveSettings);
  targetLang.addEventListener('change', saveSettings);

  // Settings
  saveSettingsBtn.addEventListener('click', onSaveSettings);
  backBtn.addEventListener('click', () => switchTab('translate'));

  ttsRate.addEventListener('input', () => { ttsRateVal.textContent = ttsRate.value; });
  ttsPitch.addEventListener('input', () => { ttsPitchVal.textContent = ttsPitch.value; });
  ttsVolume.addEventListener('input', () => { ttsVolumeVal.textContent = ttsVolume.value; });
  
  uiLangSelect.addEventListener('change', () => {
    applyI18n(uiLangSelect.value);
  });
  
  masterSwitch.addEventListener('change', async (e) => {
    isExtEnabled = e.target.checked;
    await chrome.storage.local.set({ isEnabled: isExtEnabled });
    updateEnableState();
    if (!isExtEnabled) {
      try {
        await sendToTab({ action: 'restore' });
      } catch (err) {}
    }
  });

  s2tTranslateSwitch.addEventListener('change', async (e) => {
    const val = e.target.checked ? 'on' : 'off';
    await chrome.storage.local.set({ s2tTranslate: val });
    setTimeout(() => sortFeatures(true), 500);
  });

  if (swapLangBtn) {
    swapLangBtn.addEventListener('click', () => {
      const srcVal = sourceLang.value;
      const tgtVal = targetLang.value;
      if (srcVal === 'auto') return;
      sourceLang.value = tgtVal;
      targetLang.value = srcVal;
      saveSettings();
    });
  }

  if (s2tTriggerMode) {
    s2tTriggerMode.addEventListener('change', async (e) => {
      await chrome.storage.local.set({ s2tTriggerMode: e.target.value });
    });
  }

  if (showReaderCapsuleSwitch) {
    showReaderCapsuleSwitch.addEventListener('change', async (e) => {
      await chrome.storage.local.set({ showReaderCapsule: e.target.checked });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) chrome.tabs.sendMessage(tab.id, { action: 'update_capsule_visibility', show: e.target.checked }).catch(() => {});
    });
  }

  if (excludedDomains) {
    excludedDomains.addEventListener('input', async (e) => {
      await chrome.storage.local.set({ excludedDomains: e.target.value });
    });
  }

  hoverTranslateSwitch.addEventListener('change', async (e) => {
    const val = e.target.checked ? 'on' : 'off';
    await chrome.storage.local.set({ hoverTranslate: val });
    setTimeout(() => sortFeatures(true), 500);
  });

  youtubeDualSubsSwitch.addEventListener('change', async (e) => {
    const val = e.target.checked ? 'on' : 'off';
    await chrome.storage.local.set({ youtubeDualSubs: val });
    setTimeout(() => sortFeatures(true), 500);
  });
  
  if (ocrTranslateSwitch) {
    ocrTranslateSwitch.addEventListener('change', async (e) => {
      const val = e.target.checked ? 'on' : 'off';
      await chrome.storage.local.set({ ocrTranslate: val });
      setTimeout(() => sortFeatures(true), 500);
    });
  }

  if (ocrBilingualSwitch) {
    ocrBilingualSwitch.addEventListener('change', async (e) => {
      const val = e.target.checked ? 'on' : 'off';
      await chrome.storage.local.set({ ocrBilingual: val });
    });
  }

  if (ocrAutoCloseSwitch) {
    ocrAutoCloseSwitch.addEventListener('change', async (e) => {
      const val = e.target.checked ? 'on' : 'off';
      await chrome.storage.local.set({ ocrAutoClose: val });
    });
  }

  if (ocrAutoCloseTime) {
    ocrAutoCloseTime.addEventListener('input', async (e) => {
      await chrome.storage.local.set({ ocrAutoCloseTime: e.target.value });
    });
  }
  
  if (ocrFontColor) {
    ocrFontColor.addEventListener('input', async (e) => {
      await chrome.storage.local.set({ ocrFontColor: e.target.value });
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "update_ocr_font_color", color: e.target.value });
    });
  }
  
  if (ocrOpacitySlider) {
    ocrOpacitySlider.addEventListener('input', async (e) => {
      if (ocrOpacityVal) ocrOpacityVal.textContent = e.target.value;
      await chrome.storage.local.set({ ocrOpacity: e.target.value });
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "update_ocr_opacity", opacity: e.target.value });
    });
  }
  
  if (closeAllOcrBtn) {
    closeAllOcrBtn.addEventListener('click', async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "close_all_ocr" });
      }
    });
  }



  ytSubColorMode.addEventListener('change', async (e) => {
    ytSubColorField.style.display = e.target.value === 'inherit' ? 'none' : 'flex';
    await chrome.storage.local.set({ ytSubColorMode: e.target.value });
  });

  ytSubColor.addEventListener('input', async (e) => {
    await chrome.storage.local.set({ ytSubColor: e.target.value });
  });
  
  ytSubOpacity.addEventListener('input', async (e) => {
    if (ytSubOpacityVal) ytSubOpacityVal.textContent = e.target.value;
    await chrome.storage.local.set({ ytSubOpacity: e.target.value });
  });
  
  ytSubPosition.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ ytSubPosition: e.target.value });
  });

  document.querySelectorAll('.chrome-link, .shortcut-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = link.dataset.url || 'chrome://extensions/shortcuts';
      chrome.tabs.create({ url: targetUrl });
    });
  });

  // Custom LLM sliders
  if (customConcurrency) {
    customConcurrency.addEventListener('input', () => {
      if (customConcurrencyVal) customConcurrencyVal.textContent = customConcurrency.value;
    });
  }
  if (customChunkSize) {
    customChunkSize.addEventListener('input', () => {
      if (customChunkSizeVal) customChunkSizeVal.textContent = customChunkSize.value;
    });
  }

  // Engine radio options
  if (engineRadioChrome) {
    engineRadioChrome.addEventListener('change', async () => {
      if (engineRadioChrome.checked) {
        if (customEnginePanel) customEnginePanel.style.display = 'none';
        await chrome.storage.local.set({ translationEngine: 'chrome' });
        await checkTranslatorApi();
      }
    });
  }

  if (engineRadioCustom) {
    engineRadioCustom.addEventListener('change', async () => {
      if (engineRadioCustom.checked) {
        const warnData = await chrome.storage.local.get(['hideCustomModelWarning']);
        if (!warnData.hideCustomModelWarning && customWarningModal) {
          customWarningModal.style.display = 'flex';
        } else {
          if (customEnginePanel) customEnginePanel.style.display = 'flex';
          await chrome.storage.local.set({ translationEngine: 'custom' });
          await checkTranslatorApi();
        }
      }
    });
  }

  // Warning modal buttons
  if (warningCancelBtn) {
    warningCancelBtn.addEventListener('click', () => {
      if (customWarningModal) customWarningModal.style.display = 'none';
      if (engineRadioChrome) engineRadioChrome.checked = true;
      if (customEnginePanel) customEnginePanel.style.display = 'none';
    });
  }

  if (warningConfirmBtn) {
    warningConfirmBtn.addEventListener('click', async () => {
      if (customWarningModal) customWarningModal.style.display = 'none';
      if (warningNeverShow && warningNeverShow.checked) {
        await chrome.storage.local.set({ hideCustomModelWarning: true });
      }
      if (engineRadioCustom) engineRadioCustom.checked = true;
      if (customEnginePanel) customEnginePanel.style.display = 'flex';
      await chrome.storage.local.set({ translationEngine: 'custom' });
      await checkTranslatorApi();
    });
  }

  // Test Custom LLM connection
  if (testCustomBtn) {
    testCustomBtn.addEventListener('click', async () => {
      testCustomBtn.disabled = true;
      testStatusMsg.textContent = 'Testing connection...';
      testStatusMsg.style.color = '#1a73e8';

      try {
        const resp = await chrome.runtime.sendMessage({
          type: 'testCustomLLM',
          apiUrl: customApiUrl ? customApiUrl.value : 'http://localhost:11434/v1',
          apiKey: customApiKey ? customApiKey.value : '',
          model: customModel ? customModel.value : 'qwen2.5:7b'
        });
        if (resp && resp.ok) {
          testStatusMsg.textContent = `✓ OK (${resp.latency}ms): "${resp.translation ? resp.translation.slice(0, 30) : ''}"`;
          testStatusMsg.style.color = '#0d652d';
        } else {
          testStatusMsg.textContent = `✗ Failed: ${resp ? resp.error : 'Unknown'}`;
          testStatusMsg.style.color = '#c5221f';
        }
      } catch (err) {
        testStatusMsg.textContent = `✗ Error: ${err.message}`;
        testStatusMsg.style.color = '#c5221f';
      } finally {
        testCustomBtn.disabled = false;
      }
    });
  }

  // Show welcome modal if not hidden
  if (!saved.hideWelcome) {
    const welcomeModal = $('welcomeModal');
    if (welcomeModal) {
      welcomeModal.style.display = 'flex';
      $('welcomeClose').addEventListener('click', () => {
        welcomeModal.style.display = 'none';
      });
      $('welcomeNeverShow').addEventListener('click', () => {
        welcomeModal.style.display = 'none';
        chrome.storage.local.set({ hideWelcome: true });
      });
    }
  }
}

function sortFeatures(animate = true) {
  const container = document.querySelector('.s2t-container');
  if (!container) return;
  const items = Array.from(container.querySelectorAll('.feature-item'));
  
  const originalOrder = new Map(items.map((item, i) => [item, i]));

  items.sort((a, b) => {
    const aChecked = a.querySelector('input[type="checkbox"]').checked;
    const bChecked = b.querySelector('input[type="checkbox"]').checked;
    if (aChecked === bChecked) {
      return originalOrder.get(a) - originalOrder.get(b);
    }
    return aChecked ? -1 : 1;
  });

  if (!animate) {
    items.forEach(item => container.appendChild(item));
    return;
  }
  
  const firstRects = items.map(item => item.getBoundingClientRect());
  items.forEach(item => container.appendChild(item));
  const lastRects = items.map(item => item.getBoundingClientRect());
  
  items.forEach((item, i) => {
    const dy = firstRects[i].top - lastRects[i].top;
    if (dy !== 0) {
      item.style.transition = 'none';
      item.style.transform = `translateY(${dy}px)`;
    }
  });

  requestAnimationFrame(() => {
    items.forEach(item => {
      item.style.transition = 'transform 0.5s ease-in-out';
      item.style.transform = '';
    });
  });
}

function updateEnableState() {
  document.body.classList.toggle('disabled-ext', !isExtEnabled);
}

function applyI18n(lang) {
  const dict = I18N[lang] || I18N['en'];
  const pDict = I18N_PLACEHOLDERS[lang] || I18N_PLACEHOLDERS['en'];
  const enDict = I18N['en'];
  const enPDict = I18N_PLACEHOLDERS['en'];
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    } else if (enDict[key]) {
      el.textContent = enDict[key];
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (pDict[key]) {
      el.setAttribute('placeholder', pDict[key]);
    } else if (enPDict[key]) {
      el.setAttribute('placeholder', enPDict[key]);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) {
      el.setAttribute('title', dict[key]);
    } else if (enDict[key]) {
      el.setAttribute('title', enDict[key]);
    }
  });
}

async function onSaveSettings() {
  saveSettingsBtn.disabled = true;
  await chrome.storage.local.set({
    uiLang: uiLangSelect.value,
    useCache: useCacheSwitch.checked,
    ttsVoice: ttsVoiceSelect.value,
    ttsRate: parseFloat(ttsRate.value),
    ttsPitch: parseFloat(ttsPitch.value),
    ttsVolume: parseFloat(ttsVolume.value),
    translationEngine: engineRadioCustom && engineRadioCustom.checked ? 'custom' : 'chrome',
    customApiUrl: customApiUrl ? customApiUrl.value : 'http://localhost:11434/v1',
    customModel: customModel ? customModel.value : 'qwen2.5:7b',
    customApiKey: customApiKey ? customApiKey.value : '',
    customConcurrency: customConcurrency ? parseInt(customConcurrency.value, 10) : 3,
    customChunkSize: customChunkSize ? parseInt(customChunkSize.value, 10) : 10,
    customPrompt: customPrompt ? customPrompt.value : '',
    s2tTriggerMode: s2tTriggerMode ? s2tTriggerMode.value : 'bubble',
    showReaderCapsule: showReaderCapsuleSwitch ? showReaderCapsuleSwitch.checked : true,
    excludedDomains: excludedDomains ? excludedDomains.value : ''
  });
  
  settingsStatusMsg.textContent = 'Settings saved!';
  settingsStatusMsg.className = 'status-msg success';
  settingsStatusMsg.style.display = 'block';
  
  setTimeout(() => {
    settingsStatusMsg.style.display = 'none';
    saveSettingsBtn.disabled = false;
  }, 1500);

  await checkTranslatorApi();
}

// ── Tab switching ─────────────────────────────────────

function switchTab(tab) {
  document.getElementById('translateTab').style.display = tab === 'translate' ? '' : 'none';
  document.getElementById('settingsTab').style.display = tab === 'settings' ? '' : 'none';
}

// ── Translator API check ──────────────────────────────

async function checkTranslatorApi() {
  try {
    await sendToTab({ action: 'getStatus' });
  } catch (e) {}

  const storageData = await chrome.storage.local.get(['translationEngine']);
  if (storageData.translationEngine === 'custom') {
    apiStatus.textContent = '✓ Custom LLM Active (OpenAI Format)';
    apiStatus.className = 'status-bar api-available';
    translateBtn.disabled = false;
    return true;
  }

  // 1. Check background service worker API support
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'checkApi' });
    if (resp?.available) {
      apiStatus.textContent = '✓ Translator API available';
      apiStatus.className = 'status-bar api-available';
      translateBtn.disabled = false;
      return true;
    }
  } catch (e) {}

  // 2. Check window context API support
  const localAvailable = (typeof window.Translator !== 'undefined' && !!window.Translator.create) ||
                         (typeof window.translation !== 'undefined' && !!window.translation.createTranslator) ||
                         (typeof window.ai !== 'undefined' && !!window.ai.translator && !!window.ai.translator.create);
  if (localAvailable) {
    apiStatus.textContent = '✓ Translator API available';
    apiStatus.className = 'status-bar api-available';
    translateBtn.disabled = false;
    return true;
  }

  // 3. Fallback test translation verification
  try {
    const test = await chrome.runtime.sendMessage({
      type: 'translate', texts: ['Hello'], sourceLang: 'en', targetLang: 'zh'
    });
    if (test?.translations && !test.error && test.translations['Hello'] && test.translations['Hello'] !== 'Hello') {
      apiStatus.textContent = '✓ Translator API available';
      apiStatus.className = 'status-bar api-available';
      translateBtn.disabled = false;
      return true;
    }
  } catch (e) {}

  apiStatus.textContent = 'Translator API not available (Chrome 138+)';
  apiStatus.className = 'status-bar api-unavailable';
  translateBtn.disabled = true;
  return false;
}

// ── Messaging ─────────────────────────────────────────

async function sendToTab(msg) {
  if (!currentTabId) throw new Error('No tab');
  return await chrome.tabs.sendMessage(currentTabId, msg);
}

// ── Mode ──────────────────────────────────────────────

function setMode(mode) {
  currentMode = mode;
  modeTranslate.classList.toggle('active', mode === 'translate-only');
  modeBilingual.classList.toggle('active', mode === 'bilingual');
  saveSettings();
  if (!restoreBtn.disabled) {
    onTranslate();
  }
}

function saveSettings() {
  chrome.storage.local.set({
    sourceLang: sourceLang.value, targetLang: targetLang.value, mode: currentMode
  });
}

function getI18nText(key, fallback = '') {
  const lang = (uiLangSelect && uiLangSelect.value) || 'en';
  const dict = I18N[lang] || I18N['en'];
  return (dict && dict[key]) || (I18N['en'] && I18N['en'][key]) || fallback;
}

function updateTranslationUI(state) {
  if (!state) return;
  if (state.count !== undefined) {
    translatedCount.textContent = state.count;
  }

  if (state.isTranslating) {
    translateBtn.disabled = true;
    translateBtn.classList.add('loading');
    translateBtn.textContent = getI18nText('translatingBtn', 'Translating...');
    pageStatus.textContent = getI18nText('statusTranslating', 'Translating...');
    restoreBtn.disabled = false;
  } else if (state.isTranslated) {
    translateBtn.disabled = false;
    translateBtn.classList.remove('loading');
    translateBtn.textContent = getI18nText('reTranslateBtn', 'Re-translate');
    const src = state.sourceLang || sourceLang.value;
    const tgt = state.targetLang || targetLang.value;
    pageStatus.textContent = `${getI18nText('statusActive', 'Active')} (${src} → ${tgt})`;
    restoreBtn.disabled = false;
  } else {
    translateBtn.disabled = false;
    translateBtn.classList.remove('loading');
    translateBtn.textContent = getI18nText('translateBtn', 'Translate Page');
    pageStatus.textContent = getI18nText('statusReady', 'Ready');
    restoreBtn.disabled = true;
  }
}

// Listen for live page translation progress and status events
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'page_translation_status') {
    updateTranslationUI(msg);
  }
  if (msg && msg.type === 'model_download_progress') {
    if (modelDownloadContainer && modelProgressBar && modelDownloadText) {
      modelDownloadContainer.style.display = 'block';
      modelProgressBar.style.width = `${msg.percent || 0}%`;
      const loadedMB = ((msg.loaded || 0) / (1024 * 1024)).toFixed(1);
      const totalMB = ((msg.total || 0) / (1024 * 1024)).toFixed(1);
      modelDownloadText.textContent = `${getI18nText('modelDownloading', 'Downloading Model')}... ${msg.percent}% (${loadedMB}MB / ${totalMB}MB)`;
      if (msg.percent >= 100) {
        setTimeout(() => {
          modelDownloadContainer.style.display = 'none';
        }, 2000);
      }
    }
  }
});

// ── Translate ─────────────────────────────────────────

async function onTranslate() {
  const src = sourceLang.value;
  const tgt = targetLang.value;
  updateTranslationUI({
    isTranslating: true,
    isTranslated: true,
    sourceLang: src,
    targetLang: tgt
  });
  hideStatus();

  try {
    const resp = await sendToTab({ action: 'translate', mode: currentMode, sourceLang: src, targetLang: tgt });
    if (resp && resp.status === 'done') {
      const statData = await chrome.storage.local.get(['totalTranslates']);
      const count = (statData.totalTranslates || 0) + 1;
      await chrome.storage.local.set({ totalTranslates: count });
      const el = $('totalTranslateCount');
      if (el) el.textContent = count;

      updateTranslationUI({
        isTranslated: true,
        isTranslating: false,
        count: resp.count,
        sourceLang: src,
        targetLang: tgt
      });
      showStatus(getI18nText('statusActive', 'Active Translation') + ': ' + resp.count + ' ' + (getI18nText('translatedNodes', 'nodes')), 'success');
    } else {
      showStatus('Translation failed: ' + (resp ? resp.error : 'unknown error'), 'error');
      updateTranslationUI({ isTranslated: false, isTranslating: false });
      pageStatus.textContent = 'Error';
    }
  } catch (e) {
    showStatus('Cannot connect to page: ' + e.message, 'error');
    updateTranslationUI({ isTranslated: false, isTranslating: false });
    pageStatus.textContent = 'Connection failed';
  }
}

async function onRestore() {
  restoreBtn.disabled = true;
  hideStatus();
  try {
    await sendToTab({ action: 'restore' });
    updateTranslationUI({ isTranslated: false, isTranslating: false, count: 0 });
    showStatus('Restored original text', 'success');
  } catch (e) {
    showStatus('Restore failed: ' + e.message, 'error');
    restoreBtn.disabled = false;
  }
}

async function refreshStatus() {
  try {
    const resp = await sendToTab({ action: 'getStatus' });
    if (resp) {
      updateTranslationUI(resp);
    }
  } catch (e) {}
}

// ── UI helpers ────────────────────────────────────────

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = 'status-msg ' + type;
  statusMsg.style.display = 'block';
}

function hideStatus() {
  statusMsg.style.display = 'none';
}

// ── Start ─────────────────────────────────────────────

init();
