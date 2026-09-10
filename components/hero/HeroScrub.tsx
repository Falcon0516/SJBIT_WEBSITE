'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroOverlay from './HeroOverlay';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { content } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 180;
const MOBILE_FRAMES = 90;

function getFrameSrc(index: number, isMobile: boolean): string {
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
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
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

  // Draw a specific frame to the canvas with responsive portrait fit / landscape cover
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = framesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const { width: cw, height: ch } = canvas;
    const { naturalWidth: iw, naturalHeight: ih } = img;

    const isPortrait = ch > cw;

    ctx.clearRect(0, 0, cw, ch);

    if (isPortrait) {
      // In portrait orientation (mobile/tablet), fit the full 16:9 width so all
      // 3D event monoliths (left, center, right) remain 100% visible and uncropped.
      const scale = cw / iw;
      const dw = cw;
      const dh = ih * scale;
      const dx = 0;
      const dy = (ch - dh) / 2;

      // Base background fill
      ctx.fillStyle = '#050506';
      ctx.fillRect(0, 0, cw, ch);

      // Draw fitted image
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      // Landscape: full bleed cover
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
    }

    currentFrameRef.current = frameIndex;
  }, []);

  // Preload frame images with async GPU decode
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const frameCount = isMobile ? MOBILE_FRAMES : TOTAL_FRAMES;
    const step = isMobile ? 2 : 1;

    const images: HTMLImageElement[] = [];
    let isInitialDrawn = false;

    for (let i = 0; i < frameCount; i++) {
      const img = new window.Image();
      const frameNum = isMobile ? (i * step) + 1 : i + 1;
      img.src = getFrameSrc(frameNum, isMobile);

      // Async decode so bitmaps are already decompressed in GPU memory before scrubbing
      img.decode()
        .then(() => {
          if (!isInitialDrawn && i === 0) {
            isInitialDrawn = true;
            setIsLoaded(true);
            drawFrame(0);
          }
        })
        .catch(() => {
          if (!isInitialDrawn && i === 0) {
            isInitialDrawn = true;
            setIsLoaded(true);
            drawFrame(0);
          }
        });

      images.push(img);
    }

    framesRef.current = images;
  }, [prefersReducedMotion, drawFrame]);

  // Setup ScrollTrigger with RAF VSYNC batching and zero scroll-tick React re-renders
  useEffect(() => {
    if (prefersReducedMotion || !isLoaded) return;

    const container = containerRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!container || !sticky || !canvas) return;

    const isMobile = window.innerWidth < 768;

    // Size the canvas (capped at 2x DPR to prevent extreme GPU fill on high-density mobile displays)
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      drawFrame(currentFrameRef.current);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const timeline = content.heroOverlayTimeline;
    let pendingFrameIndex: number | null = null;
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

        // 1. Update overlay beat ONLY when timeline index changes (max 7 times in total)
        const tIndex = timeline.findIndex(
          (frame) => progress >= frame.scrollStart && progress <= frame.scrollEnd
        );
        const resolvedIndex = tIndex === -1 && progress > timeline[timeline.length - 1].scrollEnd
          ? timeline.length - 1
          : tIndex;

        if (resolvedIndex !== -1 && resolvedIndex !== activeTimelineIndexRef.current) {
          activeTimelineIndexRef.current = resolvedIndex;
          setActiveTimelineIndex(resolvedIndex);
        }

        // 2. Direct DOM update for scroll cue visibility (0 React re-renders)
        if (cueRef.current) {
          cueRef.current.style.opacity = progress < 0.98 ? '1' : '0';
        }

        // 3. Batch canvas draws to VSYNC via requestAnimationFrame
        const totalFrames = framesRef.current.length;
        const frameIndex = Math.min(
          Math.floor(progress * totalFrames),
          totalFrames - 1
        );

        if (frameIndex !== currentFrameRef.current) {
          pendingFrameIndex = frameIndex;
          if (!isDrawPending) {
            isDrawPending = true;
            requestAnimationFrame(() => {
              if (pendingFrameIndex !== null) {
                drawFrame(pendingFrameIndex);
              }
              isDrawPending = false;
            });
          }
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
      className="relative w-full bg-[#050506] h-[300vh] md:h-[500vh]"
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
