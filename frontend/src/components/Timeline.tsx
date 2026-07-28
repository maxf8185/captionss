import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayerStore } from '../store/playerStore';

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const segments = usePlayerStore(state => state.segments);
  const overlays = usePlayerStore(state => state.overlays);
  const videoRef = usePlayerStore(state => state.videoRef);
  const setSegments = usePlayerStore(state => state.setSegments);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

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
    <div 
      ref={timelineRef}
      className="relative h-40 overflow-x-auto overflow-y-hidden rounded-lg bg-black cursor-pointer custom-scrollbar border border-white/5"
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
        <div 
          className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-75"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="absolute top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm shadow-[0_0_10px_rgba(239,68,68,1)] flex items-center justify-center">
            <div className="w-0.5 h-1.5 bg-white/50 rounded-full" />
          </div>
        </div>

        {/* Overlay Blocks (Top Track) */}
        {overlays.map((ov) => {
          const startPct = (ov.start / duration) * 100;
          const widthPct = ((ov.end - ov.start) / duration) * 100;
          const isActive = currentTime >= ov.start && currentTime <= ov.end;
          return (
            <div
              key={ov.id}
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
                  className={`absolute top-20 bottom-2 rounded-lg flex items-center justify-center transition-all border shadow-sm ${isActive ? 'bg-[#ffe534]/90 border-white/50 shadow-[0_0_15px_rgba(255,229,52,0.3)] z-40 scale-[1.02]' : 'bg-[#ffe534]/70 border-white/10 hover:bg-[#ffe534]/80 hover:border-white/30 z-30'}`}
                  style={{ 
                    left: `${startPct}%`, 
                    width: `${Math.max(widthPct, (20 / (duration * 150)) * 100)}%`, // min width 20px
                  }}
                  onClick={(e) => e.stopPropagation()} // prevent seeking on edit
                >
                  {isActive && (
                    <>
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#2563eb]" />
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#2563eb]" />
                    </>
                  )}
                  <input 
                    className="bg-transparent text-black font-semibold text-center w-full h-full focus:outline-none focus:bg-white/50 rounded-md px-1 text-xs sm:text-sm selection:bg-[#0ea5e9]/30 transition-colors"
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
  );
}
