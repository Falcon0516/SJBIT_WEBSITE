import HeroScrub from '@/components/hero/HeroScrub';
import StatsSection from '@/components/sections/StatsSection';
import EventsSection from '@/components/events/EventsSection';
import LegacyReveal from '@/components/hero/LegacyReveal';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import ScrollProgressIndicator from '@/components/layout/ScrollProgressIndicator';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
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
