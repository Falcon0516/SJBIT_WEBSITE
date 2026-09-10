'use client';

import React, { useEffect, useRef } from 'react';

// --- Types & Interfaces ---
interface SimulationProps {
  color: string;
}

interface Vector2D {
  x: number;
  y: number;
}

interface NeuralNode {
  id: number;
  pos: Vector2D;
  vel: Vector2D;
  acc: Vector2D;
  radius: number;
  mass: number;
  charge: number;
  activity: number;
  baseActivity: number;
  layer: number; // For clustering
}

interface Synapse {
  source: NeuralNode;
  target: NeuralNode;
  strength: number;
  activity: number;
}

interface Signal {
  source: NeuralNode;
  target: NeuralNode;
  progress: number;
  speed: number;
  intensity: number;
}

interface Shockwave {
  pos: Vector2D;
  radius: number;
  maxRadius: number;
  intensity: number;
  age: number;
}

// --- Helper Functions ---
function hexToRgb(hex: string): [number, number, number] {
  const hexNorm = hex.replace('#', '');
  const r = parseInt(hexNorm.slice(0, 2), 16);
  const g = parseInt(hexNorm.slice(2, 4), 16);
  const b = parseInt(hexNorm.slice(4, 6), 16);
  return [r, g, b];
}

function distSq(a: Vector2D, b: Vector2D): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function distance(a: Vector2D, b: Vector2D): number {
  return Math.sqrt(distSq(a, b));
}

// --- Configuration Constants ---
const NUM_NODES = 120;
const MAX_SPEED = 2.5;
const PERCEPTION_RADIUS = 150;
const CONNECTION_DISTANCE = 180;
const COHESION_WEIGHT = 1.0;
const ALIGNMENT_WEIGHT = 1.0;
const SEPARATION_WEIGHT = 2.5;
const WANDER_FORCE = 0.2;
const SPRING_CONSTANT = 0.005;
const REPULSION_CONSTANT = 1500;
const DAMPING = 0.99;

export default function NeuralSimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Simulation State Refs
  const stateRef = useRef({
    nodes: [] as NeuralNode[],
    synapses: [] as Synapse[],
    signals: [] as Signal[],
    shockwaves: [] as Shockwave[],
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    mouse: { x: -1000, y: -1000, active: false }
  });

  useEffect(() => {
    const state = stateRef.current;
    state.rgb = hexToRgb(color);

    const initSimulation = () => {
      state.nodes = [];
      for (let i = 0; i < NUM_NODES; i++) {
        state.nodes.push({
          id: i,
          pos: { x: Math.random() * state.width, y: Math.random() * state.height },
          vel: { x: (Math.random() - 0.5) * MAX_SPEED, y: (Math.random() - 0.5) * MAX_SPEED },
          acc: { x: 0, y: 0 },
          radius: Math.random() * 2 + 1.5,
          mass: Math.random() * 2 + 1,
          charge: Math.random() * 10 + 5,
          activity: 0,
          baseActivity: Math.random() * 0.2,
          layer: Math.floor(Math.random() * 4),
        });
      }
      state.synapses = [];
      state.signals = [];
      state.shockwaves = [];
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
      
      if (state.nodes.length === 0) {
         initSimulation();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
      state.mouse.active = true;
    };

    const handleMouseLeave = () => {
      state.mouse.active = false;
      state.mouse.x = -1000;
      state.mouse.y = -1000;
    };
    
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       const parent = canvasRef.current?.parentElement;
       if (parent) {
         parent.addEventListener('mousemove', handleMouseMove);
         parent.addEventListener('mouseleave', handleMouseLeave);
       }
    }

    const update = () => {
      const { nodes, signals, shockwaves, width, height, mouse } = state;
      state.time += 0.016;
      state.synapses = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Autonomously wander slightly
        node.vel.x += (Math.random() - 0.5) * WANDER_FORCE;
        node.vel.y += (Math.random() - 0.5) * WANDER_FORCE;
        
        let sepX = 0, sepY = 0, sepCount = 0;
        let aliX = 0, aliY = 0, aliCount = 0;
        let cohX = 0, cohY = 0, cohCount = 0;
        let repX = 0, repY = 0;
        let sprX = 0, sprY = 0;

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const other = nodes[j];
          const dSq = distSq(node.pos, other.pos);
          const d = Math.sqrt(dSq);

          if (d > 0.1 && d < PERCEPTION_RADIUS) {
            if (d < node.radius * 4 + other.radius * 4) {
              sepX += (node.pos.x - other.pos.x) / d;
              sepY += (node.pos.y - other.pos.y) / d;
              sepCount++;
            }
            if (node.layer === other.layer) {
                aliX += other.vel.x;
                aliY += other.vel.y;
                aliCount++;
                cohX += other.pos.x;
                cohY += other.pos.y;
                cohCount++;
            }
          }

          if (d > 0.1 && d < 200) {
            const force = REPULSION_CONSTANT / (d * d);
            repX += (node.pos.x - other.pos.x) / d * force;
            repY += (node.pos.y - other.pos.y) / d * force;
          }

          if (d > 0.1 && d < CONNECTION_DISTANCE) {
             state.synapses.push({ source: node, target: other, strength: 1 - (d / CONNECTION_DISTANCE), activity: 0 });
             if (node.layer === other.layer || Math.random() < 0.1) {
                const springForce = (d - CONNECTION_DISTANCE / 2) * SPRING_CONSTANT;
                sprX -= (node.pos.x - other.pos.x) / d * springForce;
                sprY -= (node.pos.y - other.pos.y) / d * springForce;
             }
          }
        }

        if (sepCount > 0) {
          sepX /= sepCount; sepY /= sepCount;
          const sepMag = Math.sqrt(sepX*sepX + sepY*sepY);
          if (sepMag > 0) {
             sepX = (sepX / sepMag) * MAX_SPEED - node.vel.x;
             sepY = (sepY / sepMag) * MAX_SPEED - node.vel.y;
          }
        }
        
        if (aliCount > 0) {
          aliX /= aliCount; aliY /= aliCount;
          const aliMag = Math.sqrt(aliX*aliX + aliY*aliY);
          if (aliMag > 0) {
             aliX = (aliX / aliMag) * MAX_SPEED - node.vel.x;
             aliY = (aliY / aliMag) * MAX_SPEED - node.vel.y;
          }
        }

        if (cohCount > 0) {
          cohX /= cohCount; cohY /= cohCount;
          const vecX = cohX - node.pos.x;
          const vecY = cohY - node.pos.y;
          const vecMag = Math.sqrt(vecX*vecX + vecY*vecY);
          if (vecMag > 0) {
             cohX = (vecX / vecMag) * MAX_SPEED - node.vel.x;
             cohY = (vecY / vecMag) * MAX_SPEED - node.vel.y;
          }
        }

        let mouseX = 0, mouseY = 0;
        if (mouse.active) {
           const md = distance(node.pos, mouse);
           if (md > 0.1 && md < 200) {
             const force = -0.5 * (1 - md / 200);
             mouseX = (node.pos.x - mouse.x) / md * force;
             mouseY = (node.pos.y - mouse.y) / md * force;
             node.activity += 0.05;
           }
        }

        node.acc.x += sepX * SEPARATION_WEIGHT + aliX * ALIGNMENT_WEIGHT + cohX * COHESION_WEIGHT + repX + sprX + mouseX;
        node.acc.y += sepY * SEPARATION_WEIGHT + aliY * ALIGNMENT_WEIGHT + cohY * COHESION_WEIGHT + repY + sprY + mouseY;

        const cx = width / 2;
        const cy = height / 2;
        node.acc.x += (cx - node.pos.x) * 0.0001;
        node.acc.y += (cy - node.pos.y) * 0.0001;

        node.vel.x += node.acc.x;
        node.vel.y += node.acc.y;
        
        const speed = Math.sqrt(node.vel.x ** 2 + node.vel.y ** 2);
        if (speed > MAX_SPEED) {
           node.vel.x = (node.vel.x / speed) * MAX_SPEED;
           node.vel.y = (node.vel.y / speed) * MAX_SPEED;
        }

        node.vel.x *= DAMPING;
        node.vel.y *= DAMPING;

        node.pos.x += node.vel.x;
        node.pos.y += node.vel.y;
        node.acc.x = 0;
        node.acc.y = 0;

        if (node.pos.x < -50) node.pos.x = width + 50;
        if (node.pos.x > width + 50) node.pos.x = -50;
        if (node.pos.y < -50) node.pos.y = height + 50;
        if (node.pos.y > height + 50) node.pos.y = -50;

        node.activity = Math.max(node.baseActivity, node.activity * 0.95);
      }

      if (Math.random() < 0.1 && state.synapses.length > 0) {
         const syn = state.synapses[Math.floor(Math.random() * state.synapses.length)];
         signals.push({
           source: syn.source,
           target: syn.target,
           progress: 0,
           speed: 0.02 + Math.random() * 0.03,
           intensity: Math.random() * 0.8 + 0.2
         });
         syn.source.activity = 1.0;
      }

      for (let i = signals.length - 1; i >= 0; i--) {
        const sig = signals[i];
        sig.progress += sig.speed;
        if (sig.progress >= 1) {
           sig.target.activity = Math.min(1.5, sig.target.activity + sig.intensity);
           if (sig.intensity > 0.8 && Math.random() < 0.3) {
             shockwaves.push({
               pos: { x: sig.target.pos.x, y: sig.target.pos.y },
               radius: 0,
               maxRadius: 100 + Math.random() * 100,
               intensity: sig.intensity,
               age: 0
             });
           }
           signals.splice(i, 1);
        }
      }

      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.1;
        sw.age += 0.02;
        if (sw.age >= 1) {
          shockwaves.splice(i, 1);
        } else {
          for (const node of nodes) {
             const d = distance(node.pos, sw.pos);
             if (d > 0.1 && Math.abs(d - sw.radius) < 20) {
               const force = (1 - sw.age) * sw.intensity * 0.5;
               const nx = (node.pos.x - sw.pos.x) / d;
               const ny = (node.pos.y - sw.pos.y) / d;
               node.vel.x += nx * force;
               node.vel.y += ny * force;
               node.activity = Math.max(node.activity, (1 - sw.age) * 0.5);
             }
          }
        }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { nodes, synapses, signals, shockwaves, width, height, rgb, time } = state;
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      for (const syn of synapses) {
        if (syn.source.id > syn.target.id) {
           const act = (syn.source.activity + syn.target.activity) / 2;
           const alpha = (syn.strength * 0.15) + (act * 0.3);
           ctx.beginPath();
           ctx.moveTo(syn.source.pos.x, syn.source.pos.y);
           ctx.lineTo(syn.target.pos.x, syn.target.pos.y);
           
           if (act > 0.3) {
              const grad = ctx.createLinearGradient(syn.source.pos.x, syn.source.pos.y, syn.target.pos.x, syn.target.pos.y);
              grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${syn.source.activity * 0.5})`);
              grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${syn.target.activity * 0.5})`);
              ctx.strokeStyle = grad;
           } else {
              ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
           }
           ctx.stroke();
        }
      }

      for (const sw of shockwaves) {
         const alpha = (1 - sw.age) * sw.intensity * 0.3;
         ctx.beginPath();
         ctx.arc(sw.pos.x, sw.pos.y, sw.radius, 0, Math.PI * 2);
         ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
         ctx.lineWidth = 2 * (1 - sw.age);
         ctx.stroke();
      }

      for (const sig of signals) {
         const x = sig.source.pos.x + (sig.target.pos.x - sig.source.pos.x) * sig.progress;
         const y = sig.source.pos.y + (sig.target.pos.y - sig.source.pos.y) * sig.progress;
         
         const glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
         glow.addColorStop(0, `rgba(255, 255, 255, ${sig.intensity})`);
         glow.addColorStop(0.2, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${sig.intensity * 0.8})`);
         glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
         
         ctx.fillStyle = glow;
         ctx.beginPath();
         ctx.arc(x, y, 10, 0, Math.PI * 2);
         ctx.fill();
      }

      for (const node of nodes) {
         const baseAlpha = 0.2 + node.activity * 0.8;
         const r = node.radius * (1 + node.activity * 0.5);
         
         const outerGlow = ctx.createRadialGradient(node.pos.x, node.pos.y, 0, node.pos.x, node.pos.y, r * 4);
         outerGlow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${baseAlpha * 0.5})`);
         outerGlow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
         ctx.fillStyle = outerGlow;
         ctx.beginPath();
         ctx.arc(node.pos.x, node.pos.y, r * 4, 0, Math.PI * 2);
         ctx.fill();
         
         ctx.fillStyle = `rgba(${Math.min(255, rgb[0] + 100)}, ${Math.min(255, rgb[1] + 100)}, ${Math.min(255, rgb[2] + 100)}, ${baseAlpha})`;
         ctx.beginPath();
         ctx.arc(node.pos.x, node.pos.y, r, 0, Math.PI * 2);
         ctx.fill();

         if (node.layer === 0 && node.activity > 0.3) {
            ctx.beginPath();
            ctx.arc(node.pos.x, node.pos.y, r * 2.5, time * 2, time * 2 + Math.PI);
            ctx.strokeStyle = `rgba(255, 255, 255, ${node.activity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
         }
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
         // eslint-disable-next-line react-hooks/exhaustive-deps
         canvasRef.current.parentElement.removeEventListener('mouseleave', handleMouseLeave);
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
