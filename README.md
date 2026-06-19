# Nano local translator

A privacy-focused, lightweight Chrome Extension that leverages Chrome's Built-in Translator API to translate web pages locally on your device. No cloud services or external API keys are required.

## Features

- **On-Device Translation**: Translates web pages seamlessly and securely on your device using Chrome's built-in Translator API. Features an **Auto Detect** option for source language detection using Chrome's built-in AI `LanguageDetector` API (with `chrome.i18n` fallback).
- **YouTube Dual Subtitles**: Dynamically adds bilingual dual subtitles to YouTube videos with customizable colors, opacity, and positioning.
- **Screenshot Translate (Alt+S)**: Extract and translate text from screenshots anywhere on the page using a fully local Tesseract OCR engine. The resizable popup supports dark mode, dynamic color/opacity adjustments, and can be freely dragged. *(Note: Currently bundles English `eng` and Japanese `jpn` language data for offline use)*.
- **Bilingual & Translate-Only Modes**: View both original and translated text side-by-side, or completely replace the text.
- **Select-to-Translate & TTS**: Simply highlight text on any web page to get a quick translation, read it aloud using Chrome's TTS (or automatically uses Google Translate TTS for maximum compatibility), or both in an adaptive floating tooltip.
- **Hover Translate**: Instantly translate text simply by hovering your mouse cursor over it.
- **Word Highlighting**: Highlights the currently spoken word dynamically during TTS playback.
- **Multi-language UI**: The extension interface supports 9 languages dynamically (English, Chinese, Japanese, Spanish, French, German, Russian, Arabic). Features a settings panel with smooth collapsible sections and micro-animations.
- **Adaptive Dark Mode**: The UI and tooltips automatically adapt to your system's light or dark mode preferences.

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
