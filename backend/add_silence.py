import os

file_path = 'c:/captions/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

model_code = """
class SilenceRemoveRequest(BaseModel):
    video_id: str
    segments: List[dict]
    threshold: float = 0.8
    padding: float = 0.1
"""

endpoint_code = """
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
"""

if 'class ExportRequest' in code:
    code = code.replace('class ExportRequest', model_code + '\nclass ExportRequest')
    code += '\n' + endpoint_code
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Silence removal endpoint added.")
else:
    print("ExportRequest not found")
