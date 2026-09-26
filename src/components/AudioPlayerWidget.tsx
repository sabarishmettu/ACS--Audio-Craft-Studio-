import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw } from 'lucide-react';
import { formatTime, downloadBase64Wav } from '../utils/audioUtils';

interface AudioPlayerWidgetProps {
  audioBase64: string;
  audioUrl?: string;
  duration?: number;
  filename?: string;
  compact?: boolean;
  accentColor?: string;
}

export const AudioPlayerWidget: React.FC<AudioPlayerWidgetProps> = ({
  audioBase64,
  duration = 0,
  filename = 'audio_chunk.wav',
  compact = false,
  accentColor = 'indigo',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const audioSrc = `data:audio/wav;base64,${audioBase64}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioBase64]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Generate deterministic faux waveform bars based on audio string
  const barsCount = compact ? 20 : 32;
  const waveformHeights = React.useMemo(() => {
    const heights = [];
    for (let i = 0; i < barsCount; i++) {
      const charCode = audioBase64.charCodeAt((i * 17) % audioBase64.length) || 50;
      const val = 20 + ((charCode * 3) % 70);
      heights.push(val);
    }
    return heights;
  }, [audioBase64, barsCount]);

  return (
    <div className={`flex flex-col gap-2 rounded-xl bg-slate-900/90 border border-slate-800 p-3 shadow-inner ${compact ? 'text-xs' : 'text-sm'}`}>
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Primary Row: Play Button, Waveform Scrubber, Time Display */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition-all duration-150"
          title={isPlaying ? 'Pause' : 'Play audio'}
          aria-label={isPlaying ? 'Pause' : 'Play audio'}
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current translate-x-0.5" />}
        </button>

        {/* Waveform Scrubber Visualizer */}
        <div className="relative flex-1 flex flex-col justify-center h-8 cursor-pointer group">
          {/* Waveform bars */}
          <div className="flex items-center gap-0.5 w-full h-6 px-1">
            {waveformHeights.map((h, i) => {
              const barProgress = (i / barsCount) * 100;
              const isPast = barProgress <= progressPercent;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${h}%`,
                    backgroundColor: isPast
                      ? '#6366f1' // indigo-500
                      : isPlaying && Math.abs(barProgress - progressPercent) < 6
                      ? '#a5b4fc' // bright cursor
                      : '#334155', // slate-700
                  }}
                />
              );
            })}
          </div>

          {/* Invisible Overlay Range Input for precise scrubbing */}
          <input
            type="range"
            min="0"
            max={totalDuration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="Seek audio"
          />
        </div>

        {/* Time Stamp */}
        <div className="shrink-0 font-mono text-xs text-slate-400 tabular-nums">
          <span className="text-slate-200">{formatTime(currentTime)}</span>
          <span className="text-slate-600"> / </span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Secondary Controls Row */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs text-slate-400">
        {/* Left: Speed selector & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="flex items-center gap-1 hover:text-slate-200 transition-colors"
            title="Restart playback"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="text-[11px]">Replay</span>
          </button>

          <span className="text-slate-700">·</span>

          {/* Speed Button */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition-colors"
            >
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-6 left-0 z-30 flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-2 py-0.5 text-left text-[11px] font-mono rounded hover:bg-indigo-600 hover:text-white transition-colors ${
                      playbackRate === rate ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Volume & Download Quick Action */}
        <div className="flex items-center gap-3">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="hover:text-slate-200 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Download WAV button */}
          <button
            onClick={() => downloadBase64Wav(audioBase64, filename)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition-colors"
            title="Download this audio piece (.wav)"
          >
            <Download className="h-3 w-3" />
            <span className="text-[11px] font-medium">WAV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
