export interface SubtitleCue {
  id: string; // Unique client-side identifier
  index: number; // 1-based cue index
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string; // subtitle text (can be multiline)
  originalStartTime?: number; // original start time anchor
  originalEndTime?: number; // original end time anchor
}

/**
 * Parses timestamp string HH:MM:SS,mmm or HH:MM:SS.mmm (and WebVTT MM:SS.mmm) to seconds.
 */
export function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 2) {
    // MM:SS.mmm or MM:SS,mmm
    minutes = parseInt(parts[0], 10) || 0;
    seconds = parseFloat(parts[1].replace(',', '.')) || 0;
  } else if (parts.length >= 3) {
    // HH:MM:SS.mmm or HH:MM:SS,mmm
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    seconds = parseFloat(parts[2].replace(',', '.')) || 0;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats seconds back to HH:MM:SS,mmm
 */
export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);

  const pad = (num: number, size: number) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
  };

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
}

/**
 * Parses raw subtitle content (SRT or VTT) into an array of SubtitleCues.
 */
export function parseSubtitles(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawBlocks = normalized.split(/\n\s*\n/);

  let tempIndex = 1;

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Skip metadata / header blocks in WebVTT
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
 * Parses raw SRT string content into an array of SubtitleCues.
 * Kept for backwards compatibility.
 */
export function parseSRT(text: string): SubtitleCue[] {
  return parseSubtitles(text);
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
