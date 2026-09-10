'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ParticleFieldProps {
  count?: number;
  color?: string;
  opacity?: number;
  className?: string;
  interactive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  alphaDir: number;
}

export default function ParticleField({
  count = 80,
  color = '#D4AF7A',
  opacity = 0.6,
  className = '',
  interactive = true,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef<number>(0);
  const dimsRef = useRef({ w: 0, h: 0 }); // cached dimensions

  const initParticles = useCallback((width: number, height: number, particleCount: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x, y, ox: x, oy: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.1,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        alphaDir: (Math.random() - 0.5) * 0.008,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const actualCount = isMobile ? Math.min(count, 25) : Math.min(count, 60);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current = { w: rect.width, h: rect.height };
      particlesRef.current = initParticles(rect.width, rect.height, actualCount);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    if (interactive && !isMobile) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const rBright = Math.min(r + 60, 255);
    const gBright = Math.min(g + 60, 255);
    const bBright = Math.min(b + 30, 255);

    let frameSkip = 0;

    const animate = () => {
      const { w: width, h: height } = dimsRef.current;
      if (width === 0) { animFrameRef.current = requestAnimationFrame(animate); return; }

      // Throttle to ~30fps for performance
      frameSkip++;
      if (frameSkip % 2 !== 0) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        // Cursor interaction
        if (interactive && mx > 0) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < 22500) { // 150^2
            const dist = Math.sqrt(distSq);
            if (dist > 0.1) {
              const force = (1 - dist / 150) * 0.8;
              p.vx += (dx / dist) * force;
              p.vy += (dy / dist) * force;
            }
          }
        }

        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vx += (p.ox - p.x) * 0.001;
        p.vy += (p.oy - p.y) * 0.001;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;
        if (p.alpha <= 0.05 || p.alpha >= 0.7) p.alphaDir *= -1;

        // Wrap
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const a = p.alpha * opacity;

        // Outer glow - simple filled circle (NO radial gradient)
        ctx.globalAlpha = a * 0.25;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core bright dot
        ctx.globalAlpha = a;
        ctx.fillStyle = `rgb(${rBright}, ${gBright}, ${bBright})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Connections - batched single path
      if (!isMobile && particlesRef.current.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.04 * opacity})`;
        ctx.lineWidth = 0.5;
        const particles = particlesRef.current;
        const len = particles.length;
        for (let i = 0; i < len; i++) {
          const a = particles[i];
          for (let j = i + 1; j < len; j++) {
            const b2 = particles[j];
            const dx = a.x - b2.x;
            const dy = a.y - b2.y;
            if (dx * dx + dy * dy < 5625) { // 75^2
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b2.x, b2.y);
            }
          }
        }
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
      if (interactive) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [count, color, opacity, interactive, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
