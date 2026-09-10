'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { content } from '@/lib/content';
import * as LucideIcons from 'lucide-react';

const QUOTES = [
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"Innovation distinguishes between a leader and a follower." — Steve Jobs',
  '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"Simplicity is the soul of efficiency." — Austin Freeman',
  '"Technology is best when it brings people together." — Matt Mullenweg',
  '"In the middle of difficulty lies opportunity." — Albert Einstein',
  '"Move fast and break things." — Mark Zuckerberg',
  '"Stay hungry, stay foolish." — Steve Jobs',
  '"The future belongs to those who believe in the beauty of their dreams." — Eleanor Roosevelt',
];

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { events, site } = content;

  // Rotate quotes every 5 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Stop Lenis + lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Stop Lenis smooth scrolling so the modal can scroll freely
    const lenisStopEvent = new CustomEvent('lenis-stop');
    window.dispatchEvent(lenisStopEvent);

    // Capture wheel events on the modal to prevent propagation to Lenis
    const container = scrollContainerRef.current;
    const preventLenisScroll = (e: WheelEvent) => {
      e.stopPropagation();
    };

    if (container) {
      container.addEventListener('wheel', preventLenisScroll, { passive: false });
    }

    return () => {
      document.body.style.overflow = '';
      const lenisStartEvent = new CustomEvent('lenis-start');
      window.dispatchEvent(lenisStartEvent);
      if (container) {
        container.removeEventListener('wheel', preventLenisScroll);
      }
    };
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4"
      onClick={handleBackdropClick}
      style={{
        animation: 'modal-fade-in 0.3s ease-out forwards',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(2, 2, 4, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      />

      {/* Modal scroll container — traps scroll inside */}
      <div
        ref={scrollContainerRef}
        className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl"
        style={{
          animation: 'modal-scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          background: 'rgba(10, 10, 14, 0.95)',
          border: '1px solid rgba(212, 175, 122, 0.15)',
          boxShadow: '0 0 80px rgba(212, 175, 122, 0.08), 0 40px 120px rgba(0, 0, 0, 0.6)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Close button — sticky */}
        <div className="sticky top-0 z-20 flex justify-end p-3 sm:p-4 pointer-events-none">
          <button
            onClick={onClose}
            className="cursor-interact pointer-events-auto w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90"
            style={{
              background: 'rgba(10,10,14,0.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(245,243,238,0.6)',
            }}
            aria-label="Close registration modal"
          >
            <LucideIcons.X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* ─── Trophy + Prize Pool Section (Inline) ─── */}
        <div className="relative pb-4 px-6 overflow-hidden -mt-6">
          {/* Background glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-48 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(212,175,122,0.1) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />

          {/* Inline row: Trophy + Prize */}
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8">
            {/* Premium Trophy */}
            <div
              className="relative flex-shrink-0"
              style={{ animation: 'trophy-glow 3s ease-in-out infinite' }}
            >
              {/* Outer ring */}
              <div
                className="w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(212,175,122,0.2), rgba(184,150,90,0.08))',
                  border: '2px solid rgba(212,175,122,0.3)',
                  boxShadow: '0 0 40px rgba(212,175,122,0.12), inset 0 0 20px rgba(212,175,122,0.06)',
                }}
              >
                {/* Inner glow circle */}
                <div
                  className="w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,230,200,0.12), rgba(212,175,122,0.05))',
                    border: '1px solid rgba(212,175,122,0.2)',
                  }}
                >
                  <LucideIcons.Trophy
                    className="w-7 h-7 sm:w-9 sm:h-9"
                    strokeWidth={1.8}
                    style={{
                      color: '#D4AF7A',
                      filter: 'drop-shadow(0 0 6px rgba(212,175,122,0.5))',
                    }}
                  />
                </div>
              </div>
              {/* Sparkle dots */}
              <div
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                style={{
                  background: '#F5E6C8',
                  boxShadow: '0 0 8px 2px rgba(245,230,200,0.6)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }}
              />
              <div
                className="absolute bottom-1 -left-1 w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#D4AF7A',
                  boxShadow: '0 0 6px 2px rgba(212,175,122,0.5)',
                  animation: 'pulse-glow 2s ease-in-out infinite 0.8s',
                }}
              />
            </div>

            {/* Prize amount + label */}
            <div className="text-center sm:text-left">
              <h2
                className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(90deg, #D4AF7A 0%, #F5E6C8 30%, #D4AF7A 50%, #B8965A 70%, #D4AF7A 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'prize-shimmer 4s linear infinite',
                }}
              >
                {site.prizePoolDisplay}+
              </h2>
              <p
                className="font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-1.5"
                style={{ color: 'rgba(212,175,122,0.45)' }}
              >
                Total Prize Pool
              </p>
            </div>
          </div>
        </div>

        {/* ─── Dynamic Quote (Silver Bright) ─── */}
        <div className="relative px-6 sm:px-10 py-5 text-center">
          <div className="max-w-2xl mx-auto min-h-[4rem] flex items-center justify-center">
            <p
              className="font-serif text-base sm:text-lg md:text-xl italic leading-relaxed"
              style={{
                background: 'linear-gradient(90deg, #B8C4D4 0%, #E8EDF4 25%, #FFFFFF 50%, #E8EDF4 75%, #B8C4D4 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'prize-shimmer 6s linear infinite',
                filter: 'drop-shadow(0 0 12px rgba(200, 215, 235, 0.25))',
                opacity: quoteVisible ? 1 : 0,
                transform: quoteVisible ? 'translateY(0)' : 'translateY(-8px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}
            >
              {QUOTES[quoteIndex]}
            </p>
          </div>
          {/* Divider */}
          <div
            className="mt-5 mx-auto"
            style={{
              width: '80px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(200,215,235,0.3), transparent)',
            }}
          />
        </div>

        {/* ─── 4×2 Event Grid ─── */}
        <div className="px-4 sm:px-6 md:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {events.map((event, index) => {
              // @ts-expect-error dynamic icon lookup
              const Icon = LucideIcons[event.icon] || LucideIcons.HelpCircle;

              return (
                <div
                  key={event.id}
                  className="register-grid-card group relative rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${event.colorHex}15`,
                    boxShadow: `0 2px 12px rgba(0,0,0,0.2)`,
                    animationDelay: `${index * 0.15}s`,
                    // CSS custom properties for the accent color
                    ['--card-accent' as string]: event.colorHex,
                  }}
                >
                  {/* Hover glow border effect */}
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      boxShadow: `inset 0 0 0 1px ${event.colorHex}50, 0 0 30px ${event.colorHex}15, 0 0 60px ${event.colorHex}08`,
                    }}
                  />

                  {/* Top edge glow line */}
                  <div
                    className="absolute top-0 left-[15%] right-[15%] h-[1px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${event.colorHex}80, transparent)`,
                    }}
                  />

                  {/* Event image */}
                  <div className="relative h-28 sm:h-32 overflow-hidden">
                    <Image
                      src={`/images/events/${event.slug}.jpg`}
                      alt={event.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, rgba(10,10,14,0.95) 0%, rgba(10,10,14,0.3) 50%, transparent 100%)`,
                      }}
                    />
                    {/* Accent color tint on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, ${event.colorHex}20, transparent)`,
                      }}
                    />
                    {/* Badge */}
                    <div
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: 'rgba(5,5,6,0.6)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${event.colorHex}30`,
                      }}
                    >
                      <Icon
                        className="w-3.5 h-3.5 transition-all duration-300"
                        style={{
                          color: event.colorHex,
                        }}
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="p-3 sm:p-4">
                    <h4
                      className="font-serif text-sm sm:text-base font-bold mb-1 line-clamp-1 transition-colors duration-300 group-hover:text-white"
                      style={{ color: 'rgba(245,243,238,0.85)' }}
                    >
                      {event.title}
                    </h4>
                    <p
                      className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase mb-3 line-clamp-1 transition-colors duration-300"
                      style={{ color: `${event.colorHex}80` }}
                    >
                      {event.tags.slice(0, 3).join(' · ')}
                    </p>

                    {/* Register button */}
                    <a
                      href={event.exploreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-interact flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-all duration-300"
                      style={{
                        background: `${event.colorHex}12`,
                        color: event.colorHex,
                        border: `1px solid ${event.colorHex}25`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = event.colorHex;
                        e.currentTarget.style.color = '#050506';
                        e.currentTarget.style.boxShadow = `0 4px 16px ${event.colorHex}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${event.colorHex}12`;
                        e.currentTarget.style.color = event.colorHex;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Register
                      <LucideIcons.ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Footer text ─── */}
        <div className="px-6 pb-8 pt-2 text-center">
          <p
            className="text-xs font-mono tracking-wider"
            style={{ color: 'rgba(245,243,238,0.25)' }}
          >
            Click on any event to know more and register
          </p>
        </div>
      </div>
    </div>
  );
}
