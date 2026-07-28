import os

file_path = 'c:/captions/frontend/src/app/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

state_code = "  const [isRemovingSilence, setIsRemovingSilence] = useState(false);\n"
code = code.replace('const [isGenerating, setIsGenerating] = useState(false);', 'const [isGenerating, setIsGenerating] = useState(false);\n' + state_code)

func_code = """
  const handleRemoveSilence = async () => {
    if (!videoId || segments.length === 0) return;
    setIsRemovingSilence(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/remove_silence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, segments, threshold: 0.8 }),
      });
      if (response.ok) {
        const data = await response.json();
        setVideoId(data.video_id);
        setVideoUrl(data.url);
        setSegments(data.segments);
      } else {
        alert('Failed to remove silences');
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to backend');
    } finally {
      setIsRemovingSilence(false);
    }
  };
"""
code = code.replace('const handleGenerate = async () => {', func_code + '\n  const handleGenerate = async () => {')

ui_code = """
              {/* Magic Tools */}
              <div className="bg-black/20 border border-white/5 p-4 rounded-xl mt-6">
                <label className="text-sm font-semibold text-purple-400 mb-3 block flex items-center gap-2"><Wand2 className="w-4 h-4" /> Magic Tools</label>
                <button 
                  onClick={handleRemoveSilence}
                  disabled={isRemovingSilence || segments.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(147,51,234,0.3)]"
                >
                  {isRemovingSilence ? 'Slicing Video...' : '✂️ Remove Silences (Auto Cut)'}
                </button>
                <p className="text-xs text-white/40 mt-2 text-center">Automatically cuts out long pauses.</p>
              </div>
"""
code = code.replace('{/* Custom Styles */}', ui_code + '\n              {/* Custom Styles */}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Frontend patched")
