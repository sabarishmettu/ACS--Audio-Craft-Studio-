import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Disc,
  ArrowLeft,
  ArrowRight,
  GripHorizontal,
  Magnet,
  Maximize2,
} from 'lucide-react';
import { ScriptChunk } from '../types/tts';
import { formatTime } from '../utils/audioUtils';
import { stopAllSpeech, playSpeechUtterance, detectVoiceGender } from '../utils/localVoiceSynth';

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

  // NLE / DAW Track Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [trackVolume, setTrackVolume] = useState(1.0);
  const [snappingEnabled, setSnappingEnabled] = useState(true);

  // Playhead interactive dragging state
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const isDraggingPlayheadRef = useRef(false);
  const currentTimeRef = useRef(0);
  const liveScrubThrottleRef = useRef<number>(0);

  // Drag and drop chunk reordering state
  const [draggedChunkIndex, setDraggedChunkIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadedChunkIdRef = useRef<string | null>(null);
  const currentChunkIndexRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Keep refs synchronized
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isDraggingPlayheadRef.current = isDraggingPlayhead;
  }, [isDraggingPlayhead]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Show chunks that have been generated
  const generatedChunks = useMemo(
    () => chunks.filter((c) => c.status === 'generated' && !!c.audioBase64),
    [chunks]
  );

  // Calculate cumulative start and end timestamps for each generated chunk
  const chunkTimelineData = useMemo(() => {
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

  const blockScale = zoomLevel / 100;

  // Compute exact pixel positions and widths of each chunk block on the timeline
  const chunkLayoutMap = useMemo(() => {
    const PADDING_LEFT = 8;
    const GAP = 6;
    let currentLeft = PADDING_LEFT;

    return chunkTimelineData.map((chunk) => {
      const width = Math.max(105, Math.min(240, (chunk.duration || 10) * 8.5 * blockScale));
      const left = currentLeft;
      currentLeft += width + GAP;
      return {
        id: chunk.id,
        left,
        width,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
      };
    });
  }, [chunkTimelineData, blockScale]);

  // Calculate exact pixel position of the playhead (red line)
  const playheadPixelOffset = useMemo(() => {
    if (chunkLayoutMap.length === 0) return 8;

    const activeChunk = chunkLayoutMap.find(
      (c) => currentTime >= c.startTime && currentTime <= c.endTime
    );

    if (activeChunk) {
      const chunkSpan = Math.max(0.01, activeChunk.endTime - activeChunk.startTime);
      const progress = Math.max(0, Math.min(1, (currentTime - activeChunk.startTime) / chunkSpan));
      return activeChunk.left + progress * activeChunk.width;
    }

    if (currentTime <= 0) {
      return chunkLayoutMap[0]?.left ?? 8;
    }

    const lastChunk = chunkLayoutMap[chunkLayoutMap.length - 1];
    return (lastChunk?.left ?? 0) + (lastChunk?.width ?? 0);
  }, [currentTime, chunkLayoutMap]);

  // Robust finder to map any timestamp to the precise chunk and offset
  const findChunkForTime = useCallback(
    (timeSecs: number) => {
      if (chunkTimelineData.length === 0) return { idx: -1, chunk: null, offset: 0 };

      const clamped = Math.max(0, Math.min(totalGeneratedDuration, timeSecs));

      for (let i = 0; i < chunkTimelineData.length; i++) {
        const chunk = chunkTimelineData[i];
        if (
          clamped >= chunk.startTime &&
          (clamped < chunk.endTime || i === chunkTimelineData.length - 1)
        ) {
          return {
            idx: i,
            chunk,
            offset: Math.max(0, clamped - chunk.startTime),
          };
        }
      }

      return {
        idx: 0,
        chunk: chunkTimelineData[0],
        offset: 0,
      };
    },
    [chunkTimelineData, totalGeneratedDuration]
  );

  // Convert clientX coordinate into an exact timeline second
  const getTimeFromPixelX = useCallback(
    (clientX: number): number => {
      if (totalTimelineDuration <= 0) return 0;

      if (timelineView === 'final') {
        if (!timelineScrollRef.current) return 0;
        const rect = timelineScrollRef.current.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return progress * totalTimelineDuration;
      }

      if (!timelineScrollRef.current || chunkLayoutMap.length === 0) return 0;
      const rect = timelineScrollRef.current.getBoundingClientRect();
      const scrollLeft = timelineScrollRef.current.scrollLeft;
      const relativeX = clientX - rect.left + scrollLeft;

      const firstChunk = chunkLayoutMap[0];
      if (relativeX <= firstChunk.left) {
        return 0;
      }

      const lastChunk = chunkLayoutMap[chunkLayoutMap.length - 1];
      if (relativeX >= lastChunk.left + lastChunk.width) {
        return totalGeneratedDuration;
      }

      for (let i = 0; i < chunkLayoutMap.length; i++) {
        const chunk = chunkLayoutMap[i];
        if (relativeX >= chunk.left && relativeX <= chunk.left + chunk.width) {
          const chunkProgress = (relativeX - chunk.left) / chunk.width;
          let calculatedTime = chunk.startTime + chunkProgress * (chunk.endTime - chunk.startTime);

          if (snappingEnabled) {
            const SNAP_THRESHOLD_PX = 8;
            if (Math.abs(relativeX - chunk.left) <= SNAP_THRESHOLD_PX) {
              return chunk.startTime;
            }
            if (Math.abs(relativeX - (chunk.left + chunk.width)) <= SNAP_THRESHOLD_PX) {
              return chunk.endTime;
            }
          }

          return calculatedTime;
        }
        if (i < chunkLayoutMap.length - 1) {
          const nextChunk = chunkLayoutMap[i + 1];
          if (relativeX > chunk.left + chunk.width && relativeX < nextChunk.left) {
            return chunk.endTime;
          }
        }
      }

      return 0;
    },
    [totalTimelineDuration, timelineView, chunkLayoutMap, totalGeneratedDuration, snappingEnabled]
  );

  // Real-time synchronization when audio is played from an individual chunk card
  useEffect(() => {
    if (externalPlayingChunkId && !isPlaying && !isDraggingPlayheadRef.current) {
      const match = chunkTimelineData.find((c) => c.id === externalPlayingChunkId);
      if (match) {
        setSelectedBlockId(match.id);
        const liveTime = match.startTime + externalPlayingTime;
        setCurrentTime(liveTime);
        currentTimeRef.current = liveTime;
      }
    }
  }, [externalPlayingChunkId, externalPlayingTime, isPlaying, chunkTimelineData]);

  // Format Studio Timecode: HH:MM:SS.ms (DaVinci Resolve / CapCut standard)
  const formatStudioTimecode = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00:00.00';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Instant, rock-solid stop/pause of playback
  const stopTimelinePlayback = useCallback((resetTime = false) => {
    // 1. Immediately flag playback as stopped
    isPlayingRef.current = false;
    setIsPlaying(false);

    // 2. Cancel animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 3. Immediately pause active HTML5 Audio element
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
      } catch (e) {
        console.warn('Audio pause error:', e);
      }
    }

    // 4. Cancel any preloaded background audio
    if (preloadedAudioRef.current) {
      try {
        preloadedAudioRef.current.pause();
        preloadedAudioRef.current.src = '';
      } catch (e) {}
      preloadedAudioRef.current = null;
    }

    // 5. Cancel any Web Speech engine tasks
    stopAllSpeech();

    if (resetTime) {
      setCurrentTime(0);
      currentTimeRef.current = 0;
    }
  }, []);

  // Continuous animation loop ensuring playhead moves with zero lag
  const startProgressTracking = useCallback(
    (getLiveTime: () => number) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      const loop = () => {
        if (!isPlayingRef.current) return;

        if (!isDraggingPlayheadRef.current) {
          const live = getLiveTime();
          setCurrentTime(live);
          currentTimeRef.current = live;

          // Auto-scroll timeline container to keep playhead in view
          if (timelineScrollRef.current && timelineView === 'chunks') {
            const container = timelineScrollRef.current;
            const playheadPx = playheadPixelOffset;
            if (playheadPx > container.scrollLeft + container.clientWidth - 120) {
              container.scrollLeft = playheadPx - 120;
            } else if (playheadPx < container.scrollLeft + 60 && container.scrollLeft > 0) {
              container.scrollLeft = Math.max(0, playheadPx - 60);
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    },
    [timelineView, playheadPixelOffset]
  );

  // Play audio sequentially starting at chunk index with exact millisecond offset
  const playChunkAtIndex = useCallback(
    (idx: number, offsetSecs = 0) => {
      if (!isPlayingRef.current) return;

      if (idx >= chunkTimelineData.length || idx < 0) {
        stopTimelinePlayback(false);
        return;
      }

      currentChunkIndexRef.current = idx;
      const targetChunk = chunkTimelineData[idx];
      setSelectedBlockId(targetChunk.id);

      // Check if this chunk is Local Speech Synthesis
      const isLocal =
        targetChunk.selectedVoice?.includes('Local') ||
        targetChunk.selectedVoice?.includes('Web Synth') ||
        targetChunk.selectedVoice?.includes('Offline');

      if (isLocal) {
        // Stop any prior speech and pause HTML5 audio
        stopAllSpeech();
        if (audioPlayerRef.current) {
          try {
            audioPlayerRef.current.pause();
          } catch (e) {}
        }

        let spokenText = targetChunk.text;
        const chunkDur = targetChunk.duration || 5;
        if (offsetSecs > 0) {
          const words = targetChunk.text.split(/\s+/).filter(Boolean);
          const progress = Math.min(0.95, Math.max(0, offsetSecs / chunkDur));
          const startWordIdx = Math.floor(words.length * progress);
          spokenText = words.slice(startWordIdx).join(' ');
        }

        const startLocalTimestamp = performance.now() - offsetSecs * 1000;
        const speed = targetChunk.speed || 1.0;
        const pitch = 1.0 + (targetChunk.pitch || 0) / 10;
        const gender = detectVoiceGender(targetChunk.selectedVoice);

        playSpeechUtterance(
          spokenText,
          gender,
          speed,
          pitch,
          () => {
            // ONLY advance if still playing!
            if (!isPlayingRef.current) return;
            if (currentChunkIndexRef.current === idx) {
              if (idx + 1 < chunkTimelineData.length) {
                const nextChunk = chunkTimelineData[idx + 1];
                setCurrentTime(nextChunk.startTime);
                currentTimeRef.current = nextChunk.startTime;
                playChunkAtIndex(idx + 1, 0);
              } else {
                stopTimelinePlayback(false);
              }
            }
          },
          targetChunk.selectedVoice
        );

        const getLiveLocalTime = () => {
          const elapsed = (performance.now() - startLocalTimestamp) / 1000;
          return targetChunk.startTime + Math.min(chunkDur, Math.max(0, elapsed));
        };

        startProgressTracking(getLiveLocalTime);
        return;
      }

      // Cloud / Gemini TTS Audio via HTML5 Audio element
      stopAllSpeech();

      // Preload next chunk audio buffer in the background for gapless handoff
      if (idx + 1 < chunkTimelineData.length) {
        const nextChunk = chunkTimelineData[idx + 1];
        if (nextChunk.audioBase64) {
          const preloadSrc =
            nextChunk.audioUrl ||
            (nextChunk.audioBase64.startsWith('data:')
              ? nextChunk.audioBase64
              : `data:audio/wav;base64,${nextChunk.audioBase64}`);
          const preload = new Audio(preloadSrc);
          preload.preload = 'auto';
          preloadedAudioRef.current = preload;
        }
      }

      const audioSrc =
        targetChunk.audioUrl ||
        (targetChunk.audioBase64?.startsWith('data:')
          ? targetChunk.audioBase64
          : `data:audio/wav;base64,${targetChunk.audioBase64}`);

      let audio: HTMLAudioElement;
      if (
        audioPlayerRef.current &&
        loadedChunkIdRef.current === targetChunk.id &&
        targetChunk.audioBase64
      ) {
        audio = audioPlayerRef.current;
        if (offsetSecs >= 0 && Math.abs((audio.currentTime || 0) - offsetSecs) > 0.05) {
          try {
            audio.currentTime = offsetSecs;
          } catch (e) {}
        }
      } else {
        if (audioPlayerRef.current) {
          try {
            audioPlayerRef.current.pause();
          } catch (e) {}
        }
        audio = new Audio(audioSrc);
        audioPlayerRef.current = audio;
        loadedChunkIdRef.current = targetChunk.id;

        const applyOffset = () => {
          if (offsetSecs > 0) {
            try {
              audio.currentTime = offsetSecs;
            } catch (e) {}
          }
        };

        applyOffset();
        audio.addEventListener('loadedmetadata', applyOffset);
        audio.addEventListener('canplay', applyOffset);

        audio.addEventListener('timeupdate', () => {
          if (audioPlayerRef.current && !isDraggingPlayheadRef.current && isPlayingRef.current) {
            const chunkOffset = audioPlayerRef.current.currentTime || 0;
            const live = targetChunk.startTime + chunkOffset;
            setCurrentTime(live);
            currentTimeRef.current = live;
          }
        });

        audio.addEventListener('ended', () => {
          if (!isPlayingRef.current) return;
          if (currentChunkIndexRef.current === idx) {
            if (idx + 1 < chunkTimelineData.length) {
              const nextChunk = chunkTimelineData[idx + 1];
              setCurrentTime(nextChunk.startTime);
              currentTimeRef.current = nextChunk.startTime;
              playChunkAtIndex(idx + 1, 0);
            } else {
              stopTimelinePlayback(false);
            }
          }
        });
      }

      audio.muted = isMuted;
      audio.volume = trackVolume;

      if (offsetSecs > 0) {
        try {
          audio.currentTime = offsetSecs;
        } catch (e) {}
      }

      const getLiveCurrentTime = () => {
        if (!audioPlayerRef.current) return targetChunk.startTime;
        const chunkOffset = audioPlayerRef.current.currentTime || 0;
        return targetChunk.startTime + chunkOffset;
      };

      const handleStart = () => {
        if (!isPlayingRef.current) {
          try {
            audio.pause();
          } catch (e) {}
          return;
        }
        startProgressTracking(getLiveCurrentTime);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            handleStart();
          })
          .catch((err) => {
            if (!isPlayingRef.current) return;
            console.warn('Playback started with fallback:', err);
            handleStart();
          });
      }
    },
    [chunkTimelineData, stopTimelinePlayback, startProgressTracking, isMuted, trackVolume]
  );

  // Master Final Audio Playback
  const playMasterAudio = useCallback(
    (startTimeSecs = 0) => {
      if (!isPlayingRef.current) return;
      if (!masterAudioBase64) return;

      const audioSrc = masterAudioBase64.startsWith('data:')
        ? masterAudioBase64
        : `data:audio/wav;base64,${masterAudioBase64}`;

      let audio: HTMLAudioElement;
      if (audioPlayerRef.current && loadedChunkIdRef.current === 'master') {
        audio = audioPlayerRef.current;
        if (startTimeSecs >= 0 && Math.abs((audio.currentTime || 0) - startTimeSecs) > 0.05) {
          try {
            audio.currentTime = startTimeSecs;
          } catch (e) {}
        }
      } else {
        if (audioPlayerRef.current) {
          try {
            audioPlayerRef.current.pause();
          } catch (e) {}
        }
        audio = new Audio(audioSrc);
        audioPlayerRef.current = audio;
        loadedChunkIdRef.current = 'master';

        const applyMasterOffset = () => {
          if (startTimeSecs > 0) {
            try {
              audio.currentTime = startTimeSecs;
            } catch (e) {}
          }
        };

        applyMasterOffset();
        audio.addEventListener('loadedmetadata', applyMasterOffset);
        audio.addEventListener('canplay', applyMasterOffset);

        audio.addEventListener('timeupdate', () => {
          if (audioPlayerRef.current && !isDraggingPlayheadRef.current && isPlayingRef.current) {
            const live = audioPlayerRef.current.currentTime;
            setCurrentTime(live);
            currentTimeRef.current = live;
          }
        });

        audio.addEventListener('ended', () => {
          stopTimelinePlayback(false);
        });
      }

      audio.muted = isMuted;
      audio.volume = trackVolume;

      if (startTimeSecs > 0) {
        try {
          audio.currentTime = startTimeSecs;
        } catch (e) {}
      }

      const getLiveMasterTime = () => {
        return audioPlayerRef.current ? audioPlayerRef.current.currentTime : startTimeSecs;
      };

      const handleMasterStart = () => {
        if (!isPlayingRef.current) {
          try {
            audio.pause();
          } catch (e) {}
          return;
        }
        startProgressTracking(getLiveMasterTime);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            handleMasterStart();
          })
          .catch((err) => {
            if (!isPlayingRef.current) return;
            console.warn('Master audio play warning:', err);
            handleMasterStart();
          });
      }
    },
    [masterAudioBase64, stopTimelinePlayback, startProgressTracking, isMuted, trackVolume]
  );

  // Seek audio and playhead to specific second
  const seekToTime = useCallback(
    (seekTime: number, shouldContinuePlaying = isPlayingRef.current) => {
      const clampedTime = Math.max(0, Math.min(totalTimelineDuration, seekTime));
      setCurrentTime(clampedTime);
      currentTimeRef.current = clampedTime;

      if (shouldContinuePlaying && isPlayingRef.current) {
        if (timelineView === 'final' && masterAudioBase64) {
          playMasterAudio(clampedTime);
        } else if (chunkTimelineData.length > 0) {
          const { idx, offset } = findChunkForTime(clampedTime);
          if (idx >= 0) {
            playChunkAtIndex(idx, offset);
          }
        }
      } else {
        // Paused seeking: adjust internal position without playing
        if (timelineView === 'final') {
          if (audioPlayerRef.current && loadedChunkIdRef.current === 'master') {
            try {
              audioPlayerRef.current.currentTime = clampedTime;
            } catch (e) {}
          }
        } else {
          const { idx, chunk, offset } = findChunkForTime(clampedTime);
          if (chunk) {
            setSelectedBlockId(chunk.id);
            currentChunkIndexRef.current = idx;
            if (audioPlayerRef.current && loadedChunkIdRef.current === chunk.id) {
              try {
                audioPlayerRef.current.currentTime = offset;
              } catch (e) {}
            }
          }
        }
      }
    },
    [
      totalTimelineDuration,
      timelineView,
      masterAudioBase64,
      chunkTimelineData,
      findChunkForTime,
      playMasterAudio,
      playChunkAtIndex,
    ]
  );

  // Live Audio Scrubbing Engine: synchronously updates position
  const handleLiveScrub = useCallback(
    (newTime: number) => {
      const clamped = Math.max(0, Math.min(totalTimelineDuration, newTime));
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;

      if (!isPlayingRef.current) {
        if (timelineView === 'final') {
          if (audioPlayerRef.current && loadedChunkIdRef.current === 'master') {
            try {
              audioPlayerRef.current.currentTime = clamped;
            } catch (e) {}
          }
        } else {
          const { idx, chunk, offset } = findChunkForTime(clamped);
          if (chunk) {
            setSelectedBlockId(chunk.id);
            currentChunkIndexRef.current = idx;
            if (audioPlayerRef.current && loadedChunkIdRef.current === chunk.id) {
              try {
                audioPlayerRef.current.currentTime = offset;
              } catch (e) {}
            }
          }
        }
        return;
      }

      const now = performance.now();
      if (now - liveScrubThrottleRef.current < 40) {
        return;
      }
      liveScrubThrottleRef.current = now;

      if (timelineView === 'final' && masterAudioBase64) {
        if (audioPlayerRef.current && loadedChunkIdRef.current === 'master') {
          try {
            audioPlayerRef.current.currentTime = clamped;
          } catch (e) {}
        } else {
          playMasterAudio(clamped);
        }
      } else if (chunkTimelineData.length > 0) {
        const { idx, chunk, offset } = findChunkForTime(clamped);
        if (chunk) {
          if (loadedChunkIdRef.current === chunk.id && audioPlayerRef.current) {
            try {
              audioPlayerRef.current.currentTime = offset;
            } catch (e) {}
          } else {
            playChunkAtIndex(idx, offset);
          }
        }
      }
    },
    [
      totalTimelineDuration,
      timelineView,
      masterAudioBase64,
      chunkTimelineData,
      findChunkForTime,
      playMasterAudio,
      playChunkAtIndex,
    ]
  );

  // Global window listeners for playhead drag scrubbing
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingPlayheadRef.current) return;
      e.preventDefault();
      const newTime = getTimeFromPixelX(e.clientX);
      handleLiveScrub(newTime);
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (!isDraggingPlayheadRef.current) return;
      isDraggingPlayheadRef.current = false;
      setIsDraggingPlayhead(false);

      const finalTime = getTimeFromPixelX(e.clientX);
      seekToTime(finalTime, isPlayingRef.current);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isDraggingPlayheadRef.current || e.touches.length === 0) return;
      const touchX = e.touches[0].clientX;
      const newTime = getTimeFromPixelX(touchX);
      handleLiveScrub(newTime);
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (!isDraggingPlayheadRef.current) return;
      isDraggingPlayheadRef.current = false;
      setIsDraggingPlayhead(false);

      const touchX = e.changedTouches[0]?.clientX || 0;
      const finalTime = getTimeFromPixelX(touchX);
      seekToTime(finalTime, isPlayingRef.current);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [getTimeFromPixelX, handleLiveScrub, seekToTime]);

  // Start playhead dragging directly from the red handle
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    isDraggingPlayheadRef.current = true;
    const clickTime = getTimeFromPixelX(e.clientX);
    handleLiveScrub(clickTime);
  };

  const handlePlayheadTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    isDraggingPlayheadRef.current = true;
    const clickTime = getTimeFromPixelX(e.touches[0].clientX);
    handleLiveScrub(clickTime);
  };

  // Ruler Scrubbing (Click & Drag ruler to scrub)
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
    isDraggingPlayheadRef.current = true;
    const scrubTime = getTimeFromPixelX(e.clientX);
    handleLiveScrub(scrubTime);
  };

  // Toggle Transport Play / Pause
  const handleTogglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      stopTimelinePlayback(false);
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;

      const targetTime = currentTimeRef.current;

      if (timelineView === 'final' && masterAudioBase64) {
        playMasterAudio(targetTime);
      } else if (chunkTimelineData.length > 0) {
        const { idx, offset } = findChunkForTime(targetTime);
        if (idx >= 0) {
          playChunkAtIndex(idx, offset);
        }
      }
    }
  }, [timelineView, masterAudioBase64, chunkTimelineData, findChunkForTime, playMasterAudio, playChunkAtIndex, stopTimelinePlayback]);

  const handleSkipNext = () => {
    if (chunkTimelineData.length === 0) return;
    const { idx } = findChunkForTime(currentTimeRef.current);
    const nextIdx = Math.min(chunkTimelineData.length - 1, (idx >= 0 ? idx : 0) + 1);
    const nextChunk = chunkTimelineData[nextIdx];
    seekToTime(nextChunk.startTime, isPlayingRef.current);
  };

  const handleSkipPrev = () => {
    if (chunkTimelineData.length === 0) return;
    const { idx } = findChunkForTime(currentTimeRef.current);
    const prevIdx = Math.max(0, (idx >= 0 ? idx : 0) - 1);
    const prevChunk = chunkTimelineData[prevIdx];
    seekToTime(prevChunk.startTime, isPlayingRef.current);
  };

  // Professional NLE / DAW Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seekToTime(Math.max(0, currentTimeRef.current - delta), isPlayingRef.current);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        seekToTime(Math.min(totalTimelineDuration, currentTimeRef.current + delta), isPlayingRef.current);
      } else if (e.code === 'Home') {
        e.preventDefault();
        seekToTime(0, isPlayingRef.current);
      } else if (e.code === 'End') {
        e.preventDefault();
        seekToTime(totalTimelineDuration, isPlayingRef.current);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        setSnappingEnabled((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalTimelineDuration, handleTogglePlay, seekToTime]);

  // Sync volume / mute to active audio element
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.muted = isMuted;
      audioPlayerRef.current.volume = trackVolume;
    }
  }, [isMuted, trackVolume]);

  // Drag & Drop Reordering handlers for blocks
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (isDraggingPlayhead || isLocked) return;
    setDraggedChunkIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    if (isLocked) return;
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
    if (isLocked) return;
    if (onMoveChunk) {
      onMoveChunk(chunkId, direction);
    }
  };

  const handleScrollLeft = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Ensure stop on unmount
  useEffect(() => {
    return () => {
      stopTimelinePlayback(false);
    };
  }, [stopTimelinePlayback]);

  // Master Final Audio View Percent
  const masterPercent =
    masterDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / masterDuration) * 100))
      : 0;

  // Studio Ruler tick markings
  const rulerTicks = useMemo(() => {
    const maxSecs = Math.max(60, Math.ceil(totalTimelineDuration));
    const step = maxSecs > 300 ? 30 : maxSecs > 120 ? 15 : maxSecs > 30 ? 5 : 2;
    const ticks = [];
    for (let s = 0; s <= maxSecs; s += step) {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      ticks.push(`${mins}:${secs.toString().padStart(2, '0')}`);
    }
    return ticks;
  }, [totalTimelineDuration]);

  return (
    <div
      className={`shrink-0 border-t border-slate-800/90 bg-[#090d18] flex flex-col z-30 select-none shadow-2xl ${
        isDraggingPlayhead ? 'cursor-ew-resize' : ''
      }`}
    >
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2 bg-[#0c101c]">
        {/* Left: Title, View Switcher & Snap Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-mono text-[11px] font-bold shadow-xs">
              <Activity className="h-3 w-3" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-['Syne',sans-serif]">
              7. Audio Timeline (Studio DAW)
            </h3>
          </div>

          {/* Mode Switch Pills */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => {
                stopTimelinePlayback(false);
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
                stopTimelinePlayback(false);
                setTimelineView('final');
              }}
              className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                timelineView === 'final'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Master Audio View {masterAudioBase64 ? '✓' : ''}
            </button>
          </div>

          {/* Magnetic Snapping Indicator */}
          <button
            onClick={() => setSnappingEnabled(!snappingEnabled)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono transition-colors ${
              snappingEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle Magnetic Snapping (Shortcut: S)"
          >
            <Magnet className="h-3 w-3" />
            <span>Snap {snappingEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Center: Transport Controls & Studio Timecode */}
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
            className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-all active:scale-95 disabled:opacity-40 ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-white text-slate-950 hover:bg-slate-200'
            }`}
            title={isPlaying ? 'Pause (Space)' : 'Play timeline audio (Space)'}
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

          {/* Studio Master Timecode Display */}
          <div
            className={`font-mono text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md border transition-colors ${
              isDraggingPlayhead
                ? 'bg-red-950/90 text-red-300 border-red-500 shadow-sm'
                : isPlaying
                ? 'bg-blue-950/80 text-sky-300 border-blue-600/60 shadow-xs'
                : 'bg-slate-950 text-slate-300 border-slate-800'
            }`}
          >
            <span>{formatStudioTimecode(currentTime)}</span>
            <span className="text-slate-600 mx-1.5">/</span>
            <span className="text-slate-400">{formatStudioTimecode(totalTimelineDuration)}</span>
          </div>
        </div>

        {/* Right: Track Volume, Zoom & Collapse */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          {/* Mute & Track Master Volume */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`hover:text-white ${isMuted ? 'text-rose-400' : 'text-slate-300'}`}
              title={isMuted ? 'Unmute track (M)' : 'Mute track (M)'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : trackVolume}
              onChange={(e) => {
                setTrackVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-14 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title="Track Volume"
            />
          </div>

          {/* Zoom Level */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="font-mono text-[11px] text-slate-300 w-9 text-center">
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
            className="flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
            title="Reset Zoom to 100%"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Fit</span>
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

      {/* Multitrack Studio Canvas */}
      {!isCollapsed && (
        <div className="relative flex flex-col bg-[#070b14] overflow-hidden">
          {/* Studio Timeline Time Ruler */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-6 flex items-center border-b border-slate-800/80 bg-[#090d18] pl-32 pr-4 text-[10px] font-mono text-slate-500 overflow-hidden cursor-ew-resize hover:bg-[#0e1424] transition-colors relative select-none"
            title="Click or drag ruler to scrub audio playhead live"
          >
            <div className="flex items-center justify-between w-full pointer-events-none">
              {rulerTicks.slice(0, 18).map((tick, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="h-1.5 w-px bg-slate-700 mb-0.5" />
                  <span>{tick}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Multitrack Audio Row */}
          <div className="flex items-center relative h-20 bg-[#060a12] group">
            {/* Left Track Header: A1 • VOICEOVER */}
            <div className="w-32 shrink-0 h-full bg-[#0a0e1c] border-r border-slate-800 flex flex-col justify-between p-2 z-20 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-600 text-white font-mono">
                    A1
                  </span>
                  <span className="text-[10px] font-bold text-slate-200 tracking-wider font-mono">
                    VOICEOVER
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <button
                    onClick={() => setIsLocked(!isLocked)}
                    className={`hover:text-slate-300 ${isLocked ? 'text-amber-400' : ''}`}
                    title={isLocked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Track Status & Solo/Mute */}
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span className="text-[9px] text-slate-500">Stereo 44.1k</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`px-1 rounded text-[9px] font-bold ${
                      isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    M
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Track Blocks Area */}
            <div
              ref={timelineScrollRef}
              className="flex-1 h-full relative flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 scrollbar-none"
            >
              {timelineView === 'final' && masterAudioBase64 ? (
                /* Master Audio Track */
                <div className="flex-1 h-16 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-2 flex items-center justify-between shadow-lg relative overflow-hidden">
                  <div className="flex items-center gap-2 text-white font-mono font-bold text-xs z-10">
                    <Disc className={`h-4 w-4 ${isPlaying ? 'animate-spin' : ''}`} />
                    <span>MASTER STUDIO AUDIO TRACK</span>
                  </div>
                  <div className="flex items-center gap-0.5 h-7 w-1/2 z-10">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-white/70 rounded-full"
                        style={{ height: `${20 + ((i * 23) % 75)}%` }}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-xs text-white/90 font-bold z-10">
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
                  const colorIndex =
                    ((chunk.index - 1) % CHUNK_COLORS.length + CHUNK_COLORS.length) %
                    CHUNK_COLORS.length;
                  const colorClass = CHUNK_COLORS[colorIndex];
                  const isSelected = selectedBlockId === chunk.id;
                  const isCurrentlyPlaying =
                    isPlaying && currentTime >= chunk.startTime && currentTime < chunk.endTime;

                  const isBeingDragged = draggedChunkIndex === idx;
                  const isDropTarget = dragOverIndex === idx;
                  const layout = chunkLayoutMap[idx];
                  const calculatedWidth = layout ? layout.width : 120;

                  return (
                    <div
                      key={chunk.id}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      style={{ width: `${calculatedWidth}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlockId(chunk.id);
                        if (onSelectChunk) onSelectChunk(chunk.id);
                        const el = document.getElementById(`chunk-card-${chunk.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`group/block relative shrink-0 h-16 rounded-lg border bg-gradient-to-r ${colorClass} p-1.5 flex flex-col justify-between shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing ${
                        isBeingDragged ? 'opacity-40 scale-95 border-dashed border-white ring-2 ring-white' : ''
                      } ${
                        isDropTarget ? 'ring-4 ring-amber-400 scale-105 z-20' : ''
                      } ${
                        isCurrentlyPlaying
                          ? 'ring-2 ring-white scale-105 shadow-xl brightness-110'
                          : isSelected
                          ? 'ring-2 ring-sky-300'
                          : 'opacity-90 hover:opacity-100 hover:scale-[1.02]'
                      }`}
                      title="Drag to reorder clips (Ripple Edit)"
                    >
                      {/* Top Row: Chunk title & Shift arrows */}
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-white drop-shadow-sm">
                        <div className="flex items-center gap-1 pointer-events-none">
                          <GripHorizontal className="h-3.5 w-3.5 opacity-80 group-hover/block:opacity-100" />
                          <span>CHUNK {String(chunk.index).padStart(3, '0')}</span>
                        </div>

                        {/* Shift Left & Right Buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity bg-black/40 rounded px-1 z-10">
                          <button
                            disabled={idx === 0 || isLocked}
                            onClick={(e) => handleShiftChunk(chunk.id, 'left', e)}
                            className="p-0.5 hover:text-amber-300 disabled:opacity-20"
                            title="Shift Left (earlier)"
                          >
                            <ArrowLeft className="h-2.5 w-2.5" />
                          </button>
                          <button
                            disabled={idx === chunkTimelineData.length - 1 || isLocked}
                            onClick={(e) => handleShiftChunk(chunk.id, 'right', e)}
                            className="p-0.5 hover:text-amber-300 disabled:opacity-20"
                            title="Shift Right (later)"
                          >
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Waveform graphic bars */}
                      <div className="flex items-center gap-0.5 h-4 w-full pointer-events-none">
                        {Array.from({ length: Math.min(22, Math.floor(calculatedWidth / 6.5)) }).map(
                          (_, barI) => {
                            const h = 25 + (((barI * 17 + (chunk.index || 1) * 7) % 75) + 10);
                            return (
                              <div
                                key={barI}
                                className="flex-1 bg-white/75 rounded-full"
                                style={{ height: `${h}%` }}
                              />
                            );
                          }
                        )}
                      </div>

                      {/* Bottom Time & Drag hint */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-white/90 drop-shadow-sm pointer-events-none">
                        <span className="text-[8px] opacity-80 font-medium">⇄ Drag Clip</span>
                        <span>{formatTime(chunk.duration)}</span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Dedicated Red Playhead Handle */}
              {totalTimelineDuration > 0 && (
                <div
                  onMouseDown={handlePlayheadMouseDown}
                  onTouchStart={handlePlayheadTouchStart}
                  className={`absolute top-0 bottom-0 z-40 cursor-grab active:cursor-grabbing select-none transition-shadow ${
                    isDraggingPlayhead ? 'scale-105 cursor-grabbing' : ''
                  }`}
                  style={{
                    left:
                      timelineView === 'final'
                        ? `${masterPercent}%`
                        : `${playheadPixelOffset}px`,
                    width: '28px',
                    marginLeft: '-14px',
                  }}
                  title="Grab and drag red handle to scrub audio"
                >
                  {/* Visual Red Line */}
                  <div
                    className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-red-500 pointer-events-none"
                    style={{
                      boxShadow: isDraggingPlayhead
                        ? '0 0 14px rgba(239, 68, 68, 1), 0 0 4px #ffffff'
                        : '0 0 8px rgba(239, 68, 68, 0.8)',
                    }}
                  />

                  {/* Top Red Handle Diamond / Grip */}
                  <div
                    className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rotate-45 border-2 border-white shadow-md transition-transform pointer-events-none ${
                      isDraggingPlayhead ? 'scale-125 bg-red-400' : 'hover:scale-110'
                    }`}
                  />

                  {/* Floating Time Scrubber Pill */}
                  <div
                    className={`absolute -top-7 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shadow-xl whitespace-nowrap transition-all pointer-events-none ${
                      isDraggingPlayhead
                        ? 'bg-red-500 border-2 border-white scale-110 shadow-red-500/50'
                        : isPlaying
                        ? 'bg-blue-600 border border-blue-400'
                        : 'bg-red-600 border border-red-400'
                    }`}
                  >
                    {formatStudioTimecode(currentTime)}
                  </div>
                </div>
              )}
            </div>

            {/* Left/Right Scroll Arrows */}
            <button
              onClick={handleScrollLeft}
              className="absolute left-34 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-colors"
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
