// Content Script — DOM traversal, text replacement & restore

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT',
  'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
  'SVG', 'CANVAS', 'CODE', 'PRE'
]);

let isTranslated = false;
let translatedCount = 0;
let currentMode = 'translate-only';
let currentSource = 'en';
let currentTarget = 'zh';

// Stores original text for translate-only mode: TextNode → originalText
// Bilingual mode uses dataset.original on the DOM span instead
const originalMap = new Map();

// ── Inject CSS ────────────────────────────────────────

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
.ai-pair {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.3;
  vertical-align: baseline;
}
.ai-pair .ai-trans {
  font-size: inherit;
  color: inherit;
}
.ai-pair .ai-orig {
  font-size: 0.7em;
  opacity: 0.55;
  line-height: 1.2;
}

/* Tooltip Light Mode (Default) */
#ai-web-translator-tooltip {
  position: absolute;
  z-index: 2147483647;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  font-size: 14px;
  color: #1a1a1a;
  max-width: 350px;
  word-wrap: break-word;
  display: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
#ai-web-translator-tooltip .tooltip-header {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#ai-web-translator-tooltip .tooltip-header .star {
  font-size: 10px;
  opacity: 0.6;
}
#ai-web-translator-original-container {
  margin-bottom: 10px;
  opacity: 0.7;
  font-style: italic;
  border-bottom: 1px dashed #ccc;
  padding-bottom: 10px;
  max-height: 100px;
  overflow-y: auto;
}
#ai-web-translator-result-container {
  color: #1a1a1a;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}
#ai-web-translator-tooltip .speak-btn {
  float: left;
  margin-right: 8px;
  margin-top: 2px;
  cursor: pointer;
  opacity: 0.5;
  font-size: 14px;
  user-select: none;
  transition: opacity 0.2s;
}
#ai-web-translator-tooltip .speak-btn:hover {
  opacity: 1;
}

/* Tooltip Dark Mode */
@media (prefers-color-scheme: dark) {
  #ai-web-translator-tooltip {
    background: #252526;
    border-color: #454545;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    color: #e0e0e0;
  }
  #ai-web-translator-tooltip .tooltip-header {
    color: #888;
  }
  #ai-web-translator-original-container {
    border-bottom-color: #555;
  }
  #ai-web-translator-result {
    color: #fff;
  }
}
  }
}
  `;
  document.head.appendChild(style);
}
injectStyles();

// ── DOM walk ──────────────────────────────────────────

function* walkTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      const el = node.parentElement;
      if (!el || SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      // Skip hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  while ((n = walker.nextNode()) !== null) yield n;
}

function gatherTexts(root) {
  const nodes = [];
  for (const node of walkTextNodes(root)) {
    const text = node.textContent.trim();
    if (text.length < 2) continue;          // Skip very short text
    if (isTextTranslated(node)) continue;   // Already translated
    nodes.push({ node, text });
  }
  return nodes;
}

// ── Translation marks ─────────────────────────────────

const TRANS_MARK = '__ai_translated__';

function markTextNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Can't mark textContent directly, so mark the parent element
    node.parentElement?.setAttribute(TRANS_MARK, '');
  }
}

function isTextTranslated(node) {
  return node.parentElement?.hasAttribute(TRANS_MARK) ||
    node.parentElement?.closest('.ai-pair') !== null;
}

// ── Translate page ────────────────────────────────────

async function translatePage(mode, sourceLang, targetLang) {
  currentMode = mode;
  currentSource = sourceLang;
  currentTarget = targetLang;

  const entries = gatherTexts(document.body);
  if (entries.length === 0) return 0;

  const texts = entries.map(e => e.text);

  // Send to background in chunks of 20
  const CHUNK = 20;
  const allTranslations = {};

  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK);
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'translate',
        texts: chunk,
        sourceLang,
        targetLang
      });
      if (resp?.translations) {
        Object.assign(allTranslations, resp.translations);
      }
    } catch (e) {
      // Skip chunk if background is unavailable
    }
  }

  // Apply translations to DOM
  let applied = 0;
  for (const { node, text } of entries) {
    const translated = allTranslations[text];
    if (!translated || translated === text) continue;

    if (mode === 'translate-only') {
      if (!originalMap.has(node)) {
        originalMap.set(node, text);
      }
      node.textContent = translated;
      markTextNode(node);
    } else {
      applyBilingual(node, text, translated);
    }
    applied++;
  }

  translatedCount = applied;
  isTranslated = true;
  return applied;
}

// ── Bilingual mode ────────────────────────────────────

function applyBilingual(textNode, original, translated) {
  const parent = textNode.parentElement;
  if (!parent) return;

  const pair = document.createElement('span');
  pair.className = 'ai-pair';
  pair.dataset.original = original;

  const t = document.createElement('span');
  t.className = 'ai-trans';
  t.textContent = translated;

  const o = document.createElement('span');
  o.className = 'ai-orig';
  o.textContent = original;

  pair.appendChild(t);
  pair.appendChild(o);
  parent.replaceChild(pair, textNode);
}

// ── Restore original text ─────────────────────────────

function restorePage() {
  // 1. Restore text nodes modified in translate-only mode
  for (const [node, original] of originalMap.entries()) {
    if (node.parentNode) {
      node.textContent = original;
    }
  }
  originalMap.clear();

  // 2. Remove bilingual spans
  document.querySelectorAll('.ai-pair').forEach(span => {
    const orig = span.dataset.original || '';
    const textNode = document.createTextNode(orig);
    span.parentNode?.replaceChild(textNode, span);
  });

  // 3. Clean up marks
  document.querySelectorAll('[' + TRANS_MARK + ']').forEach(el => {
    el.removeAttribute(TRANS_MARK);
  });

  translatedCount = 0;
  isTranslated = false;
}

// ── Message listener ──────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    restorePage();
    translatePage(
      request.mode || 'translate-only',
      request.sourceLang || 'en',
      request.targetLang || 'zh'
    ).then(count => {
      sendResponse({ status: 'done', count });
    }).catch(err => {
      sendResponse({ status: 'error', error: err.message });
    });
    return true;
  }

  if (request.action === 'restore') {
    restorePage();
    sendResponse({ status: 'restored' });
    return true;
  }

  if (request.action === 'getStatus') {
    sendResponse({
      isTranslated,
      mode: currentMode,
      count: translatedCount
    });
    return true;
  }
});

// Notify popup that content script is ready
chrome.runtime.sendMessage({ type: 'content_ready' }).catch(() => { });

// ============================================
// Select-to-Translate & TTS Feature
// ============================================
let s2tTranslateEnabled = true;
let isExtEnabled = true;

chrome.storage.local.get(['s2tTranslate', 'isEnabled', 'selectToTranslate'], (res) => {
  if (res.s2tTranslate !== undefined) {
    s2tTranslateEnabled = (res.s2tTranslate === 'on');
  } else if (res.selectToTranslate !== undefined) {
    s2tTranslateEnabled = (res.selectToTranslate === 'on');
  }
  if (res.isEnabled !== undefined) isExtEnabled = res.isEnabled;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.s2tTranslate) {
    s2tTranslateEnabled = (changes.s2tTranslate.newValue === 'on');
  }
  if (changes.isEnabled) {
    isExtEnabled = changes.isEnabled.newValue;
  }
});

let tooltipDiv = null;
let tooltipOriginal = null;
let tooltipResult = null;

function createTooltip() {
  if (tooltipDiv) return tooltipDiv;
  tooltipDiv = document.createElement('div');
  tooltipDiv.id = 'ai-web-translator-tooltip';
  tooltipDiv.innerHTML = `
    <div class="tooltip-header">
      <span>Nano local translator</span>
      <span class="star">✧</span>
    </div>
    <div id="ai-web-translator-original-container" class="text-container">
      <span id="ai-web-translator-speak-orig" class="speak-btn" title="Speak Original">🔊</span>
      <span id="ai-web-translator-original"></span>
    </div>
    <div id="ai-web-translator-result-container" class="text-container">
      <span id="ai-web-translator-speak-res" class="speak-btn" title="Speak Translation" style="display:none;">🔊</span>
      <span id="ai-web-translator-result"></span>
    </div>
  `;
  document.body.appendChild(tooltipDiv);
  tooltipOriginal = tooltipDiv.querySelector('#ai-web-translator-original');
  tooltipResult = tooltipDiv.querySelector('#ai-web-translator-result');
  const speakOrigBtn = tooltipDiv.querySelector('#ai-web-translator-speak-orig');
  const speakResBtn = tooltipDiv.querySelector('#ai-web-translator-speak-res');

  speakOrigBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.storage.local.get(['sourceLang'], (res) => {
      const lang = res.sourceLang || 'en';
      const text = tooltipOriginal.textContent;
      chrome.runtime.sendMessage({ type: 'speak', text: text, lang: lang }).catch(() => {});
    });
  });

  speakResBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.storage.local.get(['targetLang'], (res) => {
      const lang = res.targetLang || 'zh';
      const text = tooltipResult.textContent;
      chrome.runtime.sendMessage({ type: 'speak', text: text, lang: lang }).catch(() => {});
    });
  });

  tooltipDiv.addEventListener('mouseup', (e) => e.stopPropagation());
  tooltipDiv.addEventListener('mousedown', (e) => e.stopPropagation());
  return tooltipDiv;
}

function isContextValid() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    try {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
    } catch (e) { }
    return false;
  }
  return true;
}

async function onMouseUp(e) {
  if (!isContextValid()) return;
  if (!isExtEnabled) return;
  if (!s2tTranslateEnabled) return;
  if (tooltipDiv && tooltipDiv.contains(e.target)) return;

  setTimeout(async () => {
    if (!isContextValid()) return;
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && text.length < 2000) {
      try {
        const p = chrome.runtime.sendMessage({ type: 'stopSpeak' });
        if (p && typeof p.catch === 'function') p.catch(() => { });
      } catch (err) { }

      if (s2tTranslateEnabled) {
        const tooltip = createTooltip();
        tooltipOriginal.textContent = text;

        tooltipResult.style.display = 'block';
        tooltipResult.textContent = 'Translating...';
        tooltipDiv.querySelector('#ai-web-translator-speak-res').style.display = 'none';
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 15}px`;

        try {
          const response = await new Promise((resolve, reject) => {
            if (!isContextValid()) {
              reject(new Error('Context invalidated'));
              return;
            }
            try {
              chrome.runtime.sendMessage({ type: 'translateText', text: text }, (res) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(res);
                }
              });
            } catch (err) {
              reject(err);
            }
          });

          if (response && response.translations && response.translations[text]) {
            tooltipResult.textContent = response.translations[text];
            tooltipDiv.querySelector('#ai-web-translator-speak-res').style.display = 'block';
          } else {
            tooltipResult.textContent = 'Translation failed. Built-in AI may not be ready.';
          }
        } catch (err) {
          tooltipResult.textContent = 'Error: Could not connect to extension background.';
        }
      }
    } else if (text.length === 0) {
      if (tooltipDiv) tooltipDiv.style.display = 'none';
      try {
        const p = chrome.runtime.sendMessage({ type: 'stopSpeak' });
        if (p && typeof p.catch === 'function') p.catch(() => { });
      } catch (err) { }
    }
  }, 10);
}

function onMouseDown(e) {
  if (!isContextValid()) return;
  if (tooltipDiv && !tooltipDiv.contains(e.target)) {
    tooltipDiv.style.display = 'none';
  }
  try {
    const p = chrome.runtime.sendMessage({ type: 'stopSpeak' });
    if (p && typeof p.catch === 'function') p.catch(() => { });
  } catch (err) { }
}

document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousedown', onMouseDown);

