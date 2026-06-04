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
    const available = typeof Translator !== 'undefined' && !!Translator.create;
    sendResponse({ available });
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
    sendResponse({ ok: true });
    return true;
  }
});

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
  }
});

async function handleTranslate({ texts, sourceLang, targetLang }) {
  const data = await chrome.storage.local.get(['useCache']);
  const useCache = data.useCache !== false; // true by default

  const results = {};
  const batch = [];

  // 分离缓存命中与未命中
  for (const text of texts) {
    if (useCache) {
      const key = cacheKey(sourceLang, targetLang, text);
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

  // 检查 Translator API
  if (typeof Translator === 'undefined' || !Translator.create) {
    for (const text of batch) results[text] = text;
    return { translations: results, error: 'Translator API not available' };
  }

  // 创建翻译器（首次会触发模型下载）
  const translator = await Translator.create({
    sourceLanguage: sourceLang,
    targetLanguage: targetLang
  });

  // 逐条翻译
  for (const text of batch) {
    try {
      const translated = await translator.translate(text);
      if (useCache) {
        const key = cacheKey(sourceLang, targetLang, text);
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
  } else {
    const voices = await new Promise(resolve => chrome.tts.getVoices(resolve));
    const targetPrefix = lang.split('-')[0].toLowerCase();
    const googleVoice = voices.find(v => {
      return (v.voiceName || '').toLowerCase().includes('google') && 
             (v.lang || '').toLowerCase().startsWith(targetPrefix);
    });
    if (googleVoice) {
      options.voiceName = googleVoice.voiceName;
    } else {
      options.lang = lang;
    }
  }

  chrome.tts.speak(text, options);
  return { ok: true };
}
