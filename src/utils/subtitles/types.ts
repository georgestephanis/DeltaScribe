export interface SubtitleCue {
  id: string; // Unique client-side identifier
  index: number; // 1-based cue index
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string; // subtitle text (can be multiline)
  originalStartTime?: number; // original start time anchor
  originalEndTime?: number; // original end time anchor
}
