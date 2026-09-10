'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { content } from '@/lib/content';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface NavbarProps {
  onRegisterClick?: () => void;
}

export default function Navbar({ onRegisterClick }: NavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { site } = content;

  useEffect(() => {
    // Show navbar after hero first beat (5% scroll)
    const showTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top -5%',
      onEnter: () => setIsVisible(true),
      onLeaveBack: () => setIsVisible(false),
    });

    // Solidify navbar after hero section
    const solidifyTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top -30%',
      onEnter: () => setIsScrolled(true),
      onLeaveBack: () => setIsScrolled(false),
    });

    return () => {
      showTrigger.kill();
      solidifyTrigger.kill();
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-full'
      } ${
        isScrolled
          ? 'glass-panel-strong shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="cursor-interact group flex items-center gap-2">
          <span
            className="font-serif text-xl sm:text-2xl tracking-tight"
            style={{ color: '#D4AF7A' }}
          >
            XXV
          </span>
          <span className="hidden sm:block text-sm font-light text-[var(--color-foreground)] opacity-60 group-hover:opacity-100 transition-opacity">
            TechFest
          </span>
        </a>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8">
          {['Events', 'Legacy', 'Register'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="cursor-interact text-sm tracking-wider uppercase text-[var(--color-foreground)] opacity-60 hover:opacity-100 transition-opacity"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA — opens RegisterModal */}
        <button
          onClick={onRegisterClick}
          className="cursor-interact group inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 border"
          style={{
            borderColor: '#D4AF7A',
            color: '#D4AF7A',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#D4AF7A';
            e.currentTarget.style.color = '#050506';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#D4AF7A';
          }}
        >
          {site.registerCtaLabel}
          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </nav>
  );
}

