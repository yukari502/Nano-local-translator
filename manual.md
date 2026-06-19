# Nano local translator Technical Manual

## 1. Project Overview
Nano local translator is a lightweight, privacy-focused Chrome extension that leverages Chrome's Built-in AI (Translator API) to translate web pages locally. It operates entirely on-device without relying on external cloud services.

## 2. Technology Stack
- **Extension Framework**: Chrome Extension Manifest V3 (MV3)
- **Core Languages**: Vanilla HTML, CSS, JavaScript (No frameworks like React/Vue)
- **Core APIs**: Chrome Built-in Translator API (Gemini Nano), Chrome TTS API, Chrome Storage API

## 3. Project Structure
```text
.
├── manifest.json       # Extension configuration file (permissions, scripts)
├── background.js       # Service Worker for calling the Translator API, caching, and TTS
├── content.js          # Content script injected into pages (DOM traversal, UI interactions)
├── popup/
│   ├── popup.html      # Popup UI structure
│   ├── popup.css       # Popup UI styling
│   └── popup.js        # Popup logic (user settings, i18n, interactions)
├── img/                # Extension icons and static assets
├── README.md           # Project description
└── SystemPrompt.md     # AI system prompt for development
```

## 4. Core Features & Technical Implementation

### 4.1 Web Page Translation Mechanism (DOM Traversal & Mutation)
- **Text Extraction**: Uses `TreeWalker` in `content.js` to traverse the DOM, filtering out non-translatable tags (e.g., `SCRIPT`, `STYLE`, `CODE`) and hidden elements, collecting valid text nodes.
- **Batch Processing**: Extracted texts are sent to `background.js` in chunks (currently set to 20) to prevent blocking requests or oversized data transfer.
- **Auto-Detect Language**: Utilizes Chrome's built-in AI `LanguageDetector` API (with a stable `chrome.i18n` fallback) to seamlessly detect the source language on-the-fly when set to "Auto Detect".
- **Execution**: `background.js` instantiates the translator via `Translator.create` and translates chunks iteratively using `translator.translate()`.
- **DOM Mutation (Modes)**:
  - **Translate Only**: Modifies the `textContent` of nodes directly. Uses a `Map` (`originalMap`) to store original text for restoration.
  - **Bilingual**: Replaces original text nodes with a `span.ai-pair` element containing both original and translated text side-by-side.

### 4.2 Select-to-Translate, Hover Translation & TTS
- **Select-to-Translate**: `content.js` listens to the `mouseup` event to capture user-selected text (`window.getSelection()`).
- **Hover Translation**: `content.js` uses `mousemove` to detect when a user hovers over a word for 300ms. It isolates the hovered word using DOM ranges and displays its translation.
- **Tooltip UI**: Dynamically creates a DOM element positioned near the cursor. Adapts to the system's dark/light mode automatically. Includes dedicated TTS speaker icons for both the original and translated text.
- **TTS Integration**: 
  - `background.js` uses `chrome.tts.speak` for local audio playback when an appropriate voice is available.
  - As a fallback for maximum compatibility, it utilizes the Google Translate TTS API via an `offscreen` document, automatically aligning with the target language for robust pronunciation without needing local voice packs.

### 4.3 YouTube Dual Subtitles
- **Caption Interception**: Injects a `MutationObserver` in `content.js` specifically on YouTube pages to watch the `.ytp-caption-window-container` element.
- **Dynamic Injection**: Automatically intercepts native subtitles (Closed Captions) as they appear, translates them via the background script, and dynamically injects `.ai-yt-sub` spans.
- **Customization**: Supports extensive user customization for the injected subtitles, including color inheritance mode (Original vs Custom), text opacity, and vertical placement (Above vs Below original).

### 4.4 Caching Mechanism
- **Design**: Implements an in-memory LRU (Least Recently Used) cache in `background.js`.
- **Purpose**: Reduces redundant API calls to the built-in AI, speeding up translation.
- **Implementation**: Stores translations in a `Map` with a maximum capacity (`CACHE_MAX = 5000`). Cache keys consist of source language, target language, and original text. Can be toggled off in settings.

### 4.5 State Management & Persistence
- **API**: Utilizes `chrome.storage.local` to persist user preferences.
- **Stored Data**: 
  - Extension toggle (`isEnabled`)
  - UI Language (`uiLang`)
  - Translation languages (`sourceLang`, `targetLang`)
  - Display mode (`mode`: `translate-only` / `bilingual`)
  - Select-to-translate & Hover toggles (`s2tTranslate`, `hoverTranslate`)
  - YouTube Subtitles configuration (`youtubeDualSubs`, `ytSubColorMode`, `ytSubColor`, `ytSubOpacity`, `ytSubPosition`)
  - TTS preferences (`ttsVoice`, `ttsRate`, `ttsPitch`, `ttsVolume`)
  - Translation usage statistics (`totalTranslates`)

### 4.6 Internationalization (i18n) & UI
- `popup.js` maintains an internal JavaScript dictionary (`I18N`) supporting multiple languages (en, zh, zh-Hant, ja, es, fr, de, ru, ar).
- Dynamically updates text for DOM nodes tagged with `data-i18n` or `data-i18n-placeholder` based on user selection or browser language.
- Features a clean, unified settings panel with collapsible sections and micro-animations for an improved user experience.

## 5. Key APIs & Dependencies
- **Requirements**: Google Chrome version 138 or higher.
- **Experimental Flags**:
  Users must enable the following in `chrome://flags` for the Translator API to work:
  - `#translation-api` (Enabled)
  - `#optimization-guide-on-device-model` (Enabled BypassPrefRequirement)
- **Required Manifest Permissions**:
  - `storage`: For saving settings.
  - `activeTab`: For running content scripts on the current page.
  - `tts`: For text-to-speech functionality.

## 6. Development & Debugging Guide
1. **Testing Translator API**:
   You can verify `Translator.create()` availability in the browser console. The popup interface also performs an active check.
2. **Debugging Service Worker**:
   Navigate to `chrome://extensions/` and click the "Service Worker" link for this extension. This opens DevTools to view `background.js` logs and API requests.
3. **Debugging Content Scripts**:
   Press F12 on any active webpage to inspect the DOM structure injected by `content.js` and view console logs.
4. **Built-in Model Status**:
   Visit `chrome://on-device-translation-internals` to check the download progress and status of local translation models.
