'use client';

import { useState } from 'react';
import { Shuffle, Save, MessageSquare, Gamepad2, Target, Flame } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { api } from '@/lib/api';

const SEED_POOL = [
  'phoenix', 'galaxy', 'nebula', 'storm', 'echo', 'pulse', 'rogue', 'cipher',
  'orbit', 'nova', 'shadow', 'frost', 'ember', 'rune', 'vortex', 'specter',
];

function randomSeed(): string {
  const a = SEED_POOL[Math.floor(Math.random() * SEED_POOL.length)];
  const b = Math.floor(Math.random() * 9999);
  return `${a}-${b}`;
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.avatarSeed || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user) return null;
  const stats = user.stats;
  const accuracy = stats.gamesPlayed > 0 ? Math.round((stats.correctGuesses / stats.gamesPlayed) * 100) : 0;

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await api.patch('/users/me', {
        displayName: displayName.trim() || user.displayName,
        bio: bio.trim(),
        avatarSeed,
      });
      setUser(r.data.user);
      setMsg('Saved!');
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsg('Could not save — try again.');
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    displayName !== user.displayName || bio !== (user.bio || '') || avatarSeed !== user.avatarSeed;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Profile</h1>

        {/* Avatar editor */}
        <Card className="mb-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <Avatar seed={avatarSeed} size={96} ring />
              <button
                onClick={() => setAvatarSeed(randomSeed())}
                className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
              >
                <Shuffle size={12} />
                Regenerate
              </button>
            </div>
            <div className="flex-1 w-full space-y-3">
              <Input
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="Say something about yourself…"
                  className="w-full resize-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                />
                <p className="mt-1 text-right text-[10px] text-[var(--color-text-muted)]">
                  {bio.length}/160
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Username <span className="font-mono text-[var(--color-text-secondary)]">@{user.username}</span> can&apos;t be changed.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={onSave} loading={saving} disabled={!dirty}>
                  <Save size={16} />
                  Save changes
                </Button>
                {msg && <span className="text-xs text-[var(--color-success)]">{msg}</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <h2 className="mb-3 text-lg font-bold">Your stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard icon={MessageSquare} label="Messages" value={stats.totalMessages} />
          <StatsCard icon={Gamepad2} label="Games played" value={stats.gamesPlayed} accent="success" />
          <StatsCard icon={Target} label="Accuracy" value={`${accuracy}%`} accent="warning" />
          <StatsCard icon={Flame} label="Best streak" value={stats.highestStreak} accent="danger" />
        </div>
      </div>
    </div>
  );
}
