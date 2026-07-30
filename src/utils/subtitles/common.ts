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
