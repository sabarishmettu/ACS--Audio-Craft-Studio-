import React from 'react';
import { X, Sliders, Sparkles, Check } from 'lucide-react';
import { VoiceOption } from '../types/tts';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voices: VoiceOption[];
  currentVoice: string;
  onSelectVoice: (voiceId: string) => void;
  stylePrompt: string;
  onStylePromptChange: (prompt: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  gapDurationMs: number;
  onGapDurationChange: (gapMs: number) => void;
  onOpenCustomVoiceModal?: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  voices,
  currentVoice,
  onSelectVoice,
  stylePrompt,
  onStylePromptChange,
  selectedModel,
  onSelectModel,
  gapDurationMs,
  onGapDurationChange,
  onOpenCustomVoiceModal,
}) => {
  if (!isOpen) return null;

  const isVibeVoice = selectedModel.startsWith('vibevoice');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white font-['Syne',sans-serif]">
              Voice & Studio Directing
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin">
          {/* 1. Model Engine Selection */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              1. Voice Generation Model Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => onSelectModel('vibevoice-7b')}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                  selectedModel === 'vibevoice-7b'
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">VibeVoice 7B Flagship</span>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/40">
                    7B Ultra
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  7B parameter acoustic LLM for deep cinematic immersion, multi-speaker dialogue, and natural breath control.
                </p>
              </button>

              <button
                onClick={() => onSelectModel('vibevoice-1.5b')}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                  selectedModel === 'vibevoice-1.5b'
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">VibeVoice 1.5B Fast</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    1.5B Fast
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Lightweight 1.5B conversational acoustic model. Low latency, fluid cadence, and dynamic rhythm.
                </p>
              </button>

              <button
                onClick={() => onSelectModel('gemini-3.8-flash-lite-tts')}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                  selectedModel === 'gemini-3.8-flash-lite-tts'
                    ? 'border-indigo-500 bg-indigo-950/40'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Gemini 3.1 Flash Lite</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">
                    Fast
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Optimized for speed, high-throughput long scripts, and general narration.
                </p>
              </button>

              <button
                onClick={() => onSelectModel('gemini-3.8-flash-tts')}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                  selectedModel === 'gemini-3.8-flash-tts'
                    ? 'border-indigo-500 bg-indigo-950/40'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Gemini 3.1 Flash</span>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded">
                    Expressive
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Flagship expressive voice model with rich acting and nuanced inflection.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Voice Persona Grid (Filtered based on model) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                2. Select {isVibeVoice ? 'VibeVoice Profile' : 'Gemini Voice Profile'}
              </label>
              {!isVibeVoice && onOpenCustomVoiceModal && (
                <button
                  onClick={onOpenCustomVoiceModal}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 px-2.5 py-1 text-xs font-medium text-indigo-300 transition-colors"
                >
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>+ Clone Custom WAV Voice</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {voices.map((v) => {
                const isSelected = v.id === currentVoice;
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVoice(v.id)}
                    className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 shadow-sm shadow-indigo-900/40'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{v.name}</span>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {v.gender}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">
                      {v.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-indigo-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Style & Direction Prompt */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                3. Speech Style Directing Instruction
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Passed to voice synthesis
              </span>
            </div>

            <textarea
              value={stylePrompt}
              onChange={(e) => onStylePromptChange(e.target.value)}
              rows={2}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-sans"
              placeholder="e.g. Deep, atmospheric movie trailer voice with dramatic resonance..."
            />
          </div>

          {/* 4. Merge Gap Duration */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                4. Merge Silence Interval
              </label>
              <span className="font-mono text-xs font-semibold text-indigo-300">
                {gapDurationMs} ms ({gapDurationMs / 1000}s pause)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1500"
              step="50"
              value={gapDurationMs}
              onChange={(e) => onGapDurationChange(parseInt(e.target.value, 10))}
              className="accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Duration of natural acoustic pause inserted between sequential chunks when merging master audio.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3.5 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 text-xs font-semibold shadow-md transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
