# SubSync Studio: Future Enhancements Roadmap

Here is a list of features inspired by prior subtitle syncing utilities (such as `sc0ty/subsync`) that we can build one-by-one to expand SubSync Studio.

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

## [ ] Feature 2: Reference Subtitle Track (Subtitle-to-Subtitle Sync)
Allow loading a correctly-timed secondary subtitle file (often in a different language) as a visual reference, letting the sync designer easily copy timings.

### Implementation Strategy
1. **Dropzone update**: Add a "Load Reference SRT" file input field.
2. **Visual List Overlay**: Display the reference track cues faintly inline or side-by-side with the active cues in the list.
3. **Copy Timing Hook**: Add a "Copy Reference Timing" button on active cards. When clicked, it copies the corresponding reference index's `startTime` and `endTime` bounds into the active cue block.

---

## [ ] Feature 3: WebVTT Format Support
Extend support to parse and write WebVTT (`.vtt`) files natively, which are natively supported by modern HTML5 browsers and media frameworks.

### Implementation Strategy
1. **VTT Parsing Rules**:
   - Strip the leading `WEBVTT` file header.
   - Timestamps format is `HH:MM:SS.mmm` (dot instead of comma separator).
2. **Utility updates**: Extend `srtParser.ts` or create `vttParser.ts` with VTT loaders.
3. **Toggle Output**: Add a dropdown in the Export toolbar to choose between `.srt` and `.vtt` file download outputs.

---

## [ ] Feature 4: Audio Waveform Canvas Display
Render a visual waveform scrubber of the audio track beneath the media player so the sync designer can visually align cue boundaries with words/syllables.

### Implementation Strategy
1. **Audio Context decoding**:
   - When a media file is loaded, load it as an array buffer:
     ```typescript
     const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
     const response = await fetch(mediaFileUrl);
     const arrayBuffer = await response.arrayBuffer();
     const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
     ```
2. **Waveform canvas renderer**: Read channel data and draw the peak coordinates onto a `<canvas>` element that mirrors the width and scrub status of the scrubber bar.
3. **Drag-to-Adjust boundaries**: Allow visually adjusting the active cue start/end bounds by clicking and dragging anchors on the waveform itself.
