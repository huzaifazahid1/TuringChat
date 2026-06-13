'use client';

import { Brain, Pencil, Zap, VenetianMask, Search } from 'lucide-react';
import { GameCard } from '@/components/games/GameCard';

export default function GamesLobbyPage() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Games</h1>
        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
          Live multiplayer mind games. Match with another human, or face the AI.
        </p>

        {/* Hero */}
        <GameCard
          hero
          href="/games/turing"
          title="Turing Game"
          description="60 seconds of chat. Then guess: human or AI?"
          icon={Brain}
        />

        <h2 className="mt-8 mb-3 text-lg font-bold">Cognitive Games</h2>
        <div className="space-y-3">
          <GameCard
            href="/games/word-forge"
            title="Word Forge"
            description="Build a story together — one word at a time"
            icon={Pencil}
            accent="indigo"
          />
          <GameCard
            href="/games/debate"
            title="Rapid Fire Debate"
            description="Random topic, random side. Argue and win."
            icon={Zap}
            accent="amber"
          />
          <GameCard
            href="/games/imposter"
            title="Imposter Prompt"
            description="You both share a secret word. Don't say it."
            icon={VenetianMask}
            accent="emerald"
          />
          <GameCard
            href="/games/ai-interrogation"
            title="AI Interrogation"
            description="5 questions. Then decide: human or machine?"
            icon={Search}
            accent="sky"
          />
        </div>
      </div>
    </div>
  );
}