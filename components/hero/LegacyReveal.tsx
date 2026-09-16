'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { content } from '@/lib/content';
import { ArrowRight } from '@/lib/event-icons';

gsap.registerPlugin(ScrollTrigger);

export default function LegacyReveal({ onRegisterClick }: { onRegisterClick?: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showEmblem, setShowEmblem] = useState(false);
  const [playFailed, setPlayFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { site } = content;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
  }, []);

  /* ─── Task 10: Prefetch video data when approaching viewport ─── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start buffering video data when section is within 600px of viewport
    const prefetchObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.preload = 'auto'; // Upgrade from "metadata" to full buffering
          prefetchObserver.disconnect();
        }
      },
      { rootMargin: '600px' }
    );

    prefetchObserver.observe(video);
    return () => prefetchObserver.disconnect();
  }, []);

  /* ─── Task 9: Fixed play/pause with AbortError handling ─── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Track in-flight play promise to prevent the classic play()/pause() race
    let playPromise: Promise<void> | null = null;
    let currentlyIntersecting = false;

    // Reset playFailed when video successfully plays
    const onPlaying = () => {
      if (playFailed) setPlayFailed(false);
    };
    video.addEventListener('playing', onPlaying);

    const attemptPlay = () => {
      // Task 10: Only play if enough data is buffered
      if (video.readyState < 3 /* HAVE_FUTURE_DATA */) {
        // Not enough data yet — wait for canplay event
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay);
          if (currentlyIntersecting) attemptPlay();
        };
        video.addEventListener('canplay', onCanPlay);
        return;
      }

      playPromise = video.play();
      playPromise
        .catch((err: DOMException) => {
          if (err.name === 'AbortError') {
            // Interrupted by a rapid pause() — NOT a real failure.
            // Retry silently if still in viewport.
            if (currentlyIntersecting) {
              setTimeout(() => {
                if (currentlyIntersecting) attemptPlay();
              }, 100);
            }
          } else if (err.name === 'NotAllowedError') {
            // Genuine autoplay policy block (e.g. iOS Low Power Mode)
            // This is the ONLY case where the tap-to-play fallback is appropriate
            setPlayFailed(true);
          }
          // Other errors: silently ignore (network hiccups, etc.)
        })
        .finally(() => {
          playPromise = null;
        });
    };

    const safePause = () => {
      if (playPromise) {
        // Wait for pending play() to settle, THEN pause
        playPromise
          .then(() => {
            if (!currentlyIntersecting) video.pause();
          })
          .catch(() => {
            // play() was already rejected — no need to pause
          });
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        currentlyIntersecting = entry.isIntersecting;

        if (entry.isIntersecting) {
          attemptPlay();
        } else {
          safePause();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener('playing', onPlaying);
    };
  }, [playFailed]);

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

  // Animate emblem when it appears
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
    });

    return () => ctx.revert();
  }, [showEmblem, prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="legacy"
      className="relative w-full overflow-hidden"
    >
      <div className="relative w-full aspect-video max-h-[80vh] bg-[#050506]">
        <video
          ref={videoRef}
          src="/videos/hero-source.mp4"
          muted
          playsInline
          loop
          autoPlay
          controls={playFailed}
          preload="metadata"
          className="w-full h-full object-contain md:object-cover"
          style={{
            opacity: showEmblem ? 0.3 : 1,
            transition: 'opacity 1.5s ease-in-out',
          }}
        />

        {/* Play fallback — only shown for genuine NotAllowedError */}
        {playFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 pointer-events-none">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.play().then(() => setPlayFailed(false)).catch(() => {});
                }
              }}
              className="pointer-events-auto px-6 py-3 rounded-full bg-[#D4AF7A]/20 text-[#D4AF7A] border border-[#D4AF7A]/50 backdrop-blur-md uppercase tracking-widest text-xs font-mono transition-all hover:bg-[#D4AF7A]/40"
            >
              Tap to Play Video
            </button>
          </div>
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
