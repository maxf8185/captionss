"use client";
import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Video, Settings, Wand2, Download, Palette, Type, AlignCenter } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [language, setLanguage] = useState("auto");
  const [prompt, setPrompt] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [duration, setDuration] = useState(1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [styles, setStyles] = useState({
    font_name: "Arial",
    font_size: 42,
    primary_color: "#FFFFFF",
    highlight_color: "#0ea5e9", // sky-500
    position: "Bottom",
    words_per_line: 5,
    max_lines: 2,
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoUrl]);

  // Generate thumbnails
  useEffect(() => {
    if (!videoUrl) {
      setThumbnails([]);
      return;
    }
    const generate = async () => {
      const vid = document.createElement("video");
      vid.src = videoUrl;
      vid.muted = true;
      vid.crossOrigin = "anonymous";
      
      await new Promise((res) => { vid.onloadedmetadata = res; });
      const vidDuration = vid.duration || 1;
      const numFrames = 10;
      const interval = vidDuration / numFrames;
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 160;
      canvas.height = (vid.videoHeight / vid.videoWidth) * 160;
      
      const thumbs: string[] = [];
      for (let i = 0; i < numFrames; i++) {
        vid.currentTime = i * interval;
        await new Promise((res) => { vid.onseeked = res; });
        ctx?.drawImage(vid, 0, 0, canvas.width, canvas.height);
        thumbs.push(canvas.toDataURL("image/jpeg", 0.5));
      }
      setThumbnails(thumbs);
    };
    generate().catch(console.error);
  }, [videoUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setVideoId(data.video_id);
      setVideoUrl(data.url);
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
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, language, prompt }),
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
      const res = await fetch("/api/export", {
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
        window.open(data.url, "_blank");
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
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 -z-10" />
      
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AutoCaps" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display='none' }} />
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-tight hidden sm:block">Auto<span className="text-blue-500">Caps</span></h1>
            </div>
          </div>
          <div className="flex gap-4">
            {videoId && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-medium transition-all active:scale-95 shadow-lg shadow-blue-500/20"
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
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
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
                      {/* Note: This is a simplified preview. It doesn't strictly break into lines based on max_lines visually, 
                          but the backend rendering does. */}
                      {activeSegment.words.map((w: any, i: number) => {
                        const isActive = currentTime >= w.start && currentTime <= w.end;
                        return (
                          <React.Fragment key={i}>
                            <span 
                              style={{ 
                                color: isActive ? styles.highlight_color : styles.primary_color,
                                textShadow: "0px 2px 10px rgba(0,0,0,0.8), 0px 0px 4px rgba(0,0,0,1)",
                                transition: "color 0.15s ease"
                              }}
                              className="inline-block mx-[0.1em] font-bold"
                            >
                              {w.word}
                            </span>
                            {/* Simple line break preview based on words_per_line */}
                            {(i + 1) % styles.words_per_line === 0 && <br />}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Editable Timeline Placeholder */}
          {videoUrl && (
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2 overflow-hidden shadow-2xl relative mt-2">
               {segments.length === 0 ? (
                 <div className="text-slate-500 text-sm flex items-center gap-2 h-24 w-full justify-center border border-dashed border-white/10 rounded-lg">
                   Generate subtitles to see the timeline
                 </div>
               ) : (
                 <div 
                   ref={timelineRef}
                   className="relative h-28 overflow-x-auto overflow-y-hidden rounded-lg bg-black cursor-pointer custom-scrollbar border border-white/10"
                   onClick={(e) => {
                     if (!timelineRef.current || !videoRef.current) return;
                     const rect = timelineRef.current.getBoundingClientRect();
                     const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
                     const newTime = (clickX / (duration * 150)) * duration;
                     videoRef.current.currentTime = newTime;
                   }}
                 >
                   <div className="relative h-full" style={{ width: `${Math.max(800, duration * 150)}px` }}>
                     {/* Thumbnails Background */}
                     <div className="absolute inset-0 flex opacity-40 pointer-events-none">
                       {thumbnails.map((t, i) => (
                          <img key={i} src={t} className="h-full object-cover flex-1 border-r border-white/5" />
                       ))}
                     </div>
                     
                     {/* Playhead */}
                     <div 
                       className="absolute top-0 bottom-0 w-0.5 bg-white z-50 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-75"
                       style={{ left: `${(currentTime / duration) * 100}%` }}
                     >
                       <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]"></div>
                     </div>

                     {/* Words Blocks */}
                     {segments.map((s, i) => (
                        s.words.map((w: any, wIndex: number) => {
                           const startPct = (w.start / duration) * 100;
                           const widthPct = ((w.end - w.start) / duration) * 100;
                           const isActive = currentTime >= w.start && currentTime <= w.end;
                           
                           return (
                             <div 
                               key={`${i}-${wIndex}`}
                               className={`absolute top-4 bottom-4 rounded-md border flex items-center justify-center transition-all ${isActive ? 'bg-yellow-400 border-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.6)] z-40 scale-105' : 'bg-yellow-400/90 border-yellow-500/50 hover:bg-yellow-400 z-30'}`}
                               style={{ 
                                 left: `${startPct}%`, 
                                 width: `${Math.max(widthPct, (20 / (duration * 150)) * 100)}%`, // min width 20px
                               }}
                               onClick={(e) => e.stopPropagation()} // prevent seeking on edit
                             >
                               <input 
                                 className="bg-transparent text-black font-bold text-center w-full focus:outline-none focus:bg-white/40 rounded px-0.5 text-xs sm:text-sm selection:bg-black/20"
                                 value={w.word}
                                 onChange={(e) => {
                                     const newSegments = [...segments];
                                     newSegments[i].words[wIndex].word = e.target.value;
                                     setSegments(newSegments);
                                 }}
                               />
                             </div>
                           )
                        })
                     ))}
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Wand2 className="w-5 h-5 text-blue-400" /> Generation
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Source Language</label>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="uk">Ukrainian</option>
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="sk">Slovak</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                  Vocabulary / Context (Optional)
                </label>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. John Doe, AutoCaps, specialized terms..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-20 resize-none text-sm custom-scrollbar"
                />
              </div>

              <button 
                onClick={handleGenerate}
                disabled={!videoId || isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium p-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
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
              <Settings className="w-5 h-5 text-cyan-400" /> Styling
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 flex items-center gap-2"><Type className="w-4 h-4"/> Font</label>
                  <select 
                    value={styles.font_name}
                    onChange={(e) => setStyles({...styles, font_name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none"
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
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none"
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
                  className="w-full accent-cyan-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">Words / Line</label>
                  <input 
                    type="number" min="1" max="15"
                    value={styles.words_per_line}
                    onChange={(e) => setStyles({...styles, words_per_line: parseInt(e.target.value)})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">Max Lines</label>
                  <input 
                    type="number" min="1" max="5"
                    value={styles.max_lines}
                    onChange={(e) => setStyles({...styles, max_lines: parseInt(e.target.value)})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
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
                    <span className="text-xs font-mono text-cyan-400 bg-black/40 px-2 py-1 rounded">{styles.highlight_color}</span>
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
