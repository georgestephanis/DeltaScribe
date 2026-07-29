import React, { useState } from 'react';
import { Keyboard, X, Info } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  variant?: 'modal' | 'inline';
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ variant = 'modal' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: "Spacebar", action: "Toggle Play / Pause media" },
    { key: "[", action: "Set Start of selected cue to current player time" },
    { key: "]", action: "Set End of selected cue to current player time" },
    { key: "← / →", action: "Seek backward / forward 5 seconds" },
    { key: "Shift + ← / →", action: "Seek backward / forward 0.5 seconds" },
    { key: "n", action: "Insert new cue at current player position" },
    { key: "Tab", action: "Navigate between inputs and cues" }
  ];

  if (variant === 'inline') {
    return (
      <div className="shortcuts-inline-card card">
        <div className="card-header-inline">
          <Keyboard className="icon text-primary" size={18} />
          <h4>Keyboard Timing Shortcuts</h4>
        </div>
        <div className="shortcuts-grid">
          {shortcuts.map((s, index) => (
            <div key={index} className="shortcut-grid-item">
              <kbd className="shortcut-key">{s.key}</kbd>
              <span className="shortcut-action">{s.action}</span>
            </div>
          ))}
        </div>
        <div className="shortcut-warning-alert-small">
          <Info size={12} className="alert-icon" />
          <p>Keyboard shortcuts are paused while typing inside inputs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shortcuts-help-container">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`btn btn-secondary btn-sm btn-icon ${isOpen ? 'active' : ''}`}
        title="Keyboard Shortcuts Guide"
        type="button"
      >
        <Keyboard size={16} />
        Keyboard Shortcuts
      </button>

      {isOpen && (
        <div className="shortcuts-modal-overlay animate-fade-in" onClick={() => setIsOpen(false)}>
          <div className="shortcuts-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-title">
                <Keyboard className="icon text-primary" size={20} />
                <h4>Keyboard Syncing Guide</h4>
              </div>
              <button onClick={() => setIsOpen(false)} className="btn-icon-only-sm" type="button">
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="shortcut-warning-alert">
                <Info size={16} className="alert-icon" />
                <p>
                  <strong>Note:</strong> Shortcuts are active only when you are <strong>not</strong> actively typing inside any text input or description box.
                </p>
              </div>

              <div className="shortcut-list">
                {shortcuts.map((s, index) => (
                  <div key={index} className="shortcut-item">
                    <kbd className="shortcut-key">{s.key}</kbd>
                    <span className="shortcut-action">{s.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
