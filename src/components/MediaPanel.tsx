import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Volume2, Activity, BarChart3, Waves } from 'lucide-react';
import type { SubtitleCue } from '../utils/subtitles';

interface MediaPanelProps {
  mediaFile: { name: string; type: string; url: string; isRemote?: boolean };
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
  const [visualizerMode, setVisualizerMode] = useState<'waveform' | 'spectrum' | 'spectrogram'>('waveform');
  const [corsError, setCorsError] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Web Audio API nodes
  const initAudioAnalyser = () => {
    if (audioContextRef.current) return;

    const player = playerRef.current;
    if (!player) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;

    try {
      const source = ctx.createMediaElementSource(player);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
    } catch (e) {
      console.warn("Failed to connect MediaElementAudioSourceNode:", e);
    }
  };

  const handlePlayerError = () => {
    if (mediaFile.isRemote && !corsError) {
      console.warn("CORS media load failed, retrying without anonymous credentials...");
      setCorsError(true);
      const player = playerRef.current;
      if (player) {
        player.removeAttribute('crossorigin');
        player.load();
      }
    }
  };

  const renderVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const analyser = analyserRef.current;
    if (!analyser) {
      // Quiet state
      ctx.clearRect(0, 0, width, height);
      if (visualizerMode === 'waveform') {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#6366F1';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      return;
    }

    const bufferLength = analyser.frequencyBinCount;

    if (visualizerMode === 'waveform') {
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#6366F1';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (visualizerMode === 'spectrum') {
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      const activeBins = Math.round(bufferLength * 0.7);
      const barWidth = (width / activeBins) - 1.5;
      let x = 0;

      for (let i = 0; i < activeBins; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const barHeight = percent * height;

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#6366F1');
        gradient.addColorStop(1, '#10B981');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1.5;
      }

    } else if (visualizerMode === 'spectrogram') {
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const shiftAmount = 1.5;
      ctx.drawImage(canvas, shiftAmount, 0, width - shiftAmount, height, 0, 0, width - shiftAmount, height);
      
      ctx.fillStyle = 'rgba(11, 15, 25, 0.4)';
      ctx.fillRect(width - shiftAmount, 0, shiftAmount, height);

      const activeBins = Math.round(bufferLength * 0.7);
      const binHeight = height / activeBins;

      for (let i = 0; i < activeBins; i++) {
        const value = dataArray[i];
        const percent = value / 255;

        let color = 'rgba(0,0,0,0)';
        if (value > 8) {
          if (percent < 0.35) {
            const factor = percent / 0.35;
            color = `hsla(260, 100%, ${factor * 30 + 10}%, ${percent * 0.6})`;
          } else if (percent < 0.75) {
            const factor = (percent - 0.35) / 0.4;
            color = `hsla(${300 + factor * 40}, 100%, ${40 + factor * 10}%, ${0.6 + factor * 0.3})`;
          } else {
            const factor = (percent - 0.75) / 0.25;
            color = `hsla(${180 + factor * 40}, 100%, ${50 + factor * 30}%, ${0.9 + factor * 0.1})`;
          }
        }
        
        ctx.fillStyle = color;
        const y = height - (i * binHeight) - binHeight;
        ctx.fillRect(width - shiftAmount, y, shiftAmount, binHeight + 0.5);
      }
    }
  }, [visualizerMode]);

  const startVisualizerLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const draw = () => {
      renderVisualizer();
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    animationFrameRef.current = requestAnimationFrame(draw);
  }, [renderVisualizer]);

  const stopVisualizerLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Sync animation loop with isPlaying and visualizerMode state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    renderVisualizer();

    if (isPlaying) {
      startVisualizerLoop();
    } else {
      stopVisualizerLoop();
    }

    return () => stopVisualizerLoop();
  }, [isPlaying, visualizerMode, renderVisualizer, startVisualizerLoop, stopVisualizerLoop]);

  // Handle window resizing for crisp high-DPI display
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
        renderVisualizer();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderVisualizer]);

  // Clean up references and context on unmount
  useEffect(() => {
    return () => {
      stopVisualizerLoop();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.log(err));
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stopVisualizerLoop]);

  // Tear down audio analyser context when media type changes between audio and video elements
  useEffect(() => {
    stopVisualizerLoop();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(err => console.log(err));
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    sourceRef.current = null;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [isAudio, stopVisualizerLoop]);

  useEffect(() => {
    onTimeUpdate(0);
    onDurationChange(0);
    onPlayStateChange(false);
  }, [mediaFile.url, onTimeUpdate, onDurationChange, onPlayStateChange]);

  const handlePlayPause = async () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      try {
        initAudioAnalyser();
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await player.play();
      } catch (err) {
        console.log("Play failed: ", err);
      }
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

  const handlePlay = async () => {
    initAudioAnalyser();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err => console.log(err));
    }
    onPlayStateChange(true);
  };

  const handlePause = () => {
    onPlayStateChange(false);
  };

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
              crossOrigin={mediaFile.isRemote && !corsError ? "anonymous" : undefined}
              onError={handlePlayerError}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              style={{ display: 'none' }}
            />
            <div className="visualizer-card">
              <div className="visualizer-controls-overlay">
                <button
                  onClick={() => setVisualizerMode('waveform')}
                  className={`visualizer-toggle-btn ${visualizerMode === 'waveform' ? 'active' : ''}`}
                  title="Oscilloscope Waveform"
                  type="button"
                >
                  <Activity size={14} />
                  <span>Waveform</span>
                </button>
                <button
                  onClick={() => setVisualizerMode('spectrum')}
                  className={`visualizer-toggle-btn ${visualizerMode === 'spectrum' ? 'active' : ''}`}
                  title="Frequency Spectrum"
                  type="button"
                >
                  <BarChart3 size={14} />
                  <span>Spectrum</span>
                </button>
                <button
                  onClick={() => setVisualizerMode('spectrogram')}
                  className={`visualizer-toggle-btn ${visualizerMode === 'spectrogram' ? 'active' : ''}`}
                  title="Spectroscopic Analysis"
                  type="button"
                >
                  <Waves size={14} />
                  <span>Spectrograph</span>
                </button>
              </div>

              <div className="canvas-container">
                <canvas ref={canvasRef} className="audio-visualizer-canvas" />
                {corsError && (
                  <div className="cors-warning-overlay">
                    <span>⚠️ Visualizer disabled (Remote host missing CORS headers)</span>
                  </div>
                )}
                {!analyserRef.current && !corsError && (
                  <div className="audio-visualizer-fallback">
                    <Volume2 className={`audio-pulse-icon ${isPlaying ? 'pulse' : ''}`} size={42} />
                  </div>
                )}
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
              crossOrigin={mediaFile.isRemote && !corsError ? "anonymous" : undefined}
              onError={handlePlayerError}
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
