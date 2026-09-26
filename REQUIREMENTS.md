# 🎙️ Audio Craft Studio — Local Hardware & Compute Requirements

This document outlines the **system hardware requirements**, **VRAM specifications**, and **setup instructions** for running **VibeVoice 1.5B**, **VibeVoice 7B**, and **Audio Craft Studio** on local workstations or cloud GPU instances.

---

## 🖥️ Local Computing Power & VRAM Matrix

| Feature / Model | **VibeVoice 1.5B (Fast)** | **VibeVoice 7B (Flagship)** |
| :--- | :--- | :--- |
| **Model Size** | ~3.2 GB (FP16) / ~1.8 GB (INT8) | ~14.5 GB (FP16) / ~7.5 GB (INT8/4-bit) |
| **Minimum GPU VRAM** | **4 GB VRAM** (RTX 3050 / GTX 1660 / Apple M1 8GB) | **12 GB VRAM** (RTX 3060 12GB / RTX 4070 / Apple M1 Pro 16GB) |
| **Recommended GPU VRAM** | **6 GB – 8 GB VRAM** (RTX 3060 / 4060 / Apple M2 16GB) | **16 GB – 24 GB VRAM** (RTX 4080 / 4090 / A10G / Apple M3 Max) |
| **System RAM** | **8 GB – 16 GB** | **16 GB – 32 GB** |
| **Storage Required** | ~5 GB SSD Space | ~20 GB Fast NVMe SSD |
| **Inference Speed** | **Ultra Fast** (~15x–25x Realtime) | **Cinematic High-Fidelity** (~5x–12x Realtime) |
| **Quantization Support** | FP16, BF16, INT8, INT4 (AWQ/GGUF) | FP16, BF16, INT8, INT4, GPTQ |
| **CPU-Only Fallback** | Supported (Intel Core i5/i7, AMD Ryzen 5/7) | Slow on pure CPU (64-bit multi-core recommended) |
| **Supported Backends** | PyTorch, ONNX Runtime, WebGPU, Apple Metal (MPS) | PyTorch (CUDA/ROCm), vLLM, TensorRT-LLM, Apple MPS |

---

## ⚡ Hardware Breakdown by Machine Type

### 1. 🟢 Entry-Level / Laptop (Budget Tier)
- **Target Model**: **VibeVoice 1.5B** or **Local Web Voice Engine**
- **GPU**: NVIDIA RTX 3050 / 4050 (4GB–6GB VRAM) or Apple M1 / M2 / M3 (8GB Unified Memory)
- **Settings**: Use INT8 or 4-bit AWQ quantization.
- **Generation Performance**: Smooth, low-latency audio synthesis for scripts up to 2 hours.

### 2. 🔵 Mid-Tier Creator Rig (Recommended)
- **Target Model**: **VibeVoice 1.5B** and **VibeVoice 7B (4-bit / 8-bit)**
- **GPU**: NVIDIA RTX 3060 12GB / RTX 4060 Ti 16GB / RTX 4070 (12GB) or Apple M1/M2/M3 Pro (18GB–36GB)
- **Settings**: FP16 for 1.5B, INT8/INT4 for 7B.
- **Generation Performance**: Exceptional quality, multi-speaker dialogue synthesis, fast batch generation.

### 3. 🟣 High-End Studio Workstation / Cloud Instance
- **Target Model**: **VibeVoice 7B Full Precision (FP16 / BF16)** + Gemini 3.1 Studio
- **GPU**: NVIDIA RTX 3090 / 4090 (24GB VRAM) or NVIDIA A10G / A100 / Apple M2/M3 Max (64GB+)
- **Settings**: Full FP16/BF16 with FlashAttention-2 enabled.
- **Generation Performance**: Peak fidelity with instant parallel multi-chunk rendering and zero compression artifacts.

---

## 🚀 Quick Setup & Installation Guide

### Prerequisites
1. **Node.js** (v18.0.0 or higher) & **npm** / **bun**
2. *(Optional for local Python neural engine)*: **Python 3.10+** and **CUDA 12.1+** (for NVIDIA GPUs)

### Step 1: Clone the Repository
```bash
git clone https://github.com/sabarishmettu/ACS--Audio-Craft-Studio-.git
cd ACS--Audio-Craft-Studio-
```

### Step 2: Install App Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Port for the Node.js dev server
PORT=3000

# Optional: Google Gemini API Key (if utilizing Gemini 3.1 Flash / Flash Lite cloud engines)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 4: Launch the Studio
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🐍 Optional: Setting Up Local Python Model Server (For Self-Hosted VibeVoice Weights)

If you wish to host local PyTorch weights on your own GPU:

```bash
# 1. Create a Python Virtual Environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install Python Dependencies
pip install -r requirements.txt

# 3. For NVIDIA GPUs (CUDA 12.1+ acceleration)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# 4. Optional: Enable FlashAttention-2 for 7B Model
pip install flash-attn --no-build-isolation
```

---

## 💻 VibeVoice Model Execution Commands (Every Type)

### Type A: VibeVoice 1.5B Fast Model (PyTorch / GPU / CPU / MPS)
```bash
python scripts/run_vibevoice_1_5b.py \
  --voice en-Alice_woman \
  --text "In the beginning, there was only darkness... Kai opened his eyes slowly." \
  --output output_alice.wav
```

### Type B: VibeVoice 7B Flagship (BFloat16 / FlashAttention-2 / >=16GB VRAM)
```bash
python scripts/run_vibevoice_7b.py \
  --voice en-Frank_man \
  --text "[dramatic pause] The ancient monarch awakened from a thousand year slumber. <breath>" \
  --output output_monarch_7b.wav
```

### Type C: VibeVoice 7B Low-VRAM 4-Bit & 8-Bit Quantized (8GB–12GB VRAM GPUs)
```bash
# 4-Bit NF4 Quantization (RTX 3060 12GB / RTX 4060 / 4070)
python scripts/run_vibevoice_quantized.py --bits 4 --voice en-Alice_woman --output output_7b_4bit.wav

# 8-Bit INT8 Quantization (RTX 3060 12GB / RTX 4070)
python scripts/run_vibevoice_quantized.py --bits 8 --voice en-Carter_man --output output_7b_8bit.wav
```

### Type D: Apple Silicon Metal Acceleration (M1/M2/M3/M4 Macs)
```bash
PYTORCH_ENABLE_MPS_FALLBACK=1 python scripts/run_vibevoice_1_5b.py \
  --voice en-Maya_woman \
  --text "The journey across the frozen wasteland was fraught with danger."
```

### Type E: Background Music (BGM) Embedding Models
```bash
# English Female + Ambient BGM
python scripts/run_vibevoice_7b.py --voice en-Mary_woman_bgm --text "Destiny begins now."

# Chinese Male + Orchestral BGM
python scripts/run_vibevoice_7b.py --voice zh-Anchen_man_bgm --text "风雪交加的夜晚，剑客孤身踏上了复仇之路。"
```

### Type F: Local FastAPI Server Mode
```bash
python scripts/run_vibevoice_server.py --port 8000 --model vibevoice-7b
```

---

## 📁 Included Project Files
- `package.json`: Web application, React SPA, Tailwind CSS, and Node.js server dependencies.
- `requirements.txt`: Python pip dependencies for local GPU inference.
- `REQUIREMENTS.md`: Detailed hardware benchmarks and system requirements.
- `scripts/`: Ready-to-run Python inference runners for 1.5B, 7B, 4-bit/8-bit, and local FastAPI server.
