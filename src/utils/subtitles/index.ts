import type { SubtitleCue } from './types';
import { parseSRT } from './srt';
import { parseVTT } from './vtt';
import { parseTTML } from './ttml';

// Export type declarations and format modules
export * from './types';
export * from './common';
export * from './srt';
export * from './vtt';
export * from './ttml';

/**
 * Unified parser entrypoint. Inspects the file contents to auto-detect
 * the subtitle format (SRT, WebVTT, or TTML XML) and route to the correct parser.
 */
export function parseSubtitles(text: string): SubtitleCue[] {
  const trimmed = text.trim();
  
  // 1. TTML XML Detection
  if (trimmed.startsWith('<?xml') || trimmed.includes('<tt') || trimmed.includes('<tt ') || trimmed.includes('<tt>')) {
    return parseTTML(text);
  }

  // 2. WebVTT Detection
  if (trimmed.startsWith('WEBVTT')) {
    return parseVTT(text);
  }

  // 3. SRT Fallback
  return parseSRT(text);
}

// Export parseSubtitles as parseSRT for backward compatibility with imports
export { parseSubtitles as parseSRT };
