# DeltaScribe - Issues & TODO List

This document tracks issues, bug reports, and potential root causes reported during development so they can be reviewed and addressed.

## Open Issues

*(None)*

## Resolved Issues

- [x] **Hotkey Collision within Textarea & Editor**
  - **Description**: Hitting `[` or `]` when in the text editor would insert those characters into the text box instead of triggering timing latching.
  - **Root Cause**: The keydown event bubbled to input/contenteditable fields and inserted characters, while global listeners in `App.tsx` were bypassed due to active focus check bypass.
  - **Resolution**: Intercepted single-keypress `[` and `]` keydown events locally inside `<AutoExpandingTextarea>` and `<RichTextEditor>`, updating the active timing to `currentTime` via `onChangeCue` and using `e.preventDefault()` to stop the character from entering the text box.

- [x] **Linked Duration Timing Shifts (Start Time Updates)**
  - **Description**: Moving the start time of a cue did not shift its stop time, causing duration changes and timing overlaps.
  - **Root Cause**: Updates to `startTime` in `handleUpdateCue` mutated only the start time attribute without recalculating the end time based on the active duration.
  - **Resolution**: Modified `handleUpdateCue` in `App.tsx` to compute the difference and automatically shift the end time by the same delta if only `startTime` is changed, preserving the cue's duration. Stop time modifications continue to only affect the stop point.

- [x] **Glitchy Absolute Timing Input Box Edits**
  - **Description**: Typing numbers in the absolute start/end timing inputs was glitchy as the input value reformatted to `.toFixed(3)` on every keyup, resetting the cursor and preventing multi-character/decimal inputs.
  - **Root Cause**: Inputs directly used `value={formatSeconds(cue.startTime)}` controlled by the parent state, re-rendering and overwriting typed text on every character state push.
  - **Resolution**: Implemented a local `absoluteInputs` state buffer in `SubtitleEditor.tsx` to hold the exact string typed by the user, updating the parent cue state only when parsing a valid float, and clearing the temporary buffer on `blur` or programmatic updates.

- [x] **Lag on Toggling Rich Text & List Scrolling**
  - **Description**: Toggling the formatting toolbar or Rich Text mode would lag the browser severely when the subtitle list grew large.
  - **Root Cause**: The app rendered heavy editable text areas, offset badges, and RichTextEditor toolbars for all 100+ subtitle cues at once, overloading the DOM.
  - **Resolution**: Implemented progressive conditional rendering in `SubtitleEditor.tsx` to render heavy input and editor nodes only for the currently selected cue card (`isSelected === true`). Unselected cards render lightweight static `<span>` and `<div>` layouts. Additionally, applied CSS visibility containment (`content-visibility: auto`) to `.cue-card-wrapper` to optimize browser rendering of off-screen items.

- [x] **Static 1/3 to 2/3 Workspace Column Ratio Allocation**
  - **Description**: Interactive resizer bar was laggy during dragging; layout now uses a clean 1/3 media side to 2/3 captioning column ratio.
  - **Root Cause**: Mouse drag listener on `workspace-resizer-handle` triggered continuous main-thread layout recalculations.
  - **Resolution**: Set `.dashboard-grid` in `index.css` to `grid-template-columns: 1fr 2fr;` (1/3 media side, 2/3 captioning side) and removed drag handle.

- [x] **History Log Toggle Button in Header & Default Hidden Drawer**
  - **Description**: History log drawer was visible at the bottom of the screen by default without a header toggle button.
  - **Root Cause**: `<AuditLogDrawer>` rendered continuously at the bottom of the dashboard.
  - **Resolution**: Added `showAuditLog` state in `App.tsx`, rendered a "History Log" button (`<History size={14} />`) in the top navigation bar next to "Reset Workspace", and hidden the audit log drawer by default unless toggled on.



## Resolved Issues

- [x] **Vertically Stacked Cue Timings & Re-aligned Header Layout**
  - **Description**: Cue card timing fields currently stretch horizontally, crowding the card header.
  - **Root Cause**: `SubtitleEditor.tsx` rendered start and end time inputs horizontally side-by-side with an arrow separator (`➔`).
  - **Resolution**: Restructured cue card headers: cue index badge (`#index` + ▶ play/seek) positioned on the far left, Start and End time input fields stacked vertically in the middle column, and action buttons grouped neatly on the far right.

- [x] **Change History Audit Log Drawer & Undo / Redo System (`Cmd+Z` / `Ctrl+Z`)**
  - **Description**: Users had no visual change history log or keyboard undo/redo stack for tracking and reverting subtitle edits.
  - **Root Cause**: State updates directly mutated `subtitleTracks` without recording an undo history stack or rendering an audit log drawer.
  - **Resolution**: Implemented an undo/redo history state stack (`historyStack`, `historyIndex`) in `App.tsx`, routed structured audit logs through `console.log`, added `Cmd+Z` / `Ctrl+Z` & `Cmd+Shift+Z` hotkeys, and rendered a collapsible bottom `AuditLogDrawer` for real-time history inspection.

- [x] **Prevent Automatic Media Seeking on Subtitle Cue Selection**
  - **Description**: Clicking a subtitle cue card automatically sought the media player to that cue's timestamp, making it difficult to select a cue and link/sync it to the current playhead position.
  - **Root Cause**: In `SubtitleEditor.tsx`, `onClick` handler on cue cards called `onSeek(cue.startTime)` whenever `autoSeek` was true (defaulting to `true`).
  - **Resolution**: Disabled automatic media seeking on cue card selection, defaulting `autoSeek` to `false` and restricting seeking strictly to the explicit ▶ play/seek button on each card header.

- [x] **Draggable Resizable Splitter between Media and Captions Workspace Columns**
  - **Description**: Column widths between the left media panel and right subtitle editor panel were static percentages without interactive user scaling.
  - **Root Cause**: In `index.css`, `.dashboard-grid` used fixed column templates without a drag handle.
  - **Resolution**: Added an interactive draggable splitter handle (`workspace-resizer-handle`) in `App.tsx` and `index.css` allowing users to resize media vs caption panels smoothly.

- [x] **Collapsible Assistant & Helper Panels (AI Aligner & Keyboard Shortcuts)**
  - **Description**: The AI VTT Sync Assistant and Keyboard Shortcuts helper panels took up vertical space even when not in active use.
  - **Root Cause**: `AiAligner.tsx` and `KeyboardShortcutsHelp.tsx` rendered continuously without collapse/accordion state controls.
  - **Resolution**: Added toggle collapse headers (`isCollapsed` state with `ChevronDown` / `ChevronUp` icons) on `AiAligner.tsx` and `KeyboardShortcutsHelp.tsx` so users can expand or hide them at will.

- [x] **Caption Timeline Indicator Bar under Media Scrubber**
  - **Description**: The media player scrubber bar lacked a visual indication of where subtitle captions exist across the media timeline.
  - **Root Cause**: `MediaPanel.tsx` only rendered a standard HTML range input without cue segment overlays.
  - **Resolution**: Passed `cues` and `selectedCueId` to `MediaPanel.tsx`, rendering percentage-positioned colored caption segment blocks (`.caption-segment`) along the scrubber bar with click-to-seek support.

- [x] **Compact Audio Visualizer, Pause Rendering & Interactive Canvas Seeking**
  - **Description**: Audio visualizer canvas was unnecessarily tall, cleared/froze when media was paused, and could not be clicked to seek.
  - **Root Cause**: `index.css` allocated large height for `.audio-visualizer-canvas`, `renderVisualizer()` loop stopped on pause, and canvas lacked click handlers.
  - **Resolution**: Compacted canvas max-height to `120px`, maintained active visualizer rendering when paused, and added `onClick` seek handler on visualizer canvas.

- [x] **Front-Loading Media Pre-loading & Progressive Cue Rendering Optimization**
  - **Description**: Workspace transition was improved by front-loading media metadata parsing and progressive cue rendering.
  - **Root Cause**: Media metadata and Web Audio nodes were only created on workspace mount.
  - **Resolution**: Added pre-loading feedback and frame deferral to `FileDropZone.tsx` and `SubtitleEditor.tsx`.





## Resolved Issues

- [x] **Premature UI Transition on Media File Upload**
  - **Description**: Uploading a media file first immediately transitions the screen away from the upload dropzone, preventing the user from uploading or managing subtitle files afterwards.
  - **Root Cause**: In `src/App.tsx`, the workspace view selection was strictly conditioned on `!mediaFile`. When `mediaFile` was set, `FileDropZone` unmounted immediately.
  - **Resolution**: Implemented an explicit ready state (`isWorkspaceReady` / "Ready to Go" button) in `FileDropZone` when media is loaded so users can upload, review, or correct all assets before transitioning into the editor interface.

- [x] **Lack of Visual Loading Indicator during Media/Subtitle Import**
  - **Description**: Selecting or loading large media or subtitle files provided no visual loading spinner or status feedback while reading/processing.
  - **Root Cause**: `FileDropZone` and `App.tsx` processed file reading (`FileReader`, blob URL generation, remote `fetch`) without displaying an active loading UI state or disabling input triggers.
  - **Resolution**: Tracked `isLoading` states in `FileDropZone` / `App.tsx`, displaying animated loading spinners/badges on asset cards and disabling button clicks while files are loading.

- [x] **Default Audio Visualizer Mode to Spectrograph**
  - **Description**: Audio files defaulted to waveform visualizer mode instead of spectrograph mode.
  - **Root Cause**: In `src/components/MediaPanel.tsx`, `visualizerMode` state defaulted to `'waveform'`.
  - **Resolution**: Updated initial `visualizerMode` state default in `MediaPanel.tsx` to `'spectrogram'`.

- [x] **Insert Cue Before/After and Spacing Support**
  - **Description**: Users could only insert new subtitle cues *after* a given cue, but not *before*, and spacing was not calibrated.
  - **Root Cause**: In `src/App.tsx`, `handleAddCue` only accepted `insertAfterId?: string`. `SubtitleEditor.tsx` only rendered a single insert button.
  - **Resolution**: Updated `onAddCue` signature to accept position options (`targetCueId?: string, position?: 'before' | 'after'`), rendered top/bottom hover lines and before/after buttons on cue cards, and calculated non-overlapping start/end timings with calibrated buffer spacing.

- [x] **Workspace Layout Ratio Adjustment (Subtitle Editor Priority)**
  - **Description**: Media player took more horizontal width (`1.1fr`) than the subtitle captioning editor (`0.9fr`).
  - **Root Cause**: In `src/index.css`, `.dashboard-grid` used `grid-template-columns: 1.1fr 0.9fr;`.
  - **Resolution**: Updated `.dashboard-grid` columns ratio to `minmax(360px, 0.75fr) 1.25fr` and increased root container max-width to `1800px` so SubtitleEditor receives maximum horizontal workspace width.

- [x] **5s and 30s Forward and Reverse Media Skip Controls**
  - **Description**: Media controls only provided basic seek bar and play/pause without multi-interval skip steps.
  - **Root Cause**: `src/components/MediaPanel.tsx` lacked 5s and 30s skip action buttons in the transport bar.
  - **Resolution**: Added `-30s`, `-5s`, `+5s`, and `+30s` seek buttons to `MediaPanel.tsx` transport controls bar.

- [x] **Add Cue at Current Playhead Time Button & Hotkey**
  - **Description**: Creating a new cue defaulted to appending at the end or relative to another cue, rather than inserting at the player's active timestamp (`currentTime`).
  - **Root Cause**: `SubtitleEditor.tsx` toolbar only had a generic "Add Cue" button.
  - **Resolution**: Added an "Add Cue @ Current Time" option to the split dropdown menu in `SubtitleEditor.tsx` toolbar and updated `handleAddCue` to support `atCurrentTime?: boolean` insertion.

- [x] **Consolidate Button Clusters into Segmented & Nested Dropdown Groups**
  - **Description**: Multiple standalone tool buttons in `SubtitleEditor` and `MediaPanel` cluttered toolbars.
  - **Root Cause**: Action buttons were rendered as individual loose buttons rather than cohesive button groups.
  - **Resolution**: Consolidated toolbar buttons into segmented button groups and nested dropdown menus (split "Add Cue" button with dropdown for "At End" vs "At Current Time", integrated transport controls bar, and segmented timing tools group).







## Resolved Issues

*(None)*
