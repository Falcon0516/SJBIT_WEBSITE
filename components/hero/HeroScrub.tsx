'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroOverlay from './HeroOverlay';
import Image from 'next/image';
import { ChevronDown, ArrowDown } from 'lucide-react';
import { content } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

/* ─── Frame counts ─── */
const INTRO_TOTAL = 150;
const CAMPUS_TOTAL = 180;

const MOBILE_INTRO_COUNT = 30; // Better fidelity on mobile
const MOBILE_CAMPUS_COUNT = 36;

/* ─── Scroll boundaries ─── */
const INTRO_END = 0.30;
const TRANSITION_START = 0.26;
const TRANSITION_END = 0.34;
const CAMPUS_START = 0.30;

/* ─── Glow overlay boundaries (intro frames 53-108 out of 150) ─── */
const GLOW_SCROLL_START = (53 / 150) * INTRO_END;
const GLOW_SCROLL_END = (108 / 150) * INTRO_END;

type FrameCache = ImageBitmap | HTMLImageElement;

function getIntroFrameSrc(index: number, isMobile: boolean): string {
  const pad = String(index).padStart(3, '0');
  return isMobile
    ? `/frames/intro-mobile/frame-${pad}.webp`
    : `/frames/intro/frame-${pad}.webp`;
}

function getCampusFrameSrc(index: number, isMobile: boolean): string {
  const pad = String(index).padStart(3, '0');
  return isMobile
    ? `/frames/hero-mobile/frame-${pad}.webp`
    : `/frames/hero/frame-${pad}.webp`;
}

function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 8;
  const memory = 'deviceMemory' in navigator ? (navigator as any).deviceMemory : 8;
  return cores <= 4 && memory <= 4;
}

export default function HeroScrub() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const introFramesRef = useRef<FrameCache[]>([]);
  const campusFramesRef = useRef<FrameCache[]>([]);
  const currentPhaseRef = useRef<'intro' | 'transition' | 'campus'>('intro');
  const activeTimelineIndexRef = useRef(-1);
  const lastProgressRef = useRef(0);
  const lastDrawnIntroRef = useRef(0);
  const lastDrawnCampusRef = useRef(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(-1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ─── Unified Draw Helper for ImageBitmap and HTMLImageElement ─── */
  const drawImageToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, frame: FrameCache, cw: number, ch: number) => {
      if (!frame) return;
      
      let iw, ih;
      if ('naturalWidth' in frame) {
        if (!frame.complete || frame.naturalWidth === 0) return;
        iw = frame.naturalWidth;
        ih = frame.naturalHeight;
      } else {
        // ImageBitmap
        iw = frame.width;
        ih = frame.height;
      }

      const scale = Math.min(cw / iw, ch / ih); // object-fit: contain
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(frame, dx, dy, dw, dh);
    },
    []
  );

  const drawSafeFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      frames: FrameCache[],
      index: number,
      lastDrawnRef: React.MutableRefObject<number>,
      cw: number, ch: number,
      alpha: number = 1
    ) => {
      const frame = frames[index];
      ctx.globalAlpha = alpha;
      
      let isReady = false;
      if (frame) {
        if ('naturalWidth' in frame) {
          isReady = frame.complete && frame.naturalWidth > 0;
        } else {
          isReady = true; // ImageBitmap is always ready
        }
      }

      if (isReady) {
        drawImageToCanvas(ctx, frame, cw, ch);
        lastDrawnRef.current = index;
      } else {
        const fallback = frames[lastDrawnRef.current];
        if (fallback) {
          drawImageToCanvas(ctx, fallback, cw, ch);
        }
      }
    },
    [drawImageToCanvas]
  );

  /* ─── Unified Frame Renderer ─── */
  const drawFrame = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width: cw, height: ch } = canvas;
      
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#050506';
      ctx.fillRect(0, 0, cw, ch);

      const introFrames = introFramesRef.current;
      const campusFrames = campusFramesRef.current;

      if (introFrames.length === 0 || campusFrames.length === 0) return;

      let introProgress = 0;
      let campusProgress = 0;

      if (progress <= TRANSITION_START) {
        currentPhaseRef.current = 'intro';
        introProgress = Math.min(progress / INTRO_END, 1);
        const idx = Math.min(Math.floor(introProgress * introFrames.length), introFrames.length - 1);
        drawSafeFrame(ctx, introFrames, idx, lastDrawnIntroRef, cw, ch);
      } else if (progress >= TRANSITION_END) {
        currentPhaseRef.current = 'campus';
        campusProgress = Math.min((progress - CAMPUS_START) / (1 - CAMPUS_START), 1);
        const idx = Math.min(Math.floor(campusProgress * campusFrames.length), campusFrames.length - 1);
        drawSafeFrame(ctx, campusFrames, idx, lastDrawnCampusRef, cw, ch);
      } else {
        currentPhaseRef.current = 'transition';
        introProgress = Math.min(progress / INTRO_END, 1);
        campusProgress = Math.max(0, (progress - CAMPUS_START) / (1 - CAMPUS_START));
        
        const fadeProgress = (progress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
        const fade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
        
        const iIdx = Math.min(Math.floor(introProgress * introFrames.length), introFrames.length - 1);
        const cIdx = Math.max(0, Math.min(Math.floor(campusProgress * campusFrames.length), campusFrames.length - 1));
        
        drawSafeFrame(ctx, introFrames, iIdx, lastDrawnIntroRef, cw, ch, 1 - fade);
        drawSafeFrame(ctx, campusFrames, cIdx, lastDrawnCampusRef, cw, ch, fade);
        ctx.globalAlpha = 1;
      }
    },
    [drawSafeFrame]
  );

  /* ─── Robust Image Preloader with ImageBitmap Caching ─── */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const lowEnd = isLowEndDevice();

    const introCount = (isMobile || lowEnd) ? MOBILE_INTRO_COUNT : INTRO_TOTAL;
    const campusCount = (isMobile || lowEnd) ? MOBILE_CAMPUS_COUNT : CAMPUS_TOTAL;
    const introStep = (isMobile || lowEnd) ? Math.max(1, Math.floor(INTRO_TOTAL / introCount)) : 1;
    const campusStep = (isMobile || lowEnd) ? Math.max(1, Math.floor(CAMPUS_TOTAL / campusCount)) : 1;

    const totalFrames = introCount + campusCount;
    let loadedCount = 0;
    
    // Arrays to hold the cache
    const loadedIntroFrames: FrameCache[] = new Array(introCount).fill(null);
    const loadedCampusFrames: FrameCache[] = new Array(campusCount).fill(null);

    const onProgress = () => {
      loadedCount++;
      setLoadProgress(Math.min(100, Math.round((loadedCount / totalFrames) * 100)));

      // Strict Loading Gate: Unlock ONLY when 100% of frames are downloaded and decoded to VRAM
      if (loadedCount >= totalFrames) {
        introFramesRef.current = loadedIntroFrames;
        campusFramesRef.current = loadedCampusFrames;
        // Small delay to ensure React commits the UI and Canvas is ready
        setTimeout(() => {
          setIsLoaded(true);
          drawFrame(0);
        }, 100);
      }
    };

    // VRAM caching logic using createImageBitmap (guarantees zero-stutter on iOS Safari)
    const loadFrameToVRAM = async (src: string, targetArray: FrameCache[], index: number) => {
      try {
        if (typeof window.createImageBitmap !== 'undefined') {
          const res = await fetch(src);
          if (!res.ok) throw new Error('Fetch failed');
          const blob = await res.blob();
          const bitmap = await window.createImageBitmap(blob);
          targetArray[index] = bitmap;
          onProgress();
          return;
        }
      } catch (e) {
        // Fallback to HTMLImageElement if fetch or createImageBitmap fails
      }
      
      const img = new window.Image();
      img.src = src;
      if (img.decode) {
        img.decode().then(() => {
          targetArray[index] = img;
          onProgress();
        }).catch(() => {
          img.onload = () => { targetArray[index] = img; onProgress(); };
          img.onerror = onProgress; // Count as loaded to not block UI forever
        });
      } else {
        img.onload = () => { targetArray[index] = img; onProgress(); };
        img.onerror = onProgress;
      }
    };

    // Batch loading to prevent network choking (load 10 at a time)
    const loadAll = async () => {
      const queue: (() => Promise<void>)[] = [];
      
      for (let i = 0; i < introCount; i++) {
        const frameNum = (isMobile || lowEnd) ? (i * introStep + 1) : (i + 1);
        queue.push(() => loadFrameToVRAM(getIntroFrameSrc(frameNum, isMobile), loadedIntroFrames, i));
      }
      
      for (let i = 0; i < campusCount; i++) {
        const frameNum = (isMobile || lowEnd) ? (i * campusStep + 1) : (i + 1);
        queue.push(() => loadFrameToVRAM(getCampusFrameSrc(frameNum, isMobile), loadedCampusFrames, i));
      }

      const BATCH_SIZE = 10;
      for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        const batch = queue.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(task => task()));
      }
    };

    loadAll();

  }, [prefersReducedMotion, drawFrame]);

  /* ─── ScrollTrigger Setup ─── */
  useEffect(() => {
    if (prefersReducedMotion || !isLoaded) return;

    const container = containerRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!container || !sticky || !canvas) return;

    const isMobile = window.innerWidth < 768;
    const lowEnd = isLowEndDevice();

    // Size the unified canvas — limit DPR to save GPU bandwidth
    const resizeCanvas = () => {
      const maxDpr = isMobile || lowEnd ? 1 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      drawFrame(lastProgressRef.current);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    const timeline = content.heroOverlayTimeline;

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      pin: sticky,
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        lastProgressRef.current = progress;

        // 1. Perfectly synchronize text overlay based on raw scroll progress
        const tIndex = timeline.findIndex(
          (frame) => progress >= frame.scrollStart && progress <= frame.scrollEnd
        );
        const resolvedIndex =
          tIndex === -1 && progress > timeline[timeline.length - 1].scrollEnd
            ? timeline.length - 1
            : tIndex;

        if (resolvedIndex !== activeTimelineIndexRef.current) {
          activeTimelineIndexRef.current = resolvedIndex;
          setActiveTimelineIndex(resolvedIndex);
        }

        // 2. Scroll cue visibility
        if (cueRef.current) {
          cueRef.current.style.opacity = progress < 0.98 ? '1' : '0';
        }

        // 3. Glow overlay
        if (glowRef.current) {
          if (progress >= GLOW_SCROLL_START && progress <= GLOW_SCROLL_END) {
            const glowMid = (GLOW_SCROLL_START + GLOW_SCROLL_END) / 2;
            const glowHalf = (GLOW_SCROLL_END - GLOW_SCROLL_START) / 2;
            const dist = Math.abs(progress - glowMid);
            glowRef.current.style.opacity = String(Math.max(0, (1 - dist / glowHalf) * 0.85));
          } else {
            glowRef.current.style.opacity = '0';
          }
        }

        // 4. Draw canvas synchronously
        drawFrame(progress);
      },
    });

    return () => {
      trigger.kill();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [prefersReducedMotion, isLoaded, drawFrame]);

  // ─── Reduced Motion Fallback ───
  if (prefersReducedMotion) {
    return (
      <section className="relative w-full h-[100dvh] bg-[#050506] overflow-hidden flex items-center justify-center">
        <Image
          src="/images/hero-poster.jpg"
          alt="SJBIT Campus"
          fill
          className="object-contain md:object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <HeroOverlay activeFrameIndex={content.heroOverlayTimeline.length - 1} prefersReducedMotion={true} />
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-[#050506] h-[300vh] md:h-[700vh]"
    >
      <div ref={stickyRef} className="w-full h-[100dvh] overflow-hidden">
        {/* Ambient gold glow */}
        <div className="ambient-blob ambient-blob-gold w-[320px] h-[320px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25" />

        {/* Poster placeholder */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <Image
            src="/images/hero-poster.jpg"
            alt="Loading..."
            fill
            className="object-contain md:object-cover blur-sm"
            priority
          />
        </div>

        {/* Unified High-Performance GPU Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ willChange: 'transform' }}
        />

        {/* Golden glow overlay for grand intro moments */}
        <div
          ref={glowRef}
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            opacity: 0,
            willChange: 'opacity',
            transition: 'opacity 0.5s ease-out',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 70% 50% at 50% 50%, rgba(212,175,122,0.22) 0%, transparent 60%),
                radial-gradient(ellipse 40% 35% at 30% 45%, rgba(212,175,122,0.12) 0%, transparent 50%),
                radial-gradient(ellipse 40% 35% at 70% 55%, rgba(212,175,122,0.12) 0%, transparent 50%)
              `,
              mixBlendMode: 'screen',
              animation: 'glow-breathe 3s ease-in-out infinite',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(
                from 0deg at 50% 50%,
                transparent 0deg,
                rgba(212,175,122,0.06) 20deg,
                transparent 40deg,
                transparent 90deg,
                rgba(212,175,122,0.04) 110deg,
                transparent 130deg,
                transparent 180deg,
                rgba(212,175,122,0.06) 200deg,
                transparent 220deg,
                transparent 270deg,
                rgba(212,175,122,0.04) 290deg,
                transparent 310deg
              )`,
              animation: 'glow-rotate 12s linear infinite',
              mixBlendMode: 'screen',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(212,175,122,0.08) 0%, transparent 30%, transparent 70%, rgba(212,175,122,0.06) 100%)',
            }}
          />
        </div>

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050506]/40 via-transparent to-[#050506]/60" />

        {/* Hero text overlay — completely unified synchronization */}
        <HeroOverlay activeFrameIndex={activeTimelineIndex} />

        {/* Skip to Events */}
        <button
          onClick={() => {
            const eventsSection = document.getElementById('events');
            if (eventsSection) eventsSection.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`cursor-interact absolute bottom-16 sm:bottom-20 right-4 sm:right-8 z-20 group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-mono tracking-wider uppercase transition-all duration-1000 pointer-events-auto min-h-[44px] min-w-[44px] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: 'rgba(5, 5, 6, 0.4)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(212, 175, 122, 0.3)',
            color: '#D4AF7A',
            animation: 'float 3s ease-in-out infinite',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(212, 175, 122, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(212, 175, 122, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 122, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(5, 5, 6, 0.4)';
            e.currentTarget.style.borderColor = 'rgba(212, 175, 122, 0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Skip to Events
          <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-y-0.5" />
        </button>

        {/* Scroll cue */}
        <div
          ref={cueRef}
          className={`absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 pointer-events-none ${isLoaded ? 'opacity-100' : 'opacity-0 translate-y-4'}`}
        >
          <span
            className="text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase mb-2"
            style={{ color: '#D4AF7A' }}
          >
            Scroll to explore
          </span>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" style={{ color: '#D4AF7A' }} />
        </div>

        {/* ── STRICT LOADING GATE — blocks completely until 100% VRAM cache is filled ── */}
        <div
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050506] transition-opacity duration-1000 ${
            isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <span
            className="font-serif text-6xl sm:text-8xl tracking-tighter select-none"
            style={{
              color: '#D4AF7A',
              animation: 'pulse-glow 2s ease-in-out infinite',
              textShadow: '0 0 40px rgba(212,175,122,0.3)',
            }}
          >
            XXV
          </span>
          <p
            className="mt-4 font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase"
            style={{ color: 'rgba(212,175,122,0.5)' }}
          >
            Silver Jubilee
          </p>
          <p
            className="mt-6 font-mono text-[10px] sm:text-xs tracking-wider uppercase animate-pulse"
            style={{ color: '#F5F3EE' }}
          >
            Loading Site Content... Please Wait
          </p>
          <div className="mt-4 w-40 sm:w-48 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${loadProgress}%`,
                background: 'linear-gradient(90deg, #D4AF7A, #E8C992)',
                transition: 'width 0.2s ease-out',
                boxShadow: '0 0 10px rgba(212,175,122,0.5)'
              }}
            />
          </div>
          <span
            className="mt-2 font-mono text-[9px] tracking-widest"
            style={{ color: 'rgba(212,175,122,0.6)' }}
          >
            {loadProgress}%
          </span>
        </div>
      </div>
    </section>
  );
}
