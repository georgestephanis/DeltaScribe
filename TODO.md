# DeltaScribe Studio: Future Enhancements Roadmap

Here is a list of features inspired by prior subtitle syncing utilities (such as `sc0ty/subsync`) that we can build one-by-one to expand DeltaScribe Studio.

---

## [ ] Feature 1: Subtitle Pace / Speed Scaling
Adjust all subtitle timing coordinates by a constant factor to fix progressive "sync drift" caused by framerate differences (e.g. 23.976 fps to 25 fps).

### Implementation Strategy
1. **Pace Control UI**: Add a Pace Scale input/slider inside the timing shifts panel (default `1.0`).
2. **Preset Ratios**: Add quick presets for common framerate changes:
   - `23.976 ➔ 25` (Multiplier: `1.0427`)
   - `25 ➔ 23.976` (Multiplier: `0.9590`)
3. **Scaling Logic**: Multiplies `startTime` and `endTime` for selected (or all) cues:
   ```typescript
   const handleScalePace = (factor: number, target: 'all' | 'selected') => {
     setCues(cues.map(c => {
       if (target === 'all' || c.id === selectedId) {
         return {
           ...c,
           startTime: c.startTime * factor,
           endTime: c.endTime * factor
         };
       }
       return c;
     }));
   };
   ```

---

## [x] Feature 2: Reference Subtitle Track (Subtitle-to-Subtitle Sync)
Allow loading a correctly-timed secondary subtitle file (often in a different language) as a visual reference, letting the sync designer easily copy timings.

### Implementation Strategy
1. **Dropzone update**: Add a "Load Reference SRT" file input field.
2. **Visual List Overlay**: Display the reference track cues faintly inline or side-by-side with the active cues in the list.
3. **Copy Timing Hook**: Add a "Copy Reference Timing" button on active cards. When clicked, it copies the corresponding reference index's `startTime` and `endTime` bounds into the active cue block.

---

## [x] Feature 3: WebVTT Format Support
Extend support to parse and write WebVTT (`.vtt`) files natively, which are natively supported by modern HTML5 browsers and media frameworks.

### Implementation Strategy
1. **VTT Parsing Rules**:
   - Strip the leading `WEBVTT` file header.
   - Timestamps format is `HH:MM:SS.mmm` (dot instead of comma separator).
2. **Utility updates**: Extend `srtParser.ts` or create `vttParser.ts` with VTT loaders.
3. **Toggle Output**: Add a dropdown in the Export toolbar to choose between `.srt` and `.vtt` file download outputs.

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

## [/] Feature 5: Leverage Chrome's Built-in AI & Web APIs
Integrate Chrome's built-in AI models (Gemini Nano) and Web Speech APIs to perform speech-to-text timing generation, local translation, and timing quality assurance completely client-side.

### [x] A. Local Language Translation (Chrome Prompt API / Gemini Nano)
*   **Concept**: Translate subtitles locally using the browser's built-in Gemini Nano model (`ai.languageModel`).
*   **Implementation**:
    1. Backup active subtitle cues to the reference track.
    2. Instantiate a local model session: `const session = await window.ai.languageModel.create()`.
    3. Loop through active cues, translating their text in-place while retaining all start/end timings and anchor values.

### [ ] B. Subtitle Quality Check & Context Analysis (Chrome Prompt API / Gemini Nano)
*   **Concept**: Analyze subtitle text using Chrome's built-in Gemini Nano model (`ai.languageModel`) to run semantic checks (e.g. check for alignment errors, line splitting recommendations, grammatical formatting, or context checks).
*   **Implementation**:
    1. Initialize the session: `const session = await window.ai.languageModel.create()`.
    2. Prompt the local model to analyze subtitle line breaks or check translation semantic alignment between reference and target subtitle text.

### [x] C. Voice-to-Text Speech Recognition (Web Speech API)
*   **Concept**: Recognize speech from the media playback to auto-generate timing blocks or highlight spoken segments.
*   **Implementation**:
    1. Use the browser's native `SpeechRecognition` API (`webkitSpeechRecognition`).
    2. Capture real-time text and timestamps to bootstrap a blank subtitle timeline or check manual timing precision automatically.

### [x] D. Chrome Gemini Nano AI Alignment
*   **Concept**: Align original subtitle text with the recognized speech transcripts based on semantic meaning using Chrome's local AI model (`window.ai.languageModel`).
*   **Implementation**:
    1. Create a prompt containing the original subtitles and the transcriptions with recorded timestamps.
    2. Prompt the local model to map subtitle IDs to start/end times and update timings client-side.
