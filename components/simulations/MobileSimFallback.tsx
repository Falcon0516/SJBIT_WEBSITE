'use client';

/**
 * Lightweight CSS-only animated backgrounds for event cards on mobile.
 * Replaces heavy canvas simulations that don't render on mobile,
 * giving each event card a unique animated visual identity.
 *
 * Zero JavaScript animation loops — all animations are CSS @keyframes
 * running on the GPU compositor thread via transform/opacity.
 */

interface MobileSimFallbackProps {
  slug: string;
  color: string;
  className?: string;
}

// Each event gets a unique CSS pattern
const patterns: Record<string, (color: string) => React.CSSProperties> = {
  'ai-prompt-battle': (color) => ({
    background: `
      radial-gradient(ellipse 80% 60% at 20% 50%, ${color}12 0%, transparent 70%),
      radial-gradient(ellipse 60% 80% at 80% 30%, ${color}10 0%, transparent 70%),
      radial-gradient(ellipse 50% 50% at 50% 80%, ${color}08 0%, transparent 60%)
    `,
    animation: 'sim-pulse 6s ease-in-out infinite',
  }),
  'code-relay': (color) => ({
    background: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 20px,
        ${color}06 20px,
        ${color}06 21px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 40px,
        ${color}04 40px,
        ${color}04 41px
      )
    `,
    animation: 'sim-scroll 12s linear infinite',
    backgroundSize: '100% 200%',
  }),
  'hack-and-hunt': (color) => ({
    background: `
      radial-gradient(circle at 50% 50%, transparent 30%, ${color}08 31%, transparent 32%),
      radial-gradient(circle at 50% 50%, transparent 50%, ${color}06 51%, transparent 52%),
      radial-gradient(circle at 50% 50%, transparent 70%, ${color}04 71%, transparent 72%)
    `,
    animation: 'sim-ripple 4s ease-in-out infinite',
  }),
  'app-development-challenge': (color) => ({
    background: `
      linear-gradient(135deg, ${color}08 25%, transparent 25%),
      linear-gradient(225deg, ${color}06 25%, transparent 25%),
      linear-gradient(315deg, ${color}08 25%, transparent 25%),
      linear-gradient(45deg, ${color}06 25%, transparent 25%)
    `,
    backgroundSize: '40px 40px',
    backgroundPosition: '0 0, 0 20px, 20px -20px, 20px 0',
    animation: 'sim-float 8s ease-in-out infinite',
  }),
  'zerocrypt-ctf': (color) => ({
    background: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        ${color}05 2px,
        ${color}05 4px
      )
    `,
    backgroundSize: '100% 4px',
    animation: 'sim-scanline 3s linear infinite',
  }),
  'innovation-marathon': (color) => ({
    background: `conic-gradient(from 0deg at 50% 50%, ${color}10, transparent 60%, ${color}08, transparent)`,
    animation: 'sim-rotate 10s linear infinite',
  }),
  'green-tech-challenge': (color) => ({
    background: `
      radial-gradient(ellipse 100% 40% at 50% 0%, ${color}10 0%, transparent 70%),
      radial-gradient(ellipse 100% 40% at 50% 100%, ${color}08 0%, transparent 70%)
    `,
    animation: 'sim-wave 5s ease-in-out infinite',
  }),
  'roboinnovate': (color) => ({
    background: `
      linear-gradient(90deg, ${color}04 1px, transparent 1px),
      linear-gradient(0deg, ${color}04 1px, transparent 1px)
    `,
    backgroundSize: '30px 30px',
    animation: 'sim-grid-move 6s linear infinite',
  }),
};

export default function MobileSimFallback({ slug, color, className = '' }: MobileSimFallbackProps) {
  const getStyle = patterns[slug] || patterns['ai-prompt-battle'];
  const style = getStyle(color);

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
