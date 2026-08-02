import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Search, FastForward, SlidersHorizontal, Lock, Unlock, Scissors, RotateCcw, Copy, Settings, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Anchor, Play, ChevronDown, Clock } from 'lucide-react';
import type { SubtitleCue } from '../utils/subtitles';
import { __ } from '../utils/i18n';

interface SubtitleEditorProps {
  cues: SubtitleCue[];
  referenceCues: SubtitleCue[];
  selectedCueId: string | null;
  currentTime: number;
  isTextEditable: boolean;
  onToggleTextEditable: () => void;
  onSelectCue: (id: string) => void;
  onChangeCue: (id: string, updatedFields: Partial<SubtitleCue>) => void;
  onDeleteCue: (id: string) => void;
  onAddCue: (targetCueId?: string, position?: 'before' | 'after', atCurrentTime?: boolean) => void;
  onSplitCue: (id: string) => void;
  onShiftTimes: (seconds: number, target: 'all' | 'selected') => void;
  onSeek: (time: number) => void;
  onFocusInput: (isFocused: boolean) => void;
  onCopyReferenceTiming: (cueId: string, startTime: number, endTime: number) => void;
  enableAlignment: boolean;
  setEnableAlignment: (val: boolean) => void;
  enableFormatting: boolean;
  setEnableFormatting: (val: boolean) => void;
  scalingModeEnabled: boolean;
  onToggleScalingMode: () => void;
  scalingOptions: { anchorStart: boolean; anchorEnd: boolean };
  onChangeScalingOptions: (opts: { anchorStart: boolean; anchorEnd: boolean }) => void;
  onClearAllAnchors: () => void;
  duration: number;
  onValidateOrder?: (id: string) => void;
}

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

function AutoExpandingTextarea({ value, ...props }: AutoExpandingTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      {...props}
      style={{ ...props.style, overflowY: 'hidden', resize: 'none' }}
    />
  );
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  cues,
  referenceCues,
  selectedCueId,
  currentTime,
  isTextEditable,
  onToggleTextEditable,
  onSelectCue,
  onChangeCue,
  onDeleteCue,
  onAddCue,
  onSplitCue,
  onShiftTimes,
  onSeek,
  onFocusInput,
  onCopyReferenceTiming,
  enableAlignment,
  setEnableAlignment,
  enableFormatting,
  setEnableFormatting,
  scalingModeEnabled,
  onToggleScalingMode,
  scalingOptions,
  onChangeScalingOptions,
  onClearAllAnchors,
  duration,
  onValidateOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftAmount, setShiftAmount] = useState('1.0');
  const [showShiftControls, setShowShiftControls] = useState(false);
  const [showPlaybackOptions, setShowPlaybackOptions] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [autoSeek, setAutoSeek] = useState(true);
  const [leadIn, setLeadIn] = useState(true);
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  // Helper functions for contentEditable rich text editing
  const subtitlesToHtml = (text: string): string => {
    // Escape all HTML first so untrusted cue text (e.g. from an imported
    // subtitle file) can't inject markup via the innerHTML assignment below,
    // then re-enable only the b/i/u formatting tags we intentionally support.
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped
      .replace(/&lt;b&gt;/gi, '<b>')
      .replace(/&lt;\/b&gt;/gi, '</b>')
      .replace(/&lt;i&gt;/gi, '<i>')
      .replace(/&lt;\/i&gt;/gi, '</i>')
      .replace(/&lt;u&gt;/gi, '<u>')
      .replace(/&lt;\/u&gt;/gi, '</u>');

    return escaped.replace(/\n/g, '<br>');
  };

  const htmlToSubtitles = (html: string): string => {
    let text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>\s*<div>/gi, '\n')
      .replace(/<div>/gi, '')
      .replace(/<\/div>/gi, '')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<strong>/gi, '<b>')
      .replace(/<\/strong>/gi, '</b>')
      .replace(/<em>/gi, '<i>')
      .replace(/<\/em>/gi, '</i>');

    // Strip all HTML tags except our custom formatting tags b, i, u
    text = text.replace(/<(?!(\/?(b|i|u)))\b[^>]*>/gi, '');

    // Unescape HTML entities natively
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.body.textContent || text;
  };

  // Reusable inline contentEditable text editor component
  const RichTextEditor: React.FC<{
    value: string;
    onChange: (val: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    disabled: boolean;
  }> = ({ value, onChange, onFocus, onBlur, disabled }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (editorRef.current && !isFocused) {
        editorRef.current.innerHTML = subtitlesToHtml(value);
      }
    }, [value, isFocused]);

    const handleInput = () => {
      if (editorRef.current) {
        const cleaned = htmlToSubtitles(editorRef.current.innerHTML);
        onChange(cleaned);
      }
    };

    // Wraps the current selection in a <b>/<i>/<u> element without relying on
    // the deprecated document.execCommand API.
    const applyFormat = (command: 'bold' | 'italic' | 'underline') => {
      const tagName = command === 'bold' ? 'b' : command === 'italic' ? 'i' : 'u';
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !editorRef.current) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        return;
      }

      const wrapper = document.createElement(tagName);
      try {
        range.surroundContents(wrapper);
      } catch {
        // Selection spans multiple sibling elements (surroundContents can't
        // handle that); extract and re-wrap the fragment instead.
        const contents = range.extractContents();
        wrapper.appendChild(contents);
        range.insertNode(wrapper);
      }

      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      selection.addRange(newRange);

      handleInput();
    };

    return (
      <div className="rich-editor-wrapper">
        {isFocused && !disabled && (
          <div className="rich-editor-toolbar animate-slide-down">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat('bold');
              }}
              className="toolbar-btn"
              title="Bold Selection"
              type="button"
            >
              <Bold size={12} />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat('italic');
              }}
              className="toolbar-btn"
              title="Italic Selection"
              type="button"
            >
              <Italic size={12} />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat('underline');
              }}
              className="toolbar-btn"
              title="Underline Selection"
              type="button"
            >
              <Underline size={12} />
            </button>
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onFocus={() => {
            setIsFocused(true);
            onFocus();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur();
          }}
          onInput={handleInput}
          className="rich-editor-content"
          data-placeholder="Enter subtitle text..."
        />
      </div>
    );
  };
  
  // Local state to track offset input values while typing
  const [offsetInputs, setOffsetInputs] = useState<Record<string, { startTime?: string; endTime?: string }>>({});
  const [openSettingsCueId, setOpenSettingsCueId] = useState<string | null>(null);

  // Find which cue is active at the current playback time
  const currentActiveCue = cues.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  const activeId = currentActiveCue?.id;

  // Auto-scroll to active cue
  useEffect(() => {
    if (activeId && listContainerRef.current) {
      const activeEl = document.getElementById(`cue-card-${activeId}`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeId]);

  const filteredCues = cues.filter((cue) =>
    cue.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSeconds = (sec: number) => {
    return sec.toFixed(3);
  };

  const handleTimeChange = (id: string, field: 'startTime' | 'endTime', valueStr: string) => {
    const value = parseFloat(valueStr);
    if (!isNaN(value)) {
      onChangeCue(id, { [field]: value });
    }
  };

  const getOffsetValue = (cueId: string, field: 'startTime' | 'endTime', currentVal: number, originalVal: number) => {
    const typed = offsetInputs[cueId]?.[field];
    if (typed !== undefined) return typed;
    return (currentVal - originalVal).toFixed(2);
  };

  const handleOffsetChange = (id: string, field: 'startTime' | 'endTime', originalVal: number, valueStr: string) => {
    setOffsetInputs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: valueStr,
      },
    }));

    const parsed = parseFloat(valueStr);
    if (!isNaN(parsed)) {
      onChangeCue(id, { [field]: originalVal + parsed });
    }
  };

  const handleTimeBlur = (id: string) => {
    onFocusInput(false);
    onValidateOrder?.(id);
  };

  const handleOffsetBlur = (id: string, field: 'startTime' | 'endTime') => {
    onFocusInput(false);
    onValidateOrder?.(id);
    setOffsetInputs((prev) => {
      const next = { ...prev };
      if (next[id]) {
        const fieldObj = { ...next[id] };
        delete fieldObj[field];
        next[id] = fieldObj;
      }
      return next;
    });
  };

  const handleShiftClick = (direction: 'forward' | 'backward', target: 'all' | 'selected') => {
    const amount = parseFloat(shiftAmount);
    if (!isNaN(amount)) {
      const multiplier = direction === 'forward' ? 1 : -1;
      onShiftTimes(amount * multiplier, target);
    }
  };

  return (
    <div className="subtitle-editor-panel card">
      <div className="panel-header">
        <div className="title-row">
          <h3>Subtitle Cues</h3>
          <span className="badge">{cues.length} Cues</span>
        </div>
        <div className="header-actions">
          {/* Search bar */}
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search subtitle text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => onFocusInput(true)}
              onBlur={() => onFocusInput(false)}
            />
          </div>
          
          {/* Lock / Unlock text editing toggle */}
          <button
            onClick={onToggleTextEditable}
            className={`btn btn-sm ${isTextEditable ? 'btn-secondary' : 'btn-danger active'}`}
            title={isTextEditable ? "Lock text editing" : "Unlock text editing"}
            type="button"
          >
            {isTextEditable ? <Unlock size={16} /> : <Lock size={16} />}
            {isTextEditable ? "Text Editable" : "Text Locked"}
          </button>

          {/* Alignment toggle flag settings */}
          <button
            onClick={() => setEnableAlignment(!enableAlignment)}
            className={`btn btn-sm ${enableAlignment ? 'btn-primary active' : 'btn-secondary'}`}
            title="Toggle subtitle layout alignment & position coordinates"
            type="button"
          >
            Alignments
          </button>

          {/* Formatting toggle flag settings */}
          <button
            onClick={() => setEnableFormatting(!enableFormatting)}
            className={`btn btn-sm ${enableFormatting ? 'btn-primary active' : 'btn-secondary'}`}
            title="Toggle rich text bold/italic style formatting"
            type="button"
          >
            Rich Text
          </button>

          {/* Split Add Cue Dropdown Group */}
          <div className="split-button-group" ref={addMenuRef}>
            <button
              onClick={() => onAddCue()}
              className="btn btn-secondary btn-sm main-action-btn"
              title="Add Subtitle Cue to the end"
              type="button"
            >
              <Plus size={16} />
              <span>{__('Add Cue')}</span>
            </button>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={`btn btn-secondary btn-sm dropdown-toggle-btn ${showAddMenu ? 'active' : ''}`}
              title="More insertion options"
              type="button"
            >
              <ChevronDown size={14} />
            </button>

            {showAddMenu && (
              <div className="dropdown-menu-panel">
                <button
                  onClick={() => {
                    onAddCue(undefined, 'after', false);
                    setShowAddMenu(false);
                  }}
                  className="dropdown-menu-item"
                  type="button"
                >
                  <Plus size={14} />
                  <span>{__('Add Cue at End')}</span>
                </button>
                <button
                  onClick={() => {
                    onAddCue(undefined, 'after', true);
                    setShowAddMenu(false);
                  }}
                  className="dropdown-menu-item"
                  type="button"
                >
                  <Clock size={14} />
                  <span>{__('Add Cue @ Current Time')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Segmented Timing & Playback Controls Group */}
          <div className="segmented-button-group">
            <button
              onClick={onToggleScalingMode}
              className={`btn btn-sm ${scalingModeEnabled ? 'btn-primary' : 'btn-secondary'}`}
              title="Toggle Scaling Mode: recalculate timings between manual anchor points"
              type="button"
            >
              <Anchor size={15} />
              <span>{scalingModeEnabled ? __('Scaling On') : __('Scaling Off')}</span>
            </button>
            <button
              onClick={() => setShowShiftControls(!showShiftControls)}
              className={`btn btn-sm ${showShiftControls ? 'active' : ''}`}
              title="Shift times in bulk"
              type="button"
            >
              <SlidersHorizontal size={15} />
            </button>
            <button
              onClick={() => setShowPlaybackOptions(!showPlaybackOptions)}
              className={`btn btn-sm ${showPlaybackOptions ? 'active' : ''}`}
              title="Playback sync & seek settings"
              type="button"
            >
              <Play size={15} />
            </button>
          </div>
        </div>
      </div>

      {showPlaybackOptions && (
        <div className="shift-helper-panel animate-slide-down">
          <span className="helper-label">Playback Auto-Seek Options:</span>
          <div className="shift-row" style={{ gap: '16px' }}>
            <label className="checkbox-label" title="Automatically seek player when selecting a subtitle card">
              <input
                type="checkbox"
                checked={autoSeek}
                onChange={(e) => setAutoSeek(e.target.checked)}
              />
              Auto-seek on Select
            </label>
            <label className="checkbox-label" title="Start playback 2 seconds before the subtitle start time for context" style={{ opacity: autoSeek ? 1 : 0.5 }}>
              <input
                type="checkbox"
                checked={leadIn}
                onChange={(e) => setLeadIn(e.target.checked)}
                disabled={!autoSeek}
              />
              2s Lead-in Context
            </label>
          </div>
        </div>
      )}

      {showShiftControls && (
        <div className="shift-helper-panel animate-slide-down">
          <span className="helper-label">Offset selected / all times:</span>
          <div className="shift-row">
            <input
              type="number"
              step="0.1"
              value={shiftAmount}
              onChange={(e) => setShiftAmount(e.target.value)}
              className="shift-input"
              placeholder="1.0"
              onFocus={() => onFocusInput(true)}
              onBlur={() => onFocusInput(false)}
            />
            <span className="unit">sec</span>
            
            <button
              onClick={() => handleShiftClick('backward', 'selected')}
              disabled={!selectedCueId}
              className="btn btn-secondary btn-xs"
              type="button"
            >
              - Selected
            </button>
            <button
              onClick={() => handleShiftClick('forward', 'selected')}
              disabled={!selectedCueId}
              className="btn btn-secondary btn-xs"
              type="button"
            >
              + Selected
            </button>
            
            <button
              onClick={() => handleShiftClick('backward', 'all')}
              className="btn btn-danger btn-xs"
              type="button"
            >
              - All
            </button>
            <button
              onClick={() => handleShiftClick('forward', 'all')}
              className="btn btn-danger btn-xs"
              type="button"
            >
              + All
            </button>
          </div>
        </div>
      )}

      {scalingModeEnabled && (
        <div className="scaling-helper-panel animate-slide-down">
          <span className="helper-label">Scaling Mode Options:</span>
          <div className="scaling-row">
            <label className="checkbox-label" title="Anchor the start of the video (0:00) as fixed at 0:00">
              <input
                type="checkbox"
                checked={scalingOptions.anchorStart}
                onChange={(e) => onChangeScalingOptions({ ...scalingOptions, anchorStart: e.target.checked })}
              />
              Anchor Start (0:00)
            </label>
            <label className="checkbox-label" title="Anchor the end of the video as fixed at its original duration">
              <input
                type="checkbox"
                checked={scalingOptions.anchorEnd}
                onChange={(e) => onChangeScalingOptions({ ...scalingOptions, anchorEnd: e.target.checked })}
              />
              Anchor End ({formatSeconds(duration)})
            </label>
            <button
              onClick={onClearAllAnchors}
              className="btn btn-danger btn-xs"
              title="Clear all manual anchors and reset timings"
              type="button"
              style={{ marginLeft: 'auto' }}
            >
              Clear All Anchors
            </button>
          </div>
        </div>
      )}

      {/* Cues List */}
      <div className="cues-list-scroller" ref={listContainerRef}>
        {filteredCues.length === 0 ? (
          <div className="empty-cues-state">
            <p>No subtitle cues found. Drag in an SRT file, select one, or click "Add Cue" below to start!</p>
            <button
              onClick={() => onAddCue()}
              className="btn btn-primary"
              type="button"
            >
              <Plus size={18} />
              Create First Cue
            </button>
          </div>
        ) : (
          filteredCues.map((cue) => {
            const isActive = currentActiveCue?.id === cue.id;
            const isSelected = selectedCueId === cue.id;

            const isManualAnchor = scalingModeEnabled && cue.isAnchor;
            const isAutoAdjusted = scalingModeEnabled && !cue.isAnchor && (
              (cue.originalStartTime !== undefined && Math.abs(cue.startTime - cue.originalStartTime) > 0.001) ||
              (cue.originalEndTime !== undefined && Math.abs(cue.endTime - cue.originalEndTime) > 0.001)
            );

            const nextCue = cues.find(c => c.index === cue.index + 1);
            const isOverlapping = nextCue !== undefined && cue.endTime > nextCue.startTime;

            return (
              <div key={cue.id} className="cue-card-wrapper">
                <div className="cue-hover-insert-line">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddCue(cue.id, 'before'); }}
                    className="btn-hover-insert"
                    title={`Insert cue before #${cue.index}`}
                    type="button"
                  >
                    <Plus size={12} />
                    <span>{__('Insert Cue Before')}</span>
                  </button>
                </div>
                <div
                  id={`cue-card-${cue.id}`}
                  className={`cue-card ${isActive ? 'active-playing' : ''} ${isSelected ? 'selected' : ''} ${isManualAnchor ? 'manual-anchor' : ''} ${isAutoAdjusted ? 'auto-adjusted' : ''}`}
                onClick={() => {
                  onSelectCue(cue.id);
                  if (autoSeek) {
                    const targetTime = leadIn ? Math.max(0, cue.startTime - 2.0) : cue.startTime;
                    onSeek(targetTime);
                  }
                }}
              >
                <div className="cue-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="cue-index-badge">#{cue.index}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetTime = leadIn ? Math.max(0, cue.startTime - 2.0) : cue.startTime;
                        onSeek(targetTime);
                      }}
                      className="btn-card-play-seek"
                      title={`Seek player to ${leadIn ? '2s before ' : ''}start time (${cue.startTime.toFixed(2)}s)`}
                      type="button"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                    {scalingModeEnabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeCue(cue.id, { isAnchor: !cue.isAnchor });
                        }}
                        className={`btn-anchor-toggle ${cue.isAnchor ? 'active' : ''}`}
                        title={cue.isAnchor ? "Remove timing anchor (recalculate timing)" : "Set timing anchor"}
                        type="button"
                      >
                        <Anchor size={12} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isManualAnchor && (
                      <span className="badge badge-anchor" title="Manually anchored timing">
                        <Anchor size={10} />
                        Anchor
                      </span>
                    )}
                    {isAutoAdjusted && (
                      <span className="badge badge-auto" title="Automatically adjusted timing via scaling">
                        Auto
                      </span>
                    )}
                  </div>
                  
                  <div className="cue-timing">
                    <div className="time-field">
                      <label>Start</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formatSeconds(cue.startTime)}
                        onChange={(e) => handleTimeChange(cue.id, 'startTime', e.target.value)}
                        onFocus={() => onFocusInput(true)}
                        onBlur={() => handleTimeBlur(cue.id)}
                        className="time-input-box"
                      />

                      {cue.originalStartTime !== undefined && (
                        <div className={`offset-badge-container ${isManualAnchor ? 'manual-anchor-offset' : ''} ${isAutoAdjusted ? 'auto-adjusted-offset' : ''}`}>
                          <span className="offset-symbol">Δ</span>
                          <input
                            type="text"
                            value={getOffsetValue(cue.id, 'startTime', cue.startTime, cue.originalStartTime)}
                            onChange={(e) => handleOffsetChange(cue.id, 'startTime', cue.originalStartTime!, e.target.value)}
                            onFocus={() => onFocusInput(true)}
                            onBlur={() => handleOffsetBlur(cue.id, 'startTime')}
                            className="offset-input-box"
                            title="Start time offset from original anchor (seconds)"
                          />
                          {cue.startTime !== cue.originalStartTime && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onChangeCue(cue.id, { startTime: cue.originalStartTime });
                                setOffsetInputs((prev) => {
                                  const next = { ...prev };
                                  if (next[cue.id]) {
                                    const f = { ...next[cue.id] };
                                    delete f.startTime;
                                    next[cue.id] = f;
                                  }
                                  return next;
                                });
                              }}
                              className="btn-reset-offset"
                              title="Reset start time to original anchor"
                              type="button"
                            >
                              <RotateCcw size={10} />
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); onChangeCue(cue.id, { startTime: currentTime }); }}
                        className="btn-sync-time"
                        title="Sync start to current video position (Keyboard shortcut: '[')"
                        type="button"
                      >
                        [
                      </button>
                    </div>

                    <div className="timing-arrow">➔</div>

                    <div className={`time-field ${isOverlapping ? 'overlap-warning-border' : ''}`}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        End
                        {isOverlapping && (
                          <span className="overlap-warning-text" title={`Overlaps with Cue #${nextCue.index}`}>
                            ⚠️ Overlaps #{nextCue.index}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formatSeconds(cue.endTime)}
                        onChange={(e) => handleTimeChange(cue.id, 'endTime', e.target.value)}
                        onFocus={() => onFocusInput(true)}
                        onBlur={() => handleTimeBlur(cue.id)}
                        className="time-input-box"
                      />

                      {cue.originalEndTime !== undefined && (
                        <div className={`offset-badge-container ${isManualAnchor ? 'manual-anchor-offset' : ''} ${isAutoAdjusted ? 'auto-adjusted-offset' : ''}`}>
                          <span className="offset-symbol">Δ</span>
                          <input
                            type="text"
                            value={getOffsetValue(cue.id, 'endTime', cue.endTime, cue.originalEndTime)}
                            onChange={(e) => handleOffsetChange(cue.id, 'endTime', cue.originalEndTime!, e.target.value)}
                            onFocus={() => onFocusInput(true)}
                            onBlur={() => handleOffsetBlur(cue.id, 'endTime')}
                            className="offset-input-box"
                            title="End time offset from original anchor (seconds)"
                          />
                          {cue.endTime !== cue.originalEndTime && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onChangeCue(cue.id, { endTime: cue.originalEndTime });
                                setOffsetInputs((prev) => {
                                  const next = { ...prev };
                                  if (next[cue.id]) {
                                    const f = { ...next[cue.id] };
                                    delete f.endTime;
                                    next[cue.id] = f;
                                  }
                                  return next;
                                });
                              }}
                              className="btn-reset-offset"
                              title="Reset end time to original anchor"
                              type="button"
                            >
                              <RotateCcw size={10} />
                            </button>
                          )}
                        </div>
                      )}

                      {isSelected && (
                        <div className="end-adjust-group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeCue(cue.id, { endTime: Math.max(cue.startTime + 0.1, cue.endTime - 0.5) });
                            }}
                            className="btn-adjust"
                            title="Reduce duration by 0.5s"
                            type="button"
                          >
                            -0.5s
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeCue(cue.id, { endTime: cue.endTime + 0.5 });
                            }}
                            className="btn-adjust"
                            title="Extend duration by 0.5s"
                            type="button"
                          >
                            +0.5s
                          </button>
                          {nextCue && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onChangeCue(cue.id, { endTime: nextCue.startTime });
                              }}
                              className="btn-adjust btn-adjust-stretch"
                              title={`Stretch end to start of next subtitle (Cue #${nextCue.index})`}
                              type="button"
                            >
                              Stretch to Next
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); onChangeCue(cue.id, { endTime: currentTime }); }}
                        className="btn-sync-time"
                        title="Sync end to current video position (Keyboard shortcut: ']')"
                        type="button"
                      >
                        ]
                      </button>
                    </div>
                  </div>

                  <div className="cue-actions">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSeek(cue.startTime); }}
                      className="btn-icon-only-sm"
                      title="Jump player to start of cue"
                      type="button"
                    >
                      <FastForward size={14} />
                    </button>
                    {enableAlignment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenSettingsCueId(openSettingsCueId === cue.id ? null : cue.id);
                        }}
                        className={`btn-icon-only-sm ${openSettingsCueId === cue.id ? 'active' : ''}`}
                        title="Adjust alignment and line placement"
                        type="button"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onSplitCue(cue.id); }}
                      className="btn-icon-only-sm"
                      title="Split subtitle into two chunks"
                      type="button"
                    >
                      <Scissors size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddCue(cue.id, 'before'); }}
                      className="btn-icon-only-sm"
                      title="Insert cue before this"
                      type="button"
                    >
                      <span className="btn-badge-sub">↑</span>
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddCue(cue.id, 'after'); }}
                      className="btn-icon-only-sm"
                      title="Insert cue after this"
                      type="button"
                    >
                      <Plus size={12} />
                      <span className="btn-badge-sub">↓</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteCue(cue.id); }}
                      className="btn-icon-only-sm danger"
                      title="Delete cue"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {openSettingsCueId === cue.id && (
                  <div className="cue-settings-drawer">
                    <div className="settings-group">
                      <span className="settings-label">Alignment:</span>
                      <div className="btn-group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeCue(cue.id, { align: 'left' });
                          }}
                          className={`btn-toggle-sm ${cue.align === 'left' ? 'active' : ''}`}
                          title="Align Left"
                          type="button"
                        >
                          <AlignLeft size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeCue(cue.id, { align: 'center' });
                          }}
                          className={`btn-toggle-sm ${cue.align === 'center' || !cue.align ? 'active' : ''}`}
                          title="Align Center"
                          type="button"
                        >
                          <AlignCenter size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeCue(cue.id, { align: 'right' });
                          }}
                          className={`btn-toggle-sm ${cue.align === 'right' ? 'active' : ''}`}
                          title="Align Right"
                          type="button"
                        >
                          <AlignRight size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="settings-group">
                      <span className="settings-label">Position:</span>
                      <select
                        value={cue.line || 'auto'}
                        onChange={(e) => {
                          onChangeCue(cue.id, { line: e.target.value === 'auto' ? undefined : e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="select-position-sm"
                        aria-label="Text vertical position placement"
                      >
                        <option value="auto">Auto (Bottom)</option>
                        <option value="10%">Top (10%)</option>
                        <option value="30%">Upper Third (30%)</option>
                        <option value="50%">Middle (50%)</option>
                        <option value="70%">Lower Third (70%)</option>
                        <option value="90%">Bottom (90%)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="cue-body">
                  {enableFormatting ? (
                    <RichTextEditor
                      value={cue.text}
                      onChange={(text) => onChangeCue(cue.id, { text })}
                      onFocus={() => {
                        onSelectCue(cue.id);
                        if (isTextEditable) {
                          onFocusInput(true);
                        }
                      }}
                      onBlur={() => onFocusInput(false)}
                      disabled={!isTextEditable}
                    />
                  ) : (
                    <AutoExpandingTextarea
                      value={cue.text}
                      onChange={(e) => onChangeCue(cue.id, { text: e.target.value })}
                      placeholder={isTextEditable ? "Enter subtitle text..." : "Text is locked (read-only)"}
                      className="cue-text-area"
                      readOnly={!isTextEditable}
                      onFocus={() => {
                        onSelectCue(cue.id);
                        if (isTextEditable) {
                          onFocusInput(true);
                        }
                      }}
                      onBlur={() => onFocusInput(false)}
                    />
                  )}
                  {(() => {
                    const refCue = referenceCues.find(rc => rc.index === cue.index);
                    if (refCue) {
                      return (
                        <div className="reference-cue-box">
                          <div className="reference-header">
                            <span className="reference-label">Reference #{refCue.index}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyReferenceTiming(cue.id, refCue.startTime, refCue.endTime);
                              }}
                              className="btn-copy-timing"
                              title="Copy reference timings to this cue"
                              type="button"
                            >
                              <Copy size={11} />
                              Sync Timing
                            </button>
                          </div>
                          <p className="reference-text">{refCue.text}</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
};
