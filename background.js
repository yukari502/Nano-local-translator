// Background Service Worker — 调用 Chrome Translator API 并缓存结果

const cache = new Map();
const CACHE_MAX = 5000;

function cacheKey(sourceLang, targetLang, text) {
  return sourceLang + '\n' + targetLang + '\n' + text;
}

// LRU: delete then re-set to move to end
function cacheGet(key) {
  if (!cache.has(key)) return undefined;
  const val = cache.get(key);
  cache.delete(key);
  cache.set(key, val);
  return val;
}

function cacheSet(key, val) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, val);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    handleTranslate(request).then(sendResponse);
    return true;
  }
  if (request.type === 'clearCache') {
    cache.clear();
    sendResponse({ ok: true });
    return true;
  }
  if (request.type === 'checkApi') {
    (async () => {
      const data = await chrome.storage.local.get(['translationEngine']);
      if (data.translationEngine === 'custom') {
        sendResponse({ available: true, engine: 'custom' });
        return;
      }
      const available = typeof Translator !== 'undefined' && !!Translator.create;
      sendResponse({ available, engine: 'chrome' });
    })();
    return true;
  }
  if (request.type === 'testCustomLLM') {
    handleTestCustomLLM(request).then(sendResponse);
    return true;
  }
  if (request.type === 'translateText') {
    handleTranslateText(request.text).then(sendResponse);
    return true;
  }
  if (request.type === 'speak') {
    handleSpeak(request, sender).then(sendResponse);
    return true;
  }
  if (request.type === 'stopSpeak') {
    chrome.tts.stop();
    chrome.runtime.sendMessage({ action: 'stop_audio' }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
  if (request.type === 'process_ocr') {
    handleOcrRequest(request).then(sendResponse);
    return true;
  }
  if (request.action === 'ocr_progress') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, request).catch(() => {});
      }
    });
    return false;
  }
  if (request.action === 'test_capture') {
    debugLog('Manual test_capture triggered from popup');
    (async () => {
      const data = await chrome.storage.local.get(['isEnabled', 'ocrTranslate']);
      if (data.isEnabled === false || data.ocrTranslate !== 'on') {
        debugLog('Aborted: feature disabled');
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
          chrome.tabs.sendMessage(tab.id, { action: 'start_crop', image: dataUrl });
          debugLog('Test capture successful');
        } catch (e) {
          debugLog('Test capture error: ' + e.message);
        }
      } else {
        debugLog('No active tab found for test capture.');
      }
    })();
  }
});

let creatingOffscreen;

async function setupOffscreenDocument() {
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
    const response = await chrome.runtime.sendMessage({
      action: 'do_ocr',
      imageData: request.imageData,
      lang: lang
    });
    
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
        });
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

async function handleTranslate({ texts, sourceLang, targetLang }) {
  const data = await chrome.storage.local.get([
    'useCache',
    'translationEngine',
    'customApiUrl',
    'customApiKey',
    'customModel',
    'customConcurrency',
    'customChunkSize',
    'customPrompt'
  ]);
  const useCache = data.useCache !== false; // true by default
  const engine = data.translationEngine || 'chrome';

  let actualSourceLang = sourceLang;
  if (sourceLang === 'auto' && texts.length > 0) {
    let detected = null;
    if (typeof LanguageDetector !== 'undefined' && LanguageDetector.create) {
      try {
        const detector = await LanguageDetector.create();
        const results = await detector.detect(texts[0]);
        if (results && results.length > 0) {
          detected = results[0].detectedLanguage.split('-')[0];
        }
      } catch (e) { console.warn("LanguageDetector failed", e); }
    } else if (typeof translation !== 'undefined' && translation.createDetector) {
      try {
        const detector = await translation.createDetector();
        const results = await detector.detect(texts[0]);
        if (results && results.length > 0) {
          detected = results[0].detectedLanguage.split('-')[0];
        }
      } catch (e) { console.warn("translation.createDetector failed", e); }
    }
    
    if (!detected) {
      detected = await new Promise(resolve => {
        if (chrome.i18n && chrome.i18n.detectLanguage) {
          chrome.i18n.detectLanguage(texts[0], (res) => {
            if (res && res.languages && res.languages.length > 0) resolve(res.languages[0].language.split('-')[0]);
            else resolve('en');
          });
        } else {
          resolve('en');
        }
      });
    }
    actualSourceLang = detected || 'en';
  }

  const results = {};
  const batch = [];

  // 分离缓存命中与未命中
  for (const text of texts) {
    if (useCache) {
      const key = cacheKey(actualSourceLang, targetLang, text);
      const cached = cacheGet(key);
      if (cached !== undefined) {
        results[text] = cached;
      } else {
        batch.push(text);
      }
    } else {
      batch.push(text);
    }
  }

  if (batch.length === 0) {
    return { translations: results };
  }

  // Engine 2: 自定义 OpenAI 兼容模型 (本地部署如 Ollama/LM Studio 或外部服务)
  if (engine === 'custom') {
    const customConfig = {
      apiUrl: data.customApiUrl || 'http://localhost:11434/v1',
      apiKey: data.customApiKey || '',
      model: data.customModel || 'qwen2.5:7b',
      concurrency: data.customConcurrency || 3,
      chunkSize: data.customChunkSize || 10,
      customPrompt: data.customPrompt || ''
    };

    const customTranslations = await translateWithOpenAICompatible({
      batch,
      sourceLang: actualSourceLang,
      targetLang,
      config: customConfig
    });

    for (const text of batch) {
      const translated = customTranslations[text] || text;
      if (useCache && translated !== text) {
        const key = cacheKey(actualSourceLang, targetLang, text);
        cacheSet(key, translated);
      }
      results[text] = translated;
    }

    return { translations: results };
  }

  // Engine 1: Chrome 内置 Translator API (Gemini Nano)
  if (typeof Translator === 'undefined' || !Translator.create) {
    for (const text of batch) results[text] = text;
    return { translations: results, error: 'Translator API not available' };
  }

  // 创建翻译器（首次会触发模型下载）
  const translator = await Translator.create({
    sourceLanguage: actualSourceLang,
    targetLanguage: targetLang
  });

  // 逐条翻译
  for (const text of batch) {
    try {
      const translated = await translator.translate(text);
      if (useCache) {
        const key = cacheKey(actualSourceLang, targetLang, text);
        cacheSet(key, translated);
      }
      results[text] = translated;
    } catch (e) {
      // 翻译失败时回退到原文
      results[text] = text;
    }
  }

  return { translations: results };
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
  const data = await chrome.storage.local.get(['isEnabled', 'sourceLang', 'targetLang']);
  if (data.isEnabled === false) return { translations: {} };
  const res = await handleTranslate({
    texts: [text],
    sourceLang: data.sourceLang || 'en',
    targetLang: data.targetLang || 'zh'
  });
  
  if (res.translations && res.translations[text] && res.translations[text] !== text) {
    try {
      const statData = await chrome.storage.local.get(['totalTranslates']);
      const count = (statData.totalTranslates || 0) + 1;
      await chrome.storage.local.set({ totalTranslates: count });
    } catch (e) {}
  }
  
  return { translations: { [text]: res.translations[text] } };
}

async function handleSpeak({ text, lang }) {
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
    chrome.runtime.sendMessage({ action: 'play_audio', url: url });
  }

  return { ok: true };
}
