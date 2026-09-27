# 🎙️ ACS — Audio Craft Studio (LongScript TTS & Audio Production DAW)

[![GitHub Repository](https://img.shields.io/badge/GitHub-ACS--Audio--Craft--Studio-indigo?logo=github)](https://github.com/sabarishmettu/ACS--Audio-Craft-Studio-.git)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VibeVoice: 1.5B & 7B](https://img.shields.io/badge/VibeVoice-1.5B%20%7C%207B-purple.svg)]()
[![Gemini TTS: 3.1 Flash](https://img.shields.io/badge/Gemini%20TTS-3.1%20Flash%20%2F%20Lite-emerald.svg)]()

**ACS (Audio Craft Studio)** is an advanced, production-grade text-to-speech (TTS) studio and multi-track Digital Audio Workstation (DAW) tailored for YouTube manhwa recaps, web novel narrations, long-form audio dramas, audiobooks, and cinematic podcasts.

---

## 📸 Studio Interface Preview

<div align="center">

### 1. Studio Workspace & Intelligent Script Partitioning
<img src="./Image%20references%20for%20README%20file%20Github/Screenshot%202026-09-27%20133305.png" alt="ACS Studio Workspace & Script Chunks" width="100%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" />

<br/><br/>

### 2. Multi-Track Studio DAW Audio Timeline & Transport Engine
<img src="./Image%20references%20for%20README%20file%20Github/Screenshot%202026-09-27%20134239.png" alt="ACS Multi-Track DAW Timeline & Audio Sequencer" width="100%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" />

</div>

---

## 🌟 Key Features

- ⚡ **Multi-Model Neural Acoustic Engines**:
  - **VibeVoice 7B Flagship**: 7-Billion parameter acoustic architecture for deep cinematic presence, dramatic nuances, natural breathing (`<breath>`, `<gasp>`), and multi-speaker dialogue acting.
  - **VibeVoice 1.5B Fast**: Lightweight 1.5B conversational acoustic model for low-latency, high-throughput narration on consumer laptops and creator rigs.
  - **Gemini 3.1 Flash Lite TTS**: Fast, cost-efficient cloud narration engine optimized for 2–4 hour scripts.
  - **Gemini 3.1 Flash TTS**: Flagship expressive cloud speech synthesis with deep voice acting and emotional metadata.
  - **Local Web Voice Engine**: 100% offline, unlimited client-side speech synthesis with zero cloud quota limits.

- 🎭 **Official VibeVoice Voice Profiles**:
  - `en-Alice_woman` (English - Female / Expressive Storyteller)
  - `en-Carter_man` (English - Male / Dynamic Narration)
  - `en-Frank_man` (English - Male / Deep Cinematic Authority)
  - `en-Mary_woman_bgm` *(English - Female with embedded background music)*
  - `en-Maya_woman` (English - Female / Warm Natural Audiobook Narrator)
  - `in-Samuel_man` (Indian English - Male / Clear International Diction)
  - `zh-Anchen_man_bgm` *(Chinese - Male with cinematic background orchestration)*
  - `zh-Bowen_man` (Chinese - Male / Crisp Pacing)
  - `zh-Xinran_woman` (Chinese - Female / Gentle & Melodic)

- 📜 **Intelligent Script Chunking & Directing**:
  - Split entire chapters or full 2–4 hour scripts by paragraph, word count, sentence, or natural dialogue pauses.
  - Multi-track timeline DAW with waveform visualizers, real-time playback, chunk-by-chunk regeneration, and silence interval tuning.

- 🧬 **Custom WAV Voice Cloning & AI Prompting**:
  - Upload short WAV/MP3 reference samples to extract vocal timbre, tone, cadence, and generate custom character voices.

- 🎛️ **Master Audio Merging & ZIP Export**:
  - Merge all generated chunks into a single gapless master WAV file.
  - Batch download individual chunk audio files inside a structured `.zip` archive.

- 💾 **Full Project Management**:
  - Save, load, and manage projects locally with custom templates, genre presets, and persistent project history.

---

## 🖥️ Local Computing Power & Hardware Requirements

| Feature / Model | **VibeVoice 1.5B (Fast)** | **VibeVoice 7B (Flagship)** |
| :--- | :--- | :--- |
| **Model Disk Size** | ~3.2 GB (FP16) / ~1.8 GB (INT8) | ~14.5 GB (FP16) / ~7.5 GB (INT8 / 4-bit) |
| **Minimum GPU VRAM** | **4 GB VRAM** (RTX 3050, GTX 1660, Apple M1 8GB) | **12 GB VRAM** (RTX 3060 12GB, RTX 4070, Apple M1 Pro 16GB) |
| **Recommended GPU VRAM** | **6 GB – 8 GB VRAM** (RTX 3060/4060, Apple M2 16GB) | **16 GB – 24 GB VRAM** (RTX 4080/4090, A10G, Apple M3 Max) |
| **System Memory (RAM)** | **8 GB – 16 GB** | **16 GB – 32 GB** |
| **Storage Required** | ~5 GB SSD Space | ~20 GB Fast NVMe SSD |
| **Inference Speed** | **Ultra Fast** (~15x–25x Realtime) | **Cinematic High-Fidelity** (~5x–12x Realtime) |
| **Quantization Formats** | FP16, BF16, INT8, INT4 (AWQ/GGUF) | FP16, BF16, INT8, INT4, GPTQ, AWQ |
| **CPU-Only Fallback** | Supported (Intel i5/i7, AMD Ryzen 5/7) | Slow on pure CPU (Multi-core 64-bit recommended) |

> 💡 **Note on Low-VRAM GPUs**: For graphics cards with 8GB to 12GB VRAM running the 7B model, enable INT8 or 4-bit quantization using `bitsandbytes` (included in `requirements.txt`).

---

## 🚀 Quick Start & Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/sabarishmettu/ACS--Audio-Craft-Studio-.git
cd ACS--Audio-Craft-Studio-
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Set Up Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit `.env` to configure your settings:
```env
PORT=3000

# Optional: For Gemini 3.1 Flash / Flash Lite Cloud TTS & Custom Voice Cloning
GEMINI_API_KEY=your_google_gemini_api_key_here
```
*(Get a free API key at [Google AI Studio](https://aistudio.google.com/)).*

### Step 4: Launch AudioCraft Studio

#### Option A: One-Click Launcher (Windows)
Simply **double-click [`start.bat`](file:///start.bat)** (or run `./start.ps1` in PowerShell).  
It will automatically:
1. Detect and warm up the local VibeVoice 1.5B GPU backend on port `8000`.
2. Start the AudioCraft Studio studio server on port `3000`.
3. Automatically launch your default web browser directly to **`http://localhost:3000/`**.

#### Option B: Command Line (CLI)
```bash
npm run dev
```
Open **`http://localhost:3000`** in your web browser.

---

## 🐍 Optional: Python Local Weights Server (Self-Hosted Weights)

If you wish to execute local Python PyTorch neural weights directly on your GPU:

```bash
# 1. Create a Python Virtual Environment (Python 3.10+)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install Python Dependencies
pip install -r requirements.txt

# 3. For NVIDIA GPUs (CUDA 12.1+ acceleration)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# 4. Optional: Enable FlashAttention-2 (for 7B Model Speedup)
pip install flash-attn --no-build-isolation
```

---

## 💻 VibeVoice Model Execution Commands (For Every Model Type)

Below are the exact execution commands and Python CLI parameters for running each type of VibeVoice model:

### 1️⃣ VibeVoice 1.5B Fast Model (Consumer GPUs / 4GB–8GB VRAM / Laptops)
```bash
# Standard 1.5B speech synthesis CLI
python scripts/run_vibevoice_1_5b.py \
  --voice en-Alice_woman \
  --text "In the beginning, there was only darkness... Kai opened his eyes slowly." \
  --output output_alice.wav
```

### 2️⃣ VibeVoice 7B Flagship Model (16GB–24GB VRAM / RTX 3090 / 4090 / A10G)
```bash
# Full precision (BFloat16 / FP16) with FlashAttention-2
python scripts/run_vibevoice_7b.py \
  --voice en-Frank_man \
  --text "[dramatic pause] The ancient monarch awakened from a thousand year slumber. <breath>" \
  --output output_monarch_7b.wav
```

### 3️⃣ VibeVoice 7B Quantized (Low-VRAM 8GB–12GB GPUs / RTX 3060 / 4060 / 4070)
```bash
# 4-Bit NF4 Quantization (~4.8 GB VRAM footprint)
python scripts/run_vibevoice_quantized.py \
  --bits 4 \
  --voice en-Alice_woman \
  --text "Kai looked up at the sky. A purple lightning bolt struck the tower." \
  --output output_7b_4bit.wav

# 8-Bit INT8 Quantization (~7.5 GB VRAM footprint)
python scripts/run_vibevoice_quantized.py \
  --bits 8 \
  --voice en-Carter_man \
  --text "System initialized. Welcome to the player ranking interface." \
  --output output_7b_8bit.wav
```

### 4️⃣ VibeVoice on Apple Silicon (M1 / M2 / M3 / M4 Metal Acceleration)
```bash
# Run with Apple MPS (Metal Performance Shaders) backend
PYTORCH_ENABLE_MPS_FALLBACK=1 python scripts/run_vibevoice_1_5b.py \
  --voice en-Maya_woman \
  --text "The journey across the frozen wasteland was fraught with danger."
```

### 5️⃣ VibeVoice Background Music (BGM) Embedding Models
```bash
# English Female narrator with embedded cinematic soundtrack
python scripts/run_vibevoice_7b.py \
  --voice en-Mary_woman_bgm \
  --text "In the grand halls of the royal academy, destiny began to unfold." \
  --output output_bgm_en.wav

# Chinese Male dramatic narrator with orchestral score
python scripts/run_vibevoice_7b.py \
  --voice zh-Anchen_man_bgm \
  --text "风雪交加的夜晚，剑客孤身踏上了复仇之路。" \
  --output output_bgm_zh.wav
```

### 6️⃣ Multi-Speaker & Emotion Punctuation Tag Formatting
VibeVoice natively processes acoustic instruction tags embedded inside scripts:
```bash
python scripts/run_vibevoice_7b.py \
  --voice en-Frank_man \
  --text "[serious] 'Who goes there?' [whispers] he asked in the dark. <gasp> 'It cannot be... You died ten years ago!' <breath>"
```

| Tag Format | Effect |
| :--- | :--- |
| `[dramatic pause]` | Inserts a weighted cinematic tension silence |
| `[whispers]` | Intimate, breathy low-decibel vocal delivery |
| `[excited]` | Rapid tempo, elevated pitch, high enthusiasm |
| `[serious]` | Authoritative, resonant, deep chest resonance |
| `<breath>` | Natural diaphragmatic inhale punctuation |
| `<laugh>` | Conversational chuckling during line delivery |
| `<gasp>` | Sudden breath intake expressing surprise/shock |

### 7️⃣ Run Local VibeVoice API Backend Server (For Studio Web UI Integration)
```bash
# Start FastAPI backend proxying local neural weights
python scripts/run_vibevoice_server.py --port 8000 --model vibevoice-7b
```

### 8️⃣ Docker Container Execution (NVIDIA GPU Container Toolkit)
```bash
# Launch container with full CUDA GPU passthrough
docker run --gpus all -it --rm \
  -p 3000:3000 -p 8000:8000 \
  -v $(pwd):/workspace \
  -w /workspace \
  pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime \
  bash -c "pip install -r requirements.txt && npm install && npm run dev"
```

---

## 📁 Project Structure

```
├── requirements.txt            # Python dependencies for local model inference & PyTorch
├── REQUIREMENTS.md             # Detailed hardware specifications & benchmarks
├── package.json                # Web studio application dependencies & scripts
├── server.ts                   # Backend proxy server for speech synthesis & voice analysis
├── scripts/                    # VibeVoice execution scripts for every model type
│   ├── run_vibevoice_1_5b.py   # Fast 1.5B inference script (CUDA/MPS/CPU)
│   ├── run_vibevoice_7b.py     # 7B Flagship FP16/BF16 script
│   ├── run_vibevoice_quantized.py # 4-bit and 8-bit quantized runner (8-12GB VRAM)
│   └── run_vibevoice_server.py # Local FastAPI HTTP inference server
├── src/
│   ├── components/             # React UI components (DAW timeline, chunks, player, modals)
│   │   ├── StudioHeader.tsx    # Header with Project, Hardware & Settings controls
│   │   ├── HardwareRequirementsModal.tsx # Interactive specs, VibeVoice cmds & setup viewer
│   │   ├── ScriptInputPanel.tsx    # Script input, stats & smart chunking
│   │   ├── ScriptChunksPanel.tsx   # Multi-track chunk inspector & playback
│   │   ├── VoiceSettingsPanel.tsx  # Voice & model selector (filtered by engine)
│   │   ├── MergeAndFinalAudioPanel.tsx # Master track generator & audio player
│   │   └── CustomVoiceUploadModal.tsx  # WAV voice cloning
│   ├── types/tts.ts            # TypeScript interfaces and data models
│   ├── utils/audioUtils.ts     # Voice catalogs, VibeVoice profiles, WAV merging, ZIP
│   └── utils/localVoiceSynth.ts # Offline Web Speech API synthesizers
└── README.md                   # Project documentation
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
