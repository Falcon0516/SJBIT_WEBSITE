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
const INTRO_FRAMES_DESKTOP = 150;
const INTRO_FRAMES_MOBILE = 20;     // Aggressively reduced for faster mobile loading
const CAMPUS_FRAMES_DESKTOP = 180;
const CAMPUS_FRAMES_MOBILE = 24;    // Aggressively reduced for faster mobile loading

/* Low-end device gets even fewer frames */
const INTRO_FRAMES_LOW_END = 20;
const CAMPUS_FRAMES_LOW_END = 24;

/* ─── Scroll boundaries ─── */
const INTRO_END = 0.30;           // intro clip occupies 0 → 30%
const TRANSITION_START = 0.26;    // cross-fade begins
const TRANSITION_END = 0.34;      // cross-fade ends
const CAMPUS_START = 0.30;        // campus clip starts

/* ─── Glow overlay boundaries (intro frames 53-108 out of 150) ─── */
const GLOW_SCROLL_START = (53 / 150) * INTRO_END;  // ~0.106
const GLOW_SCROLL_END = (108 / 150) * INTRO_END;    // ~0.216

function getIntroFrameSrc(index: number, isMobile: boolean): string {
  const pad = String(index).padStart(3, '0');
  if (isMobile) {
    return `/frames/intro-mobile/frame-${pad}.webp`;
  }
  return `/frames/intro/frame-${pad}.webp`;
}

function getCampusFrameSrc(index: number, isMobile: boolean): string {
  const pad = String(index).padStart(3, '0');
  if (isMobile) {
    return `/frames/hero-mobile/frame-${pad}.webp`;
  }
  return `/frames/hero/frame-${pad}.webp`;
}

/** Detect low-end devices */
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

  const introFramesRef = useRef<HTMLImageElement[]>([]);
  const campusFramesRef = useRef<HTMLImageElement[]>([]);
  const currentPhaseRef = useRef<'intro' | 'transition' | 'campus'>('intro');
  const activeTimelineIndexRef = useRef(0);
  const lastProgressRef = useRef(0);

  /* Frame fallback refs — prevent blank/jump when frame not yet loaded */
  const lastDrawnIntroRef = useRef(0);
  const lastDrawnCampusRef = useRef(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);

  // Detect reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ─── Draw helpers ─── */

  // Draw a single image onto canvas with portrait-fit / landscape-cover logic
  const drawImageToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) => {
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const { naturalWidth: iw, naturalHeight: ih } = img;
      // Use object-fit: cover logic for all orientations
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    },
    []
  );

  /** Draw frame safely — falls back to last drawn frame if target isn't loaded yet */
  const drawSafeFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      frames: HTMLImageElement[],
      index: number,
      lastDrawnRef: React.MutableRefObject<number>,
      cw: number,
      ch: number,
      alpha: number = 1
    ) => {
      const img = frames[index];
      ctx.globalAlpha = alpha;
      if (img && img.complete && img.naturalWidth > 0) {
        drawImageToCanvas(ctx, img, cw, ch);
        lastDrawnRef.current = index;
      } else {
        // Fall back to last successfully drawn frame to prevent jumps
        const fallback = frames[lastDrawnRef.current];
        if (fallback && fallback.complete && fallback.naturalWidth > 0) {
          drawImageToCanvas(ctx, fallback, cw, ch);
        }
      }
    },
    [drawImageToCanvas]
  );

  // Master draw function — handles intro, transition cross-fade, and campus phases
  const drawFrame = useCallback(
    (scrollProgress: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width: cw, height: ch } = canvas;
      ctx.clearRect(0, 0, cw, ch);

      // Background fill for portrait letterbox regions
      ctx.fillStyle = '#050506';
      ctx.fillRect(0, 0, cw, ch);

      const introFrames = introFramesRef.current;
      const campusFrames = campusFramesRef.current;

      if (scrollProgress <= TRANSITION_START) {
        /* ── Pure intro phase ── */
        currentPhaseRef.current = 'intro';
        const introProgress = scrollProgress / INTRO_END;
        const introIndex = Math.min(
          Math.floor(introProgress * introFrames.length),
          introFrames.length - 1
        );
        drawSafeFrame(ctx, introFrames, introIndex, lastDrawnIntroRef, cw, ch);
      } else if (scrollProgress >= TRANSITION_END) {
        /* ── Pure campus phase ── */
        currentPhaseRef.current = 'campus';
        const campusProgress = (scrollProgress - CAMPUS_START) / (1 - CAMPUS_START);
        const campusIndex = Math.min(
          Math.floor(campusProgress * campusFrames.length),
          campusFrames.length - 1
        );
        drawSafeFrame(ctx, campusFrames, campusIndex, lastDrawnCampusRef, cw, ch);
      } else {
        /* ── Cross-fade transition ── */
        currentPhaseRef.current = 'transition';
        const fadeProgress = (scrollProgress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
        const easedFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress); // smoothstep

        // Intro frame (fading out)
        const introProgress = scrollProgress / INTRO_END;
        const introIndex = Math.min(
          Math.floor(introProgress * introFrames.length),
          introFrames.length - 1
        );
        drawSafeFrame(ctx, introFrames, introIndex, lastDrawnIntroRef, cw, ch, 1 - easedFade);

        // Campus frame (fading in)
        const campusProgress = (scrollProgress - CAMPUS_START) / (1 - CAMPUS_START);
        const campusIndex = Math.max(
          0,
          Math.min(
            Math.floor(campusProgress * campusFrames.length),
            campusFrames.length - 1
          )
        );
        drawSafeFrame(ctx, campusFrames, campusIndex, lastDrawnCampusRef, cw, ch, easedFade);

        ctx.globalAlpha = 1;
      }
    },
    [drawSafeFrame]
  );

  // Preload frame images with full load tracking
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const lowEnd = isLowEndDevice();

    // --- Intro frames ---
    const introCount = lowEnd
      ? INTRO_FRAMES_LOW_END
      : isMobile
        ? INTRO_FRAMES_MOBILE
        : INTRO_FRAMES_DESKTOP;

    const introStep = lowEnd || isMobile ? Math.floor(INTRO_FRAMES_DESKTOP / introCount) : 1;
    const introImages: HTMLImageElement[] = [];

    // --- Campus frames ---
    const campusCount = lowEnd
      ? CAMPUS_FRAMES_LOW_END
      : isMobile
        ? CAMPUS_FRAMES_MOBILE
        : CAMPUS_FRAMES_DESKTOP;

    const campusStep = lowEnd || isMobile ? Math.floor(CAMPUS_FRAMES_DESKTOP / campusCount) : 1;
    const campusImages: HTMLImageElement[] = [];

    const totalFrames = introCount + campusCount;
    let loadedCount = 0;
    let firstDrawDone = false;

    const onFrameLoad = () => {
      loadedCount++;
      const pct = Math.round((loadedCount / totalFrames) * 100);
      setLoadProgress(pct);

      // Show canvas after first frame loads (poster swap)
      if (!firstDrawDone && loadedCount >= 1) {
        firstDrawDone = true;
        setIsLoaded(true);
        drawFrame(0);
      }

      // All frames loaded — unlock smooth scrolling
      if (loadedCount >= totalFrames) {
        setIsAllLoaded(true);
      }
    };

    // Load intro frames
    for (let i = 0; i < introCount; i++) {
      const img = new window.Image();
      const frameNum = (isMobile || lowEnd) ? (i * introStep + 1) : (i + 1);
      img.src = getIntroFrameSrc(frameNum, isMobile);
      
      // Force off-main-thread decoding to eliminate scroll stutter
      if (img.decode) {
        img.decode().then(onFrameLoad).catch(onFrameLoad);
      } else {
        img.onload = onFrameLoad;
        img.onerror = onFrameLoad;
      }
      introImages.push(img);
    }
    introFramesRef.current = introImages;

    // Load campus frames
    for (let i = 0; i < campusCount; i++) {
      const img = new window.Image();
      const frameNum = (isMobile || lowEnd) ? (i * campusStep + 1) : (i + 1);
      img.src = getCampusFrameSrc(frameNum, isMobile);
      
      if (img.decode) {
        img.decode().then(onFrameLoad).catch(onFrameLoad);
      } else {
        img.onload = onFrameLoad;
        img.onerror = onFrameLoad;
      }
      campusImages.push(img);
    }
    campusFramesRef.current = campusImages;
  }, [prefersReducedMotion, drawFrame]);

  // Setup ScrollTrigger with RAF VSYNC batching and zero scroll-tick React re-renders
  useEffect(() => {
    if (prefersReducedMotion || !isLoaded) return;

    const container = containerRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!container || !sticky || !canvas) return;

    const isMobile = window.innerWidth < 768;
    const lowEnd = isLowEndDevice();

    // Size the canvas — cap DPR to 1 on mobile for performance
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
    let pendingProgress: number | null = null;
    let isDrawPending = false;

    // Pin the sticky container and scrub frames smoothly
    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      pin: sticky,
      scrub: isMobile ? 0.3 : true,
      onUpdate: (self) => {
        const progress = self.progress;
        lastProgressRef.current = progress;

        // 1. Update overlay beat ONLY when timeline index changes
        const tIndex = timeline.findIndex(
          (frame) => progress >= frame.scrollStart && progress <= frame.scrollEnd
        );
        const resolvedIndex =
          tIndex === -1 && progress > timeline[timeline.length - 1].scrollEnd
            ? timeline.length - 1
            : tIndex;

        if (resolvedIndex !== -1 && resolvedIndex !== activeTimelineIndexRef.current) {
          activeTimelineIndexRef.current = resolvedIndex;
          setActiveTimelineIndex(resolvedIndex);
        }

        // 2. Direct DOM update for scroll cue visibility
        if (cueRef.current) {
          cueRef.current.style.opacity = progress < 0.98 ? '1' : '0';
        }

        // 3. Direct DOM update for glow overlay
        if (glowRef.current) {
          if (progress >= GLOW_SCROLL_START && progress <= GLOW_SCROLL_END) {
            const glowMid = (GLOW_SCROLL_START + GLOW_SCROLL_END) / 2;
            const glowHalf = (GLOW_SCROLL_END - GLOW_SCROLL_START) / 2;
            const dist = Math.abs(progress - glowMid);
            const intensity = 1 - (dist / glowHalf); // 0 at edges, 1 at center
            glowRef.current.style.opacity = String(Math.max(0, intensity * 0.85));
          } else {
            glowRef.current.style.opacity = '0';
          }
        }

        // 4. Batch canvas draws to VSYNC via requestAnimationFrame
        pendingProgress = progress;
        if (!isDrawPending) {
          isDrawPending = true;
          requestAnimationFrame(() => {
            if (pendingProgress !== null) {
              drawFrame(pendingProgress);
            }
            isDrawPending = false;
          });
        }
      },
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      trigger.kill();
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
        {/* Ambient gold glow behind portrait canvas */}
        <div className="ambient-blob ambient-blob-gold w-[320px] h-[320px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25" />

        {/* Poster placeholder until first frame loads */}
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

        {/* Frame-sequence canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ willChange: 'transform' }}
        />

        {/* ── Golden glow overlay for grand intro moments (frames 53-108) ── */}
        <div
          ref={glowRef}
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            opacity: 0,
            willChange: 'opacity',
            transition: 'opacity 0.5s ease-out',
          }}
        >
          {/* Radial golden glow */}
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
          {/* Animated rotating rays */}
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
          {/* Top/bottom vignette for the glow */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(212,175,122,0.08) 0%, transparent 30%, transparent 70%, rgba(212,175,122,0.06) 100%)',
            }}
          />
        </div>

        {/* Hardware-accelerated gradient overlay for text readability & top/bottom feathering */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050506]/70 via-transparent to-[#050506]/70" />

        {/* Hero text overlay (updates only when timeline beat changes) */}
        <HeroOverlay activeFrameIndex={activeTimelineIndex} />

        {/* Skip to Events button — bottom right */}
        <button
          onClick={() => {
            const eventsSection = document.getElementById('events');
            if (eventsSection) eventsSection.scrollIntoView({ behavior: 'smooth' });
          }}
          className="cursor-interact absolute bottom-16 sm:bottom-20 right-4 sm:right-8 z-20 group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-mono tracking-wider uppercase transition-all duration-300 pointer-events-auto min-h-[44px] min-w-[44px]"
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

        {/* Bottom scroll cue — direct DOM opacity controlled */}
        <div
          ref={cueRef}
          className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity duration-300 pointer-events-none"
        >
          <span
            className="text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase mb-2"
            style={{ color: '#D4AF7A' }}
          >
            Scroll to explore
          </span>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" style={{ color: '#D4AF7A' }} />
        </div>

        {/* ── Loading overlay — blocks interaction until all frames are preloaded ── */}
        <div
          className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050506] transition-opacity duration-700 ${
            isAllLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
          <div className="mt-6 w-40 sm:w-48 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${loadProgress}%`,
                background: 'linear-gradient(90deg, #D4AF7A, #E8C992)',
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>
          <span
            className="mt-2 font-mono text-[9px] tracking-widest"
            style={{ color: 'rgba(212,175,122,0.3)' }}
          >
            {loadProgress}%
          </span>
        </div>
      </div>
    </section>
  );
}
