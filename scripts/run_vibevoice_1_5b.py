"""
VibeVoice 1.5B Fast Inference Script (PyTorch / CUDA / MPS / CPU)
Synthesizes speech using local VibeVoice-1.5B weights.
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

def run_vibevoice_1_5b(
    text: str,
    voice_id: str = "en-Alice_woman",
    output_path: str = "output_1_5b.wav",
    device: str = None
):
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    print(f"🚀 Initializing VibeVoice 1.5B on device: {device}")
    print(f"🗣️ Selected Voice Profile: {voice_id}")
    print(f"📝 Input Text: {text[:80]}...")

    model_path = os.environ.get(
        "VIBEVOICE_1_5B_PATH",
        os.path.join(VIBEVOICE_DIR, "models", "VibeVoice-1.5B")
    )
    if not os.path.exists(model_path):
        alt_path = os.path.join(os.path.dirname(__file__), "..", "models", "VibeVoice-1.5B")
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

    print("⚡ Generating speech waveform...")
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
    print("✅ Generation completed successfully!")
    print(f"💾 Saved synthesized audio to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run VibeVoice 1.5B inference")
    parser.add_argument("--text", type=str, default="Welcome to Audio Craft Studio. VibeVoice 1.5B generates ultra-low latency narration.")
    parser.add_argument("--voice", type=str, default="en-Alice_woman", choices=[
        "en-Alice_woman", "en-Carter_man", "en-Frank_man", "en-Mary_woman_bgm", 
        "en-Maya_woman", "in-Samuel_man", "zh-Anchen_man_bgm", "zh-Bowen_man", "zh-Xinran_woman"
    ])
    parser.add_argument("--output", type=str, default="output_1_5b.wav")
    args = parser.parse_args()

    run_vibevoice_1_5b(text=args.text, voice_id=args.voice, output_path=args.output)
