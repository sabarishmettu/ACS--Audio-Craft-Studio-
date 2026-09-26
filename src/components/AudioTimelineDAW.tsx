import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
  Disc,
  ArrowLeft,
  ArrowRight,
  GripHorizontal,
} from 'lucide-react';
import { ScriptChunk } from '../types/tts';
import { formatTime } from '../utils/audioUtils';
import { stopAllSpeech } from '../utils/localVoiceSynth';

interface AudioTimelineDAWProps {
  chunks: ScriptChunk[];
  onSelectChunk?: (chunkId: string) => void;
  onReorderChunks?: (startIndex: number, endIndex: number) => void;
  onMoveChunk?: (chunkId: string, direction: 'left' | 'right') => void;
  masterAudioBase64?: string | null;
  masterDuration?: number;
  externalPlayingChunkId?: string | null;
  externalPlayingTime?: number;
}

const CHUNK_COLORS = [
  'from-blue-600 to-blue-500 border-blue-400/50',
  'from-purple-600 to-purple-500 border-purple-400/50',
  'from-indigo-600 to-indigo-500 border-indigo-400/50',
  'from-rose-600 to-rose-500 border-rose-400/50',
  'from-sky-600 to-sky-500 border-sky-400/50',
  'from-cyan-600 to-cyan-500 border-cyan-400/50',
  'from-slate-600 to-slate-500 border-slate-400/50',
  'from-amber-600 to-amber-500 border-amber-400/50',
  'from-emerald-600 to-emerald-500 border-emerald-400/50',
  'from-teal-600 to-teal-500 border-teal-400/50',
];

export const AudioTimelineDAW: React.FC<AudioTimelineDAWProps> = ({
  chunks,
  onSelectChunk,
  onReorderChunks,
  onMoveChunk,
  masterAudioBase64,
  masterDuration = 0,
  externalPlayingChunkId,
  externalPlayingTime = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timelineView, setTimelineView] = useState<'chunks' | 'final'>('chunks');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Drag and drop reordering state
  const [draggedChunkIndex, setDraggedChunkIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const trackContainerRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const currentChunkIndexRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // ONLY show chunks that have actually been generated!
  const generatedChunks = chunks.filter((c) => c.status === 'generated' && !!c.audioBase64);

  // Calculate cumulative start and end timestamps for each generated chunk
  const chunkTimelineData = React.useMemo(() => {
    let accumTime = 0;
    return generatedChunks.map((chunk, arrayPos) => {
      const startTime = accumTime;
      const dur = chunk.duration || 10;
      accumTime += dur;
      return {
        ...chunk,
        startTime,
        endTime: accumTime,
        timelinePos: arrayPos,
      };
    });
  }, [generatedChunks]);

  const totalGeneratedDuration =
    chunkTimelineData.length > 0
      ? chunkTimelineData[chunkTimelineData.length - 1].endTime
      : 0;

  const totalTimelineDuration =
    timelineView === 'final' && masterDuration > 0
      ? masterDuration
      : totalGeneratedDuration || 0;

  // Real-time synchronization when audio is played from an individual chunk card
  useEffect(() => {
    if (externalPlayingChunkId && !isPlaying) {
      const match = chunkTimelineData.find((c) => c.id === externalPlayingChunkId);
      if (match) {
        setSelectedBlockId(match.id);
        const liveTime = match.startTime + externalPlayingTime;
        setCurrentTime(liveTime);
      }
    }
  }, [externalPlayingChunkId, externalPlayingTime, isPlaying, chunkTimelineData]);

  // Format 0:00:00
  const formatDawTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00:00';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Stop playback cleanup
  const stopTimelinePlayback = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    stopAllSpeech();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Play audio sequentially starting at idx
  const playChunkAtIndex = useCallback(
    (idx: number, offsetSecs = 0) => {
      if (idx >= chunkTimelineData.length || idx < 0) {
        stopTimelinePlayback();
        return;
      }

      currentChunkIndexRef.current = idx;
      const targetChunk = chunkTimelineData[idx];
      setSelectedBlockId(targetChunk.id);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audio = new Audio(`data:audio/wav;base64,${targetChunk.audioBase64}`);
      audioPlayerRef.current = audio;

      audio.onloadedmetadata = () => {
        if (offsetSecs > 0 && offsetSecs < audio.duration) {
          audio.currentTime = offsetSecs;
        }
        audio.play().catch(console.error);
      };

      audio.onended = () => {
        if (idx + 1 < chunkTimelineData.length) {
          playChunkAtIndex(idx + 1, 0);
        } else {
          stopTimelinePlayback();
          setCurrentTime(0);
        }
      };

      // Real-time animation frame loop for sub-frame smooth playhead motion
      const updateProgress = () => {
        if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
          const chunkOffset = audioPlayerRef.current.currentTime;
          const currentTotalTime = targetChunk.startTime + chunkOffset;
          setCurrentTime(currentTotalTime);
          animFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateProgress);
    },
    [chunkTimelineData, stopTimelinePlayback]
  );

  // Master Final Audio Playback
  const playMasterAudio = useCallback(
    (startTimeSecs = 0) => {
      if (!masterAudioBase64) return;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audio = new Audio(`data:audio/wav;base64,${masterAudioBase64}`);
      audioPlayerRef.current = audio;

      audio.onloadedmetadata = () => {
        if (startTimeSecs > 0 && startTimeSecs < audio.duration) {
          audio.currentTime = startTimeSecs;
        }
        audio.play().catch(console.error);
      };

      audio.onended = () => {
        stopTimelinePlayback();
        setCurrentTime(0);
      };

      const updateProgress = () => {
        if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
          setCurrentTime(audioPlayerRef.current.currentTime);
          animFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateProgress);
    },
    [masterAudioBase64, stopTimelinePlayback]
  );

  // Toggle Transport Play / Pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopTimelinePlayback();
    } else {
      if (timelineView === 'final' && masterAudioBase64) {
        setIsPlaying(true);
        playMasterAudio(currentTime);
      } else if (chunkTimelineData.length > 0) {
        setIsPlaying(true);
        const targetIdx = chunkTimelineData.findIndex(
          (c) => currentTime >= c.startTime && currentTime < c.endTime
        );
        const startIdx = targetIdx >= 0 ? targetIdx : 0;
        const offset = targetIdx >= 0 ? currentTime - chunkTimelineData[targetIdx].startTime : 0;
        playChunkAtIndex(startIdx, offset);
      }
    }
  };

  const handleSkipNext = () => {
    if (chunkTimelineData.length === 0) return;
    const currentIdx = chunkTimelineData.findIndex(
      (c) => currentTime >= c.startTime && currentTime < c.endTime
    );
    const nextIdx = Math.min(chunkTimelineData.length - 1, (currentIdx >= 0 ? currentIdx : 0) + 1);
    const nextChunk = chunkTimelineData[nextIdx];
    setCurrentTime(nextChunk.startTime);
    if (isPlaying) {
      playChunkAtIndex(nextIdx, 0);
    }
  };

  const handleSkipPrev = () => {
    if (chunkTimelineData.length === 0) return;
    const currentIdx = chunkTimelineData.findIndex(
      (c) => currentTime >= c.startTime && currentTime < c.endTime
    );
    const prevIdx = Math.max(0, (currentIdx >= 0 ? currentIdx : 0) - 1);
    const prevChunk = chunkTimelineData[prevIdx];
    setCurrentTime(prevChunk.startTime);
    if (isPlaying) {
      playChunkAtIndex(prevIdx, 0);
    }
  };

  // Click on Timeline Track / Ruler to Seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalTimelineDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percent * totalTimelineDuration;
    setCurrentTime(seekTime);

    if (isPlaying) {
      if (timelineView === 'final' && masterAudioBase64) {
        playMasterAudio(seekTime);
      } else if (chunkTimelineData.length > 0) {
        const targetIdx = chunkTimelineData.findIndex(
          (c) => seekTime >= c.startTime && seekTime < c.endTime
        );
        if (targetIdx >= 0) {
          const offset = seekTime - chunkTimelineData[targetIdx].startTime;
          playChunkAtIndex(targetIdx, offset);
        }
      }
    }
  };

  // Drag & Drop Reordering handlers (Moving chunk left & right)
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedChunkIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedChunkIndex !== null && draggedChunkIndex !== targetIndex) {
      if (onReorderChunks) {
        onReorderChunks(draggedChunkIndex, targetIndex);
      }
    }
    setDraggedChunkIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedChunkIndex(null);
    setDragOverIndex(null);
  };

  // Manual Shift Left / Right
  const handleShiftChunk = (chunkId: string, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoveChunk) {
      onMoveChunk(chunkId, direction);
    }
  };

  const handleScrollLeft = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    return () => {
      stopTimelinePlayback();
    };
  }, [stopTimelinePlayback]);

  // Real-time Playhead position percentage
  const playheadPercent =
    totalTimelineDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / totalTimelineDuration) * 100))
      : 0;

  // Ruler tick markings
  const rulerTicks = React.useMemo(() => {
    const maxMins = Math.max(10, Math.ceil(totalTimelineDuration / 60));
    const intervalMins = maxMins > 60 ? 10 : maxMins > 20 ? 5 : 1;
    const ticks = [];
    for (let m = 0; m <= maxMins; m += intervalMins) {
      const hrs = Math.floor(m / 60);
      const mins = m % 60;
      if (hrs > 0) {
        ticks.push(`${hrs}:${mins.toString().padStart(2, '0')}:00`);
      } else {
        ticks.push(`${mins}:00`);
      }
    }
    return ticks;
  }, [totalTimelineDuration]);

  const blockScale = zoomLevel / 100;

  return (
    <div className="shrink-0 border-t border-slate-800/90 bg-[#090d18] flex flex-col z-30 select-none shadow-2xl">
      {/* 7. Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2 bg-[#0c101c]">
        {/* Left: Title & View Switch Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white font-mono text-[11px] font-bold shadow-xs">
              <Activity className="h-3 w-3" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              7. Audio Timeline
            </h3>
          </div>

          {/* Mode Switch Pills */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => {
                stopTimelinePlayback();
                setTimelineView('chunks');
              }}
              className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                timelineView === 'chunks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chunks View ({generatedChunks.length})
            </button>
            <button
              onClick={() => {
                stopTimelinePlayback();
                setTimelineView('final');
              }}
              className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                timelineView === 'final'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Final Audio View {masterAudioBase64 ? '✓' : ''}
            </button>
          </div>

          <span className="hidden xl:inline-block text-[11px] text-slate-500 font-mono">
            (Drag blocks or use ⇄ arrows to shift chunks left & right)
          </span>
        </div>

        {/* Center: Transport Player Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkipPrev}
            disabled={totalTimelineDuration === 0}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors disabled:opacity-40"
            title="Previous chunk"
          >
            <SkipBack className="h-3.5 w-3.5 fill-current" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={totalTimelineDuration === 0}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-950 hover:bg-slate-200 shadow-md transition-all active:scale-95 disabled:opacity-40"
            title={isPlaying ? 'Pause' : 'Play timeline audio in real-time'}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={handleSkipNext}
            disabled={totalTimelineDuration === 0}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors disabled:opacity-40"
            title="Next chunk"
          >
            <SkipForward className="h-3.5 w-3.5 fill-current" />
          </button>

          {/* Timecode display */}
          <div className="font-mono text-xs font-semibold text-sky-400 tabular-nums bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
            <span>{formatDawTime(currentTime)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-slate-400">{formatDawTime(totalTimelineDuration)}</span>
          </div>
        </div>

        {/* Right: Zoom, Fit, Waveform, Collapse */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {/* Zoom */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="font-mono text-[11px] text-slate-300 w-10 text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
              className="hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => setZoomLevel(100)}
            className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
          >
            Fit to Screen
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
          >
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
            {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Multitrack Canvas */}
      {!isCollapsed && (
        <div className="relative flex flex-col bg-[#070b14] overflow-hidden">
          {/* Timeline Ruler */}
          <div
            onClick={handleTimelineClick}
            className="h-6 flex items-center border-b border-slate-800/80 bg-[#090d18] pl-28 pr-4 text-[10px] font-mono text-slate-500 overflow-hidden cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              {rulerTicks.slice(0, 15).map((tick, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="h-1.5 w-px bg-slate-700 mb-0.5" />
                  <span>{tick}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Multitrack Track Row */}
          <div className="flex items-center relative h-18 bg-[#060a12] group">
            {/* Left Track Header: < VOICEOVER Eye Lock */}
            <div className="w-28 shrink-0 h-full bg-[#0a0e1c] border-r border-slate-800 flex items-center justify-between px-2.5 z-20 shadow-md">
              <div className="flex items-center gap-1">
                <ChevronLeft className="h-3 w-3 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-300 tracking-wider font-mono">
                  VOICEOVER
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Eye className="h-3 w-3 hover:text-slate-300 cursor-pointer" />
                <Lock className="h-3 w-3 hover:text-slate-300 cursor-pointer" />
              </div>
            </div>

            {/* Scrollable Track Blocks Area */}
            <div
              ref={timelineScrollRef}
              onClick={handleTimelineClick}
              className="flex-1 h-full relative flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 scrollbar-none cursor-pointer"
            >
              {timelineView === 'final' && masterAudioBase64 ? (
                /* Master Audio Track */
                <div className="flex-1 h-14 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-2 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2 text-white font-mono font-bold text-xs">
                    <Disc className="h-4 w-4 animate-spin" />
                    <span>MASTER STUDIO AUDIO TRACK</span>
                  </div>
                  <div className="flex items-center gap-0.5 h-6 w-1/2">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-white/70 rounded-full"
                        style={{ height: `${20 + ((i * 23) % 75)}%` }}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-xs text-white/90 font-bold">
                    {formatTime(masterDuration)}
                  </div>
                </div>
              ) : generatedChunks.length === 0 ? (
                /* Empty state */
                <div className="flex items-center justify-center w-full h-full text-xs text-slate-500 font-mono italic">
                  <span>
                    No generated audio tracks yet. Click "Generate Audio" or "Auto-Generate All" to populate the audio timeline.
                  </span>
                </div>
              ) : (
                /* Draggable Sequenced Chunk Blocks */
                chunkTimelineData.map((chunk, idx) => {
                  // Anchor color permanently to chunk's own identity/number
                  const colorIndex = ((chunk.index - 1) % CHUNK_COLORS.length + CHUNK_COLORS.length) % CHUNK_COLORS.length;
                  const colorClass = CHUNK_COLORS[colorIndex];
                  const isSelected = selectedBlockId === chunk.id;
                  const isCurrentlyPlaying =
                    isPlaying &&
                    currentTime >= chunk.startTime &&
                    currentTime < chunk.endTime;

                  const isBeingDragged = draggedChunkIndex === idx;
                  const isDropTarget = dragOverIndex === idx;
                  const calculatedWidth = Math.max(105, Math.min(230, (chunk.duration || 10) * 8 * blockScale));

                  return (
                    <div
                      key={chunk.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      style={{ width: `${calculatedWidth}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlockId(chunk.id);
                        setCurrentTime(chunk.startTime);
                        if (isPlaying) {
                          playChunkAtIndex(idx, 0);
                        }
                        if (onSelectChunk) onSelectChunk(chunk.id);
                        const el = document.getElementById(`chunk-card-${chunk.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`group/block relative shrink-0 h-14 rounded-lg border bg-gradient-to-r ${colorClass} p-1.5 flex flex-col justify-between shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing ${
                        isBeingDragged ? 'opacity-40 scale-95 border-dashed border-white' : ''
                      } ${
                        isDropTarget ? 'ring-4 ring-amber-400 scale-105 z-20' : ''
                      } ${
                        isCurrentlyPlaying
                          ? 'ring-2 ring-white scale-105 shadow-xl brightness-110'
                          : isSelected
                          ? 'ring-2 ring-sky-300'
                          : 'opacity-90 hover:opacity-100 hover:scale-[1.02]'
                      }`}
                      title={`Drag left/right to reorder or click to play`}
                    >
                      {/* Top Row: Chunk title & Shift arrows */}
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-white drop-shadow-sm">
                        <div className="flex items-center gap-1">
                          <GripHorizontal className="h-3 w-3 opacity-60 group-hover/block:opacity-100" />
                          <span>CHUNK {String(chunk.index).padStart(3, '0')}</span>
                        </div>

                        {/* Shift Left & Right Buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity bg-black/40 rounded px-1">
                          <button
                            disabled={idx === 0}
                            onClick={(e) => handleShiftChunk(chunk.id, 'left', e)}
                            className="p-0.5 hover:text-amber-300 disabled:opacity-20"
                            title="Shift Left (earlier)"
                          >
                            <ArrowLeft className="h-2.5 w-2.5" />
                          </button>
                          <button
                            disabled={idx === chunkTimelineData.length - 1}
                            onClick={(e) => handleShiftChunk(chunk.id, 'right', e)}
                            className="p-0.5 hover:text-amber-300 disabled:opacity-20"
                            title="Shift Right (later)"
                          >
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Waveform graphic bars permanently anchored to chunk index */}
                      <div className="flex items-center gap-0.5 h-3.5 w-full">
                        {Array.from({ length: Math.min(18, Math.floor(calculatedWidth / 7)) }).map((_, barI) => {
                          const h = 20 + (((barI * 17 + (chunk.index || 1) * 7) % 80) + 10);
                          return (
                            <div
                              key={barI}
                              className="flex-1 bg-white/70 rounded-full"
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>

                      {/* Bottom Time & Drag hint */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-white/90 drop-shadow-sm">
                        <span className="text-[8px] opacity-70">⇄ Drag</span>
                        <span>{formatTime(chunk.duration)}</span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Dynamic Synchronized Playhead Line with Live Position */}
              {totalTimelineDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-30 transition-none"
                  style={{ left: `${playheadPercent}%` }}
                >
                  {/* Floating Scrubber Time Badge */}
                  <div className="absolute -top-5 -translate-x-1/2 rounded bg-slate-900 border border-slate-700 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shadow-lg whitespace-nowrap">
                    {formatTime(currentTime)}
                  </div>
                </div>
              )}
            </div>

            {/* Left/Right Scroll Arrows */}
            <button
              onClick={handleScrollLeft}
              className="absolute left-30 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleScrollRight}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
