import os

file_path = 'c:/captions/frontend/src/components/Timeline.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

sticky_labels = """
      {/* Sticky Track Labels */}
      <div className="sticky left-0 top-0 bottom-0 w-24 bg-black/90 border-r border-white/10 z-[60] flex flex-col justify-start backdrop-blur-sm shadow-[10px_0_15px_rgba(0,0,0,0.5)]">
        <div className="h-6 w-full text-[10px] text-white/50 flex items-center px-2 font-mono border-b border-white/5">Tracks</div>
        <div className="absolute top-6 h-10 w-full flex items-center px-2 text-[10px] text-white/70 font-semibold bg-white/5 border-l-2 border-[#0ea5e9]">
          🌅 V1 (Media)
        </div>
        <div className="absolute top-20 h-10 w-full flex items-center px-2 text-[10px] text-black font-semibold bg-[#ffe534]/90 border-l-2 border-[#ffcc00]">
          📝 T1 (Text)
        </div>
      </div>
"""

# Find where to insert sticky labels. It should be inside the scrollable container, but wait!
# If it's inside `overflow-x-auto` with `sticky left-0`, it will scroll nicely!
# The structure is:
# <div className="relative h-40 overflow-x-auto ...">
#   <div className="relative h-full" style={{ width: ... }}>
# Wait, sticky position inside the scrollable wrapper works if it's placed correctly.
# Actually, the sticky element should be a direct child of the scrolling container.

# Let's see the structure:
"""
    <div 
      ref={timelineRef}
      className="relative h-40 overflow-x-auto overflow-y-hidden rounded-lg bg-black cursor-pointer custom-scrollbar border border-white/5"
      onClick={...}
    >
      <div className="relative h-full" style={{ width: `${Math.max(800, duration * 150)}px` }}>
"""

# Let's change the structure slightly. We can wrap the inner div in a flex container if we want, or just add the sticky element inside the outer div!
# But the outer div is onClick. It's better to just put the sticky element inside the outer div, before the long inner div? No, they must be siblings, but one is sticky.

sticky_wrapper_start = """
    <div className="relative border border-white/5 rounded-lg flex bg-black h-40 overflow-hidden">
      {/* Sticky Track Labels */}
      <div className="w-24 shrink-0 bg-[#0a0a0a] border-r border-white/10 z-[60] flex flex-col relative shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
        <div className="h-5 w-full text-[9px] text-white/30 flex items-center px-2 font-mono border-b border-white/5">TRACKS</div>
        <div className="absolute top-5 h-10 w-full flex items-center px-2 text-[10px] text-white/70 font-semibold bg-white/5 border-l-[3px] border-[#0ea5e9] hover:bg-white/10 transition-colors cursor-default">
          🌅 V1 Media
        </div>
        <div className="absolute top-[76px] h-9 w-full flex items-center px-2 text-[10px] text-black font-bold bg-[#ffe534]/90 border-l-[3px] border-white shadow-[0_0_10px_rgba(255,229,52,0.3)] hover:brightness-110 transition-all cursor-default">
          📝 T1 Text
        </div>
        <div className="absolute bottom-0 h-8 w-full flex items-center px-2 text-[10px] text-white/50 font-semibold bg-white/5 border-l-[3px] border-purple-500 cursor-default">
          🎵 A1 Audio
        </div>
      </div>
      
      {/* Scrollable Timeline Area */}
      <div 
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar cursor-crosshair"
        onClick={(e) => {
          if (!timelineRef.current || !videoRef?.current) return;
          const rect = timelineRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
          const newTime = (clickX / (duration * 150)) * duration;
          videoRef.current.currentTime = newTime;
        }}
      >
"""

# Replace the original wrapper with this new layout.
code = code.replace(
    '<div \n      ref={timelineRef}\n      className="relative h-40 overflow-x-auto overflow-y-hidden rounded-lg bg-black cursor-pointer custom-scrollbar border border-white/5"',
    sticky_wrapper_start.replace('      <div \n        ref={timelineRef}', '') + '      <div \n        ref={timelineRef}' # Hacky replacement to avoid regex issues
)
code = code.replace(
    'className="relative h-40 overflow-x-auto overflow-y-hidden rounded-lg bg-black cursor-pointer custom-scrollbar border border-white/5"',
    'DEADCODE'
)

# And add the closing div at the end
code = code.replace('    </div>\n  );\n}', '    </div>\n    </div>\n  );\n}')

# Now I need to fix the outer replacement properly.
import re
new_code = re.sub(
    r'<div\s+ref=\{timelineRef\}\s+className="relative h-40 overflow-x-auto overflow-y-hidden rounded-lg bg-black cursor-pointer custom-scrollbar border border-white/5"\s+onClick=\{.*?\s+\}\s+>',
    sticky_wrapper_start.strip(),
    code,
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_code)

print("Timeline patched with Multi-Track UI.")
