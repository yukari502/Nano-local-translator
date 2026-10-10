# Nano Local AI Translator - Bilingual Web Reader

**Hi! I'm an amateur developer.** I built Nano Local AI Translator on a whim after discovering Chrome's new Built-in AI features. Since then, I've been constantly polishing the features and user experience based on my own daily usage. It's a fully open-source project, and I hope you like it! Feedback on GitHub is highly welcomed.

Nano Local AI Translator is a lightning-fast, private web page translator powered entirely by Chrome's Built-in AI (Gemini Nano). It processes everything locally on your device—ensuring **maximum speed** (it’s genuinely fast!) and **100% privacy** since your data never leaves your machine.

You can find it at [Chrome web store](https://chromewebstore.google.com/detail/bobljnncaioenhgjhpcnfghdoabocnim?utm_source=item-share-cb)

## Features

- **Side-by-side Bilingual Web Reading**: Translate full web pages instantly with immersive bilingual comparison.
- **Select & Hover Translation**: Instant word and phrase lookup with pronunciation (TTS).
- **Offline Screenshot OCR Translate (Alt+S)**: Extract and translate text from any image or screen area using local OCR.
- **Custom Local / External LLM Engine (Optional)**: Connect local models (Ollama, LM Studio) or OpenAI-compatible endpoints with concurrency and throughput controls.
- **YouTube Dual Subtitles**: Seamlessly overlay bilingual dual subtitles on YouTube videos.

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

## Usage

- Click the extension icon to open the popup interface.
- **Translate View**: Select your source and target languages. Choose your display mode and independently toggle Translation and/or Speak Aloud (TTS) under Select-to-Translate.
- **Settings View**: Access settings by clicking the gear icon (⚙️) to switch translation engines (Chrome Built-in vs. Custom OpenAI-compatible LLM), configure concurrency/batching, change UI language, configure caching, and adjust TTS parameters.

## Documentation

For technical architecture details, DOM traversal mechanisms, and developer debugging guides, please refer to the [Technical Manual](manual.md).

## Privacy

All processing is done **locally** on your machine using Chrome's Built-in AI models. No browsing data, page content, or prompts are sent to any external servers.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE) - see the [LICENSE](LICENSE) file for details.

## Support

[If you find this project helpful, you can buy me a coffee!](https://buymeacoffee.com/yamadasensei)

[![Buy Me A Coffee](./img/qr-code.png)](https://buymeacoffee.com/yamadasensei)
