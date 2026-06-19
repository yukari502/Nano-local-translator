let workerPath = chrome.runtime.getURL("lib/tesseract/worker.min.js");
let corePath = chrome.runtime.getURL("lib/tesseract/tesseract-core.wasm.js");
let langPath = chrome.runtime.getURL("lib/tesseract/");

let tesseractWorker = null;

async function initTesseract() {
  if (tesseractWorker) return tesseractWorker;
  
  tesseractWorker = await Tesseract.createWorker("eng", 1, {
    workerPath: workerPath,
    corePath: corePath,
    langPath: langPath,
    gzip: true
  });
  
  // We can also load Japanese if needed by doing createWorker("eng+jpn") but it requires jpn.traineddata.gz
  // Currently we use eng by default.
  
  return tesseractWorker;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "do_ocr") {
    (async () => {
      try {
        const worker = await initTesseract();
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
