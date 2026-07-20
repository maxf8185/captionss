"use client";
import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Video, Settings, Wand2, Download, Play, Pause, Palette, Type, AlignCenter } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [language, setLanguage] = useState("auto");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [styles, setStyles] = useState({
    font_name: "Arial",
    font_size: 42,
    primary_color: "#FFFFFF",
    highlight_color: "#FBBF24", // yellow-400
    position: "Bottom",
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setVideoId(data.video_id);
      setVideoUrl(`http://localhost:8000${data.url}`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Помилка завантаження. Переконайтеся, що backend запущено.");
    }
  };

  const handleGenerate = async () => {
    setErrorMsg(null);
    if (!videoId) return;
    setIsGenerating(true);
    try {
      const res = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, language }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setSegments(data.segments);
    } catch (err) {
      console.error(err);
      setErrorMsg("Помилка генерації субтитрів.");
    }
    setIsGenerating(false);
  };

  const handleExport = async () => {
    setErrorMsg(null);
    if (!videoId || segments.length === 0) return;
    try {
      const res = await fetch("http://localhost:8000/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          segments,
          styles,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      if (data.status === "success") {
        window.open(`http://localhost:8000${data.url}`, "_blank");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Помилка експорту. Можливо, FFmpeg не встановлено на комп'ютері.");
    }
  };

  // Find active segment and words based on current time
  const activeSegment = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 -z-10" />
      
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">AutoCaps<span className="text-indigo-400">.ai</span></h1>
          </div>
          <div className="flex gap-4">
            {videoId && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-slate-200 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" /> Export Video
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="lg:col-span-12 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="opacity-50 hover:opacity-100">×</button>
          </div>
        )}

        {/* Left Column: Player */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="relative aspect-video bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group backdrop-blur-sm">
            {!videoUrl ? (
              <label className="flex flex-col items-center gap-4 cursor-pointer p-12 text-slate-400 hover:text-white transition-colors">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-lg">Click to upload video</p>
                  <p className="text-sm opacity-60">MP4, MOV, WebM</p>
                </div>
                <input type="file" className="hidden" accept="video/*" onChange={handleUpload} />
              </label>
            ) : (
              <>
                <video 
                  ref={videoRef}
                  src={videoUrl} 
                  className="w-full h-full object-contain"
                  controls
                />
                
                {/* Custom Subtitle Overlay */}
                {activeSegment && (
                  <div 
                    className="absolute left-0 right-0 pointer-events-none flex justify-center px-12"
                    style={{
                      bottom: styles.position === "Bottom" ? "10%" : "auto",
                      top: styles.position === "Top" ? "10%" : "auto",
                      alignItems: styles.position === "Middle" ? "center" : "auto",
                      height: styles.position === "Middle" ? "100%" : "auto",
                    }}
                  >
                    <div className="text-center max-w-3xl" style={{ fontFamily: styles.font_name, fontSize: `${styles.font_size}px`, lineHeight: 1.2 }}>
                      {activeSegment.words.map((w: any, i: number) => {
                        const isActive = currentTime >= w.start && currentTime <= w.end;
                        return (
                          <span 
                            key={i} 
                            style={{ 
                              color: isActive ? styles.highlight_color : styles.primary_color,
                              textShadow: "0px 2px 10px rgba(0,0,0,0.8), 0px 0px 4px rgba(0,0,0,1)",
                              transition: "color 0.15s ease"
                            }}
                            className="inline-block mx-[0.1em] font-bold"
                          >
                            {w.word}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Timeline Placeholder */}
          {videoUrl && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 overflow-x-auto custom-scrollbar">
               {segments.length === 0 ? (
                 <div className="text-slate-500 text-sm flex items-center gap-2 h-12 w-full justify-center">
                   Generate subtitles to see timeline
                 </div>
               ) : (
                 <div className="flex gap-2 min-w-max">
                    {segments.map((s, i) => (
                      <div key={i} className={`p-2 rounded bg-white/5 border ${currentTime >= s.start && currentTime <= s.end ? 'border-indigo-500 text-white' : 'border-white/10 text-slate-400'} text-xs max-w-[200px] truncate transition-colors`}>
                        {s.text}
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Wand2 className="w-5 h-5 text-indigo-400" /> Generation
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Source Language</label>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="uk">Ukrainian</option>
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="sk">Slovak</option>
                </select>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={!videoId || isGenerating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium p-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                {isGenerating ? (
                  <><span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> Processing...</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Auto Generate</>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex-1">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-purple-400" /> Styling
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 flex items-center gap-2"><Type className="w-4 h-4"/> Font</label>
                  <select 
                    value={styles.font_name}
                    onChange={(e) => setStyles({...styles, font_name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Impact">Impact</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Comic Sans MS">Comic Sans</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 flex items-center gap-2"><AlignCenter className="w-4 h-4"/> Position</label>
                  <select 
                    value={styles.position}
                    onChange={(e) => setStyles({...styles, position: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Bottom">Bottom</option>
                    <option value="Middle">Middle</option>
                    <option value="Top">Top</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Font Size ({styles.font_size}px)</label>
                <input 
                  type="range" 
                  min="16" max="96" 
                  value={styles.font_size}
                  onChange={(e) => setStyles({...styles, font_size: parseInt(e.target.value)})}
                  className="w-full accent-purple-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 flex items-center gap-2"><Palette className="w-4 h-4"/> Main Color</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={styles.primary_color}
                      onChange={(e) => setStyles({...styles, primary_color: e.target.value})}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded">{styles.primary_color}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 flex items-center gap-2"><Palette className="w-4 h-4"/> Highlight</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={styles.highlight_color}
                      onChange={(e) => setStyles({...styles, highlight_color: e.target.value})}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-xs font-mono text-yellow-400 bg-black/40 px-2 py-1 rounded">{styles.highlight_color}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
