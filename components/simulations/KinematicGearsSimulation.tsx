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
// Rigid Body Gear System
// -----------------------------------------
interface Gear {
  id: number;
  x: number;
  y: number;
  radius: number;
  teeth: number;
  angle: number;
  speed: number;
  direction: number; // 1 or -1
  connectedTo: number[]; // ids of connected gears
  isDriver: boolean;
  type: 'solid' | 'spoke' | 'ring';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function KinematicGearsSimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const stateRef = useRef({
    gears: [] as Gear[],
    particles: [] as Particle[],
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
      state.gears = [];
      const cx = state.width / 2;
      const cy = state.height / 2;

      // Helper to calculate correct distance between gears based on teeth size
      const toothSize = 8; // approx circumference per tooth

      // Create a procedural gear train
      // 0: Driver gear (Center-Left)
      state.gears.push({
         id: 0, x: cx - 150, y: cy + 50, radius: (24 * toothSize) / (2 * Math.PI), teeth: 24,
         angle: 0, speed: 0.02, direction: 1, connectedTo: [1], isDriver: true, type: 'solid'
      });

      // 1: Big gear (Center)
      const g0 = state.gears[0];
      const r1 = (36 * toothSize) / (2 * Math.PI);
      const d01 = g0.radius + r1;
      const a01 = -Math.PI / 6;
      state.gears.push({
         id: 1, x: g0.x + Math.cos(a01) * d01, y: g0.y + Math.sin(a01) * d01, radius: r1, teeth: 36,
         angle: 0, speed: g0.speed * (g0.teeth / 36), direction: -1, connectedTo: [0, 2, 3], isDriver: false, type: 'spoke'
      });

      // 2: Small gear (Top Right)
      const g1 = state.gears[1];
      const r2 = (12 * toothSize) / (2 * Math.PI);
      const d12 = g1.radius + r2;
      const a12 = -Math.PI / 4;
      state.gears.push({
         id: 2, x: g1.x + Math.cos(a12) * d12, y: g1.y + Math.sin(a12) * d12, radius: r2, teeth: 12,
         angle: 0, speed: g1.speed * (g1.teeth / 12), direction: 1, connectedTo: [1, 4], isDriver: false, type: 'solid'
      });

      // 3: Medium gear (Bottom Right)
      const r3 = (20 * toothSize) / (2 * Math.PI);
      const d13 = g1.radius + r3;
      const a13 = Math.PI / 3;
      state.gears.push({
         id: 3, x: g1.x + Math.cos(a13) * d13, y: g1.y + Math.sin(a13) * d13, radius: r3, teeth: 20,
         angle: 0, speed: g1.speed * (g1.teeth / 20), direction: 1, connectedTo: [1], isDriver: false, type: 'ring'
      });

      // 4: Far Right gear
      const g2 = state.gears[2];
      const r4 = (16 * toothSize) / (2 * Math.PI);
      const d24 = g2.radius + r4;
      const a24 = 0;
      state.gears.push({
         id: 4, x: g2.x + Math.cos(a24) * d24, y: g2.y + Math.sin(a24) * d24, radius: r4, teeth: 16,
         angle: 0, speed: g2.speed * (g2.teeth / 16), direction: -1, connectedTo: [2], isDriver: false, type: 'solid'
      });
      
      // Calculate initial angles so teeth mesh correctly
      // This is a simplification; a full rigid body solver would be heavier.
      for (const gear of state.gears) {
         // Just randomize slightly, visual meshing is often "good enough" at high speeds
         gear.angle = Math.random() * Math.PI * 2;
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
      state.mouse.active = true;
    };
    const handleMouseLeave = () => { state.mouse.active = false; };
    
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       canvasRef.current?.parentElement?.addEventListener('mousemove', handleMouseMove);
       canvasRef.current?.parentElement?.addEventListener('mouseleave', handleMouseLeave);
    }

    const update = () => {
      const { gears, particles, width, height, mouse, rgb } = state;
      state.time += 0.016;
      
      // Speed multiplier based on mouse proximity to driver gear
      let speedMult = 1.0;
      if (mouse.active) {
         const driver = gears[0];
         const dist = Math.hypot(driver.x - mouse.x, driver.y - mouse.y);
         if (dist < 200) {
            speedMult = 1.0 + (1 - dist / 200) * 3; // Up to 4x speed
         }
      }

      // Update gears
      for (const gear of gears) {
         gear.angle += gear.speed * gear.direction * speedMult;
      }

      // Spawn sparks at gear contact points if speed is high
      if (speedMult > 2.0 && Math.random() < 0.3) {
         const g1 = gears[1];
         const g2 = gears[2];
         const dx = g2.x - g1.x;
         const dy = g2.y - g1.y;
         const angle = Math.atan2(dy, dx);
         const px = g1.x + Math.cos(angle) * g1.radius;
         const py = g1.y + Math.sin(angle) * g1.radius;
         
         for(let i=0; i<3; i++) {
           particles.push({
             x: px, y: py,
             vx: (Math.random() - 0.5) * 4,
             vy: (Math.random() - 0.5) * 4 - 2,
             life: 1.0, maxLife: 1.0,
             color: `rgba(${Math.min(255, rgb[0]+100)}, ${Math.min(255, rgb[1]+100)}, ${rgb[2]}, 1)`
           });
         }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
         const p = particles[i];
         p.x += p.vx;
         p.y += p.vy;
         p.vy += 0.1; // gravity
         p.life -= 0.02;
         if (p.life <= 0) particles.splice(i, 1);
      }
    };

    const drawGear = (ctx: CanvasRenderingContext2D, gear: Gear, rgb: [number, number, number]) => {
      ctx.save();
      ctx.translate(gear.x, gear.y);
      ctx.rotate(gear.angle);

      // Gear colors
      const strokeColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`;
      let fillColor = `rgba(255, 255, 255, 0.02)`;
      if (gear.isDriver) {
         fillColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.08)`;
      }

      // Draw Teeth
      ctx.beginPath();
      const toothDepth = 6;
      for (let i = 0; i < gear.teeth * 2; i++) {
        const a = (Math.PI * 2 * i) / (gear.teeth * 2);
        // Alternate between outer and inner radius to form teeth
        const r = i % 2 === 0 ? gear.radius : gear.radius - toothDepth;
        
        // Slight bevel on teeth
        const aOffset = (Math.PI * 2) / (gear.teeth * 8);
        
        if (i === 0) ctx.moveTo(Math.cos(a - aOffset) * r, Math.sin(a - aOffset) * r);
        else ctx.lineTo(Math.cos(a - aOffset) * r, Math.sin(a - aOffset) * r);
        ctx.lineTo(Math.cos(a + aOffset) * r, Math.sin(a + aOffset) * r);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw interior based on type
      if (gear.type === 'spoke') {
         // Center hub
         ctx.beginPath();
         ctx.arc(0, 0, 15, 0, Math.PI * 2);
         ctx.stroke();
         // Spokes
         const numSpokes = gear.teeth > 20 ? 6 : 4;
         for (let i = 0; i < numSpokes; i++) {
            const a = (Math.PI * 2 * i) / numSpokes;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
            ctx.lineTo(Math.cos(a) * (gear.radius - toothDepth - 2), Math.sin(a) * (gear.radius - toothDepth - 2));
            ctx.stroke();
         }
         // Inner ring
         ctx.beginPath();
         ctx.arc(0, 0, gear.radius * 0.6, 0, Math.PI * 2);
         ctx.stroke();
      } else if (gear.type === 'ring') {
         ctx.beginPath();
         ctx.arc(0, 0, gear.radius - toothDepth - 8, 0, Math.PI * 2);
         ctx.stroke();
      } else if (gear.type === 'solid') {
         ctx.beginPath();
         ctx.arc(0, 0, gear.radius - toothDepth - 4, 0, Math.PI * 2);
         ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`;
         ctx.fill();
         ctx.stroke();
         
         // Center pin
         ctx.beginPath();
         ctx.arc(0, 0, 4, 0, Math.PI * 2);
         ctx.fillStyle = strokeColor;
         ctx.fill();
      }

      ctx.restore();
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { gears, particles, width, height, rgb, time } = state;
      ctx.clearRect(0, 0, width, height);

      // Draw Belts/Chains connecting gears (abstract visual)
      // We'll just draw a glowing line between gears 3 and 4
      const g3 = gears[3];
      const g4 = gears[4];
      if (g3 && g4) {
         ctx.beginPath();
         ctx.setLineDash([4, 4]);
         ctx.lineDashOffset = -time * 50;
         ctx.moveTo(g3.x, g3.y);
         ctx.lineTo(g4.x, g4.y);
         ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;
         ctx.lineWidth = 1;
         ctx.stroke();
         ctx.setLineDash([]);
      }

      // Draw Gears
      for (const gear of gears) {
         drawGear(ctx, gear, rgb);
      }

      // Draw central Idea/Innovation Hologram inside gear 1
      const g1 = gears[1];
      if (g1) {
         ctx.save();
         ctx.translate(g1.x, g1.y);
         
         // Hologram base projection
         ctx.beginPath();
         ctx.ellipse(0, 20, 30, 10, 0, 0, Math.PI * 2);
         ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.1)`;
         ctx.fill();
         ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`;
         ctx.stroke();

         // Hologram cone
         const coneGrad = ctx.createLinearGradient(0, 20, 0, -40);
         coneGrad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`);
         coneGrad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
         ctx.beginPath();
         ctx.moveTo(-30, 20);
         ctx.lineTo(30, 20);
         ctx.lineTo(0, -50);
         ctx.closePath();
         ctx.fillStyle = coneGrad;
         ctx.fill();

         // Wireframe lightbulb spinning
         ctx.rotate(time);
         ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
         ctx.lineWidth = 1;
         ctx.beginPath();
         ctx.arc(0, -20, 15, 0, Math.PI * 2);
         ctx.stroke();
         ctx.beginPath();
         ctx.ellipse(0, -20, 15, 15 * Math.abs(Math.cos(time)), 0, 0, Math.PI * 2);
         ctx.stroke();
         ctx.beginPath();
         ctx.ellipse(0, -20, 15 * Math.abs(Math.sin(time)), 15, 0, 0, Math.PI * 2);
         ctx.stroke();

         ctx.restore();
      }

      // Draw Particles (Sparks)
      for (const p of particles) {
         ctx.fillStyle = p.color.replace(', 1)', `, ${p.life})`);
         ctx.beginPath();
         ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
         ctx.fill();
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
