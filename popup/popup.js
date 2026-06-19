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
    pageStatus: "Page status:", translatedNodes: "Translated:",
    uiLang: "UI Language", saveSettings: "Save Settings",
    supportDev: "If you find this project helpful, you can Buy Me a Coffee.", buyCoffee: "Buy me a coffee ☕",
    shortcutTip: "Shortcut: Alt+T (Mac: ⌥+T) to toggle.", shortcutChange: "To change, visit",
    selectToTranslateTitle: "Select/Hover Translation", selectToTranslateLabel: "Status",
    s2tTranslate: "Select Translation", hoverTranslate: "Hover Translation", youtubeDualSubs: "YouTube Dual Subs", s2tSpeak: "Speak Aloud (TTS)",
    optionalFeaturesTitle: "Optional Features", ocrTranslateTitle: "Screenshot Translate (Alt+S)", closeAllOcrBtn: "Close All Popups", ocrAutoClose: "Auto-close (s)",
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
    ttsSettings: "TTS Settings", ttsVoice: "Voice", ttsRate: "Speed", ttsPitch: "Pitch", ttsVolume: "Volume"
  },
  zh: {
    appTitle: "Nano local translator",
    autoDetect: "自动检测",
    tabTranslate: "翻译", backBtn: "返回",
    sourceLang: "源语言", targetLang: "目标语言", displayMode: "显示模式",
    translateOnly: "仅翻译", bilingual: "双语对照",
    translateBtn: "翻译页面", restoreBtn: "恢复原文",
    pageStatus: "页面状态:", translatedNodes: "已翻译:",
    uiLang: "界面语言", saveSettings: "保存设置",
    supportDev: "如果你觉得这个项目有帮助，可以请我喝杯咖啡。", buyCoffee: "请我喝杯咖啡 ☕",
    shortcutTip: "快捷键：Alt+T (Mac: ⌥+T) 切换翻译", shortcutChange: "修改快捷键请访问",
    selectToTranslateTitle: "划词/悬停翻译", selectToTranslateLabel: "状态",
    s2tTranslate: "划词翻译", hoverTranslate: "悬停选词翻译", youtubeDualSubs: "YouTube双语字幕", s2tSpeak: "划词朗读 (TTS)",
    optionalFeaturesTitle: "可选功能", ocrTranslateTitle: "截屏翻译 (Alt+S)", closeAllOcrBtn: "关闭所有弹窗", ocrAutoClose: "自动关闭 (秒)",
    youtubeSettingsTitle: "YouTube 双语字幕设置", ytSubColorMode: "颜色模式", ytSubColorCustom: "自定义", ytSubColorInherit: "跟随原文", ytSubColor: "自定义颜色", ytSubOpacity: "透明度", ytSubPosition: "翻译位置", ytSubBelow: "在原文下方", ytSubAbove: "在原文上方",
    statusOff: "关闭", statusOn: "开启", shortcutSettings: "快捷键设置",
    fullPageShortcut: "全文翻译快捷键", editShortcuts: "编辑 (Alt+T)",
    translationSettings: "翻译设置", cacheResults: "缓存翻译结果",
    cacheTooltip: "开启缓存可以提高翻译速度，减少重复请求，但可能导致翻译结果不是最新的",
    pluginSettings: "插件设置", uiLanguage: "界面语言",
    saveSettingsBtn: "保存设置",
    openSourceNotice: "这是一个开源项目。",
    welcomeTitle: "欢迎！",
    welcomeP1: "这是一个基于 Chrome Built-in AI 的开源快速翻译器。",
    welcomeP2: "所有翻译结果均保存在本地，以保护您的隐私。",
    welcomeImportant: "注意：",
    welcomeP3: "第一次使用时需要下载翻译包。第一次翻译速度可能略慢。",
    welcomeNeverShow: "关闭并再也不显示",
    welcomeClose: "关闭",
    ttsSettings: "朗读设置 (TTS)", ttsVoice: "发音人/音色", ttsRate: "语速", ttsPitch: "音调", ttsVolume: "音量"
  },
  'zh-Hant': {
    appTitle: "Nano local translator",
    autoDetect: "自動檢測",
    tabTranslate: "翻譯", backBtn: "返回",
    sourceLang: "來源語言", targetLang: "目標語言", displayMode: "顯示模式",
    translateOnly: "僅翻譯", bilingual: "雙語對照",
    translateBtn: "翻譯頁面", restoreBtn: "恢復原文",
    pageStatus: "頁面狀態:", translatedNodes: "已翻譯:",
    uiLang: "介面語言", saveSettings: "保存設置",
    supportDev: "如果您覺得這個專案有幫助，可以請我喝杯咖啡。", buyCoffee: "請我喝杯咖啡 ☕",
    shortcutTip: "快捷鍵：Alt+T (Mac: ⌥+T) 切換翻譯", shortcutChange: "修改快捷鍵請訪問",
    selectToTranslateTitle: "劃詞/懸停翻譯", selectToTranslateLabel: "狀態",
    s2tTranslate: "劃詞翻譯", hoverTranslate: "懸停選詞翻譯", youtubeDualSubs: "YouTube雙語字幕", s2tSpeak: "劃詞朗讀 (TTS)",
    optionalFeaturesTitle: "可選功能", ocrTranslateTitle: "截屏翻譯 (Alt+S)", closeAllOcrBtn: "關閉所有彈窗", ocrAutoClose: "自動關閉 (秒)",
    youtubeSettingsTitle: "YouTube 雙語字幕設置", ytSubColorMode: "顏色模式", ytSubColorCustom: "自定義", ytSubColorInherit: "跟隨原文", ytSubColor: "自定義顏色", ytSubOpacity: "透明度", ytSubPosition: "翻譯位置", ytSubBelow: "在原文下方", ytSubAbove: "在原文上方",
    statusOff: "關閉", statusOn: "開啟", shortcutSettings: "快捷鍵設置",
    fullPageShortcut: "全文翻譯快捷鍵", editShortcuts: "編輯 (Alt+T)",
    translationSettings: "翻譯設置", cacheResults: "緩存翻譯結果",
    cacheTooltip: "開啟緩存可以提高翻譯速度，減少重複請求，但可能導致翻譯結果不是最新的",
    pluginSettings: "外掛設置", uiLanguage: "介面語言",
    saveSettingsBtn: "保存設置",
    openSourceNotice: "這是一個開源專案。",
    welcomeTitle: "歡迎！",
    welcomeP1: "這是一個基於 Chrome Built-in AI 的開源快速翻譯器。",
    welcomeP2: "所有翻譯結果均保存在本地，以保護您的隱私。",
    welcomeImportant: "注意：",
    welcomeP3: "第一次使用時需要下載翻譯包。第一次翻譯速度可能略慢。",
    welcomeNeverShow: "關閉並再也不顯示",
    welcomeClose: "關閉",
    ttsSettings: "朗讀設置 (TTS)", ttsVoice: "發音人/音色", ttsRate: "語速", ttsPitch: "音調", ttsVolume: "音量"
  },
  ja: {
    appTitle: "Nano local translator",
    autoDetect: "自動検出",
    tabTranslate: "翻訳", backBtn: "戻る",
    sourceLang: "翻訳元", targetLang: "翻訳先", displayMode: "表示モード",
    translateOnly: "翻訳のみ", bilingual: "2言語表示",
    translateBtn: "ページを翻訳", restoreBtn: "原文に戻す",
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
    pluginSettings: "プラグイン設定", uiLanguage: "UI言語",
    saveSettingsBtn: "設定を保存",
    openSourceNotice: "これはオープンソースプロジェクトです。",
    welcomeTitle: "ようこそ！",
    welcomeP1: "これはChrome Built-in AIベースのオープンソース高速翻訳ツールです。",
    welcomeP2: "翻訳はすべてデバイス上でローカルに処理され、プライバシーが保護されます。",
    welcomeImportant: "重要：",
    welcomeP3: "初回使用時は翻訳パックのダウンロードが必要です。初回の翻訳は少し時間がかかる場合があります。",
    welcomeNeverShow: "閉じて二度と表示しない",
    welcomeClose: "閉じる",
    ttsSettings: "音声読み上げ設定 (TTS)", ttsVoice: "音声/話者", ttsRate: "速度", ttsPitch: "ピッチ", ttsVolume: "音量"
  },
  es: {
    appTitle: "Nano local translator",
    autoDetect: "Detección automática",
    tabTranslate: "Traducir", backBtn: "Atrás",
    sourceLang: "Idioma de origen", targetLang: "Idioma de destino", displayMode: "Modo de visualización",
    translateOnly: "Solo traducir", bilingual: "Bilingüe",
    translateBtn: "Traducir página", restoreBtn: "Restaurar original",
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

// TTS elements
const ttsVoiceSelect = $('ttsVoiceSelect');
const ttsRate = $('ttsRateSlider');
const ttsPitch = $('ttsPitchSlider');
const ttsVolume = $('ttsVolumeSlider');
const ttsRateVal = $('ttsRateVal');
const ttsPitchVal = $('ttsPitchVal');
const ttsVolumeVal = $('ttsVolumeVal');

// ── Populate language selects ─────────────────────────

function populateLanguages() {
  sourceLang.appendChild(new Option(i18n.autoDetect, 'auto'));
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
    'ttsVoice', 'ttsRate', 'ttsPitch', 'ttsVolume'
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
}

async function onSaveSettings() {
  saveSettingsBtn.disabled = true;
  await chrome.storage.local.set({
    uiLang: uiLangSelect.value,
    useCache: useCacheSwitch.checked,
    ttsVoice: ttsVoiceSelect.value,
    ttsRate: parseFloat(ttsRate.value),
    ttsPitch: parseFloat(ttsPitch.value),
    ttsVolume: parseFloat(ttsVolume.value)
  });
  
  settingsStatusMsg.textContent = 'Settings saved!';
  settingsStatusMsg.className = 'status-msg success';
  settingsStatusMsg.style.display = 'block';
  
  setTimeout(() => {
    settingsStatusMsg.style.display = 'none';
    saveSettingsBtn.disabled = false;
  }, 1500);
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
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'checkApi' });
    if (resp?.available) {
      apiStatus.textContent = '✓ Translator API available';
      apiStatus.className = 'status-bar api-available';
      return true;
    }
  } catch (e) {}
  try {
    const test = await chrome.runtime.sendMessage({
      type: 'translate', texts: ['test'], sourceLang: 'en', targetLang: 'zh'
    });
    if (test?.translations) {
      apiStatus.textContent = '✓ Translator API available';
      apiStatus.className = 'status-bar api-available';
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

// ── Translate ─────────────────────────────────────────

async function onTranslate() {
  const src = sourceLang.value;
  const tgt = targetLang.value;
  translateBtn.disabled = true;
  translateBtn.classList.add('loading');
  restoreBtn.disabled = true;
  hideStatus();
  pageStatus.textContent = 'Translating...';
  try {
    const resp = await sendToTab({ action: 'translate', mode: currentMode, sourceLang: src, targetLang: tgt });
    if (resp.status === 'done') {
      const statData = await chrome.storage.local.get(['totalTranslates']);
      const count = (statData.totalTranslates || 0) + 1;
      await chrome.storage.local.set({ totalTranslates: count });
      const el = $('totalTranslateCount');
      if (el) el.textContent = count;

      showStatus('Translation complete: ' + resp.count + ' text nodes', 'success');
      pageStatus.textContent = 'Translated (' + src + ' → ' + tgt + ')';
      translatedCount.textContent = resp.count;
      restoreBtn.disabled = false;
      translateBtn.textContent = 'Re-translate';
    } else {
      showStatus('Translation failed: ' + (resp.error || 'unknown error'), 'error');
      pageStatus.textContent = 'Error';
    }
  } catch (e) {
    showStatus('Cannot connect to page: ' + e.message, 'error');
    pageStatus.textContent = 'Connection failed';
    translateBtn.textContent = 'Translate Page';
  } finally {
    translateBtn.disabled = false;
    translateBtn.classList.remove('loading');
  }
}

async function onRestore() {
  restoreBtn.disabled = true;
  hideStatus();
  try {
    await sendToTab({ action: 'restore' });
    showStatus('Restored original text', 'success');
    pageStatus.textContent = 'Ready';
    translatedCount.textContent = '0';
    translateBtn.textContent = 'Translate Page';
  } catch (e) {
    showStatus('Restore failed: ' + e.message, 'error');
    restoreBtn.disabled = false;
  }
}

async function refreshStatus() {
  try {
    const resp = await sendToTab({ action: 'getStatus' });
    if (resp.isTranslated) {
      pageStatus.textContent = 'Translated';
      translatedCount.textContent = resp.count;
      restoreBtn.disabled = false;
      translateBtn.textContent = 'Re-translate';
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
