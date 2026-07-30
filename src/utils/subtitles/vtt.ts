import type { SubtitleCue } from './types';
import { formatTimestamp } from './common';
import { parseSRT } from './srt';

/**
 * Parses raw subtitle content in WebVTT format into an array of SubtitleCues.
 */
export function parseVTT(text: string): SubtitleCue[] {
  // WebVTT has the same block structure as SRT, with minor header differences and
  // dots vs commas in timestamps which common's parseTimestamp handles.
  return parseSRT(text);
}

/**
 * Formats a list of SubtitleCues back to standard WebVTT format.
 */
export function formatVTT(cues: SubtitleCue[]): string {
  const sortedCues = [...cues].sort((a, b) => a.startTime - b.startTime);

  const body = sortedCues
    .map((cue, idx) => {
      const index = idx + 1;
      const startTimeStr = formatTimestamp(cue.startTime).replace(',', '.');
      const endTimeStr = formatTimestamp(cue.endTime).replace(',', '.');
      const times = `${startTimeStr} --> ${endTimeStr}`;
      return `${index}\n${times}\n${cue.text}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${body}\n`;
}
