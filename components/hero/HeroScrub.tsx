'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroOverlay from './HeroOverlay';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 180;
const MOBILE_FRAMES = 90; // Load every 2nd frame on mobile

function getFrameSrc(index: number): string {
  // Frames are 1-indexed: frame-001.jpg, frame-002.jpg, ...
  return `/frames/hero/frame-${String(index).padStart(3, '0')}.jpg`;
}

export default function HeroScrub() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Detect reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Draw a specific frame to the canvas with object-fit: cover math
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = framesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const { width: cw, height: ch } = canvas;
    const { naturalWidth: iw, naturalHeight: ih } = img;

    // Cover-fit calculation
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
    currentFrameRef.current = frameIndex;
  }, []);

  // Preload frame images
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const frameCount = isMobile ? MOBILE_FRAMES : TOTAL_FRAMES;
    const step = isMobile ? 2 : 1; // skip every other frame on mobile

    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 0; i < frameCount; i++) {
      const img = new window.Image();
      const frameNum = isMobile ? (i * step) + 1 : i + 1;
      img.src = getFrameSrc(frameNum);
      img.onload = () => {
        loadedCount++;
        // Show as soon as first frame loads
        if (loadedCount === 1) {
          setIsLoaded(true);
          drawFrame(0);
        }
      };
      images.push(img);
    }

    framesRef.current = images;
  }, [prefersReducedMotion, drawFrame]);

  // Setup ScrollTrigger for pinning + frame scrubbing
  useEffect(() => {
    if (prefersReducedMotion || !isLoaded) return;

    const container = containerRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!container || !sticky || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;

    // Size the canvas
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      // Redraw current frame at new size
      drawFrame(currentFrameRef.current);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pin the sticky container and scrub frames
    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      pin: sticky,
      scrub: true,
      onUpdate: (self) => {
        setScrollProgress(self.progress);

        const totalFrames = framesRef.current.length;
        const frameIndex = Math.min(
          Math.floor(self.progress * totalFrames),
          totalFrames - 1
        );

        // Only redraw if frame actually changed
        if (frameIndex !== currentFrameRef.current) {
          drawFrame(frameIndex);
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
      <section className="relative w-full h-[100dvh] bg-[#050506] overflow-hidden">
        <Image
          src="/images/hero-poster.jpg"
          alt="SJBIT Campus"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <HeroOverlay progress={1} prefersReducedMotion={true} />
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-[#050506] h-[300vh] md:h-[500vh]"
    >
      <div ref={stickyRef} className="w-full h-[100dvh] overflow-hidden">
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
            className="object-cover blur-sm"
            priority
          />
        </div>

        {/* Frame-sequence canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Hero text overlay */}
        <HeroOverlay progress={scrollProgress} />

        {/* Bottom scroll cue — visible until the end of the scrub */}
        <div
          className={`absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity duration-500 ${
            scrollProgress < 0.98 ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
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
