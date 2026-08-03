import React, { useRef, useState } from 'react';
import { Upload, FileVideo, FileAudio, FileText, CheckCircle2, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { __, sprintf } from '../utils/i18n';

interface FileDropZoneProps {
  mediaFile: { name: string; type: string; url: string } | null;
  subtitleTracks: { id: string; name: string; cues: any[] }[];
  activeTrackId: string | null;
  onSelectActiveTrack: (id: string) => void;
  onRemoveTrack: (id: string) => void;
  onMediaLoaded: (file: File) => void;
  onSubtitlesLoaded: (text: string, fileName: string) => void;
  onCreateNewSubtitles: () => void;
  onStartWorkspace?: () => void;
  isLoadingRemoteSubtitles?: boolean;
  remoteLoadError?: string | null;
  savedSession?: {
    mediaFile: { name: string; type: string; url: string; isRemote?: boolean } | null;
    subtitleTracks: { id: string; name: string; cues: any[] }[];
    timestamp: number;
  } | null;
  onRestoreSession?: () => void;
  onDiscardSession?: () => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  mediaFile,
  subtitleTracks,
  activeTrackId,
  onSelectActiveTrack,
  onRemoveTrack,
  onMediaLoaded,
  onSubtitlesLoaded,
  onCreateNewSubtitles,
  onStartWorkspace,
  isLoadingRemoteSubtitles = false,
  remoteLoadError,
  savedSession = null,
  onRestoreSession,
  onDiscardSession,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isStartingWorkspace, setIsStartingWorkspace] = useState(false);
  const [unrecognizedFileError, setUnrecognizedFileError] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFiles = (files: FileList) => {
    setIsProcessingFile(true);
    const unrecognizedNames: string[] = [];
    let pendingReaders = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (file.type.startsWith('video/') || file.type.startsWith('audio/') || ['mp4', 'webm', 'ogg', 'mp3', 'wav', 'm4a'].includes(ext || '')) {
        onMediaLoaded(file);
      } else if (ext === 'srt' || ext === 'vtt' || ext === 'xml' || ext === 'ttml') {
        pendingReaders++;
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            onSubtitlesLoaded(text, file.name);
          }
          pendingReaders--;
          if (pendingReaders <= 0) {
            setIsProcessingFile(false);
          }
        };
        reader.onerror = () => {
          pendingReaders--;
          if (pendingReaders <= 0) {
            setIsProcessingFile(false);
          }
        };
        reader.readAsText(file);
      } else {
        unrecognizedNames.push(file.name);
      }
    }

    if (pendingReaders === 0) {
      setIsProcessingFile(false);
    }

    setUnrecognizedFileError(
      unrecognizedNames.length > 0
        ? sprintf(__('Unrecognized file type, skipped: %s'), unrecognizedNames.join(', '))
        : null
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleSrtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const isAudio = mediaFile?.type.startsWith('audio/');

  return (
    <div className="workspace-importer">
      {remoteLoadError && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <span>{remoteLoadError}</span>
        </div>
      )}
      {unrecognizedFileError && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <span>{unrecognizedFileError}</span>
        </div>
      )}

      {savedSession && (
        <div className="saved-session-banner-card">
          <div className="saved-session-content">
            <div className="saved-session-header">
              <span className="saved-session-badge">🎒 {__('Saved Draft')}</span>
              <h4>{__('Resume Your Previous Work')}</h4>
            </div>
            <p>
              {sprintf(
                __('DeltaScribe found an autosaved session from %s. You can pick up right where you left off editing details for:'),
                new Date(savedSession.timestamp).toLocaleString()
              )}
            </p>
            <div className="saved-session-details">
              <div className="detail-item">
                <strong>{__('Media:')}</strong>{' '}
                <span>{savedSession.mediaFile ? savedSession.mediaFile.name : __('None')}</span>
              </div>
              <div className="detail-item">
                <strong>{__('Subtitles:')}</strong>{' '}
                <span>
                  {savedSession.subtitleTracks.length > 0
                    ? `${savedSession.subtitleTracks[0].name} (${savedSession.subtitleTracks[0].cues.length} cues)`
                    : __('Empty Track')}
                </span>
              </div>
            </div>
            <div className="saved-session-actions">
              <button onClick={onRestoreSession} className="btn btn-primary btn-sm" type="button">
                {__('Restore Session')}
              </button>
              <button onClick={onDiscardSession} className="btn btn-secondary btn-sm" type="button">
                {__('Discard Draft')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={mediaInputRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden-input"
          onChange={handleMediaChange}
        />
        <input
          ref={srtInputRef}
          type="file"
          accept=".srt,.vtt,.xml,.ttml"
          className="hidden-input"
          onChange={handleSrtChange}
        />

        <div className="dropzone-content">
          <div className="icon-group">
            <Upload className="main-icon" size={48} />
          </div>
          <h3>{__('Drag & Drop Files Here')}</h3>
          <p className="description">
            {__('Drop your video/audio file AND subtitle (.srt, .vtt, or .ttml) file, or select them below.')}
          </p>

          <div className="import-controls">
            <button
              onClick={() => mediaInputRef.current?.click()}
              className="btn btn-primary"
              type="button"
              disabled={isProcessingFile || isLoadingRemoteSubtitles}
            >
              {isProcessingFile ? (
                <>
                  <Loader2 className="spinner-icon" size={16} />
                  <span>{__('Loading Media...')}</span>
                </>
              ) : (
                __('Select Media File')
              )}
            </button>
            <button
              onClick={() => srtInputRef.current?.click()}
              className="btn btn-secondary"
              type="button"
              disabled={isProcessingFile || isLoadingRemoteSubtitles}
            >
              {isProcessingFile || isLoadingRemoteSubtitles ? (
                <>
                  <Loader2 className="spinner-icon" size={16} />
                  <span>{__('Reading Subtitles...')}</span>
                </>
              ) : (
                subtitleTracks.length > 0 ? __('Add Subtitle File') : __('Select Subtitle File')
              )}
            </button>
            {subtitleTracks.length === 0 && (
              <button
                onClick={onCreateNewSubtitles}
                className="btn btn-text"
                type="button"
                disabled={isProcessingFile || isLoadingRemoteSubtitles}
              >
                {__('Create New Subtitles')}
              </button>
            )}
          </div>
        </div>
      </div>

      {mediaFile && (
        <div className={`ready-to-go-banner ${!mediaFile.url ? 'pending-media-banner' : ''}`}>
          <div className="banner-info">
            {!mediaFile.url ? (
              <AlertCircle className="ready-icon text-warning" size={28} />
            ) : (
              <CheckCircle2 className="ready-icon" size={28} />
            )}
            <div>
              <h4>{!mediaFile.url ? __('Media Re-selection Required') : __('Media Asset Ready')}</h4>
              <p>
                {!mediaFile.url
                  ? sprintf(__('To resume editing, select the media file: %s'), mediaFile.name)
                  : subtitleTracks.length > 0
                    ? sprintf(__('%d subtitle track(s) loaded. Click below to start editing!'), subtitleTracks.length)
                    : __('No subtitle file added yet. You can add one now or proceed with an empty track.')}
              </p>
            </div>
          </div>
          {!mediaFile.url ? (
            <button
              onClick={() => mediaInputRef.current?.click()}
              className="btn btn-warning btn-lg ready-btn"
              type="button"
              disabled={isProcessingFile}
            >
              <Upload size={20} />
              <span>{__('Select Media')}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (isStartingWorkspace) return;
                setIsStartingWorkspace(true);
                setTimeout(() => {
                  if (subtitleTracks.length === 0) {
                    onCreateNewSubtitles();
                  }
                  onStartWorkspace?.();
                }, 50);
              }}
              className="btn btn-primary btn-lg ready-btn"
              type="button"
              disabled={isProcessingFile || isLoadingRemoteSubtitles || isStartingWorkspace}
            >
              {isStartingWorkspace ? (
                <>
                  <Loader2 className="spinner-icon" size={20} />
                  <span>{__('Starting Workspace...')}</span>
                </>
              ) : (
                <>
                  <span>{__('Ready to Go')}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      <div className="loaded-assets">
        <div className="asset-card">
          <div className="card-header">
            {isProcessingFile ? (
              <Loader2 className="icon spinner-icon text-primary" />
            ) : mediaFile ? (
              !mediaFile.url ? <AlertCircle className="icon text-warning" /> : (isAudio ? <FileAudio className="icon text-audio" /> : <FileVideo className="icon text-video" />)
            ) : (
              <FileVideo className="icon text-muted" />
            )}
            <h4>{__('Media File')}</h4>
          </div>
          <div className="card-body">
            {mediaFile ? (
              <div className="loaded-details">
                {!mediaFile.url ? (
                  <>
                    <AlertCircle className="warning-icon text-warning" size={16} />
                    <span className="file-name text-warning" title={mediaFile.name}>{sprintf(__('%s (re-select)'), mediaFile.name)}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="success-icon" size={16} />
                    <span className="file-name" title={mediaFile.name}>{mediaFile.name}</span>
                  </>
                )}
              </div>
            ) : (
              <span className="placeholder">{__('No media file loaded')}</span>
            )}
          </div>
        </div>

        <div className="asset-card full-width-card">
          <div className="card-header">
            {isLoadingRemoteSubtitles || isProcessingFile ? (
              <Loader2 className="icon spinner-icon text-primary" />
            ) : (
              <FileText className={`icon ${subtitleTracks.length > 0 ? 'text-primary' : 'text-muted'}`} />
            )}
            <h4>{sprintf(__('Subtitle Tracks (%d)'), subtitleTracks.length)}</h4>
          </div>
          <div className="card-body">
            {subtitleTracks.length > 0 ? (
              <div className="tracks-list">
                {subtitleTracks.map((track) => {
                  const isActive = track.id === activeTrackId;
                  return (
                    <div key={track.id} className={`track-item ${isActive ? 'active' : 'reference'}`}>
                      <label className="track-radio-label" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="radio"
                          name="active-subtitle-track"
                          checked={isActive}
                          onChange={() => onSelectActiveTrack(track.id)}
                          className="track-radio"
                        />
                        <span className="track-status-badge">
                          {isActive ? __('Active Edit') : __('Reference')}
                        </span>
                      </label>
                      <span className="file-name" title={track.name}>
                        {track.name}
                      </span>
                      <span className="track-cues-count">({track.cues.length} cues)</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrack(track.id);
                        }}
                        className="btn-clear-asset"
                        title="Remove this track"
                        type="button"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="placeholder">{__('No subtitle files loaded. Drop subtitle files here to add them.')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="url-prepopulate-info">
        <h4>🔗 Link Prepopulation Guide</h4>
        <p>Pre-configure workspaces by passing source URLs as parameter coordinates in the address bar:</p>
        <div className="url-example">
          <code>{`${window.location.origin}/?media=https://example.com/video.mp4&subtitles=https://example.com/subs.vtt&format=vtt&lang=en-US&submit=https://example.com/api/save`}</code>
        </div>
        <div className="parameter-descriptions">
          <p>• <strong>media</strong>: URL path to an audio or video streaming source.</p>
          <p>• <strong>subtitles</strong>: URL path to parsed SRT, WebVTT, or TTML captions.</p>
          <p>• <strong>format</strong>: Lock choice of export format (<code>srt</code>, <code>vtt</code>, or <code>ttml</code>).</p>
          <p>• <strong>lang</strong>: Define target language code (e.g., <code>en</code>, <code>es-ES</code>), applied to TTML's document metadata.</p>
          <p>• <strong>submit</strong>: Optional webhook URL. Adds a <em>Submit</em> button in the header actions tray.</p>
        </div>
        <p className="cors-note">* Note: Hosting endpoints must serve files with permissive CORS headers to allow browser fetching and canvas wave visualizers.</p>
      </div>
    </div>
  );
};
