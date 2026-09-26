import React, { useState } from 'react';
import { Volume2, Play, Pause, HelpCircle, Sparkles, Cpu } from 'lucide-react';
import { VoiceOption } from '../types/tts';
import { synthesizeLocalWebVoice, stopAllSpeech, playSpeechUtterance } from '../utils/localVoiceSynth';

export const TTS_MODELS = [
  {
    id: 'gemini-3.8-flash-lite-tts',
    name: 'Gemini 3.1 Flash Lite TTS (Fast & Recommended)',
    badge: 'Lite 3.1',
    description: 'High throughput, optimal for 2–4 hour scripts, batch generation, and long-form narration.',
  },
  {
    id: 'gemini-3.8-flash-tts',
    name: 'Gemini 3.1 Flash TTS (Voice Design & Acting)',
    badge: 'Expressive 3.1',
    description: 'Rich emotional acting nuances, expressive speech tags, backchanneling, and custom personas.',
  },
  {
    id: 'local-web-voice',
    name: 'Local Web Voice Engine (Unlimited & Offline)',
    badge: 'Local Synth',
    description: 'Runs directly on your computer CPU. Zero cloud quota limits, 100% free, and instant audio creation.',
  },
];

interface VoiceSettingsPanelProps {
  voices: VoiceOption[];
  currentVoice: string;
  onSelectVoice: (voiceId: string) => void;
  onOpenCustomVoiceModal?: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  speed: number;
  onSpeedChange: (spd: number) => void;
  pitch: number;
  onPitchChange: (p: number) => void;
  voicePrompt: string;
  onVoicePromptChange: (prompt: string) => void;
}

const LANGUAGES = [
  'English',
  'Japanese',
  'Spanish',
  'French',
  'German',
  'Korean',
  'Chinese (Mandarin)',
  'Hindi',
  'Portuguese',
];

const STYLES = [
  'Narrative',
  'Dramatic',
  'Conversational',
  'Documentary',
  'Anime / Manhwa Recap',
  'Audiobook Storyteller',
  'Whisper & Intimate',
  'High Energy Podcast',
];

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  voices,
  currentVoice,
  onSelectVoice,
  onOpenCustomVoiceModal,
  selectedModel,
  onSelectModel,
  language,
  onLanguageChange,
  style,
  onStyleChange,
  speed,
  onSpeedChange,
  pitch,
  onPitchChange,
  voicePrompt,
  onVoicePromptChange,
}) => {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePreviewVoice = async () => {
    if (isPreviewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      stopAllSpeech();
      setIsPreviewPlaying(false);
      return;
    }

    stopAllSpeech();
    setIsPreviewLoading(true);
    try {
      if (selectedModel === 'local-web-voice') {
        const activeVoiceObj = voices.find((v) => v.id === currentVoice);
        const isMale = activeVoiceObj?.gender === 'Male' || currentVoice.toLowerCase().includes('male') || currentVoice.toLowerCase().includes('puck') || currentVoice.toLowerCase().includes('charon') || currentVoice.toLowerCase().includes('fenrir');
        const gender: 'Male' | 'Female' = isMale ? 'Male' : 'Female';
        const sampleText = `Welcome to Audio Craft Studio. This is a preview of the ${activeVoiceObj?.name || currentVoice} local voice engine.`;
        playSpeechUtterance(
          sampleText,
          gender,
          speed,
          1.0 + pitch / 10,
          () => {
            setIsPreviewPlaying(false);
          },
          currentVoice
        );
        setIsPreviewPlaying(true);
      } else {
        const response = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Welcome to Audio Craft Studio. This is a sample preview of my voice style, pacing, and inflection.',
            voice: currentVoice,
            model: selectedModel,
            stylePrompt: voicePrompt,
          }),
        });
        const data = await response.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audio.playbackRate = speed;
          previewAudioRef.current = audio;
          audio.onended = () => setIsPreviewPlaying(false);
          audio.play().catch(console.error);
          setIsPreviewPlaying(true);
        }
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="flex flex-col border-b border-slate-800/80 bg-[#0e1424] p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600/30 text-indigo-400 font-mono text-[11px] font-bold">
            3
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Voice Settings
          </h3>
        </div>

        {/* Preview Voice Button */}
        <button
          onClick={handlePreviewVoice}
          disabled={isPreviewLoading}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors"
        >
          {isPreviewLoading ? (
            <Sparkles className="h-3 w-3 animate-spin text-indigo-400" />
          ) : isPreviewPlaying ? (
            <Pause className="h-3 w-3 fill-current text-indigo-400" />
          ) : (
            <Volume2 className="h-3 w-3 text-indigo-400" />
          )}
          <span>{isPreviewPlaying ? 'Stop Preview' : 'Preview Voice'}</span>
        </button>
      </div>

      {/* Generation Model Selector (Above Voice Selection) */}
      <div className="flex flex-col gap-1 mb-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-sky-400" />
            <span>Generation Model</span>
          </label>
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.2 rounded">
            {TTS_MODELS.find((m) => m.id === selectedModel)?.badge || 'Gemini 3.1'}
          </span>
        </div>
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs font-medium text-sky-200 focus:border-sky-500 focus:outline-none cursor-pointer"
        >
          {TTS_MODELS.map((m) => (
            <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
              {m.name}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-500 italic">
          {TTS_MODELS.find((m) => m.id === selectedModel)?.description}
        </p>
      </div>

      {/* Voice Selection Dropdown */}
      <div className="flex flex-col gap-1 mb-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-slate-400 font-medium">Voice</label>
          {onOpenCustomVoiceModal && (
            <button
              onClick={onOpenCustomVoiceModal}
              type="button"
              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>+ Add Custom WAV Voice</span>
            </button>
          )}
        </div>
        <select
          value={currentVoice}
          onChange={(e) => onSelectVoice(e.target.value)}
          className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
        >
          {voices.map((v) => (
            <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Language & Style 2-Columns */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-medium">Language</label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang} className="bg-slate-900 text-slate-200">
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-medium">Style</label>
          <select
            value={style}
            onChange={(e) => onStyleChange(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            {STYLES.map((st) => (
              <option key={st} value={st} className="bg-slate-900 text-slate-200">
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sliders: Speed & Pitch */}
      <div className="flex flex-col gap-2 mb-2.5">
        {/* Speed Slider */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">Speed</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-28 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="font-mono text-slate-300 w-8 text-right">{speed.toFixed(1)}x</span>
          </div>
        </div>

        {/* Pitch Slider */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">Pitch_</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={pitch}
              onChange={(e) => onPitchChange(parseInt(e.target.value, 10))}
              className="w-28 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="font-mono text-slate-300 w-8 text-right">{pitch}</span>
          </div>
        </div>
      </div>

      {/* Voice Direction / Context Prompt Textarea */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-slate-400 font-medium">
            Voice Direction / Context Prompt
          </label>
        </div>

        <textarea
          value={voicePrompt}
          onChange={(e) => onVoicePromptChange(e.target.value.slice(0, 500))}
          rows={3}
          className="w-full resize-none rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-sans"
          placeholder="e.g. Read this as a dramatic YouTube manhwa recap narrator..."
        />

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
          <span>{voicePrompt.length}/500</span>
          <HelpCircle className="h-3 w-3 text-slate-500 cursor-help" />
        </div>
      </div>
    </div>
  );
};
