'use client';

import React, { useEffect, useRef } from 'react';

interface SimulationProps {
  color: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const hexNorm = hex.replace('#', '');
  const r = parseInt(hexNorm.slice(0, 2), 16);
  const g = parseInt(hexNorm.slice(2, 4), 16);
  const b = parseInt(hexNorm.slice(4, 6), 16);
  return [r, g, b];
}

// 3D Parallax Code Rain + State Machine
const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%""\'\'#&_(),.;:?!\\|{}<>[]^~';
const KEYWORDS = ['const', 'let', 'var', 'function', 'class', 'import', 'export', 'if', 'else', 'return', 'async', 'await', '=>', 'new', 'this'];

interface CodeColumn {
  x: number;
  z: number; // Depth for parallax (0 is front, 1 is back)
  speed: number;
  chars: { y: number; char: string; isKeyword: boolean; highlight: number; opacity: number }[];
  active: boolean;
}

interface DataPacket {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  type: 'compile' | 'transfer' | 'error';
  trail: { x: number; y: number; alpha: number }[];
}

interface ServerNode {
  x: number;
  y: number;
  width: number;
  height: number;
  activity: number;
  pulse: number;
  lines: { progress: number; speed: number; color: string }[];
}

export default function MatrixRelaySimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const stateRef = useRef({
    columns: [] as CodeColumn[],
    packets: [] as DataPacket[],
    servers: [] as ServerNode[],
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    mouse: { x: -1000, y: -1000 }
  });

  useEffect(() => {
    const state = stateRef.current;
    state.rgb = hexToRgb(color);

    const initSimulation = () => {
      state.columns = [];
      const colWidth = 14;
      const numCols = Math.floor(state.width / colWidth);

      for (let i = 0; i < numCols; i++) {
        const z = Math.random(); // 0 to 1
        const speed = (0.5 + Math.random() * 1.5) * (1 - z * 0.5); // Slower in back
        
        const col: CodeColumn = {
          x: i * colWidth,
          z,
          speed,
          chars: [],
          active: Math.random() > 0.3
        };

        const numChars = 10 + Math.floor(Math.random() * 20);
        let currentY = Math.random() * state.height;

        for (let j = 0; j < numChars; j++) {
           const isKw = Math.random() > 0.8;
           const char = isKw ? KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)] : CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
           
           col.chars.push({
             y: currentY - j * 16,
             char,
             isKeyword: isKw,
             highlight: j === 0 ? 1 : 0, // Head of the column
             opacity: 1 - (j / numChars)
           });
        }
        state.columns.push(col);
      }

      // Initialize Servers (abstract representation)
      state.servers = [];
      for (let i = 0; i < 4; i++) {
        state.servers.push({
          x: state.width * 0.15 + (state.width * 0.7 * i / 3),
          y: state.height * 0.75,
          width: 60,
          height: 120,
          activity: 0,
          pulse: 0,
          lines: Array(5).fill(0).map(() => ({ progress: Math.random(), speed: 0.01 + Math.random() * 0.02, color: 'rgb' }))
        });
      }
    };

    const handleResize = () => {
      if (!canvasRef.current || !canvasRef.current.parentElement) return;
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      state.width = rect.width;
      state.height = rect.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      
      initSimulation();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
    };
    
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       canvasRef.current?.parentElement?.addEventListener('mousemove', handleMouseMove);
    }

    const update = () => {
      const { columns, packets, servers, width, height, mouse } = state;
      state.time += 0.016;

      // Update Columns
      for (const col of columns) {
         if (!col.active) {
            if (Math.random() < 0.001) col.active = true;
            continue;
         }

         // Mouse interaction (repel columns)
         const dx = col.x - mouse.x;
         const effect = Math.max(0, 100 - Math.abs(dx));
         const actualSpeed = col.speed + effect * 0.05;

         for (let i = 0; i < col.chars.length; i++) {
            const ch = col.chars[i];
            ch.y += actualSpeed;

            // Occasional character glitch
            if (Math.random() < 0.01 && !ch.isKeyword) {
               ch.char = CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
            }
         }

         // Wrap column
         if (col.chars[col.chars.length - 1].y > height + 100) {
            let startY = -100;
            for (let i = 0; i < col.chars.length; i++) {
               col.chars[i].y = startY - i * 16;
               const isKw = Math.random() > 0.8;
               col.chars[i].char = isKw ? KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)] : CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
               col.chars[i].isKeyword = isKw;
            }
            if (Math.random() > 0.8) col.active = false;
         }
      }

      // Generate Packets between servers
      if (Math.random() < 0.02) {
         const srcIdx = Math.floor(Math.random() * servers.length);
         let tgtIdx = Math.floor(Math.random() * servers.length);
         while (tgtIdx === srcIdx) tgtIdx = Math.floor(Math.random() * servers.length);
         
         const src = servers[srcIdx];
         const tgt = servers[tgtIdx];
         
         packets.push({
            x: src.x,
            y: src.y - src.height/2,
            targetX: tgt.x,
            targetY: tgt.y - tgt.height/2,
            progress: 0,
            speed: 0.01 + Math.random() * 0.02,
            type: Math.random() > 0.1 ? 'transfer' : 'error',
            trail: []
         });
         src.activity = 1;
      }

      // Update Packets
      for (let i = packets.length - 1; i >= 0; i--) {
         const p = packets[i];
         
         // Bezier curve trajectory
         const cpX = (p.x + p.targetX) / 2;
         const cpY = Math.min(p.y, p.targetY) - 150 - Math.random() * 50;

         const currentX = (1 - p.progress)**2 * p.x + 2 * (1 - p.progress) * p.progress * cpX + p.progress**2 * p.targetX;
         const currentY = (1 - p.progress)**2 * p.y + 2 * (1 - p.progress) * p.progress * cpY + p.progress**2 * p.targetY;

         p.trail.unshift({ x: currentX, y: currentY, alpha: 1 });
         if (p.trail.length > 15) p.trail.pop();
         
         for (const t of p.trail) t.alpha -= 0.05;

         p.progress += p.speed;
         
         if (p.progress >= 1) {
            // Find target server
            const tgt = servers.find(s => Math.abs(s.x - p.targetX) < 10);
            if (tgt) tgt.activity = 1;
            packets.splice(i, 1);
         }
      }

      // Update Servers
      for (const s of servers) {
         s.activity *= 0.95;
         s.pulse += 0.05;
         for (const l of s.lines) {
            l.progress = (l.progress + l.speed) % 1;
         }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { columns, packets, servers, width, height, rgb } = state;
      ctx.clearRect(0, 0, width, height);
      
      // Draw Code Columns (Parallax sorted)
      const sortedCols = [...columns].sort((a, b) => b.z - a.z); // Draw back first

      ctx.textAlign = 'center';
      for (const col of sortedCols) {
         if (!col.active) continue;

         const scale = 1 - col.z * 0.4; // Distant columns are smaller
         ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
         
         for (let i = 0; i < col.chars.length; i++) {
            const ch = col.chars[i];
            if (ch.y < -20 || ch.y > height + 20) continue;

            let alpha = ch.opacity * (1 - col.z * 0.5);
            let colorStr = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

            if (ch.highlight > 0) {
               colorStr = '#ffffff';
               // Head glow
               // shadowBlur removed for perf
               // shadowColor removed for perf
            } else if (ch.isKeyword) {
               // Make keywords stand out slightly with the theme color
               colorStr = `rgba(${Math.min(rgb[0]+50, 255)}, ${Math.min(rgb[1]+50, 255)}, ${Math.min(rgb[2]+50, 255)}, ${alpha + 0.2})`;
            }

            ctx.fillStyle = colorStr;
            ctx.fillText(ch.char, col.x, ch.y);
            // shadowBlur removed for perf // reset
         }
      }

      // Draw Packets (Relay data)
      for (const p of packets) {
         const pColor = p.type === 'error' ? 'rgba(255, 50, 50, ' : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, `;
         
         ctx.beginPath();
         for (let i = 0; i < p.trail.length; i++) {
            const t = p.trail[i];
            if (i === 0) ctx.moveTo(t.x, t.y);
            else ctx.lineTo(t.x, t.y);
         }
         ctx.strokeStyle = pColor + '0.5)';
         ctx.lineWidth = 3;
         ctx.stroke();

         if (p.trail.length > 0) {
            ctx.beginPath();
            ctx.arc(p.trail[0].x, p.trail[0].y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            // shadowBlur removed for perf
            // shadowColor removed for perf
            ctx.fill();
            // shadowBlur removed for perf
         }
      }

      // Draw Servers (Abstract Blocks)
      for (const s of servers) {
         ctx.save();
         ctx.translate(s.x, s.y);
         
         const baseAlpha = 0.1 + s.activity * 0.4;
         ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${baseAlpha})`;
         ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.3 + s.activity * 0.5})`;
         ctx.lineWidth = 2;
         
         // 3D box representation
         ctx.beginPath();
         ctx.moveTo(-s.width/2, 0);
         ctx.lineTo(s.width/2, 0);
         ctx.lineTo(s.width/2 + 20, -20);
         ctx.lineTo(-s.width/2 + 20, -20);
         ctx.closePath();
         ctx.fill();
         ctx.stroke();
         
         ctx.beginPath();
         ctx.moveTo(-s.width/2, 0);
         ctx.lineTo(s.width/2, 0);
         ctx.lineTo(s.width/2, -s.height);
         ctx.lineTo(-s.width/2, -s.height);
         ctx.closePath();
         ctx.fill();
         ctx.stroke();

         // Server activity lines
         for (let i = 0; i < s.lines.length; i++) {
            const l = s.lines[i];
            const y = -s.height * 0.8 + (i * 15);
            ctx.beginPath();
            ctx.moveTo(-s.width/2 + 10, y);
            ctx.lineTo(s.width/2 - 10, y);
            ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
            ctx.lineWidth = 4;
            ctx.stroke();

            // Progress blip
            const blipX = -s.width/2 + 10 + (s.width - 20) * l.progress;
            ctx.beginPath();
            ctx.moveTo(blipX - 5, y);
            ctx.lineTo(blipX + 5, y);
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.5 + s.activity * 0.5})`;
            ctx.stroke();
         }
         
         ctx.restore();
      }
    };

    const loop = () => {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
         update();
         const canvas = canvasRef.current;
         if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) draw(ctx);
         }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvasRef.current?.parentElement) {
         // eslint-disable-next-line react-hooks/exhaustive-deps
         canvasRef.current.parentElement.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
      aria-hidden="true"
    />
  );
}
