/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudioHeader } from './components/StudioHeader';
import { ScriptInputPanel } from './components/ScriptInputPanel';
import { ScriptChunksPanel } from './components/ScriptChunksPanel';
import { VoiceSettingsPanel } from './components/VoiceSettingsPanel';
import { GenerationQueuePanel } from './components/GenerationQueuePanel';
import { MergeAndFinalAudioPanel } from './components/MergeAndFinalAudioPanel';
import { AudioTimelineDAW } from './components/AudioTimelineDAW';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { CustomVoiceUploadModal } from './components/CustomVoiceUploadModal';
import { ProjectBrowserModal } from './components/ProjectBrowserModal';
import { NewProjectModal } from './components/NewProjectModal';
import { SaveProjectModal } from './components/SaveProjectModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { HardwareRequirementsModal } from './components/HardwareRequirementsModal';
import { ScriptChunk, VoiceOption, MasterTrack } from './types/tts';
import { GEMINI_VOICES, VIBEVOICE_PROFILES, downloadAllChunksZip } from './utils/audioUtils';
import { SavedProject, saveProjectToStorage } from './utils/projectManager';
import { synthesizeLocalWebVoice, detectVoiceGender } from './utils/localVoiceSynth';

const DEFAULT_MANHWA_SCRIPT = `Prologue
In the beginning, there was only darkness...
No light, no sound, no time — just an endless void
where the laws of the world did not exist.

But from that void, a single will emerged.
A will that was never meant to be,
yet a will that would change everything.

Chapter 1: The Boy Who Was Forgotten
The cold wind blew through the ruined village,
carrying with it the scent of ash and blood.
Among the broken houses, a young boy lay on the ground,
his body covered in wounds.
His name was Kai.
Once the heir of a proud family,
now nothing more than a discarded existence.

He opened his eyes slowly,
the pain in his chest sharper than ever.
"...So this is how it ends," he whispered.

Chapter 2: The Awakening of the Black Core
Deep within Kai's soul, an ancient sigil began to glow in violet radiance.
The whispers of primordial shadow monarchs echoed across the realm:
"Rise, Kai. Your ascension has only just begun."`;

export default function App() {
  // Master Script & Settings
  const [script, setScript] = useState<string>(DEFAULT_MANHWA_SCRIPT);
  const [customVoices, setCustomVoices] = useState<VoiceOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('vibevoice-1.5b');
  const [currentVoice, setCurrentVoice] = useState<string>('en-Alice_woman');
  const [language, setLanguage] = useState<string>('English');
  const [style, setStyle] = useState<string>('Narrative');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [voicePrompt, setVoicePrompt] = useState<string>(
    'Read this as a dramatic YouTube manhwa recap narrator. Keep the delivery engaging, natural, confident, and conversational. Avoid sounding robotic.'
  );

  // Compute model-specific voices (VibeVoice profiles when VibeVoice is selected; Gemini profiles when Gemini is selected)
  const activeVoices = React.useMemo(() => {
    if (selectedModel.startsWith('vibevoice')) {
      return VIBEVOICE_PROFILES;
    }
    if (selectedModel.startsWith('gemini')) {
      return [...GEMINI_VOICES, ...customVoices];
    }
    return [...VIBEVOICE_PROFILES, ...GEMINI_VOICES, ...customVoices];
  }, [selectedModel, customVoices]);

  // Model selection handler ensuring voice synchronization
  const handleSelectModel = (newModel: string) => {
    setSelectedModel(newModel);
    if (newModel.startsWith('vibevoice')) {
      const isCurrentVibe = VIBEVOICE_PROFILES.some((v) => v.id === currentVoice);
      if (!isCurrentVibe) {
        setCurrentVoice('en-Alice_woman');
      }
    } else if (newModel.startsWith('gemini')) {
      const isCurrentGemini = GEMINI_VOICES.some((v) => v.id === currentVoice) || customVoices.some((v) => v.id === currentVoice);
      if (!isCurrentGemini) {
        setCurrentVoice('Aster');
      }
    }
  };

  // Chunks State
  const [chunks, setChunks] = useState<ScriptChunk[]>([]);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);

  // Queue State
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);
  const [currentlyGeneratingId, setCurrentlyGeneratingId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const queueRunningRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Rate-limit Cooldown Countdown Timer
  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Master Track State
  const [masterTrack, setMasterTrack] = useState<MasterTrack | null>(null);
  const [isMerging, setIsMerging] = useState<boolean>(false);

  // UI Modals & Settings
  const [projectName, setProjectName] = useState<string>('Shadow Monarch Ascension - Manhwa Voiceover');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isSaveProjectModalOpen, setIsSaveProjectModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCustomVoiceModalOpen, setIsCustomVoiceModalOpen] = useState<boolean>(false);
  const [isProjectBrowserOpen, setIsProjectBrowserOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleAddCustomVoice = (newVoice: VoiceOption) => {
    setCustomVoices((prev) => [newVoice, ...prev.filter((v) => v.id !== newVoice.id)]);
    setCurrentVoice(newVoice.id);
    if (newVoice.customPrompt) {
      setVoicePrompt(newVoice.customPrompt);
    }
    showToast(`Custom voice "${newVoice.name}" added and activated!`, 'success');
  };

  // Sync queue timer
  useEffect(() => {
    queueRunningRef.current = isQueueRunning;
    if (isQueueRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isQueueRunning]);

  // Fetch Voice catalog on mount
  useEffect(() => {
    fetch('/api/tts/voices')
      .then((res) => res.json())
      .catch((err) => console.warn('Using default voice catalog:', err));
  }, []);

  // Split Script into chunks function
  const handleSplitIntoChunks = useCallback(
    async (preset = 'Medium (Recommended)', maxChars = 2000, smartSplit = true) => {
      if (!script.trim()) {
        showToast('Please enter or paste a script to partition.', 'error');
        return;
      }

      setIsSplitting(true);
      try {
        const response = await fetch('/api/tts/split-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script,
            mode: smartSplit ? 'smart-words' : 'paragraph',
            targetWords: Math.round(maxChars / 6),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to split script.');
        }

        const data = await response.json();
        if (data.chunks && Array.isArray(data.chunks)) {
          const formattedChunks: ScriptChunk[] = data.chunks.map((c: any, i: number) => ({
            id: `chunk-${i + 1}`,
            index: i + 1,
            text: c.text,
            characterCount: c.text.length,
            wordCount: c.wordCount || c.text.split(/\s+/).filter(Boolean).length,
            audioUrl: null,
            audioBase64: null,
            rawPcmBase64: null,
            duration: Math.round((c.text.split(/\s+/).filter(Boolean).length / 2.5) * 10) / 10,
            status: 'not_generated',
            progress: 0,
            error: null,
          }));

          setChunks(formattedChunks);
          setMasterTrack(null);
          showToast(`Partitioned into ${formattedChunks.length} chunks. Ready to generate audio!`, 'success');
        }
      } catch (err: any) {
        console.error('Split error:', err);
        showToast(err?.message || 'Error splitting script.', 'error');
      } finally {
        setIsSplitting(false);
      }
    },
    [script]
  );

  // Initialize initial chunks on mount
  useEffect(() => {
    handleSplitIntoChunks('Medium (Recommended)', 2000, true);
  }, []);

  // Generate a single chunk (Routes to Gemini TTS or Local Web Voice based on selectedModel)
  const handleGenerateChunk = async (chunkId: string) => {
    const chunk = chunks.find((c) => c.id === chunkId);
    if (!chunk || !chunk.text.trim()) return;

    // If user selected Local Web Voice model in Voice Settings
    if (selectedModel === 'local-web-voice') {
      await handleSynthesizeLocalWebVoice(chunkId);
      return;
    }

    setChunks((prev) =>
      prev.map((c) =>
        c.id === chunkId ? { ...c, status: 'generating', progress: 35, error: null } : c
      )
    );
    setCurrentlyGeneratingId(chunkId);

    // Simulate progress
    const progressTimer = setInterval(() => {
      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId && c.status === 'generating'
            ? { ...c, progress: Math.min(92, (c.progress || 35) + 15) }
            : c
        )
      );
    }, 350);

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkId,
          text: chunk.text,
          voice: chunk.selectedVoice || currentVoice,
          model: selectedModel,
          stylePrompt: chunk.stylePrompt || voicePrompt,
        }),
      });

      const data = await response.json();
      clearInterval(progressTimer);

      if (!response.ok || data.error) {
        if (response.status === 429 || data.isRateLimited) {
          const waitSecs = data.retryAfterSeconds || 45;
          setCooldownSeconds(waitSecs);
          throw new Error(`Rate limit cooldown (${waitSecs}s). Wait for countdown or switch model to Local Web Voice in Voice Settings.`);
        }
        throw new Error(data.error || 'Speech synthesis failed.');
      }

      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId
            ? {
                ...c,
                audioBase64: data.audioBase64,
                audioUrl: data.audioUrl,
                rawPcmBase64: data.rawPcmBase64,
                duration: data.duration,
                selectedVoice: data.voice || currentVoice,
                status: 'generated',
                progress: 100,
                error: null,
              }
            : c
        )
      );
      showToast(`Chunk #${String(chunk.index).padStart(3, '0')} generated! Appears in timeline.`, 'success');
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error(`Chunk ${chunkId} failed:`, err);
      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId
            ? { ...c, status: 'failed', error: err?.message || 'Synthesis failed.' }
            : c
        )
      );
      showToast(`Chunk #${chunk.index} failed: ${err?.message}`, 'error');
    } finally {
      setCurrentlyGeneratingId(null);
    }
  };

  // Instant Local Web Voice fallback
  const handleSynthesizeLocalWebVoice = async (chunkId: string) => {
    const chunk = chunks.find((c) => c.id === chunkId);
    if (!chunk || !chunk.text.trim()) return;

    setChunks((prev) =>
      prev.map((c) =>
        c.id === chunkId ? { ...c, status: 'generating', progress: 50, error: null } : c
      )
    );
    setCurrentlyGeneratingId(chunkId);

    try {
      const activeVoiceObj = activeVoices.find((v) => v.id === currentVoice) || activeVoices.find((v) => v.id === chunk.selectedVoice);
      const gender = detectVoiceGender(activeVoiceObj?.id || currentVoice, activeVoiceObj?.gender);
      const result = await synthesizeLocalWebVoice(chunk.text, gender, speed, 1.0 + pitch / 10, activeVoiceObj?.id || currentVoice);

      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId
            ? {
                ...c,
                audioBase64: result.audioBase64,
                audioUrl: result.audioUrl,
                duration: result.duration,
                status: 'generated',
                progress: 100,
                error: null,
                selectedVoice: `${activeVoiceObj?.name || currentVoice} (Local Offline)`,
                pitch: pitch,
                speed: speed,
              }
            : c
        )
      );
      showToast(`Chunk #${String(chunk.index).padStart(3, '0')} generated with ${activeVoiceObj?.name || 'Local Voice'} (${gender})!`, 'success');
    } catch (err: any) {
      console.error('Local synth error:', err);
      setChunks((prev) =>
        prev.map((c) =>
          c.id === chunkId ? { ...c, status: 'failed', error: err?.message || 'Local synth failed.' } : c
        )
      );
      showToast(`Local synth failed: ${err?.message}`, 'error');
    } finally {
      setCurrentlyGeneratingId(null);
    }
  };

  // Synthesize all missing or failed chunks with Local Web Voice
  const handleSynthesizeAllMissingLocal = async () => {
    const targets = chunks.filter((c) => c.status !== 'generated');
    if (targets.length === 0) {
      showToast('All chunks are already generated.', 'info');
      return;
    }
    showToast(`Synthesizing ${targets.length} chunks with Local Voice...`, 'info');
    for (const c of targets) {
      await handleSynthesizeLocalWebVoice(c.id);
      await new Promise((r) => setTimeout(r, 200));
    }
    showToast('All chunks synthesized successfully!', 'success');
  };

  // Cancel chunk generation
  const handleCancelChunk = (chunkId: string) => {
    setChunks((prev) =>
      prev.map((c) =>
        c.id === chunkId ? { ...c, status: 'not_generated', progress: 0 } : c
      )
    );
    if (currentlyGeneratingId === chunkId) {
      setCurrentlyGeneratingId(null);
    }
    showToast('Cancelled chunk generation.', 'info');
  };

  // Batch Queue Engine
  const handleStartQueue = async () => {
    if (chunks.length === 0) {
      showToast('No chunks to generate.', 'error');
      return;
    }

    setIsQueueRunning(true);
    queueRunningRef.current = true;
    showToast('Starting sequential generation queue...', 'info');

    for (let i = 0; i < chunks.length; i++) {
      if (!queueRunningRef.current) break;
      const c = chunks[i];
      if (c.status !== 'generated') {
        await handleGenerateChunk(c.id);
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    setIsQueueRunning(false);
    queueRunningRef.current = false;
    showToast('Batch queue completed!', 'success');
  };

  const handlePauseQueue = () => {
    setIsQueueRunning(false);
    queueRunningRef.current = false;
    showToast('Queue paused.', 'info');
  };

  const handleStopQueue = () => {
    setIsQueueRunning(false);
    queueRunningRef.current = false;
    showToast('Queue stopped.', 'info');
  };

  const handleGenerateMissing = async () => {
    const missing = chunks.filter((c) => c.status === 'not_generated');
    if (missing.length === 0) {
      showToast('No missing chunks found.', 'info');
      return;
    }
    setIsQueueRunning(true);
    queueRunningRef.current = true;
    for (const c of missing) {
      if (!queueRunningRef.current) break;
      await handleGenerateChunk(c.id);
      await new Promise((r) => setTimeout(r, 400));
    }
    setIsQueueRunning(false);
  };

  const handleRetryFailed = async () => {
    const failed = chunks.filter((c) => c.status === 'failed');
    if (failed.length === 0) {
      showToast('No failed chunks to retry.', 'info');
      return;
    }
    setIsQueueRunning(true);
    queueRunningRef.current = true;
    for (const c of failed) {
      if (!queueRunningRef.current) break;
      await handleGenerateChunk(c.id);
      await new Promise((r) => setTimeout(r, 400));
    }
    setIsQueueRunning(false);
  };

  // Merge Audio into continuous master track
  const handleMergeAudio = async () => {
    const readyChunks = chunks.filter((c) => c.status === 'generated' && (c.rawPcmBase64 || c.audioBase64));

    if (readyChunks.length === 0) {
      showToast('Generate audio chunks first before merging.', 'error');
      return;
    }

    setIsMerging(true);
    try {
      const response = await fetch('/api/tts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pcmChunks: readyChunks.map((c) => c.rawPcmBase64 || c.audioBase64),
          gapDurationMs: 300,
          sampleRate: 24000,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to merge master audio.');
      }

      setMasterTrack({
        audioUrl: data.audioUrl,
        audioBase64: data.audioBase64,
        duration: data.duration,
        totalSize: data.totalSize,
        chunksMerged: data.chunksMerged,
        generatedAt: Date.now(),
        status: 'merged',
      });

      showToast(`Master Audio merged! Duration: ${Math.round(data.duration)}s. Timeline updated.`, 'success');
    } catch (err: any) {
      console.error('Merge error:', err);
      showToast(err?.message || 'Failed to merge master audio.', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownloadAllZip = async () => {
    try {
      const activeProjectName = projectName && projectName.trim() && projectName !== 'Untitled Voice Project'
        ? projectName.trim()
        : 'audiocraft_studio_stems';
      await downloadAllChunksZip(chunks, activeProjectName);
      showToast('All Chunks ZIP downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to download ZIP.', 'error');
    }
  };

  // Project Actions: New, Save, Open
  const handleNewProject = () => {
    setIsNewProjectModalOpen(true);
  };

  const handleDiscardAndCreateNew = () => {
    setScript('');
    setChunks([]);
    setMasterTrack(null);
    setElapsedSeconds(0);
    setProjectName('Untitled Voice Project');
    setIsNewProjectModalOpen(false);
    showToast('Clean workspace initialized. Ready for your script!', 'info');
  };

  const handleSaveAndCreateNew = () => {
    try {
      const proj: SavedProject = {
        id: `proj_${Date.now()}`,
        name: projectName || 'Untitled Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        script,
        currentVoice,
        selectedModel,
        language,
        style,
        speed,
        pitch,
        voicePrompt,
        gapDurationMs: 300,
        chunks,
        stats: {
          wordCount: script ? script.split(/\s+/).filter(Boolean).length : 0,
          charCount: script.length,
          chunksCount: chunks.length,
          generatedChunksCount: chunks.filter((c) => c.status === 'generated').length,
          totalDurationSeconds: chunks.reduce((acc, c) => acc + (c.duration || 0), 0),
        },
      };
      saveProjectToStorage(proj);
      showToast(`Saved "${proj.name}" to studio storage!`, 'success');
    } catch (err) {
      console.warn('Auto-save before new project failed:', err);
    }
    setScript('');
    setChunks([]);
    setMasterTrack(null);
    setElapsedSeconds(0);
    setProjectName('Untitled Voice Project');
    setIsNewProjectModalOpen(false);
  };

  const handleSaveProject = () => {
    setIsSaveProjectModalOpen(true);
  };

  const handleOpenProject = () => {
    setIsProjectBrowserOpen(true);
  };

  const handleSelectProject = (project: {
    title: string;
    text: string;
    style?: string;
    voice?: string;
    model?: string;
    chunks?: ScriptChunk[];
  }) => {
    setProjectName(project.title);
    setScript(project.text);
    if (project.voice) setCurrentVoice(project.voice);
    if (project.style) setVoicePrompt(project.style);
    if (project.model) setSelectedModel(project.model);

    if (project.chunks && project.chunks.length > 0) {
      setChunks(project.chunks);
      showToast(`Loaded project "${project.title}" with ${project.chunks.length} chunks!`, 'success');
    } else {
      handleSplitIntoChunks('Medium (Recommended)', 2000, true);
      showToast(`Loaded "${project.title}"!`, 'success');
    }
  };

  // Multi-Select Operations
  const handleSelectAllChunks = (selected: boolean) => {
    setChunks((prev) => prev.map((c) => ({ ...c, selected })));
  };

  const handleGenerateSelected = async () => {
    const selected = chunks.filter((c) => c.selected && c.status !== 'generated');
    if (selected.length === 0) {
      showToast('No ungenerated selected chunks.', 'info');
      return;
    }
    setIsQueueRunning(true);
    queueRunningRef.current = true;
    for (const c of selected) {
      if (!queueRunningRef.current) break;
      await handleGenerateChunk(c.id);
      await new Promise((r) => setTimeout(r, 400));
    }
    setIsQueueRunning(false);
  };

  const handleDeleteSelected = () => {
    setChunks((prev) => {
      const remaining = prev.filter((c) => !c.selected);
      return remaining.map((c, i) => ({ ...c, index: i + 1 }));
    });
    showToast('Deleted selected chunks.', 'info');
  };

  // Chunk CRUD
  const handleUpdateChunkText = (chunkId: string, newText: string) => {
    setChunks((prev) =>
      prev.map((c) =>
        c.id === chunkId
          ? {
              ...c,
              text: newText,
              characterCount: newText.length,
              wordCount: newText.split(/\s+/).filter(Boolean).length,
            }
          : c
      )
    );
  };

  const handleDeleteChunk = (chunkId: string) => {
    setChunks((prev) => {
      const remaining = prev.filter((c) => c.id !== chunkId);
      return remaining.map((c, i) => ({ ...c, index: i + 1 }));
    });
    showToast('Chunk deleted.', 'info');
  };

  const handleSplitChunk = (chunkId: string) => {
    setChunks((prev) => {
      const idx = prev.findIndex((c) => c.id === chunkId);
      if (idx === -1) return prev;
      const target = prev[idx];
      const words = target.text.split(/\s+/);
      const mid = Math.ceil(words.length / 2);
      const p1 = words.slice(0, mid).join(' ');
      const p2 = words.slice(mid).join(' ');

      const c1: ScriptChunk = {
        ...target,
        id: `${target.id}-1`,
        text: p1,
        characterCount: p1.length,
        wordCount: p1.split(/\s+/).filter(Boolean).length,
        status: 'not_generated',
        audioBase64: null,
      };
      const c2: ScriptChunk = {
        ...target,
        id: `${target.id}-2`,
        text: p2,
        characterCount: p2.length,
        wordCount: p2.split(/\s+/).filter(Boolean).length,
        status: 'not_generated',
        audioBase64: null,
      };

      const copy = [...prev];
      copy.splice(idx, 1, c1, c2);
      return copy.map((c, i) => ({ ...c, index: i + 1 }));
    });
    showToast('Chunk split into 2 parts.', 'success');
  };

  const handleMergeWithNextChunk = (chunkId: string) => {
    setChunks((prev) => {
      const idx = prev.findIndex((c) => c.id === chunkId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const c1 = prev[idx];
      const c2 = prev[idx + 1];
      const text = `${c1.text}\n\n${c2.text}`;

      const merged: ScriptChunk = {
        id: c1.id,
        index: c1.index,
        text,
        characterCount: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        duration: (c1.duration || 0) + (c2.duration || 0),
        status: 'not_generated',
        audioBase64: null,
        audioUrl: null,
        rawPcmBase64: null,
        error: null,
      };
      const copy = [...prev];
      copy.splice(idx, 2, merged);
      return copy.map((c, i) => ({ ...c, index: i + 1 }));
    });
    showToast('Merged with next chunk.', 'success');
  };

  const handleToggleSelectChunk = (chunkId: string) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === chunkId ? { ...c, selected: !c.selected } : c))
    );
  };

  // Reorder generated chunks when dragged left/right in timeline (Preserving permanent chunk numbers/names)
  const handleReorderChunks = (startIndex: number, endIndex: number) => {
    setChunks((prev) => {
      const generated = prev.filter((c) => c.status === 'generated' && !!c.audioBase64);
      const otherChunks = prev.filter((c) => !(c.status === 'generated' && !!c.audioBase64));
      if (startIndex < 0 || startIndex >= generated.length || endIndex < 0 || endIndex >= generated.length) {
        return prev;
      }
      const reorderedGenerated = [...generated];
      const [removed] = reorderedGenerated.splice(startIndex, 1);
      reorderedGenerated.splice(endIndex, 0, removed);

      // Do NOT overwrite chunk.index so chunk #003 remains #003 wherever it is moved!
      return [...reorderedGenerated, ...otherChunks];
    });
    showToast('Reordered audio tracks in timeline.', 'success');
  };

  // Shift chunk left or right (Preserving permanent chunk numbers/names)
  const handleMoveChunk = (chunkId: string, direction: 'left' | 'right') => {
    setChunks((prev) => {
      const idx = prev.findIndex((c) => c.id === chunkId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      // Do NOT overwrite chunk.index so chunk numbers stay permanently anchored!
      return copy;
    });
    showToast(`Moved chunk ${direction === 'left' ? 'left (earlier)' : 'right (later)'}.`, 'info');
  };

  // Stats Calculations
  const totalCharacters = script.length;
  const totalWords = script.trim().split(/\s+/).filter(Boolean).length;
  const totalParagraphs = script.trim().split(/\n\s*\n/).filter(Boolean).length;
  const estimatedDurationSeconds = Math.round(totalWords / 2.5);

  const completedChunks = chunks.filter((c) => c.status === 'generated').length;
  const generatingChunks = chunks.filter((c) => c.status === 'generating' || c.id === currentlyGeneratingId).length;
  const pendingChunks = chunks.filter((c) => c.status === 'not_generated').length;
  const failedChunks = chunks.filter((c) => c.status === 'failed').length;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070b14] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Bar */}
      <StudioHeader
        onNewProject={handleNewProject}
        onOpenProject={() => setIsProjectBrowserOpen(true)}
        onSaveProject={handleSaveProject}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenHardwareSpecs={() => setIsHardwareModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Studio 3-Column Layout */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Column 1: 1. Script Input & Chunk Settings (Left ~28-30%) */}
        <section className="w-full sm:w-[32%] xl:w-[28%] h-full flex flex-col min-h-0">
          <ScriptInputPanel
            script={script}
            onScriptChange={setScript}
            onSplitIntoChunks={handleSplitIntoChunks}
            isSplitting={isSplitting}
            totalCharacters={totalCharacters}
            totalWords={totalWords}
            totalParagraphs={totalParagraphs}
            estimatedDurationSeconds={estimatedDurationSeconds}
          />
        </section>

        {/* Column 2: 2. Script Chunks List (Center ~44-46%) */}
        <section className="flex-1 h-full flex flex-col min-h-0">
          <ScriptChunksPanel
            chunks={chunks}
            voices={activeVoices}
            currentVoice={currentVoice}
            onGenerateChunk={handleGenerateChunk}
            onCancelChunk={handleCancelChunk}
            onUpdateChunkText={handleUpdateChunkText}
            onDeleteChunk={handleDeleteChunk}
            onSplitChunk={handleSplitChunk}
            onMergeWithNextChunk={handleMergeWithNextChunk}
            onToggleSelectChunk={handleToggleSelectChunk}
            onSelectAllChunks={handleSelectAllChunks}
            onGenerateSelected={handleGenerateSelected}
            onDeleteSelected={handleDeleteSelected}
            currentlyGeneratingId={currentlyGeneratingId}
          />
        </section>

        {/* Column 3: 3. Voice Settings, 4. Queue, 5. Merge, 6. Final Audio (Right ~26-28%) */}
        <section className="w-full sm:w-[32%] xl:w-[26%] h-full flex flex-col min-h-0 overflow-y-auto scrollbar-thin border-l border-slate-800/80 bg-[#0e1424]">
          {/* 3. Voice Settings */}
          <VoiceSettingsPanel
            voices={activeVoices}
            currentVoice={currentVoice}
            onSelectVoice={setCurrentVoice}
            onOpenCustomVoiceModal={() => setIsCustomVoiceModalOpen(true)}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            language={language}
            onLanguageChange={setLanguage}
            style={style}
            onStyleChange={setStyle}
            speed={speed}
            onSpeedChange={setSpeed}
            pitch={pitch}
            onPitchChange={setPitch}
            voicePrompt={voicePrompt}
            onVoicePromptChange={setVoicePrompt}
          />

          {/* 4. Generation Queue */}
          <GenerationQueuePanel
            totalChunks={chunks.length}
            completedChunks={completedChunks}
            generatingChunks={generatingChunks}
            pendingChunks={pendingChunks}
            failedChunks={failedChunks}
            isQueueRunning={isQueueRunning}
            onStartQueue={handleStartQueue}
            onPauseQueue={handlePauseQueue}
            onStopQueue={handleStopQueue}
            onGenerateMissing={handleGenerateMissing}
            onRetryFailed={handleRetryFailed}
            elapsedSeconds={elapsedSeconds}
            cooldownSeconds={cooldownSeconds}
          />

          {/* 5. Merge & Download + 6. Final Audio */}
          <MergeAndFinalAudioPanel
            masterTrack={masterTrack}
            projectName={projectName}
            onMergeAudio={handleMergeAudio}
            onDownloadAllZip={handleDownloadAllZip}
            isMerging={isMerging}
            completedChunksCount={completedChunks}
          />
        </section>
      </main>

      {/* 7. Bottom DAW Multitrack Audio Timeline (Dynamically synced in real-time) */}
      <AudioTimelineDAW
        chunks={chunks}
        masterAudioBase64={masterTrack?.audioBase64}
        masterDuration={masterTrack?.duration}
        onReorderChunks={handleReorderChunks}
        onMoveChunk={handleMoveChunk}
        onSelectChunk={(chunkId) => {
          const el = document.getElementById(`chunk-card-${chunkId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* Voice & Studio Settings Full Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        voices={activeVoices}
        currentVoice={currentVoice}
        onSelectVoice={setCurrentVoice}
        stylePrompt={voicePrompt}
        onStylePromptChange={setVoicePrompt}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        gapDurationMs={300}
        onGapDurationChange={() => {}}
        onOpenCustomVoiceModal={() => {
          setIsSettingsOpen(false);
          setIsCustomVoiceModalOpen(true);
        }}
      />

      {/* Custom Voice WAV Upload & Clone Modal */}
      <CustomVoiceUploadModal
        isOpen={isCustomVoiceModalOpen}
        onClose={() => setIsCustomVoiceModalOpen(false)}
        onAddCustomVoice={handleAddCustomVoice}
      />

      {/* New Project Confirmation Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onDiscardAndCreate={handleDiscardAndCreateNew}
        onSaveAndCreate={handleSaveAndCreateNew}
        stats={{
          wordCount: totalWords,
          charCount: totalCharacters,
          chunksCount: chunks.length,
          generatedChunksCount: completedChunks,
          totalDurationSeconds: chunks.reduce((acc, c) => acc + (c.duration || 0), 0),
        }}
      />

      {/* Save Project Modal */}
      <SaveProjectModal
        isOpen={isSaveProjectModalOpen}
        onClose={() => setIsSaveProjectModalOpen(false)}
        onProjectSaved={(savedProj) => {
          setProjectName(savedProj.name);
          showToast(`Project "${savedProj.name}" saved!`, 'success');
        }}
        currentProjectName={projectName}
        script={script}
        chunks={chunks}
        currentVoice={currentVoice}
        selectedModel={selectedModel}
        language={language}
        style={style}
        speed={speed}
        pitch={pitch}
        voicePrompt={voicePrompt}
        gapDurationMs={300}
      />

      {/* Project Browser / Open Project Modal */}
      <ProjectBrowserModal
        isOpen={isProjectBrowserOpen}
        onClose={() => setIsProjectBrowserOpen(false)}
        onSelectProject={handleSelectProject}
      />

      {/* Help & Guide Modal */}
      <HelpGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Hardware & Local Compute Requirements Modal */}
      <HardwareRequirementsModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-150">
          <div
            className={`h-2 w-2 rounded-full ${
              toastMessage.type === 'success'
                ? 'bg-emerald-400'
                : toastMessage.type === 'error'
                ? 'bg-rose-400'
                : 'bg-indigo-400'
            }`}
          />
          <span className="text-xs font-medium text-slate-200">
            {toastMessage.text}
          </span>
        </div>
      )}
    </div>
  );
}
