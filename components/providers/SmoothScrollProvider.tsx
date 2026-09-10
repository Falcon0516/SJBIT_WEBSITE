'use client';

import { useEffect, useRef, ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollProviderProps {
  children: ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // On touch devices (phones/tablets), native inertial scrolling is 60-120fps hardware accelerated.
    // Hijacking touch with JavaScript smooth-scroll causes severe touch latency and choppiness.
    const isTouchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    if (isTouchDevice) {
      // On mobile, keep default GSAP lag smoothing active for smooth ScrollTrigger interpolation
      gsap.ticker.lagSmoothing(500, 33);
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      syncTouch: false,
    });

    lenisRef.current = lenis;

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const tickerHandler = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerHandler);
    gsap.ticker.lagSmoothing(500, 33); // Keep lag smoothing enabled to prevent frame hitching

    // Listen for modal stop/start events
    const handleStop = () => lenis.stop();
    const handleStart = () => lenis.start();
    window.addEventListener('lenis-stop', handleStop);
    window.addEventListener('lenis-start', handleStart);

    return () => {
      gsap.ticker.remove(tickerHandler);
      window.removeEventListener('lenis-stop', handleStop);
      window.removeEventListener('lenis-start', handleStart);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
