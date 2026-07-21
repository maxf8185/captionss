<div align="center">
  <img src="frontend/public/logo.png" alt="AutoCaps Logo" width="200" />
  <h1>AutoCaps</h1>
  <p><b>A powerful, offline-first desktop application for generating high-quality animated subtitles.</b></p>
</div>

## ✨ Features

- **🚀 100% Free & Local Processing**: Uses the highly optimized `faster-whisper` AI model to transcribe audio locally on your machine. No cloud subscriptions or API keys required.
- **📱 Perfect for Vertical Videos**: Fully supports TikTok, Instagram Reels, and YouTube Shorts. The player automatically adapts to the video aspect ratio and exports without annoying black borders.
- **🧠 Smart Vocabulary & Context**: Add custom names, slang, or brand names to the "Context" field before generating, and the AI will accurately recognize them instead of guessing similar-sounding words.
- **✂️ Interactive Timeline Editor**: Easily correct typos or timing by clicking directly on the word blocks along a beautiful horizontal timeline (with video frame thumbnails!).
- **🎨 Deep Customization**: Control font size, colors, vertical position, words per line, and maximum lines to make your subtitles look exactly like top-tier social media content.
- **🎬 Visually Lossless Export**: Powered by FFmpeg, the app exports your final video using high-quality encoding (`libx264 -crf 18`), maintaining the crisp quality of your original file.

## 📥 Installation

The easiest way to use AutoCaps is to download the pre-built Windows executable.
1. Go to the [Releases](../../releases) page.
2. Download `AutoCaps-Setup.exe`.
3. Install and run! The app is fully self-contained.

## 🛠️ Building from Source

If you want to run the app in a development environment or build it yourself:

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- FFmpeg installed and added to your system PATH

### 1. Frontend (Next.js)
```bash
cd frontend
npm install
npm run build
```
*(The frontend must be built before running the backend desktop app, as the Python server serves the static export).*

### 2. Backend & Desktop App (Python)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
pip install pywebview imageio-ffmpeg
```

To run the app in development mode:
```bash
python desktop.py
```

### 3. Packaging (PyInstaller)
To build the `.exe` yourself:
```bash
cd backend
pyinstaller --noconfirm --onedir --windowed --icon=logo.ico --add-data "../frontend/out;frontend/out" --collect-all faster_whisper --collect-all ctranslate2 --collect-all imageio_ffmpeg --name "AutoCaps" desktop.py
```

## 🏗️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Lucide Icons.
- **Backend**: Python, FastAPI, Pywebview (for desktop integration).
- **AI & Video**: Faster-Whisper (CTranslate2), FFmpeg.
- **CI/CD**: GitHub Actions & Inno Setup for automated release building.

---
*Designed for content creators who demand quality and speed.*
