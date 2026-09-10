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

// -----------------------------------------
// Hexagonal Grid Cellular Automata
// -----------------------------------------
const HEX_SIZE = 14;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

interface HexCell {
  q: number; // axial q
  r: number; // axial r
  x: number; // pixel x
  y: number; // pixel y
  state: number; // 0 = empty, 1 = virus, 2 = firewall, 3 = safe data
  nextState: number;
  activity: number;
  char: string;
}

interface Shield {
  radius: number;
  maxRadius: number;
  active: boolean;
  power: number;
}

export default function CellularAutomataSimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const stateRef = useRef({
    grid: new Map<string, HexCell>(),
    shield: { radius: 0, maxRadius: 200, active: true, power: 1 } as Shield,
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    tickCounter: 0,
    hexChars: '0123456789ABCDEF'.split(''),
    totalVirus: 0,
  });

  useEffect(() => {
    const state = stateRef.current;
    state.rgb = hexToRgb(color);

    const getHexKey = (q: number, r: number) => `${q},${r}`;

    const initSimulation = () => {
      state.grid.clear();
      
      const cols = Math.ceil(state.width / HEX_WIDTH) + 2;
      const rows = Math.ceil(state.height / (HEX_HEIGHT * 0.75)) + 2;
      
      const centerX = state.width / 2;
      const centerY = state.height / 2;

      for (let row = -rows/2; row < rows/2; row++) {
        for (let col = -cols/2; col < cols/2; col++) {
           const xOffset = row % 2 !== 0 ? HEX_WIDTH / 2 : 0;
           const px = centerX + col * HEX_WIDTH + xOffset;
           const py = centerY + row * HEX_HEIGHT * 0.75;
           
           // axial coordinates approx
           const q = col - Math.floor(row/2);
           const r = row;
           
           const char = state.hexChars[Math.floor(Math.random() * 16)];
           
           // Initialize with some virus clusters at edges
           let cellState = 0;
           const distFromCenter = Math.hypot(px - centerX, py - centerY);
           
           if (distFromCenter > Math.min(state.width, state.height) * 0.35 && Math.random() > 0.95) {
              cellState = 1; // Virus spawn
           } else if (distFromCenter < 100) {
              cellState = 3; // Safe data
           }

           state.grid.set(getHexKey(q, r), {
             q, r, x: px, y: py,
             state: cellState, nextState: cellState,
             activity: 0, char
           });
        }
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

    const hexDirections = [
      { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
      { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
    ];

    const updateGrid = () => {
      // 1. Calculate next states based on Conway-like rules
      for (const cell of Array.from(state.grid.values())) {
         let virusNeighbors = 0;
         let safeNeighbors = 0;
         let firewallNeighbors = 0;

         for (const dir of hexDirections) {
            const neighbor = state.grid.get(getHexKey(cell.q + dir.dq, cell.r + dir.dr));
            if (neighbor) {
               if (neighbor.state === 1) virusNeighbors++;
               if (neighbor.state === 3) safeNeighbors++;
               if (neighbor.state === 2) firewallNeighbors++;
            }
         }

         cell.nextState = cell.state;

         // Rule 1: Virus spreads to empty cells if exactly 2 virus neighbors
         if (cell.state === 0 && virusNeighbors === 2) {
            cell.nextState = 1;
            cell.activity = 1;
         }
         
         // Rule 2: Virus dies if lonely or overcrowded
         if (cell.state === 1 && (virusNeighbors < 1 || virusNeighbors > 3)) {
            cell.nextState = 0;
         }

         // Rule 3: Firewall cleanses virus
         if (cell.state === 1 && firewallNeighbors > 0) {
            cell.nextState = 3; // Becomes safe data
            cell.activity = 1;
         }
         
         // Rule 4: Shield pulse generates temporary firewall cells
         const distToCenter = Math.hypot(cell.x - state.width/2, cell.y - state.height/2);
         if (state.shield.active && Math.abs(distToCenter - state.shield.radius) < HEX_WIDTH) {
            if (cell.state === 1 || cell.state === 0) {
               cell.nextState = 2; // Temporary firewall
               cell.activity = 1;
            }
         } else if (cell.state === 2) {
            // Firewall degrades back to safe data or empty
            cell.nextState = safeNeighbors > 0 ? 3 : 0;
         }
         
         // Character scramble
         if (cell.state === 1 || cell.state === 2) {
            if (Math.random() > 0.5) cell.char = state.hexChars[Math.floor(Math.random() * 16)];
         }
      }

      // 2. Apply next states
      let totalVirus = 0;
      for (const cell of Array.from(state.grid.values())) {
         cell.state = cell.nextState;
         cell.activity *= 0.9;
         if (cell.state === 1) totalVirus++;
      }

      state.totalVirus = totalVirus;
    };

    const update = () => {
      state.time += 0.016;
      state.tickCounter++;

      // Run automata rules every X frames (slower than render framerate)
      if (state.tickCounter % 6 === 0) {
         updateGrid();
         
         // If virus dies out, spawn a new massive wave from the edges!
         if (state.totalVirus === 0 && Math.random() < 0.1) {
            for (const cell of Array.from(state.grid.values())) {
                const distFromCenter = Math.hypot(cell.x - state.width/2, cell.y - state.height/2);
                if (distFromCenter > Math.min(state.width, state.height) * 0.35 && Math.random() > 0.85) {
                    cell.state = 1;
                }
            }
         }

         // Randomly spawn new virus clusters (3x3 area so they survive isolation rules)
         if (Math.random() < 0.08) {
            const keys = Array.from(state.grid.keys());
            const rCell = state.grid.get(keys[Math.floor(Math.random() * keys.length)]);
            if (rCell && Math.hypot(rCell.x - state.width/2, rCell.y - state.height/2) > 100) {
               rCell.state = 1;
               for (const dir of hexDirections) {
                   const n = state.grid.get(getHexKey(rCell.q + dir.dq, rCell.r + dir.dr));
                   if (n) n.state = 1;
               }
            }
         }
      }

      // Update Shield
      if (state.shield.active) {
         state.shield.radius += 8;
         if (state.shield.radius > state.shield.maxRadius) {
            state.shield.active = false;
         }
      } else {
         // Randomly trigger shield pulse
         if (Math.random() < 0.01) {
            state.shield.active = true;
            state.shield.radius = 50;
            state.shield.maxRadius = 300 + Math.random() * 200;
         }
      }
    };

    const drawHex = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - (Math.PI / 6);
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { width, height, rgb, time } = state;
      ctx.clearRect(0, 0, width, height);

      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const cell of Array.from(state.grid.values())) {
         let fillAlpha = 0;
         let strokeAlpha = 0.03;
         let textColor = '';
         let drawFill = false;

         if (cell.state === 1) {
            // Virus (Red/Orange)
            fillAlpha = 0.1 + cell.activity * 0.3;
            strokeAlpha = 0.2;
            ctx.fillStyle = `rgba(255, 50, 50, ${fillAlpha})`;
            ctx.strokeStyle = `rgba(255, 50, 50, ${strokeAlpha})`;
            textColor = `rgba(255, 100, 100, 0.8)`;
            drawFill = true;
         } else if (cell.state === 2) {
            // Firewall (Theme Color High Activity)
            fillAlpha = 0.3 + cell.activity * 0.5;
            strokeAlpha = 0.8;
            ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${fillAlpha})`;
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${strokeAlpha})`;
            textColor = '#ffffff';
            drawFill = true;
         } else if (cell.state === 3) {
            // Safe Data (Theme Color Low Activity)
            fillAlpha = 0.02;
            strokeAlpha = 0.1;
            ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${fillAlpha})`;
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${strokeAlpha})`;
            textColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`;
            drawFill = true;
         } else {
            // Empty
            ctx.strokeStyle = `rgba(255, 255, 255, 0.02)`;
         }

         drawHex(ctx, cell.x, cell.y, HEX_SIZE * 0.9);
         if (drawFill) ctx.fill();
         ctx.stroke();

         if (textColor) {
            ctx.fillStyle = textColor;
            ctx.fillText(cell.char, cell.x, cell.y);
         }
      }

      // Draw Center Core Hub
      const cx = width / 2;
      const cy = height / 2;
      
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 100, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;

      drawHex(ctx, cx, cy, HEX_SIZE * 3);
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spinning inner rings
      ctx.beginPath();
      ctx.arc(cx, cy, HEX_SIZE * 1.5, time * 2, time * 2 + Math.PI);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(cx, cy, HEX_SIZE * 2, -time, -time + Math.PI * 1.5);
      ctx.stroke();
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
