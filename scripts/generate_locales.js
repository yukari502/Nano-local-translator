const fs = require('fs');
const path = require('path');

const locales = {
  ar: { name: "مترجم Nano المحلي للذكاء الاصطناعي - PDF ويوتيوب", desc: "مترجم محلي مفتوح المصدر يدعم ثنائية اللغة وترجمة يوتيوب المزدوجة، مدعوم بالذكاء الاصطناعي المدمج في Chrome" },
  de: { name: "Nano Lokaler KI-Übersetzer - PDF & YouTube Subs", desc: "Open-Source lokaler KI-Übersetzer mit zweisprachiger Unterstützung und YouTube-Doppeluntertiteln, basierend auf Chromes integrierter KI" },
  en: { name: "Nano local AI translator - PDF & YouTube dual Subs", desc: "Open-source local AI translator with bilingual support, and YouTube Dual Subtitles, powered by Chrome's built-in AI" },
  es: { name: "Traductor de IA local Nano - PDF y YouTube", desc: "Traductor de IA local de código abierto con soporte bilingüe y subtítulos duales de YouTube, impulsado por la IA integrada de Chrome" },
  fr: { name: "Traducteur IA local Nano - PDF et YouTube", desc: "Traducteur IA local open-source avec support bilingue et double sous-titrage YouTube, propulsé par l'IA intégrée de Chrome" },
  ja: { name: "Nano ローカル AI 翻訳機 - PDF と YouTube", desc: "Chrome の組み込み AI を搭載した、バイリンガル対応および YouTube 2 か国語字幕付きのオープンソースのローカル AI 翻訳機" },
  ru: { name: "Локальный ИИ-переводчик Nano - PDF и YouTube", desc: "Локальный ИИ-переводчик с открытым исходным кодом с двуязычной поддержкой и двойными субтитрами YouTube, на базе встроенного ИИ Chrome" },
  zh_CN: { name: "Nano 本地 AI 翻译 - PDF & YouTube 双语字幕", desc: "开源的本地 AI 翻译器，支持双语及 YouTube 双语字幕，由 Chrome 内置 AI 驱动" },
  zh_TW: { name: "Nano 本地 AI 翻譯 - PDF & YouTube 雙語字幕", desc: "開源的本地 AI 翻譯器，支持雙語及 YouTube 雙語字幕，由 Chrome 內建 AI 驅動" }
};

const localesDir = path.join(__dirname, '..', '_locales');

if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir);
}

for (const [code, data] of Object.entries(locales)) {
  const dirPath = path.join(localesDir, code);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
  
  const content = {
    extensionName: {
      message: data.name
    },
    extensionDescription: {
      message: data.desc
    }
  };
  
  fs.writeFileSync(
    path.join(dirPath, 'messages.json'),
    JSON.stringify(content, null, 2),
    'utf-8'
  );
  
  console.log(`Generated locales for ${code}`);
}
console.log('Done!');
