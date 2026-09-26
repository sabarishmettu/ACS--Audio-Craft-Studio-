import JSZip from 'jszip';
import { ScriptChunk } from '../types/tts';

export const DEFAULT_VOICES = [
  { id: 'Aster', name: 'Aster (Female - Natural Narrator)', gender: 'Female' as const, description: 'Natural, expressive narrator with nuanced storytelling cadence', tags: ['Female', 'Natural', 'Manhwa'] },
  { id: 'Kore', name: 'Kore (Female - Warm & Articulate)', gender: 'Female' as const, description: 'Warm, clear, articulate, and natural for narration & storytelling', tags: ['Female', 'Warm', 'Storytelling'] },
  { id: 'Puck', name: 'Puck (Male - Energetic & Modern)', gender: 'Male' as const, description: 'Energetic, expressive, modern, great for podcasts & tech videos', tags: ['Male', 'Energetic', 'Podcast'] },
  { id: 'Charon', name: 'Charon (Male - Deep & Cinematic)', gender: 'Male' as const, description: 'Deep, authoritative, resonant, cinematic & documentary tone', tags: ['Male', 'Deep', 'Cinematic'] },
  { id: 'Fenrir', name: 'Fenrir (Male - Crisp Audiobook)', gender: 'Male' as const, description: 'Crisp, professional, calm, ideal for audiobooks & long reads', tags: ['Male', 'Crisp', 'Audiobook'] },
  { id: 'Zephyr', name: 'Zephyr (Female - Bright & Engaging)', gender: 'Female' as const, description: 'Bright, friendly, fast, engaging for tutorials & explanations', tags: ['Female', 'Bright', 'Tutorials'] },
  { id: 'Aoede', name: 'Aoede (Female - Melodic & Gentle)', gender: 'Female' as const, description: 'Melodic, soothing, gentle, ideal for meditation & literature', tags: ['Female', 'Melodic', 'Gentle'] },
];

export const AUDIO_TAG_PRESETS = [
  { tag: '[excited]', label: 'Excited', color: 'amber', description: 'Upbeat and enthusiastic pacing' },
  { tag: '[whispers]', label: 'Whisper', color: 'purple', description: 'Soft, intimate, low-volume delivery' },
  { tag: '[dramatic pause]', label: 'Dramatic Pause', color: 'rose', description: 'Subtle pause for tension' },
  { tag: '[serious]', label: 'Serious', color: 'blue', description: 'Authoritative, grave, and weighty' },
  { tag: '[warm]', label: 'Warm & Friendly', color: 'emerald', description: 'Welcoming and approachable tone' },
  { tag: '[thoughtful]', label: 'Thoughtful', color: 'indigo', description: 'Measured, contemplative pacing' },
  { tag: '<laugh>', label: 'Vocal Laugh', color: 'yellow', description: 'In-speech chuckling cadence' },
  { tag: '<breath>', label: 'Inhale Breath', color: 'cyan', description: 'Natural breathing punctuation' },
  { tag: '<gasp>', label: 'Gasp', color: 'orange', description: 'Surprise or realization burst' },
];

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationHuman(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export function downloadBase64Wav(base64Data: string, filename: string) {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.wav') ? filename : `${filename}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAllChunksZip(chunks: ScriptChunk[], projectName = 'audiocraft-studio-export') {
  const zip = new JSZip();
  const audioFolder = zip.folder('audio_chunks');
  const generatedChunks = chunks.filter(c => c.audioBase64);

  if (generatedChunks.length === 0) {
    throw new Error('No generated audio chunks available to export.');
  }

  // Add individual WAV files
  generatedChunks.forEach((chunk, i) => {
    const chunkName = `chunk_${String(chunk.index || i + 1).padStart(3, '0')}_${chunk.selectedVoice || 'voice'}.wav`;
    audioFolder?.file(chunkName, chunk.audioBase64!, { base64: true });
  });

  // Add transcript metadata
  const metadata = {
    exportedAt: new Date().toISOString(),
    totalChunks: generatedChunks.length,
    totalDurationSeconds: generatedChunks.reduce((sum, c) => sum + (c.duration || 0), 0),
    chunks: generatedChunks.map(c => ({
      index: c.index,
      text: c.text,
      duration: c.duration,
      voice: c.selectedVoice,
    })),
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  zip.file('full_transcript.txt', chunks.map(c => `[Chunk ${c.index}]\n${c.text}\n`).join('\n'));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}_stems.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Starter template script for instant demo testing
export const SAMPLE_SCRIPTS = [
  {
    title: 'Shadow Monarch: Ascension of the Awakened (Starter Template)',
    genre: 'Manhwa / Action Anime Recap',
    recommendedVoice: 'Aster',
    style: 'Dramatic YouTube manhwa recap narrator. Natural, confident, and conversational.',
    text: `[excited] Deep inside the dual dungeon of the S-Rank catacombs, Hunter Kai stood breathless before the towering obsidian throne.

[serious] The stone colossus raised its greatsword, crushing the temple floor with earth-shattering force. [dramatic pause] Every survivor from the raid squad had collapsed into unconsciousness.

[whispers] "Is this where my journey ends?" Kai muttered under his breath, his daggers shaking with exhaustion.

[excited] But suddenly, <breath> a glowing crimson system window materialized before his eyes:
[Notification: Quest 'Survive the Monarch Trial' Completed. Secret Class 'Shadow Monarch' is now unlocked.]

[warm] A surge of ancient dark mana surged through his veins. Kai looked up with a calm smile.
[excited] "Arise," he commanded into the void.

The shadows beneath the fallen beasts stirred to life. The whispers of primordial monarchs echoed across the realm:
[whispers] "Rise, Kai. Your ascension has only just begun."`,
  },
];
