'use client';

import { useRef, useState, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { EventItem, getEventTheme } from '@/lib/content';

interface EventCardProps {
  event: EventItem;
  index: number;
}

export default function EventCard({ event, index }: EventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  // @ts-expect-error - indexing lucide icons dynamically
  const IconComponent = LucideIcons[event.icon] || LucideIcons.HelpCircle;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    setTilt({
      x: ((y - cy) / cy) * -6,
      y: ((x - cx) / cx) * 6,
    });
    setSpotlightPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });

    // Distance from center for glow
    const dist = Math.sqrt(Math.pow((x - cx) / cx, 2) + Math.pow((y - cy) / cy, 2));
    setGlowIntensity(Math.max(0, 1 - dist));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
    setGlowIntensity(0);
  }, []);

  return (
    <div
      ref={cardRef}
      data-event-card
      className="opacity-0"
      style={{
        ...getEventTheme(event),
        perspective: '1200px',
      } as React.CSSProperties}
    >
      <div
        className="group relative flex flex-col rounded-2xl h-full cursor-interact overflow-hidden"
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
            : 'rotateX(0) rotateY(0) scale(1)',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out, box-shadow 0.4s ease-out',
          boxShadow: isHovered
            ? `0 30px 80px rgba(0,0,0,0.4), 0 0 40px ${event.colorHex}15, inset 0 1px 0 rgba(255,255,255,0.06)`
            : `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Animated gradient border */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            padding: '1px',
            background: isHovered
              ? `linear-gradient(135deg, ${event.colorHex}40, transparent 40%, transparent 60%, ${event.colorHex}25)`
              : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            transition: 'background 0.5s ease',
          }}
        />

        {/* Inner bg */}
        <div
          className="absolute inset-[1px] rounded-2xl"
          style={{
            background: 'rgba(10, 10, 14, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        />

        {/* Cursor-tracked spotlight */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-200"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(500px circle at ${spotlightPos.x}% ${spotlightPos.y}%, ${event.colorHex}12, transparent 50%)`,
          }}
        />

        {/* Top edge glow */}
        <div
          className="absolute top-0 left-[10%] right-[10%] h-px pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `linear-gradient(90deg, transparent, ${event.colorHex}60, transparent)`,
          }}
        />

        {/* Ghost index */}
        <span
          className="absolute -top-6 -right-4 font-mono text-[10rem] leading-none font-black pointer-events-none select-none transition-opacity duration-500"
          style={{
            color: isHovered ? `${event.colorHex}0A` : `${event.colorHex}05`,
            transform: 'translateZ(-20px)',
          }}
        >
          {event.id}
        </span>

        {/* Content with depth layers */}
        <div className="relative z-10 flex flex-col h-full p-8" style={{ transform: 'translateZ(20px)' }}>
          {/* Icon + Index row */}
          <div className="flex items-start justify-between mb-8">
            <div
              className="relative flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-500"
              style={{
                background: `${event.colorHex}12`,
                boxShadow: isHovered
                  ? `0 0 30px ${event.colorHex}25, inset 0 0 20px ${event.colorHex}08`
                  : 'none',
              }}
            >
              {/* Rotating ring on hover */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500"
                style={{
                  opacity: isHovered ? 1 : 0,
                  border: `1px solid ${event.colorHex}30`,
                  animation: isHovered ? 'spin 8s linear infinite' : 'none',
                }}
              />
              <IconComponent
                className="w-7 h-7 transition-all duration-300"
                strokeWidth={1.5}
                style={{
                  color: event.colorHex,
                  filter: isHovered ? `drop-shadow(0 0 8px ${event.colorHex}60)` : 'none',
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            </div>
            <span
              className="font-mono text-2xl font-light tabular-nums tracking-tighter transition-all duration-300"
              style={{
                color: event.colorHex,
                opacity: isHovered ? 0.7 : 0.3,
                transform: isHovered ? 'translateY(-2px)' : 'none',
              }}
            >
              {event.id}
            </span>
          </div>

          {/* Title */}
          <h3
            className="font-serif text-2xl font-bold mb-3 transition-colors duration-300"
            style={{ color: isHovered ? '#F5F3EE' : 'rgba(245,243,238,0.9)' }}
          >
            {event.title}
          </h3>

          {/* Description */}
          <p
            className="text-sm leading-relaxed mb-8 flex-grow transition-colors duration-300"
            style={{ color: isHovered ? 'rgba(245,243,238,0.65)' : 'rgba(245,243,238,0.4)' }}
          >
            {event.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {event.tags.map((tag, i) => (
              <span
                key={tag}
                className="px-3 py-1 text-[10px] font-mono font-semibold tracking-[0.15em] uppercase rounded-full transition-all duration-300"
                style={{
                  background: isHovered ? `${event.colorHex}18` : `${event.colorHex}0A`,
                  color: event.colorHex,
                  border: `1px solid ${isHovered ? `${event.colorHex}30` : `${event.colorHex}15`}`,
                  transitionDelay: `${i * 50}ms`,
                  transform: isHovered ? 'translateY(-1px)' : 'none',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA Button */}
          <a
            href={event.exploreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-400 cursor-interact overflow-hidden relative group/btn"
            style={{
              background: isHovered ? event.colorHex : 'transparent',
              color: isHovered ? '#050506' : event.colorHex,
              border: `1px solid ${event.colorHex}40`,
              boxShadow: isHovered ? `0 4px 20px ${event.colorHex}30` : 'none',
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity"
              style={{
                background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)`,
                animation: isHovered ? 'shimmer 2s infinite' : 'none',
              }}
            />
            <span className="relative z-10 flex items-center gap-2">
              Explore Now
              <LucideIcons.ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
