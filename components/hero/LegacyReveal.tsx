'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { content } from '@/lib/content';
import { ArrowRight } from '@/lib/event-icons';
import Image from 'next/image';
import ParticleField from '@/components/ui/ParticleField';

gsap.registerPlugin(ScrollTrigger);

export default function LegacyReveal({ onRegisterClick }: { onRegisterClick?: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showEmblem, setShowEmblem] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { site } = content;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Play video when scrolled into view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {/* autoplay blocked, that's fine */});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Track video progress for emblem reveal
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.duration && video.currentTime / video.duration > 0.75) {
        setShowEmblem(true);
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  // Animate emblem + CTA when they appear
  useEffect(() => {
    if (!showEmblem || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (emblemRef.current) {
        gsap.fromTo(
          emblemRef.current,
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' }
        );
      }
      if (ctaRef.current) {
        gsap.fromTo(
          ctaRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, delay: 0.5, ease: 'power3.out' }
        );
      }
    });

    return () => ctx.revert();
  }, [showEmblem, prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="legacy"
      className="relative w-full overflow-hidden"
    >
      <div className="relative w-full aspect-video max-h-[80vh]">
        {isMobile ? (
          <Image
            src="/images/hero-poster.jpg"
            alt="SJBIT Campus Legacy"
            fill
            className="object-cover"
            style={{
              opacity: showEmblem ? 0.3 : 1,
              transition: 'opacity 1.5s ease-in-out',
            }}
          />
        ) : (
          <video
            ref={videoRef}
            src="/videos/hero-source.mp4"
            muted
            playsInline
            preload="none"
            className="w-full h-full object-cover"
            style={{
              opacity: showEmblem ? 0.3 : 1,
              transition: 'opacity 1.5s ease-in-out',
            }}
          />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050506]/30 to-transparent h-1/4" />
      </div>

      {/* Emblem Reveal (overlaps the video's end) */}
      <div className="relative -mt-16 sm:-mt-28 md:-mt-60 pb-16 sm:pb-24 md:pb-32 flex flex-col items-center text-center px-4 sm:px-6">
        <div
          ref={emblemRef}
          className="relative z-10 mb-8 sm:mb-12"
          style={{ opacity: prefersReducedMotion ? 1 : (showEmblem ? undefined : 0) }}
        >
          {/* SVG XXV Emblem */}
          <div className="relative">
            <svg
              viewBox="0 0 200 200"
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mx-auto"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer ring */}
              <circle
                cx="100"
                cy="100"
                r="96"
                stroke="#D4AF7A"
                strokeWidth="0.5"
                opacity="0.3"
              />
              <circle
                cx="100"
                cy="100"
                r="88"
                stroke="#D4AF7A"
                strokeWidth="0.5"
                opacity="0.15"
              />
              {/* Decorative dots on the ring */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <circle
                  key={angle}
                  cx={100 + 92 * Math.cos((angle * Math.PI) / 180)}
                  cy={100 + 92 * Math.sin((angle * Math.PI) / 180)}
                  r="1.5"
                  fill="#D4AF7A"
                  opacity="0.4"
                />
              ))}
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center font-serif text-5xl sm:text-6xl md:text-7xl tracking-tighter"
              style={{ color: '#D4AF7A' }}
            >
              XXV
            </span>
          </div>

          <p
            className="mt-4 sm:mt-6 font-mono text-[11px] sm:text-xs tracking-[0.3em] uppercase"
            style={{ color: 'rgba(212, 175, 122, 0.6)' }}
          >
            Silver Jubilee · Est. 2001
          </p>
        </div>

        {/* CTA */}
        <div
          ref={ctaRef}
          className="relative z-10 w-full max-w-md sm:max-w-xl mx-auto"
          style={{ opacity: prefersReducedMotion ? 1 : 0 }}
        >
          <h3
            className="font-serif text-2xl sm:text-3xl md:text-5xl mb-3 sm:mb-4 px-2"
            style={{ color: '#F5F3EE' }}
          >
            {site.tagline}
          </h3>
          <p className="text-sm sm:text-lg mb-8 sm:mb-10 max-w-lg mx-auto px-2" style={{ color: 'rgba(245,243,238,0.5)' }}>
            {site.prizePoolLabel}{' '}
            <span className="font-semibold" style={{ color: '#D4AF7A' }}>
              {site.prizePoolDisplay}
            </span>
          </p>
          <button
            onClick={onRegisterClick}
            id="register"
            className="cursor-interact group inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-medium text-base sm:text-lg transition-all duration-300 w-full sm:w-auto"
            style={{
              background: '#D4AF7A',
              color: '#050506',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 40px rgba(212,175,122,0.4)';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {site.registerCtaLabel}
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
