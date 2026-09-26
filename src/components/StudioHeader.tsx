import React from 'react';
import {
  Activity,
  FilePlus,
  FolderOpen,
  Save,
  Settings,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';

interface StudioHeaderProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onOpenSettings,
  onOpenHelp,
  isDarkMode = true,
  onToggleTheme,
}) => {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between border-b border-slate-800/80 bg-[#0d121f] px-4 select-none z-30">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-md shadow-indigo-950/40">
          <Activity className="h-4 w-4" />
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-white font-['Syne',sans-serif] tracking-tight">
            Audio Craft Studio
          </h1>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-900/60 border border-purple-500/40 text-[10px] font-semibold text-purple-300">
            Beta
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs text-slate-400">
          <span className="font-medium text-sky-400">LongScript TTS Studio</span>
          <span className="text-slate-600">—</span>
          <span className="text-slate-400">
            Turn long scripts into natural AI narration manage and merge.
          </span>
        </div>
      </div>

      {/* Right Top Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors shadow-xs"
          title="Create New Project"
        >
          <FilePlus className="h-3.5 w-3.5 text-slate-400" />
          <span>New Project</span>
        </button>

        <button
          onClick={onOpenProject}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors shadow-xs"
          title="Open Existing Project"
        >
          <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
          <span>Open Project</span>
        </button>

        <button
          onClick={onSaveProject}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors shadow-xs"
          title="Save Project"
        >
          <Save className="h-3.5 w-3.5 text-slate-400" />
          <span>Save Project</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors shadow-xs"
          title="Studio Settings"
        >
          <Settings className="h-3.5 w-3.5 text-slate-400" />
          <span>Settings</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Toggle Light / Dark theme"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Help Button */}
        <button
          onClick={onOpenHelp}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Help & Guide"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* User Profile Avatar */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-xs font-bold ring-2 ring-purple-500/30">
          U
        </div>
      </div>
    </header>
  );
};
