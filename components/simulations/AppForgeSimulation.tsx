'use client';

import React, { useEffect, useRef } from 'react';

interface SimulationProps {
  color: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* ─── App Forge Simulation ───
   Phone wireframe (left) + Laptop with code editor (right)
   Data flow particles connect them — evoking app development.
*/

interface UIBlock {
  x: number; y: number; w: number; h: number;
  targetX: number; targetY: number;
  type: 'header' | 'card' | 'button' | 'image' | 'list' | 'nav';
  progress: number;
  delay: number;
  alpha: number;
}

interface CodeLine {
  y: number;
  width: number; // fraction of editor width
  indent: number;
  color: 'keyword' | 'string' | 'comment' | 'normal';
}

interface FlowParticle {
  t: number; // 0→1 along the curve
  speed: number;
  size: number;
}

interface CodeToken {
  x: number; y: number; text: string;
  speed: number; alpha: number; size: number;
}

export default function AppForgeSimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  const stateRef = useRef({
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    blocks: [] as UIBlock[],
    tokens: [] as CodeToken[],
    codeLines: [] as CodeLine[],
    flowParticles: [] as FlowParticle[],
    // Phone
    phoneX: 0, phoneY: 0, phoneW: 0, phoneH: 0,
    // Laptop
    laptopX: 0, laptopY: 0, laptopW: 0, laptopH: 0,
    laptopScreenX: 0, laptopScreenY: 0, laptopScreenW: 0, laptopScreenH: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const s = stateRef.current;
    s.rgb = hexToRgb(color);

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.width = rect.width;
      s.height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Phone — far left
      s.phoneW = Math.min(s.width * 0.1, 70);
      s.phoneH = s.phoneW * 2;
      s.phoneX = s.width * 0.08;
      s.phoneY = s.height / 2 - s.phoneH / 2;

      // Laptop — center-left (visible in content area, not behind event image)
      s.laptopW = Math.min(s.width * 0.3, 220);
      s.laptopH = s.laptopW * 0.65;
      s.laptopX = s.width * 0.32;
      s.laptopY = s.height / 2 - s.laptopH / 2;

      // Laptop screen (inset)
      const bezel = s.laptopW * 0.03;
      s.laptopScreenX = s.laptopX + bezel;
      s.laptopScreenY = s.laptopY + bezel;
      s.laptopScreenW = s.laptopW - bezel * 2;
      s.laptopScreenH = s.laptopH - bezel * 2 - s.laptopW * 0.06; // leave room for bottom bezel/keyboard hint

      initBlocks();
      initCodeLines();
      initFlowParticles();
      initTokens();
    };

    const initBlocks = () => {
      const { phoneX: px, phoneY: py, phoneW: pw, phoneH: ph } = s;
      const pad = pw * 0.08;
      const innerW = pw - pad * 2;

      s.blocks = [
        { x: 0, y: 0, w: innerW, h: ph * 0.06, targetX: px + pad, targetY: py + pad, type: 'header', progress: 0, delay: 0, alpha: 0 },
        { x: 0, y: 0, w: innerW, h: ph * 0.18, targetX: px + pad, targetY: py + pad + ph * 0.08, type: 'image', progress: 0, delay: 0.12, alpha: 0 },
        { x: 0, y: 0, w: innerW * 0.47, h: ph * 0.14, targetX: px + pad, targetY: py + pad + ph * 0.29, type: 'card', progress: 0, delay: 0.24, alpha: 0 },
        { x: 0, y: 0, w: innerW * 0.47, h: ph * 0.14, targetX: px + pad + innerW * 0.53, targetY: py + pad + ph * 0.29, type: 'card', progress: 0, delay: 0.3, alpha: 0 },
        { x: 0, y: 0, w: innerW, h: ph * 0.05, targetX: px + pad, targetY: py + pad + ph * 0.47, type: 'list', progress: 0, delay: 0.4, alpha: 0 },
        { x: 0, y: 0, w: innerW * 0.8, h: ph * 0.05, targetX: px + pad, targetY: py + pad + ph * 0.54, type: 'list', progress: 0, delay: 0.46, alpha: 0 },
        { x: 0, y: 0, w: innerW * 0.6, h: ph * 0.06, targetX: px + pad + innerW * 0.2, targetY: py + pad + ph * 0.66, type: 'button', progress: 0, delay: 0.55, alpha: 0 },
        { x: 0, y: 0, w: innerW, h: ph * 0.07, targetX: px + pad, targetY: py + ph - pad - ph * 0.07, type: 'nav', progress: 0, delay: 0.62, alpha: 0 },
      ];

      for (const b of s.blocks) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 80;
        b.x = b.targetX + Math.cos(angle) * dist;
        b.y = b.targetY + Math.sin(angle) * dist;
      }
    };

    const initCodeLines = () => {
      s.codeLines = [];
      const lineCount = 22;
      const colors: CodeLine['color'][] = ['keyword', 'normal', 'string', 'comment', 'normal', 'keyword', 'normal', 'string', 'normal', 'normal'];
      for (let i = 0; i < lineCount; i++) {
        const indent = i === 0 || i === lineCount - 1 ? 0 : (i < 3 || i > lineCount - 3 ? 1 : (Math.random() > 0.5 ? 2 : 3));
        s.codeLines.push({
          y: i,
          width: 0.3 + Math.random() * 0.6,
          indent,
          color: colors[i % colors.length],
        });
      }
    };

    const initFlowParticles = () => {
      s.flowParticles = [];
      for (let i = 0; i < 6; i++) {
        s.flowParticles.push({
          t: Math.random(),
          speed: 0.003 + Math.random() * 0.004,
          size: 2 + Math.random() * 2,
        });
      }
    };

    const codeSnippets = [
      'const App', '() =>', 'return', '<View>', 'style={{',
      'useState', 'onPress', '<Button', 'import', 'export',
      'fetch()', 'render()', '<Text>', 'async',
    ];

    const initTokens = () => {
      s.tokens = [];
      const count = Math.min(Math.floor(s.width / 50), 14);
      for (let i = 0; i < count; i++) {
        s.tokens.push({
          x: Math.random() * s.width,
          y: Math.random() * s.height,
          text: codeSnippets[Math.floor(Math.random() * codeSnippets.length)],
          speed: 0.12 + Math.random() * 0.25,
          alpha: 0.03 + Math.random() * 0.06,
          size: 8 + Math.random() * 3,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const draw = () => {
      const { width: w, height: h, rgb: [r, g, b] } = s;
      ctx.clearRect(0, 0, w, h);
      s.time += 0.008;

      const cycleT = (s.time % 4) / 4;

      // ─── Floating code tokens ───
      for (const t of s.tokens) {
        t.y -= t.speed;
        if (t.y < -20) { t.y = h + 10; t.x = Math.random() * w; }
        ctx.font = `${t.size}px monospace`;
        ctx.fillStyle = `rgba(${r},${g},${b},${t.alpha})`;
        ctx.fillText(t.text, t.x, t.y);
      }

      // ─── LAPTOP ───
      const { laptopX: lx, laptopY: ly, laptopW: lw, laptopH: lh } = s;
      const { laptopScreenX: lsx, laptopScreenY: lsy, laptopScreenW: lsw, laptopScreenH: lsh } = s;
      const laptopR = lw * 0.02;

      // Laptop body
      ctx.beginPath();
      ctx.roundRect(lx, ly, lw, lh, laptopR);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Screen bg
      ctx.beginPath();
      ctx.roundRect(lsx, lsy, lsw, lsh, laptopR);
      ctx.fillStyle = `rgba(${r},${g},${b},0.04)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.15)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Keyboard base (bottom bar)
      const kbY = ly + lh;
      const kbH = lw * 0.04;
      ctx.beginPath();
      ctx.moveTo(lx - lw * 0.05, kbY + kbH);
      ctx.lineTo(lx + lw + lw * 0.05, kbY + kbH);
      ctx.lineTo(lx + lw, kbY);
      ctx.lineTo(lx, kbY);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.15)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Editor: gutter + code lines
      const gutterW = lsw * 0.1;
      const lineH = lsh / 24;
      const editorPad = lsw * 0.02;

      // Gutter bg
      ctx.fillStyle = `rgba(${r},${g},${b},0.03)`;
      ctx.fillRect(lsx, lsy, gutterW, lsh);

      // Code cursor blink
      const cursorLine = Math.floor((s.time * 3) % s.codeLines.length);
      const cursorBlink = Math.sin(s.time * 6) > 0;

      // Typing animation — lines appear progressively
      const typingProgress = cycleT < 0.75 ? cycleT / 0.75 : 1;
      const visibleLines = Math.floor(typingProgress * s.codeLines.length);

      for (let i = 0; i < Math.min(visibleLines, s.codeLines.length); i++) {
        const cl = s.codeLines[i];
        const ly2 = lsy + editorPad + i * lineH;

        // Line number
        ctx.font = `${Math.max(7, lineH * 0.6)}px monospace`;
        ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
        ctx.textAlign = 'right';
        ctx.fillText(String(i + 1), lsx + gutterW - 4, ly2 + lineH * 0.7);
        ctx.textAlign = 'left';

        // Code line colored block
        const indentPx = cl.indent * (lsw * 0.04);
        const lineW = cl.width * (lsw - gutterW - editorPad * 2 - indentPx);
        const lineX = lsx + gutterW + editorPad + indentPx;

        let lineAlpha = 0.25;
        if (cl.color === 'keyword') lineAlpha = 0.45;
        else if (cl.color === 'string') lineAlpha = 0.3;
        else if (cl.color === 'comment') lineAlpha = 0.12;

        // Highlight current cursor line
        if (i === cursorLine) {
          ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
          ctx.fillRect(lsx + gutterW, ly2, lsw - gutterW, lineH);
        }

        ctx.beginPath();
        ctx.roundRect(lineX, ly2 + lineH * 0.25, lineW, lineH * 0.45, 1.5);
        ctx.fillStyle = `rgba(${r},${g},${b},${lineAlpha})`;
        ctx.fill();

        // Cursor
        if (i === cursorLine && cursorBlink && i === visibleLines - 1) {
          ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
          ctx.fillRect(lineX + lineW + 2, ly2 + lineH * 0.15, 1.5, lineH * 0.65);
        }
      }

      // Tab bar at top of editor
      const tabH = lineH * 1.2;
      ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
      ctx.fillRect(lsx, lsy, lsw, tabH);
      // Active tab
      ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
      ctx.fillRect(lsx + 4, lsy + 2, lsw * 0.2, tabH - 2);
      // Tab text
      ctx.font = `${Math.max(7, tabH * 0.5)}px monospace`;
      ctx.fillStyle = `rgba(${r},${g},${b},0.4)`;
      ctx.fillText('App.tsx', lsx + 10, lsy + tabH * 0.65);

      // ─── PHONE ───
      const { phoneX: px, phoneY: py, phoneW: pw, phoneH: ph } = s;
      const cornerR = pw * 0.12;

      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, cornerR);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Notch
      const notchW = pw * 0.35;
      ctx.beginPath();
      ctx.roundRect(px + pw / 2 - notchW / 2, py, notchW, 5, [0, 0, 3, 3]);
      ctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
      ctx.fill();

      // UI blocks
      for (const block of s.blocks) {
        const blockCycleT = Math.max(0, Math.min(1, (cycleT - block.delay) / 0.25));
        if (cycleT < 0.8) {
          block.progress = ease(blockCycleT);
          block.alpha = block.progress;
        } else {
          const fadeT = (cycleT - 0.8) / 0.2;
          block.alpha = Math.max(0, 1 - fadeT);
          block.progress = 1;
        }

        if (cycleT < 0.02) {
          block.progress = 0;
          block.alpha = 0;
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 80;
          block.x = block.targetX + Math.cos(angle) * dist;
          block.y = block.targetY + Math.sin(angle) * dist;
        }

        const curX = block.x + (block.targetX - block.x) * block.progress;
        const curY = block.y + (block.targetY - block.y) * block.progress;

        if (block.alpha <= 0) continue;

        const rad = block.type === 'button' ? block.h / 2 : 2;
        ctx.beginPath();
        ctx.roundRect(curX, curY, block.w, block.h, rad);

        if (block.type === 'button') {
          ctx.fillStyle = `rgba(${r},${g},${b},${block.alpha * 0.55})`;
        } else if (block.type === 'image') {
          ctx.fillStyle = `rgba(${r},${g},${b},${block.alpha * 0.25})`;
        } else if (block.type === 'header' || block.type === 'nav') {
          ctx.fillStyle = `rgba(${r},${g},${b},${block.alpha * 0.35})`;
        } else {
          ctx.fillStyle = `rgba(${r},${g},${b},${block.alpha * 0.2})`;
        }
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${block.alpha * 0.4})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Nav dots
        if (block.type === 'nav' && block.alpha > 0.5) {
          const dotCount = 4;
          const spacing = block.w / (dotCount + 1);
          for (let i = 1; i <= dotCount; i++) {
            ctx.beginPath();
            ctx.arc(curX + spacing * i, curY + block.h / 2, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${block.alpha * (i === 1 ? 0.5 : 0.2)})`;
            ctx.fill();
          }
        }

        // Mountain icon for image
        if (block.type === 'image' && block.alpha > 0.5) {
          const sz = Math.min(block.w, block.h) * 0.25;
          const icx = curX + block.w / 2;
          const icy = curY + block.h / 2;
          ctx.beginPath();
          ctx.moveTo(icx - sz / 2, icy + sz / 3);
          ctx.lineTo(icx - sz / 6, icy - sz / 4);
          ctx.lineTo(icx + sz / 6, icy + sz / 6);
          ctx.lineTo(icx + sz / 3, icy - sz / 6);
          ctx.lineTo(icx + sz / 2, icy + sz / 3);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${b},${block.alpha * 0.25})`;
          ctx.fill();
        }
      }

      // ─── DATA FLOW: laptop → phone ───
      const flowStartX = lx;
      const flowStartY = ly + lh / 2;
      const flowEndX = px + pw;
      const flowEndY = py + ph / 2;
      const flowMidX = (flowStartX + flowEndX) / 2;
      const flowMidY = Math.min(flowStartY, flowEndY) - h * 0.12;

      // Draw flow path (subtle curve)
      ctx.beginPath();
      ctx.moveTo(flowStartX, flowStartY);
      ctx.quadraticCurveTo(flowMidX, flowMidY, flowEndX, flowEndY);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.08)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flow particles along the curve
      for (const p of s.flowParticles) {
        p.t += p.speed;
        if (p.t > 1) p.t -= 1;

        // Quadratic bezier point
        const t = p.t;
        const mt = 1 - t;
        const fx = mt * mt * flowStartX + 2 * mt * t * flowMidX + t * t * flowEndX;
        const fy = mt * mt * flowStartY + 2 * mt * t * flowMidY + t * t * flowEndY;

        const pAlpha = Math.sin(t * Math.PI) * 0.6; // fade at ends
        ctx.beginPath();
        ctx.arc(fx, fy, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${pAlpha})`;
        ctx.fill();

        // Trail
        ctx.beginPath();
        ctx.arc(fx, fy, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${pAlpha * 0.15})`;
        ctx.fill();
      }

      // ─── Glows ───
      // Phone glow
      const pcx = px + pw / 2;
      const pcy = py + ph / 2;
      const pg = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, ph * 0.5);
      pg.addColorStop(0, `rgba(${r},${g},${b},0.04)`);
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.fillRect(0, 0, w, h);

      // Laptop glow
      const lcx = lx + lw / 2;
      const lcy = ly + lh / 2;
      const lg = ctx.createRadialGradient(lcx, lcy, 0, lcx, lcy, lw * 0.5);
      lg.addColorStop(0, `rgba(${r},${g},${b},0.03)`);
      lg.addColorStop(1, 'transparent');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 1 }}
    />
  );
}
