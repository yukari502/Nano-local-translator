# Nano Local AI Translator - Bilingual Web Reader

**Hi! I'm an amateur developer.** I built Nano Local AI Translator on a whim after discovering Chrome's new Built-in AI features. Since then, I've been constantly polishing the features and user experience based on my own daily usage. It's a fully open-source project, and I hope you like it! Feedback on GitHub is highly welcomed.

Nano Local AI Translator is a lightning-fast, private web page translator powered entirely by Chrome's Built-in AI (Gemini Nano). It processes everything locally on your device—ensuring **maximum speed** (it’s genuinely fast!) and **100% privacy** since your data never leaves your machine.

You can find it on [Chrome Web Store](https://chromewebstore.google.com/detail/bobljnncaioenhgjhpcnfghdoabocnim?utm_source=item-share-cb)

---

##  Features & Highlights

- **Viewport-First Streaming Translation (Alt+T)**:
  - Immediately translates visible content on your screen without waiting for the entire page to parse.
  - Dynamically streams translations into the DOM in real-time as you scroll.

- **Dual Translation Engine (Built-in AI & Custom LLMs)**:
  - **Chrome Built-in AI (Gemini Nano)**: 100% local, zero-latency, private on-device translation with no API key needed.
  - **Custom OpenAI-Compatible Engine**: Connect local models (Ollama, LM Studio) or cloud endpoints with configurable concurrency.

- **Floating Selection & Hover Translation**:
  - Highlight text to trigger an elegant floating translation bubble or instant tooltip card with TTS voice pronunciation.
  - Customizable trigger shortcuts: Show Bubble, Alt + Select, Ctrl/Cmd + Select, or Direct Translate.

- **YouTube Bilingual Subtitles**:
  - Automatically renders dual bilingual subtitles for YouTube videos with customizable colors, opacity, and positioning.

- **Screenshot OCR Translate (Alt+S)**:
  - Select any region on screen to extract and translate text locally. OCR binaries are downloadable on demand (`npm run setup-ocr`).

- **Floating Reader Capsule**:
  - Minimal on-page capsule showing live translation status, with 1-click Single/Bilingual mode switching and instant restore.

---

## Requirements

- **Google Chrome version 138 or higher** (For built-in Translator API support).
- Built-in AI flags enabled.

## Setup & Installation

1. Open Chrome and navigate to `chrome://flags/`. Enable the following flags:
   - `#translation-api` (Enabled)
   - `#optimization-guide-on-device-model` (Enabled BypassPrefRequirement)
2. Open `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the extension directory.
5. Check your local translation models status at `chrome://on-device-translation-internals`.
6. *(Optional)* **Enable Screenshot OCR**:
   ```bash
   npm run setup-ocr
   # or: node scripts/download_ocr_libs.js
   ```

## Shortcuts & Usage

- **Alt+T** (Mac: **⌥+T**): Toggle full-page streaming translation.
- **Alt+S**: Screenshot OCR area translation.
- **Text Selection / Hover**: Trigger translation bubble or tooltip card.
- **Popup Settings (⚙️)**: Switch translation engines, customize trigger shortcuts, configure subtitles, and manage excluded domains.

## Privacy

All translation is processed **locally** on your device using Chrome's Built-in AI models. No browsing data, page content, or prompts are sent to external servers unless you explicitly configure a third-party custom LLM endpoint.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE) - see the [LICENSE](LICENSE) file for details.

## Support

[If you find this project helpful, you can buy me a coffee!](https://buymeacoffee.com/yamadasensei)

[![Buy Me A Coffee](./img/qr-code.png)](https://buymeacoffee.com/yamadasensei)
