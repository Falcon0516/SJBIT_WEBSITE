'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { content } from '@/lib/content';
import * as LucideIcons from 'lucide-react';
import ParticleField from '@/components/ui/ParticleField';
import EventSimulation from '@/components/ui/EventSimulation';

gsap.registerPlugin(ScrollTrigger);

export default function EventsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      // Section heading reveal
      gsap.fromTo(
        '[data-events-heading]',
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: '[data-events-heading]', start: 'top 85%' },
        }
      );

      // Carousel rotation on scroll
      if (carouselRef.current) {
        gsap.to(carouselRef.current, {
          rotateY: -360,
          ease: 'none',
          scrollTrigger: {
            trigger: carouselRef.current,
            start: 'top 60%',
            end: 'bottom 40%',
            scrub: 1,
          },
        });
      }

      // Individual event showcases
      const showcases = document.querySelectorAll('[data-event-showcase]');
      showcases.forEach((el) => {
        const img = el.querySelector('[data-event-img]');
        const content = el.querySelector('[data-event-content]');

        if (img) {
          gsap.fromTo(img,
            { opacity: 0, scale: 1.1, x: -30 },
            {
              opacity: 1, scale: 1, x: 0,
              duration: 1, ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 75%' },
            }
          );
        }
        if (content) {
          gsap.fromTo(content,
            { opacity: 0, y: 40 },
            {
              opacity: 1, y: 0,
              duration: 0.8, delay: 0.2, ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 75%' },
            }
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const { events } = content;

  return (
    <section ref={sectionRef} id="events" className="relative">
      {/* ─── Section Header ─── */}
      <div className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 text-center">
        <div data-events-heading>
          <p
            className="font-mono text-xs tracking-[0.3em] uppercase mb-3 sm:mb-4"
            style={{ color: 'rgba(212,175,122,0.6)' }}
          >
            Explore Events
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4" style={{ color: '#F5F3EE' }}>
            8 Flagship Events
          </h2>
          <p className="text-sm sm:text-base md:text-lg max-w-xl mx-auto px-2" style={{ color: 'rgba(245,243,238,0.4)' }}>
            Compete, learn, and showcase your skills across eight curated challenges.
          </p>
        </div>
      </div>

      {/* ─── 3D Carousel Preview ─── */}
      <div className="carousel-3d-wrapper relative py-12 sm:py-20 overflow-hidden">
        <div
          ref={carouselRef}
          className="relative mx-auto"
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
            transformStyle: 'preserve-3d',
          }}
        >
          {events.map((event, i) => {
            const angle = (360 / events.length) * i;
            // @ts-expect-error dynamic icon lookup
            const Icon = LucideIcons[event.icon] || LucideIcons.HelpCircle;

            return (
              <a
                key={event.id}
                href={`#event-${event.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(`event-${event.slug}`);
                  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="cursor-interact absolute inset-0 flex flex-col items-center justify-center rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(var(--card-r))`,
                  backfaceVisibility: 'hidden',
                  background: 'rgba(10,10,14,0.9)',
                  border: `1px solid ${event.colorHex}25`,
                  boxShadow: `0 0 30px ${event.colorHex}10`,
                }}
              >
                <div className="relative w-full h-24 sm:h-28 md:h-40 overflow-hidden">
                  <Image
                    src={`/images/events/${event.slug}.jpg`}
                    alt={event.title}
                    fill
                    sizes="(max-width: 640px) 140px, (max-width: 768px) 180px, 240px"
                    className="object-cover"
                    style={{ opacity: 0.6 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] to-transparent" />
                </div>
                <div className="p-3 sm:p-4 md:p-5 text-center flex flex-col items-center justify-center flex-1 w-full">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-auto mb-1.5 md:mb-3" style={{ color: event.colorHex }} strokeWidth={1.5} />
                  <h4 className="font-serif text-xs sm:text-base md:text-lg font-bold mb-0.5 sm:mb-1 line-clamp-1" style={{ color: '#F5F3EE' }}>
                    {event.title}
                  </h4>
                  <p className="text-[9px] sm:text-[11px] md:text-xs font-mono tracking-wider uppercase line-clamp-1" style={{ color: `${event.colorHex}90` }}>
                    {event.tags.slice(0, 2).join(' · ')}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ─── Carousel Helper Text ─── */}
      <p
        className="relative z-10 text-center font-mono text-[11px] sm:text-xs tracking-wider mt-6 sm:mt-8 mb-8 sm:mb-12 px-4"
        style={{ color: 'rgba(212,175,122,0.4)' }}
      >
        Click on any card to know more about the event
      </p>

      {/* ─── Individual Event Showcases ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        {events.map((event, i) => {
          // @ts-expect-error dynamic icon lookup
          const Icon = LucideIcons[event.icon] || LucideIcons.HelpCircle;
          const isEven = i % 2 === 0;

          return (
            <div
              key={event.id}
              id={`event-${event.slug}`}
              data-event-showcase
              className="relative py-12 sm:py-16 md:py-24 overflow-hidden bg-[#050506]"
              style={{
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              {/* Themed background simulation */}
              <EventSimulation slug={event.slug} color={event.colorHex} />
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center ${isEven ? '' : 'md:[direction:rtl]'}`}>
                {/* Image */}
                <div
                  data-event-img
                  className="relative rounded-2xl overflow-hidden group cursor-interact"
                  style={{ direction: 'ltr' }}
                >
                  <div className="relative aspect-video">
                    <Image
                      src={`/images/events/${event.slug}.jpg`}
                      alt={event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Color overlay on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, ${event.colorHex}15, transparent)`,
                      }}
                    />
                    {/* Bottom gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent" />
                  </div>

                  {/* Floating badge */}
                  <div
                    className="absolute top-3 left-3 sm:top-4 sm:left-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-2"
                    style={{
                      background: 'rgba(5,5,6,0.7)',
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${event.colorHex}30`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: event.colorHex }} strokeWidth={1.5} />
                    <span className="text-[11px] sm:text-xs font-mono font-semibold" style={{ color: event.colorHex }}>
                      {event.id}
                    </span>
                  </div>

                  {/* Animated border glow */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      boxShadow: `inset 0 0 0 1px ${event.colorHex}30, 0 0 40px ${event.colorHex}10`,
                    }}
                  />
                </div>

                {/* Content */}
                <div data-event-content style={{ direction: 'ltr' }}>
                  {/* Tags row */}
                  <div className="flex flex-wrap gap-2 mb-4 sm:mb-5">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 sm:px-3 py-1 text-[10px] font-mono font-semibold tracking-[0.15em] uppercase rounded-full"
                        style={{
                          background: `${event.colorHex}0C`,
                          color: `${event.colorHex}BB`,
                          border: `1px solid ${event.colorHex}20`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ color: '#F5F3EE' }}>
                    {event.title}
                  </h3>

                  <p
                    className="text-sm sm:text-base leading-relaxed mb-6 sm:mb-8"
                    style={{ color: 'rgba(245,243,238,0.5)' }}
                  >
                    {event.description}
                  </p>

                  {/* CTA */}
                  <a
                    href={event.exploreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-interact group/btn inline-flex items-center justify-center w-full sm:w-auto gap-3 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden relative"
                    style={{
                      background: 'transparent',
                      color: event.colorHex,
                      border: `1px solid ${event.colorHex}40`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = event.colorHex;
                      e.currentTarget.style.color = '#050506';
                      e.currentTarget.style.boxShadow = `0 0 30px ${event.colorHex}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = event.colorHex;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Explore Event
                    <LucideIcons.ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
