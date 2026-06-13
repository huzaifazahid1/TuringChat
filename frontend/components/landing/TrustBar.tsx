import { Reveal } from './Reveal';

export function TrustBar() {
  const stats = [
    { v: '5',   l: 'live game modes' },
    { v: '12',  l: 'AI personas' },
    { v: '60s', l: 'per Turing match' },
    { v: '15s', l: 'AI fallback time' },
  ];
  return (
    <section className="border-y border-white/8 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
        {stats.map((s) => (
          <Reveal key={s.l} className="text-center">
            <p className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
              {s.v}
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-[#9a9aae]">{s.l}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
