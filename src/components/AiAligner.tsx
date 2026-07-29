import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Brain, Sparkles, Cpu, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import type { SubtitleCue } from '../utils/srtParser';

interface AiAlignerProps {
  cues: SubtitleCue[];
  getCurrentTime: () => number;
  onUpdateCueTimings: (updates: { id: string; startTime: number; endTime: number }[]) => void;
  onSaveCurrentAsReference: () => void;
  onUpdateAllCues: (updatedCues: SubtitleCue[]) => void;
}

export const AiAligner: React.FC<AiAlignerProps> = ({
  cues,
  getCurrentTime,
  onUpdateCueTimings,
  onSaveCurrentAsReference,
  onUpdateAllCues,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [capturedTranscripts, setCapturedTranscripts] = useState<{ time: number; text: string }[]>([]);
  const [aiAvailable, setAiAvailable] = useState<'checking' | 'yes' | 'no'>('checking');
  const [isAligning, setIsAligning] = useState(false);
  const [alignError, setAlignError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Translation states
  const [targetLang, setTargetLang] = useState('Spanish');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);

  const SUPPORTED_LANGUAGES = [
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Japanese',
    'Chinese (Simplified)',
    'Korean',
    'Russian',
    'Arabic',
    'Turkish'
  ];

  // Check Chrome AI capabilities on mount
  useEffect(() => {
    const checkAi = async () => {
      const win = window as any;
      if (win.ai && win.ai.languageModel) {
        try {
          const capabilities = await win.ai.languageModel.capabilities();
          if (capabilities.available !== 'no') {
            setAiAvailable('yes');
          } else {
            setAiAvailable('no');
          }
        } catch {
          setAiAvailable('no');
        }
      } else {
        setAiAvailable('no');
      }
    };
    checkAi();
  }, []);

  const startListening = () => {
    const win = window as any;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      alert("Speech Recognition API is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setAlignError(null);
        setIsSuccess(false);
      };

      rec.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcriptText = event.results[lastResultIndex][0].transcript.trim();
        const speechTime = getCurrentTime();

        if (transcriptText) {
          setCapturedTranscripts((prev) => [
            ...prev,
            { time: speechTime, text: transcriptText }
          ]);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        if (e.error === 'not-allowed') {
          setAlignError("Microphone access denied. Enable permissions in settings.");
          stopListening();
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error(err);
      setAlignError("Failed to start speech recognition.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearCaptured = () => {
    setCapturedTranscripts([]);
    setAlignError(null);
    setIsSuccess(false);
  };

  const alignWithChromeAi = async () => {
    setIsAligning(true);
    setAlignError(null);
    setIsSuccess(false);

    try {
      if (cues.length === 0) throw new Error("No subtitle cues loaded.");
      if (capturedTranscripts.length === 0) throw new Error("No speech timings recorded yet.");

      const win = window as any;
      if (!win.ai || !win.ai.languageModel) {
        throw new Error("Chrome AI LanguageModel API is not available.");
      }

      // Format clean prompts
      const originalSubtitles = cues.map(c => ({ id: c.id, text: c.text }));
      const speechTranscripts = capturedTranscripts.map((t, idx) => ({
        index: idx + 1,
        time: t.time.toFixed(2),
        text: t.text
      }));

      const systemPrompt = `You are a professional subtitle synchronizer.
Align the original subtitles with the recognized speech transcripts based on semantic meaning.
Map each original subtitle ID to the correct startTime and endTime in seconds.
Return ONLY a valid JSON array of objects: [{"id": "cue_id", "startTime": number, "endTime": number}].
Do not output Markdown formatting like \`\`\`json, explanations, or extra tags. Output ONLY raw JSON.`;

      const userPrompt = `
Original Subtitles:
${JSON.stringify(originalSubtitles)}

Recognized Speech Transcripts with timestamps:
${JSON.stringify(speechTranscripts)}
`;

      const session = await win.ai.languageModel.create({
        systemPrompt: systemPrompt
      });

      const response = await session.prompt(userPrompt);
      session.destroy();

      // Sanitization fallback if AI wrapped in markdown blocks
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedUpdates = JSON.parse(cleanJson);

      if (Array.isArray(parsedUpdates)) {
        onUpdateCueTimings(parsedUpdates);
        setIsSuccess(true);
      } else {
        throw new Error("AI output format error.");
      }

    } catch (err: any) {
      console.error("AI alignment error:", err);
      setAlignError(err.message || "Failed to align with Chrome AI. Try fallback.");
    } finally {
      setIsAligning(false);
    }
  };

  const alignWithAlgorithmicFallback = () => {
    setIsAligning(true);
    setAlignError(null);
    setIsSuccess(false);

    try {
      if (cues.length === 0) throw new Error("No subtitle cues loaded.");
      if (capturedTranscripts.length === 0) throw new Error("No speech timings recorded yet.");

      // Map sequentially since cues and transcripts are both chronologically ordered
      const updates = cues.map((cue, idx) => {
        const match = capturedTranscripts[Math.min(idx, capturedTranscripts.length - 1)];
        const startTime = match.time;
        
        // Find next timestamp to cap duration, default to +2s
        const nextMatch = capturedTranscripts[idx + 1];
        const endTime = nextMatch ? Math.min(nextMatch.time, startTime + 2.5) : startTime + 2.0;

        return {
          id: cue.id,
          startTime,
          endTime
        };
      });

      onUpdateCueTimings(updates);
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setAlignError(err.message || "Algorithmic alignment failed.");
    } finally {
      setIsAligning(false);
    }
  };

  const translateSubtitles = async () => {
    setIsTranslating(true);
    setTranslateProgress(0);
    setAlignError(null);
    setIsSuccess(false);

    try {
      if (cues.length === 0) {
        throw new Error("No subtitle cues loaded.");
      }

      const win = window as any;
      if (!win.ai || !win.ai.languageModel) {
        throw new Error("Chrome built-in AI (window.ai.languageModel) is not available.");
      }

      // Save original cues to reference track first
      onSaveCurrentAsReference();

      // Initialize Gemini Session
      const session = await win.ai.languageModel.create({
        systemPrompt: "You are a precise, professional subtitle translator. You translate the input text to the target language exactly. Do not output any annotations, index markers, explanations, or metadata. Output ONLY the raw translation."
      });

      const translatedCues = [...cues];

      for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        
        if (!cue.text.trim()) {
          setTranslateProgress(Math.round(((i + 1) / cues.length) * 100));
          continue;
        }

        const prompt = `Translate the following subtitle text to ${targetLang}. Preserve line breaks if any, but output ONLY the translated text. Do not add explanations.

Text to translate:
${cue.text}`;

        const translationResponse = await session.prompt(prompt);
        
        let cleanText = translationResponse.trim();
        if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
          cleanText = cleanText.substring(1, cleanText.length - 1);
        }
        
        translatedCues[i] = {
          ...cue,
          text: cleanText
        };

        setTranslateProgress(Math.round(((i + 1) / cues.length) * 100));
      }

      session.destroy();

      onUpdateAllCues(translatedCues);
      setIsSuccess(true);

    } catch (err: any) {
      console.error("AI translation error:", err);
      setAlignError(err.message || "Failed to translate subtitles with Chrome AI.");
    } finally {
      setIsTranslating(false);
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    const ms = Math.floor((secs - Math.floor(secs)) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="ai-aligner-card card">
      <div className="card-header-inline">
        <Sparkles className="icon text-primary animate-pulse" size={18} />
        <h4>AI Voice-to-Text Sync Assistant</h4>
      </div>

      <p className="ai-description">
        Play your media <strong>out loud</strong>, click Start Listen, and let your microphone capture timings. 
        Then align your loaded SRT text to these timestamps.
      </p>

      {/* Controller Buttons */}
      <div className="ai-controls-row">
        <button
          onClick={toggleListening}
          className={`btn btn-sm ${isListening ? 'btn-danger active' : 'btn-primary'}`}
          type="button"
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          {isListening ? "Stop Listening" : "Start Listen"}
        </button>

        {capturedTranscripts.length > 0 && (
          <button
            onClick={clearCaptured}
            className="btn btn-secondary btn-sm"
            title="Clear captured speech"
            type="button"
          >
            <RefreshCw size={14} />
            Reset
          </button>
        )}
      </div>

      {/* Captured Transcripts Area */}
      {capturedTranscripts.length > 0 && (
        <div className="captured-list-box">
          <div className="box-header">
            Captured Speech Timings ({capturedTranscripts.length})
          </div>
          <div className="captured-scroll-area">
            {capturedTranscripts.map((t, i) => (
              <div key={i} className="captured-item">
                <span className="cap-time">[{formatTime(t.time)}]</span>
                <span className="cap-text">"{t.text}"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alignment Actions */}
      {capturedTranscripts.length > 0 && cues.length > 0 && (
        <div className="alignment-actions-panel">
          <div className="action-buttons-group">
            {aiAvailable === 'yes' ? (
              <button
                onClick={alignWithChromeAi}
                disabled={isAligning}
                className="btn btn-primary btn-sm btn-icon"
                type="button"
              >
                <Brain size={16} />
                {isAligning ? "Aligning..." : "Sync with Chrome AI"}
              </button>
            ) : (
              <div className="ai-warning-box">
                <AlertTriangle size={14} className="warning-icon" />
                <span>Gemini Nano is unavailable. Using algorithmic fallback.</span>
              </div>
            )}

            <button
              onClick={alignWithAlgorithmicFallback}
              disabled={isAligning}
              className="btn btn-secondary btn-sm btn-icon"
              type="button"
            >
              <Cpu size={16} />
              {isAligning ? "Syncing..." : "Algorithmic Sync"}
            </button>
          </div>

          {alignError && (
            <div className="align-error-message">
              {alignError}
            </div>
          )}

          {isSuccess && !isTranslating && (
            <div className="align-success-message animate-fade-in">
              <Check size={16} className="success-icon" />
              <span>Operation completed successfully! Review cues panel.</span>
            </div>
          )}
        </div>
      )}

      {/* Local Translation panel */}
      {cues.length > 0 && (
        <div className="translation-actions-panel animate-fade-in">
          <div className="divider-line" />
          
          <div className="card-header-inline sub-header">
            <Brain className="icon text-primary animate-pulse" size={16} />
            <h4>AI Subtitle Translator</h4>
          </div>

          <p className="ai-description small">
            Translate the active subtitle track locally. The original subtitles will be saved to the reference track for proofreading.
          </p>

          {aiAvailable === 'yes' ? (
            <div className="translation-controls">
              <div className="translation-input-row">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="select-lang"
                  disabled={isTranslating}
                  aria-label="Target language select"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <button
                  onClick={translateSubtitles}
                  disabled={isTranslating}
                  className="btn btn-primary btn-sm btn-icon"
                  type="button"
                >
                  <Sparkles size={14} />
                  {isTranslating ? "Translating..." : "Translate Cues"}
                </button>
              </div>

              {isTranslating && (
                <div className="progress-container animate-slide-down">
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${translateProgress}%` }} />
                  </div>
                  <span className="progress-text">Progress: {translateProgress}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="ai-warning-box">
              <AlertTriangle size={14} className="warning-icon" />
              <span>Chrome built-in AI (window.ai.languageModel) is unavailable. Enable local models in Chrome flags.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
