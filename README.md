# Nano local translator

**Hi! I'm an amateur developer.** I built Nano Local Translator on a whim after discovering Chrome's new Built-in AI features. Since then, I've been constantly polishing the features and user experience based on my own daily usage. It's a fully open-source project, and I hope you like it! Feedback on GitHub is highly welcomed.

Nano Local Translator is a lightning-fast, private web page translator powered entirely by Chrome's Built-in AI (Gemini Nano). It processes everything locally on your device—ensuring **maximum speed** (it’s genuinely fast!) and **100% privacy** since your data never leaves your machine.

## Features

- **Full Page & Highlight Translation**: Translate instantly with side-by-side bilingual reading.
- **YouTube Dual Subs**: Seamlessly add bilingual dual subtitles to videos.
- **Offline Screenshot Translate (Alt+S)**: Extract and translate text from any image using local OCR.

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
- **Settings View**: Access settings by clicking the gear icon (⚙️) to change the UI language, configure translation caching, and adjust TTS parameters (voice, speed, pitch, volume).

## Privacy

All processing is done **locally** on your machine using Chrome's Built-in AI models. No browsing data, page content, or prompts are sent to any external servers.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE) - see the [LICENSE](LICENSE) file for details.

## Support

[If you find this project helpful, you can buy me a coffee!](https://buymeacoffee.com/yamadasensei)

[![Buy Me A Coffee](./img/qr-code.png)](https://buymeacoffee.com/yamadasensei)
