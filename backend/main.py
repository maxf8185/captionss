import os
import shutil
import uuid
import json
import subprocess
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import asyncio
import sys
from typing import List, Optional
from pydantic import BaseModel
import imageio_ffmpeg

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths resolution for PyInstaller
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    BUNDLE_DIR = sys._MEIPASS
    FRONTEND_DIR = os.path.join(BUNDLE_DIR, "frontend", "out")
    # Use user profile for generated data so we don't write to Program Files
    USER_DATA_DIR = os.path.join(os.path.expanduser("~"), "AutoCapsData")
else:
    # Running in normal Python environment
    BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))
    FRONTEND_DIR = os.path.join(BUNDLE_DIR, "..", "frontend", "out")
    USER_DATA_DIR = BUNDLE_DIR

UPLOAD_DIR = os.path.join(USER_DATA_DIR, "uploads")
OUTPUT_DIR = os.path.join(USER_DATA_DIR, "outputs")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mount API static files
app.mount("/api/static_uploads", StaticFiles(directory=UPLOAD_DIR), name="static_uploads")
app.mount("/api/static_outputs", StaticFiles(directory=OUTPUT_DIR), name="static_outputs")

# Mount Next.js frontend
if os.path.exists(FRONTEND_DIR):
    app.mount("/_next", StaticFiles(directory=os.path.join(FRONTEND_DIR, "_next")), name="next_assets")
    
model = None

def get_model():
    global model
    if model is None:
        print("Loading Whisper Model...")
        model = WhisperModel("base", device="cpu", compute_type="int8")
        print("Model loaded.")
    return model

def get_ffmpeg_path():
    return imageio_ffmpeg.get_ffmpeg_exe()

class WordTimestamps(BaseModel):
    word: str
    start: float
    end: float

class SubtitleSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: List[WordTimestamps]

class GenerateRequest(BaseModel):
    video_id: str
    language: str

class StyleOptions(BaseModel):
    font_name: str = "Arial"
    font_size: int = 42
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FBBF24"
    position: str = "Bottom"
    words_per_line: int = 5
    max_lines: int = 2

class ExportRequest(BaseModel):
    video_id: str
    segments: List[SubtitleSegment]
    styles: StyleOptions

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    video_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1]
    file_path = os.path.join(UPLOAD_DIR, f"{video_id}.{ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"video_id": video_id, "filename": file.filename, "url": f"/api/static_uploads/{video_id}.{ext}"}

@app.post("/api/generate")
async def generate_subtitles(req: GenerateRequest):
    video_path = None
    for file in os.listdir(UPLOAD_DIR):
        if file.startswith(req.video_id):
            video_path = os.path.join(UPLOAD_DIR, file)
            break
            
    if not video_path:
        raise HTTPException(status_code=404, detail="Video not found")
        
    whisper_model = get_model()
    ffmpeg_exe = get_ffmpeg_path()
    
    audio_path = os.path.join(UPLOAD_DIR, f"{req.video_id}.wav")
    subprocess.run([ffmpeg_exe, "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", audio_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    lang = req.language if req.language != 'auto' else None
    segments, info = whisper_model.transcribe(audio_path, language=lang, word_timestamps=True)
    
    result_segments = []
    seg_id = 1
    for segment in segments:
        words = []
        for word in segment.words:
            words.append({
                "word": word.word,
                "start": word.start,
                "end": word.end
            })
        result_segments.append({
            "id": seg_id,
            "start": segment.start,
            "end": segment.end,
            "text": segment.text,
            "words": words
        })
        seg_id += 1
        
    if os.path.exists(audio_path):
        os.remove(audio_path)
        
    return {"segments": result_segments, "detected_language": info.language}

def generate_ass_file(segments: List[dict], styles: StyleOptions, ass_path: str):
    alignment = 2
    if styles.position.lower() == "top":
        alignment = 8
    elif styles.position.lower() == "middle":
        alignment = 5
        
    def hex_to_ass(hex_color):
        if hex_color.startswith("#"):
            hex_color = hex_color[1:]
            if len(hex_color) == 6:
                r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
                return f"&H00{b}{g}{r}"
        return hex_color

    primary = hex_to_ass(styles.primary_color)
    highlight = hex_to_ass(styles.highlight_color)

    ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{styles.font_name},{styles.font_size},{primary},{highlight},&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,{alignment},10,10,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    def format_time(seconds):
        h = int(seconds / 3600)
        m = int((seconds % 3600) / 60)
        s = int(seconds % 60)
        cs = int((seconds * 100) % 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    for seg in segments:
        start_time = format_time(seg['start'])
        end_time = format_time(seg['end'])
        
        text_karaoke = ""
        last_time = seg['start']
        for word in seg['words']:
            dur_cs = int((word['end'] - word['start']) * 100)
            text_karaoke += f"{{\\K{dur_cs}}}{word['word']} "
            last_time = word['end']
            
        ass_content += f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{text_karaoke.strip()}\n"

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

@app.post("/api/export")
async def export_video(req: ExportRequest):
    video_path = None
    for file in os.listdir(UPLOAD_DIR):
        if file.startswith(req.video_id):
            video_path = os.path.join(UPLOAD_DIR, file)
            break
            
    if not video_path:
        raise HTTPException(status_code=404, detail="Video not found")
        
    ass_path = os.path.join(OUTPUT_DIR, f"{req.video_id}.ass")
    generate_ass_file([s.dict() for s in req.segments], req.styles, ass_path)
    
    out_video_path = os.path.join(OUTPUT_DIR, f"{req.video_id}_final.mp4")
    
    abs_ass_path = os.path.abspath(ass_path).replace("\\", "/")
    abs_ass_path = abs_ass_path.replace(":", "\\:")
    
    ffmpeg_exe = get_ffmpeg_path()
    
    try:
        subprocess.run([
            ffmpeg_exe, "-y", 
            "-i", video_path, 
            "-vf", f"ass='{abs_ass_path}'", 
            "-c:a", "copy",
            out_video_path
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Error exporting video. Make sure ffmpeg is installed.")
        
    return {"status": "success", "url": f"/api/static_outputs/{req.video_id}_final.mp4"}

# Serve Frontend HTML
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if os.path.exists(FRONTEND_DIR):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
    
    return HTMLResponse(content="<h1>Frontend build not found. Please run 'npm run build' in the frontend directory.</h1>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
