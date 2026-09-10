'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { content } from '@/lib/content';
import ParticleField from '@/components/ui/ParticleField';

import { Trophy, GraduationCap, Rocket } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);


const stats = [
  { value: 25, suffix: '', label: 'Years of Excellence' },
  { value: 8, suffix: '', label: 'Flagship Events' },
  { value: 4, suffix: 'L+', label: 'Prize Pool (₹)' },
  { value: 500, suffix: '+', label: 'Participants Expected' },
];

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { site } = content;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      // Animate each stat number counting up
      const counters = sectionRef.current?.querySelectorAll('[data-stat-value]');
      counters?.forEach((el) => {
        const target = parseInt(el.getAttribute('data-stat-value') || '0');
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          onUpdate: () => {
            (el as HTMLElement).textContent = Math.floor(obj.val).toString();
          },
        });
      });

      // Pillar reveals
      const pillars = sectionRef.current?.querySelectorAll('[data-pillar]');
      pillars?.forEach((el, i) => {
        gsap.fromTo(el,
          { opacity: 0, y: 30, scale: 0.95 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.8,
            delay: i * 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-16 sm:py-24 md:py-36 px-4 sm:px-6 overflow-hidden"
    >
      {/* Ambient */}
      <div className="ambient-blob ambient-blob-gold w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] top-0 left-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 mb-12 sm:mb-20 md:mb-24">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-2">
              <div className="flex items-baseline justify-center gap-1">
                <span
                  data-stat-value={stat.value}
                  className="font-mono text-3xl sm:text-5xl md:text-6xl font-bold tabular-nums"
                  style={{ color: '#D4AF7A' }}
                >
                  0
                </span>
                {stat.suffix && (
                  <span className="font-mono text-lg sm:text-2xl md:text-3xl" style={{ color: '#D4AF7A', opacity: 0.7 }}>
                    {stat.suffix}
                  </span>
                )}
              </div>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-mono tracking-wider uppercase" style={{ color: 'rgba(245,243,238,0.4)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          className="w-full h-px mb-12 sm:mb-20 md:mb-24"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,122,0.2), transparent)' }}
        />

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {site.pillars.map((pillar, i) => {
            const descriptions = [
              'Compete in 8 flagship events and take home prizes worth ₹4,00,000.',
              'Workshops, mentorship, and hands-on experience with cutting-edge tech.',
              'Present your innovations to industry leaders and top academics.',
            ];
            const IconComponents = [Trophy, GraduationCap, Rocket];
            const IconComp = IconComponents[i];
            return (
              <div
                key={pillar}
                data-pillar
                className="group relative rounded-2xl p-6 sm:p-8 overflow-hidden cursor-interact"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Animated gradient border on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,175,122,0.1), transparent, rgba(212,175,122,0.05))',
                  }}
                />

                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-lg"
                    style={{
                      background: 'rgba(212,175,122,0.08)',
                      border: '1px solid rgba(212,175,122,0.15)',
                    }}
                  >
                    <IconComp className="w-6 h-6" style={{ color: '#D4AF7A' }} strokeWidth={1.5} />
                  </div>
                  <h3
                    className="font-mono text-base sm:text-lg tracking-[0.2em] font-bold mb-3"
                    style={{ color: '#D4AF7A' }}
                  >
                    {pillar}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,243,238,0.5)' }}>
                    {descriptions[i]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
