'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroOverlay from './HeroOverlay';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { content } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

/* ─── Frame counts ─── */
const INTRO_FRAMES_DESKTOP = 150;
const INTRO_FRAMES_MOBILE = 75;   // every 2nd frame
const CAMPUS_FRAMES_DESKTOP = 180;
const CAMPUS_FRAMES_MOBILE = 90;  // every 2nd frame

/* ─── Scroll boundaries ─── */
const INTRO_END = 0.30;           // intro clip occupies 0 → 30%
const TRANSITION_START = 0.26;    // cross-fade begins
const TRANSITION_END = 0.34;      // cross-fade ends
const CAMPUS_START = 0.30;        // campus clip starts

function getIntroFrameSrc(index: number, isMobile: boolean): string {
  const pad = String(index).padStart(3, '0');
  if (isMobile) {
    return `/frames/intro-mobile/frame-${pad}.jpg`;
  }
  return `/frames/intro/frame-${pad}.jpg`;
}

function getCampusFrameSrc(index: number, isMobile: boolean): string {
  const pad = String(index).padStart(3, '0');
  if (isMobile) {
    return `/frames/hero-mobile/frame-${pad}.jpg`;
  }
  return `/frames/hero/frame-${pad}.jpg`;
}

export default function HeroScrub() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  const introFramesRef = useRef<HTMLImageElement[]>([]);
  const campusFramesRef = useRef<HTMLImageElement[]>([]);
  const currentPhaseRef = useRef<'intro' | 'transition' | 'campus'>('intro');
  const activeTimelineIndexRef = useRef(0);

  const [isLoaded, setIsLoaded] = useState(false);
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
      const isPortrait = ch > cw;

      if (isPortrait) {
        const scale = cw / iw;
        const dw = cw;
        const dh = ih * scale;
        const dx = 0;
        const dy = (ch - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        const scale = Math.max(cw / iw, ch / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    },
    []
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
        const img = introFrames[introIndex];
        if (img) {
          ctx.globalAlpha = 1;
          drawImageToCanvas(ctx, img, cw, ch);
        }
      } else if (scrollProgress >= TRANSITION_END) {
        /* ── Pure campus phase ── */
        currentPhaseRef.current = 'campus';
        const campusProgress = (scrollProgress - CAMPUS_START) / (1 - CAMPUS_START);
        const campusIndex = Math.min(
          Math.floor(campusProgress * campusFrames.length),
          campusFrames.length - 1
        );
        const img = campusFrames[campusIndex];
        if (img) {
          ctx.globalAlpha = 1;
          drawImageToCanvas(ctx, img, cw, ch);
        }
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
        const introImg = introFrames[introIndex];
        if (introImg) {
          ctx.globalAlpha = 1 - easedFade;
          drawImageToCanvas(ctx, introImg, cw, ch);
        }

        // Campus frame (fading in)
        const campusProgress = (scrollProgress - CAMPUS_START) / (1 - CAMPUS_START);
        const campusIndex = Math.max(
          0,
          Math.min(
            Math.floor(campusProgress * campusFrames.length),
            campusFrames.length - 1
          )
        );
        const campusImg = campusFrames[campusIndex];
        if (campusImg) {
          ctx.globalAlpha = easedFade;
          drawImageToCanvas(ctx, campusImg, cw, ch);
        }

        ctx.globalAlpha = 1;
      }
    },
    [drawImageToCanvas]
  );

  // Preload frame images with async GPU decode
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;

    // --- Intro frames ---
    const introCount = isMobile ? INTRO_FRAMES_MOBILE : INTRO_FRAMES_DESKTOP;
    const introStep = isMobile ? 2 : 1;
    const introImages: HTMLImageElement[] = [];
    let introFirstDrawn = false;

    for (let i = 0; i < introCount; i++) {
      const img = new window.Image();
      const frameNum = isMobile ? i * introStep + 1 : i + 1;
      img.src = getIntroFrameSrc(frameNum, isMobile);

      img.decode()
        .then(() => {
          if (!introFirstDrawn && i === 0) {
            introFirstDrawn = true;
            setIsLoaded(true);
            drawFrame(0);
          }
        })
        .catch(() => {
          if (!introFirstDrawn && i === 0) {
            introFirstDrawn = true;
            setIsLoaded(true);
            drawFrame(0);
          }
        });

      introImages.push(img);
    }
    introFramesRef.current = introImages;

    // --- Campus frames ---
    const campusCount = isMobile ? CAMPUS_FRAMES_MOBILE : CAMPUS_FRAMES_DESKTOP;
    const campusStep = isMobile ? 2 : 1;
    const campusImages: HTMLImageElement[] = [];

    for (let i = 0; i < campusCount; i++) {
      const img = new window.Image();
      const frameNum = isMobile ? i * campusStep + 1 : i + 1;
      img.src = getCampusFrameSrc(frameNum, isMobile);
      img.decode().catch(() => {}); // silent — GPU pre-decode
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

    // Size the canvas (capped at 2x DPR)
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

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

        // 3. Batch canvas draws to VSYNC via requestAnimationFrame
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
      className="relative w-full bg-[#050506] h-[400vh] md:h-[700vh]"
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
        />

        {/* Hardware-accelerated gradient overlay for text readability & top/bottom feathering */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050506]/70 via-transparent to-[#050506]/70" />

        {/* Hero text overlay (updates only when timeline beat changes) */}
        <HeroOverlay activeFrameIndex={activeTimelineIndex} />

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
      </div>
    </section>
  );
}
