import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayerStore } from '../store/playerStore';

function Playhead({ duration }: { duration: number }) {
  const currentTime = usePlayerStore(state => state.currentTime);
  return (
    <>
    <style>{`
      .word-input[data-active="true"] {
        background-color: rgba(255, 229, 52, 0.9);
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 15px rgba(255, 229, 52, 0.3);
        z-index: 40;
        transform: scale(1.02);
      }
      .word-input[data-active="false"] {
        background-color: rgba(255, 229, 52, 0.7);
        border-color: rgba(255, 255, 255, 0.1);
        z-index: 30;
      }
      .word-input[data-active="false"]:hover {
        background-color: rgba(255, 229, 52, 0.8);
        border-color: rgba(255, 255, 255, 0.3);
      }
      .word-input[data-active="false"] .word-pointer {
        display: none;
      }
    `}</style>
    <div 
      className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-75"
      style={{ left: `${(currentTime / duration) * 100}%` }}
    >
      <div className="absolute top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm shadow-[0_0_10px_rgba(239,68,68,1)] flex items-center justify-center">
        <div className="w-0.5 h-1.5 bg-white/50 rounded-full" />
      </div>
    </div>
    </>
  );
}

function OverlayBlock({ ov, duration }: { ov: any, duration: number }) {
  const isActive = usePlayerStore(state => state.currentTime >= ov.start && state.currentTime <= ov.end);
  const startPct = (ov.start / duration) * 100;
  const widthPct = ((ov.end - ov.start) / duration) * 100;
  
  return (
    <div
      className={`absolute top-6 h-10 rounded-md border flex items-center px-1 overflow-hidden transition-all shadow-sm ${isActive ? 'bg-[#0ea5e9]/20 border-[#0ea5e9] z-40' : 'bg-[#0ea5e9]/10 border-[#0ea5e9]/30 hover:border-[#0ea5e9]/50 z-30'}`}
      style={{ 
        left: `${startPct}%`, 
        width: `${Math.max(widthPct, (20 / (duration * 150)) * 100)}%`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <img src={ov.url} className="h-full w-full object-cover opacity-80 pointer-events-none" alt="" />
    </div>
  );
}

function WordInput({ w, i, wIndex, duration }: { w: any, i: number, wIndex: number, duration: number }) {

  const [localWord, setLocalWord] = useState(w.word);
  
  // Sync if external changes (e.g. undo/redo)
  useEffect(() => {
    setLocalWord(w.word);
  }, [w.word]);
  
  const startPct = (w.start / duration) * 100;
  const widthPct = ((w.end - w.start) / duration) * 100;
  
  const commitChange = () => {
    if (localWord === w.word) return; // No change
    
    // Always use FRESH state to avoid React stale closure
    const currentSegments = usePlayerStore.getState().segments;
    const newSegments = [...currentSegments];
    const seg = { ...newSegments[i] };
    const newWords = [...seg.words];
    
    newWords[wIndex] = { ...newWords[wIndex], word: localWord };
    const newText = newWords.map(wordObj => wordObj.word).join(" ");
    
    seg.words = newWords;
    seg.text = newText;
    newSegments[i] = seg;
    
    usePlayerStore.getState().setSegments(newSegments);
  };
  
  return (
    <div 
      id={`word-${i}-${wIndex}`}
      data-active="false"
      className="word-input absolute top-20 bottom-2 rounded-lg flex items-center justify-center transition-all border shadow-sm"
      style={{ 
        left: `${startPct}%`, 
        width: `${Math.max(widthPct, (20 / (duration * 150)) * 100)}%`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="word-pointer absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#2563eb]" />
      <div className="word-pointer absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#2563eb]" />

      <input 
        className="bg-transparent text-black font-semibold text-center w-full h-full focus:outline-none focus:bg-white/50 rounded-md px-1 text-xs sm:text-sm selection:bg-[#0ea5e9]/30 transition-colors"
        value={localWord}
        onChange={(e) => setLocalWord(e.target.value)}
        onBlur={commitChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const duration = usePlayerStore(state => state.duration);
  const segments = usePlayerStore(state => state.segments);
  const overlays = usePlayerStore(state => state.overlays);
  const videoRef = usePlayerStore(state => state.videoRef);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    let lastActiveId: string | null = null;
    return usePlayerStore.subscribe(
      (state) => state.currentTime,
      (currentTime) => {
        const currentSegments = usePlayerStore.getState().segments;
        let newActiveId: string | null = null;
        
        for (let i = 0; i < currentSegments.length; i++) {
            const seg = currentSegments[i];
            if (currentTime >= seg.start && currentTime <= seg.end) {
                for (let j = 0; j < seg.words.length; j++) {
                    const w = seg.words[j];
                    if (currentTime >= w.start && currentTime <= w.end) {
                        newActiveId = `word-${i}-${j}`;
                        break;
                    }
                }
                break;
            }
        }
        
        if (lastActiveId !== newActiveId) {
            if (lastActiveId) {
                const el = document.getElementById(lastActiveId);
                if (el) el.setAttribute('data-active', 'false');
            }
            if (newActiveId) {
                const el = document.getElementById(newActiveId);
                if (el) el.setAttribute('data-active', 'true');
            }
            lastActiveId = newActiveId;
        }
      }
    );
  }, []);

  useEffect(() => {
    if (!waveformRef.current || !videoRef?.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      media: videoRef.current,
      waveColor: 'rgba(255, 255, 255, 0.2)',
      progressColor: 'rgba(14, 165, 233, 0.5)',
      height: 158, // Match timeline height roughly
      normalize: true,
      minPxPerSec: 150,
      interact: false, // Timeline handles interaction
    });

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [videoRef]);

  return (
    
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
      <div className="relative h-full" style={{ width: `${Math.max(800, duration * 150)}px` }}>
        {/* Waveform Background */}
        <div 
          ref={waveformRef} 
          className="absolute top-0 left-0 right-0 h-full pointer-events-none opacity-60 z-0" 
          style={{ width: '100%' }}
        />

        {/* Time Ruler */}
        <div className="absolute top-0 left-0 bottom-0 pointer-events-none z-10 flex">
          {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
            <div key={i} className="relative border-l border-white/10 h-full flex flex-col justify-start pl-1 pt-1 text-[9px] font-mono text-white/40" style={{ width: '150px', flexShrink: 0 }}>
              {new Date(i * 1000).toISOString().substring(14, 19)}
            </div>
          ))}
        </div>

        {/* Playhead */}
        <Playhead duration={duration} />

        {/* Overlay Blocks (Top Track) */}
        {overlays.map((ov) => (
          <OverlayBlock key={ov.id} ov={ov} duration={duration} />
        ))}

        {/* Words Blocks (Bottom Track) */}
        {segments.map((s, i) => (
          s.words.map((w: any, wIndex: number) => (
             <WordInput key={`${i}-${wIndex}`} w={w} i={i} wIndex={wIndex} duration={duration} />
          ))
        ))}
      </div>
    </div>
    </div>
  );
}
