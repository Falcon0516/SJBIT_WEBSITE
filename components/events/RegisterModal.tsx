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
  const modalRef = useRef<HTMLDivElement>(null);
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
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

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          animation: 'modal-scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          background: 'rgba(10, 10, 14, 0.95)',
          border: '1px solid rgba(212, 175, 122, 0.15)',
          boxShadow: '0 0 80px rgba(212, 175, 122, 0.08), 0 40px 120px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="cursor-interact absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(245,243,238,0.6)',
          }}
          aria-label="Close registration modal"
        >
          <LucideIcons.X className="w-5 h-5" />
        </button>

        {/* ─── Trophy + Prize Pool Section ─── */}
        <div className="relative pt-10 pb-6 px-6 text-center overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(212,175,122,0.12) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Trophy icon */}
          <div
            className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,122,0.15), rgba(212,175,122,0.05))',
              border: '1px solid rgba(212,175,122,0.25)',
              animation: 'trophy-glow 3s ease-in-out infinite',
            }}
          >
            <LucideIcons.Trophy
              className="w-10 h-10"
              strokeWidth={1.5}
              style={{ color: '#D4AF7A' }}
            />
          </div>

          {/* Prize amount */}
          <div className="relative">
            <h2
              className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
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
              className="font-mono text-xs tracking-[0.3em] uppercase mt-2"
              style={{ color: 'rgba(212,175,122,0.5)' }}
            >
              Total Prize Pool
            </p>
          </div>
        </div>

        {/* ─── Dynamic Quote ─── */}
        <div className="relative px-6 py-4 text-center">
          <div className="max-w-lg mx-auto min-h-[3rem] flex items-center justify-center">
            <p
              className="font-serif text-sm sm:text-base italic transition-all duration-400"
              style={{
                color: 'rgba(245,243,238,0.35)',
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
            className="mt-4 mx-auto"
            style={{
              width: '60px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(212,175,122,0.3), transparent)',
            }}
          />
        </div>

        {/* ─── 4×2 Event Grid ─── */}
        <div className="px-4 sm:px-6 md:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {events.map((event) => {
              // @ts-expect-error dynamic icon lookup
              const Icon = LucideIcons[event.icon] || LucideIcons.HelpCircle;

              return (
                <div
                  key={event.id}
                  className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${event.colorHex}15`,
                    boxShadow: `0 2px 12px rgba(0,0,0,0.2)`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${event.colorHex}40`;
                    e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${event.colorHex}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${event.colorHex}15`;
                    e.currentTarget.style.boxShadow = `0 2px 12px rgba(0,0,0,0.2)`;
                  }}
                >
                  {/* Event image */}
                  <div className="relative h-28 sm:h-32 overflow-hidden">
                    <Image
                      src={`/images/events/${event.slug}.jpg`}
                      alt={event.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
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
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                      style={{
                        background: `linear-gradient(135deg, ${event.colorHex}15, transparent)`,
                      }}
                    />
                    {/* Badge */}
                    <div
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: 'rgba(5,5,6,0.6)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${event.colorHex}30`,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: event.colorHex }} strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="p-3 sm:p-4">
                    <h4
                      className="font-serif text-sm sm:text-base font-bold mb-1 line-clamp-1"
                      style={{ color: '#F5F3EE' }}
                    >
                      {event.title}
                    </h4>
                    <p
                      className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase mb-3 line-clamp-1"
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
