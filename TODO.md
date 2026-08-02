# DeltaScribe - Issues & TODO List

This document tracks issues, bug reports, and potential root causes reported during development so they can be reviewed and addressed.

## Open Issues

*(No open issues remaining! All reported items have been addressed and verified.)*

## Resolved Issues

- [x] **Multi-Second Lag on "Ready to Go" Workspace Transition**
  - **Description**: Clicking the "Ready to Go" button caused a multi-second main-thread lag without visual feedback before the workspace editor rendered.
  - **Root Cause**: Unmounting `FileDropZone` and mounting `<MediaPanel>` and `<SubtitleEditor>` (which renders all cue card components, calculates offsets, and initializes browser media element audio nodes) occurs synchronously on the main thread. Without a visual loading state or frame deferral, the button appeared frozen.
  - **Resolution**: Added `isStartingWorkspace` state to `FileDropZone.tsx`, immediately displaying a spinning `<Loader2>` icon ("Starting Workspace...") and disabling the button on click. Used `setTimeout(..., 50)` frame deferral so the DOM repaints the loading indicator before mounting the editor components.



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
