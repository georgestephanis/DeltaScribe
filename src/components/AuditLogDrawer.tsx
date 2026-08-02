import React, { useState } from 'react';
import { History, Undo2, Redo2, ChevronUp, ChevronDown, Clock, CheckCircle2 } from 'lucide-react';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  description: string;
  actionType: 'edit' | 'add' | 'delete' | 'shift' | 'align' | 'scale';
}

interface AuditLogDrawerProps {
  entries: AuditLogEntry[];
  currentHistoryIndex: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  entries,
  currentHistoryIndex,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`audit-log-drawer ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="audit-log-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <History size={16} className="text-primary" />
          <span className="drawer-title">Change History Log</span>
          <span className="badge badge-history-count">
            {entries.length} {entries.length === 1 ? 'action' : 'actions'}
          </span>
        </div>

        <div className="header-right" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="btn btn-secondary btn-xs btn-icon"
            title="Undo last change (Cmd+Z / Ctrl+Z)"
            type="button"
          >
            <Undo2 size={12} />
            <span>Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="btn btn-secondary btn-xs btn-icon"
            title="Redo change (Cmd+Shift+Z)"
            type="button"
          >
            <Redo2 size={12} />
            <span>Redo</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-icon-only-sm toggle-drawer-btn"
            type="button"
            aria-label="Toggle history log drawer"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="audit-log-body animate-slide-up">
          {entries.length === 0 ? (
            <div className="empty-log-message">
              <CheckCircle2 size={16} className="text-muted" />
              <span>No edits made in this session yet. Your action history will appear here.</span>
            </div>
          ) : (
            <div className="log-entries-list">
              {entries.slice().reverse().map((entry, reverseIndex) => {
                const actualIndex = entries.length - 1 - reverseIndex;
                const isCurrent = actualIndex === currentHistoryIndex;
                return (
                  <div
                    key={entry.id}
                    className={`log-entry-item ${isCurrent ? 'active-step' : ''}`}
                  >
                    <span className="log-time">
                      <Clock size={10} />
                      {entry.timestamp}
                    </span>
                    <span className={`log-badge badge-${entry.actionType}`}>
                      {entry.actionType}
                    </span>
                    <span className="log-description">{entry.description}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
