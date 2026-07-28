import React from 'react';
import { usePlayerStore } from '../store/playerStore';

export default function SubtitleOverlay({ styles, isDraggingText, setIsDraggingText, setStyles }: any) {
  const currentTime = usePlayerStore(state => state.currentTime);
  const segments = usePlayerStore(state => state.segments);
  const videoAspect = usePlayerStore(state => state.videoAspect);

  const activeSegment = segments.find((s) => currentTime >= s.start && currentTime <= s.end) || null;

  if (!activeSegment || !videoAspect) return null;

  return (
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
          setStyles((s: any) => ({ ...s, pos_x: Math.max(0, Math.min(100, x)), pos_y: Math.max(0, Math.min(100, y)) }));
      }}
      onPointerUp={() => setIsDraggingText(false)}
      onPointerLeave={() => setIsDraggingText(false)}
    >
    {isDraggingText && styles.pos_x === 50 && (
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#0ea5e9] opacity-70 shadow-[0_0_10px_rgba(14,165,233,0.8)] pointer-events-none" />
    )}
    <div 
      className={`absolute text-center px-4 pointer-events-auto cursor-move ${isDraggingText ? 'ring-2 ring-dashed ring-[#0ea5e9] bg-black/20 rounded' : 'hover:ring-2 hover:ring-dashed hover:ring-white/50 rounded'}`} 
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

              const isActive = currentTime >= w.start && currentTime < next_start;
              const isPast = currentTime >= next_start;
              
              let color = styles.primary_color;
              let opacity = 1;
              
              if (styles.effect === "karaoke") {
                color = isActive ? styles.highlight_color : styles.primary_color;
                opacity = isActive ? 1 : 0.6;
              } else if (styles.effect === "highlight") {
                color = isActive ? styles.highlight_color : styles.primary_color;
                opacity = isActive ? 1 : 0.6;
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
                    transition: "color 0.15s ease, opacity 0.1s ease"
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
  );
}
