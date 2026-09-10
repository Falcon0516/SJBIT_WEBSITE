'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { content } from '@/lib/content';
import { Menu, X } from 'lucide-react';
import { ArrowRight } from '@/lib/event-icons';

gsap.registerPlugin(ScrollTrigger);

interface NavbarProps {
  onRegisterClick?: () => void;
}

export default function Navbar({ onRegisterClick }: NavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const lenisStopEvent = new CustomEvent('lenis-stop');
      window.dispatchEvent(lenisStopEvent);
    } else {
      document.body.style.overflow = '';
      const lenisStartEvent = new CustomEvent('lenis-start');
      window.dispatchEvent(lenisStartEvent);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-full'
        } ${
          isScrolled || isMobileMenuOpen
            ? 'glass-panel-strong shadow-lg shadow-black/20 bg-[#0A0A0E]/95'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="cursor-interact group flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
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

          {/* Center Links (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {['Events', 'Legacy'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="cursor-interact text-sm tracking-wider uppercase text-[var(--color-foreground)] opacity-60 hover:opacity-100 transition-opacity"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/* CTA — opens RegisterModal */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onRegisterClick) onRegisterClick();
              }}
              className="cursor-interact group inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 border"
              style={{
                borderColor: '#D4AF7A',
                color: '#D4AF7A',
                touchAction: 'manipulation',
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

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-[#D4AF7A] cursor-interact"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[90] bg-[#050506] transition-all duration-500 ease-in-out md:hidden flex flex-col justify-center items-center ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center gap-8 p-6 w-full max-w-sm">
          {['Events', 'Legacy'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="cursor-interact text-2xl font-serif tracking-wider uppercase text-[var(--color-foreground)] opacity-80 hover:opacity-100 hover:text-[#D4AF7A] transition-all"
            >
              {label}
            </a>
          ))}
          <div className="w-full h-px bg-white/10 my-4" />
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (onRegisterClick) onRegisterClick();
            }}
            className="cursor-interact w-full py-4 rounded-full text-lg font-medium transition-all duration-300"
            style={{
              background: '#D4AF7A',
              color: '#050506',
            }}
          >
            {site.registerCtaLabel}
          </button>
        </div>
      </div>
    </>
  );
}
