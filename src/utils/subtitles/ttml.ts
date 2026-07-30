import type { SubtitleCue } from './types';
import { parseTimestamp } from './common';

/**
 * Parses a TTML time duration/offset/clock value into seconds.
 */
function parseTTMLTime(timeStr: string): number {
  const trimmed = timeStr.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 4) {
      // HH:MM:SS:frames
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      const frames = parseInt(parts[3], 10) || 0;
      // Default to 24fps frame rate
      return hours * 3600 + minutes * 60 + seconds + frames / 24;
    }
    return parseTimestamp(trimmed);
  }

  // Offset-time parser: e.g. "12s", "100.5ms", "2h", "5m"
  const match = trimmed.match(/^([\d.]+)(ms|s|m|h|f)?$/);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    if (isNaN(value)) return 0;
    
    switch (unit) {
      case 'ms': return value / 1000;
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'f': return value / 24; // Default to 24fps
      default: return value;
    }
  }

  return 0;
}

/**
 * Recursively parses a TTML DOM node to construct subtitle text containing inline HTML-like styling tags (<i>, <b>, <u>).
 */
function parseTTMLNode(node: Node): string {
  if (node.nodeType === 3) {
    return node.textContent || '';
  }

  if (node.nodeType === 1) {
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'br') {
      return '\n';
    }

    let innerText = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      innerText += parseTTMLNode(el.childNodes[i]);
    }

    if (tagName === 'span') {
      const fontStyle = el.getAttribute('tts:fontStyle') || el.getAttribute('fontStyle');
      const fontWeight = el.getAttribute('tts:fontWeight') || el.getAttribute('fontWeight');
      const textDeco = el.getAttribute('tts:textDecoration') || el.getAttribute('textDecoration');

      if (fontStyle === 'italic') {
        innerText = `<i>${innerText}</i>`;
      }
      if (fontWeight === 'bold') {
        innerText = `<b>${innerText}</b>`;
      }
      if (textDeco === 'underline') {
        innerText = `<u>${innerText}</u>`;
      }
    }

    return innerText;
  }

  return '';
}

/**
 * Translates subtitle cue text containing standard formatting tags (<i>, <b>, <u>)
 * into W3C TTML compliant <span> nodes.
 */
function subtitleToTTMLXML(text: string): string {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Translate back linebreaks
  escaped = escaped.replace(/\n/g, '<br />');

  // Convert basic tags recursively
  escaped = escaped
    .replace(/&lt;i&gt;/g, '<span tts:fontStyle="italic">')
    .replace(/&lt;\/i&gt;/g, '</span>')
    .replace(/&lt;b&gt;/g, '<span tts:fontWeight="bold">')
    .replace(/&lt;\/b&gt;/g, '</span>')
    .replace(/&lt;u&gt;/g, '<span tts:textDecoration="underline">')
    .replace(/&lt;\/u&gt;/g, '</span>');

  return escaped;
}

/**
 * Parses raw TTML XML string content into an array of SubtitleCues.
 */
export function parseTTML(xmlText: string): SubtitleCue[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const ps = doc.getElementsByTagName('p');
  const cues: SubtitleCue[] = [];

  const parserError = doc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    console.error("DOMParser parsed error:", parserError[0].textContent);
  }

  let index = 1;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const beginAttr = p.getAttribute('begin');
    const endAttr = p.getAttribute('end');
    if (!beginAttr || !endAttr) continue;

    const startTime = parseTTMLTime(beginAttr);
    const endTime = parseTTMLTime(endAttr);
    
    let text = '';
    for (let j = 0; j < p.childNodes.length; j++) {
      text += parseTTMLNode(p.childNodes[j]);
    }

    const alignAttr = p.getAttribute('tts:textAlign') || p.getAttribute('textAlign');
    let align: 'left' | 'center' | 'right' | undefined;
    if (alignAttr === 'left' || alignAttr === 'center' || alignAttr === 'right') {
      align = alignAttr;
    }

    cues.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      index,
      startTime,
      endTime,
      originalStartTime: startTime,
      originalEndTime: endTime,
      text: text.trim(),
      align
    });
    index++;
  }

  return cues.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Formats a list of SubtitleCues back to standard TTML XML format.
 */
export function formatTTML(cues: SubtitleCue[]): string {
  const sortedCues = [...cues].sort((a, b) => a.startTime - b.startTime);

  const formatTTMLTimestamp = (seconds: number): string => {
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

    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
  };

  const bodyParagraphs = sortedCues.map(cue => {
    const escapedText = subtitleToTTMLXML(cue.text);
    const alignAttr = cue.align ? ` tts:textAlign="${cue.align}"` : '';
    
    return `      <p begin="${formatTTMLTimestamp(cue.startTime)}" end="${formatTTMLTimestamp(cue.endTime)}"${alignAttr}>${escapedText}</p>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en">
  <head>
    <styling>
      <style xml:id="default" tts:fontFamily="sansSerif" tts:fontSize="16px" tts:textAlign="center" xmlns:tts="http://www.w3.org/ns/ttml#styling" />
    </styling>
    <layout>
      <region xml:id="bottom" tts:origin="10% 80%" tts:extent="80% 10%" xmlns:tts="http://www.w3.org/ns/ttml#styling" />
    </layout>
  </head>
  <body>
    <div>
${bodyParagraphs}
    </div>
  </body>
</tt>
`;
}
