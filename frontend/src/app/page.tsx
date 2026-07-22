"use client";
import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Video, Settings, Wand2, Download, Palette, Type, AlignCenter, Moon, Sun, Globe, Trash2 } from "lucide-react";
import { translations, Language } from "./translations";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [language, setLanguage] = useState("auto");
  const [modelSize, setModelSize] = useState("large"); // default to large for better accuracy
  const [aiTask, setAiTask] = useState("transcribe"); // transcribe or translate

  const [appLang, setAppLang] = useState<Language>("uk");
  const t = translations[appLang];
  const [theme, setTheme] = useState<"light"|"dark">("dark");
  const [activeTab, setActiveTab] = useState<"generation" | "styling" | "editor" | "overlays">("generation");
  const [generateProgress, setGenerateProgress] = useState<number>(0);

  const [prompt, setPrompt] = useState("");
  type Overlay = {
    id: string;
    url: string;
    start: number;
    end: number;
  };
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  
  const [customFonts, setCustomFonts] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const [duration, setDuration] = useState(1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [styles, setStyles] = useState({
    font_name: "Arial",
    font_size: 7, // Percentage of video height
    primary_color: "#FFFFFF",
    highlight_color: "#0ea5e9", // sky-500
    outline_color: "#000000",
    position: "Bottom",
    pos_x: 50,
    pos_y: 80,
    effect: "karaoke", // karaoke, highlight, reveal
    words_per_line: 3,
    max_lines: 1,
    aspect_ratio: "original", // original, 9:16
    animation_style: "smooth", // smooth, instant
  });

  const applyPreset = (preset: string) => {
    if (preset === "hormozi") {
      setStyles({...styles, font_name: "Impact", font_size: 10, effect: "highlight", words_per_line: 1, max_lines: 1, primary_color: "#FFFFFF", highlight_color: "#FFEA00", outline_color: "#000000"});
    } else if (preset === "karaoke") {
      setStyles({...styles, font_name: "Arial", font_size: 7, effect: "karaoke", words_per_line: 5, max_lines: 2, primary_color: "#FFFFFF", highlight_color: "#0ea5e9", outline_color: "#000000"});
    } else if (preset === "minimalist") {
      setStyles({...styles, font_name: "Verdana", font_size: 5, effect: "reveal", words_per_line: 6, max_lines: 1, primary_color: "#FFFFFF", highlight_color: "#FFFFFF", outline_color: "#000000"});
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (video.videoWidth && video.videoHeight) {
        setVideoAspect(video.videoWidth / video.videoHeight);
      }
    };

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
    setGenerateProgress(0);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, language, prompt, model_size: modelSize, task: aiTask }),
      });
      if (!res.ok) throw new Error("Generation failed");
      if (!res.body) throw new Error("No response body");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let partial = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.progress !== undefined) {
              setGenerateProgress(data.progress);
            }
            if (data.segments) {
              setSegments(data.segments);
            }
          } catch (e) {
            console.error("Error parsing stream chunk", line, e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.error);
    }
    setIsGenerating(false);
  };
  
  const handleUploadOverlay = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload_overlay", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setOverlays([...overlays, {
        id: data.overlay_id,
        url: data.url,
        start: currentTime,
        end: Math.min(currentTime + 3, duration)
      }]);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload overlay.");
    }
  };

  const handleUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload_font", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setCustomFonts([...customFonts, data.font_name]);
      setStyles({...styles, font_name: data.font_name});
      
      // Load the font in the browser so it renders in the preview
      const newFont = new FontFace(data.font_name, `url(${data.url})`);
      const loadedFace = await newFont.load();
      document.fonts.add(loadedFace);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload font.");
    }
  };

  const parseSRT = (content: string) => {
    const lines = content.replace(/\r/g, '').split('\n');
    const newSegments: any[] = [];
    let currentSegment: any = null;
    
    const timeToSeconds = (timeStr: string) => {
      const parts = timeStr.replace(',', '.').split(':');
      if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      }
      return 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (!isNaN(parseInt(line)) && lines[i+1]?.includes('-->')) {
        const timeMatch = lines[i+1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
        if (timeMatch) {
          currentSegment = {
            id: parseInt(line),
            start: timeToSeconds(timeMatch[1]),
            end: timeToSeconds(timeMatch[2]),
            text: "",
            words: []
          };
          i++; 
        }
      } else if (currentSegment) {
        currentSegment.text += (currentSegment.text ? " " : "") + line;
        const wordsArr = currentSegment.text.split(' ').map((w: string, idx: number, arr: any[]) => ({
          word: w,
          start: currentSegment.start + ((currentSegment.end - currentSegment.start) / arr.length) * idx,
          end: currentSegment.start + ((currentSegment.end - currentSegment.start) / arr.length) * (idx + 1)
        }));
        currentSegment.words = wordsArr;
        
        if (lines[i+1]?.trim() === "" || i === lines.length - 1) {
          newSegments.push(currentSegment);
          currentSegment = null;
        }
      }
    }
    return newSegments;
  };

  const handleUploadSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const srtFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parsedSegments = parseSRT(content);
      if (parsedSegments.length > 0) {
        setSegments(parsedSegments);
      }
    };
    reader.readAsText(srtFile);
  };

  const downloadSRT = () => {
    let srtContent = "";
    const formatTime = (seconds: number) => {
      const date = new Date(seconds * 1000);
      const hh = String(date.getUTCHours()).padStart(2, '0');
      const mm = String(date.getUTCMinutes()).padStart(2, '0');
      const ss = String(date.getUTCSeconds()).padStart(2, '0');
      const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
      return `${hh}:${mm}:${ss},${ms}`;
    };
    segments.forEach((seg, i) => {
      srtContent += `${i + 1}\n`;
      srtContent += `${formatTime(seg.start)} --> ${formatTime(seg.end)}\n`;
      srtContent += `${seg.text}\n\n`;
    });
    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const shiftTime = (amount: number) => {
    setSegments(segs => segs.map(s => ({
      ...s,
      start: Math.max(0, s.start + amount),
      end: Math.max(0, s.end + amount),
      words: s.words?.map((w: any) => ({
        ...w,
        start: Math.max(0, w.start + amount),
        end: Math.max(0, w.end + amount)
      })) || []
    })));
  };

  const addSegment = (index: number) => {
    const newSegs = [...segments];
    const prevEnd = index > 0 ? newSegs[index - 1].end : 0;
    const start = prevEnd;
    const end = prevEnd + 2;
    
    newSegs.splice(index, 0, {
      id: Date.now(),
      start: start,
      end: end,
      text: "",
      words: []
    });
    setSegments(newSegs);
  };

  const deleteSegment = (index: number) => {
    const newSegs = [...segments];
    newSegs.splice(index, 1);
    setSegments(newSegs);
  };

  const handleExport = async () => {
    if (!videoId) return;
    
    try {
      setIsGenerating(true);
      setErrorMsg(null);
      let savePath = null;
      
      // Try to ask for save path using pywebview API
      if (typeof window !== "undefined" && (window as any).pywebview && (window as any).pywebview.api) {
        savePath = await (window as any).pywebview.api.save_file_dialog("AutoCaps_Video.mp4");
        if (!savePath) {
          setIsGenerating(false);
          return; // User cancelled the dialog
        }
      }
      
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          segments,
          styles,
          save_path: savePath,
          overlays
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Export failed on the server.");
      }
      
      if (!savePath) {
        // Fallback for web browser: trigger download
        const a = document.createElement("a");
        a.href = data.url;
        a.download = `AutoCaps_${videoId}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Video successfully saved to: " + savePath);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to export video.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Find active segment and words based on current time
  const activeSegment = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center transition-opacity duration-500">
        <img src="/logo.png" alt="AutoCaps" className="h-24 md:h-32 object-contain animate-pulse mb-6" onError={(e) => { e.currentTarget.style.display='none' }} />
        <h1 className="text-white text-4xl font-bold tracking-tight">Auto<span className="text-[#6366f1]">Caps</span></h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-primary font-sans selection:bg-[#6366f1]/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#6366f1]/15 via-bg-main to-bg-main -z-10" />
      
      <header className="border-b border-white/10 bg-glass-bg backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AutoCaps" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display='none' }} />
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-tight hidden sm:block">Auto<span className="text-[#6366f1]">Caps</span></h1>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setAppLang(appLang === "uk" ? "en" : "uk")}
              className="flex items-center gap-2 text-sm font-medium hover:text-[#6366f1] transition-colors"
            >
              <Globe className="w-4 h-4" /> {appLang.toUpperCase()}
            </button>
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 text-sm font-medium hover:text-[#6366f1] transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {videoUrl && (
              <label className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full font-medium transition-all cursor-pointer shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                <UploadCloud className="w-4 h-4" /> {t.upload_video}
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUploadOverlay} />
              </label>
            )}
            {videoId && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#0046cc] text-white px-4 py-2 rounded-full font-medium transition-all active:scale-95 shadow-[0_0_15px_rgba(0,87,255,0.4)]"
              >
                <Download className="w-4 h-4" /> {t.export_video}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-64px)]">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="lg:col-span-12 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="opacity-50 hover:opacity-100">×</button>
          </div>
        )}

        {/* Left Column: Player */}
        <div className="lg:col-span-8 flex flex-col gap-4 w-full h-full min-h-0 overflow-hidden">
          <div className="flex-1 flex justify-center items-center w-full bg-black/20 rounded-3xl p-2 sm:p-4 min-h-0">
            <div 
              className={`relative bg-black rounded-2xl border border-white/5 overflow-hidden shadow-2xl group backdrop-blur-md transition-all duration-300 ${!videoUrl ? 'aspect-video w-full max-h-full' : ''}`}
              style={videoAspect ? { aspectRatio: videoAspect, maxHeight: '100%', maxWidth: '100%' } : {}}
            >
              {!videoUrl ? (
                <label className="flex flex-col items-center justify-center h-full gap-4 cursor-pointer p-12 text-slate-400 hover:text-white transition-colors">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#6366f1]/20 group-hover:text-[#6366f1] transition-all">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="text-center text-text-secondary">
                    <p className="font-medium text-lg text-text-primary">{t.click_upload}</p>
                    <p className="text-sm opacity-60">{t.formats}</p>
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
                    controlsList="nodownload nofullscreen noremoteplayback"
                    disablePictureInPicture
                  />
                  
                  {/* Delete video button */}
                  <button
                    onClick={() => {
                      setVideoUrl(null);
                      setVideoId(null);
                      setSegments([]);
                      setThumbnails([]);
                      setOverlays([]);
                      setGenerateProgress(0);
                    }}
                    className="absolute top-4 right-4 bg-black/60 hover:bg-red-500/80 text-white p-2 rounded-full backdrop-blur-md border border-white/5 transition-all opacity-0 group-hover:opacity-100 z-50"
                    title={t.remove || "Delete video"}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  {/* Custom Subtitle Overlay */}
                  {activeSegment && videoAspect && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        containerType: "size", // Makes cqh relative to this container (which exactly matches the video)
                      }}
                      onPointerMove={(e) => {
                         if (!isDraggingText) return;
                         const rect = e.currentTarget.getBoundingClientRect();
                         let x = ((e.clientX - rect.left) / rect.width) * 100;
                         const y = ((e.clientY - rect.top) / rect.height) * 100;
                         // Magnetic snap to center
                         if (Math.abs(x - 50) < 3) x = 50;
                         setStyles(s => ({ ...s, pos_x: Math.max(0, Math.min(100, x)), pos_y: Math.max(0, Math.min(100, y)) }));
                      }}
                      onPointerUp={() => setIsDraggingText(false)}
                      onPointerLeave={() => setIsDraggingText(false)}
                    >
                    {isDraggingText && styles.pos_x === 50 && (
                      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#6366f1] opacity-70 shadow-[0_0_10px_rgba(99,102,241,0.8)] pointer-events-none" />
                    )}
                    <div 
                      className={`absolute text-center px-4 pointer-events-auto cursor-move ${isDraggingText ? 'ring-2 ring-dashed ring-[#6366f1] bg-black/20 rounded' : 'hover:ring-2 hover:ring-dashed hover:ring-white/50 rounded'}`} 
                      style={{ 
                        left: `${styles.pos_x}%`,
                        top: `${styles.pos_y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 'max-content',
                        maxWidth: '90%',
                        fontFamily: styles.font_name, 
                        fontSize: `${styles.font_size}cqh`, 
                        lineHeight: 1.2,
                        WebkitTextStroke: `0.06em ${styles.outline_color}`,
                        textShadow: `0px 0.05em 0.3em rgba(0,0,0,0.8), 0px 0px 0.1em ${styles.outline_color}`
                      }}
                      onPointerDown={(e) => {
                         setIsDraggingText(true);
                         e.stopPropagation();
                      }}
                    >
                      {(() => {
                        // Implement backend screen splitting logic
                        const screens: any[][][] = [];
                        let current_screen: any[][] = [];
                        let current_line: any[] = [];
                        
                        const MAX_CHARS_PER_LINE = 22;
                        let line_char_count = 0;
                        
                        for (const word of activeSegment.words) {
                          const wordLen = word.word.length;
                          
                          if (current_line.length > 0 && line_char_count + wordLen > MAX_CHARS_PER_LINE) {
                            current_screen.push(current_line);
                            current_line = [];
                            line_char_count = 0;
                            if (current_screen.length >= styles.max_lines) {
                              screens.push(current_screen);
                              current_screen = [];
                            }
                          }
                          
                          current_line.push(word);
                          line_char_count += wordLen + 1;
                          
                          if (current_line.length >= styles.words_per_line) {
                            current_screen.push(current_line);
                            current_line = [];
                            line_char_count = 0;
                            if (current_screen.length >= styles.max_lines) {
                              screens.push(current_screen);
                              current_screen = [];
                            }
                          }
                        }
                        if (current_line.length > 0) current_screen.push(current_line);
                        if (current_screen.length > 0) screens.push(current_screen);
                        
                        // Find the active screen
                        let activeScreen = screens.find(screen => {
                          const start = screen[0][0].start;
                          const end = screen[screen.length - 1][screen[screen.length - 1].length - 1].end;
                          return currentTime >= start && currentTime <= end;
                        });
                        
                        // If no screen is strictly active (e.g. between words), pick the closest one or just the last one we were in
                        if (!activeScreen && screens.length > 0) {
                           activeScreen = screens.find(screen => currentTime <= screen[screen.length - 1][screen[screen.length - 1].length - 1].end) || screens[screens.length - 1];
                        }

                        if (!activeScreen) return null;

                        return activeScreen.map((line, lineIndex) => (
                          <div key={lineIndex}>
                            {line.map((w: any, wIndex: number) => {
                              let next_start = w.end;
                              if (wIndex + 1 < line.length) {
                                next_start = line[wIndex + 1].start;
                              } else if (lineIndex + 1 < activeScreen.length && activeScreen[lineIndex + 1].length > 0) {
                                next_start = activeScreen[lineIndex + 1][0].start;
                              }
                              // Also fallback to the segment end if it's the last word?
                              // But w.end is fine for the very last word.

                              const isActive = currentTime >= w.start && currentTime < next_start;
                              const isPast = currentTime >= next_start;
                              
                              let color = styles.primary_color;
                              let opacity = 1;
                              
                              if (styles.effect === "karaoke") {
                                color = isActive ? styles.highlight_color : styles.primary_color;
                              } else if (styles.effect === "highlight") {
                                color = isActive ? styles.highlight_color : styles.primary_color;
                              } else if (styles.effect === "reveal") {
                                color = isActive ? styles.highlight_color : styles.primary_color;
                                opacity = (isActive || isPast) ? 1 : 0;
                              }

                              return (
                                <span 
                                  key={wIndex}
                                  style={{ 
                                    color: color,
                                    opacity: opacity,
                                    transform: isActive ? "scale(1.15)" : "scale(1)",
                                    transformOrigin: "center bottom",
                                    transition: "color 0.15s ease, opacity 0.1s ease, transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)"
                                  }}
                                  className="inline-block mx-[0.1em] font-bold break-words"
                                >
                                  {w.word}
                                </span>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

           {/* Editable Timeline Placeholder */}
          {videoUrl && (
            <div className="bg-bg-card border border-white/10 rounded-xl p-3 flex flex-col gap-2 overflow-hidden shadow-2xl relative shrink-0 w-full">
               {segments.length === 0 ? (
                 <div className="text-text-secondary text-sm flex items-center gap-2 h-16 w-full justify-center border border-dashed border-white/10 rounded-lg">
                   {t.timeline_placeholder}
                 </div>
               ) : (
                 <div 
                   ref={timelineRef}
                   className="relative h-40 overflow-x-auto overflow-y-hidden rounded-lg bg-black cursor-pointer custom-scrollbar border border-white/5"
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

                     {/* Overlay Blocks (Top Track) */}
                     {overlays.map((ov) => {
                       const startPct = (ov.start / duration) * 100;
                       const widthPct = ((ov.end - ov.start) / duration) * 100;
                       const isActive = currentTime >= ov.start && currentTime <= ov.end;
                       return (
                         <div
                           key={ov.id}
                           className={`absolute top-2 h-10 rounded border flex items-center px-1 overflow-hidden transition-all ${isActive ? 'bg-purple-600 border-purple-400 z-40' : 'bg-purple-900/80 border-purple-500/50 z-30'}`}
                           style={{ 
                             left: `${startPct}%`, 
                             width: `${Math.max(widthPct, (20 / (duration * 150)) * 100)}%`,
                           }}
                           onClick={(e) => e.stopPropagation()}
                         >
                           <img src={ov.url} className="h-full w-full object-cover opacity-80 pointer-events-none" />
                         </div>
                       );
                     })}

                     {/* Words Blocks (Bottom Track) */}
                     {segments.map((s, i) => (
                        s.words.map((w: any, wIndex: number) => {
                           const startPct = (w.start / duration) * 100;
                           const widthPct = ((w.end - w.start) / duration) * 100;
                           const isActive = currentTime >= w.start && currentTime <= w.end;
                           
                           return (
                              <div 
                                key={`${i}-${wIndex}`}
                                className={`absolute top-14 bottom-4 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-[#ffe534] shadow-[0_0_15px_rgba(255,229,52,0.4)] z-40 scale-110' : 'bg-[#ffe534]/90 hover:bg-[#ffe534] z-30'}`}
                                style={{ 
                                  left: `${startPct}%`, 
                                  width: `${Math.max(widthPct, (20 / (duration * 150)) * 100)}%`, // min width 20px
                                }}
                                onClick={(e) => e.stopPropagation()} // prevent seeking on edit
                              >
                                {isActive && (
                                  <>
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#a855f7]" />
                                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#a855f7]" />
                                  </>
                                )}
                                <input 
                                  className="bg-transparent text-black font-semibold text-center w-full focus:outline-none focus:bg-white/40 rounded px-0.5 text-xs sm:text-sm selection:bg-[#6366f1]/20"
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
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-0">
          {/* Tabs Navigation */}
          <div className="flex bg-black/20 border border-white/5 rounded-2xl p-1.5 gap-1 shadow-2xl backdrop-blur-3xl overflow-x-auto custom-scrollbar relative z-10">
            <button 
              onClick={() => setActiveTab('generation')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${activeTab === 'generation' ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-[0_4px_12px_rgba(0,87,255,0.3)] border border-white/5 scale-100' : 'text-text-secondary hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}`}
            >
              <Wand2 className="w-4 h-4" /> <span className="hidden sm:inline">{t.tab_generation}</span>
            </button>
            <button 
              onClick={() => setActiveTab('styling')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${activeTab === 'styling' ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-[0_4px_12px_rgba(0,87,255,0.3)] border border-white/5 scale-100' : 'text-text-secondary hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}`}
            >
              <Settings className="w-4 h-4" /> <span className="hidden sm:inline">{t.tab_styling}</span>
            </button>
            <button 
              onClick={() => setActiveTab('editor')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${activeTab === 'editor' ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-[0_4px_12px_rgba(0,87,255,0.3)] border border-white/5 scale-100' : 'text-text-secondary hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}`}
            >
              <Type className="w-4 h-4" /> <span className="hidden sm:inline">{t.tab_editor}</span>
            </button>
            <button 
              onClick={() => setActiveTab('overlays')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${activeTab === 'overlays' ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-[0_4px_12px_rgba(0,87,255,0.3)] border border-white/5 scale-100' : 'text-text-secondary hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}`}
            >
              <UploadCloud className="w-4 h-4" /> <span className="hidden sm:inline">{t.tab_overlays}</span>
            </button>
          </div>

          <div className="bg-bg-card border border-white/10 rounded-2xl p-5 backdrop-blur-2xl shadow-xl flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            {activeTab === 'generation' && (
              <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary mb-2 block">{t.source_language}</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-3 text-text-primary focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer appearance-none"
                  >
                    <option value="auto">{t.auto_detect}</option>
                    <option value="uk">{t.ukrainian}</option>
                    <option value="en">{t.english}</option>
                    <option value="ru">{t.russian}</option>
                    <option value="sk">{t.slovak}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-2 block">{t.ai_level}</label>
                  <select 
                    value={modelSize} 
                    onChange={(e) => setModelSize(e.target.value)}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-3 text-text-primary focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer appearance-none"
                  >
                    <option value="small">{t.level_low}</option>
                    <option value="medium">{t.level_medium}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                <input 
                  type="checkbox" 
                  id="translate_opt"
                  checked={aiTask === "translate"}
                  onChange={(e) => setAiTask(e.target.checked ? "translate" : "transcribe")}
                  className="w-4 h-4 rounded bg-player-bg border-white/10 text-[#6366f1] focus:ring-[#6366f1] focus:ring-offset-gray-900 cursor-pointer"
                />
                <label htmlFor="translate_opt" className="text-sm text-text-primary cursor-pointer flex-1">
                  Translate to English (Auto-Translation)
                </label>
              </div>

              <div>
                <label className="text-sm text-text-secondary mb-2 flex items-center gap-2">
                  {t.vocab_context}
                </label>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full bg-player-bg border border-white/10 rounded-lg p-3 text-text-primary focus:outline-none focus:border-[#6366f1] transition-colors h-20 resize-none text-sm custom-scrollbar"
                />
              </div>

              <div className="flex flex-col gap-4 mt-2">
                {isGenerating ? (
                  <div className="bg-black/40 border border-[#6366f1]/30 rounded-xl p-5 flex flex-col gap-3 shadow-[0_0_30px_rgba(0,87,255,0.15)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#6366f1]/10 to-transparent animate-pulse" />
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-[#6366f1] animate-spin-slow" /> 
                        {t.processing}
                      </span>
                      <span className="text-sm font-mono text-[#a855f7]">{generateProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden relative z-10">
                      <div 
                        className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,161,255,0.8)]"
                        style={{ width: `${generateProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleGenerate}
                    disabled={!videoId}
                    className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#0046cc] hover:to-[#0081cc] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(0,87,255,0.4)] hover:shadow-[0_4px_25px_rgba(0,87,255,0.6)] hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Wand2 className="w-5 h-5" /> {t.auto_generate}
                  </button>
                )}
              </div>
            </div>
            )}
            
            {activeTab === 'styling' && (
              <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Presets */}
              <div className="bg-black/20 border border-white/5 p-4 rounded-xl">
                <label className="text-sm font-semibold text-text-primary mb-3 block flex items-center gap-2"><Wand2 className="w-4 h-4 text-[#6366f1]" /> AI Style Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => applyPreset('hormozi')} className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 rounded-lg p-2 text-xs font-bold text-yellow-500 transition-all">Hormozi (1 Word)</button>
                  <button onClick={() => applyPreset('karaoke')} className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30 rounded-lg p-2 text-xs font-bold text-cyan-400 transition-all">Karaoke Pop</button>
                  <button onClick={() => applyPreset('minimalist')} className="bg-gradient-to-br from-gray-500/20 to-gray-400/20 hover:from-gray-500/30 hover:to-gray-400/30 border border-gray-500/30 rounded-lg p-2 text-xs font-bold text-gray-300 transition-all">Minimalist</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary mb-2 flex items-center gap-2"><Type className="w-4 h-4"/> {t.font}</label>
                  <div className="flex gap-2">
                    <select 
                      value={styles.font_name}
                      onChange={(e) => setStyles({...styles, font_name: e.target.value})}
                      className="w-full bg-player-bg border border-white/10 rounded-lg p-2.5 text-text-primary focus:outline-none focus:border-[#6366f1] cursor-pointer appearance-none transition-colors"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Impact">Impact</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Comic Sans MS">Comic Sans</option>
                      {customFonts.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <label className="bg-[#6366f1] hover:bg-[#0046cc] text-white px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center shrink-0" title="Upload Custom Font">
                      <span className="font-bold">+</span>
                      <input type="file" className="hidden" accept=".ttf,.otf" onChange={handleUploadFont} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-2 flex items-center gap-2"><AlignCenter className="w-4 h-4"/> {t.position}</label>
                  <select 
                    value={styles.pos_y === 90 ? "Bottom" : styles.pos_y === 50 ? "Middle" : styles.pos_y === 10 ? "Top" : "Custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Bottom") setStyles({...styles, position: val, pos_y: 90});
                      else if (val === "Middle") setStyles({...styles, position: val, pos_y: 50});
                      else if (val === "Top") setStyles({...styles, position: val, pos_y: 10});
                    }}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-2.5 text-text-primary focus:outline-none focus:border-[#6366f1] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="Bottom">{t.bottom}</option>
                    <option value="Middle">{t.middle}</option>
                    <option value="Top">{t.top}</option>
                    <option value="Custom" disabled>Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-text-secondary mb-2 block">{t.anim_effect}</label>
                  <select 
                    value={styles.effect}
                    onChange={(e) => setStyles({...styles, effect: e.target.value})}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-2.5 text-text-primary focus:outline-none focus:border-[#6366f1] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="karaoke">{t.effect_karaoke}</option>
                    <option value="highlight">{t.effect_highlight}</option>
                    <option value="reveal">{t.effect_reveal}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-2 block">Animation Style</label>
                  <select 
                    value={styles.animation_style}
                    onChange={(e) => setStyles({...styles, animation_style: e.target.value})}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-2.5 text-text-primary focus:outline-none focus:border-[#6366f1] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="smooth">Smooth (Pop-up)</option>
                    <option value="instant">Instant (Classic)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-2 block">Aspect Ratio</label>
                  <select 
                    value={styles.aspect_ratio}
                    onChange={(e) => setStyles({...styles, aspect_ratio: e.target.value})}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-2.5 text-text-primary focus:outline-none focus:border-[#6366f1] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="original">Original</option>
                    <option value="9:16">9:16 (TikTok)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary mb-2 block">{t.font_size} ({styles.font_size}%)</label>
                <input 
                  type="range" 
                  min="1" max="40" step="0.5"
                  value={styles.font_size}
                  onChange={(e) => setStyles({...styles, font_size: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500 h-2 bg-border-color rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary mb-2 flex items-center gap-2">{t.words_line}</label>
                  <input 
                    type="number" min="1" max="15"
                    value={styles.words_per_line}
                    onChange={(e) => setStyles({...styles, words_per_line: parseInt(e.target.value)})}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-2.5 text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-2 flex items-center gap-2">{t.max_lines}</label>
                  <input 
                    type="number" min="1" max="5"
                    value={styles.max_lines}
                    onChange={(e) => setStyles({...styles, max_lines: parseInt(e.target.value)})}
                    className="w-full bg-player-bg border border-white/10 rounded-lg p-2.5 text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary mb-2 flex items-center gap-2"><Palette className="w-4 h-4"/> {t.main_color}</label>
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
                  <label className="text-sm text-text-secondary mb-2 flex items-center gap-2"><Palette className="w-4 h-4"/> {t.highlight}</label>
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
                <div>
                  <label className="text-sm text-text-secondary mb-2 flex items-center gap-2"><Palette className="w-4 h-4"/> {t.outline}</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={styles.outline_color}
                      onChange={(e) => setStyles({...styles, outline_color: e.target.value})}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-xs font-mono text-cyan-400 bg-black/40 px-2 py-1 rounded">{styles.outline_color}</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'editor' && (
              <div className="flex flex-col flex-1 h-full max-h-[600px] animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4 gap-2 flex-wrap bg-black/20 p-2 rounded-xl border border-white/5">
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => addSegment(segments.length)}
                      className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    >
                      <span className="text-green-400 font-bold leading-none">+</span> <span className="hidden sm:inline">{t.add_segment}</span>
                    </button>
                    <div className="w-px bg-white/10 mx-1" />
                    <button 
                      onClick={() => shiftTime(-1)}
                      className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    >
                      {t.shift_backward}
                    </button>
                    <button 
                      onClick={() => shiftTime(1)}
                      className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    >
                      {t.shift_forward}
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <label className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer">
                      <UploadCloud className="w-4 h-4" /> <span className="hidden sm:inline">{t.upload_srt}</span>
                      <input type="file" className="hidden" accept=".srt" onChange={handleUploadSrt} />
                    </label>
                    <button 
                      onClick={downloadSRT}
                      disabled={segments.length === 0}
                      className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    >
                      <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t.download_srt}</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {segments.length === 0 ? (
                    <div className="text-center text-text-secondary text-sm py-8 border border-dashed border-white/10 rounded-lg">
                      {t.generate_first}
                    </div>
                  ) : (
                    segments.map((seg, idx) => (
                      <div key={seg.id || idx} className="bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/5 rounded-xl p-4 group relative transition-all duration-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                            <input 
                              type="number" step="0.1" min="0" 
                              value={seg.start.toFixed(1)} 
                              onChange={(e) => {
                                const newSegs = [...segments];
                                newSegs[idx].start = parseFloat(e.target.value) || 0;
                                setSegments(newSegs);
                              }}
                              className="w-12 bg-transparent text-xs text-text-secondary focus:text-[#a855f7] outline-none text-right font-mono" 
                            />
                            <span className="text-xs text-white/20">⟶</span>
                            <input 
                              type="number" step="0.1" min="0" 
                              value={seg.end.toFixed(1)} 
                              onChange={(e) => {
                                const newSegs = [...segments];
                                newSegs[idx].end = parseFloat(e.target.value) || 0;
                                setSegments(newSegs);
                              }}
                              className="w-12 bg-transparent text-xs text-text-secondary focus:text-[#a855f7] outline-none text-left font-mono" 
                            />
                          </span>
                          <button 
                            onClick={() => deleteSegment(idx)}
                            className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 p-1.5 rounded-md"
                            title={t.delete_segment}
                          >
                            <span className="sr-only">Delete</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                    <textarea 
                      value={seg.text}
                      onChange={(e) => {
                        const newSegs = [...segments];
                        newSegs[idx].text = e.target.value;
                        setSegments(newSegs);
                      }}
                      className="w-full bg-transparent text-text-primary text-sm focus:outline-none resize-none leading-relaxed"
                      rows={2}
                      placeholder="Enter subtitle text..."
                    />
                  </div>
                ))
              )}
            </div>
            </div>
            )}

            {activeTab === 'overlays' && (
              <div className="flex flex-col flex-1 h-full animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
                    <UploadCloud className="w-5 h-5 text-purple-400" /> {t.b_roll_elements}
                  </h2>
                </div>
                {overlays.length === 0 ? (
                  <div className="text-center text-text-secondary text-sm py-8 border border-dashed border-white/10 rounded-lg">
                    Upload B-Roll video or images using the button on the left to see them here.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-2 max-h-[500px]">
                    {overlays.map((ov, i) => (
                      <div key={ov.id} className="bg-player-bg border border-white/10 p-3 rounded-lg flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <img src={ov.url} className="w-16 h-16 rounded object-cover border border-white/10" />
                          <div className="flex-1 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs text-text-secondary">{t.start}</label>
                              <input 
                                type="number" step="0.1" min="0" max={duration}
                                value={ov.start.toFixed(1)}
                                onChange={(e) => {
                                  const newOvs = [...overlays];
                                  newOvs[i].start = parseFloat(e.target.value) || 0;
                                  setOverlays(newOvs);
                                }}
                                className="bg-bg-card border border-white/10 rounded px-2 py-1 text-xs w-16 text-center text-text-primary focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs text-text-secondary">{t.end}</label>
                              <input 
                                type="number" step="0.1" min="0" max={duration}
                                value={ov.end.toFixed(1)}
                                onChange={(e) => {
                                  const newOvs = [...overlays];
                                  newOvs[i].end = parseFloat(e.target.value) || duration;
                                  setOverlays(newOvs);
                                }}
                                className="bg-bg-card border border-white/10 rounded px-2 py-1 text-xs w-16 text-center text-text-primary focus:outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setOverlays(overlays.filter(o => o.id !== ov.id))}
                          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs py-1.5 rounded transition-colors font-medium"
                        >
                          {t.remove}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
