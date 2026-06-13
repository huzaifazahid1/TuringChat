'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain } from 'lucide-react';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-white/10'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-white no-underline">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            <Brain size={16} />
          </span>
          <span className="font-bold text-[17px] tracking-tight">TuringChat</span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-7">
          {['#games', '#how', '#features', '#leaderboard'].map((href) => (
            <a
              key={href}
              href={href}
              className="text-sm text-[#9a9aae] hover:text-white transition-colors no-underline font-medium capitalize"
            >
              {href.replace('#', '')}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-[#9a9aae] hover:text-white px-4 py-2 transition-colors no-underline font-medium">
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:-translate-y-0.5 transition-transform shadow-lg shadow-indigo-500/30 no-underline"
          >
            Play free
          </Link>
        </div>
      </div>
    </header>
  );
}
