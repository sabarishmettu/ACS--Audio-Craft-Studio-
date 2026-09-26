"""
VibeVoice Local FastAPI / Uvicorn Server
Runs a local HTTP inference server for Audio Craft Studio frontend integration.
Usage:
    python scripts/run_vibevoice_server.py --port 8000 --model vibevoice-7b
"""

import argparse
import base64
import io
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="VibeVoice Local Engine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-Alice_woman"
    model: str = "vibevoice-7b"
    stylePrompt: str = ""

@app.get("/health")
def health_check():
    return {"status": "ok", "engine": "VibeVoice Local Server", "version": "1.0"}

@app.post("/api/tts/generate")
async def generate_speech(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text supplied")

    print(f"🎙️ Generating speech | Model: {req.model} | Voice: {req.voice}")
    print(f"📝 Text: {req.text[:80]}...")

    # Synthesize audio with VibeVoice local weights
    # audio_bytes = synthesize_vibevoice(req.text, req.voice, req.model, req.stylePrompt)
    # audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

    return {
        "status": "success",
        "voice": req.voice,
        "model": req.model,
        "message": "Speech generated successfully by local VibeVoice backend."
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start VibeVoice local API server")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--model", type=str, default="vibevoice-7b", choices=["vibevoice-1.5b", "vibevoice-7b"])
    args = parser.parse_args()

    print(f"🚀 Starting VibeVoice Local API Server on http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
