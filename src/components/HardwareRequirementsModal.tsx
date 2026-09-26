import React, { useState } from 'react';
import {
  X,
  Cpu,
  Download,
  Check,
  Copy,
  Zap,
  HardDrive,
  Layers,
  Terminal,
  Server,
  Sparkles,
} from 'lucide-react';

interface HardwareRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareRequirementsModal: React.FC<HardwareRequirementsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'commands' | 'setup' | 'requirements_txt'>('matrix');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadRequirementsTxt = () => {
    const content = `# ==============================================================================
# Audio Craft Studio - Python Dependencies & Local Compute Requirements
# ==============================================================================
# Model Architecture Notes:
#  - VibeVoice 1.5B Model: Requires >= 4GB VRAM (FP16/INT8), 8GB System RAM
#  - VibeVoice 7.0B Model: Requires >= 12GB VRAM (INT8/4-bit) or >= 16GB-24GB VRAM (FP16), 16-32GB RAM
# ==============================================================================

torch>=2.2.0
torchaudio>=2.2.0
transformers>=4.40.0
accelerate>=0.29.0
safetensors>=0.4.3
huggingface-hub>=0.22.0
bitsandbytes>=0.43.0
optimum>=1.19.0
soundfile>=0.12.1
scipy>=1.12.0
numpy>=1.26.0
librosa>=0.10.1
pydub>=0.25.1
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
python-multipart>=0.0.9
tqdm>=4.66.0
rich>=13.7.0
requests>=2.31.0
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadRequirementsMd = () => {
    const mdContent = `# 🎙️ Audio Craft Studio — Local Hardware & Compute Requirements

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

## 🚀 Quick Setup Commands
\`\`\`bash
git clone https://github.com/sabarishmettu/ACS--Audio-Craft-Studio-.git
cd ACS--Audio-Craft-Studio-
npm install
npm run dev
\`\`\`
`;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REQUIREMENTS.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-950/50">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Syne',sans-serif]">
                Hardware & Local Compute Requirements
              </h2>
              <p className="text-[11px] text-slate-400">
                Specs, VRAM matrices, and download setup files for VibeVoice 1.5B & 7B models
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 px-6 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>1.5B vs 7B Compute</span>
            </button>

            <button
              onClick={() => setActiveTab('commands')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'commands'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              <span>VibeVoice Commands</span>
            </button>

            <button
              onClick={() => setActiveTab('setup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'setup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Setup & Installation</span>
            </button>

            <button
              onClick={() => setActiveTab('requirements_txt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'requirements_txt'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>requirements.txt</span>
            </button>
          </div>

          {/* Quick Downloads */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadRequirementsTxt}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 text-xs font-medium border border-slate-700 transition-colors"
              title="Download requirements.txt"
            >
              <Download className="h-3 w-3 text-cyan-400" />
              <span>requirements.txt</span>
            </button>
            <button
              onClick={handleDownloadRequirementsMd}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 text-xs font-medium border border-slate-700 transition-colors"
              title="Download REQUIREMENTS.md"
            >
              <Download className="h-3 w-3 text-indigo-400" />
              <span>REQUIREMENTS.md</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col gap-5 text-xs text-slate-300">
          {activeTab === 'matrix' && (
            <div className="flex flex-col gap-5">
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1.5B Card */}
                <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-950 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">VibeVoice 1.5B</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                        Fast & Lightweight
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-cyan-400">Min 4 GB VRAM</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Designed for fast turnaround, creator laptops, and budget workstation GPUs with ultra-fast generation rates.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Min VRAM:</span>
                      <span className="font-bold text-white">4 GB VRAM</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Recommended:</span>
                      <span className="font-bold text-cyan-300">6 GB – 8 GB</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">System RAM:</span>
                      <span className="font-bold text-white">8 GB – 16 GB</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Speed:</span>
                      <span className="font-bold text-emerald-400">~15x–25x Realtime</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Ideal GPUs:</span> RTX 3050 / 3060, GTX 1660 Ti, Apple M1/M2/M3 (8GB–16GB), or fast multi-core CPU.
                  </div>
                </div>

                {/* 7B Card */}
                <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-950 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">VibeVoice 7B Flagship</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                        Deep Cinematic
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-purple-400">Min 12 GB VRAM</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Flagship 7-billion parameter neural acoustic model. Delivers sovereign authority, deep dramatic pauses, and multi-speaker dialogue acting.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Min VRAM:</span>
                      <span className="font-bold text-white">12 GB VRAM (INT8)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Recommended:</span>
                      <span className="font-bold text-purple-300">16 GB – 24 GB</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">System RAM:</span>
                      <span className="font-bold text-white">16 GB – 32 GB</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Speed:</span>
                      <span className="font-bold text-indigo-300">~5x–12x Realtime</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Ideal GPUs:</span> RTX 3060 (12GB), RTX 4070 / 4080 / 4090 (16-24GB), RTX A5000/A10G, or Apple M1/M2/M3 Max (36GB+).
                  </div>
                </div>
              </div>

              {/* Hardware Comparison Table */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Full Technical Specification Matrix
                </h3>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                        <th className="p-2.5">Specification</th>
                        <th className="p-2.5 text-cyan-300">VibeVoice 1.5B</th>
                        <th className="p-2.5 text-purple-300">VibeVoice 7B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      <tr>
                        <td className="p-2.5 font-medium text-slate-300">Weights Disk Footprint</td>
                        <td className="p-2.5 text-slate-300">~3.2 GB (FP16) / ~1.8 GB (INT8)</td>
                        <td className="p-2.5 text-slate-300">~14.5 GB (FP16) / ~7.5 GB (INT8)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-300">Minimum GPU VRAM</td>
                        <td className="p-2.5 text-emerald-400 font-bold">4 GB VRAM</td>
                        <td className="p-2.5 text-amber-400 font-bold">12 GB VRAM (or 4-bit)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-300">Optimal GPU VRAM</td>
                        <td className="p-2.5 text-slate-300">6 GB – 8 GB</td>
                        <td className="p-2.5 text-slate-300">16 GB – 24 GB</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-300">System Memory (RAM)</td>
                        <td className="p-2.5 text-slate-300">8 GB – 16 GB</td>
                        <td className="p-2.5 text-slate-300">16 GB – 32 GB</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-300">Quantization Formats</td>
                        <td className="p-2.5 text-slate-300">FP16, BF16, INT8, INT4, AWQ, GGUF</td>
                        <td className="p-2.5 text-slate-300">FP16, BF16, INT8, INT4, GPTQ, AWQ</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-300">Parallel Batch Processing</td>
                        <td className="p-2.5 text-slate-300">Up to 8 concurrent chunks</td>
                        <td className="p-2.5 text-slate-300">Up to 4 concurrent chunks on 24GB</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="flex flex-col gap-4">
              {/* 1.5B Command */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300 font-mono text-[11px] flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    <span>1. VibeVoice 1.5B Fast Model (Consumer GPUs & Laptops)</span>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `python scripts/run_vibevoice_1_5b.py --voice en-Alice_woman --text "In the beginning, there was only darkness..." --output output_1_5b.wav`,
                        'cmd_15b'
                      )
                    }
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors"
                  >
                    {copiedSection === 'cmd_15b' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                    <span>{copiedSection === 'cmd_15b' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <code>python scripts/run_vibevoice_1_5b.py --voice en-Alice_woman --text "In the beginning, there was only darkness..." --output output_1_5b.wav</code>
                </div>
              </div>

              {/* 7B Flagship Command */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-300 font-mono text-[11px] flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    <span>2. VibeVoice 7B Flagship (BFloat16 / FlashAttention-2 / &gt;=16GB VRAM)</span>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `python scripts/run_vibevoice_7b.py --voice en-Frank_man --text "[dramatic pause] The monarch awakened from a thousand year slumber. <breath>" --output output_7b.wav`,
                        'cmd_7b'
                      )
                    }
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors"
                  >
                    {copiedSection === 'cmd_7b' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                    <span>{copiedSection === 'cmd_7b' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <code>python scripts/run_vibevoice_7b.py --voice en-Frank_man --text "[dramatic pause] The monarch awakened from a thousand year slumber. &lt;breath&gt;" --output output_7b.wav</code>
                </div>
              </div>

              {/* 7B Quantized 4-Bit & 8-Bit */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300 font-mono text-[11px] flex items-center gap-1.5">
                    <Cpu className="h-3 w-3" />
                    <span>3. VibeVoice 7B 4-Bit & 8-Bit Quantized (8GB–12GB VRAM / RTX 3060 / 4060)</span>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `python scripts/run_vibevoice_quantized.py --bits 4 --voice en-Alice_woman --text "Kai looked up at the sky. A purple lightning bolt struck the tower." --output output_7b_4bit.wav`,
                        'cmd_quant'
                      )
                    }
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors"
                  >
                    {copiedSection === 'cmd_quant' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                    <span>{copiedSection === 'cmd_quant' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <code>python scripts/run_vibevoice_quantized.py --bits 4 --voice en-Alice_woman --text "Kai looked up at the sky." --output output_7b_4bit.wav</code>
                </div>
              </div>

              {/* Apple Metal & BGM models */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-[11px]">Apple Silicon Metal (MPS)</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `PYTORCH_ENABLE_MPS_FALLBACK=1 python scripts/run_vibevoice_1_5b.py --voice en-Maya_woman`,
                          'cmd_mps'
                        )
                      }
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      {copiedSection === 'cmd_mps' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-[10px] font-mono text-slate-400 truncate">
                    PYTORCH_ENABLE_MPS_FALLBACK=1 python scripts/run_vibevoice_1_5b.py
                  </code>
                </div>

                <div className="flex flex-col gap-1 rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-[11px]">BGM Music Score Persona</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `python scripts/run_vibevoice_7b.py --voice en-Mary_woman_bgm --text "In the grand halls of destiny."`,
                          'cmd_bgm'
                        )
                      }
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      {copiedSection === 'cmd_bgm' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-[10px] font-mono text-slate-400 truncate">
                    python scripts/run_vibevoice_7b.py --voice en-Mary_woman_bgm
                  </code>
                </div>
              </div>

              {/* Local Server Command */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300 font-mono text-[11px]">
                    4. Start Local FastAPI Inference Server (HTTP Port 8000)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `python scripts/run_vibevoice_server.py --port 8000 --model vibevoice-7b`,
                        'cmd_server'
                      )
                    }
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors"
                  >
                    {copiedSection === 'cmd_server' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                    <span>{copiedSection === 'cmd_server' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <code>python scripts/run_vibevoice_server.py --port 8000 --model vibevoice-7b</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Quick Local App Setup (Node.js & Vite)
                </h3>
                <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-slate-200">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `git clone https://github.com/sabarishmettu/ACS--Audio-Craft-Studio-.git\ncd ACS--Audio-Craft-Studio-\nnpm install\nnpm run dev`,
                        'app_setup'
                      )
                    }
                    className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[10px] text-slate-300 transition-colors"
                  >
                    {copiedSection === 'app_setup' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                    <span>{copiedSection === 'app_setup' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <pre className="overflow-x-auto leading-relaxed">
{`# 1. Clone repository
git clone https://github.com/sabarishmettu/ACS--Audio-Craft-Studio-.git
cd ACS--Audio-Craft-Studio-

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev`}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Python GPU Engine Setup (Optional for Direct Neural Inference)
                </h3>
                <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-slate-200">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `python3 -m venv venv\nsource venv/bin/activate\npip install -r requirements.txt\npip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121`,
                        'py_setup'
                      )
                    }
                    className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[10px] text-slate-300 transition-colors"
                  >
                    {copiedSection === 'py_setup' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                    <span>{copiedSection === 'py_setup' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <pre className="overflow-x-auto leading-relaxed">
{`# 1. Create Virtual Environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# 2. Install requirements
pip install -r requirements.txt

# 3. Install PyTorch with CUDA 12.1+ acceleration
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requirements_txt' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  requirements.txt File Preview
                </h3>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `torch>=2.2.0\ntorchaudio>=2.2.0\ntransformers>=4.40.0\naccelerate>=0.29.0\nsafetensors>=0.4.3\nhuggingface-hub>=0.22.0\nbitsandbytes>=0.43.0\noptimum>=1.19.0\nsoundfile>=0.12.1\nscipy>=1.12.0\nnumpy>=1.26.0\nlibrosa>=0.10.1\npydub>=0.25.1\nfastapi>=0.110.0\nuvicorn[standard]>=0.29.0\npydantic>=2.7.0\npython-multipart>=0.0.9\ntqdm>=4.66.0\nrich>=13.7.0\nrequests>=2.31.0`,
                      'req_txt'
                    )
                  }
                  className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[10px] text-slate-300 transition-colors"
                >
                  {copiedSection === 'req_txt' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-slate-400" />
                  )}
                  <span>{copiedSection === 'req_txt' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-72 scrollbar-thin">
                <pre>{`# ==============================================================================
# Audio Craft Studio - Python Dependencies & Local Compute Requirements
# ==============================================================================
# Model Architecture Notes:
#  - VibeVoice 1.5B Model: Requires >= 4GB VRAM (FP16/INT8), 8GB System RAM
#  - VibeVoice 7.0B Model: Requires >= 12GB VRAM (INT8/4-bit) or >= 16GB-24GB VRAM (FP16), 16-32GB RAM
# ==============================================================================

torch>=2.2.0
torchaudio>=2.2.0
transformers>=4.40.0
accelerate>=0.29.0
safetensors>=0.4.3
huggingface-hub>=0.22.0
bitsandbytes>=0.43.0
optimum>=1.19.0
soundfile>=0.12.1
scipy>=1.12.0
numpy>=1.26.0
librosa>=0.10.1
pydub>=0.25.1
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
python-multipart>=0.0.9
tqdm>=4.66.0
rich>=13.7.0
requests>=2.31.0`}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3.5 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
            <span>Files available in project root: <code className="text-cyan-300">requirements.txt</code> and <code className="text-indigo-300">REQUIREMENTS.md</code></span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 text-xs font-semibold shadow-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
