import os
import shutil
import uuid

def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

import json
import subprocess
import re
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import sys
import time
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
import sqlite3

load_dotenv()
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Initialize SQLite for user limits
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "limits.db")
def init_db():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS usage 
                 (user_id TEXT, timestamp REAL)''')
    conn.commit()
    conn.close()

init_db()

def check_user_limit(user_id: str) -> bool:
    if not user_id:
        return False # No limit if no user ID (or you can block them)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    # Delete old records
    cutoff = time.time() - 24 * 3600
    c.execute("DELETE FROM usage WHERE timestamp < ?", (cutoff,))
    
    c.execute("SELECT COUNT(*) FROM usage WHERE user_id = ?", (user_id,))
    count = c.fetchone()[0]
    
    if count >= 5:
        conn.close()
        return False
    
    c.execute("INSERT INTO usage (user_id, timestamp) VALUES (?, ?)", (user_id, time.time()))
    conn.commit()
    conn.close()
    return True
import imageio_ffmpeg
import cv2
try:
    import mediapipe as mp
    import mediapipe.solutions.face_detection
except ImportError:
    mp = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:8000"],
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

async def cleanup_old_files():
    while True:
        try:
            now = time.time()
            cutoff = now - 24 * 3600 # 24 hours
            for directory in [UPLOAD_DIR, OUTPUT_DIR]:
                if not os.path.exists(directory): continue
                for filename in os.listdir(directory):
                    filepath = os.path.join(directory, filename)
                    if os.path.isfile(filepath):
                        if os.path.getmtime(filepath) < cutoff:
                            os.remove(filepath)
                            print(f"Cleaned up old file: {filename}")
        except Exception as e:
            print(f"Error during cleanup: {e}")
        
        await asyncio.sleep(3600) # Check every hour

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_old_files())

# Mount Next.js frontend
if os.path.exists(FRONTEND_DIR):
    app.mount("/_next", StaticFiles(directory=os.path.join(FRONTEND_DIR, "_next")), name="next_assets")
    
# Removed get_model function

def get_ffmpeg_path():
    return imageio_ffmpeg.get_ffmpeg_exe()

def get_face_bboxes_for_segments(video_path: str, segments: List[dict]):
    if mp is None:
        return {}, 0.5
    face_bboxes = {}
    face_x_centers = []
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {}, 0.5
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = 30.0
    
    mp_face_detection = mp.solutions.face_detection
    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
        for i, seg in enumerate(segments):
            start_time = seg.get('start', 0)
            end_time = seg.get('end', 0)
            mid_time = (start_time + end_time) / 2
            frame_idx = int(mid_time * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            success, image = cap.read()
            if success:
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                results = face_detection.process(image_rgb)
                if results.detections:
                    bbox = results.detections[0].location_data.relative_bounding_box
                    face_bboxes[i] = (bbox.ymin, bbox.ymin + bbox.height)
                    face_x_centers.append(bbox.xmin + bbox.width / 2)
    cap.release()
    avg_x = sum(face_x_centers) / len(face_x_centers) if face_x_centers else 0.5
    return face_bboxes, avg_x

def get_video_dimensions(video_path: str, ffmpeg_exe: str):
    try:
        creation_flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
        result = subprocess.run([ffmpeg_exe, "-i", video_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, creationflags=creation_flags)
        output = result.stderr
        
        match = re.search(r'Video:.*?\s(\d{3,4})x(\d{3,4})[\s,]', output)
        if match:
            width = int(match.group(1))
            height = int(match.group(2))
            
            rotation_match = re.search(r'rotate\s*:\s*(\d+)', output)
            if rotation_match:
                rotation = int(rotation_match.group(1))
                if rotation in [90, 270]:
                    width, height = height, width
                    
            return width, height
    except Exception as e:
        print(f"Error getting dimensions: {e}")
    return 1920, 1080

async def get_hardware_encoder(ffmpeg_exe: str) -> str:
    """Detects available hardware encoders in FFmpeg for 10x faster export."""
    try:
        creation_flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
        process = await asyncio.create_subprocess_exec(
            ffmpeg_exe, "-encoders",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            creationflags=creation_flags
        )
        stdout, _ = await process.communicate()
        output = stdout.decode(errors="ignore")
        
        if "h264_nvenc" in output:
            return "h264_nvenc"
        elif "h264_amf" in output:
            return "h264_amf"
        elif "h264_qsv" in output:
            return "h264_qsv"
        elif "h264_videotoolbox" in output:
            return "h264_videotoolbox"
    except Exception:
        pass
    return "libx264"

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
    prompt: str = ""
    model_size: str = "base"
    task: str = "transcribe"
    user_id: Optional[str] = None

class StyleOptions(BaseModel):
    font_name: str = "Arial"
    font_size: float = 7.0
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FBBF24"
    outline_color: str = "#000000"
    position: str = "Bottom"
    pos_x: float = 50.0
    pos_y: float = 90.0
    effect: str = "karaoke"
    words_per_line: int = 5
    max_lines: int = 2
    aspect_ratio: str = "original"

class OverlayConfig(BaseModel):
    id: str
    start: float
    end: float
    url: str


class SilenceRemoveRequest(BaseModel):
    video_id: str
    segments: List[dict]
    threshold: float = 0.8
    padding: float = 0.1

class ExportRequest(BaseModel):
    video_id: str
    segments: List[SubtitleSegment]
    styles: StyleOptions
    save_path: Optional[str] = None
    overlays: List[OverlayConfig] = []
    user_id: Optional[str] = None

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    video_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1]
    file_path = os.path.join(UPLOAD_DIR, f"{video_id}.{ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"video_id": video_id, "filename": file.filename, "url": f"/api/static_uploads/{video_id}.{ext}"}

@app.post("/api/upload_overlay")
async def upload_overlay(file: UploadFile = File(...)):
    overlay_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1]
    file_path = os.path.join(UPLOAD_DIR, f"overlay_{overlay_id}.{ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"overlay_id": f"overlay_{overlay_id}", "url": f"/api/static_uploads/overlay_{overlay_id}.{ext}"}

@app.post("/api/upload_font")
async def upload_font(file: UploadFile = File(...)):
    font_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1]
    font_filename = f"font_{font_id}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, font_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Register font so FFmpeg can use it without system installation?
    # FFmpeg can use fonts via a directory if we set fonts_dir or just pass fontconfig,
    # but the easiest way is to let the user know the font_name and we'll point ASS to it.
    font_name = file.filename.rsplit(".", 1)[0]
    
    return {"font_name": font_name, "url": f"/api/static_uploads/{font_filename}"}

@app.post("/api/generate")
async def generate_subtitles(req: GenerateRequest):
    video_path = None
    for file in os.listdir(UPLOAD_DIR):
        if file.startswith(req.video_id):
            video_path = os.path.join(UPLOAD_DIR, file)
            break
            
    if not video_path:
        raise HTTPException(status_code=404, detail="Video not found")
        
    async def event_generator():
        if req.user_id:
            if not check_user_limit(req.user_id):
                yield json.dumps({"error": "Ліміт вичерпано. Ви можете згенерувати лише 5 відео на день. Спробуйте завтра!"}) + "\n"
                return
        
        yield json.dumps({"progress": 1}) + "\n"
        await asyncio.sleep(0.1)
        
        # We use Groq now, no need to load local model
        yield json.dumps({"progress": 5}) + "\n"
        
        # Extract audio
        ffmpeg_exe = get_ffmpeg_path()
        audio_path = os.path.join(UPLOAD_DIR, f"{req.video_id}.wav")
        creation_flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
        process = await asyncio.create_subprocess_exec(
            ffmpeg_exe, "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", audio_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            creationflags=creation_flags
        )
        await process.communicate()
        if process.returncode != 0:
            yield json.dumps({"error": "Failed to extract audio"}) + "\n"
            return
            
        yield json.dumps({"progress": 15}) + "\n"
        
        # Transcribe with Groq API
        lang = req.language if req.language != 'auto' else None
        initial_prompt = req.prompt if req.prompt and len(req.prompt.strip()) > 0 else None
        
        if lang == 'uk' and not initial_prompt:
            initial_prompt = "Привіт! Це текст українською мовою, з правильною граматикою та пунктуацією."
            
        yield json.dumps({"progress": 20}) + "\n"
        
        def transcribe_with_groq():
            with open(audio_path, "rb") as file:
                # Use large-v3 for Groq as it's insanely fast anyway
                transcription = groq_client.audio.transcriptions.create(
                    file=("audio.wav", file.read()),
                    model="whisper-large-v3",
                    prompt=initial_prompt,
                    language=lang,
                    response_format="verbose_json",
                    timestamp_granularities=["word"]
                )
            return transcription

        try:
            yield json.dumps({"progress": 40}) + "\n"
            transcription = await asyncio.to_thread(transcribe_with_groq)
            yield json.dumps({"progress": 95}) + "\n"
        except Exception as e:
            yield json.dumps({"error": f"Groq API Error: {str(e)}"}) + "\n"
            if os.path.exists(audio_path):
                os.remove(audio_path)
            return

        result_segments = []
        
        # Groq returns transcription.words which we need to group into sensible segments.
        # Since Groq might not return perfectly sized segments like faster-whisper, 
        # we can reconstruct segments from words or use transcription.segments if available.
        
        if hasattr(transcription, "segments") and transcription.segments:
            for i, segment in enumerate(transcription.segments):
                # segment['words'] might not exist on the segment itself in Groq,
                # we need to find words that fall into this segment from transcription.words
                seg_words = [
                    {"word": w["word"], "start": w["start"], "end": w["end"]} 
                    for w in getattr(transcription, "words", []) 
                    if w["start"] >= segment["start"] and w["end"] <= segment["end"] + 0.1
                ]
                result_segments.append({
                    "id": i + 1,
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"],
                    "words": seg_words
                })
        else:
            # Fallback if no segments but words exist
            words = getattr(transcription, "words", [])
            if words:
                # Just group all words into one big segment for now, or split by pauses > 1s
                current_segment = {"id": 1, "start": words[0]["start"], "end": words[0]["end"], "text": "", "words": []}
                seg_id = 1
                for w in words:
                    if w["start"] - current_segment["end"] > 1.0:
                        # New segment
                        result_segments.append(current_segment)
                        seg_id += 1
                        current_segment = {"id": seg_id, "start": w["start"], "end": w["end"], "text": "", "words": []}
                    
                    current_segment["words"].append({"word": w["word"], "start": w["start"], "end": w["end"]})
                    current_segment["end"] = w["end"]
                    current_segment["text"] += w["word"]
                result_segments.append(current_segment)

        if os.path.exists(audio_path):
            os.remove(audio_path)
            
        detected_language = getattr(transcription, "language", lang or "unknown")
        yield json.dumps({"segments": result_segments, "detected_language": detected_language, "progress": 100}) + "\n"
        
    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


def hex_to_ass_color(hex_color: str) -> str:
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
        return f"&H{b}{g}{r}&"
    return "&HFFFFFF&"

def generate_ass_file(segments: List[dict], styles: StyleOptions, ass_path: str, video_width: int, video_height: int, face_bboxes: dict = None):
    alignment = 5 # Center middle alignment for precise positioning
        
    def hex_to_ass(hex_color):
        if hex_color.startswith("#"):
            hex_color = hex_color[1:]
            if len(hex_color) == 6:
                r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
                return f"&H00{b}{g}{r}"
        return hex_color

    primary = hex_to_ass(styles.primary_color)
    highlight = hex_to_ass(styles.highlight_color)
    outline = hex_to_ass(styles.outline_color)
    
    actual_font_size = int(video_height * (styles.font_size / 100.0))
    outline_size = max(1, int(actual_font_size * 0.06))
    shadow_size = max(1, int(actual_font_size * 0.05))

    ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{styles.font_name},{actual_font_size},{primary},{highlight},{outline},&H80000000,-1,0,0,0,100,100,0,0,1,{outline_size},{shadow_size},{alignment},10,10,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    def format_time(seconds):
        h = int(seconds / 3600)
        m = int((seconds % 3600) / 60)
        s = int(seconds % 60)
        cs = int((seconds * 100) % 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    for seg_idx, seg in enumerate(segments):
        words = seg.get('words', [])
        if not words:
            continue
            
        screens = []
        current_screen = []
        current_line = []
        
        MAX_CHARS_PER_LINE = 22
        line_char_count = 0
        
        for word in words:
            word_str = word.get('word', '')
            word_len = len(word_str)
            
            if len(current_line) > 0 and line_char_count + word_len > MAX_CHARS_PER_LINE:
                current_screen.append(current_line)
                current_line = []
                line_char_count = 0
                if len(current_screen) >= styles.max_lines:
                    screens.append(current_screen)
                    current_screen = []
                    
            current_line.append(word)
            line_char_count += word_len + 1
            
            if len(current_line) >= styles.words_per_line:
                current_screen.append(current_line)
                current_line = []
                line_char_count = 0
                if len(current_screen) >= styles.max_lines:
                    screens.append(current_screen)
                    current_screen = []
        
        if current_line:
            current_screen.append(current_line)
        if current_screen:
            screens.append(current_screen)
            
        pos_x_px = int(video_width * (styles.pos_x / 100.0))
        pos_y_px = int(video_height * (styles.pos_y / 100.0))
        
        if face_bboxes and seg_idx in face_bboxes:
            ymin, ymax = face_bboxes[seg_idx]
            face_ymin_px = int(ymin * video_height)
            face_ymax_px = int(ymax * video_height)
            text_height = int(video_height * (styles.font_size / 100.0))
            if face_ymin_px - text_height < pos_y_px < face_ymax_px + text_height:
                if face_ymax_px + text_height + 20 < video_height:
                    pos_y_px = face_ymax_px + text_height + 20
                else:
                    pos_y_px = max(text_height, face_ymin_px - text_height - 20)
                    
        pos_tag = f"{{\\pos({pos_x_px},{pos_y_px})}}"
        
        for screen in screens:
            if not screen or not screen[0]: continue
            
            if styles.effect == "legacy_karaoke":
                start_time = format_time(screen[0][0]['start'])
                end_time = format_time(screen[-1][-1]['end'])
                text_karaoke = ""
                for i, line in enumerate(screen):
                    for word in line:
                        dur_cs = int((word['end'] - word['start']) * 100)
                        text_karaoke += f"{{\\K{dur_cs}}}{word['word']} "
                    if i < len(screen) - 1:
                        text_karaoke = text_karaoke.strip() + "\\N"
                ass_content += f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{pos_tag}{text_karaoke.strip()}\n"
            else:
                words_in_screen = [w for line in screen for w in line]
                for i, active_w in enumerate(words_in_screen):
                    w_start = format_time(active_w['start'])
                    w_end = format_time(words_in_screen[i+1]['start']) if i + 1 < len(words_in_screen) else format_time(active_w['end'])
                    
                    text_layer = "{\\alpha&H60&}"
                    for i_line, line in enumerate(screen):
                        line_str = ""
                        for w in line:
                            if w == active_w:
                                # Professional Subme-style clean highlight without any scale bump
                                line_str += f"{{\\alpha&H00&\\c{highlight}}}{w['word']}{{\\c{primary}\\alpha&H60&}} "
                            elif styles.effect == "reveal" and w['start'] > active_w['start']:
                                line_str += f"{{\\alpha&HFF&}}{w['word']}{{\\alpha&H60&}} "
                            else:
                                line_str += f"{w['word']} "
                        text_layer += line_str.strip() + "\\N"
                    
                    ass_content += f"Dialogue: 0,{w_start},{w_end},Default,,0,0,0,,{pos_tag}{text_layer.strip()}\n"

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

@app.post("/api/export")
async def export_video(req: ExportRequest):
    if not is_valid_uuid(req.video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    video_path = None
    for file in os.listdir(UPLOAD_DIR):
        if file.startswith(req.video_id):
            video_path = os.path.join(UPLOAD_DIR, file)
            break
            
    if not video_path:
        raise HTTPException(status_code=404, detail="Video not found")
        
    ffmpeg_exe = get_ffmpeg_path()
    video_width, video_height = get_video_dimensions(video_path, ffmpeg_exe)
    
    crop_filter = ""
    segments_dicts = [s.dict() for s in req.segments]
    face_bboxes, avg_face_x = get_face_bboxes_for_segments(video_path, segments_dicts)
    
    if req.styles.aspect_ratio == "9:16":
        target_width = int(video_height * 9 / 16)
        # Ensure we don't scale up width
        if target_width > video_width:
            target_width = video_width
            target_height = int(video_width * 16 / 9)
            crop_filter = f"crop={target_width}:{target_height}"
            video_height = target_height
        else:
            # Smart crop: center on avg_face_x
            target_x = int((avg_face_x * video_width) - (target_width / 2))
            target_x = max(0, min(target_x, video_width - target_width))
            crop_filter = f"crop={target_width}:{video_height}:{target_x}:0"
            video_width = target_width
        
    ass_path = os.path.join(OUTPUT_DIR, f"{req.video_id}.ass")
    generate_ass_file(segments_dicts, req.styles, ass_path, video_width, video_height, face_bboxes)
    
    out_video_path = req.save_path if req.save_path else os.path.join(OUTPUT_DIR, f"{req.video_id}_final.mp4")
    
    abs_ass_path = os.path.abspath(ass_path).replace("\\", "/")
    abs_ass_path = abs_ass_path.replace(":", "\\:")
    
    inputs = ["-i", video_path]
    filter_chains = []
    
    if crop_filter:
        filter_chains.append(f"[0:v]{crop_filter}[v_crop]")
        last_v = "v_crop"
    else:
        last_v = "0:v"
    
    for i, ov in enumerate(req.overlays):
        overlay_path = None
        for file in os.listdir(UPLOAD_DIR):
            if file.startswith(ov.id):
                overlay_path = os.path.join(UPLOAD_DIR, file)
                break
        if overlay_path:
            inputs.extend(["-i", overlay_path])
            idx = len(inputs) // 2 - 1
            # Scale overlay maintaining aspect ratio to max 80% width/height of video
            # and overlay it centered between start and end times
            filter_chains.append(f"[{idx}:v]scale='min(iw, {video_width}*0.8)':'min(ih, {video_height}*0.8)':force_original_aspect_ratio=decrease[ol{i}]")
            filter_chains.append(f"[{last_v}][ol{i}]overlay=x=(W-w)/2:y=(H-h)/2:enable='between(t,{ov.start},{ov.end})'[v{i+1}]")
            last_v = f"v{i+1}"
    
    # Fonts dir config for custom fonts
    # ASS filter uses fontconfig or fontsdir. We can supply fontsdir to FFmpeg ASS filter.
    abs_fonts_dir = os.path.abspath(UPLOAD_DIR).replace("\\", "/")
    abs_fonts_dir = abs_fonts_dir.replace(":", "\\:")
            
    filter_chains.append(f"[{last_v}]ass='{abs_ass_path}':fontsdir='{abs_fonts_dir}',format=yuv420p,pad=ceil(iw/2)*2:ceil(ih/2)*2[outv]")
    filter_complex = ";".join(filter_chains)
    
    encoder = await get_hardware_encoder(ffmpeg_exe)
    
    cmd = [ffmpeg_exe, "-y"] + inputs + [
        "-filter_complex", filter_complex,
        "-map", "[outv]", "-map", "0:a?",
        "-c:v", encoder, "-crf", "18", "-preset", "fast" if encoder == "libx264" else "p4",
        "-c:a", "copy",
        out_video_path
    ]
    
    creation_flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
    
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            creationflags=creation_flags
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            print(stderr.decode())
            raise Exception(stderr.decode())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting video: {str(e)}")
        
    return {"status": "success", "url": None if req.save_path else f"/api/static_outputs/{req.video_id}_final.mp4"}

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


@app.post("/api/remove_silence")
async def remove_silence(req: SilenceRemoveRequest):
    if not is_valid_uuid(req.video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
        
    video_path = None
    for file in os.listdir(UPLOAD_DIR):
        if file.startswith(req.video_id) and file.endswith((".mp4", ".mov", ".mkv", ".webm")):
            video_path = os.path.join(UPLOAD_DIR, file)
            break
            
    if not video_path:
        raise HTTPException(status_code=404, detail="Video not found")
        
    ffmpeg_exe = get_ffmpeg_path()
    video_width, video_height = get_video_dimensions(video_path, ffmpeg_exe)
    
    # 1. Identify valid spoken chunks (non-silent)
    words = []
    for seg in req.segments:
        for w in seg.get('words', []):
            words.append(w)
            
    if not words:
        return {"video_id": req.video_id, "segments": req.segments}
        
    keep_chunks = []
    current_chunk = {"start": max(0, words[0]['start'] - req.padding), "end": words[0]['end'] + req.padding}
    
    for i in range(1, len(words)):
        w = words[i]
        gap = w['start'] - current_chunk['end']
        if gap > req.threshold:
            # Silence detected! Close current chunk and start new one
            keep_chunks.append(current_chunk)
            current_chunk = {"start": max(0, w['start'] - req.padding), "end": w['end'] + req.padding}
        else:
            current_chunk['end'] = w['end'] + req.padding
            
    keep_chunks.append(current_chunk)
    
    # If it's basically the whole video, just return
    if len(keep_chunks) == 1 and keep_chunks[0]['start'] <= 0.5:
        # We might check against total duration, but for now just return if 1 chunk
        pass # Actually we still want to process it in case the end was cut, but usually 1 chunk means no silence removed.
        
    # 2. Adjust segments timestamps for the NEW video
    new_segments = []
    import copy
    
    time_offset = 0.0
    for chunk in keep_chunks:
        # Every word that falls in this chunk will be shifted by (chunk['start'] - time_offset)
        # Wait, the time in the new video for this chunk starts at `time_offset`.
        # So a word at `w_start` inside this chunk will become `time_offset + (w_start - chunk['start'])`
        pass
        
    new_segments = []
    for seg in req.segments:
        new_seg = copy.deepcopy(seg)
        valid_words = []
        for w in new_seg.get('words', []):
            # Find which chunk this word belongs to
            for chunk_idx, chunk in enumerate(keep_chunks):
                if chunk['start'] - 0.2 <= w['start'] <= chunk['end'] + 0.2:
                    # Calculate cumulative duration of all PREVIOUS chunks
                    prev_duration = sum(c['end'] - c['start'] for c in keep_chunks[:chunk_idx])
                    
                    shift = prev_duration - chunk['start']
                    w['start'] = round(w['start'] + shift, 3)
                    w['end'] = round(w['end'] + shift, 3)
                    valid_words.append(w)
                    break
        
        if valid_words:
            new_seg['start'] = valid_words[0]['start']
            new_seg['end'] = valid_words[-1]['end']
            new_seg['words'] = valid_words
            new_segments.append(new_seg)

    # 3. Cut video using FFmpeg filter_complex
    new_video_id = str(uuid.uuid4())
    _, ext = os.path.splitext(video_path)
    out_video_path = os.path.join(UPLOAD_DIR, f"{new_video_id}{ext}")
    
    filter_complex = []
    concat_v = ""
    concat_a = ""
    
    for i, chunk in enumerate(keep_chunks):
        st = chunk['start']
        en = chunk['end']
        filter_complex.append(f"[0:v]trim=start={st}:end={en},setpts=PTS-STARTPTS[v{i}];")
        filter_complex.append(f"[0:a]atrim=start={st}:end={en},asetpts=PTS-STARTPTS[a{i}];")
        concat_v += f"[v{i}]"
        concat_a += f"[a{i}]"
        
    filter_complex.append(f"{concat_v}{concat_a}concat=n={len(keep_chunks)}:v=1:a=1[outv][outa]")
    
    encoder = await get_hardware_encoder(ffmpeg_exe)
    
    cmd = [
        ffmpeg_exe, "-y", "-i", video_path,
        "-filter_complex", "".join(filter_complex),
        "-map", "[outv]", "-map", "[outa]",
        "-c:v", encoder, "-crf", "18", "-preset", "fast" if encoder == "libx264" else "p4",
        out_video_path
    ]
    
    creation_flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        creationflags=creation_flags
    )
    stdout, stderr = await process.communicate()
    
    if process.returncode != 0:
        raise HTTPException(status_code=500, detail=f"FFmpeg error: {stderr.decode(errors='ignore')}")
        
    return {
        "status": "success",
        "video_id": new_video_id,
        "url": f"/api/static_uploads/{new_video_id}{ext}",
        "segments": new_segments
    }


@app.post("/api/diarize")
async def diarize_audio(req: SilenceRemoveRequest):
    if not is_valid_uuid(req.video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
        
    audio_path = os.path.join(UPLOAD_DIR, f"{req.video_id}.wav")
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio not found")
        
    try:
        import librosa
        import numpy as np
        from sklearn.cluster import KMeans
        
        # Load audio
        y, sr = librosa.load(audio_path, sr=16000)
        
        # Extract features for each segment
        features = []
        valid_indices = []
        for i, seg in enumerate(req.segments):
            start_sample = int(seg['start'] * sr)
            end_sample = int(seg['end'] * sr)
            
            # Ensure within bounds
            start_sample = max(0, min(start_sample, len(y)-1))
            end_sample = max(0, min(end_sample, len(y)))
            
            chunk = y[start_sample:end_sample]
            if len(chunk) > 100:
                mfcc = librosa.feature.mfcc(y=chunk, sr=sr, n_mfcc=13)
                mfcc_mean = np.mean(mfcc.T, axis=0)
                features.append(mfcc_mean)
                valid_indices.append(i)
                
        if len(features) > 1:
            X = np.array(features)
            kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X)
            
            for f_idx, seg_idx in enumerate(valid_indices):
                req.segments[seg_idx]['speaker'] = f"SPEAKER_{labels[f_idx] + 1}"
                
    except Exception as e:
        print(f"Diarization error: {e}")
        
    return {"status": "success", "segments": req.segments}

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404)
        
    path = os.path.join(FRONTEND_DIR, full_path)
    if os.path.isfile(path):
        return FileResponse(path)
        
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>Frontend not built or found</h1>", status_code=404)
