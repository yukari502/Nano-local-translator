// Background Service Worker — 调用 Chrome Translator API

// Clean up any legacy cache in storage
chrome.storage.local.remove(['persistentTranslationCache', 'useCache']).catch(() => {});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    handleTranslate(request)
      .then(res => sendResponse(res))
      .catch(err => {
        console.error('handleTranslate error:', err);
        sendResponse({ translations: {}, error: err.message || String(err) });
      });
    return true;
  }
  if (request.type === 'checkApi') {
    handleCheckApi()
      .then(res => sendResponse(res))
      .catch(err => {
        console.error('checkApi error:', err);
        sendResponse({ available: false, error: err.message || String(err) });
      });
    return true;
  }
  if (request.type === 'testCustomLLM') {
    handleTestCustomLLM(request)
      .then(res => sendResponse(res))
      .catch(err => {
        console.error('testCustomLLM error:', err);
        sendResponse({ ok: false, error: err.message || String(err) });
      });
    return true;
  }
  if (request.type === 'translateText') {
    handleTranslateText(request.text)
      .then(res => sendResponse(res))
      .catch(err => {
        console.error('translateText error:', err);
        sendResponse({ translations: {}, error: err.message || String(err) });
      });
    return true;
  }
  if (request.type === 'speak') {
    handleSpeak(request, sender)
      .then(res => sendResponse(res))
      .catch(err => {
        console.error('speak error:', err);
        sendResponse({ ok: false, error: err.message || String(err) });
      });
    return true;
  }
  if (request.type === 'stopSpeak') {
    try {
      chrome.tts.stop();
      chrome.runtime.sendMessage({ action: 'stop_audio' }).catch(() => {});
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }
  if (request.type === 'process_ocr') {
    handleOcrRequest(request)
      .then(res => sendResponse(res))
      .catch(err => {
        console.error('process_ocr error:', err);
        sendResponse({ success: false, error: err.message || String(err) });
      });
    return true;
  }
  if (request.action === 'ocr_progress') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, request).catch(() => {});
      }
    });
    return false;
  }
  if (request.action === 'test_capture') {
    debugLog('Manual test_capture triggered from popup');
    (async () => {
      try {
        const data = await chrome.storage.local.get(['isEnabled', 'ocrTranslate']);
        if (data.isEnabled === false || data.ocrTranslate !== 'on') {
          debugLog('Aborted: feature disabled');
          return;
        }
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
          chrome.tabs.sendMessage(tab.id, { action: 'start_crop', image: dataUrl }).catch(() => {});
          debugLog('Test capture successful');
        } else {
          debugLog('No active tab found for test capture.');
        }
      } catch (e) {
        debugLog('Test capture error: ' + e.message);
      }
    })();
    return false;
  }
});

let creatingOffscreen;
let offscreenIdleTimer = null;

function resetOffscreenIdleTimer() {
  if (offscreenIdleTimer) clearTimeout(offscreenIdleTimer);
  offscreenIdleTimer = setTimeout(async () => {
    try {
      if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
      }
    } catch (e) {}
  }, 60000); // 60s idle timeout
}

async function setupOffscreenDocument() {
  resetOffscreenIdleTimer();
  const path = 'offscreen.html';
  if (await chrome.offscreen.hasDocument()) return;
  
  if (creatingOffscreen) {
    await creatingOffscreen;
  } else {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.WORKERS, chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Run Tesseract OCR worker and play TTS audio'
    });
    await creatingOffscreen;
    creatingOffscreen = null;
  }
}

async function handleOcrRequest(request) {
  try {
    const data = await chrome.storage.local.get(['sourceLang', 'targetLang']);
    const lang = data.sourceLang || 'en';
    
    await setupOffscreenDocument();
    resetOffscreenIdleTimer();
    const response = await chrome.runtime.sendMessage({
      action: 'do_ocr',
      imageData: request.imageData,
      lang: lang
    });
    resetOffscreenIdleTimer();
    
    if (!response || !response.success) {
      throw new Error(response ? response.error : 'Unknown OCR error');
    }
    
    const text = response.text;
    if (!text) return { success: true, text: '', translation: '' };
    
    // Translate text
    const res = await handleTranslate({
      texts: [text],
      sourceLang: lang,
      targetLang: data.targetLang || 'zh'
    });
    
    return { success: true, text: text, translation: res.translations[text] };
  } catch (error) {
    console.error("OCR process error:", error);
    return { success: false, error: error.toString() };
  }
}

async function debugLog(msg) {
  try {
    const data = await chrome.storage.local.get(['debugLogs']);
    const logs = data.debugLogs || [];
    logs.push(new Date().toLocaleTimeString() + ': ' + msg);
    if (logs.length > 50) logs.shift();
    await chrome.storage.local.set({ debugLogs: logs });
  } catch (e) {}
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'translate-page') {
    const data = await chrome.storage.local.get(['isEnabled', 'sourceLang', 'targetLang', 'mode']);
    if (data.isEnabled === false) return;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
        const status = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        if (status && status.isTranslated) {
          chrome.tabs.sendMessage(tab.id, { action: 'restore' });
        } else {
          chrome.tabs.sendMessage(tab.id, {
            action: 'translate',
            mode: data.mode || 'translate-only',
            sourceLang: data.sourceLang || 'en',
            targetLang: data.targetLang || 'zh'
          });
        }
      } catch (e) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'translate',
          mode: data.mode || 'translate-only',
          sourceLang: data.sourceLang || 'en',
          targetLang: data.targetLang || 'zh'
        }).catch(() => {});
      }
    }
  } else if (command === 'capture-translate') {
    debugLog('Command capture-translate triggered');
    const data = await chrome.storage.local.get(['isEnabled', 'ocrTranslate']);
    debugLog('Settings: isEnabled=' + data.isEnabled + ', ocrTranslate=' + data.ocrTranslate);
    if (data.isEnabled === false || data.ocrTranslate !== 'on') {
      debugLog('Aborted: feature is disabled in settings.');
      return;
    }
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      debugLog('Active tab found: ' + tab.url);
      try {
        debugLog('Attempting captureVisibleTab...');
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        debugLog('Capture success, length: ' + (dataUrl ? dataUrl.length : 0));
        chrome.tabs.sendMessage(tab.id, {
          action: 'start_crop',
          image: dataUrl
        }).catch(() => {});
        debugLog('Sent start_crop to content script');
      } catch (e) {
        console.error("Failed to capture screen:", e);
        debugLog('Capture/Send Error: ' + e.message);
      }
    } else {
      debugLog('No active tab found.');
    }
  }
});

// ── Built-in Translation API Adapter ──────────────────
function getBuiltinTranslationApi() {
  const root = typeof globalThis !== 'undefined' ? globalThis : self;
  if (typeof root.Translator !== 'undefined' && root.Translator.create) {
    return {
      type: 'Translator',
      create: (opts) => root.Translator.create(opts),
      check: (opts) => root.Translator.availability ? root.Translator.availability(opts) : Promise.resolve('readily')
    };
  }
  if (typeof root.translation !== 'undefined' && root.translation.createTranslator) {
    return {
      type: 'translation',
      create: (opts) => root.translation.createTranslator(opts),
      check: (opts) => root.translation.canTranslate ? root.translation.canTranslate(opts) : Promise.resolve('readily')
    };
  }
  if (typeof root.ai !== 'undefined' && root.ai.translator && root.ai.translator.create) {
    return {
      type: 'ai.translator',
      create: (opts) => root.ai.translator.create(opts),
      check: (opts) => root.ai.translator.capabilities ? root.ai.translator.capabilities() : Promise.resolve({ available: 'readily' })
    };
  }
  return null;
}

function getBuiltinDetectorApi() {
  const root = typeof globalThis !== 'undefined' ? globalThis : self;
  if (typeof root.LanguageDetector !== 'undefined' && root.LanguageDetector.create) {
    return {
      type: 'LanguageDetector',
      create: (opts) => root.LanguageDetector.create(opts)
    };
  }
  if (typeof root.translation !== 'undefined' && root.translation.createDetector) {
    return {
      type: 'translation',
      create: (opts) => root.translation.createDetector(opts)
    };
  }
  if (typeof root.ai !== 'undefined' && root.ai.languageDetector && root.ai.languageDetector.create) {
    return {
      type: 'ai.languageDetector',
      create: (opts) => root.ai.languageDetector.create(opts)
    };
  }
  return null;
}

const translatorPool = new Map();

function clearTranslatorPool() {
  for (const [key, instance] of translatorPool.entries()) {
    try {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    } catch (e) {}
  }
  translatorPool.clear();
}

const creatingPromises = new Map();
let detectorInstance = null;
let builtinTranslationQueue = Promise.resolve();

function runBuiltinTranslationTask(taskFn) {
  const next = builtinTranslationQueue.then(taskFn, taskFn);
  builtinTranslationQueue = next.catch(() => {});
  return next;
}

async function getOrCreateDetector() {
  if (detectorInstance) return detectorInstance;
  const detectorApi = getBuiltinDetectorApi();
  if (!detectorApi) return null;
  try {
    detectorInstance = await detectorApi.create();
    return detectorInstance;
  } catch (e) {
    return null;
  }
}

function normalizeLangTag(lang) {
  if (!lang || typeof lang !== 'string') return 'en';
  const l = lang.trim().toLowerCase();
  if (!l || l === 'auto' || l === 'und' || l === 'unknown') return 'en';
  if (l === 'zh' || l === 'zh-cn' || l === 'zh-hans') return 'zh';
  if (l === 'zh-tw' || l === 'zh-hk' || l === 'zh-hant') return 'zh-Hant';
  if (l === 'iw') return 'he';
  if (l === 'in') return 'id';
  if (l === 'jw') return 'jv';
  const main = l.split('-')[0];
  return main || 'en';
}

async function getOrCreateBuiltinTranslator(sourceLang, targetLang) {
  const normSource = normalizeLangTag(sourceLang);
  const normTarget = normalizeLangTag(targetLang);
  const poolKey = `${normSource}->${normTarget}`;

  if (translatorPool.has(poolKey)) {
    return translatorPool.get(poolKey);
  }

  if (creatingPromises.has(poolKey)) {
    return await creatingPromises.get(poolKey);
  }

  const p = (async () => {
    const api = getBuiltinTranslationApi();
    if (!api) {
      throw new Error('Chrome Built-in Translator API not available in this browser');
    }

    const monitorOpt = {
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      monitor(m) {
        if (!m || typeof m.addEventListener !== 'function') return;
        m.addEventListener('downloadprogress', (e) => {
          const total = e.total || 0;
          const loaded = e.loaded || 0;
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          chrome.runtime.sendMessage({
            type: 'model_download_progress',
            loaded,
            total,
            percent,
            sourceLang: normSource,
            targetLang: normTarget
          }).catch(() => {});
        });
      }
    };

    let instance = null;
    try {
      instance = await api.create(monitorOpt);
    } catch (err) {
      const altSource = normSource === 'zh' ? 'zh-Hans' : normSource;
      const altTarget = normTarget === 'zh' ? 'zh-Hans' : normTarget;
      if (altSource !== normSource || altTarget !== normTarget) {
        instance = await api.create({
          ...monitorOpt,
          sourceLanguage: altSource,
          targetLanguage: altTarget
        });
      } else {
        throw err;
      }
    }

    if (instance) {
      translatorPool.set(poolKey, instance);
    }
    return instance;
  })();

  creatingPromises.set(poolKey, p);
  try {
    return await p;
  } finally {
    creatingPromises.delete(poolKey);
  }
}

async function handleCheckApi() {
  const data = await chrome.storage.local.get(['translationEngine']);
  if (data.translationEngine === 'custom') {
    return { available: true, engine: 'custom' };
  }
  const api = getBuiltinTranslationApi();
  return { available: !!api, engine: 'chrome' };
}

async function handleTranslate(request) {
  const texts = Array.isArray(request?.texts) ? request.texts : [];
  const sourceLang = request?.sourceLang || 'auto';
  const targetLang = request?.targetLang || 'zh';

  const results = {};
  if (texts.length === 0) {
    return { translations: results };
  }

  const data = await chrome.storage.local.get([
    'translationEngine',
    'customApiUrl',
    'customApiKey',
    'customModel',
    'customConcurrency',
    'customChunkSize',
    'customPrompt'
  ]);
  const engine = data.translationEngine || 'chrome';

  let actualSourceLang = sourceLang;
  if (sourceLang === 'auto' && texts.length > 0) {
    const sampleCandidates = texts.filter(t => /[a-zA-Z\u00C0-\u024F\u4e00-\u9fa5\u3040-\u30ff]{3,}/.test(t));
    const sampleText = (sampleCandidates[0] || texts[0] || '').slice(0, 300);

    let detected = null;
    if (sampleText.trim().length >= 2) {
      const detector = await getOrCreateDetector();
      if (detector) {
        try {
          const detectResults = await detector.detect(sampleText);
          if (detectResults && detectResults.length > 0) {
            const langCode = detectResults[0].detectedLanguage.split('-')[0].toLowerCase();
            if (langCode && langCode !== 'und' && langCode !== 'unknown') {
              detected = langCode;
            }
          }
        } catch (e) {
          console.warn('Detector failed:', e);
        }
      }

      if (!detected) {
        detected = await new Promise(resolve => {
          if (chrome.i18n && chrome.i18n.detectLanguage) {
            try {
              chrome.i18n.detectLanguage(sampleText, (res) => {
                if (chrome.runtime?.lastError) {
                  resolve('en');
                  return;
                }
                if (res && res.languages && res.languages.length > 0) {
                  const lang = res.languages[0].language.split('-')[0].toLowerCase();
                  if (lang && lang !== 'und') {
                    resolve(lang);
                    return;
                  }
                }
                resolve('en');
              });
            } catch (e) {
              resolve('en');
            }
          } else {
            resolve('en');
          }
        });
      }
    }
    actualSourceLang = detected || 'en';
    if (!actualSourceLang || actualSourceLang === 'und' || actualSourceLang === 'auto') {
      actualSourceLang = 'en';
    }
  }

  // If actual source language equals target language, verify if texts contain other language characters
  if (normalizeLangTag(actualSourceLang) === normalizeLangTag(targetLang)) {
    const hasOtherLangChars = texts.some(t => /[a-zA-Z]{3,}/.test(t));
    if (!hasOtherLangChars) {
      for (const text of texts) {
        results[text] = text;
      }
      return { translations: results };
    }
    // Correct erroneous same-language detection
    actualSourceLang = targetLang === 'en' ? 'zh' : 'en';
  }

  const batch = texts;

  if (batch.length === 0) {
    return { translations: results };
  }

  // Engine 2: Custom OpenAI Compatible
  if (engine === 'custom') {
    const customConfig = {
      apiUrl: data.customApiUrl || 'http://localhost:11434/v1',
      apiKey: data.customApiKey || '',
      model: data.customModel || 'qwen2.5:7b',
      concurrency: data.customConcurrency || 3,
      chunkSize: data.customChunkSize || 10,
      customPrompt: data.customPrompt || ''
    };

    try {
      const customTranslations = await translateWithOpenAICompatible({
        batch,
        sourceLang: actualSourceLang,
        targetLang,
        config: customConfig
      });

      for (const text of batch) {
        const translated = customTranslations[text] || text;
        results[text] = translated;
      }
    } catch (err) {
      console.error('Custom LLM translation failed:', err);
      for (const text of batch) results[text] = text;
      return { translations: results, error: err.message || String(err) };
    }

    return { translations: results };
  }

  // Engine 1: Chrome Built-in AI (Gemini Nano) serialized via queue
  const builtinApi = getBuiltinTranslationApi();
  if (!builtinApi) {
    for (const text of batch) results[text] = text;
    return { translations: results, error: 'Translator API not available in this browser context' };
  }

  return await runBuiltinTranslationTask(async () => {
    let translator = null;
    let intermediateTranslator = null;
    const normSource = normalizeLangTag(actualSourceLang);
    const normTarget = normalizeLangTag(targetLang);
    const poolKey = `${normSource}->${normTarget}`;

    try {
      translator = await getOrCreateBuiltinTranslator(normSource, normTarget);
    } catch (err) {
      // Direct cross-language pair not supported on-device (e.g. ja -> zh, de -> zh)
      if (normSource !== 'en' && normTarget !== 'en') {
        // Attempt two-stage pivot translation: (source -> en) and then (en -> target)
        try {
          intermediateTranslator = await getOrCreateBuiltinTranslator(normSource, 'en');
          translator = await getOrCreateBuiltinTranslator('en', normTarget);
        } catch (pivotErr) {
          // If source -> en is also not available, fallback directly to en -> target
          try {
            translator = await getOrCreateBuiltinTranslator('en', normTarget);
          } catch (e2) {
            translatorPool.delete(poolKey);
            for (const text of batch) results[text] = text;
            return { translations: results, error: e2.message || String(e2) };
          }
        }
      } else {
        console.warn('Built-in translator unavailable for', poolKey, err?.message || err);
        translatorPool.delete(poolKey);
        for (const text of batch) results[text] = text;
        return { translations: results, error: err.message || String(err) };
      }
    }

    for (const text of batch) {
      try {
        let textToTranslate = text;
        if (intermediateTranslator) {
          const mid = await intermediateTranslator.translate(text);
          if (mid && mid.trim()) {
            textToTranslate = mid;
          }
        }
        const translated = await translator.translate(textToTranslate);
        results[text] = translated || text;
      } catch (e) {
        console.warn('Single text translation error:', e);
        results[text] = text;
        if (e.name === 'InvalidStateError' || e.message?.includes('destroyed')) {
          translatorPool.delete(poolKey);
        }
      }
    }

    return { translations: results };
  });
}

// ── OpenAI-Compatible Custom Translation ──────────────
async function translateWithOpenAICompatible({ batch, sourceLang, targetLang, config }) {
  const {
    apiUrl = 'http://localhost:11434/v1',
    apiKey = '',
    model = 'qwen2.5:7b',
    concurrency = 3,
    chunkSize = 10,
    customPrompt = ''
  } = config;

  const cleanBase = apiUrl.trim().replace(/\/+$/, '');
  const endpoint = cleanBase.endsWith('/chat/completions') ? cleanBase : `${cleanBase}/chat/completions`;

  const parsedConcurrency = Math.max(1, Math.min(10, parseInt(concurrency, 10) || 3));
  const parsedChunkSize = Math.max(1, Math.min(30, parseInt(chunkSize, 10) || 10));

  const chunks = [];
  for (let i = 0; i < batch.length; i += parsedChunkSize) {
    chunks.push(batch.slice(i, i + parsedChunkSize));
  }

  const results = {};

  const defaultPrompt = `You are an expert translator. Translate each string in the input JSON array from "${sourceLang}" to "${targetLang}". Return ONLY a valid JSON array of translated strings in the exact same order and length. Do NOT include markdown code blocks, explanations, greetings, or notes. Example output: ["translation 1", "translation 2"]`;
  const sysPrompt = customPrompt && customPrompt.trim() ? customPrompt.trim() : defaultPrompt;

  async function translateSingleChunk(chunk) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const payload = {
      model: model.trim() || 'qwen2.5:7b',
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: JSON.stringify(chunk) }
      ],
      temperature: 0.1
    };

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 120)}`);
      }

      const resData = await resp.json();
      const content = resData.choices?.[0]?.message?.content?.trim() || '';

      let cleaned = content;
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      let parsed = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        const arrMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          try { parsed = JSON.parse(arrMatch[0]); } catch (e2) {}
        }
      }

      if (Array.isArray(parsed) && parsed.length === chunk.length) {
        chunk.forEach((orig, idx) => {
          results[orig] = String(parsed[idx]);
        });
      } else {
        if (chunk.length === 1 && content) {
          results[chunk[0]] = content.replace(/^["']|["']$/g, '').trim();
        } else {
          const lines = cleaned.split('\n')
            .map(l => l.replace(/^[-*•\d+.\)]\s*/, '').replace(/^["']|["']$/g, '').trim())
            .filter(Boolean);
          if (lines.length === chunk.length) {
            chunk.forEach((orig, idx) => { results[orig] = lines[idx]; });
          } else {
            console.warn('Custom LLM chunk format parse fallback to original:', content);
            chunk.forEach(orig => { results[orig] = orig; });
          }
        }
      }
    } catch (err) {
      console.error('Custom LLM translation failed for chunk:', err);
      chunk.forEach(orig => { results[orig] = orig; });
    }
  }

  const pool = new Set();
  for (const chunk of chunks) {
    const task = translateSingleChunk(chunk);
    pool.add(task);
    task.finally(() => pool.delete(task));
    if (pool.size >= parsedConcurrency) {
      await Promise.race(pool);
    }
  }
  await Promise.all(pool);

  return results;
}

// ── Test Custom LLM Connection ────────────────────────
async function handleTestCustomLLM(request) {
  const { apiUrl, apiKey, model } = request;
  const cleanBase = (apiUrl || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
  const endpoint = cleanBase.endsWith('/chat/completions') ? cleanBase : `${cleanBase}/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const payload = {
    model: (model || 'qwen2.5:7b').trim(),
    messages: [
      { role: 'system', content: 'You are a translator. Translate the text to English. Output only the translation.' },
      { role: 'user', content: '你好，世界！' }
    ],
    temperature: 0.1
  };

  const startTime = Date.now();
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const latency = Date.now() - startTime;
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return { ok: false, error: `HTTP ${resp.status}: ${errText.slice(0, 150)}` };
    }
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    return { ok: true, translation: reply, latency };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleTranslateText(text) {
  if (!text || typeof text !== 'string') return { translations: {} };
  try {
    const data = await chrome.storage.local.get(['isEnabled', 'sourceLang', 'targetLang']);
    if (data.isEnabled === false) return { translations: {} };
    const res = await handleTranslate({
      texts: [text],
      sourceLang: data.sourceLang || 'en',
      targetLang: data.targetLang || 'zh'
    });
    
    const translatedText = res?.translations?.[text] || text;
    if (translatedText && translatedText !== text) {
      try {
        const statData = await chrome.storage.local.get(['totalTranslates']);
        const count = (statData.totalTranslates || 0) + 1;
        await chrome.storage.local.set({ totalTranslates: count });
      } catch (e) {}
    }
    
    return { translations: { [text]: translatedText } };
  } catch (err) {
    console.error('handleTranslateText error:', err);
    return { translations: { [text]: text }, error: err.message || String(err) };
  }
}

async function handleSpeak({ text, lang }) {
  try {
    chrome.tts.stop();
    
    const data = await chrome.storage.local.get(['ttsVoice', 'ttsRate', 'ttsPitch', 'ttsVolume']);
    const options = {
      rate: data.ttsRate !== undefined ? data.ttsRate : 1.0,
      pitch: data.ttsPitch !== undefined ? data.ttsPitch : 1.0,
      volume: data.ttsVolume !== undefined ? data.ttsVolume : 1.0
    };
    
    if (data.ttsVoice) {
      options.voiceName = data.ttsVoice;
      chrome.tts.speak(text, options);
    } else {
      // Default to Google Translate TTS API via offscreen document
      await setupOffscreenDocument();
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
      chrome.runtime.sendMessage({ action: 'play_audio', url: url }).catch(() => {});
    }

    return { ok: true };
  } catch (err) {
    console.error('handleSpeak error:', err);
    return { ok: false, error: err.message || String(err) };
  }
}
