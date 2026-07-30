# DeltaScribe Agent Instructions & Guidelines

This directory contains workspace-scoped behavioral guidelines for AI coding assistants working on the DeltaScribe codebase.

---

## Technical Constraints & Design Principles

### 1. Client-Side Only Architecture
- **Rule**: Never add endpoints, servers, databases, or API calls that upload the user's video, audio, or subtitle content to remote servers. All parsing, transcribing, visual wave analysis, and timing shifts must be done client-side.
- **Exceptions**: Local native browser APIs (such as W3C `SpeechRecognition` or Chrome `window.ai.languageModel` for Gemini Nano) are permitted as they perform local calculations.

### 2. Styling System
- **Rule**: Avoid adding external CSS libraries like TailwindCSS unless requested. Maintain all visual styles in `src/index.css` using the established custom HSL theme variables (indigo/slate dark theme, glassmorphism card styling, glowing interactive states).

### 3. Timing Anchors & Delta Offsets ($\Delta$)
- **Rule**: When updating subtitle cue objects, always preserve the file-import anchors `originalStartTime` and `originalEndTime`.
- **UI Consistency**: Keep the integrated Delta (`Δ`) offset fields rendering inline next to absolute timing fields. Changes to offsets must propagate back to active `startTime` and `endTime` fields, and the Rotate-Ccw reset button should always restore timing back to the initial anchors.

### 4. Stable Grid Indexing & Sorting
- **Rule**: In the subtitle editor, ensure cue cards stay strictly anchored in their list position while editing. Do not auto-sort cards on every character typed in timing inputs, as it causes focus jitter and visual disorientation. Standard sorting should only be applied upon final file exports, or following bulk AI actions.

### 5. Suspended Keybindings
- **Rule**: Make sure keyboard listeners in `App.tsx` always verify that no input elements or contenteditable containers are in focus before triggering global hotkeys (like `Spacebar` for play/pause, `[`/`]` for timing latching, or `n` for new cues) to prevent keypress pollution during typing.

### 6. Webhook Callback Integrations
- **Rule**: Webhook callbacks to `submitUrl` must be explicitly user-triggered (via a "Submit" button) rather than executing silently in the background, in compliance with security guidelines.

### 7. Self-Healing CORS Streaming Fallbacks
- **Rule**: When loading media dynamically from remote URLs, routing visualizer nodes via Web Audio context taints the buffer if the host lacks CORS headers. Implement error handlers to remove `crossOrigin` attributes and reload streams directly so playback succeeds even if visualizer canvas elements must be disabled.

### 8. Licensing Compliance
- **Rule**: Maintain GPLv3 compatibility. Avoid pulling in dependencies that clash with GNU GPLv3 or our Apache 2.0 toolchain libraries.
