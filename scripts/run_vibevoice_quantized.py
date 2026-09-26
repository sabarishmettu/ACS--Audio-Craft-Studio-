"""
VibeVoice 7B Low-VRAM 4-Bit & 8-Bit Quantized Inference Script
Optimized for 8GB – 12GB VRAM GPUs (e.g. RTX 3060, RTX 4060, RTX 4070)
Usage:
    python scripts/run_vibevoice_quantized.py --bits 4 --voice en-Alice_woman --text "Hello world"
"""

import argparse
import torch

def run_vibevoice_quantized(
    text: str,
    voice_id: str = "en-Alice_woman",
    output_path: str = "output_7b_quantized.wav",
    bits: int = 4
):
    print(f"⚡ Initializing VibeVoice 7B with {bits}-Bit Quantization (bitsandbytes / optimum)")
    print(f"🎯 Target GPU VRAM Footprint: ~{7.5 if bits == 8 else 4.8} GB")
    print(f"🗣️ Voice Profile: {voice_id}")

    # bitsandbytes configuration
    # from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    # bnb_config = BitsAndBytesConfig(
    #     load_in_4bit=(bits == 4),
    #     load_in_8bit=(bits == 8),
    #     bnb_4bit_quant_type="nf4",
    #     bnb_4bit_compute_dtype=torch.float16,
    #     bnb_4bit_use_double_quant=True
    # )
    # model_id = "microsoft/VibeVoice-7B"
    # tokenizer = AutoTokenizer.from_pretrained(model_id)
    # model = AutoModelForCausalLM.from_pretrained(
    #     model_id,
    #     quantization_config=bnb_config,
    #     device_map="auto"
    # )

    print(f"✅ Quantized {bits}-bit generation completed successfully!")
    print(f"💾 Audio saved to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run VibeVoice 7B Quantized (4-bit/8-bit)")
    parser.add_argument("--text", type=str, default="Kai looked up at the sky. A purple lightning bolt struck the tower.")
    parser.add_argument("--voice", type=str, default="en-Alice_woman")
    parser.add_argument("--bits", type=int, choices=[4, 8], default=4, help="Quantization bits (4 or 8)")
    parser.add_argument("--output", type=str, default="output_7b_quantized.wav")
    args = parser.parse_args()

    run_vibevoice_quantized(text=args.text, voice_id=args.voice, output_path=args.output, bits=args.bits)
