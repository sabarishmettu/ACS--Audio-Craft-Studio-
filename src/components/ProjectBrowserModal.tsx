import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  X,
  BookOpen,
  Clock,
  Layers,
  UploadCloud,
  Trash2,
  Download,
  FileCode,
  HardDrive,
  FileText,
  Music2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { SAMPLE_SCRIPTS, formatTime } from '../utils/audioUtils';
import {
  SavedProject,
  getSavedProjects,
  deleteSavedProject,
  exportProjectAsFile,
  importProjectFromFile,
} from '../utils/projectManager';

interface ProjectBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: {
    title: string;
    text: string;
    style?: string;
    voice?: string;
    model?: string;
    chunks?: any[];
  }) => void;
}

export const ProjectBrowserModal: React.FC<ProjectBrowserModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'import' | 'starter'>('saved');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshProjects = () => {
    const list = getSavedProjects();
    setSavedProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshProjects();
      setImportError(null);
      // Default to 'saved' if any exist, otherwise 'starter'
      const list = getSavedProjects();
      if (list.length === 0) {
        setActiveTab('saved');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this saved project?')) {
      deleteSavedProject(id);
      refreshProjects();
    }
  };

  const handleExport = (e: React.MouseEvent, project: SavedProject) => {
    e.stopPropagation();
    exportProjectAsFile(project);
  };

  const handleFileProcess = async (file: File) => {
    setImportError(null);
    try {
      const project = await importProjectFromFile(file);
      onSelectProject({
        title: project.name,
        text: project.script,
        style: project.voicePrompt || project.style,
        voice: project.currentVoice,
        model: project.selectedModel,
        chunks: project.chunks,
      });
      onClose();
    } catch (err: any) {
      setImportError(err?.message || 'Failed to open project file.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Syne',sans-serif]">
                Open Studio Project
              </h2>
              <p className="text-[11px] text-slate-400">
                Load saved sessions, import project files from your drive, or use starter templates
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'saved'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Saved Projects ({savedProjects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Open from Computer / File (.json)</span>
          </button>

          <button
            onClick={() => setActiveTab('starter')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'starter'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Starter Template</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scrollbar-thin">
          {/* TAB 1: Real Saved Projects */}
          {activeTab === 'saved' && (
            <div className="space-y-3">
              {savedProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 mb-3">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 mb-1">No Saved Projects Yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    When you click <strong>Save Project</strong> in the top header, your complete script, voice settings, and audio tracks will be stored here.
                  </p>
                  <button
                    onClick={() => setActiveTab('starter')}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Load Starter Template</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {savedProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectProject({
                          title: p.name,
                          text: p.script,
                          style: p.voicePrompt || p.style,
                          voice: p.currentVoice,
                          model: p.selectedModel,
                          chunks: p.chunks,
                        });
                        onClose();
                      }}
                      className="group flex flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-indigo-500/60 hover:bg-indigo-950/20 p-4 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {p.name}
                          </h3>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {new Date(p.updatedAt || p.createdAt).toLocaleString()}
                            </span>
                            <span>•</span>
                            <span className="text-indigo-300">Voice: {p.currentVoice}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleExport(e, p)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Export as .json backup file"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, p.id)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 hover:text-rose-100 transition-colors"
                            title="Delete saved project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-slate-500" />
                            {p.stats?.wordCount || p.script.split(/\s+/).filter(Boolean).length} words
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3 text-slate-500" />
                            {p.stats?.chunksCount || p.chunks?.length || 0} chunks ({p.stats?.generatedChunksCount || p.chunks?.filter(c => c.status === 'generated').length || 0} audio)
                          </span>
                          {p.stats?.totalDurationSeconds ? (
                            <span className="text-emerald-400 font-semibold">
                              ⏱️ {formatTime(p.stats.totalDurationSeconds)}
                            </span>
                          ) : null}
                        </div>

                        <span className="text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Open Project →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Open from Computer File */}
          {activeTab === 'import' && (
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.mvstudio"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3 shadow-md shadow-indigo-950/40">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Choose or Drag & Drop Project File
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Select any <strong>.mvstudio.json</strong> or <strong>.json</strong> project file from your computer to restore your exact script, voice, and audio tracks.
                </p>
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2 text-xs font-semibold transition-all shadow-md shadow-indigo-950/50"
                >
                  Browse Files...
                </button>
              </div>

              {importError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                  ⚠️ {importError}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Starter Template (Only 1 clean starter) */}
          {activeTab === 'starter' && (
            <div className="grid grid-cols-1 gap-3">
              {SAMPLE_SCRIPTS.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectProject({
                      title: s.title,
                      text: s.text,
                      style: s.style,
                      voice: s.recommendedVoice,
                    });
                    onClose();
                  }}
                  className="group flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-indigo-500/60 hover:bg-indigo-950/20 p-4 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {s.title}
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      {s.genre}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {s.text.slice(0, 180)}...
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
                    <span>
                      Recommended Voice: <strong className="text-indigo-300">{s.recommendedVoice}</strong>
                    </span>
                    <span className="text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Load Template →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
