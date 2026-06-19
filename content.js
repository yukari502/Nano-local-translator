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
      document.querySelectorAll('.ai-yt-sub').forEach(span => {
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
    }
    if (changes.ytSubColor) {
      ytSubConfig.color = changes.ytSubColor.newValue;
      translatedCache.clear();
      updateExistingSubs();
    }
    if (changes.ytSubOpacity) {
      ytSubConfig.opacity = changes.ytSubOpacity.newValue;
      translatedCache.clear();
      updateExistingSubs();
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

