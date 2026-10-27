# Nano Local AI Translator Technical Manual

## 1. Project Overview
Nano Local AI Translator (Bilingual Web Reader) is a lightweight, privacy-focused Chrome extension that leverages Chrome's Built-in AI (Translator API / Gemini Nano) to translate web pages locally. It operates entirely on-device without relying on external cloud services.

## 2. Technology Stack
- **Extension Framework**: Chrome Extension Manifest V3 (MV3)
- **Core Languages**: Vanilla HTML, CSS, JavaScript (Zero external framework overhead)
- **Core APIs**:
  - Chrome Built-in Translator API (`window.ai.translator` / `Translator.create`)
  - Chrome Built-in LanguageDetector API (`window.ai.languageDetector`)
  - Chrome Storage API (`chrome.storage.local`)
  - Chrome TTS & Offscreen API (`chrome.tts`, `chrome.offscreen`)
  - Chrome Clipboard API (`navigator.clipboard`)

## 3. Project Structure
```text
.
├── manifest.json       # Extension configuration file (permissions, shortcuts, content scripts)
├── background.js       # Service Worker: API calls, persistent LRU caching, model download monitor, TTS
├── content.js          # Injected content script: DOM traversal, streaming translation, reader capsule, bubble UI
├── popup/
│   ├── popup.html      # Popup UI structure (controls, settings, download progress)
│   ├── popup.css       # Popup styling, dark mode, animation tokens
│   └── popup.js        # Popup logic: live status synchronization, i18n, setting persistence
├── img/                # Extension icons, QR codes, and static visual assets
├── README.md           # Project description & user guide
├── manual.md           # Technical manual and developer reference
└── SystemPrompt.md     # AI system prompt for development
```

## 4. Core Features & Technical Architecture

### 4.1 Viewport-First Active Streaming Translation (活动式流式翻译)
- **Problem Solved**: Traditional extensions parse and translate the entire document all-at-once, resulting in significant delays, unresponsive pages on long articles, and desynchronized button states.
- **Viewport-First Partitioning**:
  - Upon clicking "Translate Page" or pressing `Alt+T`, `content.js` partitions text nodes into immediate viewport elements (`isInViewport(el)`) and offscreen elements.
  - Viewport elements are translated immediately in prioritized small batches (`CHUNK = 20`), streaming translated text into the DOM as chunks resolve.
- **Lazy Dynamic Traversal**:
  - Offscreen elements are registered with an `IntersectionObserver` configured with a 300px lookahead buffer (`rootMargin: '300px 0px 300px 0px'`).
  - As the user scrolls downwards, entering elements trigger debounced batch translation requests.
- **Dynamic Content Support**:
  - A `MutationObserver` watches for dynamically added nodes (infinite scroll feeds, single-page applications) and automatically schedules them for observation.
- **Synchronized Status Bus**:
  - Status updates (`isTranslated`, `isTranslating`, `translatedCount`) are dispatched via `page_translation_status` messages, updating both the popup UI (showing `Translating...` with spinner) and the on-page floating reader capsule.
  - The Translate Page / Restore Original button serves as the toggle for active translation.

### 4.2 Selection Bubble, Trigger Modes & Glassmorphic Tooltip
- **Floating Bubble**:
  - On text selection (`mouseup`), a mini spherical button (`#ai-web-translator-bubble`) appears next to the cursor, avoiding unwanted tooltip popups when users merely copy or highlight text.
  - Clicking the bubble triggers `showSelectionTranslation`, opening the translation card.
- **Configurable Trigger Modes (`s2tTriggerMode`)**:
  - `bubble`: Default behavior; displays floating bubble on select.
  - `alt`: Only triggers when the user holds the `Alt` key while selecting text.
  - `ctrl`: Only triggers when the user holds `Ctrl` (or `Cmd` on macOS) while selecting text.
  - `direct`: Bypasses the bubble and directly opens the tooltip translation card.
- **Glassmorphic UI & 1-Click Copy**:
  - The tooltip is built with `backdrop-filter: blur(16px)` and supports automated dark mode switching.
  - Features an integrated copy button (`📋`) that uses `navigator.clipboard.writeText` and renders an animated transient confirmation Toast (`.ai-tooltip-toast`).

### 4.3 On-Page Floating Reader Capsule (`#ai-reader-capsule`)
- **Lifecycle & Insertion**:
  - Injected directly into the DOM when page translation is active and `showReaderCapsule` is enabled.
- **Real-Time Indicators & Controls**:
  - Displays dynamic status: pulsing indicator when active batches are translating, and total translated node count when idle.
  - Embedded Mode Switcher: 1-click toggle between Single Translation (`translate-only`) and Bilingual Comparison (`bilingual`).
  - Instant Restore (`✕`): Immediately removes all bilingual spans/restores original text and disengages active observers.

### 4.4 Persistent Offline Caching & Resource Management
- **Cross-Restart Persistent Cache**:
  - To prevent cache loss caused by MV3 Service Worker auto-termination (~30s idle), `background.js` synchronizes its in-memory LRU cache with `chrome.storage.local` (`persistentTranslationCache`) using a 2-second debounce.
  - On startup, the service worker restores cached translations into memory instantly.
- **Offscreen Document Auto-Close**:
  - The offscreen document (used for TTS audio rendering) automatically terminates after 60 seconds of inactivity to conserve system memory and browser processes.
- **Model Download Progress**:
  - Listens to Chrome Translator's `monitor.addEventListener('downloadprogress')` and broadcasts progress (`loaded`, `total`, `percent`) to display an animated progress bar in the popup UI.

### 4.5 Domain Exclusion Filtering
- **Mechanism**:
  - Maintains user-defined domain exclusion lists (`excludedDomains`) in `chrome.storage.local`.
  - Content scripts evaluate `window.location.hostname` against the exclusion list.
  - If a domain matches, page translation, selection bubbles, hover lookups, and subtitle interception are completely bypassed.

### 4.6 YouTube Dual Subtitles with Sibling Visual Line Architecture
- **Caption Interception & Isolation**:
  - Uses `MutationObserver` on `.ytp-caption-window-container`.
  - Instead of injecting `<br>` and `<span>` directly into `.ytp-caption-segment` (which breaks YouTube's streaming text nodes and causes newly spoken words to append inside the translation line), translations are rendered as independent sibling visual lines (`.caption-visual-line.ai-yt-sub-line`).
  - Native YouTube caption nodes remain 100% untouched and original text never leaks into the translated line.
- **Progressive Prefix Deduplication**:
  - Streaming YouTube subtitles often arrive word-by-word (e.g., "The weather" → "The weather is" → "The weather is great").
  - `handleNewSubtitleLine` detects growing prefix sequences within a 120ms window, delaying batch processing until phrase boundaries settle and avoiding duplicate translations.
- **Custom Styling & Positioning**:
  - Supports custom font color, opacity, and positioning (above or below original captions) with dynamic hot-reloading when settings change.

### 4.7 Lightweight Distribution & On-Demand OCR Dependencies
- **Ultra-Lightweight Core**:
  - Heavy OCR binaries (Tesseract WASM & worker, ~4.8MB) are excluded from the git repository and extension package, shrinking the core extension to ~200KB.
- **One-Command Setup**:
  - Users who need Screenshot OCR (Alt+S) can download the required libraries on demand via `npm run setup-ocr` or `node scripts/download_ocr_libs.js`.
  - The offscreen document and popup settings provide graceful status guidance if OCR binaries are not yet installed.

### 4.8 Dual Engine Architecture (Chrome Built-in vs. Custom LLM)
- **Chrome Built-in AI**: Zero configuration, 100% on-device Gemini Nano inference.
- **Custom OpenAI-Compatible Engine**:
  - Targets local inference backends (Ollama, LM Studio) or OpenAI-compatible endpoints (`/v1/chat/completions`).
  - Offers user-configurable concurrency limits (1-10 simultaneous requests) and batch context limits (2-30 sentences per request).

## 5. Key APIs & Requirements
- **Browser Requirement**: Google Chrome version 138 or higher.
- **Flags to Enable**:
  - `chrome://flags/#translation-api` -> Enabled
  - `chrome://flags/#optimization-guide-on-device-model` -> Enabled BypassPrefRequirement
- **Required Manifest Permissions**:
  - `storage`: For configuration and persistent translation cache.
  - `activeTab`: For content script communication and tab management.
  - `tts`: For text-to-speech pronunciation.
  - `offscreen`: For fallback audio playback.
  - `clipboardWrite`: For 1-click translation copying.

## 6. Developer & Debugging Guide
1. **Testing Translator API Availability**:
   Run `await window.ai.translator.capabilities()` or `await window.translation.canTranslate({sourceLanguage:'en', targetLanguage:'zh'})` in DevTools console.
2. **Debugging Background Service Worker**:
   Open `chrome://extensions/` and click the "service worker" link to view background logs and persistent cache status.
3. **Debugging Content Scripts & Capsule**:
   Inspect active pages with DevTools (F12) to verify `elementsToObserve`, `pendingPageTranslations`, and DOM mutation events.
4. **Monitoring Local Model Downloads**:
   Visit `chrome://on-device-translation-internals` to monitor local component downloading, model status, and cache partitions.
