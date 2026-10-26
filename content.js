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

let showReaderCapsule = true;
let readerCapsuleDiv = null;
let excludedDomainsRaw = '';

chrome.storage.local.get(['showReaderCapsule', 'excludedDomains'], (res) => {
  if (res.showReaderCapsule !== undefined) showReaderCapsule = res.showReaderCapsule;
  if (res.excludedDomains !== undefined) excludedDomainsRaw = res.excludedDomains;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.showReaderCapsule !== undefined) {
    showReaderCapsule = changes.showReaderCapsule.newValue;
    updateReaderCapsule();
  }
  if (changes.excludedDomains !== undefined) {
    excludedDomainsRaw = changes.excludedDomains.newValue || '';
  }
});

function isDomainExcluded() {
  const host = window.location.hostname.toLowerCase();
  if (!host || !excludedDomainsRaw) return false;
  const list = excludedDomainsRaw.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.some(d => host === d || host.endsWith('.' + d));
}

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

/* Tooltip Light Mode (Glassmorphism) */
#ai-web-translator-tooltip {
  position: absolute;
  z-index: 2147483647;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(220, 224, 230, 0.8);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04);
  font-size: 14px;
  color: #1a1a1a;
  max-width: 360px;
  word-wrap: break-word;
  display: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  animation: ai-bubble-pop 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
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
  border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
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
#ai-web-translator-tooltip .speak-btn,
#ai-web-translator-tooltip .action-btn {
  float: left;
  margin-right: 8px;
  margin-top: 2px;
  cursor: pointer;
  opacity: 0.55;
  font-size: 14px;
  user-select: none;
  transition: opacity 0.2s, transform 0.15s;
}
#ai-web-translator-tooltip .speak-btn:hover,
#ai-web-translator-tooltip .action-btn:hover {
  opacity: 1;
  transform: scale(1.15);
}

/* Tooltip Toast */
.ai-tooltip-toast {
  position: absolute;
  top: 8px;
  right: 12px;
  background: rgba(16, 185, 129, 0.95);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 10;
}
.ai-tooltip-toast.show {
  opacity: 1;
  transform: translateY(0);
}

/* Floating spherical translation bubble */
#ai-web-translator-bubble {
  position: absolute;
  z-index: 2147483647;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a73e8, #1557b0);
  color: #ffffff;
  box-shadow: 0 3px 10px rgba(26, 115, 232, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.16s ease;
  animation: ai-bubble-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-sizing: border-box;
}
#ai-web-translator-bubble:hover {
  transform: scale(1.18);
  box-shadow: 0 5px 14px rgba(26, 115, 232, 0.55), 0 2px 4px rgba(0, 0, 0, 0.25);
}
#ai-web-translator-bubble:active {
  transform: scale(0.95);
}
@keyframes ai-bubble-pop {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* Floating Reader Capsule */
#ai-reader-capsule {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483646;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05);
  border-radius: 9999px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 12px;
  color: #1f2937;
  user-select: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
#ai-reader-capsule:hover {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18), 0 3px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
#ai-reader-capsule .capsule-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  display: inline-block;
}
#ai-reader-capsule.translating .capsule-status-dot {
  background-color: #3b82f6;
  animation: ai-pulse 1.2s infinite;
}
@keyframes ai-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.3); }
}
#ai-reader-capsule .capsule-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 12px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: pointer;
  color: inherit;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
#ai-reader-capsule .capsule-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}
#ai-reader-capsule .capsule-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #888;
  padding: 0 2px;
  line-height: 1;
}
#ai-reader-capsule .capsule-close-btn:hover {
  color: #ef4444;
}

/* Tooltip Dark Mode */
@media (prefers-color-scheme: dark) {
  #ai-web-translator-tooltip {
    background: rgba(32, 33, 36, 0.88);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    color: #e8eaed;
  }
  #ai-web-translator-tooltip .tooltip-header {
    color: #9aa0a6;
  }
  #ai-web-translator-original-container {
    border-bottom-color: rgba(255, 255, 255, 0.15);
  }
  #ai-web-translator-result-container {
    color: #f1f3f4;
  }
  #ai-web-translator-bubble {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(59, 130, 246, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
  #ai-reader-capsule {
    background: rgba(36, 37, 38, 0.88);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    color: #e4e6eb;
  }
  #ai-reader-capsule .capsule-btn {
    background: rgba(255, 255, 255, 0.1);
  }
  #ai-reader-capsule .capsule-btn:hover {
    background: rgba(255, 255, 255, 0.18);
  }
  #ai-reader-capsule .capsule-close-btn {
    color: #aaa;
  }
  #ai-reader-capsule .capsule-close-btn:hover {
    color: #f87171;
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
let translatedNodes = new WeakSet();

function markTextNode(node) {
  if (node) {
    translatedNodes.add(node);
  }
}

function isTextTranslated(node) {
  if (!node) return false;
  return translatedNodes.has(node) ||
    node.parentElement?.closest('.ai-pair') !== null;
}

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'ARTICLE', 'SECTION', 'MAIN', 'ASIDE', 'NAV', 'HEADER', 'FOOTER',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'FIGCAPTION', 'DD', 'DT'
]);

function getBlockContainer(node) {
  let curr = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (BLOCK_TAGS.has(curr.tagName)) return curr;
    curr = curr.parentElement;
  }
  return (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) || document.body;
}

// ── Translate page (Viewport-First Active Dynamic Translation) ──

let pageTranslationObserver = null;
let pageTranslationMutationObserver = null;
let pendingPageTranslations = new Set();
let pageTranslateTimeout = null;
let elementsToObserve = new Map();
let isTranslating = false;
let activeBatchCount = 0;

function getOrCreateReaderCapsule() {
  if (readerCapsuleDiv) return readerCapsuleDiv;
  readerCapsuleDiv = document.createElement('div');
  readerCapsuleDiv.id = 'ai-reader-capsule';
  readerCapsuleDiv.innerHTML = `
    <span class="capsule-status-dot"></span>
    <span class="capsule-text" id="ai-capsule-text">Ready</span>
    <button class="capsule-btn" id="ai-capsule-mode-btn" title="Toggle Mode">Bilingual</button>
    <button class="capsule-close-btn" id="ai-capsule-restore-btn" title="Restore Original (✕)">✕</button>
  `;
  document.body.appendChild(readerCapsuleDiv);

  const modeBtn = readerCapsuleDiv.querySelector('#ai-capsule-mode-btn');
  const restoreBtn = readerCapsuleDiv.querySelector('#ai-capsule-restore-btn');

  modeBtn.addEventListener('click', () => {
    const newMode = currentMode === 'translate-only' ? 'bilingual' : 'translate-only';
    restorePage();
    translatePage(newMode, currentSource, currentTarget);
  });

  restoreBtn.addEventListener('click', () => {
    restorePage();
  });

  return readerCapsuleDiv;
}

function updateReaderCapsule() {
  if (!showReaderCapsule || !isTranslated) {
    if (readerCapsuleDiv) readerCapsuleDiv.style.display = 'none';
    return;
  }
  const cap = getOrCreateReaderCapsule();
  cap.style.display = 'flex';
  const textEl = cap.querySelector('#ai-capsule-text');
  const modeBtn = cap.querySelector('#ai-capsule-mode-btn');

  if (isTranslating) {
    cap.classList.add('translating');
    textEl.textContent = `Translating... (${translatedCount})`;
  } else {
    cap.classList.remove('translating');
    textEl.textContent = `Translated: ${translatedCount}`;
  }

  modeBtn.textContent = currentMode === 'translate-only' ? 'Single' : 'Bilingual';
}

function notifyStatusChange() {
  updateReaderCapsule();
  try {
    chrome.runtime.sendMessage({
      type: 'page_translation_status',
      isTranslated,
      isTranslating,
      count: translatedCount,
      mode: currentMode,
      sourceLang: currentSource,
      targetLang: currentTarget
    }).catch(() => {});
  } catch (e) {}
}

function isInViewport(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return (
    rect.bottom >= -200 &&
    rect.top <= vh + 300 &&
    rect.right >= -50 &&
    rect.left <= vw + 50
  );
}

let isBatchRunning = false;
let scrollCheckTimeout = null;

function onWindowScroll() {
  if (!isTranslated || elementsToObserve.size === 0) return;
  if (scrollCheckTimeout) return;
  scrollCheckTimeout = setTimeout(() => {
    scrollCheckTimeout = null;
    let found = false;
    for (const [el, entries] of elementsToObserve.entries()) {
      if (isInViewport(el)) {
        pendingPageTranslations.add(el);
        found = true;
      }
    }
    if (found) {
      schedulePageTranslationBatch();
    }
  }, 200);
}

function schedulePageTranslationBatch() {
  if (!isTranslated) return;
  if (pageTranslateTimeout) return;
  pageTranslateTimeout = setTimeout(() => {
    pageTranslateTimeout = null;
    processPageTranslationBatch();
  }, 100);
}

async function processPageTranslationBatch() {
  if (!isTranslated) return;
  if (isBatchRunning) {
    schedulePageTranslationBatch();
    return;
  }
  if (pendingPageTranslations.size === 0) {
    if (activeBatchCount === 0) {
      isTranslating = false;
      notifyStatusChange();
    }
    return;
  }

  isBatchRunning = true;
  isTranslating = true;
  activeBatchCount++;
  notifyStatusChange();

  try {
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
    if (validEntries.length === 0) {
      activeBatchCount--;
      return;
    }

    const CHUNK = 20;

    for (let i = 0; i < validEntries.length; i += CHUNK) {
      if (!isTranslated) break;

      const chunkEntries = validEntries.slice(i, i + CHUNK);
      const chunkTexts = chunkEntries.map(e => e.text);

      let resp = null;
      try {
        resp = await chrome.runtime.sendMessage({
          type: 'translate',
          texts: chunkTexts,
          sourceLang: currentSource,
          targetLang: currentTarget
        });
      } catch (e) {
        console.warn('Translation batch error:', e);
      }

      if (!isTranslated) break;

      if (resp?.translations && !resp.error) {
        let chunkApplied = 0;
        for (const { node, text } of chunkEntries) {
          const translated = resp.translations[text];
          if (!translated || translated === text) continue;

          if (currentMode === 'translate-only') {
            if (!originalMap.has(node)) {
              originalMap.set(node, text);
            }
            node.textContent = translated;
            markTextNode(node);
          } else {
            applyBilingual(node, text, translated);
            markTextNode(node);
          }
          chunkApplied++;
        }
        translatedCount += chunkApplied;
        notifyStatusChange();
      } else {
        // Translation failed or error returned: put unapplied nodes back into elementsToObserve
        for (const item of chunkEntries) {
          if (item.node.parentNode && !isTextTranslated(item.node)) {
            const container = getBlockContainer(item.node);
            if (!elementsToObserve.has(container)) {
              elementsToObserve.set(container, []);
              if (pageTranslationObserver) pageTranslationObserver.observe(container);
            }
            elementsToObserve.get(container).push(item);
          }
        }
      }
    }

    activeBatchCount--;
  } finally {
    isBatchRunning = false;
    if (pendingPageTranslations.size > 0) {
      schedulePageTranslationBatch();
    } else if (activeBatchCount === 0) {
      isTranslating = false;
      notifyStatusChange();
    }
  }
}

function observeNewNodes(root) {
  if (!isTranslated) return;
  const textEntries = gatherTexts(root);
  const newElements = new Map();
  for (const entry of textEntries) {
    const container = getBlockContainer(entry.node);
    if (!container) continue;
    if (!elementsToObserve.has(container) && !newElements.has(container)) {
      newElements.set(container, []);
    }
    const map = newElements.has(container) ? newElements : elementsToObserve;
    map.get(container).push(entry);
  }

  let hasViewportNew = false;
  for (const [el, entries] of newElements.entries()) {
    elementsToObserve.set(el, entries);
    if (isInViewport(el)) {
      pendingPageTranslations.add(el);
      hasViewportNew = true;
    } else if (pageTranslationObserver) {
      pageTranslationObserver.observe(el);
    }
  }

  if (hasViewportNew) {
    schedulePageTranslationBatch();
  }
}

async function translatePage(mode, sourceLang, targetLang) {
  if (isDomainExcluded()) {
    console.log('[Nano Translator] Current domain is excluded from page translation.');
    return 0;
  }
  currentMode = mode;
  currentSource = sourceLang;
  currentTarget = targetLang;
  isTranslated = true;
  isTranslating = true;
  notifyStatusChange();

  window.removeEventListener('scroll', onWindowScroll);
  window.addEventListener('scroll', onWindowScroll, { passive: true });

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
  }, { rootMargin: '400px 0px 400px 0px' });

  // Gather texts across body grouped by block container
  const textEntries = gatherTexts(document.body);
  const newElements = new Map();
  for (const entry of textEntries) {
    const container = getBlockContainer(entry.node);
    if (!container) continue;
    if (!elementsToObserve.has(container) && !newElements.has(container)) {
      newElements.set(container, []);
    }
    const map = newElements.has(container) ? newElements : elementsToObserve;
    map.get(container).push(entry);
  }

  const immediateElements = [];
  for (const [el, entries] of newElements.entries()) {
    elementsToObserve.set(el, entries);
    if (isInViewport(el)) {
      immediateElements.push(el);
    } else {
      pageTranslationObserver.observe(el);
    }
  }

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

  // Immediately process current viewport text and wait for this initial batch
  if (immediateElements.length > 0) {
    for (const el of immediateElements) {
      pendingPageTranslations.add(el);
    }
    await processPageTranslationBatch();
  } else if (pendingPageTranslations.size > 0) {
    await processPageTranslationBatch();
  } else {
    isTranslating = false;
    notifyStatusChange();
  }

  return translatedCount;
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
  isTranslated = false;
  isTranslating = false;
  activeBatchCount = 0;
  isBatchRunning = false;

  window.removeEventListener('scroll', onWindowScroll);

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
  translatedNodes = new WeakSet();

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
  notifyStatusChange();
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
      sendResponse({ status: 'done', count: translatedCount });
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
      isTranslating,
      mode: currentMode,
      count: translatedCount,
      sourceLang: currentSource,
      targetLang: currentTarget
    });
    return true;
  }

  if (request.action === 'update_capsule_visibility') {
    showReaderCapsule = !!request.show;
    updateReaderCapsule();
    sendResponse({ ok: true });
    return true;
  }
});

// Notify popup that content script is ready
chrome.runtime.sendMessage({ type: 'content_ready' }).catch(() => { });

// ============================================
// Select-to-Translate & Floating Bubble Feature
// ============================================
let s2tTranslateEnabled = true;
let isExtEnabled = true;
let s2tTriggerMode = 'bubble';

chrome.storage.local.get(['s2tTranslate', 'isEnabled', 'selectToTranslate', 's2tTriggerMode'], (res) => {
  if (res.s2tTranslate !== undefined) {
    s2tTranslateEnabled = (res.s2tTranslate === 'on');
  } else if (res.selectToTranslate !== undefined) {
    s2tTranslateEnabled = (res.selectToTranslate === 'on');
  }
  if (res.isEnabled !== undefined) isExtEnabled = res.isEnabled;
  if (res.s2tTriggerMode) s2tTriggerMode = res.s2tTriggerMode;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.s2tTranslate) {
    s2tTranslateEnabled = (changes.s2tTranslate.newValue === 'on');
  }
  if (changes.isEnabled) {
    isExtEnabled = changes.isEnabled.newValue;
  }
  if (changes.s2tTriggerMode) {
    s2tTriggerMode = changes.s2tTriggerMode.newValue || 'bubble';
  }
});

let tooltipDiv = null;
let tooltipOriginal = null;
let tooltipResult = null;
let bubbleDiv = null;
let currentSelectedText = '';

async function showSelectionTranslation(text, pageX, pageY) {
  if (!text) return;
  if (bubbleDiv) bubbleDiv.style.display = 'none';

  const tooltip = createTooltip();
  tooltipOriginal.textContent = text;
  tooltipResult.style.display = 'block';
  tooltipResult.textContent = 'Translating...';
  tooltipDiv.querySelector('#ai-web-translator-speak-res').style.display = 'none';
  const copyBtn = tooltipDiv.querySelector('#ai-web-translator-copy-res');
  if (copyBtn) copyBtn.style.display = 'none';

  let tx = pageX + 8;
  let ty = pageY + 10;
  const maxTx = window.scrollX + document.documentElement.clientWidth - 380;
  if (tx > maxTx) tx = Math.max(window.scrollX + 10, maxTx);
  tooltip.style.left = `${tx}px`;
  tooltip.style.top = `${ty}px`;
  tooltip.style.display = 'block';

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
      if (copyBtn) copyBtn.style.display = 'block';
    } else {
      tooltipResult.textContent = 'Translation failed. Built-in AI may not be ready.';
    }
  } catch (err) {
    tooltipResult.textContent = 'Error: Could not connect to extension background.';
  }
}

function createBubble() {
  if (bubbleDiv) return bubbleDiv;
  bubbleDiv = document.createElement('div');
  bubbleDiv.id = 'ai-web-translator-bubble';
  bubbleDiv.setAttribute('title', 'Translate');
  bubbleDiv.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 8 6 6"/>
      <path d="m4 14 6-6 2-3"/>
      <path d="M2 5h12"/>
      <path d="M7 2h1"/>
      <path d="m22 22-5-10-5 10"/>
      <path d="M14 18h6"/>
    </svg>
  `;
  document.body.appendChild(bubbleDiv);

  // Prevent mousedown from clearing the text selection
  bubbleDiv.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  bubbleDiv.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showSelectionTranslation(currentSelectedText, e.pageX, e.pageY);
  });

  return bubbleDiv;
}

function createTooltip() {
  if (tooltipDiv) return tooltipDiv;
  tooltipDiv = document.createElement('div');
  tooltipDiv.id = 'ai-web-translator-tooltip';
  tooltipDiv.innerHTML = `
    <div class="tooltip-header">
      <span>Nano local translator</span>
      <span class="star">✧</span>
    </div>
    <div id="ai-web-translator-toast" class="ai-tooltip-toast">Copied!</div>
    <div id="ai-web-translator-original-container" class="text-container">
      <span id="ai-web-translator-speak-orig" class="speak-btn" title="Speak Original">🔊</span>
      <span id="ai-web-translator-original"></span>
    </div>
    <div id="ai-web-translator-result-container" class="text-container">
      <span id="ai-web-translator-speak-res" class="speak-btn" title="Speak Translation" style="display:none;">🔊</span>
      <span id="ai-web-translator-copy-res" class="action-btn" title="Copy Translation" style="display:none;">📋</span>
      <span id="ai-web-translator-result"></span>
    </div>
  `;
  document.body.appendChild(tooltipDiv);
  tooltipOriginal = tooltipDiv.querySelector('#ai-web-translator-original');
  tooltipResult = tooltipDiv.querySelector('#ai-web-translator-result');
  const speakOrigBtn = tooltipDiv.querySelector('#ai-web-translator-speak-orig');
  const speakResBtn = tooltipDiv.querySelector('#ai-web-translator-speak-res');
  const copyResBtn = tooltipDiv.querySelector('#ai-web-translator-copy-res');
  const toastEl = tooltipDiv.querySelector('#ai-web-translator-toast');

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

  copyResBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const text = tooltipResult.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (toastEl) {
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 1200);
      }
    } catch (err) {}
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
  if (isDomainExcluded()) return;
  if (!isContextValid()) return;
  if (!isExtEnabled) return;
  if (!s2tTranslateEnabled) return;
  if (tooltipDiv && tooltipDiv.contains(e.target)) return;
  if (bubbleDiv && bubbleDiv.contains(e.target)) return;

  if (s2tTriggerMode === 'alt' && !e.altKey) return;
  if (s2tTriggerMode === 'ctrl' && !e.ctrlKey && !e.metaKey) return;

  setTimeout(() => {
    if (!isContextValid()) return;
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (text.length > 0 && text.length < 3000) {
      currentSelectedText = text;

      try {
        const p = chrome.runtime.sendMessage({ type: 'stopSpeak' });
        if (p && typeof p.catch === 'function') p.catch(() => { });
      } catch (err) { }

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        const lastRect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();

        let posX = window.scrollX + lastRect.right + 6;
        let posY = window.scrollY + lastRect.bottom - 20;

        const maxRight = window.scrollX + document.documentElement.clientWidth - 35;
        if (posX > maxRight) {
          posX = window.scrollX + lastRect.left - 30;
        }
        if (posX < window.scrollX + 5) posX = window.scrollX + 5;
        if (posY < window.scrollY + 5) posY = window.scrollY + 5;

        if (s2tTriggerMode === 'direct') {
          showSelectionTranslation(text, posX, posY);
        } else {
          const bubble = createBubble();
          bubble.style.left = `${posX}px`;
          bubble.style.top = `${posY}px`;
          bubble.style.display = 'flex';
        }
      }
    } else if (text.length === 0) {
      if (bubbleDiv) bubbleDiv.style.display = 'none';
      if (tooltipDiv) tooltipDiv.style.display = 'none';
      currentSelectedText = '';
      try {
        const p = chrome.runtime.sendMessage({ type: 'stopSpeak' });
        if (p && typeof p.catch === 'function') p.catch(() => { });
      } catch (err) { }
    }
  }, 10);
}

function onMouseDown(e) {
  if (!isContextValid()) return;
  if (bubbleDiv && !bubbleDiv.contains(e.target)) {
    bubbleDiv.style.display = 'none';
  }
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
    if (isDomainExcluded()) return;
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
      const copyBtn = tooltipDiv.querySelector('#ai-web-translator-copy-res');
      if (copyBtn) copyBtn.style.display = 'none';
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
        if (copyBtn) copyBtn.style.display = 'block';
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
  let lastProcessedSubText = '';
  let subDebounceTimer = null;

  async function handleNewSubtitle(segment) {
    if (isDomainExcluded()) return;
    const text = extractOriginalText(segment);
    if (!text) return;
    
    const currentTranslated = segment.getAttribute('data-translated-text');
    if (currentTranslated === text) return;
    
    segment.setAttribute('data-translated-text', text);

    if (translatedCache.has(text)) {
      applySubtitleTranslation(segment, text, translatedCache.get(text));
      return;
    }

    // Prefix-matching deduplication: if words are arriving progressively in quick succession
    if (lastProcessedSubText && text.startsWith(lastProcessedSubText) && (text.length - lastProcessedSubText.length < 15)) {
      clearTimeout(subDebounceTimer);
      subDebounceTimer = setTimeout(() => {
        pendingTranslations.set(segment, text);
        if (!translateTimeout) {
          translateTimeout = setTimeout(processPendingTranslations, 150);
        }
      }, 150);
      lastProcessedSubText = text;
      return;
    }
    lastProcessedSubText = text;

    pendingTranslations.set(segment, text);
    if (!translateTimeout) {
      translateTimeout = setTimeout(processPendingTranslations, 180);
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

// ── Screenshot OCR Translation ────────────────────────

let isOcrCropping = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_crop') {
    startOcrCropOverlay(request.image);
  } else if (request.action === 'close_all_ocr') {
    document.querySelectorAll('.ai-ocr-popup').forEach(p => p.remove());
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
