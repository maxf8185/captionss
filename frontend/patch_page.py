import os

file_path = 'c:/captions/frontend/src/app/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

if 'speaker1Color' not in code:
    code = code.replace(
        'fontSize: 72,',
        'fontSize: 72,\n    speaker1Color: "#0ea5e9",\n    speaker2Color: "#fbbf24",'
    )

diarize_func = """
  const handleDiarize = async () => {
    if (!videoId || segments.length === 0) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/diarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, segments }),
      });
      if (response.ok) {
        const data = await response.json();
        setSegments(data.segments);
        alert('Speakers recognized and color-coded!');
      }
    } catch (e) {
      console.error(e);
    }
  };
"""

if 'handleDiarize' not in code:
    code = code.replace('const handleRemoveSilence', diarize_func + '\n  const handleRemoveSilence')

ui_btn = """
                <button 
                  onClick={handleDiarize}
                  disabled={segments.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 mt-2 transition-all shadow-[0_4px_15px_rgba(14,165,233,0.3)]"
                >
                  👥 Auto-Color Speakers (AI)
                </button>
"""

if 'Auto-Color Speakers' not in code:
    code = code.replace('</p>\n              </div>', '</p>' + ui_btn + '\n              </div>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Frontend updated for Diarization.")
