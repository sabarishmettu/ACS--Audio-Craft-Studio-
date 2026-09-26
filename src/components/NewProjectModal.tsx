import React from 'react';
import { AlertTriangle, PlusCircle, Save, Trash2, X, FileText, Music2 } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscardAndCreate: () => void;
  onSaveAndCreate: () => void;
  stats: {
    wordCount: number;
    charCount: number;
    chunksCount: number;
    generatedChunksCount: number;
    totalDurationSeconds: number;
  };
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onDiscardAndCreate,
  onSaveAndCreate,
  stats,
}) => {
  if (!isOpen) return null;

  const hasUnsavedWork = stats.charCount > 0 || stats.chunksCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Syne',sans-serif]">
                Create New Project
              </h2>
              <p className="text-[11px] text-slate-400">
                Confirm workspace reset and save your active progress
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

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed space-y-1">
              <p className="font-semibold text-amber-200">
                Starting a new project will clear the active canvas:
              </p>
              <p className="text-slate-400">
                Your current script, partitioned chunks, and generated multi-track audio timeline will be erased.
              </p>
            </div>
          </div>

          {/* Active Project Snapshot */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Current Active Workspace:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                <span>{stats.wordCount.toLocaleString()} words ({stats.charCount.toLocaleString()} chars)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Music2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>{stats.generatedChunksCount} of {stats.chunksCount} chunks generated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/80 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={onDiscardAndCreate}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white px-4 py-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Discard & Start Fresh</span>
          </button>

          {hasUnsavedWork && (
            <button
              onClick={onSaveAndCreate}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 text-xs font-semibold transition-all shadow-md shadow-indigo-950/50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save & Start Fresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
