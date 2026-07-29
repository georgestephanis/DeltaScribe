# DeltaScribe Studio

DeltaScribe is a sleek, premium, client-side subtitle and lyric timing synchronization studio built with React, Vite, and TypeScript. 

It is designed to align subtitles and audio/video files completely in the browser—meaning **no media files or subtitles are ever uploaded to a server**, keeping your workflows private and fast.

---

## Key Features

1. **Integrated Media Player**: Supports HTML5 video and audio playback natively. For audio tracks, a high-fidelity visualizer dashboard is displayed.
2. **Timing Anchors & Delta Offsets**: When importing an SRT file, the initial timings are captured as anchors. Delta timing boxes ($\Delta$) next to timestamps show the exact adjustments made in seconds ($+/-$) relative to the original file, allowing you to edit offsets directly or reset timings instantly using a rotation arrow.
3. **Voice-to-Text Sync Assistant**: Speak or play media out loud to capture real-time voice timestamps using the browser's native `SpeechRecognition` API.
4. **Chrome Gemini Nano AI Alignment**: Automatically align your subtitles' texts with recognized voice timestamps using Chrome's built-in AI (`window.ai.languageModel`). DeltaScribe automatically falls back to an offline sequential algorithmic mapping if Chrome AI is disabled or unavailable.
5. **Stable Timeline Indexing**: Caption cards remain anchored in their visual list positions while editing timings to prevent visual disorientation. Re-sorting and re-indexing occur only on exports, or after AI bulk actions.
6. **Dynamic textareas**: Text boxes auto-resize based on input lines to keep all subtitle text fully visible.
7. **Read-Only / Text Safety Lock**: Toggle lock settings to prevent accidental edits to subtitle text lines while adjusting timings.
8. **Subtitle Scissors Splitting**: Easily split a subtitle cue in half, automatically slicing both text (by newline or word count) and timing intervals.

---

## Keyboard Shortcuts Reference

*   `Spacebar` - Play / Pause media playback.
*   `[` - Latch/sync the **Start** time of the selected subtitle card to the current player time.
*   `]` - Latch/sync the **End** time of the selected subtitle card to the current player time.
*   `Arrow Left` / `Arrow Right` - Seek backward or forward by 5 seconds.
*   `Shift + Arrow Left` / `Shift + Arrow Right` - Precise seek by 0.5 seconds.
*   `n` - Insert a new blank subtitle cue at the current playback position.

*Note: Hotkeys are automatically suspended when typing in text inputs or textareas.*

---

## How to Get Started

### Prerequisites
- Node.js installed locally.
- A modern browser (Chrome or Edge recommended for voice transcribing and built-in AI support).

### Setup and Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local server:
   ```bash
   npm run dev
   ```

3. Open **[http://localhost:5173/](http://localhost:5173/)** (or the port outputted in the console) to open DeltaScribe.
