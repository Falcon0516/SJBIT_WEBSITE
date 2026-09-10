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
// Isometric Projection & UI Types
// -----------------------------------------
interface Point3D { x: number; y: number; z: number; }
interface Point2D { x: number; y: number; }

interface UIElement {
  id: string;
  type: 'rect' | 'button' | 'image' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number; // 0 = Backend, 1 = Logic, 2 = UI
  zOffset: number;
  hover: number;
}

interface InteractionPulse {
  x: number;
  y: number;
  layer: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export default function IsometricUISimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const stateRef = useRef({
    elements: [] as UIElement[],
    pulses: [] as InteractionPulse[],
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    mouse: { x: -1000, y: -1000, active: false },
    rotation: 0
  });

  useEffect(() => {
    const state = stateRef.current;
    state.rgb = hexToRgb(color);

    const initSimulation = () => {
      state.elements = [];
      
      // Backend Layer (0)
      state.elements.push({ id: 'db_base', type: 'rect', x: -100, y: -100, w: 200, h: 200, layer: 0, zOffset: 0, hover: 0 });
      for (let i = 0; i < 3; i++) {
         state.elements.push({ id: `db_disk_${i}`, type: 'rect', x: -60, y: -60 + i * 50, w: 120, h: 30, layer: 0, zOffset: 20, hover: 0 });
      }

      // Logic Layer (1)
      state.elements.push({ id: 'api_base', type: 'rect', x: -120, y: -120, w: 240, h: 240, layer: 1, zOffset: 0, hover: 0 });
      state.elements.push({ id: 'api_node1', type: 'rect', x: -80, y: -80, w: 60, h: 60, layer: 1, zOffset: 15, hover: 0 });
      state.elements.push({ id: 'api_node2', type: 'rect', x: 20, y: -80, w: 60, h: 60, layer: 1, zOffset: 15, hover: 0 });
      state.elements.push({ id: 'api_node3', type: 'rect', x: -80, y: 20, w: 60, h: 60, layer: 1, zOffset: 15, hover: 0 });
      state.elements.push({ id: 'api_node4', type: 'rect', x: 20, y: 20, w: 60, h: 60, layer: 1, zOffset: 15, hover: 0 });

      // UI Layer (2)
      state.elements.push({ id: 'ui_phone', type: 'rect', x: -90, y: -160, w: 180, h: 320, layer: 2, zOffset: 0, hover: 0 });
      state.elements.push({ id: 'ui_header', type: 'rect', x: -70, y: -140, w: 140, h: 40, layer: 2, zOffset: 10, hover: 0 });
      state.elements.push({ id: 'ui_hero', type: 'image', x: -70, y: -80, w: 140, h: 100, layer: 2, zOffset: 10, hover: 0 });
      state.elements.push({ id: 'ui_btn1', type: 'button', x: -70, y: 40, w: 140, h: 30, layer: 2, zOffset: 15, hover: 0 });
      state.elements.push({ id: 'ui_btn2', type: 'button', x: -70, y: 80, w: 140, h: 30, layer: 2, zOffset: 15, hover: 0 });
      state.elements.push({ id: 'ui_nav', type: 'rect', x: -70, y: 130, w: 140, h: 20, layer: 2, zOffset: 10, hover: 0 });
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
      
      if (state.elements.length === 0) initSimulation();
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

    // --- Math & Projection ---
    // Standard isometric projection angles
    const isoAngleX = Math.PI / 6; // 30 degrees
    const isoAngleZ = Math.PI / 6;

    const project = (p3d: Point3D): Point2D => {
      // Add rotation to the Y axis (around the vertical axis in our 3D space)
      const rot = state.rotation;
      const rotatedX = p3d.x * Math.cos(rot) - p3d.y * Math.sin(rot);
      const rotatedY = p3d.x * Math.sin(rot) + p3d.y * Math.cos(rot);

      // Isometric projection
      const isoX = (rotatedX - rotatedY) * Math.cos(isoAngleX);
      const isoY = (rotatedX + rotatedY) * Math.sin(isoAngleZ) - p3d.z;

      // Center on screen
      return {
         x: state.width / 2 + isoX,
         y: state.height / 2 + isoY + 50 // slightly lower
      };
    };

    const update = () => {
      const { elements, pulses, width, height, mouse } = state;
      state.time += 0.016;
      state.rotation = Math.sin(state.time * 0.2) * 0.15; // Gentle sway

      // Auto interaction simulation
      if (Math.random() < 0.02) {
         // Find a button to click
         const btns = elements.filter(e => e.type === 'button');
         if (btns.length > 0) {
            const btn = btns[Math.floor(Math.random() * btns.length)];
            btn.hover = 1.0;
            
            // Spawn ripple on UI layer
            pulses.push({
               x: btn.x + btn.w/2, y: btn.y + btn.h/2, layer: 2, radius: 0, maxRadius: 100, alpha: 1
            });
            // Spawn corresponding ripples down the stack
            setTimeout(() => {
               if(stateRef.current) stateRef.current.pulses.push({ x: btn.x + btn.w/2, y: btn.y + btn.h/2, layer: 1, radius: 0, maxRadius: 120, alpha: 1 });
            }, 200);
            setTimeout(() => {
               if(stateRef.current) stateRef.current.pulses.push({ x: btn.x + btn.w/2, y: btn.y + btn.h/2, layer: 0, radius: 0, maxRadius: 150, alpha: 1 });
            }, 400);
         }
      }

      // Update elements
      for (const el of elements) {
         el.hover = Math.max(0, el.hover - 0.05); // Decay hover state
      }

      // Update pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
         const p = pulses[i];
         p.radius += (p.maxRadius - p.radius) * 0.1;
         p.alpha -= 0.02;
         if (p.alpha <= 0) pulses.splice(i, 1);
      }
    };

    const drawPolygon = (ctx: CanvasRenderingContext2D, points: Point3D[], fill: string, stroke: string) => {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
         const p2d = project(points[i]);
         if (i === 0) ctx.moveTo(p2d.x, p2d.y);
         else ctx.lineTo(p2d.x, p2d.y);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { elements, pulses, width, height, rgb, time } = state;
      ctx.clearRect(0, 0, width, height);
      ctx.lineJoin = 'round';

      const layerSpacing = 160 + Math.sin(time * 0.5) * 20; // Breathing effect on layers

      // Draw layers from bottom up
      for (let l = 0; l <= 2; l++) {
         const layerZ = l * layerSpacing;
         const layerEls = elements.filter(e => e.layer === l);
         
         // 1. Draw Layer Connections (Data lines flowing up/down)
         if (l > 0) {
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`;
            ctx.lineWidth = 1;
            const points = [
               { x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: -50, y: 50 }
            ];
            for (const p of points) {
               const p1 = project({ ...p, z: (l-1) * layerSpacing });
               const p2 = project({ ...p, z: l * layerSpacing });
               ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
               
               // Data packet traveling
               const prog = (time * 0.5 + p.x) % 1;
               if (prog > 0) {
                  const pZ = (l-1) * layerSpacing + layerSpacing * prog;
                  const dot = project({ ...p, z: pZ });
                  ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
                  ctx.beginPath(); ctx.arc(dot.x, dot.y, 2, 0, Math.PI*2); ctx.fill();
               }
            }
         }

         // 2. Draw Layer Base Grid
         const baseGridPts = [
            { x: -200, y: -200, z: layerZ },
            { x: 200, y: -200, z: layerZ },
            { x: 200, y: 200, z: layerZ },
            { x: -200, y: 200, z: layerZ }
         ];
         drawPolygon(ctx, baseGridPts, `rgba(0,0,0,0.3)`, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.1)`);

         // 3. Draw Elements on Layer
         for (const el of layerEls) {
            const z = layerZ + el.zOffset + (el.hover * 10);
            
            // Define 3D Box for element
            const pTop = [
               { x: el.x, y: el.y, z: z + 4 },
               { x: el.x + el.w, y: el.y, z: z + 4 },
               { x: el.x + el.w, y: el.y + el.h, z: z + 4 },
               { x: el.x, y: el.y + el.h, z: z + 4 }
            ];
            
            let fill = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.05)`;
            let stroke = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`;

            if (el.type === 'button') {
               fill = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.2 + el.hover * 0.5})`;
               stroke = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
            } else if (el.type === 'image') {
               fill = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`;
            }

            drawPolygon(ctx, pTop, fill, stroke);
            
            // Inner lines for image/text placeholders
            if (el.type === 'image') {
               ctx.beginPath();
               const p1 = project({ x: el.x, y: el.y, z: z + 4 });
               const p2 = project({ x: el.x + el.w, y: el.y + el.h, z: z + 4 });
               ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
               ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;
               ctx.stroke();
            }
         }

         // 4. Draw Pulses
         const layerPulses = pulses.filter(p => p.layer === l);
         for (const p of layerPulses) {
            // Approximate circle in iso projection (draw as polygon)
            const pts: Point3D[] = [];
            for (let a = 0; a < Math.PI * 2; a += 0.2) {
               pts.push({
                  x: p.x + Math.cos(a) * p.radius,
                  y: p.y + Math.sin(a) * p.radius,
                  z: layerZ + 1
               });
            }
            drawPolygon(ctx, pts, '', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${p.alpha * 0.5})`);
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
