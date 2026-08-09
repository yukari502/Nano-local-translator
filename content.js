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
  #ai-web-translator-result-container {
    color: #fff;
  }
  .ai-ocr-popup {
    --ai-ocr-bg: #252526 !important;
    --ai-ocr-border: #454545 !important;
    --ai-ocr-color: #e0e0e0 !important;
    --ai-ocr-header-bg: #1e1e1e !important;
    --ai-ocr-divider: #555 !important;
    --ai-ocr-orig-color: #aaa !important;
    --ai-ocr-trans-color: #64b5f6 !important;
    --ai-ocr-footer-bg: #2a2a2b !important;
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

let pageTranslationObserver = null;
let pageTranslationMutationObserver = null;
let pendingPageTranslations = new Set();
let pageTranslateTimeout = null;
let elementsToObserve = new Map();

function schedulePageTranslationBatch() {
  if (pageTranslateTimeout) return;
  pageTranslateTimeout = setTimeout(() => {
    pageTranslateTimeout = null;
    processPageTranslationBatch();
  }, 300);
}

async function processPageTranslationBatch() {
  if (pendingPageTranslations.size === 0) return;
  
  const elements = Array.from(pendingPageTranslations);
  pendingPageTranslations.clear();
  
  const entriesToTranslate = [];
  for (const el of elements) {
    if (elementsToObserve.has(el)) {
      entriesToTranslate.push(...elementsToObserve.get(el));
      elementsToObserve.delete(el);
    }
  }

  const validEntries = entriesToTranslate.filter(e => e.node.parentNode && !isTextTranslated(e.node));
  if (validEntries.length === 0) return;

  const texts = validEntries.map(e => e.text);
  
  const CHUNK = 20;
  const allTranslations = {};

  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK);
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'translate',
        texts: chunk,
        sourceLang: currentSource,
        targetLang: currentTarget
      });
      if (resp?.translations) {
        Object.assign(allTranslations, resp.translations);
      }
    } catch (e) {
      // Skip chunk if background is unavailable
    }
  }

  let applied = 0;
  for (const { node, text } of validEntries) {
    const translated = allTranslations[text];
    if (!translated || translated === text) continue;

    if (currentMode === 'translate-only') {
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

  translatedCount += applied;
  // Let popup know if it asks for status, translatedCount is updated
}

function observeNewNodes(root) {
  const textEntries = gatherTexts(root);
  const newElements = new Map();
  for (const entry of textEntries) {
    const parent = entry.node.parentElement;
    if (!parent) continue;
    if (!elementsToObserve.has(parent) && !newElements.has(parent)) {
      newElements.set(parent, []);
    }
    const map = newElements.has(parent) ? newElements : elementsToObserve;
    map.get(parent).push(entry);
  }

  for (const [el, entries] of newElements.entries()) {
    elementsToObserve.set(el, entries);
    if (pageTranslationObserver) {
      pageTranslationObserver.observe(el);
    }
  }
}

async function translatePage(mode, sourceLang, targetLang) {
  currentMode = mode;
  currentSource = sourceLang;
  currentTarget = targetLang;
  isTranslated = true;

  if (pageTranslationObserver) pageTranslationObserver.disconnect();
  if (pageTranslationMutationObserver) pageTranslationMutationObserver.disconnect();
  pendingPageTranslations.clear();
  elementsToObserve.clear();

  pageTranslationObserver = new IntersectionObserver((entries) => {
    let triggered = false;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        pageTranslationObserver.unobserve(el);
        pendingPageTranslations.add(el);
        triggered = true;
      }
    });
    if (triggered) {
      schedulePageTranslationBatch();
    }
  }, { rootMargin: '100% 0px 100% 0px' });

  // Initial gather
  observeNewNodes(document.body);

  // Setup MutationObserver to catch dynamically loaded content
  pageTranslationMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            observeNewNodes(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            if (node.parentElement) {
               observeNewNodes(node.parentElement);
            }
          }
        });
      }
    });
  });
  
  pageTranslationMutationObserver.observe(document.body, { childList: true, subtree: true });

  return 0; // Return immediately. Popup increments its global total by 1 for this activation.
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
  if (pageTranslationObserver) {
    pageTranslationObserver.disconnect();
    pageTranslationObserver = null;
  }
  if (pageTranslationMutationObserver) {
    pageTranslationMutationObserver.disconnect();
    pageTranslationMutationObserver = null;
  }
  if (pageTranslateTimeout) {
    clearTimeout(pageTranslateTimeout);
    pageTranslateTimeout = null;
  }
  pendingPageTranslations.clear();
  elementsToObserve.clear();

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

// ============================================
// Hover Translation Feature
// ============================================
let hoverTranslateEnabled = false;

function initHoverTranslation() {
  let hoverTimer = null;
  let lastHoveredElement = null;
  let lastHoveredWord = '';

  chrome.storage.local.get(['hoverTranslate'], (res) => {
    if (res.hoverTranslate !== undefined) {
      hoverTranslateEnabled = (res.hoverTranslate === 'on');
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.hoverTranslate) {
      hoverTranslateEnabled = (changes.hoverTranslate.newValue === 'on');
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isExtEnabled || !hoverTranslateEnabled) return;
    // Don't trigger if we're hovering inside our own tooltip
    if (tooltipDiv && tooltipDiv.contains(e.target)) return;

    clearTimeout(hoverTimer);

    // If text is selected, hover translation is suppressed
    if (window.getSelection().toString().trim().length > 0) return;

    hoverTimer = setTimeout(() => {
      handleHover(e.clientX, e.clientY);
    }, 300); // 300ms hover delay
  });

  async function handleHover(x, y) {
    if (!isContextValid() || !isExtEnabled || !hoverTranslateEnabled) return;
    
    let range;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    if (!range) return;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    
    // Extract word
    const text = node.textContent;
    const offset = range.startOffset;
    
    // Find word boundaries
    let start = offset;
    let end = offset;
    
    const isWordChar = (char) => /[\w\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf\uf900-\ufaff\uff66-\uff9f]/.test(char);

    if (!text[offset] || !isWordChar(text[offset])) return;

    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;

    const word = text.slice(start, end).trim();
    if (!word || word === lastHoveredWord) return;
    
    lastHoveredWord = word;
    lastHoveredElement = node;

    // Show tooltip
    if (tooltipDiv) tooltipDiv.style.display = 'none';

    try {
      const tooltip = createTooltip();
      tooltipOriginal.textContent = word;
      tooltipResult.style.display = 'block';
      tooltipResult.textContent = 'Translating...';
      tooltipDiv.querySelector('#ai-web-translator-speak-res').style.display = 'none';
      tooltip.style.display = 'block';
      
      tooltip.style.left = `${x + window.scrollX + 15}px`;
      tooltip.style.top = `${y + window.scrollY + 20}px`;

      const res = await new Promise((resolve) => {
        chrome.storage.local.get(['sourceLang', 'targetLang'], resolve);
      });
      const sourceLang = res.sourceLang || 'en';
      const targetLang = res.targetLang || 'zh';

      const resp = await chrome.runtime.sendMessage({
        type: 'translateText',
        text: word
      });

      if (resp && resp.translations && resp.translations[word]) {
        tooltipResult.textContent = resp.translations[word];
        tooltipDiv.querySelector('#ai-web-translator-speak-res').style.display = 'block';
      } else {
        tooltipResult.textContent = 'Translation failed.';
      }
    } catch (e) {
      if (tooltipResult) tooltipResult.textContent = 'Error connecting.';
    }
  }

  document.addEventListener('scroll', () => {
    clearTimeout(hoverTimer);
    lastHoveredWord = '';
  }, true);
}

initHoverTranslation();

// ============================================
// YouTube Dual Subtitles Feature
// ============================================
let youtubeDualSubsEnabled = false;
let ytSubConfig = {
  colorMode: 'custom',
  color: '#ffeb3b',
  opacity: '1',
  position: 'below'
};

function initYoutubeObserver() {
  if (!window.location.hostname.includes('youtube.com')) return;
  
  let observer = null;
  const translatedCache = new Map();

  function startObserving() {
    if (observer) return;
    const captionContainer = document.querySelector('.ytp-caption-window-container') || document.body;

    observer = new MutationObserver((mutations) => {
      if (!youtubeDualSubsEnabled || !isExtEnabled) return;
      
      const segmentsToProcess = new Set();
      mutations.forEach(mutation => {
        let target = mutation.target;
        if (target.classList && target.classList.contains('ytp-caption-segment')) {
          segmentsToProcess.add(target);
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList.contains('ytp-caption-segment')) {
                segmentsToProcess.add(node);
              }
              const segments = node.querySelectorAll('.ytp-caption-segment');
              segments.forEach(s => segmentsToProcess.add(s));
            }
          });
        }
      });

      segmentsToProcess.forEach(handleNewSubtitle);
    });

    observer.observe(captionContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function extractOriginalText(node) {
    let text = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('ai-yt-sub') && !child.classList.contains('ai-yt-sub-br')) {
        text += extractOriginalText(child);
      }
    }
    return text.trim();
  }

  let translateTimeout = null;
  let pendingTranslations = new Map();

  async function handleNewSubtitle(segment) {
    const text = extractOriginalText(segment);
    if (!text) return;
    
    const currentTranslated = segment.getAttribute('data-translated-text');
    if (currentTranslated === text) return;
    
    segment.setAttribute('data-translated-text', text);

    if (translatedCache.has(text)) {
      applySubtitleTranslation(segment, text, translatedCache.get(text));
      return;
    }

    pendingTranslations.set(segment, text);
    if (!translateTimeout) {
      translateTimeout = setTimeout(processPendingTranslations, 200);
    }
  }

  async function processPendingTranslations() {
    translateTimeout = null;
    if (pendingTranslations.size === 0) return;

    const segments = Array.from(pendingTranslations.keys());
    const texts = Array.from(new Set(pendingTranslations.values()));
    pendingTranslations.clear();

    try {
      const res = await new Promise((resolve) => {
        chrome.storage.local.get(['sourceLang', 'targetLang'], resolve);
      });
      const sourceLang = res.sourceLang || 'en';
      const targetLang = res.targetLang || 'zh';

      const resp = await chrome.runtime.sendMessage({
        type: 'translate',
        texts: texts,
        sourceLang: sourceLang,
        targetLang: targetLang
      });

      if (resp && resp.translations) {
        for (const [text, translatedText] of Object.entries(resp.translations)) {
          if (translatedText && translatedText !== text) {
            translatedCache.set(text, translatedText);
          }
        }
      }

      segments.forEach(segment => {
        const text = segment.getAttribute('data-translated-text');
        if (translatedCache.has(text)) {
          applySubtitleTranslation(segment, text, translatedCache.get(text));
        }
      });
    } catch (e) {
      // Ignore
    }
  }

  function applySubtitleTranslation(segment, originalText, translatedText) {
    if (segment.getAttribute('data-translated-text') !== originalText) return;

    const oldBr = segment.querySelector('.ai-yt-sub-br');
    const oldDiv = segment.querySelector('.ai-yt-sub');
    if (oldBr) oldBr.remove();
    if (oldDiv) oldDiv.remove();

    const span = document.createElement('span');
    span.className = 'ai-yt-sub';
    span.textContent = translatedText;
    if (ytSubConfig.colorMode === 'inherit') {
      span.style.color = '';
    } else {
      span.style.color = ytSubConfig.color;
    }
    span.style.opacity = ytSubConfig.opacity;
    span.style.fontSize = '0.9em';
    
    const br = document.createElement('br');
    br.className = 'ai-yt-sub-br';
    
    if (ytSubConfig.position === 'above') {
      segment.insertBefore(br, segment.firstChild);
      segment.insertBefore(span, br);
    } else {
      segment.appendChild(br);
      segment.appendChild(span);
    }
  }

  chrome.storage.local.get(['youtubeDualSubs', 'ytSubColorMode', 'ytSubColor', 'ytSubOpacity', 'ytSubPosition'], (res) => {
    if (res.youtubeDualSubs !== undefined) {
      youtubeDualSubsEnabled = (res.youtubeDualSubs === 'on');
    }
    if (res.ytSubColorMode) ytSubConfig.colorMode = res.ytSubColorMode;
    if (res.ytSubColor) ytSubConfig.color = res.ytSubColor;
    if (res.ytSubOpacity) ytSubConfig.opacity = res.ytSubOpacity;
    if (res.ytSubPosition) ytSubConfig.position = res.ytSubPosition;
    
    if (youtubeDualSubsEnabled) startObserving();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.youtubeDualSubs) {
      youtubeDualSubsEnabled = (changes.youtubeDualSubs.newValue === 'on');
      if (youtubeDualSubsEnabled) startObserving();
    }
    const updateExistingSubs = () => {
      document.querySelectorAll('.ai-yt-sub:not(.ai-local-sub-text)').forEach(span => {
        if (ytSubConfig.colorMode === 'inherit') {
          span.style.color = '';
        } else {
          span.style.color = ytSubConfig.color;
        }
        span.style.opacity = ytSubConfig.opacity;
        
        if (changes.ytSubPosition) {
           const segment = span.parentElement;
           const br = segment ? segment.querySelector('.ai-yt-sub-br') : null;
           if (segment && br) {
             if (ytSubConfig.position === 'above') {
               segment.insertBefore(br, segment.firstChild);
               segment.insertBefore(span, br);
             } else {
               segment.appendChild(br);
               segment.appendChild(span);
             }
           }
        }
      });
    };

    if (changes.ytSubColorMode) {
      ytSubConfig.colorMode = changes.ytSubColorMode.newValue;
      translatedCache.clear();
      updateExistingSubs();
      if (typeof applyLocalSubStyle === 'function') applyLocalSubStyle();
    }
    if (changes.ytSubColor) {
      ytSubConfig.color = changes.ytSubColor.newValue;
      translatedCache.clear();
      updateExistingSubs();
      if (typeof applyLocalSubStyle === 'function') applyLocalSubStyle();
    }
    if (changes.ytSubOpacity) {
      ytSubConfig.opacity = changes.ytSubOpacity.newValue;
      translatedCache.clear();
      updateExistingSubs();
      if (typeof applyLocalSubStyle === 'function') applyLocalSubStyle();
    }
    if (changes.ytSubPosition) {
      ytSubConfig.position = changes.ytSubPosition.newValue;
      translatedCache.clear();
      updateExistingSubs();
    }
  });

  startObserving();
}

initYoutubeObserver();

// ============================================
// Local Subtitle File Player (SRT / VTT / ASS)
// Uses the same visual style as dual-sub .ai-yt-sub (ytSubConfig)
// ============================================
const LOCAL_SUB_STORAGE_PREFIX = 'ytLocalSub:';
const LOCAL_SUB_INDEX_KEY = 'ytLocalSubIndex';
const LOCAL_SUB_MAX_CACHED = 25; // max videos remembered

const localSubState = {
  cues: [],
  fileName: '',
  content: '', // raw file text for re-persist
  enabled: true, // show/hide overlay
  offsetSec: 0, // positive = delay subtitle
  videoId: null,
  // visual style (global, remembered)
  fontSize: 22, // px
  color: '#ffeb3b',
  posX: 50, // % from left (center of text)
  posY: 10, // % from bottom
  overlay: null,
  windowEl: null,
  textEl: null,
  video: null,
  rafId: null,
  lastCueIndex: -1,
  lastText: '',
  listenersBound: false,
  dragging: false,
  // on-page UI
  controlBtn: null,
  fileInput: null,
  panel: null,
  toastTimer: null,
  styleSaveTimer: null,
  restoring: false // suppress toast while auto-restoring
};

function persistLocalSubStyle() {
  if (localSubState.styleSaveTimer) clearTimeout(localSubState.styleSaveTimer);
  localSubState.styleSaveTimer = setTimeout(() => {
    chrome.storage.local.set({
      ytLocalSubFontSize: localSubState.fontSize,
      ytLocalSubColor: localSubState.color,
      ytLocalSubPosX: localSubState.posX,
      ytLocalSubPosY: localSubState.posY
    });
  }, 200);
}

function getYoutubeVideoId() {
  try {
    const u = new URL(window.location.href);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const shorts = u.pathname.match(/\/shorts\/([^/?#]+)/);
      if (shorts) return shorts[1];
      const embed = u.pathname.match(/\/embed\/([^/?#]+)/);
      if (embed) return embed[1];
      const live = u.pathname.match(/\/live\/([^/?#]+)/);
      if (live) return live[1];
    }
  } catch (e) {}
  return null;
}

function localSubStorageKey(videoId) {
  return LOCAL_SUB_STORAGE_PREFIX + videoId;
}

function saveLocalSubToStorage(videoId, { content, fileName, offsetSec }) {
  if (!videoId || !content) return Promise.resolve();
  const key = localSubStorageKey(videoId);
  const record = {
    content,
    fileName: fileName || 'subtitle',
    offsetSec: typeof offsetSec === 'number' ? offsetSec : (localSubState.offsetSec || 0),
    savedAt: Date.now()
  };
  return new Promise((resolve) => {
    chrome.storage.local.get([LOCAL_SUB_INDEX_KEY], (res) => {
      let index = Array.isArray(res[LOCAL_SUB_INDEX_KEY]) ? res[LOCAL_SUB_INDEX_KEY].slice() : [];
      index = index.filter(id => id !== videoId);
      index.unshift(videoId);
      const toRemove = [];
      while (index.length > LOCAL_SUB_MAX_CACHED) {
        const oldId = index.pop();
        if (oldId) toRemove.push(localSubStorageKey(oldId));
      }
      const payload = { [key]: record, [LOCAL_SUB_INDEX_KEY]: index };
      if (toRemove.length) {
        chrome.storage.local.remove(toRemove, () => {
          chrome.storage.local.set(payload, resolve);
        });
      } else {
        chrome.storage.local.set(payload, resolve);
      }
    });
  });
}

function loadLocalSubFromStorage(videoId) {
  if (!videoId) return Promise.resolve(null);
  const key = localSubStorageKey(videoId);
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      const rec = res[key];
      if (rec && rec.content) resolve(rec);
      else resolve(null);
    });
  });
}

function removeLocalSubFromStorage(videoId) {
  if (!videoId) return Promise.resolve();
  const key = localSubStorageKey(videoId);
  return new Promise((resolve) => {
    chrome.storage.local.get([LOCAL_SUB_INDEX_KEY], (res) => {
      let index = Array.isArray(res[LOCAL_SUB_INDEX_KEY]) ? res[LOCAL_SUB_INDEX_KEY] : [];
      index = index.filter(id => id !== videoId);
      chrome.storage.local.remove([key], () => {
        chrome.storage.local.set({ [LOCAL_SUB_INDEX_KEY]: index }, resolve);
      });
    });
  });
}

async function tryRestoreLocalSubForCurrentVideo({ silent } = { silent: true }) {
  const videoId = getYoutubeVideoId();
  if (!videoId) return false;
  // Already showing this video's subtitles
  if (localSubState.videoId === videoId && localSubState.cues.length > 0) {
    return true;
  }
  const rec = await loadLocalSubFromStorage(videoId);
  if (!rec) {
    // Switched to a video with no cache — clear in-memory if was another video
    if (localSubState.videoId && localSubState.videoId !== videoId) {
      clearLocalSubtitles({ skipStorage: true, skipToast: true });
      localSubState.videoId = videoId;
    } else {
      localSubState.videoId = videoId;
    }
    updateLocalSubControlUI();
    return false;
  }
  localSubState.restoring = true;
  const result = loadLocalSubtitles({
    content: rec.content,
    fileName: rec.fileName,
    offsetSec: rec.offsetSec,
    skipSave: true,
    skipToast: true
  });
  localSubState.restoring = false;
  if (result.ok) {
    // Brief toast so user knows auto-restore happened
    showLocalSubToast(`已恢复字幕：${rec.fileName}`);
  }
  return !!result.ok;
}

function parseTimestampToSeconds(raw) {
  if (!raw) return 0;
  const t = String(raw).trim().replace(',', '.');
  const parts = t.split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = parseFloat(parts[0]) || 0;
    const s = parseFloat(parts[1]) || 0;
    return m * 60 + s;
  }
  return parseFloat(t) || 0;
}

function stripHtmlTags(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\{[^}]*\}/g, '') // ASS override tags like {\an8}
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

function parseSrtContent(content) {
  const cues = [];
  const blocks = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    let timeLineIdx = 0;
    // Optional numeric index on first line
    if (/^\d+$/.test(lines[0]) && lines.length >= 3) timeLineIdx = 1;
    const timeLine = lines[timeLineIdx];
    const m = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/
    );
    if (!m) continue;
    const start = parseTimestampToSeconds(m[1]);
    const end = parseTimestampToSeconds(m[2]);
    const text = stripHtmlTags(lines.slice(timeLineIdx + 1).join('\n'));
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

function parseVttContent(content) {
  // Drop WEBVTT header / NOTE / STYLE blocks loosely by reusing SRT-like block parsing
  let body = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  body = body.replace(/^WEBVTT[^\n]*\n+/i, '');
  body = body.replace(/^(NOTE|STYLE|REGION)[\s\S]*?(?=\n\n|$)/gm, '');
  return parseSrtContent(body);
}

function parseAssContent(content) {
  const cues = [];
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let inEvents = false;
  let format = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    if (/^\[Events\]/i.test(line)) {
      inEvents = true;
      continue;
    }
    if (/^\[/.test(line)) {
      inEvents = false;
      continue;
    }
    if (!inEvents) continue;
    if (/^Format:/i.test(line)) {
      format = line.replace(/^Format:\s*/i, '').split(',').map(s => s.trim().toLowerCase());
      continue;
    }
    if (!/^Dialogue:/i.test(line)) continue;
    const payload = line.replace(/^Dialogue:\s*/i, '');
    // ASS: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    // Text may contain commas — split limited by format length
    const parts = payload.split(',');
    if (format.length === 0) {
      // fallback common order
      if (parts.length < 10) continue;
      const start = parseTimestampToSeconds(parts[1]);
      const end = parseTimestampToSeconds(parts[2]);
      const text = stripHtmlTags(parts.slice(9).join(',').replace(/\\N/g, '\n').replace(/\\n/g, '\n'));
      if (text) cues.push({ start, end, text });
      continue;
    }
    const startIdx = format.indexOf('start');
    const endIdx = format.indexOf('end');
    const textIdx = format.indexOf('text');
    if (startIdx < 0 || endIdx < 0 || textIdx < 0) continue;
    const start = parseTimestampToSeconds(parts[startIdx]);
    const end = parseTimestampToSeconds(parts[endIdx]);
    const text = stripHtmlTags(parts.slice(textIdx).join(',').replace(/\\N/g, '\n').replace(/\\n/g, '\n'));
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

function parseSubtitleFile(content, fileName = '') {
  const name = (fileName || '').toLowerCase();
  const head = (content || '').slice(0, 32).trim().toUpperCase();
  let cues = [];
  if (name.endsWith('.vtt') || head.startsWith('WEBVTT')) {
    cues = parseVttContent(content);
  } else if (name.endsWith('.ass') || name.endsWith('.ssa') || /\[Script Info\]/i.test(content.slice(0, 200))) {
    cues = parseAssContent(content);
  } else {
    cues = parseSrtContent(content);
  }
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

function findCueIndexAt(timeSec) {
  const cues = localSubState.cues;
  if (!cues.length) return -1;
  // Binary search for last cue with start <= time
  let lo = 0;
  let hi = cues.length - 1;
  let candidate = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= timeSec) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (candidate < 0) return -1;
  const cue = cues[candidate];
  if (timeSec >= cue.start && timeSec < cue.end) return candidate;
  return -1;
}

function ensureLocalSubStyles() {
  if (document.getElementById('ai-local-sub-style')) return;
  const style = document.createElement('style');
  style.id = 'ai-local-sub-style';
  // Match YouTube caption window + plugin dual-sub (.ai-yt-sub) look
  style.textContent = `
#ai-local-sub-overlay {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 59;
  pointer-events: none;
  box-sizing: border-box;
  font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif;
}
#ai-local-sub-overlay .ai-local-sub-window {
  position: absolute;
  left: 50%;
  bottom: 10%;
  transform: translateX(-50%);
  max-width: 88%;
  text-align: center;
  line-height: 1.3;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
#ai-local-sub-overlay .ai-local-sub-window.ai-dragging {
  cursor: grabbing;
  z-index: 60;
}
#ai-local-sub-overlay .ai-local-sub-window.ai-dragging .ai-local-sub-text {
  outline: 1px dashed rgba(255,255,255,0.55);
  outline-offset: 3px;
}
#ai-local-sub-overlay .ai-local-sub-text.ai-yt-sub {
  display: none;
  white-space: pre-wrap;
  word-break: break-word;
  font-weight: 500;
  line-height: 1.35;
  padding: 3px 10px;
  border-radius: 3px;
  background: rgba(8, 8, 8, 0.75);
  text-shadow: 0 0 2px rgba(0,0,0,0.8);
}
#ai-local-sub-overlay.ai-local-sub-hidden {
  display: none !important;
}

/* ── On-page load button (player controls) ── */
.ai-local-sub-btn {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 100%;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  opacity: 0.9;
  padding: 0;
  vertical-align: top;
  position: relative;
}
.ai-local-sub-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
.ai-local-sub-btn.ai-local-sub-btn-active { color: #ffeb3b; opacity: 1; }
.ai-local-sub-btn.ai-local-sub-btn-loaded { opacity: 1; }
.ai-local-sub-btn.ai-local-sub-btn-hidden { color: #aaa; opacity: 0.75; }
.ai-local-sub-btn svg { width: 24px; height: 24px; pointer-events: none; }
.ai-local-sub-btn .ai-local-sub-btn-dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ffeb3b;
  display: none;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
}
.ai-local-sub-btn.ai-local-sub-btn-active .ai-local-sub-btn-dot { display: block; }
.ai-local-sub-btn.ai-local-sub-btn-hidden .ai-local-sub-btn-dot {
  display: block;
  background: #888;
}

/* ── Floating control panel ── */
#ai-local-sub-panel {
  position: absolute;
  right: 12px;
  bottom: 72px;
  z-index: 70;
  min-width: 220px;
  max-width: 300px;
  background: rgba(28, 28, 28, 0.96);
  color: #fff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.45);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  pointer-events: auto;
  display: none;
}
#ai-local-sub-panel.ai-open { display: block; }
#ai-local-sub-panel .ai-lsp-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
#ai-local-sub-panel .ai-lsp-title button {
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
}
#ai-local-sub-panel .ai-lsp-file {
  font-size: 12px;
  color: #ccc;
  margin-bottom: 10px;
  word-break: break-all;
  line-height: 1.35;
}
#ai-local-sub-panel .ai-lsp-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
}
#ai-local-sub-panel .ai-lsp-toggle-label {
  font-size: 12px;
  color: #eee;
  user-select: none;
}
#ai-local-sub-panel .ai-lsp-switch {
  position: relative;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
#ai-local-sub-panel .ai-lsp-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
#ai-local-sub-panel .ai-lsp-switch .ai-lsp-slider {
  position: absolute;
  inset: 0;
  background: #555;
  border-radius: 22px;
  cursor: pointer;
  transition: background 0.15s;
}
#ai-local-sub-panel .ai-lsp-switch .ai-lsp-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.15s;
}
#ai-local-sub-panel .ai-lsp-switch input:checked + .ai-lsp-slider {
  background: #3ea6ff;
}
#ai-local-sub-panel .ai-lsp-switch input:checked + .ai-lsp-slider::before {
  transform: translateX(18px);
}
#ai-local-sub-panel .ai-lsp-switch input:disabled + .ai-lsp-slider {
  opacity: 0.4;
  cursor: not-allowed;
}
#ai-local-sub-panel .ai-lsp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
#ai-local-sub-panel .ai-lsp-row label {
  flex: 1;
  font-size: 12px;
  color: #bbb;
}
#ai-local-sub-panel .ai-lsp-offset {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
#ai-local-sub-panel .ai-lsp-offset button,
#ai-local-sub-panel .ai-lsp-actions button {
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 10px;
  line-height: 1;
}
#ai-local-sub-panel .ai-lsp-offset button:hover,
#ai-local-sub-panel .ai-lsp-actions button:hover {
  background: rgba(255,255,255,0.18);
}
#ai-local-sub-panel .ai-lsp-offset .ai-lsp-offset-val {
  min-width: 48px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: #ffeb3b;
  font-weight: 600;
}
#ai-local-sub-panel .ai-lsp-style {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
}
#ai-local-sub-panel .ai-lsp-style-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
#ai-local-sub-panel .ai-lsp-style-row > span:first-child {
  font-size: 12px;
  color: #bbb;
  min-width: 36px;
  flex-shrink: 0;
}
#ai-local-sub-panel .ai-lsp-style-row input[type="range"] {
  flex: 1;
  min-width: 0;
  accent-color: #3ea6ff;
}
#ai-local-sub-panel .ai-lsp-style-row input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid #555;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
#ai-local-sub-panel .ai-lsp-style-val {
  font-size: 11px;
  color: #ffeb3b;
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
#ai-local-sub-panel .ai-lsp-style-actions {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}
#ai-local-sub-panel .ai-lsp-style-actions button {
  flex: 1;
  background: rgba(255,255,255,0.1);
  border: none;
  color: #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  padding: 5px 6px;
}
#ai-local-sub-panel .ai-lsp-style-actions button:hover {
  background: rgba(255,255,255,0.18);
}
#ai-local-sub-panel .ai-lsp-actions {
  display: flex;
  gap: 6px;
}
#ai-local-sub-panel .ai-lsp-actions button {
  flex: 1;
  font-size: 12px;
  padding: 7px 8px;
}
#ai-local-sub-panel .ai-lsp-actions .ai-lsp-primary {
  background: #3ea6ff;
  color: #0f0f0f;
  font-weight: 600;
}
#ai-local-sub-panel .ai-lsp-actions .ai-lsp-primary:hover {
  background: #65b8ff;
}
#ai-local-sub-panel .ai-lsp-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #888;
  line-height: 1.35;
}
#ai-local-sub-toast {
  position: absolute;
  left: 50%;
  bottom: 18%;
  transform: translateX(-50%);
  z-index: 71;
  background: rgba(28,28,28,0.92);
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  white-space: nowrap;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
#ai-local-sub-toast.ai-show { opacity: 1; }
`;
  document.documentElement.appendChild(style);
}

function getYoutubePlayerContainer() {
  return (
    document.querySelector('#movie_player') ||
    document.querySelector('.html5-video-player') ||
    document.querySelector('#player') ||
    null
  );
}

function getYoutubeVideo() {
  return (
    document.querySelector('video.html5-main-video') ||
    document.querySelector('#movie_player video') ||
    document.querySelector('video') ||
    null
  );
}

function applyLocalSubPosition() {
  const win = localSubState.windowEl;
  if (!win) return;
  const x = Math.max(2, Math.min(98, localSubState.posX ?? 50));
  const y = Math.max(2, Math.min(92, localSubState.posY ?? 10));
  localSubState.posX = x;
  localSubState.posY = y;
  win.style.left = x + '%';
  win.style.bottom = y + '%';
  win.style.top = 'auto';
  win.style.right = 'auto';
  win.style.transform = 'translateX(-50%)';
}

function applyLocalSubStyle() {
  if (!localSubState.textEl) return;
  const el = localSubState.textEl;
  el.style.color = localSubState.color || '#ffeb3b';
  el.style.fontSize = (localSubState.fontSize || 22) + 'px';
  el.style.opacity = '1';
  applyLocalSubPosition();
}

function bindLocalSubDrag(windowEl) {
  if (!windowEl || windowEl.dataset.dragBound === '1') return;
  windowEl.dataset.dragBound = '1';

  let startClientX = 0;
  let startClientY = 0;
  let startPosX = 50;
  let startPosY = 10;
  let playerRect = null;

  const onMove = (e) => {
    if (!localSubState.dragging || !playerRect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - startClientX;
    const dy = clientY - startClientY;
    // posX: % from left; posY: % from bottom (so up = increase Y)
    const nextX = startPosX + (dx / playerRect.width) * 100;
    const nextY = startPosY - (dy / playerRect.height) * 100;
    localSubState.posX = Math.max(2, Math.min(98, nextX));
    localSubState.posY = Math.max(2, Math.min(92, nextY));
    applyLocalSubPosition();
    if (e.cancelable) e.preventDefault();
  };

  const onUp = () => {
    if (!localSubState.dragging) return;
    localSubState.dragging = false;
    windowEl.classList.remove('ai-dragging');
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);
    document.removeEventListener('touchmove', onMove, true);
    document.removeEventListener('touchend', onUp, true);
    persistLocalSubStyle();
    updateLocalSubControlUI();
  };

  const onDown = (e) => {
    // Only left button / touch
    if (e.type === 'mousedown' && e.button !== 0) return;
    if (!localSubState.cues.length || !localSubState.enabled) return;
    const player = getYoutubePlayerContainer();
    if (!player) return;
    playerRect = player.getBoundingClientRect();
    if (!playerRect.width || !playerRect.height) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startClientX = clientX;
    startClientY = clientY;
    startPosX = localSubState.posX ?? 50;
    startPosY = localSubState.posY ?? 10;
    localSubState.dragging = true;
    windowEl.classList.add('ai-dragging');

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
    document.addEventListener('touchmove', onMove, { capture: true, passive: false });
    document.addEventListener('touchend', onUp, true);

    e.preventDefault();
    e.stopPropagation();
  };

  windowEl.addEventListener('mousedown', onDown);
  windowEl.addEventListener('touchstart', onDown, { passive: false });
}

function ensureLocalSubOverlay() {
  ensureLocalSubStyles();
  const player = getYoutubePlayerContainer();
  if (!player) return null;

  // Keep overlay inside player for correct fullscreen/positioning
  if (localSubState.overlay && localSubState.overlay.isConnected) {
    if (localSubState.overlay.parentElement !== player) {
      player.appendChild(localSubState.overlay);
    }
    applyLocalSubStyle();
    return localSubState.overlay;
  }

  const overlay = document.createElement('div');
  overlay.id = 'ai-local-sub-overlay';
  const windowEl = document.createElement('div');
  windowEl.className = 'ai-local-sub-window';
  windowEl.title = '拖动调整字幕位置';
  const textEl = document.createElement('span');
  textEl.className = 'ai-local-sub-text ai-yt-sub';
  windowEl.appendChild(textEl);
  overlay.appendChild(windowEl);
  player.appendChild(overlay);

  localSubState.overlay = overlay;
  localSubState.windowEl = windowEl;
  localSubState.textEl = textEl;
  bindLocalSubDrag(windowEl);
  applyLocalSubStyle();
  return overlay;
}

function setLocalSubVisibleText(text) {
  if (!localSubState.textEl) return;
  const win = localSubState.windowEl;
  if (!text) {
    // Between cues: keep a small drag handle so position can still be adjusted
    if (localSubState.cues.length && localSubState.enabled) {
      localSubState.textEl.textContent = '⠿ 拖动';
      localSubState.textEl.style.display = 'inline-block';
      localSubState.textEl.style.opacity = '0.35';
      localSubState.textEl.style.fontSize = '12px';
      if (win) win.style.pointerEvents = 'auto';
    } else {
      localSubState.textEl.style.display = 'none';
      localSubState.textEl.textContent = '';
      if (win) win.style.pointerEvents = 'none';
    }
    localSubState.lastText = '';
    return;
  }
  if (text !== localSubState.lastText) {
    localSubState.textEl.textContent = text;
    localSubState.lastText = text;
  }
  localSubState.textEl.style.display = 'inline-block';
  localSubState.textEl.style.opacity = '1';
  if (win) win.style.pointerEvents = 'auto';
  applyLocalSubStyle();
}

function setLocalSubFontSize(px) {
  const n = Math.max(12, Math.min(64, Math.round(parseFloat(px) || 22)));
  localSubState.fontSize = n;
  applyLocalSubStyle();
  persistLocalSubStyle();
  updateLocalSubControlUI();
  return n;
}

function setLocalSubColor(color) {
  if (!color) return localSubState.color;
  localSubState.color = color;
  applyLocalSubStyle();
  persistLocalSubStyle();
  updateLocalSubControlUI();
  return color;
}

function resetLocalSubPosition() {
  localSubState.posX = 50;
  localSubState.posY = 10;
  applyLocalSubPosition();
  persistLocalSubStyle();
  updateLocalSubControlUI();
  showLocalSubToast('位置已重置');
}

function resetLocalSubStyle() {
  localSubState.fontSize = 22;
  localSubState.color = '#ffeb3b';
  localSubState.posX = 50;
  localSubState.posY = 10;
  applyLocalSubStyle();
  persistLocalSubStyle();
  updateLocalSubControlUI();
  showLocalSubToast('样式已重置');
}

function tickLocalSubtitles() {
  localSubState.rafId = null;
  if (!localSubState.enabled || !localSubState.cues.length) {
    setLocalSubVisibleText('');
    return;
  }

  const video = localSubState.video || getYoutubeVideo();
  if (!video) {
    setLocalSubVisibleText('');
    scheduleLocalSubTick();
    return;
  }
  localSubState.video = video;
  ensureLocalSubOverlay();

  const t = (video.currentTime || 0) - (localSubState.offsetSec || 0);
  const idx = findCueIndexAt(t);
  if (idx !== localSubState.lastCueIndex) {
    localSubState.lastCueIndex = idx;
  }
  if (idx >= 0) {
    setLocalSubVisibleText(localSubState.cues[idx].text);
  } else {
    setLocalSubVisibleText('');
  }

  if (!video.paused && !video.ended) {
    scheduleLocalSubTick();
  }
}

function scheduleLocalSubTick() {
  if (localSubState.rafId != null) return;
  localSubState.rafId = requestAnimationFrame(tickLocalSubtitles);
}

function bindVideoListeners(video) {
  if (!video) return;
  if (video === localSubState.video && localSubState.listenersBound) return;

  // Unbind previous
  if (localSubState.video && localSubState._onTime) {
    const v = localSubState.video;
    v.removeEventListener('timeupdate', localSubState._onTime);
    v.removeEventListener('play', localSubState._onPlay);
    v.removeEventListener('pause', localSubState._onPause);
    v.removeEventListener('seeked', localSubState._onSeeked);
  }

  localSubState.video = video;
  localSubState._onTime = () => scheduleLocalSubTick();
  localSubState._onPlay = () => scheduleLocalSubTick();
  localSubState._onPause = () => tickLocalSubtitles();
  localSubState._onSeeked = () => {
    localSubState.lastCueIndex = -1;
    tickLocalSubtitles();
  };

  video.addEventListener('timeupdate', localSubState._onTime);
  video.addEventListener('play', localSubState._onPlay);
  video.addEventListener('pause', localSubState._onPause);
  video.addEventListener('seeked', localSubState._onSeeked);
  localSubState.listenersBound = true;
  scheduleLocalSubTick();
}

function loadLocalSubtitles({ content, fileName, offsetSec, skipSave, skipToast }) {
  if (!window.location.hostname.includes('youtube.com')) {
    return { ok: false, error: 'not_youtube' };
  }
  const cues = parseSubtitleFile(content || '', fileName || '');
  if (!cues.length) {
    return { ok: false, error: 'parse_failed', count: 0 };
  }
  const videoId = getYoutubeVideoId();
  localSubState.cues = cues;
  localSubState.fileName = fileName || 'subtitle';
  localSubState.content = content || '';
  localSubState.videoId = videoId;
  // Keep user's show/hide preference; only force-on when user freshly loads a file
  if (!skipSave) localSubState.enabled = true;
  if (typeof offsetSec === 'number' && !Number.isNaN(offsetSec)) {
    localSubState.offsetSec = offsetSec;
  }
  localSubState.lastCueIndex = -1;
  localSubState.lastText = '';

  ensureLocalSubOverlay();
  if (localSubState.overlay) {
    localSubState.overlay.classList.remove('ai-local-sub-hidden');
  }

  const video = getYoutubeVideo();
  if (video) bindVideoListeners(video);
  else startLocalSubVideoWatcher();

  tickLocalSubtitles();
  updateLocalSubControlUI();

  if (!skipSave && videoId) {
    saveLocalSubToStorage(videoId, {
      content: localSubState.content,
      fileName: localSubState.fileName,
      offsetSec: localSubState.offsetSec
    });
    chrome.storage.local.set({ ytLocalSubEnabled: 'on' });
  }

  if (!skipToast && !localSubState.restoring) {
    showLocalSubToast(`字幕已加载：${localSubState.fileName}（${cues.length} 条）`);
  }
  return {
    ok: true,
    count: cues.length,
    fileName: localSubState.fileName,
    videoId,
    duration: cues.length ? cues[cues.length - 1].end : 0
  };
}

function clearLocalSubtitles({ skipStorage, skipToast } = {}) {
  const videoId = localSubState.videoId || getYoutubeVideoId();
  localSubState.cues = [];
  localSubState.fileName = '';
  localSubState.content = '';
  localSubState.lastCueIndex = -1;
  localSubState.lastText = '';
  if (localSubState.rafId != null) {
    cancelAnimationFrame(localSubState.rafId);
    localSubState.rafId = null;
  }
  setLocalSubVisibleText('');
  if (localSubState.overlay) {
    localSubState.overlay.remove();
    localSubState.overlay = null;
    localSubState.windowEl = null;
    localSubState.textEl = null;
  }
  if (!skipStorage && videoId) {
    removeLocalSubFromStorage(videoId);
  }
  updateLocalSubControlUI();
  if (!skipToast) showLocalSubToast('已清除本地字幕');
  return { ok: true };
}

function getLocalSubtitleStatus() {
  return {
    ok: true,
    isYoutube: window.location.hostname.includes('youtube.com'),
    loaded: localSubState.cues.length > 0,
    count: localSubState.cues.length,
    fileName: localSubState.fileName,
    enabled: localSubState.enabled,
    offsetSec: localSubState.offsetSec,
    fontSize: localSubState.fontSize,
    color: localSubState.color,
    posX: localSubState.posX,
    posY: localSubState.posY,
    videoId: localSubState.videoId || getYoutubeVideoId()
  };
}

function setLocalSubEnabled(enabled) {
  localSubState.enabled = !!enabled;
  chrome.storage.local.set({ ytLocalSubEnabled: localSubState.enabled ? 'on' : 'off' });
  if (!localSubState.enabled) {
    setLocalSubVisibleText('');
  } else {
    tickLocalSubtitles();
  }
  updateLocalSubControlUI();
  showLocalSubToast(localSubState.enabled ? '本地字幕：显示' : '本地字幕：隐藏');
  return localSubState.enabled;
}

function showLocalSubToast(msg) {
  const player = getYoutubePlayerContainer();
  if (!player) return;
  let toast = document.getElementById('ai-local-sub-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ai-local-sub-toast';
    player.appendChild(toast);
  } else if (toast.parentElement !== player) {
    player.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('ai-show');
  if (localSubState.toastTimer) clearTimeout(localSubState.toastTimer);
  localSubState.toastTimer = setTimeout(() => {
    toast.classList.remove('ai-show');
  }, 2200);
}

function setLocalSubOffset(sec) {
  const n = Math.max(-30, Math.min(30, Math.round((parseFloat(sec) || 0) * 10) / 10));
  localSubState.offsetSec = n;
  localSubState.lastCueIndex = -1;
  chrome.storage.local.set({ ytLocalSubOffset: n });
  // Persist offset into this video's cached subtitle
  if (localSubState.videoId && localSubState.content) {
    saveLocalSubToStorage(localSubState.videoId, {
      content: localSubState.content,
      fileName: localSubState.fileName,
      offsetSec: n
    });
  }
  tickLocalSubtitles();
  updateLocalSubControlUI();
  return n;
}

function updateLocalSubControlUI() {
  const btn = localSubState.controlBtn;
  if (btn) {
    const has = localSubState.cues.length > 0;
    btn.classList.toggle('ai-local-sub-btn-active', has && localSubState.enabled);
    btn.classList.toggle('ai-local-sub-btn-loaded', has);
    btn.classList.toggle('ai-local-sub-btn-hidden', has && !localSubState.enabled);
    if (!has) {
      btn.title = '加载本地字幕 (.srt / .vtt / .ass)';
    } else if (localSubState.enabled) {
      btn.title = `本地字幕：${localSubState.fileName}（点击管理）`;
    } else {
      btn.title = `本地字幕已隐藏：${localSubState.fileName}（点击管理）`;
    }
  }
  const panel = localSubState.panel;
  if (!panel) return;
  const fileEl = panel.querySelector('.ai-lsp-file');
  const offsetVal = panel.querySelector('.ai-lsp-offset-val');
  const toggle = panel.querySelector('.ai-lsp-toggle-input');
  const toggleLabel = panel.querySelector('.ai-lsp-toggle-label');
  if (fileEl) {
    fileEl.textContent = localSubState.cues.length
      ? `${localSubState.fileName}（${localSubState.cues.length} 条）`
      : '尚未加载字幕文件';
  }
  if (offsetVal) {
    const n = localSubState.offsetSec || 0;
    offsetVal.textContent = (n >= 0 ? '+' : '') + Number(n).toFixed(1) + 's';
  }
  if (toggle) {
    toggle.checked = !!localSubState.enabled;
    toggle.disabled = !localSubState.cues.length;
  }
  if (toggleLabel) {
    toggleLabel.textContent = localSubState.enabled ? '显示本地字幕' : '隐藏本地字幕';
    toggleLabel.style.opacity = localSubState.cues.length ? '1' : '0.5';
  }
  const sizeInput = panel.querySelector('.ai-lsp-size');
  const sizeVal = panel.querySelector('.ai-lsp-size-val');
  const colorInput = panel.querySelector('.ai-lsp-color');
  if (sizeInput) sizeInput.value = localSubState.fontSize || 22;
  if (sizeVal) sizeVal.textContent = (localSubState.fontSize || 22) + 'px';
  if (colorInput) colorInput.value = localSubState.color || '#ffeb3b';
  const clearBtn = panel.querySelector('.ai-lsp-clear');
  if (clearBtn) clearBtn.disabled = !localSubState.cues.length;
}

function closeLocalSubPanel() {
  if (localSubState.panel) {
    localSubState.panel.classList.remove('ai-open');
  }
}

function toggleLocalSubPanel() {
  ensureLocalSubControlUI();
  if (!localSubState.panel) return;
  const open = !localSubState.panel.classList.contains('ai-open');
  localSubState.panel.classList.toggle('ai-open', open);
  if (open) updateLocalSubControlUI();
}

function ensureLocalSubFileInput() {
  if (localSubState.fileInput && localSubState.fileInput.isConnected) {
    return localSubState.fileInput;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.srt,.vtt,.ass,.ssa,text/vtt,application/x-subrip';
  input.style.display = 'none';
  input.id = 'ai-local-sub-file-input';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const content = await file.text();
      const result = loadLocalSubtitles({
        content,
        fileName: file.name,
        offsetSec: localSubState.offsetSec
      });
      if (!result.ok) {
        showLocalSubToast(result.error === 'parse_failed' ? '无法解析该字幕文件' : '加载失败');
      } else {
        closeLocalSubPanel();
      }
    } catch (e) {
      showLocalSubToast('读取文件失败');
    }
    // allow re-selecting same file
    input.value = '';
  });
  document.documentElement.appendChild(input);
  localSubState.fileInput = input;
  return input;
}

function openLocalSubFilePicker() {
  const input = ensureLocalSubFileInput();
  input.click();
}

function ensureLocalSubControlUI() {
  if (!window.location.hostname.includes('youtube.com')) return;
  ensureLocalSubStyles();

  const rightControls =
    document.querySelector('.ytp-right-controls') ||
    document.querySelector('.ytp-chrome-controls .ytp-right-controls');
  if (!rightControls) return;

  // Button in player controls bar
  if (!localSubState.controlBtn || !localSubState.controlBtn.isConnected) {
    const btn = document.createElement('button');
    btn.className = 'ytp-button ai-local-sub-btn';
    btn.type = 'button';
    btn.title = '加载本地字幕 (.srt / .vtt / .ass)';
    btn.setAttribute('aria-label', 'Load local subtitles');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z"/>
      </svg>
      <span class="ai-local-sub-btn-dot"></span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // If nothing loaded yet, open file picker directly; else toggle panel
      if (!localSubState.cues.length) {
        openLocalSubFilePicker();
      } else {
        toggleLocalSubPanel();
      }
    });
    // Insert before settings / fullscreen cluster (leftmost of right controls)
    rightControls.insertBefore(btn, rightControls.firstChild);
    localSubState.controlBtn = btn;
  }

  // Panel inside player
  const player = getYoutubePlayerContainer();
  if (player && (!localSubState.panel || !localSubState.panel.isConnected)) {
    const panel = document.createElement('div');
    panel.id = 'ai-local-sub-panel';
    panel.innerHTML = `
      <div class="ai-lsp-title">
        <span>本地字幕</span>
        <button type="button" class="ai-lsp-close" title="关闭">×</button>
      </div>
      <div class="ai-lsp-file">尚未加载字幕文件</div>
      <div class="ai-lsp-toggle-row">
        <span class="ai-lsp-toggle-label">显示本地字幕</span>
        <label class="ai-lsp-switch" title="显示/隐藏本地字幕">
          <input type="checkbox" class="ai-lsp-toggle-input" checked>
          <span class="ai-lsp-slider"></span>
        </label>
      </div>
      <div class="ai-lsp-offset">
        <button type="button" class="ai-lsp-minus" title="-0.1s">−</button>
        <span class="ai-lsp-offset-val">+0.0s</span>
        <button type="button" class="ai-lsp-plus" title="+0.1s">+</button>
        <button type="button" class="ai-lsp-reset" title="重置时间轴" style="margin-left:auto;font-size:11px;">重置轴</button>
      </div>
      <div class="ai-lsp-style">
        <div class="ai-lsp-style-row">
          <span>字号</span>
          <input type="range" class="ai-lsp-size" min="12" max="64" step="1" value="22">
          <span class="ai-lsp-style-val ai-lsp-size-val">22px</span>
        </div>
        <div class="ai-lsp-style-row">
          <span>颜色</span>
          <input type="color" class="ai-lsp-color" value="#ffeb3b">
          <span class="ai-lsp-style-val" style="color:#888;font-size:10px;">拖字幕改位置</span>
        </div>
        <div class="ai-lsp-style-actions">
          <button type="button" class="ai-lsp-reset-pos">重置位置</button>
          <button type="button" class="ai-lsp-reset-style">重置样式</button>
        </div>
      </div>
      <div class="ai-lsp-actions">
        <button type="button" class="ai-lsp-primary ai-lsp-load">加载字幕</button>
        <button type="button" class="ai-lsp-clear">清除记忆</button>
      </div>
      <div class="ai-lsp-hint">支持 .srt / .vtt / .ass · 按视频自动记住 · 直接拖动字幕改位置 · 字号/颜色全局记住</div>
    `;
    panel.addEventListener('click', (e) => e.stopPropagation());
    panel.querySelector('.ai-lsp-close').addEventListener('click', closeLocalSubPanel);
    panel.querySelector('.ai-lsp-load').addEventListener('click', () => openLocalSubFilePicker());
    panel.querySelector('.ai-lsp-clear').addEventListener('click', () => {
      clearLocalSubtitles();
      closeLocalSubPanel();
    });
    panel.querySelector('.ai-lsp-minus').addEventListener('click', () => {
      setLocalSubOffset((localSubState.offsetSec || 0) - 0.1);
    });
    panel.querySelector('.ai-lsp-plus').addEventListener('click', () => {
      setLocalSubOffset((localSubState.offsetSec || 0) + 0.1);
    });
    panel.querySelector('.ai-lsp-reset').addEventListener('click', () => {
      setLocalSubOffset(0);
    });
    panel.querySelector('.ai-lsp-toggle-input').addEventListener('change', (e) => {
      setLocalSubEnabled(e.target.checked);
    });
    panel.querySelector('.ai-lsp-size').addEventListener('input', (e) => {
      setLocalSubFontSize(e.target.value);
    });
    panel.querySelector('.ai-lsp-color').addEventListener('input', (e) => {
      setLocalSubColor(e.target.value);
    });
    panel.querySelector('.ai-lsp-reset-pos').addEventListener('click', () => {
      resetLocalSubPosition();
    });
    panel.querySelector('.ai-lsp-reset-style').addEventListener('click', () => {
      resetLocalSubStyle();
    });
    player.appendChild(panel);
    localSubState.panel = panel;
  }

  updateLocalSubControlUI();
}

let localSubVideoWatcher = null;
let localSubLastWatchedId = null;
function startLocalSubVideoWatcher() {
  if (localSubVideoWatcher) return;
  localSubVideoWatcher = setInterval(() => {
    ensureLocalSubControlUI();
    const videoId = getYoutubeVideoId();
    if (videoId && videoId !== localSubLastWatchedId) {
      localSubLastWatchedId = videoId;
      tryRestoreLocalSubForCurrentVideo({ silent: true });
    }
    if (!localSubState.cues.length) return;
    const video = getYoutubeVideo();
    if (video && video !== localSubState.video) {
      bindVideoListeners(video);
      ensureLocalSubOverlay();
    } else if (video) {
      ensureLocalSubOverlay();
    }
  }, 1000);
}

// Offset + enable + style prefs
chrome.storage.local.get(
  ['ytLocalSubOffset', 'ytLocalSubEnabled', 'ytLocalSubFontSize', 'ytLocalSubColor', 'ytLocalSubPosX', 'ytLocalSubPosY'],
  (res) => {
    if (res.ytLocalSubOffset !== undefined) localSubState.offsetSec = parseFloat(res.ytLocalSubOffset) || 0;
    if (res.ytLocalSubEnabled !== undefined) localSubState.enabled = res.ytLocalSubEnabled !== 'off';
    if (res.ytLocalSubFontSize !== undefined) {
      localSubState.fontSize = Math.max(12, Math.min(64, parseInt(res.ytLocalSubFontSize, 10) || 22));
    }
    if (res.ytLocalSubColor) localSubState.color = res.ytLocalSubColor;
    if (res.ytLocalSubPosX !== undefined) localSubState.posX = parseFloat(res.ytLocalSubPosX) || 50;
    if (res.ytLocalSubPosY !== undefined) localSubState.posY = parseFloat(res.ytLocalSubPosY) || 10;
    applyLocalSubStyle();
  }
);

chrome.storage.onChanged.addListener((changes) => {
  if (changes.ytLocalSubOffset) {
    localSubState.offsetSec = parseFloat(changes.ytLocalSubOffset.newValue) || 0;
    localSubState.lastCueIndex = -1;
    tickLocalSubtitles();
    updateLocalSubControlUI();
  }
  if (changes.ytLocalSubEnabled) {
    localSubState.enabled = changes.ytLocalSubEnabled.newValue !== 'off';
    if (!localSubState.enabled) setLocalSubVisibleText('');
    else tickLocalSubtitles();
    updateLocalSubControlUI();
  }
  if (changes.ytLocalSubFontSize) {
    localSubState.fontSize = Math.max(12, Math.min(64, parseInt(changes.ytLocalSubFontSize.newValue, 10) || 22));
    applyLocalSubStyle();
    updateLocalSubControlUI();
  }
  if (changes.ytLocalSubColor) {
    localSubState.color = changes.ytLocalSubColor.newValue || '#ffeb3b';
    applyLocalSubStyle();
    updateLocalSubControlUI();
  }
  if (changes.ytLocalSubPosX || changes.ytLocalSubPosY) {
    if (changes.ytLocalSubPosX) localSubState.posX = parseFloat(changes.ytLocalSubPosX.newValue) || 50;
    if (changes.ytLocalSubPosY) localSubState.posY = parseFloat(changes.ytLocalSubPosY.newValue) || 10;
    applyLocalSubPosition();
  }
});

if (window.location.hostname.includes('youtube.com')) {
  startLocalSubVideoWatcher();
  // Initial inject after controls appear + restore saved sub for this video
  const tryInject = () => {
    ensureLocalSubControlUI();
    tryRestoreLocalSubForCurrentVideo({ silent: true });
  };
  tryInject();
  setTimeout(tryInject, 800);
  setTimeout(tryInject, 2000);
  // YouTube SPA navigation
  document.addEventListener('yt-navigate-finish', () => {
    localSubLastWatchedId = null; // force restore check
    setTimeout(tryInject, 400);
    setTimeout(tryInject, 1200);
  });
  // Close panel when clicking elsewhere on player
  document.addEventListener('click', (e) => {
    if (!localSubState.panel || !localSubState.panel.classList.contains('ai-open')) return;
    const t = e.target;
    if (localSubState.panel.contains(t) || (localSubState.controlBtn && localSubState.controlBtn.contains(t))) return;
    closeLocalSubPanel();
  }, true);
}

// ── Screenshot OCR Translation ────────────────────────

let isOcrCropping = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_crop') {
    startOcrCropOverlay(request.image);
  } else if (request.action === 'close_all_ocr') {
    document.querySelectorAll('.ai-ocr-popup').forEach(p => p.remove());
  } else if (request.action === 'load_local_subtitles') {
    const result = loadLocalSubtitles({
      content: request.content,
      fileName: request.fileName,
      offsetSec: request.offsetSec
    });
    sendResponse(result);
    return true;
  } else if (request.action === 'clear_local_subtitles') {
    sendResponse(clearLocalSubtitles());
    return true;
  } else if (request.action === 'get_local_subtitle_status') {
    sendResponse(getLocalSubtitleStatus());
    return true;
  } else if (request.action === 'set_local_subtitle_offset') {
    localSubState.offsetSec = parseFloat(request.offsetSec) || 0;
    localSubState.lastCueIndex = -1;
    tickLocalSubtitles();
    sendResponse({ ok: true, offsetSec: localSubState.offsetSec });
    return true;
  } else if (request.action === 'set_local_subtitle_enabled') {
    const enabled = setLocalSubEnabled(!!request.enabled);
    sendResponse({ ok: true, enabled });
    return true;
  }
});

function startOcrCropOverlay(dataUrl) {
  if (isOcrCropping) return;
  isOcrCropping = true;

  const overlay = document.createElement('div');
  overlay.className = 'ai-crop-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    zIndex: '2147483647', cursor: 'crosshair', background: 'rgba(0,0,0,0.3)',
    userSelect: 'none'
  });
  
  const selection = document.createElement('div');
  Object.assign(selection.style, {
    position: 'fixed', border: '2px solid #1a73e8', background: 'rgba(26,115,232,0.2)',
    display: 'none', pointerEvents: 'none', boxSizing: 'border-box'
  });
  
  overlay.appendChild(selection);
  document.body.appendChild(overlay);

  let startX, startY;
  
  const onMouseDown = (e) => {
    startX = e.clientX;
    startY = e.clientY;
    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0px';
    selection.style.height = '0px';
    selection.style.display = 'block';
    
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
  };
  
  const onMouseMove = (e) => {
    const curX = e.clientX;
    const curY = e.clientY;
    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);
    
    selection.style.left = x + 'px';
    selection.style.top = y + 'px';
    selection.style.width = w + 'px';
    selection.style.height = h + 'px';
  };
  
  const onMouseUp = (e) => {
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('mouseup', onMouseUp);
    
    const curX = e.clientX;
    const curY = e.clientY;
    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);
    
    overlay.remove();
    isOcrCropping = false;
    document.removeEventListener('keydown', onKeyDown);
    
    if (w > 10 && h > 10) {
      processOcrCrop(dataUrl, x, y, w, h);
    }
  };
  
  overlay.addEventListener('mousedown', onMouseDown);
  
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      isOcrCropping = false;
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  document.addEventListener('keydown', onKeyDown);
}

function processOcrCrop(dataUrl, x, y, w, h) {
  // Center of the cropped area
  const cx = x + w / 2;
  const cy = y + h / 2;
  // Position the popup at the top-right relative to the center
  const popupX = cx;
  const popupY = Math.max(10, cy - 150); // Shift up a bit, ensure it stays on screen

  chrome.storage.local.get(['ocrOpacity', 'ocrBilingual', 'ocrFontColor'], (data) => {
    const opacity = data.ocrOpacity || '1';
    const isBilingual = data.ocrBilingual !== 'off';
    const fontColor = data.ocrFontColor || '#ffffff';
    const popup = createOcrPopup(popupX, popupY, opacity, isBilingual, fontColor);
    popup.setContent('Loading OCR & Translation...', '');
    
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(img, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);
      const croppedDataUrl = canvas.toDataURL('image/png');
      
      chrome.runtime.sendMessage({ type: 'process_ocr', imageData: croppedDataUrl }, (response) => {
        if (response && response.success) {
          if (!response.text) {
            popup.setContent('No text found in selection.', '');
          } else {
            const transText = response.translation || 'Translation failed';
            popup.setContent(isBilingual ? response.text : '', transText);
            popup.setOriginalText(response.text);
          }
        } else {
          popup.setContent('OCR Error: ' + (response ? response.error : 'Unknown'), '');
        }
      });
  };
  img.src = dataUrl;
  }); // Close chrome.storage.local.get callback
}

function createOcrPopup(x, y, initialOpacity = '1', isBilingual = true, fontColor = '#ffffff') {
  const popup = document.createElement('div');
  popup.className = 'ai-ocr-popup';
  Object.assign(popup.style, {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 300) + 'px',
    top: Math.min(y, window.innerHeight - 200) + 'px',
    width: '300px',
    minWidth: '150px',
    minHeight: '60px',
    backgroundColor: 'rgba(75, 75, 75, 0.95)',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'sans-serif',
    color: fontColor,
    opacity: initialOpacity,
    padding: '16px',
    textAlign: 'center',
    resize: 'both',
    overflow: 'auto',
    boxSizing: 'border-box'
  });



  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '6px',
    right: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#ccc',
    userSelect: 'none'
  });
  closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
  closeBtn.onmouseout = () => closeBtn.style.color = '#ccc';
  closeBtn.onclick = () => popup.remove();
  popup.appendChild(closeBtn);

  const contentArea = document.createElement('div');
  Object.assign(contentArea.style, {
    fontSize: '14px',
    lineHeight: '1.4',
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  });
  
  const origDiv = document.createElement('div');
  origDiv.className = 'ai-ocr-orig';
  origDiv.style.marginBottom = '8px';
  origDiv.style.color = fontColor;
  origDiv.style.opacity = '0.7';
  origDiv.style.fontSize = '12px';
  
  const transDiv = document.createElement('div');
  transDiv.className = 'ai-ocr-trans';
  transDiv.style.fontWeight = '400';
  transDiv.style.color = fontColor;

  contentArea.appendChild(origDiv);
  contentArea.appendChild(transDiv);
  popup.appendChild(contentArea);
  document.body.appendChild(popup);
  
  let isDragging = false;
  let dragStartX, dragStartY, initialLeft, initialTop;
  popup.onmousedown = (e) => {
    if (e.target === closeBtn) return;
    
    // Prevent drag if clicking near the bottom-right corner (resize handle) or scrollbars
    const rect = popup.getBoundingClientRect();
    if (e.clientX > rect.right - 30 && e.clientY > rect.bottom - 30) {
      return; // Bottom-right corner (resize handle)
    }
    if (e.clientX > rect.right - 16 || e.clientY > rect.bottom - 16) {
      return; // Scrollbars
    }
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialLeft = parseInt(popup.style.left);
    initialTop = parseInt(popup.style.top);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  };
  const onDrag = (e) => {
    if (!isDragging) return;
    popup.style.left = (initialLeft + e.clientX - dragStartX) + 'px';
    popup.style.top = (initialTop + e.clientY - dragStartY) + 'px';
  };
  const stopDrag = () => {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  };

  chrome.storage.local.get(['ocrAutoClose', 'ocrAutoCloseTime'], (res) => {
    if (res.ocrAutoClose === 'on') {
      const timeMs = (parseInt(res.ocrAutoCloseTime) || 10) * 1000;
      setTimeout(() => { if (document.body.contains(popup)) popup.remove(); }, timeMs);
    }
  });

  return {
    setContent: (orig, trans) => {
      origDiv.textContent = orig;
      origDiv.style.display = orig ? 'block' : 'none';
      transDiv.textContent = trans;
    },
    setOriginalText: (text) => {}
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'update_ocr_opacity') {
    document.querySelectorAll('.ai-ocr-popup').forEach(p => {
      p.style.opacity = request.opacity;
    });
    if (sendResponse) sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'update_ocr_font_color') {
    document.querySelectorAll('.ai-ocr-popup').forEach(p => {
      p.style.color = request.color;
      const divs = p.querySelectorAll('div > div');
      divs.forEach(d => { d.style.color = request.color; });
    });
    if (sendResponse) sendResponse({ ok: true });
    return true;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ocr_progress') {
    const p = request.progress;
    if (!p) return;
    const percent = Math.round((p.progress || 0) * 100);
    let msg = '';
    if (p.status === 'downloading tesseract core') msg = `Downloading Core Engine... ${percent}%`;
    else if (p.status === 'downloading language model') msg = `Downloading OCR Model... ${percent}%`;
    else return;

    document.querySelectorAll('.ai-ocr-popup').forEach(popup => {
       const origDiv = popup.querySelector('.ai-ocr-orig');
       if (origDiv && (origDiv.textContent.includes('Loading') || origDiv.textContent.includes('Downloading'))) {
         origDiv.textContent = msg;
         origDiv.style.display = 'block';
       }
    });
  }
});
