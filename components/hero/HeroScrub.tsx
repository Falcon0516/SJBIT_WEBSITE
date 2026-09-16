'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroOverlay from './HeroOverlay';
import Image from 'next/image';
import { ChevronDown, ArrowDown } from 'lucide-react';
import { content } from '@/lib/content';
import { getDeviceTier, getTierConfig, type DeviceTier, type TierConfig } from '@/lib/device-tier';

gsap.registerPlugin(ScrollTrigger);

/* ─── Source frame counts (files on disk) ─── */
const INTRO_TOTAL = 150;
const CAMPUS_TOTAL = 180;

/* ─── Scroll boundaries ─── */
const INTRO_END = 0.30;
const TRANSITION_START = 0.26;
const TRANSITION_END = 0.34;
const CAMPUS_START = 0.30;

/* ─── Glow overlay boundaries ─── */
const GLOW_SCROLL_START = (53 / 150) * INTRO_END;
const GLOW_SCROLL_END = (108 / 150) * INTRO_END;

/* ─── Debug instrumentation (stripped from production unless env var set) ─── */
const DEBUG = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_ANIM === '1';
function debugLog(...args: unknown[]) {
  if (DEBUG) console.debug('[HeroScrub]', ...args);
}

/* ─── Frame source helpers ─── */
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

/* ─── Frame type (offscreen canvas or image) ─── */
type FrameData = HTMLCanvasElement | HTMLImageElement | null;

/* ─── Rolling Window Frame Manager ─── */
class FrameManager {
  private frames: FrameData[];
  private srcs: string[];
  private loading = new Set<number>();
  private config: TierConfig;
  private isMobile: boolean;
  private paused = false;
  private onFirstWindowReady: (() => void) | null = null;
  private onProgressUpdate: ((loaded: number, total: number) => void) | null = null;
  private totalLoaded = 0;

  constructor(
    srcs: string[],
    config: TierConfig,
    isMobile: boolean,
    callbacks: {
      onFirstWindowReady?: () => void;
      onProgressUpdate?: (loaded: number, total: number) => void;
    } = {}
  ) {
    this.frames = new Array(srcs.length).fill(null);
    this.srcs = srcs;
    this.config = config;
    this.isMobile = isMobile;
    this.onFirstWindowReady = callbacks.onFirstWindowReady || null;
    this.onProgressUpdate = callbacks.onProgressUpdate || null;
  }

  get length() { return this.srcs.length; }
  get loaded() { return this.totalLoaded; }

  getFrame(index: number): FrameData {
    return this.frames[index] ?? null;
  }

  /** Preload the first N frames (the "gate" window) and resolve when ready */
  async preloadGate(): Promise<void> {
    const gateCount = Math.min(this.config.gateFrameCount, this.srcs.length);
    const batch: Promise<void>[] = [];
    for (let i = 0; i < gateCount; i++) {
      batch.push(this.loadFrame(i));
      // Respect concurrency limit
      if (batch.length >= this.config.batchConcurrency) {
        await Promise.all(batch);
        batch.length = 0;
      }
    }
    if (batch.length > 0) await Promise.all(batch);
    this.onFirstWindowReady?.();
  }

  /** Continue loading remaining frames in the background, prioritizing around currentIndex */
  async preloadRemaining(startFrom: number = 0): Promise<void> {
    // Load frames in order from startFrom, respecting concurrency
    const batch: Promise<void>[] = [];
    for (let i = 0; i < this.srcs.length; i++) {
      if (this.paused) break;
      const idx = (startFrom + i) % this.srcs.length;
      if (this.frames[idx] !== null) continue; // Already loaded
      batch.push(this.loadFrame(idx));
      if (batch.length >= this.config.batchConcurrency) {
        await Promise.all(batch);
        batch.length = 0;
        // Yield to main thread between batches
        await new Promise<void>(r => setTimeout(r, 0));
      }
    }
    if (batch.length > 0) await Promise.all(batch);
  }

  /** Ensure frames around the given index are loaded, evict distant ones on MEDIUM/LOW */
  ensureWindow(currentIndex: number): void {
    if (this.config.windowSize >= this.srcs.length) return; // HIGH tier: keep everything

    const half = Math.floor(this.config.windowSize / 2);
    const lo = Math.max(0, currentIndex - half);
    const hi = Math.min(this.srcs.length - 1, currentIndex + half);

    // Evict frames far outside the window
    for (let i = 0; i < this.srcs.length; i++) {
      if (i < lo - half || i > hi + half) {
        if (this.frames[i] !== null) {
          this.frames[i] = null; // Let GC reclaim
        }
      }
    }

    // Request any missing frames within the window (don't block on them)
    for (let i = lo; i <= hi; i++) {
      if (this.frames[i] === null && !this.loading.has(i)) {
        this.loadFrame(i); // Fire-and-forget
      }
    }
  }

  /** Load a single frame */
  private async loadFrame(index: number): Promise<void> {
    if (this.frames[index] !== null || this.loading.has(index)) return;
    this.loading.add(index);

    const t0 = DEBUG ? performance.now() : 0;

    try {
      const img = new window.Image();
      img.src = this.srcs[index];

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load ${this.srcs[index]}`));
      });

      // Try decode for guaranteed bitmap caching
      try { await img.decode(); } catch { /* decode not critical */ }

      if (this.config.useOffscreenCache && this.isMobile) {
        // Bake into offscreen canvas to prevent iOS WebKit eviction
        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const oCtx = offscreen.getContext('2d');
        if (oCtx) {
          oCtx.drawImage(img, 0, 0);
          this.frames[index] = offscreen;
        } else {
          this.frames[index] = img;
        }
      } else {
        this.frames[index] = img;
      }

      this.totalLoaded++;
      this.onProgressUpdate?.(this.totalLoaded, this.srcs.length);

      if (DEBUG) {
        debugLog(`Frame ${index} loaded in ${(performance.now() - t0).toFixed(1)}ms`);
      }
    } catch {
      // Network error — don't block forever
      this.totalLoaded++;
      this.onProgressUpdate?.(this.totalLoaded, this.srcs.length);
    } finally {
      this.loading.delete(index);
    }
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }

  /** Release all frames */
  destroy() {
    this.paused = true;
    this.frames.fill(null);
    this.loading.clear();
  }
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function HeroScrub() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const introMgrRef = useRef<FrameManager | null>(null);
  const campusMgrRef = useRef<FrameManager | null>(null);
  const currentPhaseRef = useRef<'intro' | 'transition' | 'campus'>('intro');
  const activeTimelineIndexRef = useRef(-1);
  const lastProgressRef = useRef(0);
  const lastDrawnIntroRef = useRef(0);
  const lastDrawnCampusRef = useRef(0);
  const tierRef = useRef<DeviceTier>('MEDIUM');
  const configRef = useRef<TierConfig>(getTierConfig('MEDIUM'));
  const introReleasedRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(-1);

  /* ─── Reduced motion detection ─── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ─── Canvas draw helpers ─── */
  const drawImageToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, source: FrameData, cw: number, ch: number) => {
      if (!source) return;

      let iw: number, ih: number;
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
      mgr: FrameManager,
      index: number,
      lastDrawnRef: React.MutableRefObject<number>,
      cw: number,
      ch: number,
      alpha: number = 1
    ) => {
      const source = mgr.getFrame(index);
      ctx.globalAlpha = alpha;

      if (source) {
        drawImageToCanvas(ctx, source, cw, ch);
        lastDrawnRef.current = index;
      } else {
        // Frame not yet loaded — draw closest available fallback
        const fallback = mgr.getFrame(lastDrawnRef.current);
        if (fallback) {
          drawImageToCanvas(ctx, fallback, cw, ch);
        }
      }
    },
    [drawImageToCanvas]
  );

  /* ─── Unified frame renderer ─── */
  const drawFrame = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width: cw, height: ch } = canvas;

      const introMgr = introMgrRef.current;
      const campusMgr = campusMgrRef.current;
      if (!introMgr || !campusMgr) return;

      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#050506';
      ctx.fillRect(0, 0, cw, ch);

      if (progress <= TRANSITION_START) {
        currentPhaseRef.current = 'intro';
        const p = Math.min(progress / INTRO_END, 1);
        const idx = Math.min(Math.floor(p * introMgr.length), introMgr.length - 1);
        drawSafeFrame(ctx, introMgr, idx, lastDrawnIntroRef, cw, ch);
        introMgr.ensureWindow(idx);
      } else if (progress >= TRANSITION_END) {
        currentPhaseRef.current = 'campus';
        const p = Math.min((progress - CAMPUS_START) / (1 - CAMPUS_START), 1);
        const idx = Math.min(Math.floor(p * campusMgr.length), campusMgr.length - 1);
        drawSafeFrame(ctx, campusMgr, idx, lastDrawnCampusRef, cw, ch);
        campusMgr.ensureWindow(idx);

        // Task 6: Release intro frames once permanently in campus phase
        if (!introReleasedRef.current) {
          introReleasedRef.current = true;
          debugLog('Releasing intro frames — permanently in campus phase');
          // Delay release slightly to avoid flash during fast reverse
          setTimeout(() => {
            if (currentPhaseRef.current === 'campus') {
              introMgrRef.current?.destroy();
            } else {
              introReleasedRef.current = false; // User scrolled back
            }
          }, 2000);
        }
      } else {
        currentPhaseRef.current = 'transition';
        introReleasedRef.current = false; // Reset if we're back in transition

        const ip = Math.min(progress / INTRO_END, 1);
        const cp = Math.max(0, (progress - CAMPUS_START) / (1 - CAMPUS_START));
        const fadeRaw = (progress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
        const fade = fadeRaw * fadeRaw * (3 - 2 * fadeRaw); // smoothstep

        const iIdx = Math.min(Math.floor(ip * introMgr.length), introMgr.length - 1);
        const cIdx = Math.max(0, Math.min(Math.floor(cp * campusMgr.length), campusMgr.length - 1));

        drawSafeFrame(ctx, introMgr, iIdx, lastDrawnIntroRef, cw, ch, 1 - fade);
        drawSafeFrame(ctx, campusMgr, cIdx, lastDrawnCampusRef, cw, ch, fade);
        ctx.globalAlpha = 1;

        introMgr.ensureWindow(iIdx);
        campusMgr.ensureWindow(cIdx);
      }
    },
    [drawSafeFrame]
  );

  /* ─── Task 7: Visibility handling ─── */
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        introMgrRef.current?.pause();
        campusMgrRef.current?.pause();
        debugLog('Tab hidden — paused decoders');
      } else {
        introMgrRef.current?.resume();
        campusMgrRef.current?.resume();
        drawFrame(lastProgressRef.current);
        debugLog('Tab visible — resumed decoders, resynced canvas');
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [drawFrame]);

  /* ─── Preloader with rolling-window architecture (Tasks 2, 3, 5) ─── */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const tier = getDeviceTier();
    const config = getTierConfig(tier);
    tierRef.current = tier;
    configRef.current = config;

    debugLog(`Device tier: ${tier}`, config);

    // Build frame source lists with equalized density
    const introStep = Math.max(1, Math.floor(INTRO_TOTAL / config.introFrameCount));
    const campusStep = Math.max(1, Math.floor(CAMPUS_TOTAL / config.campusFrameCount));

    const introSrcs: string[] = [];
    for (let i = 0; i < config.introFrameCount; i++) {
      const frameNum = tier === 'HIGH' ? (i + 1) : (i * introStep + 1);
      introSrcs.push(getIntroFrameSrc(Math.min(frameNum, INTRO_TOTAL), isMobile));
    }

    const campusSrcs: string[] = [];
    for (let i = 0; i < config.campusFrameCount; i++) {
      const frameNum = tier === 'HIGH' ? (i + 1) : (i * campusStep + 1);
      campusSrcs.push(getCampusFrameSrc(Math.min(frameNum, CAMPUS_TOTAL), isMobile));
    }

    const totalFrames = introSrcs.length + campusSrcs.length;
    let combinedLoaded = 0;

    const updateProgress = () => {
      combinedLoaded++;
      setLoadProgress(Math.min(100, Math.round((combinedLoaded / totalFrames) * 100)));
    };

    const introMgr = new FrameManager(introSrcs, config, isMobile, {
      onProgressUpdate: updateProgress,
    });

    const campusMgr = new FrameManager(campusSrcs, config, isMobile, {
      onProgressUpdate: updateProgress,
    });

    introMgrRef.current = introMgr;
    campusMgrRef.current = campusMgr;

    // Two-phase loading:
    // Phase 1 (gate): Load first window of BOTH sequences → unlock scrubbing
    // Phase 2 (stream): Background-load remaining frames
    const loadPipeline = async () => {
      // Gate: load minimum frames of both sequences in parallel
      await Promise.all([
        introMgr.preloadGate(),
        campusMgr.preloadGate(),
      ]);

      debugLog('Gate frames ready — unlocking scrub');
      setIsLoaded(true);

      // Small delay to let React paint the unlocked state before we resume heavy work
      await new Promise<void>(r => setTimeout(r, 200));

      // Stream: load remaining frames in background
      await Promise.all([
        introMgr.preloadRemaining(config.gateFrameCount),
        campusMgr.preloadRemaining(config.gateFrameCount),
      ]);

      debugLog('All frames loaded');
    };

    loadPipeline();

    // Cleanup: release all frames on unmount (Task 6)
    return () => {
      introMgr.destroy();
      campusMgr.destroy();
      introMgrRef.current = null;
      campusMgrRef.current = null;
    };
  }, [prefersReducedMotion]);

  /* ─── ScrollTrigger setup (Task 4: dvh fix) ─── */
  useEffect(() => {
    if (prefersReducedMotion || !isLoaded) return;

    const container = containerRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!container || !sticky || !canvas) return;

    const config = configRef.current;

    // Initial canvas sizing
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, config.canvasDprCap);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      drawFrame(lastProgressRef.current);
    };

    resizeCanvas();

    // Task 4: Debounced resize that ignores pure address-bar height deltas
    let lastVVH = window.visualViewport?.height ?? window.innerHeight;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newVVH = window.visualViewport?.height ?? window.innerHeight;
        const delta = Math.abs(newVVH - lastVVH);
        // Ignore changes < 100px (likely just address bar)
        if (delta > 100 || Math.abs(window.innerWidth - canvas.clientWidth) > 1) {
          lastVVH = newVVH;
          resizeCanvas();
          ScrollTrigger.refresh();
          debugLog('Resize: refreshed ScrollTrigger');
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        resizeCanvas();
        ScrollTrigger.refresh();
      }, 300);
    });

    // Draw initial frame
    drawFrame(0);

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
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [prefersReducedMotion, isLoaded, drawFrame]);

  /* ─── Reduced Motion Fallback ─── */
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
    /* Task 4: h-[300dvh] instead of h-[300vh] */
    <section ref={containerRef} className="relative w-full bg-[#050506] h-[300dvh] md:h-[700dvh]">
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
