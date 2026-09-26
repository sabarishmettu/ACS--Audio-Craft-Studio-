# 🎙️ Manhwa Voice Studio (TTS & Audio Production Studio)

An intelligent, multi-track Text-to-Speech (TTS) and voiceover DAW studio powered by Google Gemini API (`gemini-3.8-flash-lite-tts`, `gemini-3.8-flash-tts`, and `gemini-3.8-flash`).

---

## 🚀 How Anyone Can Run and Use This Project

When you share this project on GitHub, anyone who clones it can run it locally or deploy it by following these simple steps:

### 1. Clone the Repository
```bash
git clone <YOUR_GIT_REPO_URL>
cd manhwa-voice-studio
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Get a Free Gemini API Key
To use the speech synthesis & AI models:
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **"Get API key"** and create a key (Free tier is available).
3. Copy your API key.

### 4. Set Up Your Environment Variable
Create a `.env` file in the root folder (or copy `.env.example`):

```bash
cp .env.example .env
```

Open `.env` and paste your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 5. Start the Development Server
```bash
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## 🛠️ How The Model Works in This App

- **Backend Architecture**:
  - The client makes requests to Express backend proxy endpoints (`/api/tts/*`).
  - The backend securely initializes the `@google/genai` SDK using `process.env.GEMINI_API_KEY` on the server side.
  - The API key is **never exposed** to the client browser.

- **Supported Models**:
  - **`gemini-3.8-flash-lite-tts`**: Fast, high-throughput narration for long scripts.
  - **`gemini-3.8-flash-tts`**: Expressive acting, voice design, and dramatic tone.
  - **`gemini-3.8-flash`**: Multimodal audio sample analysis for cloning custom WAV voices.

- **Audio Pipeline**:
  - Raw 24,000Hz PCM / WAV audio returned by Gemini is rendered into an interactive multi-track DAW timeline.
  - Includes gap duration controls, single/batch downloads, and WAV merging.
