import Link from 'next/link';
import { Brain, Pencil, Zap, VenetianMask, Search, ArrowRight, type LucideIcon } from 'lucide-react';
import { Reveal } from './Reveal';

interface Game { icon: LucideIcon; name: string; tag: string; desc: string; color: string; }

const GAMES: Game[] = [
  { icon: Brain,        name: 'Turing Game',        tag: 'flagship',    desc: '60 seconds of chat with a stranger. Then call it: human or AI? Fool them, catch the bot.',          color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-300' },
  { icon: Pencil,       name: 'Word Forge',          tag: '2 players',   desc: 'Build a story one word at a time. An AI judge scores creativity when you hit 30 words.',            color: 'from-indigo-500/15 to-sky-500/10 border-indigo-500/20 text-indigo-300' },
  { icon: Zap,          name: 'Rapid Fire Debate',   tag: '4 rounds',    desc: 'Random topic, random side. 30-second rounds. The judge picks a winner.',                           color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300' },
  { icon: VenetianMask, name: 'Imposter Prompt',     tag: 'bluff',       desc: 'You both share a secret word. Trade clues without saying it. Slip up once — instant loss.',       color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300' },
  { icon: Search,       name: 'AI Interrogation',    tag: '5 questions', desc: 'Grill your opponent with five questions, then make the call. Human or machine?',                  color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-300' },
];

export function Games() {
  const [hero, ...rest] = GAMES;
  return (
    <section id="games" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionHead
            kicker="The games"
            title="Five ways to test who's real"
            sub="Every mode is live and multiplayer. Match a human in seconds — or face one of twelve AI personas."
          />
        </Reveal>

        {/* Hero game card */}
        <Reveal delay={80}>
          <div className={`flex gap-5 p-7 rounded-2xl border bg-gradient-to-br ${hero.color} mb-5`}>
            <div className="w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
              <hero.icon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">{hero.name}</h3>
                <Chip>{hero.tag}</Chip>
              </div>
              <p className="text-[#9a9aae] text-sm leading-relaxed max-w-xl mb-4">{hero.desc}</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white no-underline hover:-translate-y-0.5 transition-transform"
              >
                Play now <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Grid of remaining games */}
        <div className="grid md:grid-cols-2 gap-4">
          {rest.map((g, i) => (
            <Reveal key={g.name} delay={100 + i * 60}>
              <article className={`p-5 rounded-2xl border bg-gradient-to-br ${g.color} hover:-translate-y-1 transition-transform`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center ${g.color.split(' ').find(c => c.startsWith('text-'))}`}>
                    <g.icon size={18} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-[15px]">{g.name}</h4>
                    <Chip>{g.tag}</Chip>
                  </div>
                </div>
                <p className="text-[#9a9aae] text-sm leading-relaxed">{g.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/8 border border-white/12 text-[#c7c7e6]">
      {children}
    </span>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">{kicker}</p>
      <h2 className="text-4xl font-extrabold tracking-tight text-white">{title}</h2>
      {sub && <p className="mt-3 text-[#9a9aae] text-base leading-relaxed">{sub}</p>}
    </div>
  );
}

export { SectionHead };
