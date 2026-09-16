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

// Mobile gets fewer frames but enough for smooth scrubbing
const MOBILE_INTRO_COUNT = 24;
const MOBILE_CAMPUS_COUNT = 30;

/* ─── Scroll boundaries (same for desktop and mobile) ─── */
const INTRO_END = 0.30;
const TRANSITION_START = 0.26;
const TRANSITION_END = 0.34;
const CAMPUS_START = 0.30;

/* ─── Glow overlay boundaries ─── */
const GLOW_SCROLL_START = (53 / 150) * INTRO_END;
const GLOW_SCROLL_END = (108 / 150) * INTRO_END;

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

  const introFramesRef = useRef<(HTMLImageElement | HTMLCanvasElement)[]>([]);
  const campusFramesRef = useRef<(HTMLImageElement | HTMLCanvasElement)[]>([]);
  const currentPhaseRef = useRef<'intro' | 'transition' | 'campus'>('intro');
  const activeTimelineIndexRef = useRef(-1);
  const lastProgressRef = useRef(0);
  const lastDrawnIntroRef = useRef(0);
  const lastDrawnCampusRef = useRef(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(-1);

  const isMobileRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const drawImageToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, source: HTMLImageElement | HTMLCanvasElement, cw: number, ch: number) => {
      if (!source) return;
      
      let iw, ih;
      if (source instanceof HTMLImageElement) {
        if (!source.complete || source.naturalWidth === 0) return;
        iw = source.naturalWidth;
        ih = source.naturalHeight;
      } else {
        iw = source.width;
        ih = source.height;
      }

      const scale = Math.min(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    },
    []
  );

  const drawSafeFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      frames: (HTMLImageElement | HTMLCanvasElement)[],
      index: number,
      lastDrawnRef: React.MutableRefObject<number>,
      cw: number,
      ch: number,
      alpha: number = 1
    ) => {
      const source = frames[index];
      ctx.globalAlpha = alpha;
      
      let isReady = false;
      if (source instanceof HTMLImageElement) {
        isReady = source.complete && source.naturalWidth > 0;
      } else if (source instanceof HTMLCanvasElement) {
        isReady = true;
      }

      if (isReady) {
        drawImageToCanvas(ctx, source, cw, ch);
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

  /* ─── Unified Frame Renderer (single canvas for all devices) ─── */
  const drawFrame = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width: cw, height: ch } = canvas;

      const introFrames = introFramesRef.current;
      const campusFrames = campusFramesRef.current;
      if (introFrames.length === 0 || campusFrames.length === 0) return;

      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#050506';
      ctx.fillRect(0, 0, cw, ch);

      if (progress <= TRANSITION_START) {
        currentPhaseRef.current = 'intro';
        const p = Math.min(progress / INTRO_END, 1);
        const idx = Math.min(Math.floor(p * introFrames.length), introFrames.length - 1);
        drawSafeFrame(ctx, introFrames, idx, lastDrawnIntroRef, cw, ch);
      } else if (progress >= TRANSITION_END) {
        currentPhaseRef.current = 'campus';
        const p = Math.min((progress - CAMPUS_START) / (1 - CAMPUS_START), 1);
        const idx = Math.min(Math.floor(p * campusFrames.length), campusFrames.length - 1);
        drawSafeFrame(ctx, campusFrames, idx, lastDrawnCampusRef, cw, ch);
      } else {
        currentPhaseRef.current = 'transition';
        const ip = Math.min(progress / INTRO_END, 1);
        const cp = Math.max(0, (progress - CAMPUS_START) / (1 - CAMPUS_START));
        const fadeRaw = (progress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
        const fade = fadeRaw * fadeRaw * (3 - 2 * fadeRaw);

        const iIdx = Math.min(Math.floor(ip * introFrames.length), introFrames.length - 1);
        const cIdx = Math.max(0, Math.min(Math.floor(cp * campusFrames.length), campusFrames.length - 1));

        drawSafeFrame(ctx, introFrames, iIdx, lastDrawnIntroRef, cw, ch, 1 - fade);
        drawSafeFrame(ctx, campusFrames, cIdx, lastDrawnCampusRef, cw, ch, fade);
        ctx.globalAlpha = 1;
      }
    },
    [drawSafeFrame]
  );

  /* ─── Preloader: HTMLImageElement + .decode() for guaranteed bitmap caching ─── */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const lowEnd = isLowEndDevice();
    isMobileRef.current = isMobile;

    // Enable normalizeScroll on mobile to eliminate iOS momentum scroll jank.
    // This intercepts touch events and converts them to smooth, predictable
    // scroll updates — bypassing iOS Safari's aggressive rAF throttling
    // during momentum scrolling that causes the "stuck frame then jump" bug.
    if (isMobile) {
      ScrollTrigger.normalizeScroll(true);
    }

    const introCount = (isMobile || lowEnd) ? MOBILE_INTRO_COUNT : INTRO_TOTAL;
    const campusCount = (isMobile || lowEnd) ? MOBILE_CAMPUS_COUNT : CAMPUS_TOTAL;
    const introStep = (isMobile || lowEnd) ? Math.max(1, Math.floor(INTRO_TOTAL / introCount)) : 1;
    const campusStep = (isMobile || lowEnd) ? Math.max(1, Math.floor(CAMPUS_TOTAL / campusCount)) : 1;

    const totalFrames = introCount + campusCount;
    let loadedCount = 0;

    const loadedIntro: (HTMLImageElement | HTMLCanvasElement)[] = new Array(introCount).fill(null);
    const loadedCampus: (HTMLImageElement | HTMLCanvasElement)[] = new Array(campusCount).fill(null);

    const onProgress = () => {
      loadedCount++;
      setLoadProgress(Math.min(100, Math.round((loadedCount / totalFrames) * 100)));

      if (loadedCount >= totalFrames) {
        introFramesRef.current = loadedIntro;
        campusFramesRef.current = loadedCampus;

        setTimeout(() => {
          setIsLoaded(true);
          drawFrame(0);
        }, 150);
      }
    };

    // Load image + force GPU decode using .decode()
    // .decode() guarantees the browser has fully decompressed the image
    // into its internal decoded bitmap cache BEFORE we ever try to draw it.
    // HOWEVER, iOS WebKit aggressively evicts decoded bitmaps if memory gets tight.
    // To prevent this, on mobile we draw the image to an offscreen canvas IMMEDIATELY.
    // WebKit cannot garbage-collect living canvas buffers. This guarantees zero frame stall.
    const loadAndDecode = async (src: string, target: (HTMLImageElement | HTMLCanvasElement)[], index: number) => {
      const img = new window.Image();
      img.src = src;

      try {
        await img.decode();
        
        if (isMobile) {
          const offscreen = document.createElement('canvas');
          offscreen.width = img.naturalWidth;
          offscreen.height = img.naturalHeight;
          const oCtx = offscreen.getContext('2d');
          if (oCtx) {
            oCtx.drawImage(img, 0, 0);
            target[index] = offscreen;
          } else {
            target[index] = img;
          }
        } else {
          target[index] = img;
        }
      } catch {
        // Fallback
        await new Promise<void>((resolve) => {
          img.onload = () => {
            if (isMobile) {
              const offscreen = document.createElement('canvas');
              offscreen.width = img.naturalWidth || img.width;
              offscreen.height = img.naturalHeight || img.height;
              const oCtx = offscreen.getContext('2d');
              if (oCtx) {
                oCtx.drawImage(img, 0, 0);
                target[index] = offscreen;
              } else {
                target[index] = img;
              }
            } else {
              target[index] = img;
            }
            resolve();
          };
          img.onerror = () => resolve();
        });
      }
      onProgress();
    };

    const loadAll = async () => {
      const queue: (() => Promise<void>)[] = [];

      for (let i = 0; i < introCount; i++) {
        const frameNum = (isMobile || lowEnd) ? (i * introStep + 1) : (i + 1);
        queue.push(() => loadAndDecode(getIntroFrameSrc(frameNum, isMobile), loadedIntro, i));
      }
      for (let i = 0; i < campusCount; i++) {
        const frameNum = (isMobile || lowEnd) ? (i * campusStep + 1) : (i + 1);
        queue.push(() => loadAndDecode(getCampusFrameSrc(frameNum, isMobile), loadedCampus, i));
      }

      // Smaller batches on mobile to prevent memory spikes
      const BATCH_SIZE = isMobile ? 6 : 12;
      for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        await Promise.all(queue.slice(i, i + BATCH_SIZE).map(t => t()));
      }
    };

    loadAll();

    return () => {
      if (isMobile) {
        ScrollTrigger.normalizeScroll(false);
      }
    };
  }, [prefersReducedMotion, drawFrame]);

  /* ─── ScrollTrigger Setup ─── */
  useEffect(() => {
    if (prefersReducedMotion || !isLoaded) return;

    const container = containerRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!container || !sticky || !canvas) return;

    const isMobile = isMobileRef.current;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);
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

        // Text overlay synchronization
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

        if (cueRef.current) {
          cueRef.current.style.opacity = progress < 0.98 ? '1' : '0';
        }

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
        <Image src="/images/hero-poster.jpg" alt="SJBIT Campus" fill className="object-contain md:object-cover" priority />
        <div className="absolute inset-0 bg-black/50" />
        <HeroOverlay activeFrameIndex={content.heroOverlayTimeline.length - 1} prefersReducedMotion={true} />
      </section>
    );
  }

  return (
    <section ref={containerRef} className="relative w-full bg-[#050506] h-[300vh] md:h-[700vh]">
      <div ref={stickyRef} className="w-full h-[100dvh] overflow-hidden relative">
        {/* Ambient gold glow */}
        <div className="ambient-blob ambient-blob-gold w-[320px] h-[320px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25" />

        {/* Poster placeholder */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Image src="/images/hero-poster.jpg" alt="Loading..." fill className="object-contain md:object-cover blur-sm" priority />
        </div>

        {/* Single unified canvas for ALL devices */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Golden glow overlay */}
        <div
          ref={glowRef}
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{ opacity: 0, transition: 'opacity 0.5s ease-out' }}
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
                transparent 0deg, rgba(212,175,122,0.06) 20deg, transparent 40deg,
                transparent 90deg, rgba(212,175,122,0.04) 110deg, transparent 130deg,
                transparent 180deg, rgba(212,175,122,0.06) 200deg, transparent 220deg,
                transparent 270deg, rgba(212,175,122,0.04) 290deg, transparent 310deg
              )`,
              animation: 'glow-rotate 12s linear infinite',
              mixBlendMode: 'screen',
            }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(212,175,122,0.08) 0%, transparent 30%, transparent 70%, rgba(212,175,122,0.06) 100%)' }} />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050506]/40 via-transparent to-[#050506]/60" />

        {/* Text overlay */}
        <HeroOverlay activeFrameIndex={activeTimelineIndex} />

        {/* Skip to Events */}
        <button
          onClick={() => {
            const eventsSection = document.getElementById('events');
            if (eventsSection) eventsSection.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`cursor-interact absolute bottom-16 sm:bottom-20 right-4 sm:right-8 z-20 group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-[11px] sm:text-xs font-mono tracking-wider uppercase transition-all duration-1000 pointer-events-auto min-h-[44px] min-w-[44px] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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
          <span className="text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase mb-2" style={{ color: '#D4AF7A' }}>
            Scroll to explore
          </span>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" style={{ color: '#D4AF7A' }} />
        </div>

        {/* ── LOADING GATE ── */}
        <div
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050506] transition-opacity duration-1000 ${
            isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <span
            className="font-serif text-6xl sm:text-8xl tracking-tighter select-none"
            style={{ color: '#D4AF7A', animation: 'pulse-glow 2s ease-in-out infinite', textShadow: '0 0 40px rgba(212,175,122,0.3)' }}
          >
            XXV
          </span>
          <p className="mt-4 font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase" style={{ color: 'rgba(212,175,122,0.5)' }}>
            Silver Jubilee
          </p>
          <p className="mt-6 font-mono text-[10px] sm:text-xs tracking-wider uppercase animate-pulse" style={{ color: '#F5F3EE' }}>
            Loading Experience...
          </p>
          <div className="mt-4 w-40 sm:w-48 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${loadProgress}%`,
                background: 'linear-gradient(90deg, #D4AF7A, #E8C992)',
                transition: 'width 0.2s ease-out',
                boxShadow: '0 0 10px rgba(212,175,122,0.5)',
              }}
            />
          </div>
          <span className="mt-2 font-mono text-[9px] tracking-widest" style={{ color: 'rgba(212,175,122,0.6)' }}>
            {loadProgress}%
          </span>
        </div>
      </div>
    </section>
  );
}
