import React from 'react';
import { HelpCircle, X, Sparkles, Scissors, Volume2, Merge, Download } from 'lucide-react';
import { AUDIO_TAG_PRESETS } from '../utils/audioUtils';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-5 w-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white font-['Syne',sans-serif]">
              Audio Craft Studio User Guide & Audio Directing Tags
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
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-thin text-xs text-slate-300 leading-relaxed">
          {/* Workflow Steps */}
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-slate-100 uppercase tracking-wider font-mono text-[11px] text-indigo-400">
              How Audio Craft Studio Works
            </h3>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
              <li>
                <strong>1. Script Input:</strong> Paste or write your long-form 2 to 4 hour manuscript or recap script.
              </li>
              <li>
                <strong>2. Partition Into Chunks:</strong> Click <em>"Split Into Chunks"</em> to partition the text into clean, sentence-bounded pieces.
              </li>
              <li>
                <strong>3. Voice & Audio Synthesis:</strong> Click <em>"Generate Audio"</em> beside any chunk or run the sequential batch queue with <em>"Auto-Generate All"</em>.
              </li>
              <li>
                <strong>4. Real-time Audio Timeline:</strong> As chunks are generated, they immediately appear in the bottom multitrack DAW timeline for continuous playback and time-scrubbing.
              </li>
              <li>
                <strong>5. Master Audio Merge:</strong> Click <em>"Merge All Audio"</em> to generate a single continuous studio master track with custom silence gaps.
              </li>
            </ol>
          </div>

          {/* Voice Direction Tags */}
          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4">
            <h3 className="font-bold text-slate-100 uppercase tracking-wider font-mono text-[11px] text-amber-400">
              Gemini TTS Audio Directing Tags
            </h3>
            <p className="text-slate-400">
              You can insert tags directly into your text to control vocal delivery, pacing, and emotional cues:
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {AUDIO_TAG_PRESETS.map((t) => (
                <div
                  key={t.tag}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between font-mono font-bold text-indigo-300">
                    <span>{t.tag}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{t.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{t.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 text-xs font-semibold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
