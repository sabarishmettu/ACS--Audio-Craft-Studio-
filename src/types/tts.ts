export interface VoiceOption {
  id: string;
  name: string;
  voiceName?: string;
  gender: 'Female' | 'Male';
  description: string;
  tags: string[];
  isCustom?: boolean;
  sampleAudioUrl?: string;
  customPrompt?: string;
  baseVoice?: string;
}

export type ChunkStatus = 'not_generated' | 'generating' | 'generated' | 'failed';

export interface ScriptChunk {
  id: string;
  index: number;
  text: string;
  characterCount: number;
  wordCount: number;
  audioUrl: string | null;
  audioBase64: string | null;
  rawPcmBase64: string | null;
  duration: number; // in seconds
  status: ChunkStatus;
  progress?: number; // 0 - 100
  error: string | null;
  selectedVoice?: string;
  stylePrompt?: string;
  speed?: number;
  pitch?: number;
  selected?: boolean;
}

export interface MasterTrack {
  audioUrl: string | null;
  audioBase64: string | null;
  duration: number;
  totalSize: number;
  chunksMerged: number;
  generatedAt: number;
  status: 'merged' | 'idle' | 'merging';
}

export interface ProjectState {
  id: string;
  name: string;
  script: string;
  voice: string;
  language: string;
  style: string;
  speed: number;
  pitch: number;
  voicePrompt: string;
  chunkSize: string;
  maxCharacters: number;
  smartSplitting: boolean;
}
