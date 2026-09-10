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
// Inverse Kinematics (IK) Robotic Arms
// -----------------------------------------
interface Segment {
  x: number;
  y: number;
  length: number;
  angle: number;
  parent: Segment | null;
}

interface RobotArm {
  id: number;
  baseX: number;
  baseY: number;
  segments: Segment[];
  maxReach: number;
  target: { x: number, y: number } | null;
  state: 'idle' | 'moving' | 'welding';
  timer: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface CircuitNode {
  x: number;
  y: number;
  active: boolean;
  welded: boolean;
  connections: number[];
}

export default function InverseKinematicsSimulation({ color }: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const stateRef = useRef({
    arms: [] as RobotArm[],
    nodes: [] as CircuitNode[],
    sparks: [] as Spark[],
    width: 0,
    height: 0,
    rgb: [0, 0, 0] as [number, number, number],
    time: 0,
    mouse: { x: -1000, y: -1000, active: false }
  });

  useEffect(() => {
    const state = stateRef.current;
    state.rgb = hexToRgb(color);

    const createArm = (id: number, baseX: number, baseY: number, numSegments: number, len: number): RobotArm => {
      const segments: Segment[] = [];
      let parent: Segment | null = null;
      let maxReach = 0;
      for (let i = 0; i < numSegments; i++) {
        const seg: Segment = { x: baseX, y: baseY, length: len, angle: 0, parent };
        segments.push(seg);
        maxReach += len;
        parent = seg;
        len *= 0.85; // Segment gets shorter towards the end
      }
      return { id, baseX, baseY, segments, maxReach, target: null, state: 'idle', timer: 0 };
    };

    const initSimulation = () => {
      state.arms = [];
      const cx = state.width / 2;
      const cy = state.height / 2;

      // Create 3 robot arms at the edges
      state.arms.push(createArm(0, state.width * 0.1, state.height, 4, 100)); // Bottom left
      state.arms.push(createArm(1, state.width * 0.9, state.height, 4, 100)); // Bottom right
      state.arms.push(createArm(2, cx, -50, 4, 120)); // Top center (hanging)

      // Create circuit board nodes in the center
      state.nodes = [];
      for (let i = 0; i < 20; i++) {
         state.nodes.push({
            x: cx + (Math.random() - 0.5) * 400,
            y: cy + (Math.random() - 0.5) * 300,
            active: false,
            welded: false,
            connections: []
         });
      }
      
      // Generate some connections between nodes for visual structure
      for (let i = 0; i < state.nodes.length; i++) {
         const node = state.nodes[i];
         // connect to 1 or 2 closest nodes
         let closestIdx = -1;
         let minDist = Infinity;
         for (let j = 0; j < state.nodes.length; j++) {
            if (i === j) continue;
            const d = Math.hypot(node.x - state.nodes[j].x, node.y - state.nodes[j].y);
            if (d < minDist) {
               minDist = d;
               closestIdx = j;
            }
         }
         if (closestIdx !== -1 && !node.connections.includes(closestIdx)) {
            node.connections.push(closestIdx);
            state.nodes[closestIdx].connections.push(i);
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

    // --- IK Core Logic ---
    const updateSegment = (seg: Segment, targetX: number, targetY: number) => {
      const dx = targetX - seg.x;
      const dy = targetY - seg.y;
      seg.angle = Math.atan2(dy, dx);
      
      // Move segment so its END is at the target
      // This means the START (x,y) moves backwards along the angle
      seg.x = targetX - Math.cos(seg.angle) * seg.length;
      seg.y = targetY - Math.sin(seg.angle) * seg.length;
    };

    const solveIK = (arm: RobotArm, targetX: number, targetY: number) => {
      const segments = arm.segments;
      const numSegs = segments.length;
      
      // 1. Backward Reach (from effector to base)
      updateSegment(segments[numSegs - 1], targetX, targetY);
      for (let i = numSegs - 2; i >= 0; i--) {
         updateSegment(segments[i], segments[i + 1].x, segments[i + 1].y);
      }

      // 2. Forward Reach (lock base and push adjustments outward)
      segments[0].x = arm.baseX;
      segments[0].y = arm.baseY;
      for (let i = 1; i < numSegs; i++) {
         const parent = segments[i - 1];
         // The start of this segment is the end of the parent
         segments[i].x = parent.x + Math.cos(parent.angle) * parent.length;
         segments[i].y = parent.y + Math.sin(parent.angle) * parent.length;
      }
    };

    const getEffectorPos = (arm: RobotArm) => {
      const last = arm.segments[arm.segments.length - 1];
      return {
         x: last.x + Math.cos(last.angle) * last.length,
         y: last.y + Math.sin(last.angle) * last.length
      };
    };

    const update = () => {
      const { arms, nodes, sparks, mouse, rgb } = state;
      state.time += 0.016;

      // Allow mouse to override arm 0 target
      if (mouse.active) {
         arms[0].target = { x: mouse.x, y: mouse.y };
         arms[0].state = 'moving';
         arms[0].timer = 0;
      } else if (arms[0].target && arms[0].target.x === mouse.x) {
         // Reset arm 0 if mouse leaves
         arms[0].state = 'idle';
      }

      for (const arm of arms) {
         if (arm.state === 'idle') {
            arm.timer -= 0.016;
            if (arm.timer <= 0 && !mouse.active) {
               // Pick a random unwelded node within reach
               const availableNodes = nodes.filter(n => {
                  if (n.welded) return false;
                  const d = Math.hypot(n.x - arm.baseX, n.y - arm.baseY);
                  return d < arm.maxReach;
               });
               if (availableNodes.length > 0) {
                  const targetNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
                  arm.target = { x: targetNode.x, y: targetNode.y };
                  arm.state = 'moving';
               } else {
                  // Reset all nodes if all welded
                  nodes.forEach(n => n.welded = false);
               }
            }
         } else if (arm.state === 'moving' && arm.target) {
            // Smoothly interpolate current effector pos to target
            const eff = getEffectorPos(arm);
            const dx = arm.target.x - eff.x;
            const dy = arm.target.y - eff.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 5) {
               if (arm.id !== 0 || !mouse.active) {
                  arm.state = 'welding';
                  arm.timer = 1.5; // Weld duration
                  const node = nodes.find(n => Math.hypot(n.x - arm.target!.x, n.y - arm.target!.y) < 5);
                  if (node) node.active = true;
               }
            } else {
               // Move towards target (lerp speed)
               const speed = Math.min(dist, 10);
               const moveX = eff.x + (dx / dist) * speed;
               const moveY = eff.y + (dy / dist) * speed;
               solveIK(arm, moveX, moveY);
            }
         } else if (arm.state === 'welding') {
            arm.timer -= 0.016;
            const eff = getEffectorPos(arm);
            
            // Jitter effect for welding
            solveIK(arm, arm.target!.x + (Math.random()-0.5)*2, arm.target!.y + (Math.random()-0.5)*2);

            // Spawn sparks
            for (let i = 0; i < 3; i++) {
               sparks.push({
                  x: eff.x, y: eff.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6 - 2,
                  life: 1.0,
                  color: `rgba(${Math.min(255, rgb[0]+150)}, ${Math.min(255, rgb[1]+150)}, ${Math.min(255, rgb[2]+150)}, 1)`
               });
            }

            if (arm.timer <= 0) {
               arm.state = 'idle';
               arm.timer = Math.random() * 2 + 1; // Wait before next move
               const node = nodes.find(n => Math.hypot(n.x - arm.target!.x, n.y - arm.target!.y) < 5);
               if (node) {
                  node.active = false;
                  node.welded = true;
               }
            }
         }
      }

      // Update Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
         const s = sparks[i];
         s.vy += 0.2; // gravity
         s.vx *= 0.98; // air resistance
         s.x += s.vx;
         s.y += s.vy;
         s.life -= 0.03;
         if (s.life <= 0) sparks.splice(i, 1);
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { arms, nodes, sparks, width, height, rgb } = state;
      ctx.clearRect(0, 0, width, height);

      // Draw Circuit Board Base
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
         const node = nodes[i];
         for (const cIdx of node.connections) {
            if (cIdx > i) {
               const target = nodes[cIdx];
               ctx.beginPath();
               ctx.moveTo(node.x, node.y);
               // Manhattan routing for circuit look
               const midX = (node.x + target.x) / 2;
               ctx.lineTo(midX, node.y);
               ctx.lineTo(midX, target.y);
               ctx.lineTo(target.x, target.y);
               
               const isWelded = node.welded && target.welded;
               ctx.strokeStyle = isWelded ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)` : `rgba(255, 255, 255, 0.05)`;
               ctx.stroke();
            }
         }
      }

      // Draw Circuit Nodes
      for (const node of nodes) {
         ctx.beginPath();
         ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
         if (node.active) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`;
         } else if (node.welded) {
            ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
            ctx.shadowBlur = 0;
         } else {
            ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
            ctx.shadowBlur = 0;
         }
         ctx.fill();
         
         ctx.beginPath();
         ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
         ctx.strokeStyle = node.welded ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)` : `rgba(255, 255, 255, 0.02)`;
         ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Draw Arms
      for (const arm of arms) {
         ctx.lineCap = 'round';
         ctx.lineJoin = 'round';

         for (let i = 0; i < arm.segments.length; i++) {
            const seg = arm.segments[i];
            const endX = seg.x + Math.cos(seg.angle) * seg.length;
            const endY = seg.y + Math.sin(seg.angle) * seg.length;

            // Arm segment
            ctx.beginPath();
            ctx.moveTo(seg.x, seg.y);
            ctx.lineTo(endX, endY);
            
            // Thickness decreases towards effector
            const w = 12 - i * 2.5;
            ctx.lineWidth = w;
            ctx.strokeStyle = `rgba(20, 20, 25, 0.9)`;
            ctx.stroke();
            
            // Highlight
            ctx.lineWidth = w * 0.4;
            ctx.strokeStyle = `rgba(100, 100, 110, 0.4)`;
            ctx.stroke();

            // Joint
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, w * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = '#111';
            ctx.fill();
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // End effector visual (last segment)
            if (i === arm.segments.length - 1) {
               ctx.beginPath();
               ctx.moveTo(endX, endY);
               ctx.lineTo(endX + Math.cos(seg.angle) * 10, endY + Math.sin(seg.angle) * 10);
               ctx.lineWidth = 2;
               ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
               ctx.stroke();

               if (arm.state === 'welding') {
                  ctx.beginPath();
                  ctx.arc(endX + Math.cos(seg.angle) * 10, endY + Math.sin(seg.angle) * 10, 4, 0, Math.PI*2);
                  ctx.fillStyle = '#fff';
                  ctx.fill();
               }
            }
         }
      }

      // Draw Sparks
      for (const p of sparks) {
         ctx.fillStyle = p.color.replace(', 1)', `, ${p.life})`);
         ctx.beginPath();
         ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
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
