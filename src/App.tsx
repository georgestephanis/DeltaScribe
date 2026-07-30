import { useState, useRef, useEffect, useCallback } from 'react';
import { FileDropZone } from './components/FileDropZone';
import { MediaPanel } from './components/MediaPanel';
import { SubtitleEditor } from './components/SubtitleEditor';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { parseSRT, formatSRT, formatVTT, formatTTML, type SubtitleCue } from './utils/subtitles';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import { AiAligner } from './components/AiAligner';
import { __ } from './utils/i18n';
import logoIcon from './assets/delta-scribe-icon.svg';

function App() {
  // Loaded assets state
  const [mediaFile, setMediaFile] = useState<{ name: string; type: string; url: string; isRemote?: boolean } | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: string; name: string; cues: SubtitleCue[] }[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

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

  // Reference subtitle track states
  const [remoteLoadError, setRemoteLoadError] = useState<string | null>(null);
  const [submitUrl, setSubmitUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load remote files from query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mediaParam = params.get('media');
    const subtitlesParam = params.get('subtitles');
    const submitParam = params.get('submit');

    if (submitParam) {
      setSubmitUrl(decodeURIComponent(submitParam));
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
    const newTrackId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
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
    const newTrackId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const initialCueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const initialCue: SubtitleCue = {
      id: initialCueId,
      index: 1,
      startTime: playerRef.current?.currentTime || 0,
      endTime: (playerRef.current?.currentTime || 0) + 2.0,
      text: 'New Subtitle'
    };
    const newTrack = { id: newTrackId, name: 'new_subtitles.srt', cues: [initialCue] };
    setSubtitleTracks(prev => [...prev, newTrack]);
    setActiveTrackId(newTrackId);
    setExportFormat('srt');
    setSelectedCueId(initialCueId);
  };

  // Cue mutation actions
  const handleAddCue = useCallback((insertAfterId?: string) => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    
    setActiveCues((prevCues) => {
      let newCueStart = playerRef.current?.currentTime || 0;
      
      if (prevCues.length > 0) {
        if (insertAfterId) {
          const afterCue = prevCues.find(c => c.id === insertAfterId);
          if (afterCue) {
            newCueStart = afterCue.endTime + 0.1;
          }
        } else {
          const lastCue = prevCues[prevCues.length - 1];
          newCueStart = lastCue.endTime + 0.1;
        }
      }

      const newCue: SubtitleCue = {
        id: newId,
        index: 1, // Will be reindexed
        startTime: newCueStart,
        endTime: newCueStart + 2.0,
        text: 'New Subtitle',
      };

      let updatedCues: SubtitleCue[] = [];
      if (insertAfterId) {
        const insertIndex = prevCues.findIndex(c => c.id === insertAfterId);
        updatedCues = [
          ...prevCues.slice(0, insertIndex + 1),
          newCue,
          ...prevCues.slice(insertIndex + 1)
        ];
      } else {
        updatedCues = [...prevCues, newCue];
      }

      return updatedCues.map((cue, idx) => ({
        ...cue,
        index: idx + 1
      }));
    });

    setSelectedCueId(newId);
  }, [setActiveCues]);

  const handleUpdateCue = useCallback((id: string, updatedFields: Partial<SubtitleCue>) => {
    setActiveCues((prevCues) => {
      const updated = prevCues.map((cue) => {
        if (cue.id === id) {
          const result = { ...cue, ...updatedFields };
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
      
      return updated.map((cue, idx) => ({
        ...cue,
        index: idx + 1
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
  }, [setActiveCues]);

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

      const secondId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);

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
      formatted = formatTTML(cues);
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
      formatted = formatTTML(cues);
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
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
                  >
                    {isSubmitting ? __('Submitting...') : __('Submit')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="dashboard-grid">
        {!mediaFile ? (
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
                      const newTrackId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
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
                />
              )}
              {!subtitleFileName && (
                <div className="alert alert-info">
                  <AlertCircle size={16} />
                  <span>You've loaded the media! Select an SRT file or click <strong>Create New SRT</strong> in the header/sidebar to start timing.</span>
                </div>
              )}
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
              />
            </div>
          </>
        )}
      </main>

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
