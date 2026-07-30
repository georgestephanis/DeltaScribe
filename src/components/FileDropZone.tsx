import React, { useRef, useState } from 'react';
import { Upload, FileVideo, FileAudio, FileText, CheckCircle2 } from 'lucide-react';
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
  remoteLoadError?: string | null;
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
  remoteLoadError,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
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
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (file.type.startsWith('video/') || file.type.startsWith('audio/') || ['mp4', 'webm', 'ogg', 'mp3', 'wav', 'm4a'].includes(ext || '')) {
        onMediaLoaded(file);
      } else if (ext === 'srt' || ext === 'vtt' || ext === 'xml' || ext === 'ttml') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            onSubtitlesLoaded(text, file.name);
          }
        };
        reader.readAsText(file);
      }
    }
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
            >
              {__('Select Media File')}
            </button>
            <button
              onClick={() => srtInputRef.current?.click()}
              className="btn btn-secondary"
              type="button"
            >
              {subtitleTracks.length > 0 ? __('Add Subtitle File') : __('Select Subtitle File')}
            </button>
            {subtitleTracks.length === 0 && (
              <button
                onClick={onCreateNewSubtitles}
                className="btn btn-text"
                type="button"
              >
                {__('Create New Subtitles')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="loaded-assets">
        <div className="asset-card">
          <div className="card-header">
            {mediaFile ? (
              isAudio ? <FileAudio className="icon text-audio" /> : <FileVideo className="icon text-video" />
            ) : (
              <FileVideo className="icon text-muted" />
            )}
            <h4>{__('Media File')}</h4>
          </div>
          <div className="card-body">
            {mediaFile ? (
              <div className="loaded-details">
                <CheckCircle2 className="success-icon" size={16} />
                <span className="file-name" title={mediaFile.name}>{mediaFile.name}</span>
              </div>
            ) : (
              <span className="placeholder">{__('No media file loaded')}</span>
            )}
          </div>
        </div>

        <div className="asset-card full-width-card">
          <div className="card-header">
            <FileText className={`icon ${subtitleTracks.length > 0 ? 'text-primary' : 'text-muted'}`} />
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
          <code>{`${window.location.origin}/?media=https://example.com/video.mp4&subtitles=https://example.com/subs.vtt&submit=https://example.com/api/save`}</code>
        </div>
        <div className="parameter-descriptions">
          <p>• <strong>media</strong>: URL path to an audio or video streaming source.</p>
          <p>• <strong>subtitles</strong>: URL path to parsed SRT, WebVTT, or TTML captions.</p>
          <p>• <strong>submit</strong>: Optional webhook URL. Adds a <em>Submit</em> button in the header actions tray.</p>
        </div>
        <p className="cors-note">* Note: Hosting endpoints must serve files with permissive CORS headers to allow browser fetching and canvas wave visualizers.</p>
      </div>
    </div>
  );
};
