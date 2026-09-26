import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Mic,
  Volume2,
  Play,
  Pause,
  Sparkles,
  Check,
  X,
  Radio,
  FileAudio,
  AlertCircle,
} from 'lucide-react';
import { VoiceOption } from '../types/tts';

interface CustomVoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomVoice: (voice: VoiceOption) => void;
}

export const CustomVoiceUploadModal: React.FC<CustomVoiceUploadModalProps> = ({
  isOpen,
  onClose,
  onAddCustomVoice,
}) => {
  const [voiceName, setVoiceName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('audio/wav');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VoiceOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.includes('audio') && !selectedFile.name.endsWith('.wav') && !selectedFile.name.endsWith('.mp3')) {
      setError('Please upload a valid WAV or MP3 audio file.');
      return;
    }

    setError(null);
    setFile(selectedFile);
    setMimeType(selectedFile.type || 'audio/wav');
    if (!voiceName) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setVoiceName(cleanName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAudioBase64(result);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = () => {
          setAudioBase64(reader.result as string);
          setMimeType('audio/wav');
          if (!voiceName) setVoiceName('My Recorded Voice');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or unavailable.');
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  // Toggle Audio Preview Playback
  const togglePreview = () => {
    if (!audioBase64) return;

    if (isPlayingPreview && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    const audio = new Audio(audioBase64);
    audioPreviewRef.current = audio;
    audio.onended = () => setIsPlayingPreview(false);
    audio.play().catch(console.error);
    setIsPlayingPreview(true);
  };

  // Analyze audio and clone voice
  const handleAnalyzeAndClone = async () => {
    if (!audioBase64) {
      setError('Please upload an audio WAV sample or record your voice first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/tts/analyze-voice-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          voiceName: voiceName.trim() || 'Custom Voice',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze audio sample.');
      }

      const data: VoiceOption = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error analyzing voice sample.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveVoice = () => {
    if (!analysisResult) return;
    onAddCustomVoice(analysisResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0d1222] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#0a0e1c]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Add Custom Voice via WAV Audio Sample
              </h2>
              <p className="text-[11px] text-slate-400">
                Upload a 5–30 sec voice clip or record live to clone acoustic timbre & cadence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-thin text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-950/50 border border-rose-800/60 p-3 text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Voice Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold font-mono text-[11px] uppercase tracking-wider">
              1. Custom Voice Name
            </label>
            <input
              type="text"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="e.g. Sabarish Narrator Voice, Dramatic Hero, Master Storyteller..."
              className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* 2. Upload WAV File or Record Audio */}
          <div className="flex flex-col gap-2">
            <label className="text-slate-300 font-semibold font-mono text-[11px] uppercase tracking-wider">
              2. Audio Reference Sample (.wav / .mp3)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-indigo-500/80 bg-indigo-950/30'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/wav,audio/mp3,audio/mpeg,audio/m4a"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <UploadCloud className="h-6 w-6 text-indigo-400" />
                <div>
                  <p className="font-semibold text-slate-200">
                    {file ? file.name : 'Upload WAV Audio'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Drop .wav or .mp3 sample'}
                  </p>
                </div>
              </div>

              {/* Record Mic Box */}
              <div
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  isRecording
                    ? 'border-rose-500 bg-rose-950/40 animate-pulse'
                    : 'border-slate-800 bg-slate-950/50'
                }`}
              >
                {isRecording ? (
                  <>
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold font-mono text-xs">
                      <Radio className="h-4 w-4 animate-spin" />
                      <span>Recording: {recordingDuration}s</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1 text-[11px] transition-colors"
                    >
                      Stop Recording
                    </button>
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6 text-sky-400" />
                    <div>
                      <p className="font-semibold text-slate-200">Record Live Voice</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Speak a sample line</p>
                    </div>
                    <button
                      onClick={startRecording}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1 text-[11px] font-medium transition-colors"
                    >
                      Start Mic
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Audio Preview if loaded */}
            {audioBase64 && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 p-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <FileAudio className="h-4 w-4 text-indigo-400" />
                  <span className="font-mono text-[11px]">Audio Sample Loaded</span>
                </div>
                <button
                  onClick={togglePreview}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-indigo-300 font-medium transition-colors"
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Stop Sample</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Listen Sample</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Analysis Action */}
          {!analysisResult && (
            <button
              onClick={handleAnalyzeAndClone}
              disabled={!audioBase64 || isAnalyzing}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold py-2.5 px-4 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-white" />
                  <span>Analyzing Acoustic Timbre & Vocal Persona...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analyze & Clone Voice Persona</span>
                </>
              )}
            </button>
          )}

          {/* 3. Analysis & Clone Results */}
          {analysisResult && (
            <div className="flex flex-col gap-3 rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs">
                    Voice Profile Successfully Cloned!
                  </span>
                </div>
                <span className="font-mono text-[10px] text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50">
                  {analysisResult.gender} Voice
                </span>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Cloned Voice Title:</span>
                  <p className="font-semibold text-white mt-0.5">{analysisResult.name}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Acoustic Timbre Analysis:</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    {analysisResult.description}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Generated Voice Persona Prompt:</span>
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2 text-slate-300 font-mono text-[11px] mt-0.5">
                    {analysisResult.customPrompt}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {analysisResult.tags.map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-700/40"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 px-6 py-4 bg-[#0a0e1c]">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            Cancel
          </button>

          {analysisResult && (
            <button
              onClick={handleSaveVoice}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 text-xs shadow-lg transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Use & Apply Cloned Voice</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
