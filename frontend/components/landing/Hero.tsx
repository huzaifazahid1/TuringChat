'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Check, Users, Bot } from 'lucide-react';
import { Reveal } from './Reveal';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(ellipse, #6366f1 0%, #a855f7 40%, transparent 70%)', filter: 'blur(80px)' }}
      />

      <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — copy */}
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1.5 rounded-full">
              <Sparkles size={12} /> Real-time chat games powered by AI
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-white">
              Can you tell a{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                human
              </span>{' '}
              from an{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                AI
              </span>
              ?
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-5 text-lg text-[#9a9aae] leading-relaxed max-w-lg">
              TuringChat drops you into 60-second conversations with a stranger —
              sometimes a real person, sometimes a language model wearing a persona.
              Chat, guess, score, climb the leaderboard.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-xl shadow-indigo-500/30 hover:-translate-y-0.5 transition-transform no-underline"
              >
                Start playing <ArrowRight size={15} />
              </Link>
              <a
                href="#games"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors no-underline"
              >
                See the games
              </a>
            </div>
          </Reveal>

          <Reveal delay={310}>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {[
                'No download — plays in the browser',
                'Match a human in seconds, AI as fallback',
                'Free to play',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-[#9a9aae]">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Right — interactive demo */}
        <Reveal delay={200}>
          <GuessDemo />
        </Reveal>
      </div>
    </section>
  );
}

function GuessDemo() {
  const chat = [
    { me: true,  text: 'ok weird opener but — pineapple on pizza, yes or no' },
    { me: false, text: 'lmao straight to the hard questions. soft yes. fight me' },
    { me: true,  text: "respect. what's your go-to comfort movie" },
    { me: false, text: 'shrek 2 unironically. the soundtrack carries my whole personality' },
  ];
  const answer: 'human' | 'ai' = 'ai';
  const [vote, setVote] = useState<null | 'human' | 'ai'>(null);
  const correct = vote === answer;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#13131c] overflow-hidden shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs text-[#9a9aae]">Turing Game · 0:12 left</span>
      </div>

      {/* Chat */}
      <div className="px-4 py-4 flex flex-col gap-2.5">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                m.me
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                  : 'bg-[#1a1a26] border border-white/8 text-[#ededf2] rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {/* Typing indicator */}
        <div className="flex justify-start">
          <div className="bg-[#1a1a26] border border-white/8 px-3.5 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full bg-[#9a9aae] animate-bounce"
                style={{ animationDelay: `${d}ms`, animationDuration: '1s' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Vote / result */}
      <div className="px-4 pb-4">
        {vote === null ? (
          <>
            <p className="text-center text-xs text-[#9a9aae] mb-3">Human or AI?</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setVote('human')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a26] border border-white/10 text-sm font-semibold text-white hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all"
              >
                <Users size={15} /> Human
              </button>
              <button
                onClick={() => setVote('ai')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a26] border border-white/10 text-sm font-semibold text-white hover:border-amber-400/50 hover:bg-amber-400/10 transition-all"
              >
                <Bot size={15} /> AI
              </button>
            </div>
          </>
        ) : (
          <div className="text-center animate-in fade-in duration-300">
            <p className={`font-semibold text-sm mb-1 ${correct ? 'text-emerald-400' : 'text-rose-400'}`}>
              {correct ? '✓ You got it!' : '✗ Gotcha.'}
            </p>
            <p className="text-sm text-[#9a9aae] mb-3">
              It was <strong className="text-amber-400">{answer === 'ai' ? 'an AI' : 'a human'}</strong>. In the real game you only get 60 seconds.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white no-underline hover:-translate-y-0.5 transition-transform"
            >
              Try the real thing <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
