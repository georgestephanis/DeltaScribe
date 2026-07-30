import type { SubtitleCue } from './types';
import { parseTimestamp, formatTimestamp } from './common';

/**
 * Parses raw subtitle content in SRT format into an array of SubtitleCues.
 */
export function parseSRT(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawBlocks = normalized.split(/\n\s*\n/);

  let tempIndex = 1;

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Skip metadata / header blocks in WebVTT (just in case this is called with vtt content)
    const firstWord = trimmedBlock.split(/\s+/)[0];
    if (
      (firstWord === 'WEBVTT' || firstWord === 'NOTE' || firstWord === 'STYLE' || firstWord === 'REGION') &&
      !trimmedBlock.includes('-->')
    ) {
      continue;
    }

    const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 1) continue;

    // Find the timeline line index (contains '-->')
    const timeLineIndex = lines.findIndex(line => line.includes('-->'));
    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const timeParts = timeLine.split('-->');
    if (timeParts.length < 2) continue;

    const startTime = parseTimestamp(timeParts[0]);
    
    // Extract the end time token (ignoring any trailing WebVTT cue settings like align:middle line:90%)
    const endTimePart = timeParts[1].trim().split(/\s+/)[0];
    const endTime = parseTimestamp(endTimePart);

    // Text is everything after the timeline line
    const cueText = lines.slice(timeLineIndex + 1).join('\n');

    // Index is the line before the timeline line (if present and numeric)
    let index = tempIndex;
    if (timeLineIndex > 0) {
      const possibleIndex = parseInt(lines[0], 10);
      if (!isNaN(possibleIndex)) {
        index = possibleIndex;
      }
    }

    cues.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      index,
      startTime,
      endTime,
      originalStartTime: startTime,
      originalEndTime: endTime,
      text: cueText
    });

    tempIndex++;
  }

  // Ensure they are sorted by startTime
  return cues.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Formats a list of SubtitleCues back to standard SRT format.
 */
export function formatSRT(cues: SubtitleCue[]): string {
  // Sort cues by start time before exporting to maintain valid order
  const sortedCues = [...cues].sort((a, b) => a.startTime - b.startTime);

  return sortedCues
    .map((cue, idx) => {
      const index = idx + 1;
      const times = `${formatTimestamp(cue.startTime)} --> ${formatTimestamp(cue.endTime)}`;
      return `${index}\n${times}\n${cue.text}`;
    })
    .join('\n\n') + '\n'; // Add trailing newline
}
