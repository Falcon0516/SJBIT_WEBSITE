import HeroScrub from '@/components/hero/HeroScrub';
import StatsSection from '@/components/sections/StatsSection';
import EventsSection from '@/components/events/EventsSection';
import LegacyReveal from '@/components/hero/LegacyReveal';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import ScrollProgressIndicator from '@/components/layout/ScrollProgressIndicator';
import ParticleField from '@/components/ui/ParticleField';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col relative z-0">
      <ParticleField count={50} interactive={true} className="fixed inset-0 z-[-1] pointer-events-none" />
      <ScrollProgressIndicator />
      <Navbar />
      <HeroScrub />
      <StatsSection />
      <EventsSection />
      <LegacyReveal />
      <Footer />
    </main>
  );
}
