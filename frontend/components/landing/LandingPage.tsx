import { Nav } from './Nav';
import { Hero } from './Hero';
import { TrustBar } from './TrustBar';
import { Games } from './Games';
import { HowItWorks, Features, Realtime, LeaderboardTease, FinalCTA, Footer } from './Sections';

/**
 * Compose everything. Drop <LandingPage /> into app/page.tsx.
 * Uses ONLY Tailwind classes — no CSS file import needed, styles work instantly.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#ededf2] antialiased overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <Games />
        <HowItWorks />
        <Features />
        <Realtime />
        <LeaderboardTease />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
