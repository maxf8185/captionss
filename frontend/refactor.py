import sys

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add Panel imports
if 'react-resizable-panels' not in code:
    code = code.replace(
        'import SubtitleOverlay from "../components/SubtitleOverlay";',
        'import SubtitleOverlay from "../components/SubtitleOverlay";\nimport { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";'
    )

# 2. Fix the structure
code = code.replace(
    '<main className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-64px)]">',
    '<main className="max-w-[100vw] w-full mx-auto px-4 py-4 h-[calc(100vh-64px)]">\n        <PanelGroup orientation="horizontal" className="h-full w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">\n          {/* Center Column: Player & Timeline */}\n          <Panel defaultSize={70} minSize={40} className="flex flex-col bg-bg-card">\n            <PanelGroup orientation="vertical">\n              {/* Top: Video Player */}\n              <Panel defaultSize={70} minSize={30} className="flex flex-col p-4 relative min-h-0">'
)

code = code.replace(
    '{/* Left Column: Player */}\n        <div className="lg:col-span-8 flex flex-col gap-4 w-full h-full min-h-0 overflow-hidden">',
    ''
)

code = code.replace(
    '<div className="flex-1 flex justify-center items-center w-full bg-black/20 rounded-3xl p-2 sm:p-4 min-h-0">',
    '<div className="flex-1 flex justify-center items-center w-full bg-black/40 rounded-3xl p-2 sm:p-4 min-h-0 relative">'
)

# Editable Timeline Placeholder replacement
code = code.replace(
    '{/* Editable Timeline Placeholder */}\n          <div className="h-48 shrink-0 bg-black/20 rounded-3xl p-4 border border-white/5 flex flex-col">\n            <h2 className="text-lg font-bold text-text-primary mb-2 shrink-0">{t.timeline}</h2>\n            <div className="flex-1 overflow-hidden relative">\n              {segments.length === 0 ? (\n                <div className="text-text-secondary text-sm flex items-center gap-2 h-full justify-center border border-dashed border-white/10 rounded-xl">\n                  <FileText className="w-4 h-4" /> {t.timeline_placeholder}\n                </div>\n              ) : (\n                <Timeline />\n              )}\n            </div>\n          </div>',
    '</Panel>\n              {videoUrl && (\n                <>\n                  <PanelResizeHandle className="h-2 w-full bg-white/5 hover:bg-[#0ea5e9]/50 transition-colors cursor-row-resize relative">\n                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 rounded-full bg-white/20" />\n                  </PanelResizeHandle>\n                  <Panel defaultSize={30} minSize={15} className="flex flex-col border-t border-white/5 bg-black/20 p-2">\n                    <div className="flex flex-col gap-2 overflow-hidden h-full">\n                      {segments.length === 0 ? (\n                        <div className="text-text-secondary text-sm flex items-center gap-2 h-full w-full justify-center border border-dashed border-white/10 rounded-lg">\n                          {t.timeline_placeholder}\n                        </div>\n                      ) : (\n                        <Timeline />\n                      )}\n                    </div>\n                  </Panel>\n                </>\n              )}\n            </PanelGroup>\n          </Panel>'
)

code = code.replace(
    '</div>\n\n        {/* Right Column: Controls */}\n        <div className="lg:col-span-4 flex flex-col bg-bg-card rounded-3xl border border-white/5 overflow-hidden shadow-2xl h-full min-h-0">',
    '<PanelResizeHandle className="w-2 h-full bg-white/5 hover:bg-[#0ea5e9]/50 transition-colors cursor-col-resize relative">\n            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-white/20" />\n          </PanelResizeHandle>\n\n          {/* Right Column: Controls */}\n          <Panel defaultSize={30} minSize={20} className="flex flex-col bg-bg-main border-l border-white/5">'
)

code = code.replace(
    '{/* Tabs Navigation */}',
    '<div className="flex flex-col gap-4 h-full p-4 overflow-y-auto custom-scrollbar">\n            {/* Tabs Navigation */}'
)

code = code.replace(
    '        </div>\n      </main>',
    '          </div>\n          </Panel>\n        </PanelGroup>\n      </main>'
)

# 3. Fix TS types and leftover issues
import re
code = re.sub(r'setSegments\(\(segs: any\[\]\) => segs\.map\(s => \(\{', r'setSegments(segments.map((s: any) => ({', code)
code = re.sub(r'setSegments\(segs => segs\.map\(s => \(\{', r'setSegments(segments.map((s: any) => ({', code)
code = code.replace('start: currentTime,', 'start: usePlayerStore.getState().currentTime,')
code = code.replace('end: Math.min(currentTime + 3, duration)', 'end: Math.min(usePlayerStore.getState().currentTime + 3, usePlayerStore.getState().duration)')

# Remove activeSegment usage entirely since it relies on currentTime
code = re.sub(
    r'\/\/ Find active segment and words based on current time\s*const activeSegment = segments\.find\(\s*\(s\) => currentTime >= s\.start && currentTime <= s\.end\s*\);\s*',
    '',
    code,
    flags=re.MULTILINE
)

# Remove the duplicate isGenerating line
code = re.sub(
    r'const \[isGenerating, setIsGenerating\] = useState\(false\);\s*const \[isGenerating, setIsGenerating\] = useState\(false\);',
    'const [isGenerating, setIsGenerating] = useState(false);',
    code,
    flags=re.MULTILINE
)

# Remove the segments useState line
code = re.sub(
    r'const \[segments, setSegments\] = useState<any\[\]>\(\[\]\);\n',
    '',
    code
)

# Remove duplicate }, [theme]);
code = re.sub(
    r'  }, \[theme\]\);\s*  }, \[theme\]\);',
    '  }, [theme]);',
    code,
    flags=re.MULTILINE
)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Refactoring completed via python script")
