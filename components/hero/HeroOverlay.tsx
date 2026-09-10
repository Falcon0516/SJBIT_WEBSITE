'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { content, HeroOverlayFrame } from '@/lib/content';

interface HeroOverlayProps {
  progress?: number;
  activeFrameIndex?: number;
  prefersReducedMotion?: boolean;
}

export default function HeroOverlay({
  progress,
  activeFrameIndex: controlledIndex,
  prefersReducedMotion = false,
}: HeroOverlayProps) {
  const { heroOverlayTimeline, site } = content;
  const [internalIndex, setInternalIndex] = useState<number>(-1);

  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex !== undefined) return;
    if (prefersReducedMotion) {
      setInternalIndex(heroOverlayTimeline.length - 1);
      return;
    }
    if (progress === undefined) return;

    const index = heroOverlayTimeline.findIndex(
      (frame) => progress >= frame.scrollStart && progress <= frame.scrollEnd
    );

    if (index === -1 && progress > heroOverlayTimeline[heroOverlayTimeline.length - 1].scrollEnd) {
      setInternalIndex(heroOverlayTimeline.length - 1);
    } else {
      setInternalIndex(index);
    }
  }, [progress, controlledIndex, prefersReducedMotion, heroOverlayTimeline]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 sm:px-6 text-center">
      <AnimatePresence mode="wait">
        {activeIndex !== -1 &&
          heroOverlayTimeline[activeIndex] &&
          heroOverlayTimeline[activeIndex].heading !== '' && (
          <OverlayText
            key={activeIndex}
            frame={heroOverlayTimeline[activeIndex]}
            prefersReducedMotion={prefersReducedMotion}
            prizePoolAmount={site.prizePoolAmount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OverlayText({
  frame,
  prefersReducedMotion,
  prizePoolAmount,
}: {
  frame: HeroOverlayFrame;
  prefersReducedMotion: boolean;
  prizePoolAmount: number;
}) {
  const isPrizePoolFrame = frame.sub.includes('₹');
  const [displayAmount, setDisplayAmount] = useState(prefersReducedMotion ? prizePoolAmount : 0);

  useEffect(() => {
    if (!isPrizePoolFrame || prefersReducedMotion) return;

    let startTime: number;
    const duration = 1200;
    let raf: number;

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(Math.floor(eased * prizePoolAmount));

      if (progress < 1) {
        raf = requestAnimationFrame(animateCount);
      }
    };

    raf = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(raf);
  }, [isPrizePoolFrame, prizePoolAmount, prefersReducedMotion]);

  const renderSub = (text: string) => {
    if (isPrizePoolFrame && text.includes('₹4,00,000')) {
      const parts = text.split('₹4,00,000');
      return (
        <>
          {parts[0]}
          <span className="font-bold" style={{ color: '#D4AF7A' }}>
            ₹{displayAmount.toLocaleString('en-IN')}
          </span>
          {parts[1]}
        </>
      );
    }
    return text;
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0, y: 0 } : { opacity: 0, y: -20 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="max-w-5xl"
    >
      <h1
        className="font-serif text-2xl sm:text-5xl md:text-7xl lg:text-8xl mb-3 sm:mb-6 tracking-tight text-balance"
        style={{
          color: '#F5F3EE',
          textShadow: '0 4px 40px rgba(0,0,0,0.6), 0 0 120px rgba(212,175,122,0.15)',
        }}
      >
        {frame.heading}
      </h1>
      <p
        className="text-xs sm:text-lg md:text-2xl tracking-wide font-light px-2 text-balance"
        style={{
          color: 'rgba(245, 243, 238, 0.7)',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}
      >
        {renderSub(frame.sub)}
      </p>
    </motion.div>
  );
}
