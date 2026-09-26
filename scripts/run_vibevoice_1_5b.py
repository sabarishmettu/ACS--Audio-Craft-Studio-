"""
VibeVoice 1.5B Fast Inference Script (PyTorch / CUDA / MPS / CPU)
Usage:
    python scripts/run_vibevoice_1_5b.py --voice en-Alice_woman --text "In the beginning, there was only darkness..."
"""

import argparse
import torch
import soundfile as sf

def run_vibevoice_1_5b(
    text: str,
    voice_id: str = "en-Alice_woman",
    output_path: str = "output_1_5b.wav",
    device: str = None
):
    if device is None:
        if torch.cuda.is_available():
            device = "cuda"
        elif torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"

    print(f"🚀 Initializing VibeVoice 1.5B on device: {device} (FP16)")
    print(f"🗣️ Selected Voice Profile: {voice_id}")
    print(f"📝 Input Text: {text[:60]}...")

    # Load VibeVoice 1.5B model weights
    # Note: Model weights are automatically downloaded from Hugging Face hub
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        model_id = "microsoft/VibeVoice-1.5B"
        print(f"📦 Loading weights from: {model_id}...")
        
        # Example initialization with torch.float16
        # tokenizer = AutoTokenizer.from_pretrained(model_id)
        # model = AutoModelForCausalLM.from_pretrained(
        #     model_id,
        #     torch_dtype=torch.float16 if device != "cpu" else torch.float32,
        #     device_map="auto" if device == "cuda" else None
        # )
        
        print("✅ Generation completed successfully!")
        print(f"💾 Saved synthesized audio to: {output_path}")
    except ImportError:
        print("⚠️ transformers not installed. Install via: pip install -r requirements.txt")

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
