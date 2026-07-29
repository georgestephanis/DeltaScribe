import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import type { SubtitleCue } from '../utils/srtParser';

interface MediaPanelProps {
  mediaFile: { name: string; type: string; url: string };
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  activeCue: SubtitleCue | null;
  playerRef: React.RefObject<HTMLMediaElement | null>;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({
  mediaFile,
  currentTime,
  duration,
  isPlaying,
  activeCue,
  playerRef,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
}) => {
  const isAudio = mediaFile.type.startsWith('audio/');

  useEffect(() => {
    // When the media file changes, reset
    onTimeUpdate(0);
    onDurationChange(0);
    onPlayStateChange(false);
  }, [mediaFile.url]);

  const handlePlayPause = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play().catch((err) => console.log("Play failed: ", err));
    }
  };

  const skip = (amount: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = Math.max(0, Math.min(player.duration || 0, player.currentTime + amount));
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    onTimeUpdate(e.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    onDurationChange(e.currentTarget.duration);
  };

  const handlePlay = () => onPlayStateChange(true);
  const handlePause = () => onPlayStateChange(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00.000";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    const ms = Math.floor((secs - Math.floor(secs)) * 1000);
    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    return `${pad(minutes)}:${pad(seconds)}.${pad(ms, 3)}`;
  };


  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const value = parseFloat(e.target.value);
    player.currentTime = value;
    onTimeUpdate(value);
  };

  return (
    <div className="media-panel card">
      <div className="player-container">
        {isAudio ? (
          <div className="audio-visualizer-container">
            <audio
              ref={playerRef as React.RefObject<HTMLAudioElement>}
              src={mediaFile.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              style={{ display: 'none' }}
            />
            <div className="visualizer-card">
              <div className="audio-icon-wrapper">
                <Volume2 className="audio-pulse-icon" size={64} />
              </div>
              <div className="waves">
                <div className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} style={{ height: '40px', animationDelay: '0.1s' }}></div>
                <div className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} style={{ height: '70px', animationDelay: '0.3s' }}></div>
                <div className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} style={{ height: '90px', animationDelay: '0.5s' }}></div>
                <div className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} style={{ height: '60px', animationDelay: '0.2s' }}></div>
                <div className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} style={{ height: '80px', animationDelay: '0.4s' }}></div>
                <div className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} style={{ height: '30px', animationDelay: '0.6s' }}></div>
              </div>
              <p className="audio-file-label">{mediaFile.name}</p>
            </div>
            
            {/* Audio subtitle display overlay */}
            <div className="audio-subtitle-display">
              {activeCue ? (
                <p className="subtitle-text animate-subtitle">{activeCue.text}</p>
              ) : (
                <p className="subtitle-placeholder">Subtitles will appear here</p>
              )}
            </div>
          </div>
        ) : (
          <div className="video-player-wrapper">
            <video
              ref={playerRef as React.RefObject<HTMLVideoElement>}
              src={mediaFile.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onClick={handlePlayPause}
              className="main-video"
            />
            {/* Overlay Subtitles */}
            <div className="video-subtitle-overlay" onClick={handlePlayPause}>
              {activeCue && (
                <div className="subtitle-bubble animate-subtitle">
                  {activeCue.text.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="player-controls">
        {/* Scrubber */}
        <div className="scrubber-container">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleScrubberChange}
            className="scrub-bar"
          />
          <div className="time-info">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="divider">/</span>
            <span className="total-duration">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="control-buttons">
          <button onClick={() => skip(-5)} className="btn-icon" title="Rewind 5s" type="button">
            <SkipBack size={20} />
          </button>
          <button onClick={() => skip(-0.5)} className="btn-icon" title="Rewind 0.5s" type="button">
            <RotateCcw size={16} />
            <span className="btn-icon-subtext">-0.5s</span>
          </button>
          
          <button onClick={handlePlayPause} className="btn-play-pause btn-primary" title={isPlaying ? "Pause" : "Play"} type="button">
            {isPlaying ? <Pause size={28} /> : <Play size={28} />}
          </button>

          <button onClick={() => skip(0.5)} className="btn-icon" title="Forward 0.5s" type="button">
            <span className="btn-icon-subtext">+0.5s</span>
            <RotateCcw size={16} style={{ transform: 'scaleX(-1)' }} />
          </button>
          <button onClick={() => skip(5)} className="btn-icon" title="Forward 5s" type="button">
            <SkipForward size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
