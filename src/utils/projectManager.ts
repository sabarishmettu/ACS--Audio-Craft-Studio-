import { ScriptChunk } from '../types/tts';

export interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  script: string;
  currentVoice: string;
  selectedModel: string;
  language: string;
  style: string;
  speed: number;
  pitch: number;
  voicePrompt: string;
  gapDurationMs: number;
  chunks: ScriptChunk[];
  stats: {
    wordCount: number;
    charCount: number;
    chunksCount: number;
    generatedChunksCount: number;
    totalDurationSeconds: number;
  };
}

const STORAGE_KEY = 'mvs_saved_projects_v1';

export function getSavedProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load saved projects from localStorage:', err);
    return [];
  }
}

export function saveProjectToStorage(project: SavedProject): void {
  try {
    const projects = getSavedProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    if (existingIndex >= 0) {
      projects[existingIndex] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.unshift({ ...project, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save project to localStorage:', err);
    throw err;
  }
}

export function deleteSavedProject(id: string): void {
  try {
    const projects = getSavedProjects().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to delete project from localStorage:', err);
  }
}

export function exportProjectAsFile(project: SavedProject) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const cleanName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'project';
  downloadAnchor.setAttribute('download', `${cleanName}.mvstudio.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}

export async function importProjectFromFile(file: File): Promise<SavedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.script && typeof parsed.script !== 'string') {
          throw new Error('Invalid project file: missing script data.');
        }

        const project: SavedProject = {
          id: parsed.id || `proj_${Date.now()}`,
          name: parsed.name || file.name.replace(/\.(mvstudio|json)$/i, ''),
          createdAt: parsed.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          script: parsed.script || '',
          currentVoice: parsed.currentVoice || 'Aster',
          selectedModel: parsed.selectedModel || 'gemini-3.8-flash-lite-tts',
          language: parsed.language || 'English',
          style: parsed.style || 'Narrative',
          speed: typeof parsed.speed === 'number' ? parsed.speed : 1.0,
          pitch: typeof parsed.pitch === 'number' ? parsed.pitch : 0,
          voicePrompt: parsed.voicePrompt || '',
          gapDurationMs: typeof parsed.gapDurationMs === 'number' ? parsed.gapDurationMs : 300,
          chunks: Array.isArray(parsed.chunks) ? parsed.chunks : [],
          stats: parsed.stats || {
            wordCount: parsed.script ? parsed.script.split(/\s+/).filter(Boolean).length : 0,
            charCount: parsed.script ? parsed.script.length : 0,
            chunksCount: Array.isArray(parsed.chunks) ? parsed.chunks.length : 0,
            generatedChunksCount: Array.isArray(parsed.chunks)
              ? parsed.chunks.filter((c: any) => c.status === 'generated').length
              : 0,
            totalDurationSeconds: Array.isArray(parsed.chunks)
              ? parsed.chunks.reduce((s: number, c: any) => s + (c.duration || 0), 0)
              : 0,
          },
        };

        resolve(project);
      } catch (err: any) {
        reject(new Error(err?.message || 'Failed to parse project file JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
