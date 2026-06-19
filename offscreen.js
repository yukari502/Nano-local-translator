let workerPath = chrome.runtime.getURL("lib/tesseract/worker.min.js");
let corePath = chrome.runtime.getURL("lib/tesseract/tesseract-core.wasm.js");
let langPath = chrome.runtime.getURL("lib/tesseract/");

let tesseractWorker = null;

let currentWorkerLang = null;

async function initTesseract(sourceLang) {
  // Map standard language codes to tesseract codes
  const langMap = {
    'ja': 'jpn',
    'zh': 'chi_sim',
    'ko': 'kor',
    'fr': 'fra',
    'de': 'deu',
    'es': 'spa',
    'ru': 'rus',
    'en': 'eng'
  };
  const tessLang = langMap[sourceLang] || 'eng';

  // If we already have a worker for this language, reuse it
  if (tesseractWorker && currentWorkerLang === tessLang) {
    return tesseractWorker;
  }
  
  // Terminate old worker if language changed
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
  
  // Only eng and jpn are bundled locally
  const isLocal = (tessLang === 'eng' || tessLang === 'jpn');
  const options = {
    workerPath: workerPath,
    corePath: corePath,
    gzip: true,
    workerBlobURL: false
  };
  
  if (isLocal) {
    options.langPath = langPath;
  }
  
  tesseractWorker = await Tesseract.createWorker(tessLang, 1, options);
  currentWorkerLang = tessLang;
  
  return tesseractWorker;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "do_ocr") {
    (async () => {
      try {
        const worker = await initTesseract(request.lang);
        const { data: { text } } = await worker.recognize(request.imageData);
        sendResponse({ success: true, text: text.trim() });
      } catch (err) {
        console.error("OCR Error:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
