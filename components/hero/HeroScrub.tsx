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

/* ─── Scroll boundaries ─── */
const INTRO_END = 0.30;

/* ─── Glow overlay boundaries ─── */
const GLOW_SCROLL_START = (53 / 150) * INTRO_END;
const GLOW_SCROLL_END = (108 / 150) * INTRO_END;

/* ─── Debug instrumentation ─── */
const DEBUG = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_ANIM === '1';
function debugLog(...args: unknown[]) {
  if (DEBUG) console.debug('[HeroScrub]', ...args);
}

/* ─── Frame source helpers ─── */
function getUnifiedFrameSrc(index: number, isMobile: boolean): string {
  const pad = String(index).padStart(3, '0');
  return isMobile
    ? `/frames/unified-mobile/frame-${pad}.webp`
    : `/frames/unified/frame-${pad}.webp`;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT — Simplified architecture:
   
   1. Load ALL 330 frames as HTMLImageElement (total ~5MB on mobile,
      ~300MB decoded — well within 4GB device budget).
   2. No sliding window, no eviction, no offscreen canvases.
   3. Draw via rAF coalescing — never draw synchronously in onUpdate.
   4. scrub: true (no smoothing delay = no oscillation/bounce-back).
   5. No anticipatePin (causes iOS scroll traps).
   ═══════════════════════════════════════════════════════════ */
export default function HeroScrub() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // All 330 frames stored as simple image references
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const activeTimelineIndexRef = useRef(-1);
  const lastProgressRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);
  const rafIdRef = useRef(0);
  const configRef = useRef<TierConfig>(getTierConfig('MEDIUM'));

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

  /* ─── Canvas draw: progress → frame index → drawImage ─── */
  const paintFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: cw, height: ch } = canvas;
    const frames = framesRef.current;
    if (frames.length === 0) return;

    const progress = lastProgressRef.current;
    const TOTAL_FRAMES = frames.length; // 330
    const INTRO_FRAMES = 150;
    const CAMPUS_FRAMES = 180;

    // Map scroll progress → frame index (direct 1:1 mapping, no scaling)
    let idx = 0;
    if (progress <= INTRO_END) {
      const p = Math.min(progress / INTRO_END, 1);
      idx = Math.min(Math.floor(p * INTRO_FRAMES), INTRO_FRAMES - 1);
    } else {
      const p = Math.min((progress - INTRO_END) / (1 - INTRO_END), 1);
      idx = INTRO_FRAMES + Math.min(Math.floor(p * CAMPUS_FRAMES), CAMPUS_FRAMES - 1);
    }
    idx = Math.max(0, Math.min(idx, TOTAL_FRAMES - 1));

    // Skip redundant draws
    if (idx === lastDrawnFrameRef.current) return;

    // Find the frame to draw — use exact index, or nearest loaded fallback
    let source = frames[idx];
    if (!source || !source.complete || source.naturalWidth === 0) {
      // Search nearby frames (prefer forward, then backward)
      for (let d = 1; d < 30; d++) {
        const fwd = frames[idx + d];
        if (fwd && fwd.complete && fwd.naturalWidth > 0) { source = fwd; break; }
        const bwd = frames[idx - d];
        if (bwd && bwd.complete && bwd.naturalWidth > 0) { source = bwd; break; }
      }
    }

    if (!source || !source.complete || source.naturalWidth === 0) return;

    // Cover-fit the image into the canvas
    const iw = source.naturalWidth;
    const ih = source.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    const dx = Math.round((cw - dw) / 2);
    const dy = Math.round((ch - dh) / 2);

    ctx.drawImage(source, dx, dy, dw, dh);
    lastDrawnFrameRef.current = idx;
  }, []);

  /* ─── rAF-coalesced draw scheduler ─── */
  const schedulePaint = useCallback(() => {
    if (rafIdRef.current) return; // already scheduled
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      paintFrame();
    });
  }, [paintFrame]);

  /* ─── Task 7: Visibility handling ─── */
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        schedulePaint();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [schedulePaint]);

  /* ─── Frame loader: load ALL 330 frames as HTMLImageElement ─── */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const tier = getDeviceTier();
    const config = getTierConfig(tier);
    configRef.current = config;

    debugLog(`Device tier: ${tier}`, config);

    const TOTAL = 330;
    const srcs: string[] = [];
    for (let i = 1; i <= TOTAL; i++) {
      srcs.push(getUnifiedFrameSrc(i, isMobile));
    }

    // Initialize frames array
    const frames: (HTMLImageElement | null)[] = new Array(TOTAL).fill(null);
    framesRef.current = frames;
    let loadedCount = 0;
    let gateReached = false;

    const onFrameReady = (index: number, img: HTMLImageElement) => {
      frames[index] = img;
      loadedCount++;
      setLoadProgress(Math.min(100, Math.round((loadedCount / TOTAL) * 100)));

      // Gate: unlock animation once we have enough frames for the intro
      if (!gateReached && loadedCount >= config.gateFrameCount) {
        gateReached = true;
        setIsLoaded(true);
        debugLog(`Gate reached at ${loadedCount} frames — unlocking`);
      }

      // Repaint if we're already scrolling
      if (gateReached) {
        schedulePaint();
      }
    };

    // Load frames in batches, respecting concurrency
    let cancelled = false;
    const loadBatch = async (startIdx: number) => {
      if (cancelled) return;
      const batchSize = config.batchConcurrency;
      const batch: Promise<void>[] = [];

      for (let i = startIdx; i < Math.min(startIdx + batchSize, TOTAL); i++) {
        const idx = i;
        const p = new Promise<void>((resolve) => {
          const img = new window.Image();
          img.decoding = 'async';
          img.src = srcs[idx];
          img.onload = () => {
            // Decode off main thread
            if (typeof img.decode === 'function') {
              img.decode().then(() => {
                if (!cancelled) onFrameReady(idx, img);
                resolve();
              }).catch(() => {
                // decode failed but image loaded — use it anyway
                if (!cancelled) onFrameReady(idx, img);
                resolve();
              });
            } else {
              if (!cancelled) onFrameReady(idx, img);
              resolve();
            }
          };
          img.onerror = () => {
            loadedCount++;
            setLoadProgress(Math.min(100, Math.round((loadedCount / TOTAL) * 100)));
            resolve();
          };
        });
        batch.push(p);
      }

      await Promise.all(batch);

      // Continue with next batch
      const nextStart = startIdx + batchSize;
      if (nextStart < TOTAL && !cancelled) {
        // Yield to main thread between batches
        await new Promise(r => setTimeout(r, 0));
        await loadBatch(nextStart);
      }
    };

    loadBatch(0);

    return () => {
      cancelled = true;
      framesRef.current = [];
    };
  }, [prefersReducedMotion, schedulePaint]);

  /* ─── ScrollTrigger setup ─── */
  useEffect(() => {
    if (prefersReducedMotion || !isLoaded) return;

    const container = containerRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!container || !sticky || !canvas) return;

    const config = configRef.current;

    // Canvas sizing
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, config.canvasDprCap);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      lastDrawnFrameRef.current = -1; // force redraw
      paintFrame();
    };

    resizeCanvas();

    // Debounced resize — ignore iOS address bar changes
    let lastWidth = window.innerWidth;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Only resize if WIDTH actually changed (height-only = address bar)
        if (Math.abs(window.innerWidth - lastWidth) > 1) {
          lastWidth = window.innerWidth;
          resizeCanvas();
          ScrollTrigger.refresh();
        }
      }, 200);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        lastWidth = window.innerWidth;
        resizeCanvas();
        ScrollTrigger.refresh();
      }, 400);
    });

    // Draw frame 0
    paintFrame();

    const timeline = content.heroOverlayTimeline;

    // Tell GSAP to ignore mobile resize (address bar) globally
    ScrollTrigger.config({ ignoreMobileResize: true });

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      pin: sticky,
      // KEY FIX: scrub: true (instant, no smoothing)
      // scrub: 0.35 was causing the "back and forth" oscillation on iOS
      // because the lerp overshoots when momentum scroll fires rapid deltas
      scrub: true,
      fastScrollEnd: true,
      // NO anticipatePin — it causes scroll position fights on iOS
      onUpdate: (self) => {
        const progress = self.progress;
        lastProgressRef.current = progress;

        // Text overlay sync
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

        // Scroll cue
        if (cueRef.current) {
          cueRef.current.style.opacity = progress < 0.98 ? '1' : '0';
        }

        // Glow overlay
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

        // Schedule canvas repaint (coalesced via rAF)
        schedulePaint();
      },
    });

    return () => {
      trigger.kill();
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [prefersReducedMotion, isLoaded, paintFrame, schedulePaint]);

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
    <section ref={containerRef} className="relative w-full bg-[#050506] h-[300dvh] md:h-[700dvh]">
      <div
        ref={stickyRef}
        className="w-full h-[100dvh] overflow-hidden relative"
        style={{ transform: 'translateZ(0)', WebkitBackfaceVisibility: 'hidden' }}
      >
        {/* Ambient gold glow */}
        <div className="ambient-blob ambient-blob-gold w-[320px] h-[320px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25" />

        {/* Poster placeholder */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Image src="/images/hero-poster.jpg" alt="Loading..." fill className="object-contain md:object-cover blur-sm" priority />
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        />

        {/* Golden glow overlay */}
        <div
          ref={glowRef}
          className="absolute inset-0 pointer-events-none z-[5] hidden md:block"
          style={{ opacity: 0, willChange: 'opacity', transform: 'translateZ(0)' }}
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
