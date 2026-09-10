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
// Procedural L-System Tree & Particle Physics
// -----------------------------------------
interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  depth: number;
  children: Branch[];
  growth: number; // 0 to 1
  hasLeaf: boolean;
}

interface LeafParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  alpha: number;
  settled: boolean;
}

export default function LSystemTreeSimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const stateRef = useRef({
    tree: null as Branch | null,
    leaves: [] as LeafParticle[],
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    wind: 0
  });

  useEffect(() => {
    const state = stateRef.current;
    state.rgb = hexToRgb(color);

    const generateTree = (x: number, y: number, angle: number, length: number, width: number, depth: number): Branch => {
      const branch: Branch = {
         x, y, angle, length, width, depth, children: [], growth: 0, hasLeaf: depth > 3 && Math.random() > 0.3
      };
      
      // Stop condition
      if (depth < 6 && length > 10) {
         // Number of branches based on depth (more branches higher up)
         const numBranches = depth === 0 ? 3 : (Math.random() > 0.2 ? 2 : 1);
         
         for (let i = 0; i < numBranches; i++) {
            let nextAngle = angle;
            if (numBranches === 1) {
               nextAngle += (Math.random() - 0.5) * 0.4;
            } else if (numBranches === 2) {
               nextAngle += i === 0 ? -0.3 - Math.random() * 0.3 : 0.3 + Math.random() * 0.3;
            } else {
               nextAngle += (i - 1) * (0.4 + Math.random() * 0.2);
            }
            
            const nextLength = length * (0.7 + Math.random() * 0.2);
            const nextWidth = width * 0.65;
            
            branch.children.push(generateTree(0, 0, nextAngle, nextLength, nextWidth, depth + 1));
         }
      }
      return branch;
    };

    const initSimulation = () => {
      // Start tree at bottom center
      state.tree = generateTree(state.width / 2, state.height, -Math.PI / 2, state.height * 0.22, 12, 0);
      state.leaves = [];
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

    const updateBranch = (branch: Branch, px: number, py: number, parentGrowth: number) => {
      branch.x = px;
      branch.y = py;
      
      // Grow after parent has grown somewhat
      if (parentGrowth > 0.5) {
         branch.growth += 0.01;
         if (branch.growth > 1) branch.growth = 1;
      }
      
      const currentLength = branch.length * branch.growth;
      
      // Apply wind to angle (more effect on thinner branches)
      const windEffect = state.wind * Math.sin(state.time * 2 + branch.depth) * (branch.depth * 0.05);
      const effectiveAngle = branch.angle + windEffect;

      const endX = px + Math.cos(effectiveAngle) * currentLength;
      const endY = py + Math.sin(effectiveAngle) * currentLength;

      // Leaf dropping logic
      if (branch.growth === 1 && branch.hasLeaf && Math.random() < 0.001) {
         branch.hasLeaf = false;
         state.leaves.push({
            x: endX,
            y: endY,
            vx: Math.random() - 0.5,
            vy: 0,
            angle: Math.random() * Math.PI * 2,
            vAngle: (Math.random() - 0.5) * 0.2,
            alpha: 1.0,
            settled: false
         });
      }

      for (const child of branch.children) {
         updateBranch(child, endX, endY, branch.growth);
      }
    };

    const update = () => {
      const { tree, leaves, height } = state;
      state.time += 0.016;
      
      // Slowly shifting wind
      state.wind = Math.sin(state.time * 0.5) * 0.5 + Math.sin(state.time * 0.1) * 0.5;

      if (tree) {
         updateBranch(tree, tree.x, tree.y, 1.0);
      }

      // Update falling leaves
      for (const leaf of leaves) {
         if (leaf.settled) continue;
         
         // Physics
         leaf.vy += 0.05; // Gravity
         leaf.vx += state.wind * 0.1; // Wind
         leaf.vx *= 0.95; // Air resistance
         leaf.vy *= 0.95;
         
         // Flutter effect
         leaf.vx += Math.sin(state.time * 5 + leaf.y * 0.1) * 0.5;
         
         leaf.x += leaf.vx;
         leaf.y += leaf.vy;
         leaf.angle += leaf.vAngle;
         
         // Hit ground
         if (leaf.y >= height - 10) {
            leaf.y = height - 10;
            leaf.vy = 0;
            leaf.vx *= 0.5;
            if (Math.abs(leaf.vx) < 0.1) {
               leaf.settled = true;
            }
         }
      }
      
      // Cleanup old settled leaves occasionally
      if (leaves.length > 100 && Math.random() < 0.05) {
         const settledIdx = leaves.findIndex(l => l.settled);
         if (settledIdx !== -1) leaves.splice(settledIdx, 1);
      }
    };

    const drawBranch = (ctx: CanvasRenderingContext2D, branch: Branch, rgb: [number, number, number]) => {
      if (branch.growth === 0) return;

      const currentLength = branch.length * branch.growth;
      const windEffect = state.wind * Math.sin(state.time * 2 + branch.depth) * (branch.depth * 0.05);
      const effectiveAngle = branch.angle + windEffect;
      
      const endX = branch.x + Math.cos(effectiveAngle) * currentLength;
      const endY = branch.y + Math.sin(effectiveAngle) * currentLength;

      ctx.beginPath();
      ctx.moveTo(branch.x, branch.y);
      ctx.lineTo(endX, endY);
      
      // Branch color: dark to theme color based on depth
      const depthRatio = branch.depth / 6;
      const r = Math.floor(40 + (rgb[0] - 40) * depthRatio);
      const g = Math.floor(40 + (rgb[1] - 40) * depthRatio);
      const b = Math.floor(40 + (rgb[2] - 40) * depthRatio);
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.lineWidth = Math.max(0.5, branch.width * branch.growth);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Circuit node at joints
      if (branch.growth > 0.8 && branch.children.length > 0) {
         ctx.beginPath();
         ctx.arc(endX, endY, Math.max(1, branch.width * 0.3), 0, Math.PI * 2);
         ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`;
         ctx.fill();
      }

      // Draw leaf
      if (branch.hasLeaf && branch.growth === 1) {
         ctx.save();
         ctx.translate(endX, endY);
         // Leaf points somewhat outward
         ctx.rotate(effectiveAngle + Math.PI / 2);
         
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.quadraticCurveTo(5, -5, 0, -12);
         ctx.quadraticCurveTo(-5, -5, 0, 0);
         ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
         ctx.fill();
         
         // Glow
         // shadowBlur removed for perf
         // shadowColor removed for perf
         ctx.fill();
         // shadowBlur removed for perf
         
         ctx.restore();
      }

      for (const child of branch.children) {
         drawBranch(ctx, child, rgb);
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { tree, leaves, width, height, rgb, time } = state;
      ctx.clearRect(0, 0, width, height);

      // Draw energy ground grid
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 30) {
         ctx.moveTo(x, height);
         // Perspective grid lines
         ctx.lineTo(width/2 + (x - width/2) * 2, height - 100);
      }
      for (let y = 0; y < 100; y += 20) {
         ctx.moveTo(0, height - y);
         ctx.lineTo(width, height - y);
      }
      ctx.stroke();

      // Energy flowing up main trunk
      if (tree && tree.growth > 0.5) {
         const flow = (time * 50) % tree.length;
         ctx.beginPath();
         ctx.arc(tree.x, tree.y - flow, 4, 0, Math.PI * 2);
         ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`;
         // shadowBlur removed for perf
         // shadowColor removed for perf
         ctx.fill();
         // shadowBlur removed for perf
      }

      if (tree) {
         drawBranch(ctx, tree, rgb);
      }

      // Draw falling leaves
      for (const leaf of leaves) {
         ctx.save();
         ctx.translate(leaf.x, leaf.y);
         ctx.rotate(leaf.angle);
         
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.quadraticCurveTo(5, -5, 0, -12);
         ctx.quadraticCurveTo(-5, -5, 0, 0);
         ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${leaf.alpha})`;
         ctx.fill();
         
         if (!leaf.settled) {
            // shadowBlur removed for perf
            // shadowColor removed for perf
            ctx.fill();
            // shadowBlur removed for perf
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
