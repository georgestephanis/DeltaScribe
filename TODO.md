# DeltaScribe Studio: Future Enhancements Roadmap

Here is a list of features inspired by prior subtitle syncing utilities (such as `sc0ty/subsync`) that we can build one-by-one to expand DeltaScribe Studio.

---

## [x] Feature 1: Subtitle Pace / Speed Scaling (Anchor-based Timing Scaling Mode)
Adjust and scale subtitle timing coordinates dynamically across a track for live performances or drifted media by setting manual anchor points. Non-anchor cue timings are stretched and compressed between manual anchors using a piecewise linear interpolation algorithm.

### Implementation Strategy
1. **Timing Scaling Mode UI**: Add a Scaling Mode toggle button (Anchor icon) and option drawer inside SubtitleEditor.
2. **Manual & Auto Highlights**: Color manual anchor cards in gold/amber and auto-adjusted cards in cyan/blue.
3. **Piecewise Scaling Logic**: Recalculate all non-anchor cue start and end times dynamically using piecewise linear interpolation based on manual timing anchors.
    ```typescript
    // In scaling.ts:
    const ratio = (tOrig - left.orig) / (right.orig - left.orig);
    return left.actual + ratio * (right.actual - left.actual);
    ```

---

## [x] Feature 2: Reference Subtitle Track (Subtitle-to-Subtitle Sync)
Allow loading a correctly-timed secondary subtitle file (often in a different language) as a visual reference, letting the sync designer easily copy timings.

### Implementation Strategy
1. **Dropzone update**: Add a "Load Reference SRT" file input field.
2. **Visual List Overlay**: Display the reference track cues faintly inline or side-by-side with the active cues in the list.
3. **Copy Timing Hook**: Add a "Copy Reference Timing" button on active cards. When clicked, it copies the corresponding reference index's `startTime` and `endTime` bounds into the active cue block.

---

## [x] Feature 3: WebVTT & TTML Format Support
Extend support to parse and write WebVTT (`.vtt`) and TTML (`.ttml` / `.xml`) files natively. This covers both active and reference tracks, and supports export/download across all formats.

### Implementation Strategy
1. **VTT Parsing Rules**:
   - Strip the leading `WEBVTT` file header.
   - Timestamps format is `HH:MM:SS.mmm` (dot instead of comma separator).
2. **TTML Parsing & Generating Rules**:
   - Parse XML elements using the client-side `DOMParser`.
   - Support offset-times (seconds, milliseconds, etc.) and clock-times.
   - Generate standard compliant timed text XML formatting templates on export.
3. **Utility updates**: Refactored subtitle parsers into clean, format-specific submodules inside `src/utils/subtitles/`.
4. **Toggle Output**: Add a dropdown in the Export toolbar to choose between `.srt`, `.vtt`, and `.ttml` file download outputs.

---

## [x] Feature 4: Audio Waveform & Spectroscopic Canvas Display
Render real-time visual waveforms, frequency spectrum bars, and a spectroscopic waterfall analyzer inside the media player card.

### Implementation Strategy
1. **Web Audio connection**: Connect the HTML `<audio>` elements via a lazy-initialized `MediaElementAudioSourceNode` and `AnalyserNode` connected to the `AudioContext`.
2. **Canvas Renderers**: Update drawing loops matching display pixel ratios:
   - **Waveform View**: Oscillosopic time-domain glowing line.
   - **Spectrum Bars**: Frequency-domain bar chart with linear gradients.
   - **Spectrogram View**: Horizontally-scrolling frequency waterfall (spectrograph) showing heatmap values over time.
3. **Interactivity Toggle**: Add an overlay segment switcher rotating between the three visualization views.

---

## [x] Feature 5: Leverage Chrome's Built-in AI & Web APIs
Integrate Chrome's built-in AI models (Gemini Nano) and Web Speech APIs to perform speech-to-text timing generation, local translation, and timing quality assurance completely client-side.

### [x] A. Local Language Translation (Chrome Prompt API / Gemini Nano & OpenAI Endpoints)
*   **Concept**: Translate subtitles locally using the browser's built-in Gemini Nano model or third-party compatible APIs.
*   **Implementation**: Fully supports built-in Chrome models and custom OpenAI-compatible server APIs.

### [ ] B. Subtitle Quality Check & Context Analysis (Chrome Prompt API / Gemini Nano)
*   **Concept**: Analyze subtitle text using Chrome's built-in Gemini Nano model to run semantic checks.
*   **Implementation Strategy**: Prompt local sessions to analyze line breaks or translations.

### [x] C. Voice-to-Text Speech Recognition (Web Speech API)
*   **Concept**: Recognize speech from the media playback to auto-generate timing blocks or highlight spoken segments.
*   **Implementation**: Hooks the browser's native `SpeechRecognition` API.

### [x] D. Chrome Gemini Nano AI Alignment
*   **Concept**: Align original subtitle text with the recognized speech transcripts based on semantic meaning using Chrome's local AI model (`window.ai.languageModel`).
*   **Implementation**: Map IDs to voice coordinates and auto-adjust timing parameters in-place.

---

## [x] Feature 6: OpenAI-Compatible API Settings
Support connecting to custom, local, or third-party OpenAI-compatible completion endpoints (like Ollama, llama.cpp, vLLM, and the like) to handle translations and bulk prompts.

### Implementation Strategy
1. **Providers Selection UI**: Add configuration selectors under Settings swapping between Chrome Nano and OpenAI.
2. **Endpoint Mappings**: Route completions to `/v1/chat/completions` using stateless HTTP requests.

---

## [x] Feature 7: Gated Text Alignment & Rich Text Visual Styling
Allow subtitle sync designers to visually format text styling (Bold, Italic, Underline) and position alignments (Left, Center, Right) or vertical lines (Top, Middle, Bottom).

### Implementation Strategy
1. **Gated Configuration Toolbar**: Add header switches to toggle "Alignments" and "Rich Text" widgets.
2. **Visual Editor Integration**: Swaps standard text inputs for contenteditable rich-text editors when formatting is active.
3. **Timed Text Spans**: Recursive DOM parsers map XML spans inside TTML formats to raw HTML tags and vice versa.

---

## [x] Feature 8: Workspace URL Prepopulation & Webhook Callback Submissions
Load remote video/audio feeds and subtitles directly on page load via GET query string parameters, and allow editing workspaces to submit finished files back to third-party endpoints.

### Implementation Strategy
1. **Query Routing**: Load files dynamically if `media` or `subtitles` are defined in the address bar.
2. **Self-Healing CORS**: Try fetching remote assets with CORS credentials; on block, automatically fallback to direct streams and disable visualizers safely.
3. **Webhook Submissions**: Render a "Submit" button if a `submit` URL is present to POST subtitle JSON payloads.
