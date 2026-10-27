# Nano Local AI Translator - Bilingual Web Reader

**Hi! I'm an amateur developer.** I built Nano Local AI Translator on a whim after discovering Chrome's new Built-in AI features. Since then, I've been constantly polishing the features and user experience based on my own daily usage. It's a fully open-source project, and I hope you like it! Feedback on GitHub is highly welcomed.

Nano Local AI Translator is a lightning-fast, private web page translator powered entirely by Chrome's Built-in AI (Gemini Nano). It processes everything locally on your device—ensuring **maximum speed** (it’s genuinely fast!) and **100% privacy** since your data never leaves your machine.

You can find it at [Chrome Web Store](https://chromewebstore.google.com/detail/bobljnncaioenhgjhpcnfghdoabocnim?utm_source=item-share-cb)

---

## ✨ Features & Highlights

- **⚡ Viewport-First Active Streaming Translation**:
  - Immediately translates visible content on your screen without waiting for the entire page to parse.
  - Dynamically streams translated sentences into the DOM in real-time.
  - Automatically translates newly visible content as you scroll downwards using `IntersectionObserver` & `MutationObserver`.
  - Full synchronized `Translating...` status and node counters in both the popup and on-page floating capsule.

- **🎈 Floating Selection Bubble & Trigger Modes**:
  - Selecting text displays an elegant mini floating bubble at the cursor; clicking it opens the translation tooltip box without cluttering your reading flow.
  - Supports customizable trigger modes: **Show Bubble**, **Alt + Select**, **Ctrl/Cmd + Select**, and **Direct Translate**.

- **💊 Floating Page Reader Capsule**:
  - A discreet on-page glassmorphism capsule displaying live translation status, translated node counts, a 1-click Single/Bilingual mode switcher, and an instant Restore Original button (`✕`).

- **✨ Glassmorphic Tooltip with 1-Click Copy**:
  - Modern frosted-glass design (`backdrop-filter`) for both light and dark modes.
  - One-click copy button (`📋`) with an animated confirmation Toast ("Copied!").

- **⇄ One-Click Language Swap**:
  - Quickly invert source and target languages with a single click.

- **🚫 Excluded Domains (Blacklist)**:
  - Easily specify domains (one per line, e.g. `github.com`, `localhost`) to automatically skip translation and tooltips on sensitive or already-native sites.

- **💾 Persistent Offline Caching & Model Download Progress**:
  - LRU translation cache is persistently synchronized with `chrome.storage.local`, surviving Service Worker suspensions and browser restarts.
  - Real-time download progress bar with percentage and transferred megabytes when Chrome pulls built-in language models.

- **🤖 Dual Engine Architecture (Chrome Built-in AI & Custom LLMs)**:
  - **Chrome Built-in AI (Gemini Nano)**: 100% local, zero-configuration, zero-latency, private on-device translation.
  - **Custom OpenAI-Compatible Engine**: Connect local models (Ollama, LM Studio) or cloud endpoints with fine-grained concurrency and batch-size controls.

- **📺 YouTube Dual Subtitles**:
  - Seamlessly injects dual bilingual subtitles with word-by-word progressive deduplication, custom font colors, opacity, and positioning.
  - Sibling-line rendering architecture ensures translation never interferes with YouTube's live caption nodes or leaks newly arrived words.

- **📷 Screenshot OCR Translate (Alt+S)**:
  - Select any region on screen to recognize text via on-device OCR and translate instantly.
  - To keep the extension package ultra-lightweight (<200KB), OCR binaries are downloadable on demand (`npm run setup-ocr`).

---

## Requirements

- **Google Chrome version 138 or higher** (For built-in Translator API support).
- Built-in AI features must be enabled via Chrome flags.

## Setup & Installation

1. Open Chrome and navigate to `chrome://flags/`. Enable the following flags:
   - `#translation-api` (Enabled)
   - `#optimization-guide-on-device-model` (Enabled BypassPrefRequirement)
2. Open `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the extension directory.
5. You can check the status of your local translation models by visiting `chrome://on-device-translation-internals`.
6. *(Optional)* **Enable Screenshot OCR**:
   - The repository is lightweight and does not bundle heavy OCR binaries (~4.8MB) by default.
   - If you want to use Screenshot OCR (Alt+S), simply run:
     ```bash
     npm run setup-ocr
     # or: node scripts/download_ocr_libs.js
     ```

## Usage

- Click the extension icon or press **Alt+T** (Mac: **⌥+T**) to toggle full-page active streaming translation.
- **Translate View**: Choose source/target languages, flip languages with **⇄**, switch display modes (Translate Only vs. Bilingual), and configure Selection/Hover/YouTube/OCR features.
- **Settings View (⚙️)**:
  - Toggle UI language (English, 简体中文, 繁體中文, 日本語, etc.).
  - Select translation engine (Chrome Built-in AI vs. Custom Local/Cloud OpenAI LLMs).
  - Configure Selection Trigger Mode (Bubble, Alt+Select, Ctrl+Select, Direct).
  - Toggle Floating Page Reader Capsule.
  - Manage Excluded Domains.
  - Adjust Cache, Concurrency, and TTS settings.

## Documentation

For technical architecture details, DOM traversal mechanisms, and developer debugging guides, please refer to the [Technical Manual](manual.md).

## Privacy

All processing is done **locally** on your machine using Chrome's Built-in AI models. No browsing data, page content, or prompts are sent to any external servers.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE) - see the [LICENSE](LICENSE) file for details.

## Support

[If you find this project helpful, you can buy me a coffee!](https://buymeacoffee.com/yamadasensei)

[![Buy Me A Coffee](./img/qr-code.png)](https://buymeacoffee.com/yamadasensei)
