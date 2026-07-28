import os

file_path = 'c:/captions/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix CORS
code = code.replace(
    'allow_origins=["*"]',
    'allow_origins=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:8000"]'
)

# 2. Add UUID validation function
uuid_func = """
def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False
"""
code = code.replace('import uuid\n', 'import uuid\n' + uuid_func + '\n')

# 3. Add validation to endpoints
code = code.replace(
    'async def generate_captions(req: GenerateRequest):',
    'async def generate_captions(req: GenerateRequest):\n    if not is_valid_uuid(req.video_id):\n        raise HTTPException(status_code=400, detail="Invalid video ID")'
)

code = code.replace(
    'async def get_progress(video_id: str):',
    'async def get_progress(video_id: str):\n    if not is_valid_uuid(video_id):\n        raise HTTPException(status_code=400, detail="Invalid video ID")'
)

code = code.replace(
    'async def export_video(req: ExportRequest):',
    'async def export_video(req: ExportRequest):\n    if not is_valid_uuid(req.video_id):\n        raise HTTPException(status_code=400, detail="Invalid video ID")'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Security patched successfully.")
