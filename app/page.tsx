'use client';

import { useState } from 'react';
import HeroScrub from '@/components/hero/HeroScrub';
import StatsSection from '@/components/sections/StatsSection';
import EventsSection from '@/components/events/EventsSection';
import LegacyReveal from '@/components/hero/LegacyReveal';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import ScrollProgressIndicator from '@/components/layout/ScrollProgressIndicator';
import RegisterModal from '@/components/events/RegisterModal';

export default function Home() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col">
      <ScrollProgressIndicator />
      <Navbar onRegisterClick={() => setIsRegisterOpen(true)} />
      <HeroScrub />
      <StatsSection />
      <EventsSection />
      <LegacyReveal onRegisterClick={() => setIsRegisterOpen(true)} />
      <Footer />
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />
    </main>
  );
}

