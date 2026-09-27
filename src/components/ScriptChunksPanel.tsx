import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  RotateCw,
  Download,
  Edit2,
  Sliders,
  MoreHorizontal,
  XCircle,
  Volume2,
  VolumeX,
  Copy,
  Scissors,
  Merge,
  Trash2,
  Sparkles,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { ScriptChunk, VoiceOption } from '../types/tts';
import { formatTime, downloadBase64Wav } from '../utils/audioUtils';
import { stopAllSpeech, playSpeechUtterance, detectVoiceGender } from '../utils/localVoiceSynth';

interface ScriptChunksPanelProps {
  chunks: ScriptChunk[];
  voices: VoiceOption[];
  currentVoice: string;
  onGenerateChunk: (chunkId: string) => void;
  onCancelChunk: (chunkId: string) => void;
  onUpdateChunkText: (chunkId: string, newText: string) => void;
  onDeleteChunk: (chunkId: string) => void;
  onSplitChunk: (chunkId: string) => void;
  onMergeWithNextChunk: (chunkId: string) => void;
  onToggleSelectChunk: (chunkId: string) => void;
  onSelectAllChunks?: (selected: boolean) => void;
  onGenerateSelected?: () => void;
  onDeleteSelected?: () => void;
  currentlyGeneratingId: string | null;
  onLocalSynthChunk?: (chunkId: string) => void;
}

export const ScriptChunksPanel: React.FC<ScriptChunksPanelProps> = ({
  chunks,
  voices,
  currentVoice,
  onGenerateChunk,
  onCancelChunk,
  onUpdateChunkText,
  onDeleteChunk,
  onSplitChunk,
  onMergeWithNextChunk,
  onToggleSelectChunk,
  onSelectAllChunks,
  onGenerateSelected,
  onDeleteSelected,
  currentlyGeneratingId,
  onLocalSynthChunk,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'not_generated' | 'generating' | 'generated' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'duration' | 'chars'>('number');
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Advanced Tuning Modal for individual chunk
  const [tuningChunk, setTuningChunk] = useState<ScriptChunk | null>(null);
  const [tuningVoice, setTuningVoice] = useState<string>('');
  const [tuningStyle, setTuningStyle] = useState<string>('');
  const [tuningSpeed, setTuningSpeed] = useState<number>(1.0);
  const [tuningPitch, setTuningPitch] = useState<number>(0);

  // Audio Playback State per chunk
  const [playingChunkId, setPlayingChunkId] = useState<string | null>(null);
  const [chunkAudioTimes, setChunkAudioTimes] = useState<{ [id: string]: number }>({});
  const [audioSpeedMap, setAudioSpeedMap] = useState<{ [id: string]: number }>({});
  const [audioMuteMap, setAudioMuteMap] = useState<{ [id: string]: boolean }>({});
  const audioElementsRef = useRef<{ [id: string]: HTMLAudioElement }>({});

  // Counts
  const totalCount = chunks.length;
  const notGenCount = chunks.filter((c) => c.status === 'not_generated').length;
  const geningCount = chunks.filter((c) => c.status === 'generating' || c.id === currentlyGeneratingId).length;
  const generatedCount = chunks.filter((c) => c.status === 'generated').length;
  const failedCount = chunks.filter((c) => c.status === 'failed').length;
  const selectedCount = chunks.filter((c) => c.selected).length;

  // Filtered & Sorted Chunks
  const filteredChunks = chunks
    .filter((c) => {
      const isThisGenerating = c.status === 'generating' || c.id === currentlyGeneratingId;
      if (filterTab === 'not_generated' && (c.status !== 'not_generated' || isThisGenerating)) return false;
      if (filterTab === 'generating' && !isThisGenerating) return false;
      if (filterTab === 'generated' && c.status !== 'generated') return false;
      if (filterTab === 'failed' && c.status !== 'failed') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.text.toLowerCase().includes(q) ||
          `#${String(c.index).padStart(3, '0')}`.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'duration') return b.duration - a.duration;
      if (sortBy === 'chars') return b.characterCount - a.characterCount;
      return a.index - b.index;
    });

  // Audio Playback Handlers
  const handleTogglePlayChunk = (chunk: ScriptChunk) => {
    if (!chunk.audioBase64) return;

    let audio = audioElementsRef.current[chunk.id];
    if (!audio) {
      audio = new Audio(`data:audio/wav;base64,${chunk.audioBase64}`);
      audioElementsRef.current[chunk.id] = audio;

      audio.addEventListener('timeupdate', () => {
        setChunkAudioTimes((prev) => ({ ...prev, [chunk.id]: audio.currentTime }));
      });
      audio.addEventListener('ended', () => {
        setPlayingChunkId(null);
        setChunkAudioTimes((prev) => ({ ...prev, [chunk.id]: 0 }));
        stopAllSpeech();
      });
    }

    // Apply speed and mute state
    const currentSpeed = audioSpeedMap[chunk.id] || 1.0;
    const isMuted = audioMuteMap[chunk.id] || false;
    audio.playbackRate = currentSpeed;
    audio.muted = isMuted;

    if (playingChunkId === chunk.id) {
      // INSTANT PAUSE: Immediately stop audio element and cancel any speech engine output
      audio.pause();
      stopAllSpeech();
      setPlayingChunkId(null);
    } else {
      // Pause any currently playing other chunk
      if (playingChunkId && audioElementsRef.current[playingChunkId]) {
        audioElementsRef.current[playingChunkId].pause();
      }
      stopAllSpeech();

      // Only fallback to speech utterance if audioBase64 is not present
      if (!chunk.audioBase64 && chunk.text) {
        const rawVoiceName = chunk.selectedVoice || '';
        const activeVoiceObj = voices.find(
          (v) => v.id === rawVoiceName || rawVoiceName.startsWith(v.id) || rawVoiceName.includes(v.name)
        );
        const gender = detectVoiceGender(activeVoiceObj?.id || chunk.selectedVoice, activeVoiceObj?.gender);

        playSpeechUtterance(
          chunk.text,
          gender,
          currentSpeed,
          1.0 + (chunk.pitch || 0) / 10,
          () => {
            setPlayingChunkId((prev) => (prev === chunk.id ? null : prev));
          },
          activeVoiceObj?.id || chunk.selectedVoice
        );
      } else {
        audio.play().catch(console.error);
      }
      setPlayingChunkId(chunk.id);
    }
  };

  // Speed selector handler (immediate live application to active audio)
  const handleSpeedChange = (chunkId: string, speed: number) => {
    setAudioSpeedMap((prev) => ({ ...prev, [chunkId]: speed }));
    const audio = audioElementsRef.current[chunkId];
    if (audio) {
      audio.playbackRate = speed;
    }
  };

  // Mute / Unmute toggle
  const handleToggleMute = (chunkId: string) => {
    const nextMuted = !(audioMuteMap[chunkId] || false);
    setAudioMuteMap((prev) => ({ ...prev, [chunkId]: nextMuted }));
    const audio = audioElementsRef.current[chunkId];
    if (audio) {
      audio.muted = nextMuted;
    }
  };

  // Direct waveform seeking handler
  const handleSeek = (chunkId: string, e: React.MouseEvent<HTMLDivElement>, totalDuration: number) => {
    if (totalDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * totalDuration;
    const audio = audioElementsRef.current[chunkId];
    if (audio) {
      audio.currentTime = newTime;
    }
    setChunkAudioTimes((prev) => ({ ...prev, [chunkId]: newTime }));
  };

  // Open Advanced per-chunk tuning
  const openAdvancedTuning = (chunk: ScriptChunk) => {
    setTuningChunk(chunk);
    setTuningVoice(chunk.selectedVoice || currentVoice);
    setTuningStyle(chunk.stylePrompt || '');
    setTuningSpeed(chunk.speed || 1.0);
    setTuningPitch(chunk.pitch || 0);
  };

  // Save Advanced Tuning
  const saveAdvancedTuning = () => {
    if (!tuningChunk) return;
    onUpdateChunkText(tuningChunk.id, tuningChunk.text);
    setTuningChunk(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0f1a] border-r border-slate-800/80">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3 bg-[#101627]">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600/30 text-indigo-400 font-mono text-[11px] font-bold">
            2
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span>Script Chunks</span>
            <span className="text-slate-400 font-normal">({totalCount} chunks)</span>
          </h2>
        </div>

        {/* Search input */}
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search chunks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-950/80 border border-slate-800 pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Tabs & Sort Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 bg-[#0d1222] px-3 py-2 text-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalCount})
          </button>

          <button
            onClick={() => setFilterTab('not_generated')}
            className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
              filterTab === 'not_generated'
                ? 'bg-amber-600/80 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Not Generated ({notGenCount})
          </button>

          <button
            onClick={() => setFilterTab('generating')}
            className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
              filterTab === 'generating'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Generating ({geningCount})
          </button>

          <button
            onClick={() => setFilterTab('generated')}
            className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
              filterTab === 'generated'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Generated ({generatedCount})
          </button>

          <button
            onClick={() => setFilterTab('failed')}
            className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
              filterTab === 'failed'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Failed ({failedCount})
          </button>
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded bg-slate-950 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="number">By Number</option>
            <option value="duration">By Duration</option>
            <option value="chars">By Characters</option>
          </select>
        </div>
      </div>

      {/* Multi-Select Toolbar (when chunks are selected) */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between border-b border-indigo-500/40 bg-indigo-950/40 px-4 py-1.5 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedCount} chunks selected</span>
          </div>
          <div className="flex items-center gap-2">
            {onGenerateSelected && (
              <button
                onClick={onGenerateSelected}
                className="flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-0.5 text-[11px] font-medium"
              >
                <Sparkles className="h-3 w-3" />
                <span>Generate Selected</span>
              </button>
            )}
            {onDeleteSelected && (
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white px-2.5 py-0.5 text-[11px] font-medium"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete Selected</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chunks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {filteredChunks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
            <Layers className="h-8 w-8 text-slate-600 mb-2" />
            <p>No script chunks found matching this filter.</p>
          </div>
        ) : (
          filteredChunks.map((chunk) => {
            const isThisGenerating = chunk.status === 'generating' || chunk.id === currentlyGeneratingId;
            const isDone = chunk.status === 'generated' && !!chunk.audioBase64;
            const isFailed = chunk.status === 'failed';
            const isNotGen = !isDone && !isThisGenerating && !isFailed;
            const isPlaying = playingChunkId === chunk.id;
            const currentTime = chunkAudioTimes[chunk.id] || 0;
            const currentSpeed = audioSpeedMap[chunk.id] || 1.0;
            const isMuted = audioMuteMap[chunk.id] || false;

            return (
              <div
                key={chunk.id}
                id={`chunk-card-${chunk.id}`}
                className={`group rounded-xl border p-3.5 transition-all duration-150 ${
                  isThisGenerating
                    ? 'border-sky-500/60 bg-[#0f172a]'
                    : isDone
                    ? 'border-slate-800/90 bg-[#101627] hover:border-slate-700'
                    : isFailed
                    ? 'border-rose-900/60 bg-[#1c1117]'
                    : 'border-slate-800/60 bg-[#0f1422] hover:border-slate-700/80'
                }`}
              >
                {/* Chunk Top Row: Checkbox, #ID, Status badge, Characters & Duration, Menu */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!chunk.selected}
                      onChange={() => onToggleSelectChunk(chunk.id)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                    />

                    <span className="font-mono text-xs font-bold text-slate-300">
                      #{String(chunk.index).padStart(3, '0')}
                    </span>

                    {/* Status Pill Badges */}
                    {isDone && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Generated</span>
                      </span>
                    )}

                    {isThisGenerating && (
                      <span className="flex items-center gap-1 rounded-full bg-sky-950/80 border border-sky-500/40 px-2 py-0.5 text-[10px] font-semibold text-sky-300 animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                        <span>Generating</span>
                      </span>
                    )}

                    {isNotGen && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        <Clock className="h-3 w-3" />
                        <span>Not Generated</span>
                      </span>
                    )}

                    {isFailed && (
                      <span className="flex items-center gap-1 rounded-full bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                        <AlertCircle className="h-3 w-3" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata: Characters & Duration */}
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] font-mono text-slate-400">
                      <span>{chunk.characterCount.toLocaleString()} characters</span>
                      <span className="text-slate-600 mx-1">•</span>
                      <span className="text-slate-300">{formatTime(chunk.duration)}</span>
                    </div>

                    {/* Triple dots menu */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === chunk.id ? null : chunk.id)
                        }
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeMenuId === chunk.id && (
                        <div className="absolute right-0 top-6 z-30 w-44 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl backdrop-blur-md">
                          {isDone && (
                            <button
                              onClick={() => {
                                downloadBase64Wav(
                                  chunk.audioBase64!,
                                  `chunk_${String(chunk.index).padStart(3, '0')}.wav`
                                );
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-indigo-600 transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download WAV</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(chunk.text);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            <span>Copy Text</span>
                          </button>

                          <button
                            onClick={() => {
                              onSplitChunk(chunk.id);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                          >
                            <Scissors className="h-3.5 w-3.5 text-slate-400" />
                            <span>Split Chunk</span>
                          </button>

                          <button
                            onClick={() => {
                              onMergeWithNextChunk(chunk.id);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                          >
                            <Merge className="h-3.5 w-3.5 text-slate-400" />
                            <span>Merge with Next</span>
                          </button>

                          <div className="my-1 border-t border-slate-800" />

                          <button
                            onClick={() => {
                              onDeleteChunk(chunk.id);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Chunk</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chunk Script Text */}
                {editingChunkId === chunk.id ? (
                  <div className="mb-3">
                    <textarea
                      value={chunk.text}
                      onChange={(e) => onUpdateChunkText(chunk.id, e.target.value)}
                      rows={3}
                      className="w-full rounded-lg bg-slate-950 border border-indigo-500 p-2 text-xs text-slate-200 focus:outline-none font-mono leading-relaxed"
                    />
                    <div className="flex justify-end gap-2 mt-1">
                      <button
                        onClick={() => setEditingChunkId(null)}
                        className="rounded bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-slate-300 font-sans mb-3 line-clamp-3">
                    {chunk.text}
                  </p>
                )}

                {/* Audio Waveform Player / Progress / Buttons Row */}
                {isDone ? (
                  /* Audio Player Controls Bar */
                  <div className="flex flex-col gap-2 rounded-xl bg-slate-950/80 border border-slate-800/80 p-2.5">
                    <div className="flex items-center gap-3">
                      {/* Play Button */}
                      <button
                        onClick={() => handleTogglePlayChunk(chunk)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current translate-x-0.5" />
                        )}
                      </button>

                      {/* Waveform Scrubber with direct click seek */}
                      <div
                        onClick={(e) => handleSeek(chunk.id, e, chunk.duration)}
                        className="relative flex-1 flex items-center h-6 cursor-pointer group"
                      >
                        <div className="flex items-center gap-0.5 w-full h-5 px-1 pointer-events-none">
                          {Array.from({ length: 48 }).map((_, barIdx) => {
                            const progress = chunk.duration > 0 ? (currentTime / chunk.duration) * 100 : 0;
                            const barProgress = (barIdx / 48) * 100;
                            const isPast = barProgress <= progress;
                            const height = 20 + (((barIdx * 37) % 70) + 10);
                            return (
                              <div
                                key={barIdx}
                                className="flex-1 rounded-full transition-all duration-75"
                                style={{
                                  height: `${height}%`,
                                  backgroundColor: isPast ? '#6366f1' : '#334155',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Time Readout */}
                      <div className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span>{formatTime(chunk.duration)}</span>
                      </div>

                      {/* Volume & Speed Selector (0.75x, 1.0x, 1.25x, 1.5x) */}
                      <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-800">
                        {/* Interactive Mute button */}
                        <button
                          onClick={() => handleToggleMute(chunk.id)}
                          className="text-slate-400 hover:text-white transition-colors"
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? (
                            <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* Interactive Speed selector */}
                        <select
                          value={currentSpeed === 1 ? '1' : currentSpeed === 2 ? '2' : String(currentSpeed)}
                          onChange={(e) => handleSpeedChange(chunk.id, parseFloat(e.target.value))}
                          className="bg-slate-900 border border-slate-700/80 rounded px-1 py-0.5 text-[11px] font-mono text-indigo-300 focus:outline-none cursor-pointer"
                        >
                          <option value="0.75">0.75x</option>
                          <option value="1">1.0x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2.0x</option>
                        </select>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onGenerateChunk(chunk.id)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <RotateCw className="h-3 w-3" />
                          <span>Regenerate</span>
                        </button>

                        <button
                          onClick={() =>
                            downloadBase64Wav(
                              chunk.audioBase64!,
                              `chunk_${String(chunk.index).padStart(3, '0')}.wav`
                            )
                          }
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>

                        <button
                          onClick={() => setEditingChunkId(chunk.id)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => openAdvancedTuning(chunk)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Sliders className="h-3 w-3" />
                          <span>Advanced</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isThisGenerating ? (
                  /* Generating State */
                  <div className="flex flex-col gap-2 rounded-xl bg-sky-950/30 border border-sky-800/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-sky-300 font-mono text-[11px]">
                        <div className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                        <span>Generating audio... ({chunk.progress || 68}%)</span>
                      </div>

                      <button
                        onClick={() => onCancelChunk(chunk.id)}
                        className="flex items-center gap-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Cancel</span>
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-all duration-300"
                        style={{ width: `${chunk.progress || 68}%` }}
                      />
                    </div>
                  </div>
                ) : isFailed ? (
                  /* Failed State with Clean Retry */
                  <div className="flex items-center justify-between rounded-xl bg-rose-950/40 border border-rose-800/50 p-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onGenerateChunk(chunk.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>Retry</span>
                      </button>

                      <span className="text-[11px] text-rose-300 font-medium">
                        {chunk.error || 'TTS synthesis failed. Click retry.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setEditingChunkId(chunk.id)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => openAdvancedTuning(chunk)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        <Sliders className="h-3 w-3" />
                        <span>Advanced</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Not Generated State */
                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/60 p-2.5">
                    <button
                      onClick={() => onGenerateChunk(chunk.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Generate Audio</span>
                    </button>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setEditingChunkId(chunk.id)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => openAdvancedTuning(chunk)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        <Sliders className="h-3 w-3" />
                        <span>Advanced</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Advanced Per-Chunk Tuning Modal */}
      {tuningChunk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <span>Chunk #{tuningChunk.index} Advanced Tuning</span>
              </h3>
              <button
                onClick={() => setTuningChunk(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Custom Voice Override</label>
                <select
                  value={tuningVoice}
                  onChange={(e) => setTuningVoice(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-slate-800 p-2 text-slate-200"
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Chunk Tone & Style Prompt</label>
                <textarea
                  value={tuningStyle}
                  onChange={(e) => setTuningStyle(e.target.value)}
                  rows={2}
                  className="rounded-lg bg-slate-950 border border-slate-800 p-2 text-slate-200"
                  placeholder="e.g. Whispered tense delivery with dramatic breath..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Speed: {tuningSpeed}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={tuningSpeed}
                    onChange={(e) => setTuningSpeed(parseFloat(e.target.value))}
                    className="accent-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Pitch: {tuningPitch}</label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="1"
                    value={tuningPitch}
                    onChange={(e) => setTuningPitch(parseInt(e.target.value, 10))}
                    className="accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setTuningChunk(null)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={saveAdvancedTuning}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Apply Tuning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
