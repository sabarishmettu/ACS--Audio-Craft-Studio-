import JSZip from 'jszip';
import { ScriptChunk, VoiceOption } from '../types/tts';

export const GEMINI_VOICES: VoiceOption[] = [
  { id: 'Aster', name: 'Aster (Female - Natural Narrator)', gender: 'Female' as const, description: 'Natural, expressive narrator with nuanced storytelling cadence', tags: ['Female', 'Natural', 'Manhwa'] },
  { id: 'Kore', name: 'Kore (Female - Warm & Articulate)', gender: 'Female' as const, description: 'Warm, clear, articulate, and natural for narration & storytelling', tags: ['Female', 'Warm', 'Storytelling'] },
  { id: 'Puck', name: 'Puck (Male - Energetic & Modern)', gender: 'Male' as const, description: 'Energetic, expressive, modern, great for podcasts & tech videos', tags: ['Male', 'Energetic', 'Podcast'] },
  { id: 'Charon', name: 'Charon (Male - Deep & Cinematic)', gender: 'Male' as const, description: 'Deep, authoritative, resonant, cinematic & documentary tone', tags: ['Male', 'Deep', 'Cinematic'] },
  { id: 'Fenrir', name: 'Fenrir (Male - Crisp Audiobook)', gender: 'Male' as const, description: 'Crisp, professional, calm, ideal for audiobooks & long reads', tags: ['Male', 'Crisp', 'Audiobook'] },
  { id: 'Zephyr', name: 'Zephyr (Female - Bright & Engaging)', gender: 'Female' as const, description: 'Bright, friendly, fast, engaging for tutorials & explanations', tags: ['Female', 'Bright', 'Tutorials'] },
  { id: 'Aoede', name: 'Aoede (Female - Melodic & Gentle)', gender: 'Female' as const, description: 'Melodic, soothing, gentle, ideal for meditation & literature', tags: ['Female', 'Melodic', 'Gentle'] },
];

export const VIBEVOICE_PROFILES: VoiceOption[] = [
  {
    id: 'en-Alice_woman',
    name: 'en-Alice_woman (English - Female / Woman)',
    gender: 'Female' as const,
    description: 'VibeVoice English expressive female persona with articulate storytelling and natural cadence',
    tags: ['VibeVoice', 'English', 'Woman', 'Expressive'],
  },
  {
    id: 'en-Carter_man',
    name: 'en-Carter_man (English - Male / Man)',
    gender: 'Male' as const,
    description: 'VibeVoice English dynamic male persona with confident pacing and versatile narration',
    tags: ['VibeVoice', 'English', 'Man', 'Dynamic'],
  },
  {
    id: 'en-Frank_man',
    name: 'en-Frank_man (English - Male / Man)',
    gender: 'Male' as const,
    description: 'VibeVoice English deep male voice with rich authoritative timbre and cinematic presence',
    tags: ['VibeVoice', 'English', 'Man', 'Deep / Cinematic'],
  },
  {
    id: 'en-Mary_woman_bgm',
    name: 'en-Mary_woman_bgm (English - Female / BGM Included)',
    gender: 'Female' as const,
    description: 'VibeVoice English female narrator with embedded background music atmospheric score',
    tags: ['VibeVoice', 'English', 'Woman', 'BGM Included'],
  },
  {
    id: 'en-Maya_woman',
    name: 'en-Maya_woman (English - Female / Woman)',
    gender: 'Female' as const,
    description: 'VibeVoice English warm, natural female narrator ideal for audiobooks and character dialogue',
    tags: ['VibeVoice', 'English', 'Woman', 'Warm Storyteller'],
  },
  {
    id: 'in-Samuel_man',
    name: 'in-Samuel_man (Indian English - Male / Man)',
    gender: 'Male' as const,
    description: 'VibeVoice Indian English male voice with clear articulation and authentic tone',
    tags: ['VibeVoice', 'Indian English', 'Man', 'Articulate'],
  },
  {
    id: 'zh-Anchen_man_bgm',
    name: 'zh-Anchen_man_bgm (Chinese - Male / BGM Included)',
    gender: 'Male' as const,
    description: 'VibeVoice Chinese dramatic male narrator with embedded background music orchestration',
    tags: ['VibeVoice', 'Chinese (zh)', 'Man', 'BGM Included'],
  },
  {
    id: 'zh-Bowen_man',
    name: 'zh-Bowen_man (Chinese - Male / Man)',
    gender: 'Male' as const,
    description: 'VibeVoice Chinese male narrator with crisp enunciation and engaging cadence',
    tags: ['VibeVoice', 'Chinese (zh)', 'Man', 'Crisp'],
  },
  {
    id: 'zh-Xinran_woman',
    name: 'zh-Xinran_woman (Chinese - Female / Woman)',
    gender: 'Female' as const,
    description: 'VibeVoice Chinese expressive female voice with gentle, melodic intonation',
    tags: ['VibeVoice', 'Chinese (zh)', 'Woman', 'Melodic'],
  },
];

export const DEFAULT_VOICES = GEMINI_VOICES;

export const SAMPLE_SCRIPTS = [
  {
    title: 'Shadow Monarch Ascension (Manhwa Recap)',
    genre: 'Manhwa / Action',
    style: 'Dramatic',
    recommendedVoice: 'en-Alice_woman',
    text: `Prologue
In the beginning, there was only darkness...
No light, no sound, no time — just an endless void where the laws of the world did not exist.

But from that void, a single will emerged.
A will that was never meant to be, yet a will that would change everything.

Chapter 1: The Boy Who Was Forgotten
The cold wind blew through the ruined village, carrying with it the scent of ash and blood.
Among the broken houses, a young boy lay on the ground, his body covered in wounds.
His name was Kai.
Once the heir of a proud family, now nothing more than a discarded existence.

He opened his eyes slowly, the pain in his chest sharper than ever.
"...So this is how it ends," he whispered.

Chapter 2: The Awakening of the Black Core
Deep within Kai's soul, an ancient sigil began to glow in violet radiance.
The whispers of primordial shadow monarchs echoed across the realm:
"Rise, Kai. Your ascension has only just begun."`,
  },
  {
    title: 'Cyberpunk 2099: Neo-Seoul Detective',
    genre: 'Sci-Fi / Thriller',
    style: 'Documentary',
    recommendedVoice: 'en-Frank_man',
    text: `Act 1: Rain on 4th Sector
Rain dripped from the rusted neon billboard above 4th Sector alleyway.
The synth-jack on the asphalt was already stone cold, cybernetic oculars flickering a dead crimson.

"Detective Vance, scan shows an unregistered military neural weave," the comms unit chimed.
Vance lit his cigarette, the flame reflecting off wet ferro-concrete.
"This wasn't a standard hit. Someone wanted his memories wiped before the upload."`,
  },
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
  const validChunks = chunks.filter((c) => c.status === 'generated' && c.audioBase64);

  if (validChunks.length === 0) {
    throw new Error('No generated audio chunks to download.');
  }

  validChunks.forEach((chunk) => {
    const binary = atob(chunk.audioBase64!);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const filename = `chunk_${String(chunk.index).padStart(3, '0')}.wav`;
    zip.file(filename, bytes);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}_all_chunks.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
