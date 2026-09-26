import React, { useState } from 'react';
import { Save, Download, X, CheckCircle2, FileText, Music2, Cpu, Mic2, FolderDown } from 'lucide-react';
import { SavedProject, saveProjectToStorage, exportProjectAsFile } from '../utils/projectManager';
import { ScriptChunk } from '../types/tts';
import { formatTime } from '../utils/audioUtils';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSaved: (project: SavedProject) => void;
  currentProjectName: string;
  script: string;
  chunks: ScriptChunk[];
  currentVoice: string;
  selectedModel: string;
  language: string;
  style: string;
  speed: number;
  pitch: number;
  voicePrompt: string;
  gapDurationMs: number;
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectSaved,
  currentProjectName,
  script,
  chunks,
  currentVoice,
  selectedModel,
  language,
  style,
  speed,
  pitch,
  voicePrompt,
  gapDurationMs,
}) => {
  const [name, setName] = useState(currentProjectName || 'Solo Leveling Episode 1 - Voiceover');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  if (!isOpen) return null;

  const wordCount = script ? script.split(/\s+/).filter(Boolean).length : 0;
  const charCount = script.length;
  const chunksCount = chunks.length;
  const generatedCount = chunks.filter((c) => c.status === 'generated' && c.audioBase64).length;
  const totalDuration = chunks.reduce((acc, c) => acc + (c.duration || 0), 0);

  const buildProjectObject = (): SavedProject => ({
    id: `proj_${Date.now()}`,
    name: name.trim() || 'Untitled Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    script,
    currentVoice,
    selectedModel,
    language,
    style,
    speed,
    pitch,
    voicePrompt,
    gapDurationMs,
    chunks,
    stats: {
      wordCount,
      charCount,
      chunksCount,
      generatedChunksCount: generatedCount,
      totalDurationSeconds: totalDuration,
    },
  });

  const handleSaveToStorage = () => {
    setSaveStatus('saving');
    try {
      const project = buildProjectObject();
      saveProjectToStorage(project);
      onProjectSaved(project);
      setSaveStatus('saved');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
    }
  };

  const handleExportToFile = () => {
    const project = buildProjectObject();
    exportProjectAsFile(project);
    saveProjectToStorage(project);
    onProjectSaved(project);
    setSaveStatus('saved');
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Save className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Syne',sans-serif]">
                Save Project
              </h2>
              <p className="text-[11px] text-slate-400">
                Save session to studio storage or export as backup file
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

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Project Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
              Project Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Manhwa Episode 01 Voiceover"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Project Summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Project Manifest & Audio Stems:
            </span>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>{wordCount.toLocaleString()} words ({charCount.toLocaleString()} chars)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Music2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{generatedCount} of {chunksCount} chunks generated</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mic2 className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Voice: <strong>{currentVoice}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Cpu className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Total Audio: <strong>{formatTime(totalDuration)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/80 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExportToFile}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 text-xs font-semibold transition-colors"
            title="Download portable .mvstudio.json file to your hard drive"
          >
            <Download className="h-3.5 w-3.5 text-sky-400" />
            <span>Export Project File (.json)</span>
          </button>

          <button
            onClick={handleSaveToStorage}
            disabled={saveStatus === 'saving'}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2 text-xs font-semibold transition-all shadow-md shadow-indigo-950/50"
          >
            {saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save to Studio Projects</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
