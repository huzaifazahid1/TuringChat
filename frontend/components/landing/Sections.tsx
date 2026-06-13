'use client';

import Link from 'next/link';
import {
  MessagesSquare, Users, Sparkles, Bot, VenetianMask,
  Trophy, ShieldCheck, Zap, Check, ArrowRight, Github, type LucideIcon,
} from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHead } from './Games';

/* ════════════ HOW IT WORKS ════════════ */
export function HowItWorks() {
  const steps = [
    { n: '01', title: 'Pick a game and hit match', body: 'Choose any of the five modes. We look for a live human first and pair you in seconds.' },
    { n: '02', title: 'Play your 60 seconds',       body: 'Chat, argue, drop clues, or write a story together. If no human shows up within 15 seconds, an AI persona steps in — and you may not notice.' },
    { n: '03', title: 'Guess, score, climb',         body: 'Call human or AI, or let the judge decide the round. Points feed your rank on the global leaderboard.' },
  ];
  return (
    <section id="how" className="py-20 border-y border-white/8 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal><SectionHead kicker="How it works" title="From zero to first match in under a minute" /></Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="p-6 rounded-2xl bg-[#13131c] border border-white/8 h-full">
                <span className="text-xs font-extrabold tracking-widest text-indigo-400">{s.n}</span>
                <h4 className="mt-3 mb-2 text-[17px] font-bold text-white">{s.title}</h4>
                <p className="text-sm text-[#9a9aae] leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════ FEATURES ════════════ */
const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: MessagesSquare, title: 'Public rooms',       body: 'Spin up a room with a category and mood, or jump into existing ones. Live member counts and message history included.' },
  { icon: Users,          title: 'Direct messages',    body: 'Tap anyone in a room to start a private 1-on-1 thread. Conversations sync in real time across devices.' },
  { icon: Sparkles,       title: 'Live presence',      body: 'See who is online, who is typing, and how many people are in a room — updated the instant it changes.' },
  { icon: Bot,            title: 'In-chat AI',         body: 'Type /ai in any room to ask the assistant a question. It reads the recent thread for context before answering.' },
  { icon: VenetianMask,   title: 'Twelve AI personas', body: 'When a bot fills in, it picks from a dozen distinct personalities — each with its own name, voice, and quirks.' },
  { icon: Trophy,         title: 'Leaderboard',        body: 'Every match feeds your score and streak. Climb the rankings across all five games.' },
  { icon: ShieldCheck,    title: 'Secure by default',  body: 'JWT auth with refresh tokens, rate limiting, and httpOnly sessions keep your account locked down.' },
  { icon: Zap,            title: 'Instant matching',   body: 'A human-first queue pairs you with real players in seconds, with a graceful AI fallback so you never wait.' },
];

export function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionHead
            kicker="Features"
            title="A full real-time chat platform"
            sub="Everything you expect from a modern chat app — plus the games that make it worth showing up."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 60}>
              <article className="p-5 rounded-2xl bg-[#13131c] border border-white/8 hover:-translate-y-1 hover:border-white/14 transition-all h-full">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center mb-3">
                  <f.icon size={17} />
                </div>
                <h4 className="font-bold text-white text-sm mb-1.5">{f.title}</h4>
                <p className="text-xs text-[#9a9aae] leading-relaxed">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════ REALTIME BAND ════════════ */
export function Realtime() {
  return (
    <section className="py-20 border-y border-white/8 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <SectionHead
            kicker="Built on websockets"
            title="Everything updates the moment it happens"
            sub="Messages, typing indicators, presence, game turns, and the leaderboard all stream over a live socket connection."
          />
          <ul className="mt-4 space-y-3">
            {['Sub-second message delivery', 'Typing & online indicators', 'Turn-locked, race-safe game state'].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-sm text-[#c4c4d4]">
                <Check size={14} className="text-emerald-400 shrink-0" /> {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-2xl bg-[#13131c] border border-white/10 p-5 shadow-2xl">
            {/* Mock chat messages */}
            <div className="flex flex-col gap-3">
              <MsgRow them text="Anyone up for a debate round?" color="from-pink-400 to-purple-400" />
              <div className="flex justify-end">
                <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-sm text-white">
                  Always. Loser admits pineapple belongs on pizza
                </div>
              </div>
              <MsgRow them typing color="from-emerald-400 to-sky-400" />
            </div>
            {/* Presence bar */}
            <div className="mt-4 pt-3.5 border-t border-white/8 flex items-center gap-2 text-xs text-[#9a9aae]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60 animate-pulse" />
              3 online · 2 typing
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MsgRow({ them, text, typing, color }: { them?: boolean; text?: string; typing?: boolean; color: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className={`w-7 h-7 rounded-full shrink-0 bg-gradient-to-br ${color}`} />
      <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#0a0a0f] border border-white/8 text-sm text-[#ededf2]">
        {typing ? (
          <div className="flex gap-1 items-center py-0.5">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#9a9aae] animate-bounce" style={{ animationDelay: `${d}ms`, animationDuration: '1s' }} />
            ))}
          </div>
        ) : text}
      </div>
    </div>
  );
}

/* ════════════ LEADERBOARD TEASE ════════════ */
export function LeaderboardTease() {
  const rows = [
    { rank: 1, name: 'velvet_turing',   score: 4820, streak: 11, medal: '🥇' },
    { rank: 2, name: 'not_a_robot_99',  score: 4510, streak: 7,  medal: '🥈' },
    { rank: 3, name: 'mira.exe',        score: 4390, streak: 5,  medal: '🥉' },
  ];
  return (
    <section id="leaderboard" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionHead
            kicker="Leaderboard"
            title="Points, streaks, and bragging rights"
            sub="Win matches and fool opponents to climb. Streaks multiply your gains."
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="max-w-2xl rounded-2xl border border-white/10 overflow-hidden bg-[#13131c]">
            {/* Header */}
            <div className="grid grid-cols-[60px_1fr_80px_100px] gap-4 px-5 py-3 bg-white/2 border-b border-white/8 text-[11px] uppercase tracking-wider text-[#9a9aae]">
              <span>Rank</span><span>Player</span><span>Streak</span><span className="text-right">Score</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.rank}
                className={`grid grid-cols-[60px_1fr_80px_100px] gap-4 px-5 py-4 border-b border-white/6 text-sm items-center ${r.rank === 1 ? 'bg-amber-400/5' : ''}`}
              >
                <span className="text-lg">{r.medal}</span>
                <span className="font-semibold text-white">@{r.name}</span>
                <span className="text-amber-400 text-xs font-medium">🔥 {r.streak}</span>
                <span className="text-right font-extrabold text-white tabular-nums">{r.score.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-4 text-sm text-[#9a9aae]">
              <span>Your spot is empty.</span>
              <Link href="/register" className="flex items-center gap-1.5 text-indigo-400 font-semibold no-underline hover:text-indigo-300">
                Claim it <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════ FINAL CTA ════════════ */
export function FinalCTA() {
  return (
    <section className="relative py-24 text-center overflow-hidden border-t border-white/8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: 'radial-gradient(ellipse at center, #6366f1, transparent 60%)', filter: 'blur(40px)' }}
      />
      <div className="relative max-w-3xl mx-auto px-6">
        <Reveal>
          <h2 className="text-5xl font-extrabold tracking-tight text-white">
            One conversation.{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              One guess.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-4 text-lg text-[#9a9aae]">
            Jump into a match right now. Free, in your browser, no setup.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-xl shadow-indigo-500/30 hover:-translate-y-0.5 transition-transform no-underline"
            >
              Create your account <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/15 text-white font-semibold hover:bg-white/5 transition-colors no-underline"
            >
              I already play
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════ FOOTER ════════════ */
export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-white/[0.012] py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap justify-between gap-10 mb-10">
          <div className="flex items-center gap-2.5 font-bold text-white text-base">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">T</span>
            TuringChat
          </div>
          <div className="grid grid-cols-3 gap-12">
            {[
              { h: 'Play',    links: [['#games','Games'],['#leaderboard','Leaderboard'],['/register','Sign up']] },
              { h: 'Learn',   links: [['#how','How it works'],['#features','Features']] },
              { h: 'Account', links: [['/login','Log in'],['/register','Register']] },
            ].map((col) => (
              <div key={col.h}>
                <h5 className="text-[11px] uppercase tracking-wider text-[#9a9aae] mb-3 font-semibold">{col.h}</h5>
                {col.links.map(([href, label]) => (
                  <a key={label} href={href} className="block text-sm text-[#c4c4d4] hover:text-white mb-2 no-underline transition-colors">{label}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="pt-6 border-t border-white/8 flex items-center justify-between text-xs text-[#9a9aae]">
          <span>© {new Date().getFullYear()} TuringChat. A real-time game of human vs machine.</span>
          <a href="#" className="text-[#9a9aae] hover:text-white transition-colors"><Github size={15} /></a>
        </div>
      </div>
    </footer>
  );
}
