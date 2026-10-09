const fs = require('fs');
const path = require('path');

const locales = {
  ar: {
    name: "مترجم Nano المحلي للذكاء الاصطناعي - قارئ ويب ثنائي اللغة",
    desc: "مترجم محلي مفتوح المصدر يدعم القراءة الثنائية للويب وترجمة النصوص المحددة وOCR للصور، مدعوم بالذكاء الاصطناعي المدمج في Chrome"
  },
  de: {
    name: "Nano Lokaler KI-Übersetzer - Zweisprachiger Web-Reader",
    desc: "Open-Source lokaler KI-Übersetzer für zweisprachiges Web-Lesen, Textauswahl und OCR, basierend auf Chromes integrierter KI"
  },
  en: {
    name: "Nano Local AI Translator - Bilingual Web Reader",
    desc: "Open-source local AI translator for bilingual web reading, select translation, and OCR, powered by Chrome's built-in AI"
  },
  es: {
    name: "Traductor IA local Nano - Lector web bilingüe",
    desc: "Traductor de IA local para lectura web bilingüe, traducción de selección y OCR, impulsado por la IA integrada de Chrome"
  },
  fr: {
    name: "Traducteur IA local Nano - Lecteur web bilingue",
    desc: "Traducteur IA local open-source pour lecture web bilingue, sélection et OCR, propulsé par l'IA intégrée de Chrome"
  },
  ja: {
    name: "Nano ローカル AI 翻訳 - Web 2か国語対訳リーダー",
    desc: "Chrome 組み込み AI を搭載したオープンソースのローカル AI 翻訳。Web ページの対訳表示、選択テキスト翻訳、OCR 翻訳に対応"
  },
  ru: {
    name: "Локальный ИИ-переводчик Nano - Двуязычный веб-ридер",
    desc: "Локальный ИИ-переводчик для двуязычного чтения веб-страниц, перевода выделения и OCR на базе встроенного ИИ Chrome"
  },
  zh_CN: {
    name: "Nano 本地 AI 翻译 - 网页双语对照阅读",
    desc: "完全本地化、隐私安全的开源 AI 翻译器，支持全网页双语对照阅读、划词翻译与截图 OCR，由 Chrome 内置 AI 驱动"
  },
  zh_TW: {
    name: "Nano 本地 AI 翻譯 - 網頁雙語對照閱讀",
    desc: "完全本地化、隱私安全的開源 AI 翻譯器，支援全網頁雙語對照閱讀、劃詞翻譯與截圖 OCR，由 Chrome 內建 AI 驅動"
  }
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
