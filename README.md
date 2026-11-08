<div align="center">
  <img src="frontend/public/logo.png" alt="AutoCaps logo" width="160" />

  <h1>AutoCaps</h1>

  <p><b>Turn a video into styled, editable subtitles and export the finished result.</b></p>

  <p>
    Python · FastAPI · TypeScript · Next.js · FFmpeg · Docker · GitHub Actions
  </p>
</div>

---

## Overview

AutoCaps is a desktop and web application for creating subtitles for short-form video (TikTok, Instagram Reels, YouTube Shorts). You upload a video, the app transcribes the speech, you correct the text and timing on an interactive timeline, style the subtitles, and export a video with the subtitles rendered in.

It is a personal project that I develop and ship continuously: **59 releases** of the Windows installer, built automatically with GitHub Actions.

## Features

- **Speech recognition**: Whisper large-v3 through the [Groq API](https://groq.com), with automatic language detection.
- **Interactive timeline editor**: click word blocks to fix text and timing, waveform and video frame thumbnails, undo / redo.
- **Subtitle styling**: font (including custom font upload), size, colors, vertical position, words per line, maximum lines, presets.
- **Vertical video support**: the preview adapts to the video's aspect ratio; export has no black borders.
- **Custom vocabulary**: add names, slang and brand terms in a "Context" field to improve recognition.
- **Silence removal and speaker detection** (experimental).
- **Overlays**: place image overlays on the video for a chosen time range.
- **High-quality export**: FFmpeg render with `libx264 -crf 18` (visually lossless) and a native "Save as" dialog on Windows.

## How it works

```
 Video upload ──► audio extraction (FFmpeg) ──► speech-to-text (Groq Whisper)
                                                        │
                                  words grouped into subtitle segments
                                                        │
        Next.js editor (timeline, styling) ◄────────────┘
                     │
                     └──► export: FFmpeg burns subtitles into the video
```

| Layer | Technology |
|---|---|
| Backend API | Python, FastAPI, SQLite |
| Speech recognition | Groq Whisper API |
| Media processing | FFmpeg (via imageio-ffmpeg), OpenCV, MediaPipe, librosa |
| Frontend | TypeScript, Next.js, React, Zustand |
| Desktop app | pywebview + PyInstaller, Inno Setup installer |
| CI/CD | GitHub Actions (Windows build and release) |
| Web deployment | Docker |

## Getting started

### Download (Windows)

Get the latest installer from the [Releases](../../releases) page.

The installer does **not** include an API key. After installing, create a text file named `.env` containing one line, `GROQ_API_KEY=your_key` (get a free key at [console.groq.com](https://console.groq.com)), and save it in the `AutoCapsData` folder inside your user folder (`~/AutoCapsData/.env`) or next to `AutoCaps.exe`. Make sure the file is named exactly `.env` (Windows can hide extensions and silently create `.env.txt`; that name is accepted too).

### Run from source (desktop mode)

**Requirements:** Python 3.10+, Node.js 20+, and a free [Groq API key](https://console.groq.com).

The desktop build removes the web-only authentication (Clerk) and exports the frontend as static files, which the Python backend then serves. `patch_desktop.py` does this by editing files in place, so use a throwaway checkout.

```bash
# 1. Configure the API key
cp .env.example .env          # then set GROQ_API_KEY in .env

# 2. Build the frontend in desktop mode
cd frontend
DESKTOP_BUILD=true python patch_desktop.py      # PowerShell: $env:DESKTOP_BUILD="true"; python patch_desktop.py
npm install
npm run build

# 3. Start the app (backend serves the built frontend)
cd ../backend
pip install -r requirements.txt
python desktop.py
```

The web version (Docker) additionally uses [Clerk](https://clerk.com) for sign-in and a per-user daily usage limit, and needs Clerk keys in `frontend/.env.local`.

### Configuration

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | API key used for speech recognition. Read from `.env` in the project root, next to the executable, or in `~/AutoCapsData/.env`. Never commit it; `.env` is git-ignored. |

## Project structure

```
backend/     FastAPI app (upload, transcription, export, silence removal, diarization)
frontend/    Next.js editor (timeline, subtitle overlay, state store)
build.py     Local desktop build script
installer.iss  Inno Setup installer definition
.github/workflows/build.yml   Automated Windows build and release
```

## Known limitations

- Transcription requires an internet connection and a Groq API key.
- Speaker detection and silence removal are experimental.
- Automated tests are not written yet.

## Author

**Maksym Fizer**, Computer Science student at FIIT STU, Bratislava.
GitHub: [@maxf8185](https://github.com/maxf8185)

The project is built with the help of AI coding tools; I review, test and debug the code they produce.
