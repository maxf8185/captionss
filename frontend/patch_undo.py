import os

file_path = 'c:/captions/frontend/src/app/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Import Undo/Redo/PastStates
if 'const undo =' not in code:
    undo_hook = """
  // Undo/Redo functionality
  const undo = usePlayerStore.temporal(state => state.undo);
  const redo = usePlayerStore.temporal(state => state.redo);
  const pastStates = usePlayerStore.temporal(state => state.pastStates);
  const futureStates = usePlayerStore.temporal(state => state.futureStates);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
"""
    # Insert right after const activeTab state
    code = code.replace("const [activeTab, setActiveTab] = useState('templates');", "const [activeTab, setActiveTab] = useState('templates');\n" + undo_hook)

# Add UI Buttons for Undo/Redo near the Magic Tools or Top Bar
if 'Undo <span className' not in code:
    ui_buttons = """
              {/* Undo/Redo Controls */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={undo}
                  disabled={pastStates.length === 0}
                  className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-lg p-2 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                >
                  ↩️ Undo <span className="opacity-50 font-normal">(Ctrl+Z)</span>
                </button>
                <button
                  onClick={redo}
                  disabled={futureStates.length === 0}
                  className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-lg p-2 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                >
                  ↪️ Redo <span className="opacity-50 font-normal">(Ctrl+Shift+Z)</span>
                </button>
              </div>
"""
    code = code.replace('</p>\n              </div>', '</p>\n              </div>' + ui_buttons)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Undo/Redo added to page.tsx.")
