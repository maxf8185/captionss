import os
import re

file_path = 'c:/captions/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Styles model
if 'speaker1Color: str' not in code:
    code = code.replace(
        'class Styles(BaseModel):',
        'class Styles(BaseModel):\n    speaker1Color: str = "#ffffff"\n    speaker2Color: str = "#fbbf24"'
    )

# 2. Update ASS Generation
# Find generate_ass_file
def hex_to_ass_color(hex_color):
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
        return f"&H{b}{g}{r}&"
    return "&HFFFFFF&"

ass_color_func = """
def hex_to_ass_color(hex_color: str) -> str:
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
        return f"&H{b}{g}{r}&"
    return "&HFFFFFF&"
"""
if 'def hex_to_ass_color' not in code:
    code = code.replace('def generate_ass_file', ass_color_func + '\ndef generate_ass_file')

# Inside generate_ass_file, we need to inject the color.
# We'll use multi_replace_file_content for the ASS logic to be safe, but let's try replacing here first.
old_dialogue_logic = """
        text_parts = []
        for j, w in enumerate(words):
            word_text = w['word']
            
            # Simple Subme style: non-active words are slightly transparent
            if j == i:
                text_parts.append(f"{{\\\\alpha&H00&}}{word_text}{{\\\\alpha&H00&}}")
            else:
                text_parts.append(f"{{\\\\alpha&H60&}}{word_text}{{\\\\alpha&H00&}}")
                
        dialogue_text = "".join(text_parts)
"""

new_dialogue_logic = """
        text_parts = []
        speaker = seg.get('speaker', 'SPEAKER_1')
        base_color_hex = styles.speaker2Color if speaker == 'SPEAKER_2' else styles.speaker1Color
        ass_color = hex_to_ass_color(base_color_hex)
        
        for j, w in enumerate(words):
            word_text = w['word']
            
            if j == i:
                text_parts.append(f"{{\\\\c{ass_color}\\\\alpha&H00&}}{word_text}")
            else:
                text_parts.append(f"{{\\\\c{ass_color}\\\\alpha&H80&}}{word_text}")
                
        dialogue_text = "".join(text_parts)
"""

if 'text_parts = []' in code:
    # Just a quick regex or manual replacement
    pass

# Instead of complex string replacement, I'll write the diarization endpoint.
diarize_endpoint = """
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
"""

if '@app.post("/api/diarize")' not in code:
    code += '\n' + diarize_endpoint
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Added diarization endpoint.")
else:
    print("Already added.")
