import React, { useRef, useState } from 'react';
import { Upload, FileVideo, FileAudio, FileText, CheckCircle2 } from 'lucide-react';

interface FileDropZoneProps {
  mediaFile: { name: string; type: string; url: string } | null;
  hasSubtitles: boolean;
  subtitleFileName: string | null;
  referenceFileName: string | null;
  hasReferenceSubtitles: boolean;
  onMediaLoaded: (file: File) => void;
  onSubtitlesLoaded: (text: string, fileName: string) => void;
  onReferenceSubtitlesLoaded: (text: string, fileName: string) => void;
  onClearReference: () => void;
  onCreateNewSubtitles: () => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  mediaFile,
  hasSubtitles,
  subtitleFileName,
  referenceFileName,
  hasReferenceSubtitles,
  onMediaLoaded,
  onSubtitlesLoaded,
  onReferenceSubtitlesLoaded,
  onClearReference,
  onCreateNewSubtitles,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const refSubInputRef = useRef<HTMLInputElement>(null);

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
      } else if (ext === 'srt' || ext === 'vtt') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            if (hasSubtitles) {
              onReferenceSubtitlesLoaded(text, file.name);
            } else {
              onSubtitlesLoaded(text, file.name);
            }
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

  const handleRefSubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onReferenceSubtitlesLoaded(text, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const isAudio = mediaFile?.type.startsWith('audio/');

  return (
    <div className="workspace-importer">
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
          accept=".srt,.vtt"
          className="hidden-input"
          onChange={handleSrtChange}
        />
        <input
          ref={refSubInputRef}
          type="file"
          accept=".srt,.vtt"
          className="hidden-input"
          onChange={handleRefSubChange}
        />

        <div className="dropzone-content">
          <div className="icon-group">
            <Upload className="main-icon" size={48} />
          </div>
          <h3>Drag & Drop Files Here</h3>
          <p className="description">
            Drop your video/audio file AND subtitle (.srt or .vtt) file, or select them below.
          </p>

          <div className="import-controls">
            <button
              onClick={() => mediaInputRef.current?.click()}
              className="btn btn-primary"
              type="button"
            >
              Select Media File
            </button>
            <button
              onClick={() => srtInputRef.current?.click()}
              className="btn btn-secondary"
              type="button"
            >
              {hasSubtitles ? "Select Active SRT/VTT" : "Select SRT/VTT File"}
            </button>
            {hasSubtitles && (
              <button
                onClick={() => refSubInputRef.current?.click()}
                className="btn btn-secondary"
                type="button"
              >
                Select Reference SRT/VTT
              </button>
            )}
            {!hasSubtitles && (
              <button
                onClick={onCreateNewSubtitles}
                className="btn btn-text"
                type="button"
              >
                Create New Subtitles
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
            <h4>Media File</h4>
          </div>
          <div className="card-body">
            {mediaFile ? (
              <div className="loaded-details">
                <CheckCircle2 className="success-icon" size={16} />
                <span className="file-name" title={mediaFile.name}>{mediaFile.name}</span>
              </div>
            ) : (
              <span className="placeholder">No media file loaded</span>
            )}
          </div>
        </div>

        <div className="asset-card">
          <div className="card-header">
            <FileText className={`icon ${hasSubtitles ? 'text-sub' : 'text-muted'}`} />
            <h4>Active Subtitles (SRT/VTT)</h4>
          </div>
          <div className="card-body">
            {hasSubtitles ? (
              <div className="loaded-details">
                <CheckCircle2 className="success-icon" size={16} />
                <span className="file-name" title={subtitleFileName || "New Subtitles"}>
                  {subtitleFileName || "New Subtitles (Created)"}
                </span>
              </div>
            ) : (
              <span className="placeholder">No subtitle file loaded</span>
            )}
          </div>
        </div>

        <div className="asset-card">
          <div className="card-header">
            <FileText className={`icon ${hasReferenceSubtitles ? 'text-audio' : 'text-muted'}`} />
            <h4>Reference Subtitles (SRT/VTT)</h4>
          </div>
          <div className="card-body">
            {hasReferenceSubtitles ? (
              <div className="loaded-details animate-fade-in">
                <CheckCircle2 className="success-icon" size={16} />
                <span className="file-name" title={referenceFileName || "Reference Track"}>
                  {referenceFileName || "Reference Track"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearReference();
                  }}
                  className="btn-clear-asset"
                  title="Clear reference subtitles"
                  type="button"
                >
                  &times;
                </button>
              </div>
            ) : (
              <span className="placeholder">No reference subtitles loaded</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
