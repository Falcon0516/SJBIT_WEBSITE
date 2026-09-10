'use client';

import React from 'react';
import dynamic from 'next/dynamic';

interface EventSimulationProps {
  slug: string;
  color: string;
  className?: string;
}

// Dynamically import each heavy simulation to avoid bloating the main bundle
const NeuralSimulation = dynamic(() => import('@/components/simulations/NeuralSimulation'), { ssr: false });
const MatrixRelaySimulation = dynamic(() => import('@/components/simulations/MatrixRelaySimulation'), { ssr: false });
const PathfinderSimulation = dynamic(() => import('@/components/simulations/PathfinderSimulation'), { ssr: false });
const IsometricUISimulation = dynamic(() => import('@/components/simulations/IsometricUISimulation'), { ssr: false });
const CellularAutomataSimulation = dynamic(() => import('@/components/simulations/CellularAutomataSimulation'), { ssr: false });
const KinematicGearsSimulation = dynamic(() => import('@/components/simulations/KinematicGearsSimulation'), { ssr: false });
const LSystemTreeSimulation = dynamic(() => import('@/components/simulations/LSystemTreeSimulation'), { ssr: false });
const InverseKinematicsSimulation = dynamic(() => import('@/components/simulations/InverseKinematicsSimulation'), { ssr: false });

export default function EventSimulation({ slug, color, className = '' }: EventSimulationProps) {
  const [shouldRender, setShouldRender] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // On mobile devices, skip heavy canvas simulation RAF loops to guarantee 60-120fps smooth scrolling
    if (window.innerWidth < 768) {
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only run simulation when within viewport to save CPU/battery
        setShouldRender(entry.isIntersecting);
      },
      { rootMargin: '150px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const renderSimulation = () => {
    if (!shouldRender) return null;
    switch (slug) {
      case 'ai-prompt-battle':
        return <NeuralSimulation color={color} />;
      case 'code-relay':
        return <MatrixRelaySimulation color={color} />;
      case 'hack-and-hunt':
        return <PathfinderSimulation color={color} />;
      case 'app-development-challenge':
        return <IsometricUISimulation color={color} />;
      case 'zerocrypt-ctf':
        return <CellularAutomataSimulation color={color} />;
      case 'innovation-marathon':
        return <KinematicGearsSimulation color={color} />;
      case 'green-tech-challenge':
        return <LSystemTreeSimulation color={color} />;
      case 'roboinnovate':
        return <InverseKinematicsSimulation color={color} />;
      default:
        return <NeuralSimulation color={color} />;
    }
  };

  return (
    <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      {renderSimulation()}
    </div>
  );
}
