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
  
  const options = {
    workerPath: workerPath,
    corePath: corePath,
    langPath: 'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata@4.0.0', // High quality models
    gzip: true,
    workerBlobURL: false,
    logger: m => {
      if (m.status === 'downloading language model' || m.status === 'downloading tesseract core') {
        chrome.runtime.sendMessage({ action: 'ocr_progress', progress: m });
      }
    }
  };
  
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
  
  if (request.action === "play_audio") {
    if (window.currentAudio) {
      window.currentAudio.pause();
    }
    window.currentAudio = new Audio(request.url);
    window.currentAudio.play().catch(e => console.error("Audio playback failed", e));
    sendResponse({ ok: true });
    return true;
  }
  
  if (request.action === "stop_audio") {
    if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio = null;
    }
    sendResponse({ ok: true });
    return true;
  }
});
