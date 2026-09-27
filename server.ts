import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import JSZip from 'jszip';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const VIBEVOICE_SERVER_URL = process.env.VIBEVOICE_SERVER_URL || 'http://127.0.0.1:8000';
const VIBEVOICE_PYTHON = process.env.VIBEVOICE_PYTHON || 'C:\\Users\\rayud\\OneDrive\\Desktop\\Projects\\VibeVoice\\.venv\\Scripts\\python.exe';

let vibeVoiceProcess: ChildProcess | null = null;
let isStartingVibeVoice = false;

async function checkVibeVoiceHealth(): Promise<{ ok: boolean; data?: any }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${VIBEVOICE_SERVER_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      return { ok: true, data };
    }
  } catch {
    // not reachable
  }
  return { ok: false };
}

async function ensureVibeVoiceServer(): Promise<boolean> {
  const current = await checkVibeVoiceHealth();
  if (current.ok) {
    return true;
  }

  if (isStartingVibeVoice) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const check = await checkVibeVoiceHealth();
      if (check.ok) return true;
    }
    return false;
  }

  if (!fs.existsSync(VIBEVOICE_PYTHON)) {
    console.warn(`[VibeVoice] Python binary not found at: ${VIBEVOICE_PYTHON}`);
    return false;
  }

  isStartingVibeVoice = true;
  console.log(`[VibeVoice] 🚀 Starting local VibeVoice Neural Engine backend on port 8000...`);

  const serverScript = path.join(__dirname, 'scripts', 'run_vibevoice_server.py');
  vibeVoiceProcess = spawn(VIBEVOICE_PYTHON, [serverScript, '--port', '8000'], {
    cwd: __dirname,
    stdio: 'inherit',
    detached: false,
    shell: false,
  });

  vibeVoiceProcess.on('exit', (code) => {
    console.log(`[VibeVoice] Server process terminated with code: ${code}`);
    vibeVoiceProcess = null;
    isStartingVibeVoice = false;
  });

  for (let i = 0; i < 35; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const check = await checkVibeVoiceHealth();
    if (check.ok) {
      console.log(`[VibeVoice] ✅ Local Neural Server is online and connected at ${VIBEVOICE_SERVER_URL}!`);
      isStartingVibeVoice = false;
      return true;
    }
  }

  isStartingVibeVoice = false;
  return false;
}


// Support large text scripts (2 to 4 hours of text) and audio payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Helper function to create WAV header for 24,000Hz 16-bit Mono PCM
function createWavHeader(dataLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

// Convert raw PCM Base64 to full WAV Base64
function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000): { wavBase64: string; duration: number } {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const header = createWavHeader(pcmBuffer.length, sampleRate, 1, 16);
  const wavBuffer = Buffer.concat([header, pcmBuffer]);
  const duration = pcmBuffer.length / (sampleRate * 2); // 2 bytes per sample
  return {
    wavBase64: wavBuffer.toString('base64'),
    duration,
  };
}

// List of supported Gemini Voices with Male / Female tags
export const GEMINI_VOICES = [
  { id: 'Aster', name: 'Aster (Female - Natural Narrator)', voiceName: 'Kore', gender: 'Female', description: 'Natural, expressive narrator with nuanced storytelling cadence', tags: ['Female', 'Natural', 'Manhwa'] },
  { id: 'Kore', name: 'Kore (Female - Warm & Articulate)', voiceName: 'Kore', gender: 'Female', description: 'Warm, clear, articulate, and natural for narration & storytelling', tags: ['Female', 'Warm', 'Storytelling'] },
  { id: 'Puck', name: 'Puck (Male - Energetic & Modern)', voiceName: 'Puck', gender: 'Male', description: 'Energetic, expressive, modern, great for podcasts & tech videos', tags: ['Male', 'Energetic', 'Podcast'] },
  { id: 'Charon', name: 'Charon (Male - Deep & Cinematic)', voiceName: 'Charon', gender: 'Male', description: 'Deep, authoritative, resonant, cinematic & documentary tone', tags: ['Male', 'Deep', 'Cinematic'] },
  { id: 'Fenrir', name: 'Fenrir (Male - Crisp Audiobook)', voiceName: 'Fenrir', gender: 'Male', description: 'Crisp, professional, calm, ideal for audiobooks & long reads', tags: ['Male', 'Crisp', 'Audiobook'] },
  { id: 'Zephyr', name: 'Zephyr (Female - Bright & Engaging)', voiceName: 'Zephyr', gender: 'Female', description: 'Bright, friendly, fast, engaging for tutorials & explanations', tags: ['Female', 'Bright', 'Tutorials'] },
  { id: 'Aoede', name: 'Aoede (Female - Melodic & Gentle)', voiceName: 'Aoede', gender: 'Female', description: 'Melodic, soothing, gentle, ideal for meditation & literature', tags: ['Female', 'Melodic', 'Gentle'] },
];

export const VIBEVOICE_PROFILES = [
  { id: 'en-Alice_woman', name: 'en-Alice_woman (English - Female / Woman)', gender: 'Female', description: 'VibeVoice English expressive female persona with articulate storytelling and natural cadence', tags: ['VibeVoice', 'English', 'Woman', 'Expressive'] },
  { id: 'en-Carter_man', name: 'en-Carter_man (English - Male / Man)', gender: 'Male', description: 'VibeVoice English dynamic male persona with confident pacing and versatile narration', tags: ['VibeVoice', 'English', 'Man', 'Dynamic'] },
  { id: 'en-Derek', name: 'en-Derek (English - Male / Fun & Energetic)', gender: 'Male', description: 'VibeVoice English lively, energetic male voice with dynamic inflection and natural conversational tone', tags: ['VibeVoice', 'English', 'Man', 'Energetic'] },
  { id: 'en-Frank_man', name: 'en-Frank_man (English - Male / Man)', gender: 'Male', description: 'VibeVoice English deep male voice with rich authoritative timbre and cinematic presence', tags: ['VibeVoice', 'English', 'Man', 'Deep / Cinematic'] },
  { id: 'en-Mary_woman_bgm', name: 'en-Mary_woman_bgm (English - Female / BGM Included)', gender: 'Female', description: 'VibeVoice English female narrator with embedded background music atmospheric score', tags: ['VibeVoice', 'English', 'Woman', 'BGM Included'] },
  { id: 'en-Maya_woman', name: 'en-Maya_woman (English - Female / Woman)', gender: 'Female', description: 'VibeVoice English warm, natural female narrator ideal for audiobooks and character dialogue', tags: ['VibeVoice', 'English', 'Woman', 'Warm Storyteller'] },
  { id: 'in-Samuel_man', name: 'in-Samuel_man (Indian English - Male / Man)', gender: 'Male', description: 'VibeVoice Indian English male voice with clear articulation and authentic tone', tags: ['VibeVoice', 'Indian English', 'Man', 'Articulate'] },
  { id: 'zh-Anchen_man_bgm', name: 'zh-Anchen_man_bgm (Chinese - Male / BGM Included)', gender: 'Male', description: 'VibeVoice Chinese dramatic male narrator with embedded background music orchestration', tags: ['VibeVoice', 'Chinese (zh)', 'Man', 'BGM Included'] },
  { id: 'zh-Bowen_man', name: 'zh-Bowen_man (Chinese - Male / Man)', gender: 'Male', description: 'VibeVoice Chinese male narrator with crisp enunciation and engaging cadence', tags: ['VibeVoice', 'Chinese (zh)', 'Man', 'Crisp'] },
  { id: 'zh-Xinran_woman', name: 'zh-Xinran_woman (Chinese - Female / Woman)', gender: 'Female', description: 'VibeVoice Chinese expressive female voice with gentle, melodic intonation', tags: ['VibeVoice', 'Chinese (zh)', 'Woman', 'Melodic'] },
];

export const AUDIO_TAGS = [
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

// Initialize GoogleGenAI client
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in .env. To synthesize speech without cloud limits, use local VibeVoice 1.5B or 7B.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint: Fetch local VibeVoice Neural Engine status
app.get('/api/vibevoice/status', async (_req, res) => {
  const health = await checkVibeVoiceHealth();
  if (health.ok) {
    return res.json({ connected: true, ...health.data });
  }
  return res.json({
    connected: false,
    serverUrl: VIBEVOICE_SERVER_URL,
    pythonPath: VIBEVOICE_PYTHON,
    message: 'Local VibeVoice neural server is offline or warming up.',
  });
});

// Endpoint: Fetch available voices and presets
app.get('/api/tts/voices', (_req, res) => {
  res.json({
    geminiVoices: GEMINI_VOICES,
    vibevoiceProfiles: VIBEVOICE_PROFILES,
    tags: AUDIO_TAGS,
    models: [
      { id: 'vibevoice-1.5b', name: 'VibeVoice 1.5B (Fast Conversational & Multi-Speaker)', badge: 'VibeVoice 1.5B', default: true },
      { id: 'vibevoice-7b', name: 'VibeVoice 7B (Flagship Deep Cinematic & Multi-Role)', badge: 'VibeVoice 7B', default: false },
      { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.1 Flash Lite TTS (Fast & Standard)', badge: 'Lite 3.1', default: false },
      { id: 'gemini-3.8-flash-tts', name: 'Gemini 3.1 Flash TTS (Expressive & Voice Design)', badge: 'Expressive 3.1', default: false },
      { id: 'local-web-voice', name: 'Local Web Voice Engine (Unlimited & Offline)', badge: 'Local Synth', default: false },
    ],
  });
});

// Endpoint: Generate Speech for a single text chunk
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      chunkId,
      text,
      voice = 'en-Alice_woman',
      model = 'vibevoice-1.5b',
      stylePrompt = '',
    } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required for TTS generation.' });
    }

    // Direct routing to Local VibeVoice Neural Server for 1.5B and 7B models
    if (model.startsWith('vibevoice')) {
      const serverReady = await ensureVibeVoiceServer();
      if (!serverReady) {
        throw new Error(
          `VibeVoice local server is offline or could not be reached at ${VIBEVOICE_SERVER_URL}. Please verify Python environment: ${VIBEVOICE_PYTHON}`
        );
      }

      console.log(`🎙️ Routing chunk [${chunkId || 'chunk'}] to Local VibeVoice (${model} / ${voice})...`);
      const vResp = await fetch(`${VIBEVOICE_SERVER_URL}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkId,
          text,
          voice,
          model,
          stylePrompt,
          customSampleBase64: req.body.customSampleBase64 || null,
        }),
      });

      if (!vResp.ok) {
        const errJson = await vResp.json().catch(() => ({}));
        throw new Error(errJson.detail || `VibeVoice inference failed (Status ${vResp.status})`);
      }

      const vData: any = await vResp.json();
      let pcmBase64 = vData.rawPcmBase64;
      if (!pcmBase64 && vData.audioBase64) {
        const cleanWav = vData.audioBase64.replace(/^data:audio\/[a-z0-9_-]+;base64,/i, '').trim();
        const wavBuf = Buffer.from(cleanWav, 'base64');
        let offset = 44;
        const dataIdx = wavBuf.indexOf('data');
        if (dataIdx !== -1 && dataIdx + 8 <= wavBuf.length) {
          offset = dataIdx + 8;
        }
        if (wavBuf.length > offset) {
          pcmBase64 = wavBuf.subarray(offset).toString('base64');
        }
      }

      return res.json({
        chunkId,
        audioBase64: vData.audioBase64,
        audioUrl: vData.audioUrl || `data:audio/wav;base64,${vData.audioBase64}`,
        rawPcmBase64: pcmBase64 || null,
        sampleRate: vData.sampleRate || 24000,
        duration: vData.duration,
        voice: vData.voice || voice,
        model: vData.model || model,
        text,
        generationTime: vData.generationTime,
        engine: 'VibeVoice Local GPU',
      });
    }

    const ai = getAIClient();

    // Map any custom, Gemini, or VibeVoice profile to valid underlying engine
    const voiceMapping: Record<string, { geminiVoice: string; styleHint?: string }> = {
      Aster: { geminiVoice: 'Kore' },
      Kore: { geminiVoice: 'Kore' },
      Puck: { geminiVoice: 'Puck' },
      Charon: { geminiVoice: 'Charon' },
      Fenrir: { geminiVoice: 'Fenrir' },
      Zephyr: { geminiVoice: 'Zephyr' },
      Aoede: { geminiVoice: 'Aoede' },

      'en-Alice_woman': {
        geminiVoice: 'Kore',
        styleHint: 'Alice profile: articulate, expressive English woman narrator.',
      },
      'en-Carter_man': {
        geminiVoice: 'Puck',
        styleHint: 'Carter profile: dynamic, confident English male voice.',
      },
      'en-Derek': {
        geminiVoice: 'Puck',
        styleHint: 'Derek profile: lively, fun, energetic English male narrator with dynamic delivery.',
      },
      'en-Frank_man': {
        geminiVoice: 'Charon',
        styleHint: 'Frank profile: deep, authoritative, resonant cinematic English male narrator.',
      },
      'en-Mary_woman_bgm': {
        geminiVoice: 'Aoede',
        styleHint: 'Mary profile (includes background music): expressive female voice with cinematic ambient musical flow.',
      },
      'en-Maya_woman': {
        geminiVoice: 'Zephyr',
        styleHint: 'Maya profile: warm, natural, bright English female storyteller.',
      },
      'in-Samuel_man': {
        geminiVoice: 'Fenrir',
        styleHint: 'Samuel profile: articulate Indian English male narrator with clear international diction.',
      },
      'zh-Anchen_man_bgm': {
        geminiVoice: 'Charon',
        styleHint: 'Anchen profile (includes background music): dramatic, resonant Chinese male voice with cinematic tension.',
      },
      'zh-Bowen_man': {
        geminiVoice: 'Puck',
        styleHint: 'Bowen profile: crisp, lively, engaging Chinese male voice.',
      },
      'zh-Xinran_woman': {
        geminiVoice: 'Aoede',
        styleHint: 'Xinran profile: gentle, melodious, expressive Chinese female voice.',
      },
    };

    const resolved = voiceMapping[voice] || { geminiVoice: 'Kore' };
    const resolvedVoiceName = resolved.geminiVoice;

    // Model routing and VibeVoice acoustic conditioning
    let chosenModel = 'gemini-3.8-flash-lite-tts';
    let effectiveStyle = stylePrompt || '';

    if (model === 'vibevoice-7b') {
      chosenModel = 'gemini-3.8-flash-tts';
      const vibePrefix = `[VibeVoice 7B Acoustic Model: Voice ${voice}] ${resolved.styleHint || ''}`;
      effectiveStyle = stylePrompt ? `${vibePrefix} | ${stylePrompt}` : vibePrefix;
    } else if (model === 'vibevoice-1.5b') {
      chosenModel = 'gemini-3.8-flash-lite-tts';
      const vibePrefix = `[VibeVoice 1.5B Conversational Model: Voice ${voice}] ${resolved.styleHint || ''}`;
      effectiveStyle = stylePrompt ? `${vibePrefix} | ${stylePrompt}` : vibePrefix;
    } else if (model === 'gemini-3.8-flash-tts') {
      chosenModel = 'gemini-3.8-flash-tts';
    } else {
      chosenModel = 'gemini-3.8-flash-lite-tts';
    }

    const modelsToTry = [
      chosenModel,
      chosenModel === 'gemini-3.8-flash-lite-tts' ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts',
    ];

    let base64Audio = '';
    let responseMimeType = 'audio/pcm';
    let lastError: any = null;

    for (const targetModel of modelsToTry) {
      // Allow attempt with speechMetadata, then fallback without speechMetadata if model rejects metadata
      const configsToTry = [
        { useSpeechMetadata: true },
        { useSpeechMetadata: false },
      ];

      for (const { useSpeechMetadata } of configsToTry) {
        try {
          const contentsPayload: any = [
            {
              role: 'user',
              parts: [
                useSpeechMetadata && effectiveStyle?.trim()
                  ? {
                      text: text.trim(),
                      speechMetadata: {
                        style: effectiveStyle.trim(),
                      },
                    }
                  : {
                      text: text.trim(),
                    },
              ],
            },
          ];

          const response = await ai.models.generateContent({
            model: targetModel,
            contents: contentsPayload,
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: resolvedVoiceName },
                },
              },
            },
          });

          const part = response.candidates?.[0]?.content?.parts?.[0];
          if (part?.inlineData?.data) {
            base64Audio = part.inlineData.data;
            responseMimeType = part.inlineData.mimeType || 'audio/pcm';
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.warn(`TTS attempt with ${targetModel} (useSpeechMetadata=${useSpeechMetadata}) failed:`, errMsg);

          // If speech metadata was not supported, immediately try next config (without metadata)
          if (errMsg.includes('Speech metadata is not supported') || errMsg.includes('INVALID_ARGUMENT')) {
            continue;
          }

          // If rate limit / quota 429
          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            // Check if retry time is short (<= 6 seconds)
            const match = errMsg.match(/retry in ([0-9.]+)s/i);
            const waitSeconds = match && match[1] ? parseFloat(match[1]) : 5;
            if (waitSeconds <= 6) {
              const waitMs = Math.ceil(waitSeconds * 1000) + 500;
              console.log(`Short quota delay detected (${waitMs}ms). Waiting before retrying...`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue;
            }
          }
          break;
        }
      }

      if (base64Audio) {
        break;
      }
    }

    if (!base64Audio) {
      throw lastError || new Error('No audio data received from speech synthesis service.');
    }

    // Check if returned data is already a WAV file
    let finalWavBase64 = base64Audio;
    let durationSecs = 0;

    if (responseMimeType.includes('wav') || base64Audio.startsWith('UklGR')) {
      // Already WAV format
      const buffer = Buffer.from(base64Audio, 'base64');
      durationSecs = Math.max(0.5, (buffer.length - 44) / (24000 * 2));
    } else {
      // Raw PCM - convert to WAV
      const converted = pcmBase64ToWavBase64(base64Audio, 24000);
      finalWavBase64 = converted.wavBase64;
      durationSecs = converted.duration;
    }

    return res.json({
      chunkId,
      audioBase64: finalWavBase64,
      audioUrl: `data:audio/wav;base64,${finalWavBase64}`,
      rawPcmBase64: base64Audio,
      sampleRate: 24000,
      duration: Math.round(durationSecs * 100) / 100,
      voice: resolvedVoiceName,
      text,
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    let errMsg = error?.message || 'Failed to generate TTS audio.';
    const isRateLimit = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
    let retrySecs = 30;

    if (isRateLimit) {
      const match = errMsg.match(/retry in ([0-9.]+)s/i);
      retrySecs = match && match[1] ? Math.ceil(parseFloat(match[1])) : 30;
      errMsg = `Free tier rate limit reached. Please wait ~${retrySecs}s before generating next chunk or upgrade to standard tier.`;
      return res.status(429).json({
        error: errMsg,
        isRateLimited: true,
        retryAfterSeconds: retrySecs,
      });
    }

    return res.status(500).json({
      error: errMsg,
    });
  }
});

// Endpoint: Analyze Custom WAV / Audio Sample and Clone Voice Profile
app.post('/api/tts/analyze-voice-sample', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/wav', voiceName = 'Custom Voice' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio file data is required (WAV/MP3/M4A).' });
    }

    const ai = getAIClient();

    const prompt = `You are a world-class audio engineer and voice casting director.
Analyze this spoken audio sample. Extract acoustic and vocal characteristics to clone/recreate this speaker's voice persona using speech synthesis.

Provide a JSON object with:
1. "gender": "Male" or "Female"
2. "acousticDescription": 1-2 sentence description of pitch register (bass/baritone/tenor/alto/soprano), resonance, vocal fry, breathiness, age estimate, and accent.
3. "recommendedBaseVoice": Choose the single closest Gemini base voice matching this speaker from ['Charon', 'Fenrir', 'Puck', 'Kore', 'Aoede', 'Zephyr'].
4. "voicePromptDirecting": A concise, highly effective style direction prompt (under 250 characters) instructing the TTS engine how to speak like this person (e.g. "Speak with a deep, textured, calm baritone with measured storytelling cadence, subtle pauses, and warm resonance").
5. "suggestedName": A clean name (e.g. "${voiceName || 'Cloned Voice'} (Cloned)").
6. "tags": 3 to 4 short tag words describing vocal style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType.includes('wav') ? 'audio/wav' : mimeType,
                data: audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, ''),
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = {
        gender: 'Male',
        acousticDescription: 'Natural spoken voice with clear articulation and balanced timbre.',
        recommendedBaseVoice: 'Charon',
        voicePromptDirecting: 'Natural articulate delivery with balanced conversational cadence.',
        suggestedName: `${voiceName} (Male - Cloned Voice)`,
        tags: ['Cloned', 'Custom', 'Natural'],
      };
    }

    const id = `custom_${Date.now()}`;
    const cleanGender = parsed.gender === 'Female' ? 'Female' : 'Male';
    const finalName = parsed.suggestedName || `${voiceName} (${cleanGender} - Cloned Voice)`;

    return res.json({
      id,
      name: finalName,
      gender: cleanGender,
      description: parsed.acousticDescription || 'Custom voice cloned from uploaded WAV audio.',
      tags: parsed.tags || ['Custom', 'Cloned', cleanGender],
      voiceName: parsed.recommendedBaseVoice || (cleanGender === 'Female' ? 'Kore' : 'Charon'),
      baseVoice: parsed.recommendedBaseVoice || (cleanGender === 'Female' ? 'Kore' : 'Charon'),
      customPrompt: parsed.voicePromptDirecting || '',
      isCustom: true,
      sampleAudioUrl: `data:${mimeType};base64,${audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '')}`,
    });
  } catch (error: any) {
    console.error('Error analyzing voice sample:', error);
    // Fallback if audio model has an issue
    const id = `custom_${Date.now()}`;
    return res.json({
      id,
      name: `Custom WAV Voice (Male - Cloned)`,
      gender: 'Male',
      description: 'Custom voice created from uploaded audio sample.',
      tags: ['Custom', 'Cloned', 'WAV'],
      voiceName: 'Charon',
      baseVoice: 'Charon',
      customPrompt: 'Speak with clear, natural articulation matching the uploaded reference sample.',
      isCustom: true,
    });
  }
});

// Endpoint: Intelligent or Rule-based Script Partitioning
app.post('/api/tts/split-script', async (req, res) => {
  try {
    const {
      script,
      mode = 'smart-words', // 'smart-words' | 'paragraph' | 'sentence' | 'ai-director'
      targetWords = 80,
    } = req.body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return res.status(400).json({ error: 'Script text is required.' });
    }

    const cleanedScript = script.replace(/\r\n/g, '\n').trim();

    // If AI Director mode is chosen, use gemini-3.8-flash to parse dramatic pauses & audio tags
    if (mode === 'ai-director') {
      try {
        const ai = getAIClient();
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are an expert audio director & voiceover producer.
Partition the following script into sequential chunks optimal for Text-To-Speech generation.
Rules:
1. Each chunk should be approximately ${targetWords} words (between 50 and 120 words).
2. Never cut in the middle of a sentence.
3. Enhance the text with audio direction tags where natural: e.g. [excited], [whispers], [dramatic pause], [serious], [warm], <breath>, <laugh>.
4. Return ONLY a JSON array of objects with structure: [{"id": 1, "text": "...", "wordCount": number, "toneHint": "..."}].

Script:
${cleanedScript.slice(0, 100000)}`,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(aiResponse.text || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          const chunks = parsed.map((item, index) => ({
            id: `chunk-${index + 1}`,
            index: index + 1,
            text: String(item.text || '').trim(),
            wordCount: String(item.text || '').trim().split(/\s+/).filter(Boolean).length,
            toneHint: item.toneHint || 'Narrator',
            audioUrl: null,
            audioBase64: null,
            rawPcmBase64: null,
            duration: 0,
            status: 'idle', // 'idle' | 'generating' | 'completed' | 'error'
            error: null,
          }));

          return res.json({
            chunks,
            totalWords: chunks.reduce((acc, c) => acc + c.wordCount, 0),
            estimatedDurationSeconds: Math.round(chunks.reduce((acc, c) => acc + c.wordCount, 0) / 2.5),
          });
        }
      } catch (err) {
        console.warn('AI Director split fallback to rule-based splitter:', err);
      }
    }

    // High performance rule-based splitter (supports massive 2-4 hour scripts)
    const chunks: Array<{
      id: string;
      index: number;
      text: string;
      wordCount: number;
      audioUrl: null;
      audioBase64: null;
      rawPcmBase64: null;
      duration: number;
      status: 'idle';
      error: null;
    }> = [];

    if (mode === 'paragraph') {
      const paragraphs = cleanedScript.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      paragraphs.forEach((p, idx) => {
        const words = p.split(/\s+/).filter(Boolean).length;
        chunks.push({
          id: `chunk-${idx + 1}`,
          index: idx + 1,
          text: p,
          wordCount: words,
          audioUrl: null,
          audioBase64: null,
          rawPcmBase64: null,
          duration: 0,
          status: 'idle',
          error: null,
        });
      });
    } else {
      // Smart sentence & target words splitter
      // Split into sentence tokens while preserving punctuation
      const sentenceRegex = /[^.!?\n]+[.!?]+|\n+|[^.!?\n]+$/g;
      const rawSentences = cleanedScript.match(sentenceRegex) || [cleanedScript];

      let currentChunkText: string[] = [];
      let currentWordCount = 0;

      for (const sent of rawSentences) {
        const trimmed = sent.trim();
        if (!trimmed) continue;

        const sentWords = trimmed.split(/\s+/).filter(Boolean).length;

        // If adding this sentence exceeds target words and we already have some text
        if (currentWordCount + sentWords > targetWords && currentChunkText.length > 0) {
          const chunkString = currentChunkText.join(' ').trim();
          chunks.push({
            id: `chunk-${chunks.length + 1}`,
            index: chunks.length + 1,
            text: chunkString,
            wordCount: currentWordCount,
            audioUrl: null,
            audioBase64: null,
            rawPcmBase64: null,
            duration: 0,
            status: 'idle',
            error: null,
          });
          currentChunkText = [trimmed];
          currentWordCount = sentWords;
        } else {
          currentChunkText.push(trimmed);
          currentWordCount += sentWords;
        }
      }

      if (currentChunkText.length > 0) {
        const chunkString = currentChunkText.join(' ').trim();
        chunks.push({
          id: `chunk-${chunks.length + 1}`,
          index: chunks.length + 1,
          text: chunkString,
          wordCount: currentWordCount,
          audioUrl: null,
          audioBase64: null,
          rawPcmBase64: null,
          duration: 0,
          status: 'idle',
          error: null,
        });
      }
    }

    const totalWords = chunks.reduce((acc, c) => acc + c.wordCount, 0);
    // Average speech is ~150 words per minute => 2.5 words per second
    const estimatedDurationSeconds = Math.round(totalWords / 2.5);

    return res.json({
      chunks,
      totalWords,
      estimatedDurationSeconds,
    });
  } catch (error: any) {
    console.error('Error splitting script:', error);
    return res.status(500).json({ error: error?.message || 'Failed to partition script.' });
  }
});

// Endpoint: Merge audio chunks into one Master Audio Track
app.post('/api/tts/merge', (req, res) => {
  try {
    const { pcmChunks, gapDurationMs = 300, sampleRate = 24000 } = req.body;

    if (!Array.isArray(pcmChunks) || pcmChunks.length === 0) {
      return res.status(400).json({ error: 'pcmChunks array is required to merge.' });
    }

    // Gap buffer calculation: 24000 samples/sec * 2 bytes/sample = 48000 bytes/sec
    const gapBytesCount = Math.floor((sampleRate * 2 * gapDurationMs) / 1000);
    const silenceBuffer = Buffer.alloc(gapBytesCount);

    const buffers: Buffer[] = [];

    pcmChunks.forEach((chunkBase64, index) => {
      if (chunkBase64 && typeof chunkBase64 === 'string') {
        const cleanBase64 = chunkBase64.replace(/^data:audio\/[a-z0-9_-]+;base64,/i, '').trim();
        let buf = Buffer.from(cleanBase64, 'base64');
        
        // If this chunk has a RIFF WAV header, strip it so only raw PCM samples are concatenated
        if (buf.length >= 44 && buf.toString('ascii', 0, 4) === 'RIFF') {
          let pcmOffset = 44;
          const dataIdx = buf.indexOf('data');
          if (dataIdx !== -1 && dataIdx + 8 <= buf.length) {
            pcmOffset = dataIdx + 8;
          }
          buf = buf.subarray(pcmOffset);
        }

        buffers.push(buf);
        // Add silence gap between chunks (not after the last one)
        if (index < pcmChunks.length - 1 && gapBytesCount > 0) {
          buffers.push(silenceBuffer);
        }
      }
    });

    if (buffers.length === 0) {
      return res.status(400).json({ error: 'No valid audio data provided to merge.' });
    }

    const combinedPcm = Buffer.concat(buffers);
    const header = createWavHeader(combinedPcm.length, sampleRate, 1, 16);
    const masterWav = Buffer.concat([header, combinedPcm]);

    const totalDuration = combinedPcm.length / (sampleRate * 2);
    const wavBase64 = masterWav.toString('base64');

    return res.json({
      audioBase64: wavBase64,
      audioUrl: `data:audio/wav;base64,${wavBase64}`,
      duration: Math.round(totalDuration * 100) / 100,
      totalSize: masterWav.length,
      chunksMerged: pcmChunks.length,
    });
  } catch (error: any) {
    console.error('Error merging audio:', error);
    return res.status(500).json({ error: error?.message || 'Failed to merge audio chunks.' });
  }
});

// --- Download Ticket Store for reliable RFC 6266 HTTP downloads ---
interface DownloadTicketEntry {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  createdAt: number;
}

const downloadTicketStore = new Map<string, DownloadTicketEntry>();

// Housekeeping: purge items older than 20 minutes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ticket, entry] of downloadTicketStore.entries()) {
    if (now - entry.createdAt > 20 * 60 * 1000) {
      downloadTicketStore.delete(ticket);
    }
  }
}, 5 * 60 * 1000);

// Endpoint: Register in-memory base64 audio/zip and receive direct HTTP GET download URL
app.post('/api/tts/prepare-download', (req, res) => {
  try {
    const { fileBase64, filename = 'chunk_001.wav', mimeType = 'audio/wav' } = req.body;
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'fileBase64 data is required.' });
    }

    const cleanBase64 = fileBase64.replace(/^data:[a-zA-Z0-9_\-\/]+;base64,/i, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');

    let cleanFilename = path.basename(filename.trim()).replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!cleanFilename || cleanFilename === '.wav') {
      cleanFilename = mimeType.includes('zip') ? 'audiocraft_studio_stems_all_chunks.zip' : 'chunk_001.wav';
    }

    const ticket = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    downloadTicketStore.set(ticket, {
      buffer,
      filename: cleanFilename,
      mimeType: mimeType || (cleanFilename.endsWith('.zip') ? 'application/zip' : 'audio/wav'),
      createdAt: Date.now(),
    });

    // Directly save to user's Windows Downloads directory and project exports folder
    let savedToDownloads = false;
    let savedPath = '';
    try {
      const userDownloads = path.join(process.env.USERPROFILE || 'C:\\Users\\rayud', 'Downloads');
      if (fs.existsSync(userDownloads)) {
        savedPath = path.join(userDownloads, cleanFilename);
        fs.writeFileSync(savedPath, buffer);
        savedToDownloads = true;
      }
      const exportsDir = path.join(__dirname, 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(exportsDir, cleanFilename), buffer);
      console.log(`💾 Saved ${cleanFilename} directly to Downloads: ${savedPath}`);
    } catch (saveErr) {
      console.warn('Direct file save warning:', saveErr);
    }

    const downloadUrl = `/api/tts/download/${ticket}/${encodeURIComponent(cleanFilename)}`;
    return res.json({
      success: true,
      ticket,
      filename: cleanFilename,
      downloadUrl,
      sizeBytes: buffer.length,
      savedToDownloads,
      savedPath,
    });
  } catch (error: any) {
    console.error('Error in /api/tts/prepare-download:', error);
    return res.status(500).json({ error: error?.message || 'Failed to prepare download.' });
  }
});

// Endpoint: Server-side ZIP archive compiler and direct HTTP GET ticket dispenser
app.post('/api/tts/build-zip', async (req, res) => {
  try {
    const { chunks, projectName = 'audiocraft_studio_stems' } = req.body;
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return res.status(400).json({ error: 'No audio chunks provided for ZIP compilation.' });
    }

    const zip = new JSZip();
    chunks.forEach((chunk: any) => {
      if (chunk.audioBase64) {
        const clean = chunk.audioBase64.replace(/^data:audio\/[a-z0-9_-]+;base64,/i, '').trim();
        const chunkBuf = Buffer.from(clean, 'base64');
        const chunkIndex = typeof chunk.index === 'number' ? chunk.index : 1;
        const chunkName = `chunk_${String(chunkIndex).padStart(3, '0')}.wav`;
        zip.file(chunkName, chunkBuf);
      }
    });

    let formattedProject = (projectName || 'audiocraft_studio_stems')
      .replace(/\.zip$/i, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');

    if (!formattedProject || formattedProject === '_') {
      formattedProject = 'audiocraft_studio_stems';
    }

    const zipFilename = formattedProject.endsWith('_all_chunks')
      ? `${formattedProject}.zip`
      : `${formattedProject}_all_chunks.zip`;

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    const ticket = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    downloadTicketStore.set(ticket, {
      buffer: zipBuffer,
      filename: zipFilename,
      mimeType: 'application/zip',
      createdAt: Date.now(),
    });

    // Directly save ZIP to user's Windows Downloads directory and project exports folder
    let savedToDownloads = false;
    let savedPath = '';
    try {
      const userDownloads = path.join(process.env.USERPROFILE || 'C:\\Users\\rayud', 'Downloads');
      if (fs.existsSync(userDownloads)) {
        savedPath = path.join(userDownloads, zipFilename);
        fs.writeFileSync(savedPath, zipBuffer);
        savedToDownloads = true;
      }
      const exportsDir = path.join(__dirname, 'exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(exportsDir, zipFilename), zipBuffer);
      console.log(`💾 Saved ZIP ${zipFilename} directly to Downloads: ${savedPath}`);
    } catch (saveErr) {
      console.warn('Direct ZIP save warning:', saveErr);
    }

    const downloadUrl = `/api/tts/download/${ticket}/${encodeURIComponent(zipFilename)}`;
    return res.json({
      success: true,
      ticket,
      filename: zipFilename,
      downloadUrl,
      sizeBytes: zipBuffer.length,
      chunksCount: chunks.length,
      savedToDownloads,
      savedPath,
    });
  } catch (error: any) {
    console.error('Error in /api/tts/build-zip:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate ZIP archive.' });
  }
});

// Endpoint: RFC 6266 Attachment file dispenser with strict HTTP Content-Disposition
app.get('/api/tts/download/:ticket/:filename', (req, res) => {
  try {
    const { ticket, filename } = req.params;
    const entry = downloadTicketStore.get(ticket);
    if (!entry) {
      return res.status(404).send('Download link expired or not found. Please click download again in AudioCraft Studio.');
    }

    const cleanFilename = entry.filename || filename || 'chunk_001.wav';

    res.setHeader('Content-Type', entry.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', entry.buffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`
    );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.end(entry.buffer);
  } catch (error: any) {
    console.error('Error serving download:', error);
    return res.status(500).send('Error streaming download file.');
  }
});

// Mount Vite or static serving
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AudioCraft Studio server running on http://0.0.0.0:${PORT}`);
    // Auto-detect or warm up local VibeVoice server in background
    ensureVibeVoiceServer().catch((err) => {
      console.warn('[VibeVoice] Background warmup note:', err?.message || err);
    });
  });
}

// Clean termination of child processes
process.on('SIGINT', () => {
  if (vibeVoiceProcess) {
    try { vibeVoiceProcess.kill(); } catch {}
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (vibeVoiceProcess) {
    try { vibeVoiceProcess.kill(); } catch {}
  }
  process.exit(0);
});

setupServer();

