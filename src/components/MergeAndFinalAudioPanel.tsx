import React, { useState, useRef, useEffect } from 'react';
import {
  Merge,
  Archive,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  MoreHorizontal,
  Disc,
} from 'lucide-react';
import { MasterTrack } from '../types/tts';
import { formatTime, formatDurationHuman, downloadBase64Wav } from '../utils/audioUtils';

interface MergeAndFinalAudioPanelProps {
  masterTrack: MasterTrack | null;
  projectName?: string;
  onMergeAudio: () => void;
  onDownloadAllZip: () => void;
  isMerging: boolean;
  completedChunksCount: number;
}

export const MergeAndFinalAudioPanel: React.FC<MergeAndFinalAudioPanelProps> = ({
  masterTrack,
  projectName,
  onMergeAudio,
  onDownloadAllZip,
  isMerging,
  completedChunksCount,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [masterTrack?.audioBase64]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const hasMaster = masterTrack && masterTrack.audioBase64;
  const duration = masterTrack?.duration || 0;

  return (
    <div className="flex flex-col bg-[#0e1424] p-3.5 gap-3.5">
      {/* 5. Merge & Download Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600/30 text-indigo-400 font-mono text-[11px] font-bold">
            5
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Merge & Download
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onMergeAudio}
            disabled={isMerging || completedChunksCount === 0}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white py-2 px-2 text-xs font-semibold shadow-md shadow-indigo-950/40 transition-all disabled:opacity-40"
          >
            <Merge className={`h-3.5 w-3.5 ${isMerging ? 'animate-spin' : ''}`} />
            <span>{isMerging ? 'Merging Master...' : 'Merge All Audio'}</span>
          </button>

          <button
            onClick={onDownloadAllZip}
            disabled={completedChunksCount === 0}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 py-2 px-2 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Archive className="h-3.5 w-3.5 text-slate-400" />
            <span>Download All Chunks (ZIP)</span>
          </button>
        </div>
      </div>

      {/* 6. Final Audio Section */}
      <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600/30 text-emerald-400 font-mono text-[11px] font-bold">
              6
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Final Audio
            </h3>
          </div>

          {hasMaster && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                <span>Merged</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Duration: <span className="text-slate-200">{formatTime(duration)}</span>
              </span>
            </div>
          )}
        </div>

        {hasMaster ? (
          <div className="flex flex-col gap-2.5 rounded-xl bg-slate-950 border border-slate-800 p-2.5">
            <audio
              ref={audioRef}
              src={`data:audio/wav;base64,${masterTrack.audioBase64}`}
              preload="metadata"
            />

            {/* Waveform Player */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current translate-x-0.5" />
                )}
              </button>

              {/* Waveform Bar Graphic */}
              <div className="relative flex-1 flex items-center h-6 cursor-pointer">
                <div className="flex items-center gap-0.5 w-full h-5 px-1">
                  {Array.from({ length: 42 }).map((_, barIdx) => {
                    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                    const barProgress = (barIdx / 42) * 100;
                    const isPast = barProgress <= progress;
                    const height = 20 + (((barIdx * 29) % 70) + 10);
                    return (
                      <div
                        key={barIdx}
                        className="flex-1 rounded-full transition-all duration-75"
                        style={{
                          height: `${height}%`,
                          backgroundColor: isPast ? '#10b981' : '#334155',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Timecode */}
              <div className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-600 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Volume & Speed */}
              <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800">
                <Volume2 className="h-3 w-3 text-slate-400" />
                <select
                  value={playbackRate === 1 ? '1' : playbackRate === 2 ? '2' : String(playbackRate)}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-transparent text-[11px] font-mono text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="0.75" className="bg-slate-900">0.75x</option>
                  <option value="1" className="bg-slate-900">1.0x</option>
                  <option value="1.25" className="bg-slate-900">1.25x</option>
                  <option value="1.5" className="bg-slate-900">1.5x</option>
                  <option value="2" className="bg-slate-900">2.0x</option>
                </select>
              </div>
            </div>

            {/* Download Final Audio Green Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const cleanMasterName = (projectName && projectName.trim() && projectName !== 'Untitled Voice Project')
                    ? `${projectName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')}_final_master`
                    : 'audiocraft_studio_final_master';
                  downloadBase64Wav(
                    masterTrack.audioBase64!,
                    `${cleanMasterName}.wav`
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-xs font-bold shadow-md shadow-emerald-950/40 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Final Audio</span>
              </button>

              <button
                onClick={onDownloadAllZip}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="More export options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
            <Disc className="h-6 w-6 text-slate-600 mb-1.5" />
            <p>No master audio merged yet.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Click "Merge All Audio" after generating chunks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
