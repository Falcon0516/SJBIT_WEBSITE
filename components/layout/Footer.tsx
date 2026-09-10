import { content } from '@/lib/content';
import { ArrowRight } from 'lucide-react';

export default function Footer() {
  const { site } = content;

  return (
    <footer
      className="relative py-16 px-6 overflow-hidden"
      style={{
        background: '#050506',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Ambient glow from Legacy section above */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,175,122,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Minimal tagline restatement */}
        <p
          className="font-mono text-xs tracking-[0.2em] uppercase mb-8"
          style={{ color: 'rgba(212,175,122,0.5)' }}
        >
          {site.prizePoolLabel} · {site.prizePoolDisplay}
        </p>

        {/* Social links */}
        <div className="flex gap-8 mb-10" style={{ color: 'rgba(245,243,238,0.3)' }}>
          {/* TODO: add real social links */}
          <a
            href="#"
            className="cursor-interact text-sm font-mono tracking-wider uppercase hover:text-[var(--color-foreground)] transition-colors duration-300"
          >
            Instagram
          </a>
          <a
            href="#"
            className="cursor-interact text-sm font-mono tracking-wider uppercase hover:text-[var(--color-foreground)] transition-colors duration-300"
          >
            LinkedIn
          </a>
          <a
            href="#"
            className="cursor-interact text-sm font-mono tracking-wider uppercase hover:text-[var(--color-foreground)] transition-colors duration-300"
          >
            X
          </a>
        </div>

        {/* Divider */}
        <div
          className="w-16 h-px mb-8"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,122,0.3), transparent)' }}
        />

        <p className="text-xs" style={{ color: 'rgba(245,243,238,0.2)' }}>
          © {new Date().getFullYear()} {site.campusName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
