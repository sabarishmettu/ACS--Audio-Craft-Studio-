/**
 * Local Speech Synthesizer & Controller
 * High-accuracy Male & Female voice matching across Windows, macOS, Android, iOS, and Linux.
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

// Male voice identifying keywords across Microsoft, Apple, Google, and standard TTS engines
const MALE_VOICE_KEYWORDS = [
  'male', 'man', 'david', 'mark', 'george', 'alex', 'guy', 'ryan', 'daniel', 'fred',
  'oliver', 'tom', 'aaron', 'arthur', 'gordon', 'james', 'richard', 'steffan', 'lee',
  'en-us-neural2-d', 'en-us-neural2-j', 'en-us-standard-b', 'en-us-standard-d',
  'en-us-wavenet-b', 'en-us-wavenet-d', 'uk english male', 'us english male',
  'desktop male', 'natural male', 'google uk english male',
];

// Female voice identifying keywords
const FEMALE_VOICE_KEYWORDS = [
  'female', 'woman', 'zira', 'samantha', 'karen', 'victoria', 'jenny', 'aria', 'ava',
  'emma', 'sara', 'fiona', 'moira', 'tessa', 'veena', 'catherine', 'hazel', 'susan',
  'en-us-neural2-c', 'en-us-neural2-e', 'en-us-neural2-f', 'en-us-standard-c',
  'en-us-standard-e', 'en-us-wavenet-c', 'en-us-wavenet-e', 'uk english female', 'us english female',
  'desktop female', 'natural female', 'google us english',
];

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

  const cleanText = text.replace(/\[[^\]]*\]/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanText) return null;

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Determine if target is Male or Female
  const targetGender = (
    voiceGender === 'Male' ||
    voiceId?.toLowerCase().includes('male') ||
    voiceId?.toLowerCase().includes('puck') ||
    voiceId?.toLowerCase().includes('charon') ||
    voiceId?.toLowerCase().includes('fenrir')
  ) ? 'Male' : 'Female';

  let selectedVoice: SpeechSynthesisVoice | null = null;

  if (targetGender === 'Male') {
    // Search for explicit male voice
    selectedVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      return MALE_VOICE_KEYWORDS.some((kw) => name.includes(kw));
    }) || null;

    // Calibrate pitch and cadence for deep masculine tone
    if (voiceId?.toLowerCase().includes('charon')) {
      utterance.pitch = Math.max(0.6, Math.min(1.1, 0.76 * pitch));
      utterance.rate = Math.max(0.7, Math.min(1.3, 0.95 * rate));
    } else if (voiceId?.toLowerCase().includes('puck')) {
      utterance.pitch = Math.max(0.7, Math.min(1.2, 0.88 * pitch));
      utterance.rate = Math.max(0.8, Math.min(1.4, 1.05 * rate));
    } else if (voiceId?.toLowerCase().includes('fenrir')) {
      utterance.pitch = Math.max(0.65, Math.min(1.15, 0.82 * pitch));
      utterance.rate = Math.max(0.75, Math.min(1.3, 0.98 * rate));
    } else {
      // General Male voice calibration (lowers pitch into masculine octave even on unisex voices)
      utterance.pitch = Math.max(0.65, Math.min(1.1, 0.80 * pitch));
      utterance.rate = Math.max(0.7, Math.min(1.3, rate));
    }
  } else {
    // Search for explicit female voice
    selectedVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      return FEMALE_VOICE_KEYWORDS.some((kw) => name.includes(kw));
    }) || null;

    if (voiceId?.toLowerCase().includes('zephyr')) {
      utterance.pitch = Math.max(0.8, Math.min(1.4, 1.10 * pitch));
      utterance.rate = Math.max(0.8, Math.min(1.4, 1.06 * rate));
    } else if (voiceId?.toLowerCase().includes('aoede')) {
      utterance.pitch = Math.max(0.8, Math.min(1.3, 1.05 * pitch));
      utterance.rate = Math.max(0.7, Math.min(1.2, 0.94 * rate));
    } else {
      utterance.pitch = Math.max(0.8, Math.min(1.3, 1.0 * pitch));
      utterance.rate = Math.max(0.7, Math.min(1.3, rate));
    }
  }

  // Fallback to primary language voice if specific gender voice not found
  if (!selectedVoice && voices.length > 0) {
    selectedVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
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
 * Creates a clean silent timing track with duration calculated for the selected voice
 */
export async function synthesizeLocalWebVoice(
  text: string,
  voiceGender: 'Female' | 'Male' = 'Female',
  rate = 1.0,
  pitch = 1.0
): Promise<{ audioUrl: string; audioBase64: string; duration: number }> {
  const cleanText = text.replace(/\[[^\]]*\]/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);

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
