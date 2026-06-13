'use client';

/**
 * TuringChat Landing Page — Mobile-first, fully responsive
 * ─────────────────────────────────────────────────────────────────────────
 * Strategy: useBreakpoint() hook tracks window width in JS.
 * isMobile = width < 768, isTablet = width < 1024.
 * All layouts switch based on these flags — no CSS media queries needed,
 * no Tailwind arbitrary values, no external CSS file.
 *
 * Place at: app/page.tsx
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  Brain, Pencil, Zap, VenetianMask, Search,
  MessagesSquare, Users, Sparkles, Bot,
  Trophy, ShieldCheck, ArrowRight, Check,
  Github, Menu, X, type LucideIcon,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════════
   HOOK — tracks window width, returns breakpoint flags
   ══════════════════════════════════════════════════════════════════════════ */
function useBreakpoint() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    fn();
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { isMobile: w < 768, isTablet: w < 1024, w };
}

/* ══════════════════════════════════════════════════════════════════════════
   SCROLL REVEAL
   ══════════════════════════════════════════════════════════════════════════ */
function Reveal({ children, delay = 0, style = {} }: {
  children: React.ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: on ? 1 : 0,
      transform: on ? 'none' : 'translateY(16px)',
      transition: `opacity .55s ease ${delay}ms, transform .55s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NAV — collapses to hamburger on mobile
   ══════════════════════════════════════════════════════════════════════════ */
function Nav() {
  const { isMobile } = useBreakpoint();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [['#games','Games'],['#how','How it works'],['#features','Features'],['#leaderboard','Leaderboard']];

  const headerBase: CSSProperties = {
    position: 'sticky', top: 0, zIndex: 50,
    background: scrolled ? 'color-mix(in oklab, var(--color-bg-base) 88%, transparent)' : 'transparent',
    backdropFilter: scrolled ? 'blur(16px)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
    borderBottom: `1px solid ${scrolled ? 'var(--color-border-subtle)' : 'transparent'}`,
    transition: 'background .3s, border-color .3s',
  };

  return (
    <header style={headerBase}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 16 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--color-accent), #a855f7)', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
            <Brain size={15} />
          </span>
          TuringChat
        </Link>

        {/* Desktop links */}
        {!isMobile && (
          <nav style={{ display: 'flex', gap: 24, marginLeft: 'auto', marginRight: 8 }}>
            {navLinks.map(([h, l]) => (
              <a key={h} href={h} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                {l}
              </a>
            ))}
          </nav>
        )}

        {/* Desktop CTAs */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: isMobile ? 'auto' : 0 }}>
            <Link href="/login" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', padding: '8px 14px', fontSize: 14, fontWeight: 500 }}>Log in</Link>
            <Link href="/register" style={{ background: 'linear-gradient(135deg, var(--color-accent), #a855f7)', color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 16px -4px rgba(99,102,241,.45)' }}>
              Play free
            </Link>
          </div>
        )}

        {/* Mobile — hamburger + CTA */}
        {isMobile && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/register" style={{ background: 'linear-gradient(135deg, var(--color-accent), #a855f7)', color: '#fff', textDecoration: 'none', padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600 }}>
              Play free
            </Link>
            <button onClick={() => setMenuOpen(v => !v)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: 6, display: 'grid', placeItems: 'center' }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {isMobile && menuOpen && (
        <div style={{ background: 'var(--color-bg-panel)', borderTop: '1px solid var(--color-border-subtle)', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map(([h, l]) => (
            <a key={h} href={h} onClick={() => setMenuOpen(false)}
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 16, fontWeight: 500, padding: '10px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              {l}
            </a>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)}
            style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 16, fontWeight: 500, padding: '10px 0', marginTop: 4 }}>
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HERO
   ══════════════════════════════════════════════════════════════════════════ */
function Hero() {
  const { isMobile } = useBreakpoint();

  return (
    <section style={{ position: 'relative', padding: isMobile ? '48px 0 40px' : '80px 0 60px', overflow: 'hidden' }}>
      {/* Glow */}
      <div aria-hidden style={{ position: 'absolute', top: -240, left: '50%', transform: 'translateX(-50%)', width: isMobile ? 500 : 900, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,.22) 0%, rgba(168,85,247,.08) 45%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px', position: 'relative', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 36 : 48, alignItems: 'center' }}>
        {/* Copy */}
        <div>
          <Reveal>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.28)', padding: '6px 13px', borderRadius: 999 }}>
              <Sparkles size={12} /> Real-time chat games powered by AI
            </span>
          </Reveal>

          <Reveal delay={70}>
            <h1 style={{ fontSize: isMobile ? 36 : 'clamp(36px,5.2vw,58px)', lineHeight: 1.06, letterSpacing: '-.03em', fontWeight: 800, color: 'var(--color-text-primary)', margin: '16px 0 0' }}>
              Can you tell a{' '}
              <span style={{ background: 'linear-gradient(120deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>human</span>
              {' '}from an{' '}
              <span style={{ background: 'linear-gradient(120deg,#fbbf24,#fb923c)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>AI</span>?
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? 15 : 17, lineHeight: 1.65, margin: '16px 0 0' }}>
              TuringChat drops you into 60-second conversations with a stranger — sometimes a real person, sometimes a language model wearing a persona. Chat, guess, score, climb the leaderboard.
            </p>
          </Reveal>

          <Reveal delay={210}>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg,var(--color-accent),#a855f7)', color: '#fff', textDecoration: 'none', padding: isMobile ? '12px 20px' : '13px 24px', borderRadius: 12, fontWeight: 600, fontSize: isMobile ? 14 : 15, boxShadow: '0 8px 24px -6px rgba(99,102,241,.5)', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                Start playing <ArrowRight size={15} />
              </Link>
              <a href="#games" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--color-text-primary)', textDecoration: 'none', padding: isMobile ? '12px 20px' : '13px 24px', borderRadius: 12, fontWeight: 600, fontSize: isMobile ? 14 : 15, border: '1px solid var(--color-border-strong)', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                See the games
              </a>
            </div>
          </Reveal>

          <Reveal delay={270}>
            <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: isMobile ? 8 : '6px 18px' }}>
              {['No download — plays in the browser','Match a human in seconds, AI as fallback','Free to play'].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <Check size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} />{t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Demo card */}
        <Reveal delay={isMobile ? 0 : 190}>
          <GuessDemo />
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GUESS DEMO CARD
   ══════════════════════════════════════════════════════════════════════════ */
function GuessDemo() {
  const msgs = [
    { me: true,  t: 'ok weird opener but — pineapple on pizza, yes or no' },
    { me: false, t: 'lmao straight to the hard questions. soft yes. fight me' },
    { me: true,  t: "respect. what's your go-to comfort movie" },
    { me: false, t: 'shrek 2 unironically. the soundtrack carries my whole personality' },
  ];
  const [vote, setVote] = useState<'human'|'ai'|null>(null);
  const correct = vote === 'ai';

  return (
    <div style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 28px 64px -24px rgba(0,0,0,.55)' }}>
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 15px', borderBottom: '1px solid var(--color-border-subtle)', background: 'rgba(255,255,255,.02)' }}>
        {['#ff5f57','#febc2e','#28c840'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>Turing Game · 0:12 left</span>
      </div>
      {/* Chat */}
      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.me ? 'flex-end' : 'flex-start' }}>
            <div className={m.me ? 'bubble-me' : 'bubble-them'} style={{ maxWidth: '82%', padding: '9px 13px', fontSize: 13.5, lineHeight: 1.4 }}>
              {m.t}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div className="bubble-them" style={{ padding: '11px 14px' }}>
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        </div>
      </div>
      {/* Vote */}
      <div style={{ padding: '12px 14px 14px' }}>
        {vote === null ? (
          <>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 9px' }}>Human or AI?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['human','👤 Human','var(--color-success)'],['ai','🤖 AI','var(--color-warning)']] as const).map(([v,l,c]) => (
                <button key={v} onClick={() => setVote(v)}
                  style={{ padding: '11px', borderRadius: 11, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'border-color .2s, background .2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c; (e.currentTarget as HTMLElement).style.background = `color-mix(in oklab,${c} 12%,transparent)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-elevated)'; }}>
                  {l}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: correct ? 'var(--color-success)' : 'var(--color-danger)', margin: '0 0 4px' }}>
              {correct ? '✓ Got it!' : '✗ Nope — it was an AI!'}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 11px' }}>
              Real game: 60 seconds, live opponent.
            </p>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 9, background: 'linear-gradient(135deg,var(--color-accent),#a855f7)', color: '#fff', textDecoration: 'none' }}>
              Try the real thing <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ══════════════════════════════════════════════════════════════════════════ */
function Section({ id, alt, children, pad }: { id?: string; alt?: boolean; children: React.ReactNode; pad?: string }) {
  return (
    <section id={id} style={{ padding: pad ?? '72px 0', ...(alt ? { background: 'rgba(255,255,255,.015)', borderTop: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)' } : {}) }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px' }}>
        {children}
      </div>
    </section>
  );
}

function SHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  const { isMobile } = useBreakpoint();
  return (
    <Reveal>
      <div style={{ maxWidth: 600, marginBottom: isMobile ? 28 : 40 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--color-accent)', margin: 0 }}>{kicker}</p>
        <h2 style={{ fontSize: isMobile ? 26 : 'clamp(26px,3.2vw,36px)', fontWeight: 800, letterSpacing: '-.025em', color: 'var(--color-text-primary)', margin: '9px 0 0', lineHeight: 1.14 }}>{title}</h2>
        {sub && <p style={{ fontSize: isMobile ? 14 : 15.5, color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '11px 0 0' }}>{sub}</p>}
      </div>
    </Reveal>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '3px 8px', borderRadius: 999, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GAMES
   ══════════════════════════════════════════════════════════════════════════ */
const GAMES = [
  { icon: Brain,        name: 'Turing Game',       tag: 'flagship',    desc: '60 seconds of chat. Call it: human or AI? Fool your opponent, catch the bot.',              accent: '#6366f1' },
  { icon: Pencil,       name: 'Word Forge',         tag: '2 players',   desc: 'Build a story one word at a time. AI judge scores creativity at 30 words.',                accent: '#818cf8' },
  { icon: Zap,          name: 'Rapid Fire Debate',  tag: '4 rounds',    desc: 'Random topic, random side. 30-second rounds. Judge picks a winner.',                       accent: '#fbbf24' },
  { icon: VenetianMask, name: 'Imposter Prompt',    tag: 'bluff',       desc: 'Both share a secret word. Trade clues without saying it. Slip up — instant loss.',         accent: '#34d399' },
  { icon: Search,       name: 'AI Interrogation',   tag: '5 questions', desc: 'Grill your opponent with five questions then call it. Human or machine?',                  accent: '#38bdf8' },
];

function Games() {
  const { isMobile, isTablet } = useBreakpoint();
  const [hero, ...rest] = GAMES;
  const cols = isMobile ? '1fr' : '1fr 1fr';

  return (
    <Section id="games">
      <SHead kicker="The games" title="Five ways to test who's real" sub="Every mode is live and multiplayer. Match a human in seconds — or face one of twelve AI personas." />

      {/* Hero card */}
      <Reveal delay={60}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 20, padding: isMobile ? '20px' : '26px', borderRadius: 18, background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)', marginBottom: 14, boxShadow: 'inset 0 0 60px rgba(99,102,241,.04), 0 0 0 1px rgba(99,102,241,.18)' }}>
          <div style={{ flexShrink: 0, width: isMobile ? 52 : 60, height: isMobile ? 52 : 60, borderRadius: 14, background: 'linear-gradient(135deg,var(--color-accent),#a855f7)', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 8px 24px -6px rgba(99,102,241,.55)' }}>
            <hero.icon size={isMobile ? 24 : 28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{hero.name}</h3>
              <Chip>{hero.tag}</Chip>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? 14 : 15, margin: '0 0 14px', lineHeight: 1.55 }}>{hero.desc}</p>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 10, background: 'linear-gradient(135deg,var(--color-accent),#a855f7)', color: '#fff', textDecoration: 'none' }}>
              Play now <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12 }}>
        {rest.map((g, i) => (
          <Reveal key={g.name} delay={80 + i * 50}>
            <article style={{ padding: isMobile ? '16px' : '20px', borderRadius: 16, background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: `color-mix(in oklab,${g.accent} 16%,transparent)`, color: g.accent, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                <g.icon size={19} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{g.name}</h4>
                <Chip>{g.tag}</Chip>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>{g.desc}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ══════════════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const { isMobile } = useBreakpoint();
  const steps = [
    { n: '01', title: 'Pick a game', body: 'Choose any of the five modes. We look for a live human first and pair you in seconds.' },
    { n: '02', title: 'Play 60 seconds', body: 'Chat, argue, drop clues, or write a story. If no human shows in 15 seconds, an AI persona steps in — and you may not notice.' },
    { n: '03', title: 'Guess & score', body: 'Call human or AI, or let the judge decide. Points feed your rank on the global leaderboard.' },
  ];
  return (
    <Section id="how" alt pad={isMobile ? '56px 0' : '72px 0'}>
      <SHead kicker="How it works" title="From zero to first match in under a minute" />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 70}>
            <div style={{ padding: isMobile ? '20px' : '24px', borderRadius: 16, background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '.1em' }}>{s.n}</span>
              <h4 style={{ fontSize: isMobile ? 16 : 17, fontWeight: 700, color: 'var(--color-text-primary)', margin: '10px 0 7px' }}>{s.title}</h4>
              <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FEATURES
   ══════════════════════════════════════════════════════════════════════════ */
const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: MessagesSquare, title: 'Public rooms',       body: 'Spin up a room with category and mood. Live member counts and full message history.' },
  { icon: Users,          title: 'Direct messages',    body: 'Tap anyone in a room to open a private thread. Syncs in real time across devices.' },
  { icon: Sparkles,       title: 'Live presence',      body: 'See who is online, who is typing — updated the instant anything changes.' },
  { icon: Bot,            title: 'In-chat AI (/ai)',   body: 'Type /ai in any room to query the assistant. It reads recent context first.' },
  { icon: VenetianMask,   title: '12 AI personas',     body: 'When a bot fills in it picks from twelve personalities — own name, own quirks.' },
  { icon: Trophy,         title: 'Leaderboard',        body: 'Every match feeds your score and streak. Climb rankings across all five games.' },
  { icon: ShieldCheck,    title: 'Secure by default',  body: 'JWT auth, refresh tokens, rate limiting. Your account properly locked down.' },
  { icon: Zap,            title: 'Instant matching',   body: 'Human-first queue. Pairs you in seconds with a graceful AI fallback.' },
];

function Features() {
  const { isMobile, isTablet } = useBreakpoint();
  const cols = isMobile ? '1fr 1fr' : isTablet ? 'repeat(3,1fr)' : 'repeat(4,1fr)';

  return (
    <Section id="features">
      <SHead kicker="Features" title="A full real-time chat platform" sub="Everything you expect from a modern chat app — plus the games that make it worth showing up." />
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: isMobile ? 10 : 12 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 4) * 50}>
            <article style={{ padding: isMobile ? '14px' : '18px', borderRadius: 14, background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--color-accent-soft)', color: 'var(--color-accent)', display: 'grid', placeItems: 'center', marginBottom: 10 }}>
                <f.icon size={16} />
              </div>
              <h4 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>{f.title}</h4>
              <p style={{ fontSize: isMobile ? 12 : 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>{f.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   REALTIME BAND
   ══════════════════════════════════════════════════════════════════════════ */
function Realtime() {
  const { isMobile } = useBreakpoint();
  return (
    <Section alt pad={isMobile ? '56px 0' : '72px 0'}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 48, alignItems: 'center' }}>
        <Reveal>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--color-accent)', margin: '0 0 9px' }}>Built on WebSockets</p>
            <h2 style={{ fontSize: isMobile ? 24 : 'clamp(24px,2.8vw,32px)', fontWeight: 800, letterSpacing: '-.025em', color: 'var(--color-text-primary)', margin: '0 0 12px', lineHeight: 1.15 }}>
              Everything updates the moment it happens
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? 14 : 15.5, lineHeight: 1.65, margin: 0 }}>
              Messages, typing indicators, presence, game turns — all stream over a live connection. No refresh, no lag.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {['Sub-second message delivery','Typing & online indicators','Turn-locked, race-safe game state'].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: isMobile ? 13.5 : 14.5, color: 'var(--color-text-primary)' }}>
                  <Check size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} /> {t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={isMobile ? 0 : 90}>
          <div style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border-subtle)', borderRadius: 18, padding: '18px', boxShadow: '0 20px 48px -24px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {/* Message 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#f472b6,#c084fc)', flexShrink: 0 }} />
              <div className="bubble-them" style={{ padding: '9px 12px', fontSize: 13 }}>Anyone up for a debate round?</div>
            </div>
            {/* Message 2 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div className="bubble-me" style={{ padding: '9px 12px', fontSize: 13 }}>Always. Loser admits pineapple belongs on pizza</div>
            </div>
            {/* Typing */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#34d399,#38bdf8)', flexShrink: 0 }} />
              <div className="bubble-them" style={{ padding: '11px 14px' }}>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
            {/* Presence */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 11, borderTop: '1px solid var(--color-border-subtle)', fontSize: 12, color: 'var(--color-text-muted)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }} />
              3 online · 2 typing
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LEADERBOARD
   ══════════════════════════════════════════════════════════════════════════ */
function Leaderboard() {
  const { isMobile } = useBreakpoint();
  const rows = [
    { rank: 1, medal: '🥇', name: 'velvet_turing',  score: 4820, streak: 11 },
    { rank: 2, medal: '🥈', name: 'not_a_robot_99', score: 4510, streak: 7 },
    { rank: 3, medal: '🥉', name: 'mira.exe',        score: 4390, streak: 5 },
  ];
  return (
    <Section id="leaderboard">
      <SHead kicker="Leaderboard" title="Points, streaks, bragging rights" sub="Win matches and fool opponents to climb. Streaks multiply your gains." />
      <Reveal delay={70}>
        <div style={{ maxWidth: 660, border: '1px solid var(--color-border-subtle)', borderRadius: 16, overflow: 'hidden', background: 'var(--color-bg-panel)' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr 60px' : '60px 1fr 80px 100px', padding: '11px 18px', borderBottom: '1px solid var(--color-border-subtle)', background: 'rgba(255,255,255,.02)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--color-text-muted)' }}>
            <span>Rank</span><span>Player</span><span>Streak</span>
            {!isMobile && <span style={{ textAlign: 'right' }}>Score</span>}
          </div>
          {rows.map(r => (
            <div key={r.rank} style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr 60px' : '60px 1fr 80px 100px', padding: '13px 18px', borderBottom: '1px solid var(--color-border-subtle)', alignItems: 'center', fontSize: 14, background: r.rank === 1 ? 'rgba(251,191,36,.04)' : undefined }}>
              <span style={{ fontSize: 17 }}>{r.medal}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{r.name}</span>
              <span style={{ color: 'var(--color-warning)', fontSize: 12.5 }}>🔥 {r.streak}</span>
              {!isMobile && <span style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{r.score.toLocaleString()}</span>}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', fontSize: 13, color: 'var(--color-text-muted)' }}>
            <span>Your spot is empty.</span>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
              Claim it <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FINAL CTA
   ══════════════════════════════════════════════════════════════════════════ */
function FinalCTA() {
  const { isMobile } = useBreakpoint();
  return (
    <section style={{ position: 'relative', textAlign: 'center', padding: isMobile ? '64px 0' : '96px 0', overflow: 'hidden', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(99,102,241,.14), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>
        <Reveal>
          <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,4.2vw,48px)', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.1 }}>
            One conversation.{' '}
            <span style={{ background: 'linear-gradient(120deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>One guess.</span>
          </h2>
        </Reveal>
        <Reveal delay={70}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? 15 : 17, margin: '12px 0 0', lineHeight: 1.65 }}>
            Jump into a match right now. Free, in your browser, no setup.
          </p>
        </Reveal>
        <Reveal delay={140}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, justifyContent: 'center', marginTop: 26 }}>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: isMobile ? '14px 20px' : '14px 28px', borderRadius: 13, background: 'linear-gradient(135deg,var(--color-accent),#a855f7)', color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none', boxShadow: '0 10px 28px -6px rgba(99,102,241,.45)' }}>
              Create your account <ArrowRight size={16} />
            </Link>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: isMobile ? '14px 20px' : '14px 28px', borderRadius: 13, border: '1px solid var(--color-border-strong)', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              I already play
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════════════════════ */
function Footer() {
  const { isMobile } = useBreakpoint();
  const cols = [
    { h: 'PLAY',    links: [['#games','Games'],['#leaderboard','Leaderboard'],['/register','Sign up']] },
    { h: 'LEARN',   links: [['#how','How it works'],['#features','Features']] },
    { h: 'ACCOUNT', links: [['/login','Log in'],['/register','Register']] },
  ];
  return (
    <footer style={{ borderTop: '1px solid var(--color-border-subtle)', padding: isMobile ? '40px 0 24px' : '48px 0 28px', background: 'rgba(255,255,255,.012)' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? 28 : 40, marginBottom: 32 }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--color-accent),#a855f7)', display: 'grid', placeItems: 'center', color: '#fff' }}>T</span>
            TuringChat
          </div>
          {/* Link columns */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(3,auto)', gap: isMobile ? '0 16px' : '0 44px' }}>
            {cols.map(col => (
              <div key={col.h}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--color-text-muted)', textTransform: 'uppercase', margin: '0 0 10px' }}>{col.h}</p>
                {col.links.map(([href, label]) => (
                  <a key={label} href={href} style={{ display: 'block', fontSize: isMobile ? 13 : 13.5, color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: 7, transition: 'color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}>
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, borderTop: '1px solid var(--color-border-subtle)', fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap', gap: 8 }}>
          <span>© {new Date().getFullYear()} TuringChat. A real-time game of human vs machine.</span>
          <a href="#" style={{ color: 'var(--color-text-muted)', display: 'flex' }}><Github size={15} /></a>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DEFAULT EXPORT
   ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Games />
        <HowItWorks />
        <Features />
        <Realtime />
        <Leaderboard />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}