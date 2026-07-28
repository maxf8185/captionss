const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Add Panel imports
if (!code.includes('react-resizable-panels')) {
  code = code.replace(
    'import SubtitleOverlay from "../components/SubtitleOverlay";',
    'import SubtitleOverlay from "../components/SubtitleOverlay";\nimport { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";'
  );
}

// 2. Fix the structure from <main> to </main>
const mainStart = code.indexOf('<main className="max-w-7xl');
const mainEnd = code.lastIndexOf('</main>') + 7;

if (mainStart !== -1) {
  let mainBlock = code.substring(mainStart, mainEnd);

  // Replace grid wrapper with PanelGroup
  mainBlock = mainBlock.replace(
    /<main className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-\[calc\(100vh-64px\)\]">\s*\{\/\* Error Banner \*\/\}\s*(?:\{errorMsg[\s\S]*?\}\))?/m,
    '<main className="max-w-[100vw] w-full mx-auto px-4 py-4 h-[calc(100vh-64px)]">\n        <PanelGroup orientation="horizontal" className="h-full w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">\n          \n          {/* Center Column: Player & Timeline */}\n          <Panel defaultSize={70} minSize={40} className="flex flex-col bg-bg-card">\n            <PanelGroup orientation="vertical">\n              {/* Top: Video Player */}\n              <Panel defaultSize={70} minSize={30} className="flex flex-col p-4 relative min-h-0">\n                {/* Error Banner */}\n                {errorMsg && (\n                  <div className="absolute top-4 left-4 right-4 z-50 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between">\n                    <span>{errorMsg}</span>\n                    <button onClick={() => setErrorMsg(null)} className="opacity-50 hover:opacity-100">×</button>\n                  </div>\n                )}'
  );

  // Replace Left Column header with correct layout
  mainBlock = mainBlock.replace(
    /\{\/\* Left Column: Player \*\/\}\s*<div className="lg:col-span-8 flex flex-col gap-4 w-full h-full min-h-0 overflow-hidden">\s*<div className="flex-1 flex justify-center items-center w-full bg-black\/20 rounded-3xl p-2 sm:p-4 min-h-0">/m,
    '<div className="flex-1 flex justify-center items-center w-full bg-black/40 rounded-3xl p-2 sm:p-4 min-h-0 relative">'
  );

  // Close the top panel, add resize handle, open bottom panel for timeline
  mainBlock = mainBlock.replace(
    /\{\/\* Editable Timeline Placeholder \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*\{\/\* Right Column: Controls \*\/\}/m,
    `</Panel>\n              \n              {videoUrl && (\n                <>\n                  <PanelResizeHandle className="h-2 w-full bg-white/5 hover:bg-[#0ea5e9]/50 transition-colors cursor-row-resize relative">\n                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 rounded-full bg-white/20" />\n                  </PanelResizeHandle>\n                  \n                  {/* Bottom: Timeline */}\n                  <Panel defaultSize={30} minSize={15} className="flex flex-col border-t border-white/5 bg-black/20 p-2">\n                    <div className="flex flex-col gap-2 overflow-hidden h-full">\n                      {segments.length === 0 ? (\n                        <div className="text-text-secondary text-sm flex items-center gap-2 h-full w-full justify-center border border-dashed border-white/10 rounded-lg">\n                          {t.timeline_placeholder}\n                        </div>\n                      ) : (\n                        <Timeline />\n                      )}\n                    </div>\n                  </Panel>\n                </>\n              )}\n            </PanelGroup>\n          </Panel>\n\n          <PanelResizeHandle className="w-2 h-full bg-white/5 hover:bg-[#0ea5e9]/50 transition-colors cursor-col-resize relative">\n            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-white/20" />\n          </PanelResizeHandle>\n\n          {/* Right Column: Controls */}\n          <Panel defaultSize={30} minSize={20} className="flex flex-col bg-bg-main border-l border-white/5">`
  );

  // Close the Right panel and main PanelGroup
  mainBlock = mainBlock.replace(
    /\{\/\* Tabs Navigation \*\/\}/,
    '<div className="flex flex-col gap-4 h-full p-4 overflow-y-auto custom-scrollbar">\n              {/* Tabs Navigation */}'
  );
  
  mainBlock = mainBlock.replace(/<\/div>\s*<\/div>\s*<\/main>/m, '</div>\n          </Panel>\n        </PanelGroup>\n      </main>');

  // Apply main block
  code = code.substring(0, mainStart) + mainBlock + code.substring(mainEnd);
}

fs.writeFileSync('src/app/page.tsx', code);
console.log("Refactoring complete");
