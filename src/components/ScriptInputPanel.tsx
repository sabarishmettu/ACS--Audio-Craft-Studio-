import React, { useRef, useState } from 'react';
import {
  FileText,
  Maximize2,
  Minimize2,
  ClipboardPaste,
  Trash2,
  Upload,
  Search,
  Scissors,
  HelpCircle,
  Sliders,
  Check,
} from 'lucide-react';
import { formatDurationHuman } from '../utils/audioUtils';

interface ScriptInputPanelProps {
  script: string;
  onScriptChange: (newScript: string) => void;
  onSplitIntoChunks: (chunkSizePreset: string, maxChars: number, smartSplit: boolean) => void;
  isSplitting: boolean;
  totalCharacters: number;
  totalWords: number;
  totalParagraphs: number;
  estimatedDurationSeconds: number;
}

export const ScriptInputPanel: React.FC<ScriptInputPanelProps> = ({
  script,
  onScriptChange,
  onSplitIntoChunks,
  isSplitting,
  totalCharacters,
  totalWords,
  totalParagraphs,
  estimatedDurationSeconds,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [chunkSizePreset, setChunkSizePreset] = useState<string>('Medium (Recommended)');
  const [maxCharacters, setMaxCharacters] = useState<number>(2000);
  const [smartSplitting, setSmartSplitting] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  // Line numbers calculation
  const lines = script.split('\n');
  const lineCount = Math.max(lines.length, 25);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onScriptChange(text);
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire script?')) {
      onScriptChange('');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onScriptChange(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFindAndReplace = () => {
    if (!findQuery) return;
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const updated = script.replace(regex, replaceQuery);
    onScriptChange(updated);
  };

  const handlePresetChange = (preset: string) => {
    setChunkSizePreset(preset);
    if (preset === 'Small') setMaxCharacters(1000);
    else if (preset === 'Medium (Recommended)') setMaxCharacters(2000);
    else if (preset === 'Large') setMaxCharacters(3500);
  };

  return (
    <div
      className={`flex flex-col h-full bg-[#0e1424] border-r border-slate-800/80 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#0e1424]' : ''
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.srt,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* 1. Header with Icon & Maximize */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-[#111728]">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-slate-300 font-mono text-[11px] font-bold">
            1
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Script Input
          </h2>
        </div>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800/60 bg-[#0c101c] px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePaste}
            className="flex items-center gap-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 text-slate-300 transition-colors"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="h-3 w-3 text-slate-400" />
            <span>Paste</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 text-slate-300 transition-colors"
            title="Clear text"
          >
            <Trash2 className="h-3 w-3 text-slate-400" />
            <span>Clear</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 text-slate-300 transition-colors"
            title="Import text or script file"
          >
            <Upload className="h-3 w-3 text-slate-400" />
            <span>Import</span>
          </button>

          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`flex items-center gap-1.5 rounded border px-2.5 py-1 transition-colors ${
              showFindReplace
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
            title="Find & Replace"
          >
            <Search className="h-3 w-3 text-slate-400" />
            <span>Find & Replace</span>
          </button>
        </div>
      </div>

      {/* Find & Replace Popover Bar */}
      {showFindReplace && (
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2 text-xs">
          <input
            type="text"
            placeholder="Find..."
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            className="flex-1 rounded bg-slate-950 border border-slate-800 px-2 py-1 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Replace..."
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            className="flex-1 rounded bg-slate-950 border border-slate-800 px-2 py-1 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleFindAndReplace}
            className="rounded bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 text-xs font-medium"
          >
            Replace All
          </button>
        </div>
      )}

      {/* Editor with Gutter Line Numbers */}
      <div className="flex-1 relative flex min-h-0 bg-[#0a0e1a] overflow-hidden">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-10 shrink-0 bg-[#090d18] border-r border-slate-800/80 py-3 text-right pr-2 select-none text-[11px] font-mono text-slate-600 overflow-hidden leading-relaxed"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          onScroll={handleScroll}
          placeholder="Paste or write your full master script here..."
          className="flex-1 h-full resize-none bg-transparent p-3 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none font-mono scrollbar-thin selection:bg-indigo-500/30"
          spellCheck={false}
        />
      </div>

      {/* 4 Statistics Metrics Card Grid */}
      <div className="grid grid-cols-4 gap-2 border-t border-slate-800/80 bg-[#0c101c] p-3 text-center">
        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Characters
          </div>
          <div className="text-sm font-bold text-slate-100 font-mono mt-0.5 tabular-nums">
            {totalCharacters.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Words
          </div>
          <div className="text-sm font-bold text-slate-100 font-mono mt-0.5 tabular-nums">
            {totalWords.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Paragraphs
          </div>
          <div className="text-sm font-bold text-slate-100 font-mono mt-0.5 tabular-nums">
            {totalParagraphs.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Est. Duration
          </div>
          <div className="text-sm font-bold text-indigo-400 font-mono mt-0.5 tabular-nums">
            {formatDurationHuman(estimatedDurationSeconds)}
          </div>
        </div>
      </div>

      {/* Chunk Settings Subcard */}
      <div className="border-t border-slate-800/80 bg-[#111728] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Sliders className="h-3.5 w-3.5 text-indigo-400" />
          <span>Chunk Settings</span>
        </div>

        {/* Chunk Size Preset & Max Characters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Chunk Size</label>
            <select
              value={chunkSizePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="Medium (Recommended)">Medium (Recommended)</option>
              <option value="Small">Small (~1,000 chars)</option>
              <option value="Large">Large (~3,500 chars)</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Max Characters</label>
            <input
              type="number"
              value={maxCharacters}
              onChange={(e) => setMaxCharacters(parseInt(e.target.value, 10) || 1000)}
              className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Smart Splitting Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {/* Toggle switch */}
            <button
              onClick={() => setSmartSplitting(!smartSplitting)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                smartSplitting ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  smartSplitting ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>

            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-300">Smart Splitting</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Split at paragraph/sentence boundaries (recommended)</span>
            <HelpCircle className="h-3 w-3 text-slate-500 cursor-help" />
          </div>
        </div>

        {/* Primary Action Button: Split Into Chunks */}
        <button
          onClick={() => onSplitIntoChunks(chunkSizePreset, maxCharacters, smartSplitting)}
          disabled={isSplitting || !script.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/50 transition-all duration-150 mt-1"
        >
          <Scissors className={`h-4 w-4 ${isSplitting ? 'animate-spin' : ''}`} />
          <span>{isSplitting ? 'Partitioning Into Chunks...' : 'Split Into Chunks'}</span>
        </button>
      </div>
    </div>
  );
};
