import os

file_path = 'c:/captions/frontend/src/app/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State for custom presets
custom_preset_state = """
  // Custom Presets
  const [customPresets, setCustomPresets] = useState<{name: string, style: any}[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('customPresets');
    if (stored) {
      try {
        setCustomPresets(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const saveCurrentPreset = () => {
    const name = prompt("Enter a name for your custom preset:");
    if (!name) return;
    const newPreset = { name, style: { ...styles } };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
  };
"""

if 'const [customPresets, setCustomPresets]' not in code:
    code = code.replace(
        '  const applyPreset = (preset: string) => {',
        custom_preset_state + '\n  const applyPreset = (preset: string | any) => {'
    )

# 2. Modify applyPreset logic to handle objects directly (for custom presets)
apply_preset_logic = """
  const applyPreset = (preset: string | any) => {
    if (typeof preset === 'object') {
      setStyles(preset);
      return;
    }
    if (preset === "hormozi") {
"""

if 'if (typeof preset === \'object\')' not in code:
    code = code.replace(
        '  const applyPreset = (preset: string | any) => {\n    if (preset === "hormozi") {',
        apply_preset_logic
    )
    # Also catch if it didn't have the string | any replacement due to timing
    code = code.replace(
        '  const applyPreset = (preset: string) => {\n    if (preset === "hormozi") {',
        apply_preset_logic
    )

# 3. Add UI elements for saving and loading presets
preset_ui_html = """
              {/* Presets */}
              <div className="bg-black/20 border border-white/5 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-text-primary block flex items-center gap-2"><Wand2 className="w-4 h-4 text-[#0ea5e9]" /> AI Style Presets</label>
                  <button onClick={saveCurrentPreset} className="text-xs bg-[#2563eb] hover:bg-[#0ea5e9] text-white px-2 py-1 rounded transition-all">Save Current</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => applyPreset('hormozi')} className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 rounded-lg p-2 text-xs font-bold text-yellow-500 transition-all">Hormozi (1 Word)</button>
                  <button onClick={() => applyPreset('karaoke')} className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30 rounded-lg p-2 text-xs font-bold text-cyan-400 transition-all">Karaoke Pop</button>
                  <button onClick={() => applyPreset('minimalist')} className="bg-gradient-to-br from-gray-500/20 to-gray-400/20 hover:from-gray-500/30 hover:to-gray-400/30 border border-gray-500/30 rounded-lg p-2 text-xs font-bold text-gray-300 transition-all">Minimalist</button>
                  {customPresets.map((cp, idx) => (
                    <button key={idx} onClick={() => applyPreset(cp.style)} className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-2 text-xs font-bold text-white transition-all overflow-hidden text-ellipsis whitespace-nowrap" title={cp.name}>{cp.name}</button>
                  ))}
                </div>
              </div>
"""

# We need to replace the old Presets UI box.
import re
old_preset_regex = re.compile(r'\{\/\* Presets \*\/\}.*?<\/div>.*?<\/div>', re.DOTALL)
match = old_preset_regex.search(code)
if match:
    code = code[:match.start()] + preset_ui_html + code[match.end():]
else:
    print("Could not find old preset UI box.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Custom presets added to page.tsx.")
