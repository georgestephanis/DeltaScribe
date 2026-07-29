import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Search, FastForward, SlidersHorizontal, Lock, Unlock, Scissors } from 'lucide-react';
import type { SubtitleCue } from '../utils/srtParser';

interface SubtitleEditorProps {
  cues: SubtitleCue[];
  selectedCueId: string | null;
  currentTime: number;
  isTextEditable: boolean;
  onToggleTextEditable: () => void;
  onSelectCue: (id: string) => void;
  onChangeCue: (id: string, updatedFields: Partial<SubtitleCue>) => void;
  onDeleteCue: (id: string) => void;
  onAddCue: (insertAfterId?: string) => void;
  onSplitCue: (id: string) => void;
  onShiftTimes: (seconds: number, target: 'all' | 'selected') => void;
  onSeek: (time: number) => void;
  onFocusInput: (isFocused: boolean) => void;
}

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoExpandingTextarea: React.FC<AutoExpandingTextareaProps> = ({ value, ...props }) => {
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftAmount, setShiftAmount] = useState('1.0');
  const [showShiftControls, setShowShiftControls] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Find which cue is active at the current playback time
  const currentActiveCue = cues.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  // Auto-scroll to active cue
  useEffect(() => {
    if (currentActiveCue && listContainerRef.current) {
      const activeEl = document.getElementById(`cue-card-${currentActiveCue.id}`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [currentActiveCue?.id]);

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

          {/* Add a general button */}
          <button
            onClick={() => onAddCue()}
            className="btn btn-secondary btn-sm"
            title="Add Subtitle Cue to the end"
            type="button"
          >
            <Plus size={16} />
            Add Cue
          </button>

          {/* Toggle Shift times helper */}
          <button
            onClick={() => setShowShiftControls(!showShiftControls)}
            className={`btn btn-sm btn-icon-only ${showShiftControls ? 'active' : ''}`}
            title="Shift times in bulk"
            type="button"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

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

            return (
              <div
                key={cue.id}
                id={`cue-card-${cue.id}`}
                className={`cue-card ${isActive ? 'active-playing' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectCue(cue.id)}
              >
                <div className="cue-header">
                  <div className="cue-index-badge">#{cue.index}</div>
                  
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
                        onBlur={() => onFocusInput(false)}
                        className="time-input-box"
                      />
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

                    <div className="time-field">
                      <label>End</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formatSeconds(cue.endTime)}
                        onChange={(e) => handleTimeChange(cue.id, 'endTime', e.target.value)}
                        onFocus={() => onFocusInput(true)}
                        onBlur={() => onFocusInput(false)}
                        className="time-input-box"
                      />
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
                    <button
                      onClick={(e) => { e.stopPropagation(); onSplitCue(cue.id); }}
                      className="btn-icon-only-sm"
                      title="Split subtitle into two chunks"
                      type="button"
                    >
                      <Scissors size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddCue(cue.id); }}
                      className="btn-icon-only-sm"
                      title="Insert cue after this"
                      type="button"
                    >
                      <Plus size={14} />
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

                <div className="cue-body">
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
