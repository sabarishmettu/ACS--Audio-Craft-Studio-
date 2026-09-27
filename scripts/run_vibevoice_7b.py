"""
VibeVoice 7B Flagship Cinematic & Multi-Role Inference Script
Synthesizes speech using local VibeVoice-7B weights.
"""

import os
import sys
import argparse
import torch
import soundfile as sf

DEFAULT_VIBEVOICE_DIR = r"C:\Users\rayud\OneDrive\Desktop\Projects\VibeVoice"
VIBEVOICE_DIR = os.environ.get("VIBEVOICE_DIR", DEFAULT_VIBEVOICE_DIR)
if os.path.exists(VIBEVOICE_DIR) and VIBEVOICE_DIR not in sys.path:
    sys.path.insert(0, VIBEVOICE_DIR)

from vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
from vibevoice.processor.vibevoice_processor import VibeVoiceProcessor

def run_vibevoice_7b(
    text: str,
    voice_id: str = "en-Frank_man",
    output_path: str = "output_7b.wav",
    device: str = None
):
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    if device != "cuda":
        print("⚠️ Warning: Running 7B model on CPU may be slow. A GPU with >= 12GB VRAM is recommended.")

    print(f"👑 Initializing VibeVoice 7B Flagship on: {device} (BFloat16)")
    print(f"🎭 Voice Persona: {voice_id}")
    print(f"🎬 Emotional / Breath Directing Text: {text}")

    model_path = os.environ.get(
        "VIBEVOICE_7B_PATH",
        os.path.join(VIBEVOICE_DIR, "models", "VibeVoice-7B")
    )
    if not os.path.exists(model_path):
        alt_path = os.path.join(os.path.dirname(__file__), "..", "models", "VibeVoice-7B")
        if os.path.exists(alt_path):
            model_path = alt_path

    print(f"📦 Loading weights from: {model_path}...")
    processor = VibeVoiceProcessor.from_pretrained(model_path)
    model = VibeVoiceForConditionalGenerationInference.from_pretrained(
        model_path,
        torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
        device_map=device,
        attn_implementation="sdpa"
    )
    model.eval()
    model.set_ddpm_inference_steps(num_steps=10)

    # Voice sample path
    voice_file = voice_id if voice_id.endswith(".wav") else f"{voice_id}.wav"
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "voices", voice_file),
        os.path.join(VIBEVOICE_DIR, "demo", "voices", voice_file),
    ]
    ref_audio = None
    for c in candidates:
        if os.path.exists(c):
            ref_audio = c
            break
    if not ref_audio:
        ref_audio = candidates[0]

    # Format text
    formatted_text = text if text.lower().startswith("speaker ") else f"Speaker 1: {text}"

    inputs = processor(
        text=[formatted_text],
        voice_samples=[[ref_audio]],
        padding=True,
        return_tensors="pt",
        return_attention_mask=True,
    )
    inputs = {k: v.to(device) if torch.is_tensor(v) else v for k, v in inputs.items()}

    print("⚡ Generating cinematic speech waveform...")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=None,
            cfg_scale=1.3,
            tokenizer=processor.tokenizer,
            generation_config={"do_sample": False},
            verbose=False,
            is_prefill=True,
        )

    speech = outputs.speech_outputs[0]
    processor.save_audio(speech, output_path=output_path)
    print("✅ High-fidelity 7B acoustic generation complete!")
    print(f"💾 Saved master audio to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run VibeVoice 7B Flagship inference")
    parser.add_argument("--text", type=str, default="[dramatic pause] In the beginning, there was only darkness... Kai opened his eyes slowly. <breath>")
    parser.add_argument("--voice", type=str, default="en-Frank_man", choices=[
        "en-Alice_woman", "en-Carter_man", "en-Frank_man", "en-Mary_woman_bgm",
        "en-Maya_woman", "in-Samuel_man", "zh-Anchen_man_bgm", "zh-Bowen_man", "zh-Xinran_woman"
    ])
    parser.add_argument("--output", type=str, default="output_7b.wav")
    args = parser.parse_args()

    run_vibevoice_7b(text=args.text, voice_id=args.voice, output_path=args.output)
