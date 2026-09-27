"""
VibeVoice Local High-Performance Inference Server for AudioCraft Studio
Connects local VibeVoice-1.5B and VibeVoice-7B models directly to the studio DAW.
"""

import os
import sys
import gc
import io
import time
import argparse
import base64
import torch
import numpy as np
import soundfile as sf
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# Ensure UTF-8 stdout encoding on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure VibeVoice repository is in Python sys.path
DEFAULT_VIBEVOICE_DIR = r"C:\Users\rayud\OneDrive\Desktop\Projects\VibeVoice"
VIBEVOICE_DIR = os.environ.get("VIBEVOICE_DIR", DEFAULT_VIBEVOICE_DIR)
if os.path.exists(VIBEVOICE_DIR) and VIBEVOICE_DIR not in sys.path:
    sys.path.insert(0, VIBEVOICE_DIR)

from vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
from vibevoice.processor.vibevoice_processor import VibeVoiceProcessor

app = FastAPI(title="VibeVoice Local Neural Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve Model Paths on System
def resolve_model_path(model_name: str) -> str:
    key = model_name.lower().replace("-", "").replace(".", "").replace("_", "")
    is_1_5b = "15b" in key or "15" in key
    
    env_var = "VIBEVOICE_1_5B_PATH" if is_1_5b else "VIBEVOICE_7B_PATH"
    if os.environ.get(env_var) and os.path.exists(os.environ[env_var]):
        return os.environ[env_var]
    
    target_folder = "VibeVoice-1.5B" if is_1_5b else "VibeVoice-7B"
    candidate_paths = [
        os.path.join(VIBEVOICE_DIR, "models", target_folder),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", target_folder),
        os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "hub", f"models--vibevoice--{target_folder}"),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return p
    return os.path.join(VIBEVOICE_DIR, "models", target_folder)

# Resolve Voice Sample Audio Path
def resolve_voice_sample(voice_name: str, custom_sample_path: Optional[str] = None) -> str:
    if custom_sample_path and os.path.exists(custom_sample_path):
        return custom_sample_path
        
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_voices = os.path.join(script_dir, "..", "voices")
    vibevoice_voices = os.path.join(VIBEVOICE_DIR, "demo", "voices")
    
    clean_voice = voice_name.strip()
    if not clean_voice.endswith(".wav"):
        target_filename = f"{clean_voice}.wav"
    else:
        target_filename = clean_voice

    search_dirs = [workspace_voices, vibevoice_voices]
    for d in search_dirs:
        candidate = os.path.join(d, target_filename)
        if os.path.exists(candidate):
            return candidate

    # Fuzzy match
    for d in search_dirs:
        if os.path.exists(d):
            for fname in os.listdir(d):
                if fname.lower().endswith(".wav"):
                    base_f = os.path.splitext(fname)[0].lower()
                    base_v = os.path.splitext(target_filename)[0].lower()
                    if base_v in base_f or base_f in base_v:
                        return os.path.join(d, fname)

    # Fallback default
    for d in search_dirs:
        default_file = os.path.join(d, "en-Alice_woman.wav")
        if os.path.exists(default_file):
            return default_file

    raise FileNotFoundError(f"Could not find voice audio reference for '{voice_name}'")

# Global Inference State
CURRENT_MODEL_KEY = None
CURRENT_MODEL = None
CURRENT_PROCESSOR = None
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def load_vibevoice_model(model_key: str):
    global CURRENT_MODEL_KEY, CURRENT_MODEL, CURRENT_PROCESSOR, DEVICE
    
    canonical_key = "vibevoice-1.5b" if "1.5" in model_key or "15" in model_key else "vibevoice-7b"
    if CURRENT_MODEL is not None and CURRENT_MODEL_KEY == canonical_key:
        return CURRENT_MODEL, CURRENT_PROCESSOR
    
    print(f"\n🔄 Switching / Loading VibeVoice model: [{canonical_key}]...")
    # Unload previous model and release VRAM
    if CURRENT_MODEL is not None:
        del CURRENT_MODEL
        CURRENT_MODEL = None
    if CURRENT_PROCESSOR is not None:
        del CURRENT_PROCESSOR
        CURRENT_PROCESSOR = None
        
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()

    model_path = resolve_model_path(canonical_key)
    print(f"📦 Model location: {model_path}")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model path does not exist: {model_path}")

    start_time = time.time()
    processor = VibeVoiceProcessor.from_pretrained(model_path)
    
    load_dtype = torch.bfloat16 if DEVICE == "cuda" else torch.float32
    print(f"⚙️ Initializing neural weights on {DEVICE} ({load_dtype})...")
    
    model = VibeVoiceForConditionalGenerationInference.from_pretrained(
        model_path,
        torch_dtype=load_dtype,
        device_map=DEVICE,
        attn_implementation="sdpa",
    )
    model.eval()
    model.set_ddpm_inference_steps(num_steps=10)
    
    elapsed = time.time() - start_time
    print(f"✅ VibeVoice model [{canonical_key}] loaded into {DEVICE} memory in {elapsed:.2f}s!")
    
    CURRENT_MODEL_KEY = canonical_key
    CURRENT_MODEL = model
    CURRENT_PROCESSOR = processor
    return model, processor

class TTSRequest(BaseModel):
    chunkId: Optional[str] = "chunk-1"
    text: str
    voice: str = "en-Alice_woman"
    model: str = "vibevoice-7b"
    stylePrompt: Optional[str] = ""
    cfg_scale: Optional[float] = 1.3
    ddpm_steps: Optional[int] = 10
    customSampleBase64: Optional[str] = None

class PreloadRequest(BaseModel):
    model: str = "vibevoice-1.5b"

@app.get("/health")
def health_check():
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    vram_total = (torch.cuda.get_device_properties(0).total_memory / (1024**3)) if torch.cuda.is_available() else 0
    vram_allocated = (torch.cuda.memory_allocated(0) / (1024**3)) if torch.cuda.is_available() else 0
    
    return {
        "status": "ok",
        "engine": "VibeVoice Local Neural Engine",
        "device": DEVICE,
        "gpuName": gpu_name,
        "vramTotalGB": round(vram_total, 2),
        "vramAllocatedGB": round(vram_allocated, 2),
        "activeModel": CURRENT_MODEL_KEY or "none",
        "availableModels": ["vibevoice-1.5b", "vibevoice-7b"],
        "paths": {
            "vibeVoice1_5b": resolve_model_path("vibevoice-1.5b"),
            "vibeVoice7b": resolve_model_path("vibevoice-7b"),
        }
    }

@app.get("/api/tts/status")
def tts_status():
    return health_check()

@app.get("/api/tts/voices")
def list_voices():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_voices = os.path.join(script_dir, "..", "voices")
    vibevoice_voices = os.path.join(VIBEVOICE_DIR, "demo", "voices")
    
    voices = set()
    for d in [workspace_voices, vibevoice_voices]:
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.lower().endswith(".wav"):
                    voices.add(os.path.splitext(f)[0])
    return {"voices": sorted(list(voices))}

@app.post("/api/tts/preload")
def preload_model(req: PreloadRequest):
    try:
        load_vibevoice_model(req.model)
        return {"status": "success", "loadedModel": CURRENT_MODEL_KEY}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts/generate")
async def generate_speech(req: TTSRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text supplied for speech synthesis.")

    try:
        t0 = time.time()
        model, processor = load_vibevoice_model(req.model)
        
        # Handle custom voice sample base64 if provided
        custom_wav_path = None
        if req.customSampleBase64:
            clean_b64 = req.customSampleBase64.replace("data:audio/wav;base64,", "").replace("data:audio/mp3;base64,", "")
            audio_bytes = base64.b64decode(clean_b64)
            temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scratch")
            os.makedirs(temp_dir, exist_ok=True)
            custom_wav_path = os.path.join(temp_dir, f"custom_voice_{int(time.time()*1000)}.wav")
            with open(custom_wav_path, "wb") as f:
                f.write(audio_bytes)
                
        voice_path = resolve_voice_sample(req.voice, custom_wav_path)
        
        # Format text with Speaker tag if not already formatted
        raw_text = req.text.strip()
        if not raw_text.lower().startswith("speaker "):
            formatted_text = f"Speaker 1: {raw_text}"
        else:
            formatted_text = raw_text

        print(f"🎙️ [VibeVoice] Generating speech chunk [{req.chunkId}] | Model: {CURRENT_MODEL_KEY} | Voice: {os.path.basename(voice_path)}")
        print(f"📝 Text: {formatted_text[:80]}...")

        # Update inference steps if provided
        ddpm_steps = req.ddpm_steps if req.ddpm_steps and req.ddpm_steps > 0 else 10
        model.set_ddpm_inference_steps(num_steps=ddpm_steps)

        # Prepare inputs
        inputs = processor(
            text=[formatted_text],
            voice_samples=[[voice_path]],
            padding=True,
            return_tensors="pt",
            return_attention_mask=True,
        )

        for k, v in inputs.items():
            if torch.is_tensor(v):
                inputs[k] = v.to(DEVICE)

        cfg_scale = req.cfg_scale if req.cfg_scale is not None else 1.3
        gen_start = time.time()
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=None,
                cfg_scale=cfg_scale,
                tokenizer=processor.tokenizer,
                generation_config={"do_sample": False},
                verbose=False,
                is_prefill=True,
            )
            
        gen_duration = time.time() - gen_start

        if not outputs.speech_outputs or outputs.speech_outputs[0] is None:
            raise RuntimeError("VibeVoice model did not return any speech waveform output.")

        raw_speech = outputs.speech_outputs[0]
        # Convert tensor to numpy float32
        if isinstance(raw_speech, torch.Tensor):
            speech_np = raw_speech.float().detach().cpu().numpy()
        else:
            speech_np = np.array(raw_speech, dtype=np.float32)

        # Squeeze batch / channel dimensions if present
        speech_np = np.squeeze(speech_np)
        
        # Audio specs: 24,000Hz 16-bit Mono PCM
        sample_rate = 24000
        num_samples = len(speech_np)
        audio_duration = float(num_samples) / float(sample_rate)
        
        # Encode to WAV buffer
        wav_buf = io.BytesIO()
        sf.write(wav_buf, speech_np, sample_rate, format="WAV", subtype="PCM_16")
        wav_bytes = wav_buf.getvalue()
        wav_base64 = base64.b64encode(wav_bytes).decode("ascii")

        # Encode raw 16-bit PCM bytes
        pcm_int16 = (np.clip(speech_np, -1.0, 1.0) * 32767.0).astype(np.int16)
        pcm_base64 = base64.b64encode(pcm_int16.tobytes()).decode("ascii")

        total_elapsed = time.time() - t0
        print(f"✨ Generation complete in {gen_duration:.2f}s (Total: {total_elapsed:.2f}s) | Duration: {audio_duration:.2f}s | RTF: {gen_duration/max(0.1, audio_duration):.2f}x")

        # Clean temporary custom voice file if used
        if custom_wav_path and os.path.exists(custom_wav_path):
            try:
                os.remove(custom_wav_path)
            except Exception:
                pass

        return {
            "status": "success",
            "chunkId": req.chunkId,
            "audioBase64": wav_base64,
            "audioUrl": f"data:audio/wav;base64,{wav_base64}",
            "rawPcmBase64": pcm_base64,
            "sampleRate": sample_rate,
            "duration": round(audio_duration, 2),
            "voice": req.voice,
            "model": CURRENT_MODEL_KEY,
            "generationTime": round(gen_duration, 2),
            "text": req.text,
        }

    except Exception as e:
        print(f"❌ Error during VibeVoice generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start VibeVoice local API server")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--model", type=str, default="vibevoice-1.5b", choices=["vibevoice-1.5b", "vibevoice-7b"])
    parser.add_argument("--preload", action="store_true", help="Preload model on startup")
    args = parser.parse_args()

    if args.preload:
        print(f"⏳ Preloading initial model: {args.model}...")
        load_vibevoice_model(args.model)

    print(f"🚀 AudioCraft Studio VibeVoice Neural Server running at http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
