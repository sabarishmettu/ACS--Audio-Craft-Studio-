import React from 'react';
import {
  Play,
  Pause,
  Square,
  Sparkles,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface GenerationQueuePanelProps {
  totalChunks: number;
  completedChunks: number;
  generatingChunks: number;
  pendingChunks: number;
  failedChunks: number;
  isQueueRunning: boolean;
  onStartQueue: () => void;
  onPauseQueue: () => void;
  onStopQueue: () => void;
  onGenerateMissing: () => void;
  onRetryFailed: () => void;
  elapsedSeconds: number;
  cooldownSeconds?: number | null;
}

export const GenerationQueuePanel: React.FC<GenerationQueuePanelProps> = ({
  totalChunks,
  completedChunks,
  generatingChunks,
  pendingChunks,
  failedChunks,
  isQueueRunning,
  onStartQueue,
  onPauseQueue,
  onStopQueue,
  onGenerateMissing,
  onRetryFailed,
  elapsedSeconds,
  cooldownSeconds = null,
}) => {
  const percent = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;
  const remainingChunks = totalChunks - completedChunks;
  const estimatedRemainingSecs = remainingChunks * 8; // ~8s per chunk average

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  // SVG circular gauge calculations
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col border-b border-slate-800/80 bg-[#0e1424] p-3.5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600/30 text-indigo-400 font-mono text-[11px] font-bold">
          4
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Generation Queue
        </h3>
      </div>

      {/* Radial Progress & Summary Stats */}
      <div className="flex items-center gap-3.5 mb-2.5">
        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="h-16 w-16 -rotate-90 transform">
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke="#1e293b"
              strokeWidth="5"
              fill="transparent"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke="#0ea5e9"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute font-mono text-sm font-bold text-white tabular-nums">
            {percent}%
          </span>
        </div>

        {/* Text Metrics */}
        <div className="flex flex-col gap-0.5 text-xs">
          <div className="font-semibold text-slate-200 font-mono">
            {completedChunks} / {totalChunks} chunks completed,
          </div>
          <div className="text-[11px] text-sky-400 font-medium">
            {isQueueRunning ? 'Generating audio...' : 'Queue paused / standby'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Elapsed: <span className="text-slate-200">{formatSecs(elapsedSeconds)}</span>
            <span className="mx-1">Remaining:</span>
            <span className="text-slate-200">~ {formatSecs(estimatedRemainingSecs)}</span>
          </div>
        </div>
      </div>

      {/* Linear Gradient Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* 4 Status Metric Counters */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
        <div className="flex flex-col items-center rounded-lg bg-slate-950 border border-slate-800/80 py-1.5 px-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono">
            <CheckCircle2 className="h-3 w-3" />
            <span>{completedChunks}</span>
          </div>
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Generated</span>
        </div>

        <div className="flex flex-col items-center rounded-lg bg-slate-950 border border-slate-800/80 py-1.5 px-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-sky-400 font-mono">
            <Activity className="h-3 w-3" />
            <span>{generatingChunks}</span>
          </div>
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Generating</span>
        </div>

        <div className="flex flex-col items-center rounded-lg bg-slate-950 border border-slate-800/80 py-1.5 px-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 font-mono">
            <Clock className="h-3 w-3" />
            <span>{pendingChunks}</span>
          </div>
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Pending</span>
        </div>

        <div className="flex flex-col items-center rounded-lg bg-slate-950 border border-slate-800/80 py-1.5 px-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 font-mono">
            <AlertCircle className="h-3 w-3" />
            <span>{failedChunks}</span>
          </div>
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Failed</span>
        </div>
      </div>

      {/* Live Quota Cooldown Countdown Banner */}
      {cooldownSeconds !== null && cooldownSeconds > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-2.5 mb-3 flex flex-col gap-1.5 text-xs text-amber-200 animate-pulse">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />
              <span>Rate-Limit Cooldown: <strong>{cooldownSeconds}s left</strong></span>
            </span>
            <span className="text-[10px] text-amber-300/90 font-mono">Auto-resuming</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Free tier limit is ~10 req/min. The studio will automatically resume generation when the countdown completes. (Or switch Generation Model to <em>Local Web Voice</em> in Voice Settings above).
          </p>
        </div>
      )}

      {/* Queue Control Buttons */}
      <div className="flex flex-col gap-2">
        {/* Pause / Resume & Stop */}
        <div className="grid grid-cols-3 gap-2">
          {isQueueRunning ? (
            <button
              onClick={onPauseQueue}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white py-1.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onStartQueue}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          <button
            onClick={onStopQueue}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white py-1.5 text-xs font-semibold shadow-sm transition-colors"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>

        {/* Generate All Audio Full Width Blue Button */}
        <button
          onClick={onStartQueue}
          disabled={totalChunks === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 text-xs font-bold shadow-md shadow-indigo-950/40 transition-all disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Generate All Audio</span>
        </button>

        {/* Secondary Actions: Generate Missing & Retry Failed */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onGenerateMissing}
            disabled={pendingChunks === 0}
            className="flex items-center justify-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 py-1 text-[11px] text-slate-300 transition-colors disabled:opacity-40"
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Generate Missing</span>
          </button>

          <button
            onClick={onRetryFailed}
            disabled={failedChunks === 0}
            className="flex items-center justify-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 py-1 text-[11px] text-slate-300 transition-colors disabled:opacity-40"
          >
            <RotateCw className="h-3 w-3 text-rose-400" />
            <span>Retry Failed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
