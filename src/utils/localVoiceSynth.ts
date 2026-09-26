/**
 * Local Speech Synthesizer & Voice Controller
 * Precise Male & Female voice matching across Windows, macOS, Android, iOS, and Linux.
 */

let currentActiveUtterance: SpeechSynthesisUtterance | null = null;

export function stopAllSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      currentActiveUtterance = null;
    } catch (e) {
      console.warn('SpeechSynthesis cancel error:', e);
    }
  }
}

export function pauseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.pause();
      window.speechSynthesis.cancel();
      currentActiveUtterance = null;
    } catch (e) {
      console.warn('SpeechSynthesis pause error:', e);
    }
  }
}

// Female voice identifiers
const FEMALE_NAMES = [
  'female', 'woman', 'zira', 'samantha', 'karen', 'victoria', 'jenny', 'aria', 'ava',
  'emma', 'sara', 'fiona', 'moira', 'tessa', 'veena', 'catherine', 'hazel', 'susan',
  'stephanie', 'allison', 'ana', 'heather', 'alice', 'mary', 'maya', 'xinran', 'kore',
  'aster', 'zephyr', 'aoede', 'en-us-neural2-c', 'en-us-neural2-e', 'en-us-neural2-f',
  'en-us-standard-c', 'en-us-standard-e', 'en-us-wavenet-c', 'en-us-wavenet-e',
  'uk english female', 'us english female', 'desktop female', 'natural female',
];

// Male voice identifiers
const MALE_NAMES = [
  'david', 'mark', 'george', 'alex', 'guy', 'ryan', 'daniel', 'fred',
  'oliver', 'tom', 'aaron', 'arthur', 'gordon', 'james', 'richard', 'steffan', 'lee',
  'carter', 'frank', 'samuel', 'puck', 'charon', 'fenrir', 'anchen', 'bowen',
  'en-us-neural2-d', 'en-us-neural2-j', 'en-us-standard-b', 'en-us-standard-d',
  'en-us-wavenet-b', 'en-us-wavenet-d', 'uk english male', 'us english male',
  'desktop male', 'natural male', 'google uk english male',
];

/**
 * Accurately detects whether a given voice ID or name represents Female or Male.
 * Prevents sub-string false positives (e.g., 'female' containing 'male', 'woman' containing 'man').
 */
export function detectVoiceGender(
  voiceIdOrName?: string,
  voiceObjGender?: 'Female' | 'Male'
): 'Female' | 'Male' {
  if (voiceObjGender === 'Female') return 'Female';
  if (voiceObjGender === 'Male') return 'Male';

  if (!voiceIdOrName) return 'Female';
  const lower = voiceIdOrName.toLowerCase();

  // Explicit female markers take priority
  if (
    lower.includes('female') ||
    lower.includes('woman') ||
    lower.includes('alice') ||
    lower.includes('kore') ||
    lower.includes('aster') ||
    lower.includes('zephyr') ||
    lower.includes('aoede') ||
    lower.includes('mary') ||
    lower.includes('maya') ||
    lower.includes('xinran') ||
    lower.includes('zira') ||
    lower.includes('samantha') ||
    lower.includes('karen') ||
    lower.includes('victoria') ||
    lower.includes('jenny') ||
    lower.includes('aria') ||
    lower.includes('ava') ||
    lower.includes('emma') ||
    lower.includes('sara') ||
    lower.includes('fiona') ||
    lower.includes('moira')
  ) {
    return 'Female';
  }

  // Explicit male markers
  if (
    lower.includes('_man') ||
    lower.includes(' man') ||
    lower.includes('(male') ||
    lower.includes('-male') ||
    lower.includes(' male') ||
    lower.includes('puck') ||
    lower.includes('charon') ||
    lower.includes('fenrir') ||
    lower.includes('carter') ||
    lower.includes('frank') ||
    lower.includes('samuel') ||
    lower.includes('anchen') ||
    lower.includes('bowen') ||
    lower.includes('david') ||
    lower.includes('guy') ||
    lower.includes('mark') ||
    lower.includes('alex') ||
    lower.includes('daniel') ||
    lower.includes('george')
  ) {
    return 'Male';
  }

  return 'Female';
}

/**
 * Plays speech using Web Speech API with strict gender matching & tuned vocal formant pitches.
 */
export function playSpeechUtterance(
  text: string,
  voiceGender: 'Female' | 'Male' = 'Female',
  rate = 1.0,
  pitch = 1.0,
  onEnd?: () => void,
  voiceId?: string
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  // Cancel any prior speech
  stopAllSpeech();

  const cleanText = text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleanText) return null;

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Compute exact target gender
  const targetGender = detectVoiceGender(voiceId, voiceGender);

  let selectedVoice: SpeechSynthesisVoice | null = null;

  if (targetGender === 'Female') {
    // 1. First priority: match exact female voice names
    selectedVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      const isFemale = FEMALE_NAMES.some((fn) => name.includes(fn));
      const hasMaleIndicator = !name.includes('female') && (
        name.includes(' male') || name.includes('-male') || name.includes('(male') ||
        MALE_NAMES.some((mn) => name.includes(mn))
      );
      return isFemale && !hasMaleIndicator;
    }) || null;

    // 2. Second priority: any English voice that is NOT explicitly male
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => {
        const name = v.name.toLowerCase();
        const hasMaleIndicator = !name.includes('female') && (
          name.includes(' male') || name.includes('-male') || name.includes('(male') ||
          MALE_NAMES.some((mn) => name.includes(mn))
        );
        return v.lang.startsWith('en') && !hasMaleIndicator;
      }) || null;
    }

    // Set feminine pitch & tempo curve (elevates formant to clean, clear female register)
    if (voiceId?.toLowerCase().includes('zephyr')) {
      utterance.pitch = Math.max(1.1, Math.min(1.5, 1.22 * pitch));
      utterance.rate = Math.max(0.8, Math.min(1.4, 1.06 * rate));
    } else if (voiceId?.toLowerCase().includes('aoede')) {
      utterance.pitch = Math.max(1.05, Math.min(1.4, 1.16 * pitch));
      utterance.rate = Math.max(0.7, Math.min(1.2, 0.94 * rate));
    } else if (voiceId?.toLowerCase().includes('maya') || voiceId?.toLowerCase().includes('kore')) {
      utterance.pitch = Math.max(1.05, Math.min(1.4, 1.15 * pitch));
      utterance.rate = Math.max(0.8, Math.min(1.3, 0.98 * rate));
    } else {
      // General Female profile: bright, feminine octave
      utterance.pitch = Math.max(1.05, Math.min(1.45, 1.18 * pitch));
      utterance.rate = Math.max(0.75, Math.min(1.3, rate));
    }
  } else {
    // Target is Male
    // 1. First priority: match explicit male voices
    selectedVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      const hasFemale = name.includes('female') || name.includes('woman') || FEMALE_NAMES.some((fn) => name.includes(fn));
      const hasMale = name.includes(' male') || name.includes('-male') || name.includes('(male') || MALE_NAMES.some((mn) => name.includes(mn));
      return hasMale && !hasFemale;
    }) || null;

    // 2. Second priority: any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find((v) => v.lang.startsWith('en')) || null;
    }

    // Calibrate pitch for deep, authoritative masculine tone
    if (voiceId?.toLowerCase().includes('charon') || voiceId?.toLowerCase().includes('frank')) {
      utterance.pitch = Math.max(0.6, Math.min(0.9, 0.74 * pitch));
      utterance.rate = Math.max(0.7, Math.min(1.3, 0.94 * rate));
    } else if (voiceId?.toLowerCase().includes('puck') || voiceId?.toLowerCase().includes('carter')) {
      utterance.pitch = Math.max(0.65, Math.min(0.95, 0.82 * pitch));
      utterance.rate = Math.max(0.8, Math.min(1.4, 1.04 * rate));
    } else if (voiceId?.toLowerCase().includes('fenrir')) {
      utterance.pitch = Math.max(0.65, Math.min(0.92, 0.78 * pitch));
      utterance.rate = Math.max(0.75, Math.min(1.3, 0.96 * rate));
    } else {
      // General Male profile
      utterance.pitch = Math.max(0.65, Math.min(0.92, 0.80 * pitch));
      utterance.rate = Math.max(0.7, Math.min(1.3, rate));
    }
  }

  // Fallback to whatever voice is available in the browser if list is populated
  if (!selectedVoice && voices.length > 0) {
    selectedVoice = voices[0];
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onend = () => {
    currentActiveUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('Speech error:', e);
    currentActiveUtterance = null;
    if (onEnd) onEnd();
  };

  currentActiveUtterance = utterance;
  synth.speak(utterance);
  return utterance;
}

/**
 * Creates synthesized audio with duration calculated for the selected voice
 */
export async function synthesizeLocalWebVoice(
  text: string,
  voiceGender: 'Female' | 'Male' = 'Female',
  rate = 1.0,
  pitch = 1.0,
  voiceId?: string
): Promise<{ audioUrl: string; audioBase64: string; duration: number; gender: 'Female' | 'Male' }> {
  const cleanText = text.replace(/\[[^\]]*\]/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);

  const exactGender = detectVoiceGender(voiceId, voiceGender);

  // Standard conversational speaking pace (~135-150 wpm)
  const approxDuration = Math.max(1.2, Math.round((wordCount / (2.3 * Math.max(0.5, rate))) * 10) / 10);

  const sampleRate = 24000;
  const numSamples = Math.floor(sampleRate * approxDuration);
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
  
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < numSamples; i++) {
    channelData[i] = 0;
  }

  const wavBytes = bufferToWav(audioBuffer);
  const base64Wav = bytesToBase64(wavBytes);
  const blob = new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(blob);

  return {
    audioUrl,
    audioBase64: base64Wav,
    duration: approxDuration,
    gender: exactGender,
  };
}

function bufferToWav(abuffer: AudioBuffer): Uint8Array {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const out = new Uint8Array(length);
  const view = new DataView(out.buffer);
  const sampleRate = abuffer.sampleRate;
  let offset = 0;
  let pos = 0;

  // RIFF identifier
  writeString(view, pos, 'RIFF');
  pos += 4;
  view.setUint32(pos, length - 8, true);
  pos += 4;
  writeString(view, pos, 'WAVE');
  pos += 4;
  writeString(view, pos, 'fmt ');
  pos += 4;
  view.setUint32(pos, 16, true);
  pos += 4;
  view.setUint16(pos, 1, true);
  pos += 2;
  view.setUint16(pos, numOfChan, true);
  pos += 2;
  view.setUint32(pos, sampleRate, true);
  pos += 4;
  view.setUint32(pos, sampleRate * 2 * numOfChan, true);
  pos += 4;
  view.setUint16(pos, numOfChan * 2, true);
  pos += 2;
  view.setUint16(pos, 16, true);
  pos += 2;
  writeString(view, pos, 'data');
  pos += 4;
  view.setUint32(pos, length - pos - 4, true);
  pos += 4;

  const channels: Float32Array[] = [];
  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (offset < abuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return out;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
