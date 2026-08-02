import { useState, useRef, useEffect, useCallback } from 'react';
import { FileDropZone } from './components/FileDropZone';
import { MediaPanel } from './components/MediaPanel';
import { SubtitleEditor } from './components/SubtitleEditor';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { AuditLogDrawer, type AuditLogEntry } from './components/AuditLogDrawer';
import { parseSRT, formatSRT, formatVTT, formatTTML, type SubtitleCue, interpolateTime } from './utils/subtitles';
import { Download, RefreshCw, AlertCircle, GripVertical } from 'lucide-react';
import { AiAligner } from './components/AiAligner';
import { __ } from './utils/i18n';
import logoIcon from './assets/delta-scribe-icon.svg';
import { generateId } from './utils/id';

function App() {
  // Loaded assets state
  const [mediaFile, setMediaFile] = useState<{ name: string; type: string; url: string; isRemote?: boolean } | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: string; name: string; cues: SubtitleCue[] }[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [scalingModeEnabled, setScalingModeEnabled] = useState(false);
  const [scalingOptions, setScalingOptions] = useState({ anchorStart: false, anchorEnd: false });

  // Media Playback coordinates
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Selection and editor states
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTextEditable, setIsTextEditable] = useState(true);
  const [exportFormat, setExportFormat] = useState<'srt' | 'vtt' | 'ttml'>('srt');
  const [enableAlignment, setEnableAlignment] = useState(false);
  const [enableFormatting, setEnableFormatting] = useState(false);

  // Derived state values computed on render
  const activeTrack = subtitleTracks.find(t => t.id === activeTrackId);
  const cues = activeTrack ? activeTrack.cues : [];
  const subtitleFileName = activeTrack ? activeTrack.name : null;

  const referenceTracks = subtitleTracks.filter(t => t.id !== activeTrackId);
  const referenceCues = referenceTracks.length > 0 ? referenceTracks[0].cues : [];

  const setActiveCues = useCallback((updater: (prev: SubtitleCue[]) => SubtitleCue[]) => {
    setSubtitleTracks(prevTracks => 
      prevTracks.map(t => t.id === activeTrackId ? { ...t, cues: updater(t.cues) } : t)
    );
  }, [activeTrackId]);

  // Workspace state & remote loading tracking
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const [isLoadingRemoteSubtitles, setIsLoadingRemoteSubtitles] = useState(false);
  const [remoteLoadError, setRemoteLoadError] = useState<string | null>(null);
  const [submitUrl, setSubmitUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draggable Column Resizer state
  const [leftColumnWidth, setLeftColumnWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(850, e.clientX - 24));
      setLeftColumnWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Audit Log & Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState<{ tracks: typeof subtitleTracks; description: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const pushHistoryState = useCallback((newTracks: typeof subtitleTracks, description: string, actionType: AuditLogEntry['actionType']) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newEntry: AuditLogEntry = {
      id: generateId(),
      timestamp,
      description,
      actionType,
    };

    console.log('📜 [DeltaScribe Audit Log]', `${timestamp} [${actionType.toUpperCase()}] ${description}`, newEntry);

    setAuditLog(prev => [...prev, newEntry]);
    setHistoryStack(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { tracks: newTracks, description }];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setSubtitleTracks(historyStack[targetIndex].tracks);
      setHistoryIndex(targetIndex);
      console.log('↩️ [DeltaScribe Audit Log] Undo performed to step:', historyStack[targetIndex].description);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      console.log('↩️ [DeltaScribe Audit Log] Undo performed to initial state');
    }
  }, [historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const targetIndex = historyIndex + 1;
      setSubtitleTracks(historyStack[targetIndex].tracks);
      setHistoryIndex(targetIndex);
      console.log('↪️ [DeltaScribe Audit Log] Redo performed to step:', historyStack[targetIndex].description);
    }
  }, [historyIndex, historyStack]);

  // Listen for Cmd+Z / Ctrl+Z (Undo) and Cmd+Shift+Z / Ctrl+Y (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused) return;
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInputFocused, handleUndo, handleRedo]);

  // When an embedding site provides a `?format=` param, the export format is
  // locked to it (dropdown disabled) so the receiving `submit` endpoint can
  // rely on a single, known format instead of handling all three.
  const [lockedFormat, setLockedFormat] = useState<'srt' | 'vtt' | 'ttml' | null>(null);

  // BCP-47 language code from `?lang=`, used for TTML's `xml:lang` on export/submit.
  const [subtitleLang, setSubtitleLang] = useState('en');

  // Surface the actual destination host so users can see where the Submit
  // button (populated from the ?submit= URL param) will send their data.
  let submitHost = '';
  if (submitUrl) {
    try {
      submitHost = new URL(submitUrl).host;
    } catch {
      submitHost = submitUrl;
    }
  }

  // Load remote files from query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mediaParam = params.get('media');
    const subtitlesParam = params.get('subtitles');
    const submitParam = params.get('submit');
    const formatParam = params.get('format');
    const langParam = params.get('lang');

    if (mediaParam && subtitlesParam) {
      setIsWorkspaceReady(true);
    }

    if (submitParam) {
      setSubmitUrl(decodeURIComponent(submitParam));
    }

    if (formatParam === 'srt' || formatParam === 'vtt' || formatParam === 'ttml') {
      setLockedFormat(formatParam);
      setExportFormat(formatParam);
    }

    if (langParam) {
      setSubtitleLang(decodeURIComponent(langParam));
    }

    if (mediaParam) {
      const mediaUrl = decodeURIComponent(mediaParam);
      const name = mediaUrl.split('/').pop() || 'Remote Media';
      const type = name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a') ? 'audio/mpeg' : 'video/mp4';
      setMediaFile({
        name,
        type,
        url: mediaUrl,
        isRemote: true
      });
    }

    if (subtitlesParam) {
      setIsLoadingRemoteSubtitles(true);
      const subUrl = decodeURIComponent(subtitlesParam);
      fetch(subUrl)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then(text => {
          const name = subUrl.split('/').pop() || 'remote_subtitles.srt';
          handleSubtitlesLoaded(text, name);
        })
        .catch(err => {
          console.error("Failed to load remote subtitles:", err);
          setRemoteLoadError("Failed to fetch remote subtitles. Check your internet connection or CORS settings on the file host.");
        })
        .finally(() => {
          setIsLoadingRemoteSubtitles(false);
        });
    }
  }, []);

  // Compute reactive warning if chosen export format will strip layout settings
  const hasAlignOrLine = cues.some(c => c.align !== undefined || c.line !== undefined);
  const hasLineOnly = cues.some(c => c.line !== undefined);

  let lossyWarning: string | null = null;
  if (cues.length > 0) {
    if (exportFormat === 'srt' && hasAlignOrLine) {
      lossyWarning = 'SRT strips layout alignment/position settings';
    } else if (exportFormat === 'ttml' && hasLineOnly) {
      lossyWarning = 'TTML strips vertical position placement';
    }
  }

  // AI Endpoint Settings
  const [aiSettings, setAiSettings] = useState<{
    provider: 'chrome' | 'openai';
    endpoint: string;
    apiKey: string;
    model: string;
  }>(() => {
    const saved = localStorage.getItem('deltascribe_ai_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      provider: 'chrome',
      endpoint: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'llama3'
    };
  });

  const handleUpdateAiSettings = (newSettings: typeof aiSettings) => {
    setAiSettings(newSettings);
    localStorage.setItem('deltascribe_ai_settings', JSON.stringify(newSettings));
  };

  const playerRef = useRef<HTMLMediaElement | null>(null);

  // Active subtitle cue based on playback progress
  const activeCue = cues.find(
    (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
  ) || null;

  // Import handlers
  const handleMediaLoaded = (file: File) => {
    // Revoke previous URL if any to avoid memory leaks
    if (mediaFile?.url) {
      URL.revokeObjectURL(mediaFile.url);
    }
    const url = URL.createObjectURL(file);
    setMediaFile({
      name: file.name,
      type: file.type,
      url,
    });
  };

  const handleSubtitlesLoaded = (text: string, fileName: string) => {
    const parsed = parseSRT(text);
    const newTrackId = generateId();
    const newTrack = { id: newTrackId, name: fileName, cues: parsed };
    setSubtitleTracks(prev => [...prev, newTrack]);
    setActiveTrackId(prev => prev || newTrackId);

    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'vtt') {
      setExportFormat('vtt');
    } else if (ext === 'ttml' || ext === 'xml') {
      setExportFormat('ttml');
    } else {
      setExportFormat('srt');
    }

    // Auto-enable layout settings if cues contain formatting or alignment parameters
    const hasAlignOrLine = parsed.some(c => c.align !== undefined || c.line !== undefined);
    const hasFormatting = parsed.some(c => /<\/?(i|b|u)\b[^>]*>/i.test(c.text));
    if (hasAlignOrLine) {
      setEnableAlignment(true);
    }
    if (hasFormatting) {
      setEnableFormatting(true);
    }

    if (parsed.length > 0) {
      setSelectedCueId(parsed[0].id);
    }
  };

  const handleCopyReferenceTiming = (cueId: string, startTime: number, endTime: number) => {
    handleUpdateCue(cueId, { startTime, endTime });
  };

  const handleCreateNewSubtitles = () => {
    const newTrackId = generateId();
    const initialCueId = generateId();
    const initialCue: SubtitleCue = {
      id: initialCueId,
      index: 1,
      startTime: playerRef.current?.currentTime || 0,
      endTime: (playerRef.current?.currentTime || 0) + 2.0,
      originalStartTime: playerRef.current?.currentTime || 0,
      originalEndTime: (playerRef.current?.currentTime || 0) + 2.0,
      text: 'New Subtitle'
    };
    const newTrack = { id: newTrackId, name: 'new_subtitles.srt', cues: [initialCue] };
    setSubtitleTracks(prev => [...prev, newTrack]);
    setActiveTrackId(newTrackId);
    setExportFormat('srt');
    setSelectedCueId(initialCueId);
  };

  // Cue mutation actions
  const handleAddCue = useCallback((targetCueId?: string, position: 'before' | 'after' = 'after', atCurrentTime: boolean = false) => {
    const newId = generateId();
    
    setActiveCues((prevCues) => {
      let newCueStart = 0;
      let newCueEnd = 2.0;

      if (atCurrentTime) {
        newCueStart = playerRef.current?.currentTime || 0;
        newCueEnd = newCueStart + 2.0;
      } else if (targetCueId && prevCues.length > 0) {
        const targetIdx = prevCues.findIndex(c => c.id === targetCueId);
        if (targetIdx !== -1) {
          const targetCue = prevCues[targetIdx];
          if (position === 'before') {
            const prevCue = targetIdx > 0 ? prevCues[targetIdx - 1] : null;
            if (prevCue) {
              newCueStart = Math.max(prevCue.endTime + 0.1, targetCue.startTime - 2.1);
            } else {
              newCueStart = Math.max(0, targetCue.startTime - 2.1);
            }
            newCueEnd = Math.min(newCueStart + 2.0, Math.max(newCueStart + 0.5, targetCue.startTime - 0.1));
          } else {
            newCueStart = targetCue.endTime + 0.1;
            const nextCue = targetIdx < prevCues.length - 1 ? prevCues[targetIdx + 1] : null;
            if (nextCue && newCueStart + 2.0 > nextCue.startTime) {
              newCueEnd = Math.max(newCueStart + 0.5, nextCue.startTime - 0.1);
            } else {
              newCueEnd = newCueStart + 2.0;
            }
          }
        }
      } else if (prevCues.length > 0) {
        const lastCue = prevCues[prevCues.length - 1];
        newCueStart = lastCue.endTime + 0.1;
        newCueEnd = newCueStart + 2.0;
      } else {
        newCueStart = playerRef.current?.currentTime || 0;
        newCueEnd = newCueStart + 2.0;
      }

      const formattedStart = Number(newCueStart.toFixed(3));
      const formattedEnd = Number(newCueEnd.toFixed(3));

      const newCue: SubtitleCue = {
        id: newId,
        index: 1, // Will be reindexed
        startTime: formattedStart,
        endTime: formattedEnd,
        originalStartTime: formattedStart,
        originalEndTime: formattedEnd,
        text: 'New Subtitle',
      };

      let updatedCues: SubtitleCue[] = [];
      if (atCurrentTime) {
        const insertIndex = prevCues.findIndex(c => c.startTime > formattedStart);
        if (insertIndex === -1) {
          updatedCues = [...prevCues, newCue];
        } else {
          updatedCues = [
            ...prevCues.slice(0, insertIndex),
            newCue,
            ...prevCues.slice(insertIndex)
          ];
        }
      } else if (targetCueId && prevCues.length > 0) {
        const targetIdx = prevCues.findIndex(c => c.id === targetCueId);
        if (targetIdx !== -1) {
          if (position === 'before') {
            updatedCues = [
              ...prevCues.slice(0, targetIdx),
              newCue,
              ...prevCues.slice(targetIdx)
            ];
          } else {
            updatedCues = [
              ...prevCues.slice(0, targetIdx + 1),
              newCue,
              ...prevCues.slice(targetIdx + 1)
            ];
          }
        } else {
          updatedCues = [...prevCues, newCue];
        }
      } else {
        updatedCues = [...prevCues, newCue];
      }

      return updatedCues.map((cue, idx) => ({
        ...cue,
        index: idx + 1
      }));
    });

    setSelectedCueId(newId);
    pushHistoryState(subtitleTracks, position === 'before' ? `Inserted cue before selected` : `Added new cue`, 'add');
  }, [setActiveCues, pushHistoryState, subtitleTracks]);

  const handleValidateOrder = useCallback((id: string) => {
    setActiveCues((prevCues) => {
      const cue = prevCues.find(c => c.id === id);
      if (!cue) return prevCues;

      const nextCue = prevCues.find(c => c.index === cue.index + 1);
      if (!nextCue || (cue.startTime < nextCue.startTime && cue.endTime <= nextCue.startTime)) {
        return prevCues;
      }

      const confirmResult = window.confirm(
        `Cue #${cue.index} timing overlaps with Cue #${nextCue.index}.\n\n` +
        `Click OK to enable Scaling Mode and recalculate timings across all captions using our scaling algorithm.\n` +
        `Click Cancel to push subsequent subtitles forward to prevent overlap.`
      );

      let updated = [...prevCues];
      if (confirmResult) {
        setTimeout(() => setScalingModeEnabled(true), 0);
        const anchors: { orig: number; actual: number }[] = [];
        if (scalingOptions.anchorStart) {
          anchors.push({ orig: 0, actual: 0 });
        }
        if (scalingOptions.anchorEnd && duration) {
          anchors.push({ orig: duration, actual: duration });
        }

        updated = updated.map(c => c.id === id ? { ...c, isAnchor: true } : c);

        updated.forEach((c) => {
          if (c.isAnchor) {
            if (c.originalStartTime !== undefined) {
              anchors.push({ orig: c.originalStartTime, actual: c.startTime });
            }
            if (c.originalEndTime !== undefined) {
              anchors.push({ orig: c.originalEndTime, actual: c.endTime });
            }
          }
        });

        updated = updated.map((c) => {
          if (c.isAnchor) return c;

          const origStart = c.originalStartTime ?? c.startTime;
          const origEnd = c.originalEndTime ?? c.endTime;
          const newStart = interpolateTime(origStart, anchors);
          const newEnd = interpolateTime(origEnd, anchors);

          return {
            ...c,
            startTime: newStart,
            endTime: newEnd >= newStart ? newEnd : newStart + 1.0,
          };
        });
      } else {
        updated = [...updated].sort((a, b) => a.index - b.index);
        const targetIdx = updated.findIndex(c => c.id === id);
        if (targetIdx !== -1) {
          for (let i = targetIdx + 1; i < updated.length; i++) {
            const prev = updated[i - 1];
            const curr = updated[i];
            if (curr.startTime < prev.endTime) {
              const durationVal = curr.endTime - curr.startTime;
              curr.startTime = prev.endTime + 0.1;
              curr.endTime = curr.startTime + durationVal;
            }
          }
        }
      }

      return updated.map((c, idx) => ({ ...c, index: idx + 1 }));
    });
  }, [setActiveCues, scalingOptions, duration]);

  const handleUpdateCue = useCallback((id: string, updatedFields: Partial<SubtitleCue>) => {
    setActiveCues((prevCues) => {
      let updated = prevCues.map((cue) => {
        if (cue.id === id) {
          const result = { ...cue, ...updatedFields };

          // Automatically manage anchor state in scaling mode
          if (scalingModeEnabled) {
            if (updatedFields.startTime !== undefined || updatedFields.endTime !== undefined) {
              const isResetStart = updatedFields.startTime !== undefined && updatedFields.startTime === cue.originalStartTime;
              const isResetEnd = updatedFields.endTime !== undefined && updatedFields.endTime === cue.originalEndTime;
              if (isResetStart || isResetEnd) {
                result.isAnchor = false;
              } else {
                result.isAnchor = true;
              }
            }
          }

          // Validations
          if (result.startTime < 0) result.startTime = 0;
          if (result.endTime < result.startTime) {
            if (updatedFields.startTime !== undefined) {
              result.endTime = result.startTime + 1.0;
            } else {
              result.startTime = Math.max(0, result.endTime - 1.0);
            }
          }
          return result;
        }
        return cue;
      });

      if (scalingModeEnabled) {
        const anchors: { orig: number; actual: number }[] = [];
        if (scalingOptions.anchorStart) {
          anchors.push({ orig: 0, actual: 0 });
        }
        if (scalingOptions.anchorEnd && duration) {
          anchors.push({ orig: duration, actual: duration });
        }

        updated.forEach((c) => {
          if (c.isAnchor) {
            if (c.originalStartTime !== undefined) {
              anchors.push({ orig: c.originalStartTime, actual: c.startTime });
            }
            if (c.originalEndTime !== undefined) {
              anchors.push({ orig: c.originalEndTime, actual: c.endTime });
            }
          }
        });

        updated = updated.map((c) => {
          if (c.isAnchor) return c;

          const origStart = c.originalStartTime ?? c.startTime;
          const origEnd = c.originalEndTime ?? c.endTime;
          const newStart = interpolateTime(origStart, anchors);
          const newEnd = interpolateTime(origEnd, anchors);

          return {
            ...c,
            startTime: newStart,
            endTime: newEnd >= newStart ? newEnd : newStart + 1.0,
          };
        });
      }

      return updated.map((cue, idx) => ({
        ...cue,
        index: idx + 1
      }));
    });

    // Check overlap immediately if NOT focused (e.g. button click or hotkey)
    if (!isInputFocused) {
      setTimeout(() => {
        handleValidateOrder(id);
      }, 0);
    }
  }, [setActiveCues, scalingModeEnabled, scalingOptions, duration, isInputFocused, handleValidateOrder]);

  const triggerRecalculateCues = useCallback(() => {
    setActiveCues((prevCues) => {
      const anchors: { orig: number; actual: number }[] = [];
      if (scalingOptions.anchorStart) {
        anchors.push({ orig: 0, actual: 0 });
      }
      if (scalingOptions.anchorEnd && duration) {
        anchors.push({ orig: duration, actual: duration });
      }

      prevCues.forEach((c) => {
        if (c.isAnchor) {
          if (c.originalStartTime !== undefined) {
            anchors.push({ orig: c.originalStartTime, actual: c.startTime });
          }
          if (c.originalEndTime !== undefined) {
            anchors.push({ orig: c.originalEndTime, actual: c.endTime });
          }
        }
      });

      return prevCues.map((c) => {
        if (c.isAnchor) return c;

        const origStart = c.originalStartTime ?? c.startTime;
        const origEnd = c.originalEndTime ?? c.endTime;
        const newStart = interpolateTime(origStart, anchors);
        const newEnd = interpolateTime(origEnd, anchors);

        return {
          ...c,
          startTime: newStart,
          endTime: newEnd >= newStart ? newEnd : newStart + 1.0,
        };
      });
    });
  }, [setActiveCues, scalingOptions, duration]);

  useEffect(() => {
    if (scalingModeEnabled) {
      triggerRecalculateCues();
    }
  }, [scalingModeEnabled, scalingOptions, duration, triggerRecalculateCues]);

  const handleClearAllAnchors = useCallback(() => {
    setActiveCues((prevCues) => {
      return prevCues.map((c) => ({
        ...c,
        isAnchor: false,
        startTime: c.originalStartTime ?? c.startTime,
        endTime: c.originalEndTime ?? c.endTime,
      }));
    });
  }, [setActiveCues]);

  const handleDeleteCue = useCallback((id: string) => {
    setActiveCues((prevCues) => {
      const filtered = prevCues.filter((cue) => cue.id !== id);
      const reindexed = filtered.map((cue, idx) => ({
        ...cue,
        index: idx + 1
      }));
      
      setSelectedCueId((prevSelected) => {
        if (prevSelected === id) {
          return reindexed.length > 0 ? reindexed[0].id : null;
        }
        return prevSelected;
      });
      
      return reindexed;
    });
    const deletedCue = cues.find(c => c.id === id);
    pushHistoryState(subtitleTracks, `Deleted Cue #${deletedCue?.index || ''}`, 'delete');
  }, [setActiveCues, cues, pushHistoryState, subtitleTracks]);

  const handleUpdateMultipleCueTimings = useCallback((updates: { id: string; startTime: number; endTime: number }[]) => {
    setActiveCues((prevCues) => {
      const updated = prevCues.map((cue) => {
        const match = updates.find((u) => u.id === cue.id);
        if (match) {
          return {
            ...cue,
            startTime: match.startTime,
            endTime: match.endTime,
          };
        }
        return cue;
      });

      return updated.sort((a, b) => a.startTime - b.startTime).map((cue, idx) => ({
        ...cue,
        index: idx + 1
      }));
    });
  }, [setActiveCues]);

  const handleSplitCue = useCallback((id: string) => {
    setActiveCues((prevCues) => {
      const cueIndex = prevCues.findIndex((c) => c.id === id);
      if (cueIndex === -1) return prevCues;

      const cue = prevCues[cueIndex];
      const durationVal = cue.endTime - cue.startTime;
      const midTime = cue.startTime + durationVal / 2;

      let text1 = '';
      let text2 = '';
      const newlineIndex = cue.text.indexOf('\n');

      if (newlineIndex !== -1) {
        text1 = cue.text.substring(0, newlineIndex).trim();
        text2 = cue.text.substring(newlineIndex + 1).trim();
      } else {
        const words = cue.text.split(' ');
        if (words.length > 1) {
          const midWord = Math.ceil(words.length / 2);
          text1 = words.slice(0, midWord).join(' ');
          text2 = words.slice(midWord).join(' ');
        } else {
          text1 = cue.text;
          text2 = '...';
        }
      }

      const secondId = generateId();

      const firstCue: SubtitleCue = {
        ...cue,
        endTime: midTime,
        text: text1 || '...',
      };

      const secondCue: SubtitleCue = {
        id: secondId,
        index: cue.index + 1,
        startTime: midTime,
        endTime: cue.endTime,
        text: text2 || '...',
      };

      const updatedCues = [
        ...prevCues.slice(0, cueIndex),
        firstCue,
        secondCue,
        ...prevCues.slice(cueIndex + 1),
      ];

      setSelectedCueId(secondId);

      return updatedCues.map((c, idx) => ({
        ...c,
        index: idx + 1,
      }));
    });
  }, [setActiveCues]);

  const handleShiftTimes = useCallback((seconds: number, target: 'all' | 'selected') => {
    setActiveCues((prevCues) => {
      const updated = prevCues.map((cue) => {
        if (target === 'all' || (target === 'selected' && cue.id === selectedCueId)) {
          const start = Math.max(0, cue.startTime + seconds);
          const end = Math.max(0, cue.endTime + seconds);
          return {
            ...cue,
            startTime: start,
            endTime: end >= start ? end : start + 1.0
          };
        }
        return cue;
      });

      return updated.map((cue, idx) => ({
        ...cue,
        index: idx + 1
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveCues, selectedCueId]);

  const handleSeek = (time: number) => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to unload current files? Unsaved sync progress will be lost.")) {
      if (mediaFile?.url) {
        URL.revokeObjectURL(mediaFile.url);
      }
      setMediaFile(null);
      setSubtitleTracks([]);
      setActiveTrackId(null);
      setSelectedCueId(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  };

  const handleExport = () => {
    if (cues.length === 0) return;
    
    let formatted = '';
    if (exportFormat === 'vtt') {
      formatted = formatVTT(cues);
    } else if (exportFormat === 'ttml') {
      formatted = formatTTML(cues, subtitleLang);
    } else {
      formatted = formatSRT(cues);
    }
    
    const blob = new Blob([formatted], { type: exportFormat === 'ttml' ? 'application/xml;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Get export name
    let exportName = `synced_subtitles.${exportFormat}`;
    if (subtitleFileName) {
      const baseName = subtitleFileName.replace(/\.(srt|vtt|xml|ttml)$/i, '');
      exportName = `${baseName}.${exportFormat}`;
    }
    
    link.href = url;
    link.download = exportName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    if (!submitUrl || cues.length === 0) return;

    let formatted = '';
    if (exportFormat === 'vtt') {
      formatted = formatVTT(cues);
    } else if (exportFormat === 'ttml') {
      formatted = formatTTML(cues, subtitleLang);
    } else {
      formatted = formatSRT(cues);
    }

    setIsSubmitting(true);
    fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: subtitleFileName || 'subtitles.srt',
        format: exportFormat,
        subtitles: formatted,
        cues: cues.map(c => ({
          index: c.index,
          startTime: c.startTime,
          endTime: c.endTime,
          text: c.text,
          align: c.align,
          line: c.line
        }))
      })
    })
    .then(async res => {
      if (!res.ok) {
        // Receiving servers can return a JSON { message } body to explain
        // what went wrong (e.g. wrong format, expired/invalid submit link);
        // surface that instead of a bare HTTP status when present.
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body && typeof body.message === 'string' && body.message) {
            detail = body.message;
          }
        } catch {
          // Response wasn't JSON — fall back to the HTTP status above.
        }
        throw new Error(detail);
      }
      alert("Subtitles submitted successfully!");
    })
    .catch(err => {
      console.error("Failed to submit subtitles:", err);
      alert(`Failed to submit subtitles: ${err.message}. Please check remote server availability and CORS permissions.`);
    })
    .finally(() => {
      setIsSubmitting(false);
    });
  };

  // Keyboard Event Listeners for Syncing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused) return; // Skip if user is editing subtitle text or numbers

      const player = playerRef.current;
      if (!player) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          player.pause();
        } else {
          player.play().catch(err => console.log(err));
        }
      } else if (e.code === 'BracketLeft') {
        e.preventDefault();
        if (selectedCueId) {
          handleUpdateCue(selectedCueId, { startTime: player.currentTime });
        }
      } else if (e.code === 'BracketRight') {
        e.preventDefault();
        if (selectedCueId) {
          handleUpdateCue(selectedCueId, { endTime: player.currentTime });
        }
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        handleAddCue();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const amount = e.shiftKey ? -0.5 : -5;
        player.currentTime = Math.max(0, player.currentTime + amount);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const amount = e.shiftKey ? 0.5 : 5;
        player.currentTime = Math.min(player.duration || 0, player.currentTime + amount);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInputFocused, selectedCueId, isPlaying, handleAddCue, handleUpdateCue]);

  return (
    <>
      <header className="app-header">
        <div className="brand-section">
          <div className="app-logo">
            <img src={logoIcon} className="app-logo-img" alt="DeltaScribe Logo" />
          </div>
          <h1>{__('DeltaScribe Studio')}</h1>
        </div>
        <div className="header-actions-group">
          {!mediaFile && <KeyboardShortcutsHelp />}
          {mediaFile && (
            <button onClick={handleReset} className="btn btn-secondary btn-sm" type="button">
              <RefreshCw size={14} />
              {__('Reset Workspace')}
            </button>
          )}
          {cues.length > 0 && (
            <div className="export-container">
              {lossyWarning && (
                <div className="lossy-warning" title={`${lossyWarning}. The export will be lossy.`}>
                  <AlertCircle size={14} />
                  <span>{lossyWarning}</span>
                </div>
              )}
              <div className="export-group">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'srt' | 'vtt' | 'ttml')}
                  className="select-format"
                  aria-label="Select export format"
                  disabled={!!lockedFormat}
                  title={lockedFormat ? `Format locked to ${lockedFormat.toUpperCase()} by the embedding site` : undefined}
                >
                  <option value="srt">SRT</option>
                  <option value="vtt">VTT</option>
                  <option value="ttml">TTML</option>
                </select>
                <button onClick={handleExport} className="btn btn-primary btn-sm" type="button">
                  <Download size={14} />
                  {__('Export')}
                </button>
                {submitUrl && (
                  <button
                    onClick={handleSubmit}
                    className="btn btn-success btn-sm"
                    type="button"
                    disabled={isSubmitting}
                    title={`Submits to: ${submitUrl}`}
                  >
                    {isSubmitting
                      ? __('Submitting...')
                      : `${__('Submit')} → ${submitHost}`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main 
        className="dashboard-grid"
        style={mediaFile && isWorkspaceReady ? { gridTemplateColumns: `${leftColumnWidth}px 12px 1fr` } : undefined}
      >
        {!(mediaFile && isWorkspaceReady) ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <FileDropZone
              mediaFile={mediaFile}
              subtitleTracks={subtitleTracks}
              activeTrackId={activeTrackId}
              onSelectActiveTrack={setActiveTrackId}
              onRemoveTrack={(id) => {
                setSubtitleTracks(prev => {
                  const next = prev.filter(t => t.id !== id);
                  if (activeTrackId === id) {
                    setActiveTrackId(next.length > 0 ? next[0].id : null);
                  }
                  return next;
                });
              }}
              onMediaLoaded={handleMediaLoaded}
              onSubtitlesLoaded={handleSubtitlesLoaded}
              onCreateNewSubtitles={handleCreateNewSubtitles}
              onStartWorkspace={() => setIsWorkspaceReady(true)}
              isLoadingRemoteSubtitles={isLoadingRemoteSubtitles}
              remoteLoadError={remoteLoadError}
            />
          </div>
        ) : (
          <>
            {/* Left Column: Player & Dropzone details */}
            <div className="workspace-importer">
              <MediaPanel
                mediaFile={mediaFile}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                activeCue={activeCue}
                cues={cues}
                selectedCueId={selectedCueId}
                onSelectCue={setSelectedCueId}
                playerRef={playerRef}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                onPlayStateChange={setIsPlaying}
              />
              
              <KeyboardShortcutsHelp variant="inline" />
              {cues.length > 0 && (
                <AiAligner
                  cues={cues}
                  getCurrentTime={() => playerRef.current?.currentTime || 0}
                  onUpdateCueTimings={handleUpdateMultipleCueTimings}
                  onSaveCurrentAsReference={() => {
                    if (activeTrack) {
                      const newTrackId = generateId();
                      const newTrack = {
                        id: newTrackId,
                        name: `original_${activeTrack.name}`,
                        cues: [...activeTrack.cues]
                      };
                      setSubtitleTracks(prev => [...prev, newTrack]);
                    }
                  }}
                  onUpdateAllCues={(updatedCues) => {
                    setActiveCues(() => updatedCues);
                    if (activeTrackId) {
                      setSubtitleTracks(prev => prev.map(t => {
                        if (t.id === activeTrackId) {
                          const ext = t.name.split('.').pop()?.toLowerCase();
                          const base = t.name.replace(/\.(srt|vtt|xml|ttml)$/i, '');
                          return {
                            ...t,
                            name: `${base}_translated.${ext || 'srt'}`,
                            cues: updatedCues
                          };
                        }
                        return t;
                      }));
                    }
                  }}
                  aiSettings={aiSettings}
                  onUpdateAiSettings={handleUpdateAiSettings}
                  onSeek={handleSeek}
                />
              )}
              {!subtitleFileName && (
                <div className="alert alert-info">
                  <AlertCircle size={16} />
                  <span>You've loaded the media! Select an SRT file or click <strong>Create New SRT</strong> in the header/sidebar to start timing.</span>
                </div>
              )}
            </div>

            {/* Draggable Resizer Bar */}
            <div
              className={`workspace-resizer-handle ${isResizing ? 'resizing' : ''}`}
              onMouseDown={handleMouseDownResizer}
              title="Drag to resize Media and Captions columns"
            >
              <GripVertical size={14} className="resizer-icon" />
            </div>

            {/* Right Column: Cue timing list */}
            <div>
              <SubtitleEditor
                cues={cues}
                referenceCues={referenceCues}
                selectedCueId={selectedCueId}
                currentTime={currentTime}
                isTextEditable={isTextEditable}
                onToggleTextEditable={() => setIsTextEditable(!isTextEditable)}
                onSelectCue={setSelectedCueId}
                onChangeCue={handleUpdateCue}
                onDeleteCue={handleDeleteCue}
                onAddCue={handleAddCue}
                onSplitCue={handleSplitCue}
                onShiftTimes={handleShiftTimes}
                onSeek={handleSeek}
                onFocusInput={setIsInputFocused}
                onCopyReferenceTiming={handleCopyReferenceTiming}
                enableAlignment={enableAlignment}
                setEnableAlignment={setEnableAlignment}
                enableFormatting={enableFormatting}
                setEnableFormatting={setEnableFormatting}
                scalingModeEnabled={scalingModeEnabled}
                onToggleScalingMode={() => setScalingModeEnabled(!scalingModeEnabled)}
                scalingOptions={scalingOptions}
                onChangeScalingOptions={setScalingOptions}
                onClearAllAnchors={handleClearAllAnchors}
                duration={duration}
                onValidateOrder={handleValidateOrder}
              />
            </div>
          </>
        )}
      </main>

      {mediaFile && isWorkspaceReady && (
        <AuditLogDrawer
          entries={auditLog}
          currentHistoryIndex={historyIndex}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex >= 0}
          canRedo={historyIndex < historyStack.length - 1}
        />
      )}

      <footer className="app-footer">
        <p>
          DeltaScribe Studio is free and open-source software under the GPLv3 license. 
          Contributions and details are available on <a href="https://github.com/georgestephanis/DeltaScribe" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>
      </footer>
    </>
  );
}

export default App;
