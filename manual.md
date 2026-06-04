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
- **Execution**: `background.js` instantiates the translator via `Translator.create` and translates chunks iteratively using `translator.translate()`.
- **DOM Mutation (Modes)**:
  - **Translate Only**: Modifies the `textContent` of nodes directly. Uses a `Map` (`originalMap`) to store original text for restoration.
  - **Bilingual**: Replaces original text nodes with a `span.ai-pair` element containing both original and translated text side-by-side.

### 4.2 Select-to-Translate & TTS (Text-to-Speech)
- **Event Listeners**: `content.js` listens to the `mouseup` event to capture user-selected text (`window.getSelection()`).
- **Tooltip UI**: Dynamically creates a DOM element positioned near the cursor. Adapts to the system's dark/light mode automatically.
- **TTS Integration**: 
  - `background.js` uses `chrome.tts.speak` for audio playback.
  - Listens to TTS events (like `word` events) and sends the current character index back to `content.js`.
  - `content.js` highlights the currently spoken word using `<span class="tts-word-highlight">` based on the character index.

### 4.3 Caching Mechanism
- **Design**: Implements an in-memory LRU (Least Recently Used) cache in `background.js`.
- **Purpose**: Reduces redundant API calls to the built-in AI, speeding up translation.
- **Implementation**: Stores translations in a `Map` with a maximum capacity (`CACHE_MAX = 5000`). Cache keys consist of source language, target language, and original text. Can be toggled off in settings.

### 4.4 State Management & Persistence
- **API**: Utilizes `chrome.storage.local` to persist user preferences.
- **Stored Data**: 
  - Extension toggle (`isEnabled`)
  - UI Language (`uiLang`)
  - Translation languages (`sourceLang`, `targetLang`)
  - Display mode (`mode`: `translate-only` / `bilingual`)
  - Select-to-translate toggles (`s2tTranslate`, `s2tSpeak`)
  - TTS preferences (`ttsVoice`, `ttsRate`, `ttsPitch`, `ttsVolume`)
  - Translation usage statistics (`totalTranslates`)

### 4.5 Internationalization (i18n)
- `popup.js` maintains an internal JavaScript dictionary (`I18N`) supporting multiple languages (en, zh, zh-Hant, ja, es, fr, de, ru, ar).
- Dynamically updates text for DOM nodes tagged with `data-i18n` or `data-i18n-placeholder` based on user selection or browser language.

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
