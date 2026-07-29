export interface SubtitleCue {
  id: string; // Unique client-side identifier
  index: number; // 1-based cue index
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string; // subtitle text (can be multiline)
}

/**
 * Parses timestamp string HH:MM:SS,mmm or HH:MM:SS.mmm to seconds.
 */
export function parseTimestamp(timeStr: string): number {
  const cleanStr = timeStr.trim().replace('.', ',');
  const parts = cleanStr.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const secondsParts = parts[2].split(',');
  const seconds = parseInt(secondsParts[0], 10) || 0;
  const ms = parseInt(secondsParts[1], 10) || 0;

  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
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
 * Parses raw SRT string content into an array of SubtitleCues.
 */
export function parseSRT(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Normalize line breaks
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Split by double newline (or more)
  const rawBlocks = normalized.split(/\n\s*\n/);

  let tempIndex = 1;

  for (const block of rawBlocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let indexLine = lines[0].trim();
    let timeLine = lines[1].trim();
    let textStartIndex = 2;

    // Check if the first line is indeed an index number. If not, maybe index was omitted.
    if (!/^\d+$/.test(indexLine)) {
      // It's possible the index was omitted, and line 0 is the timeline
      if (indexLine.includes('-->')) {
        timeLine = indexLine;
        textStartIndex = 1;
      } else {
        // Skip block if it does not contain a valid time line
        continue;
      }
    }

    if (!timeLine.includes('-->')) {
      // Check if maybe line 0 was index, line 1 was not timeline, but line 0 was actually the timeline
      if (indexLine.includes('-->')) {
        timeLine = indexLine;
        textStartIndex = 1;
      } else {
        continue;
      }
    }

    const timeParts = timeLine.split('-->');
    if (timeParts.length < 2) continue;

    const startTime = parseTimestamp(timeParts[0]);
    const endTime = parseTimestamp(timeParts[1]);
    const text = lines.slice(textStartIndex).join('\n').trim();

    const parsedIndex = parseInt(indexLine, 10);
    const index = isNaN(parsedIndex) ? tempIndex : parsedIndex;

    cues.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      index,
      startTime,
      endTime,
      text
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
