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
// Types & Maze Logic
// -----------------------------------------
interface Cell {
  x: number;
  y: number;
  walls: [boolean, boolean, boolean, boolean]; // Top, Right, Bottom, Left
  visited: boolean;
}

interface PathNode {
  x: number;
  y: number;
  f: number;
  g: number;
  h: number;
  parent: PathNode | null;
}

interface Hunter {
  x: number;
  y: number;
  path: { x: number, y: number }[];
  progress: number;
  target: { x: number, y: number } | null;
  state: 'idle' | 'moving' | 'decrypting';
  timer: number;
}

const CELL_SIZE = 30;

export default function PathfinderSimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const stateRef = useRef({
    grid: [] as Cell[],
    cols: 0,
    rows: 0,
    mazeGenerated: false,
    hunter: null as Hunter | null,
    radarAngle: 0,
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number }[]
  });

  useEffect(() => {
    const state = stateRef.current;
    state.rgb = hexToRgb(color);

    const index = (x: number, y: number) => {
      if (x < 0 || y < 0 || x > state.cols - 1 || y > state.rows - 1) return -1;
      return x + y * state.cols;
    };

    // --- Maze Generation (Recursive Backtracker) ---
    const generateMaze = () => {
      const grid = state.grid;
      let current = grid[0];
      current.visited = true;
      const stack: Cell[] = [];

      const checkNeighbors = (cell: Cell) => {
        const neighbors: Cell[] = [];
        const top    = grid[index(cell.x, cell.y - 1)];
        const right  = grid[index(cell.x + 1, cell.y)];
        const bottom = grid[index(cell.x, cell.y + 1)];
        const left   = grid[index(cell.x - 1, cell.y)];

        if (top && !top.visited) neighbors.push(top);
        if (right && !right.visited) neighbors.push(right);
        if (bottom && !bottom.visited) neighbors.push(bottom);
        if (left && !left.visited) neighbors.push(left);

        if (neighbors.length > 0) {
          const r = Math.floor(Math.random() * neighbors.length);
          return neighbors[r];
        } else {
          return undefined;
        }
      };

      const removeWalls = (a: Cell, b: Cell) => {
        const x = a.x - b.x;
        if (x === 1) { a.walls[3] = false; b.walls[1] = false; }
        else if (x === -1) { a.walls[1] = false; b.walls[3] = false; }
        
        const y = a.y - b.y;
        if (y === 1) { a.walls[0] = false; b.walls[2] = false; }
        else if (y === -1) { a.walls[2] = false; b.walls[0] = false; }
      };

      // Fully generate instantly for visual background
      while (true) {
        const next = checkNeighbors(current);
        if (next) {
          next.visited = true;
          stack.push(current);
          removeWalls(current, next);
          current = next;
        } else if (stack.length > 0) {
          current = stack.pop()!;
        } else {
          break;
        }
      }
      state.mazeGenerated = true;
    };

    // --- A* Pathfinding ---
    const heuristic = (a: {x: number, y: number}, b: {x: number, y: number}) => {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    };

    const findPath = (startCell: Cell, endCell: Cell) => {
      const openSet: PathNode[] = [];
      const closedSet: Set<string> = new Set();
      
      const startNode: PathNode = { x: startCell.x, y: startCell.y, f: 0, g: 0, h: 0, parent: null };
      openSet.push(startNode);

      while (openSet.length > 0) {
        let lowestIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
          if (openSet[i].f < openSet[lowestIndex].f) lowestIndex = i;
        }
        const current = openSet[lowestIndex];

        if (current.x === endCell.x && current.y === endCell.y) {
          const path = [];
          let temp: PathNode | null = current;
          while (temp) {
            path.push({ x: temp.x, y: temp.y });
            temp = temp.parent;
          }
          return path.reverse();
        }

        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);

        const cell = state.grid[index(current.x, current.y)];
        const neighborsCoords = [];
        if (!cell.walls[0]) neighborsCoords.push({ x: current.x, y: current.y - 1 });
        if (!cell.walls[1]) neighborsCoords.push({ x: current.x + 1, y: current.y });
        if (!cell.walls[2]) neighborsCoords.push({ x: current.x, y: current.y + 1 });
        if (!cell.walls[3]) neighborsCoords.push({ x: current.x - 1, y: current.y });

        for (const neighborCoords of neighborsCoords) {
          if (closedSet.has(`${neighborCoords.x},${neighborCoords.y}`)) continue;
          
          const gScore = current.g + 1;
          let neighborNode = openSet.find(n => n.x === neighborCoords.x && n.y === neighborCoords.y);
          
          if (!neighborNode) {
            neighborNode = { ...neighborCoords, f: 0, g: 0, h: 0, parent: null };
            openSet.push(neighborNode);
          } else if (gScore >= neighborNode.g) {
            continue;
          }

          neighborNode.parent = current;
          neighborNode.g = gScore;
          neighborNode.h = heuristic(neighborNode, endCell);
          neighborNode.f = neighborNode.g + neighborNode.h;
        }
      }
      return [];
    };

    const initSimulation = () => {
      state.cols = Math.floor(state.width / CELL_SIZE);
      state.rows = Math.floor(state.height / CELL_SIZE);
      state.grid = [];
      
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          state.grid.push({ x, y, walls: [true, true, true, true], visited: false });
        }
      }
      
      generateMaze();
      
      state.hunter = {
        x: 0, y: 0,
        path: [],
        progress: 0,
        target: null,
        state: 'idle',
        timer: 0
      };
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

    const update = () => {
      const { grid, cols, rows, hunter, particles } = state;
      state.time += 0.016;
      state.radarAngle += 0.03;

      if (hunter && state.mazeGenerated) {
        if (hunter.state === 'idle') {
           hunter.timer -= 0.016;
           if (hunter.timer <= 0) {
              // Pick new target
              const targetCell = grid[Math.floor(Math.random() * grid.length)];
              const startCell = grid[index(hunter.x, hunter.y)];
              hunter.path = findPath(startCell, targetCell);
              hunter.target = { x: targetCell.x, y: targetCell.y };
              if (hunter.path.length > 0) {
                 hunter.state = 'moving';
                 hunter.progress = 0;
                 hunter.path.shift(); // Remove current pos
              }
           }
        } else if (hunter.state === 'moving') {
           hunter.progress += 0.1; // Speed
           if (hunter.progress >= 1) {
              if (hunter.path.length > 0) {
                 const next = hunter.path.shift()!;
                 hunter.x = next.x;
                 hunter.y = next.y;
                 hunter.progress = 0;
              } else {
                 hunter.state = 'decrypting';
                 hunter.timer = 1.0; // Decrypt time
                 
                 // Spawn burst particles
                 for(let i=0; i<15; i++) {
                   particles.push({
                     x: (hunter.x + 0.5) * CELL_SIZE,
                     y: (hunter.y + 0.5) * CELL_SIZE,
                     vx: (Math.random() - 0.5) * 4,
                     vy: (Math.random() - 0.5) * 4,
                     life: 1.0
                   });
                 }
              }
           }
        } else if (hunter.state === 'decrypting') {
           hunter.timer -= 0.016;
           if (hunter.timer <= 0) {
              hunter.state = 'idle';
              hunter.timer = 0.5;
           }
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
         const p = particles[i];
         p.x += p.vx;
         p.y += p.vy;
         p.life -= 0.02;
         if (p.life <= 0) particles.splice(i, 1);
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { grid, hunter, width, height, rgb, radarAngle, particles } = state;
      ctx.clearRect(0, 0, width, height);

      const offsetX = (width - state.cols * CELL_SIZE) / 2;
      const offsetY = (height - state.rows * CELL_SIZE) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Draw Grid/Maze
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      for (const cell of grid) {
        const x = cell.x * CELL_SIZE;
        const y = cell.y * CELL_SIZE;
        if (cell.walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x + CELL_SIZE, y); }
        if (cell.walls[1]) { ctx.moveTo(x + CELL_SIZE, y); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); }
        if (cell.walls[2]) { ctx.moveTo(x + CELL_SIZE, y + CELL_SIZE); ctx.lineTo(x, y + CELL_SIZE); }
        if (cell.walls[3]) { ctx.moveTo(x, y + CELL_SIZE); ctx.lineTo(x, y); }
      }
      ctx.stroke();

      // Draw Target Crosshair
      if (hunter && hunter.target) {
         const tx = hunter.target.x * CELL_SIZE + CELL_SIZE / 2;
         const ty = hunter.target.y * CELL_SIZE + CELL_SIZE / 2;
         ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + Math.sin(state.time * 5) * 0.2})`;
         ctx.beginPath();
         ctx.moveTo(tx - 10, ty); ctx.lineTo(tx + 10, ty);
         ctx.moveTo(tx, ty - 10); ctx.lineTo(tx, ty + 10);
         ctx.arc(tx, ty, 6, 0, Math.PI * 2);
         ctx.stroke();
      }

      // Draw Hunter Path Trail
      if (hunter && hunter.path.length > 0) {
         ctx.beginPath();
         // Start from visual pos
         let hx = hunter.x;
         let hy = hunter.y;
         if (hunter.state === 'moving' && hunter.path.length > 0) {
            hx = hunter.x + (hunter.path[0].x - hunter.x) * hunter.progress;
            hy = hunter.y + (hunter.path[0].y - hunter.y) * hunter.progress;
         }
         ctx.moveTo(hx * CELL_SIZE + CELL_SIZE / 2, hy * CELL_SIZE + CELL_SIZE / 2);
         for (const node of hunter.path) {
            ctx.lineTo(node.x * CELL_SIZE + CELL_SIZE / 2, node.y * CELL_SIZE + CELL_SIZE / 2);
         }
         ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;
         ctx.lineWidth = 4;
         ctx.stroke();
      }

      // Draw Hunter
      if (hunter) {
         let hx = hunter.x;
         let hy = hunter.y;
         if (hunter.state === 'moving' && hunter.path.length > 0) {
            hx = hunter.x + (hunter.path[0].x - hunter.x) * hunter.progress;
            hy = hunter.y + (hunter.path[0].y - hunter.y) * hunter.progress;
         }
         
         const px = hx * CELL_SIZE + CELL_SIZE / 2;
         const py = hy * CELL_SIZE + CELL_SIZE / 2;

         // Decrypting Aura
         if (hunter.state === 'decrypting') {
            const r = CELL_SIZE * (1 + (1 - hunter.timer));
            const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
            grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${hunter.timer * 0.5})`);
            grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
         }

         ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
         ctx.shadowBlur = 15;
         ctx.shadowColor = ctx.fillStyle;
         ctx.beginPath();
         ctx.arc(px, py, 6, 0, Math.PI * 2);
         ctx.fill();
         ctx.shadowBlur = 0;
      }

      // Draw Particles
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      for (const p of particles) {
         ctx.globalAlpha = p.life;
         ctx.beginPath();
         ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
         ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // Radar Sweep Overlay
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(width, height) * 0.8;
      
      const rgrad = ctx.createConicGradient(radarAngle, cx, cy);
      rgrad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
      rgrad.addColorStop(0.95, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.02)`);
      rgrad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`);
      
      ctx.fillStyle = rgrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, radarAngle, radarAngle + Math.PI * 2);
      ctx.fill();
      
      // Radar Line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(radarAngle) * radius, cy + Math.sin(radarAngle) * radius);
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`;
      ctx.lineWidth = 1.5;
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
