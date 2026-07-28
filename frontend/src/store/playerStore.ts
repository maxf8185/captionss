import { create } from 'zustand';

export interface Overlay {
  id: string;
  url: string;
  start: number;
  end: number;
}

interface PlayerState {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  segments: any[];
  overlays: Overlay[];
  thumbnails: string[];
  videoAspect: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null> | null;
  
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;
  setSegments: (segments: any[]) => void;
  setOverlays: (overlays: Overlay[]) => void;
  setThumbnails: (thumbnails: string[]) => void;
  setVideoAspect: (aspect: number | null) => void;
  setVideoRef: (ref: React.RefObject<HTMLVideoElement | null>) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTime: 0,
  isPlaying: false,
  duration: 1,
  segments: [],
  overlays: [],
  thumbnails: [],
  videoAspect: null,
  videoRef: null,

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setDuration: (duration) => set({ duration: duration }),
  setSegments: (segments) => set({ segments: segments }),
  setOverlays: (overlays) => set({ overlays: overlays }),
  setThumbnails: (thumbnails) => set({ thumbnails: thumbnails }),
  setVideoAspect: (aspect) => set({ videoAspect: aspect }),
  setVideoRef: (ref) => set({ videoRef: ref }),
}));
