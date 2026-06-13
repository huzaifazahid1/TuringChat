'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, AtSign, Mail, Lock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { api, setTokens } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { connectSockets } from '@/lib/socket';

const Schema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'Only letters, numbers, underscore'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
});

type FormValues = z.infer<typeof Schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(Schema), defaultValues: { username: '' } });

  const username = watch('username');

  const onSubmit = async (values: FormValues) => {
    setErr(null);
    try {
      const r = await api.post('/auth/register', values);
      setTokens(r.data.accessToken, r.data.refreshToken);
      setUser(r.data.user);
      connectSockets();
      router.replace('/home');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed';
      setErr(msg);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-game-grid px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/15 glow-accent">
            <MessageSquare size={28} className="text-[var(--color-accent)]" />
          </div>
          <h1 className="mt-4 text-3xl font-bold">
            Turing<span className="text-[var(--color-accent)]">Chat</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Create your account. Your avatar is auto-generated.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-6 space-y-4"
        >
          <div className="flex items-center gap-3 rounded-xl bg-[var(--color-bg-elevated)] p-3">
            <Avatar seed={username || 'preview'} size={48} />
            <div className="text-xs">
              <p className="flex items-center gap-1 font-semibold">
                <Sparkles size={12} className="text-[var(--color-accent)]" />
                Live avatar preview
              </p>
              <p className="text-[var(--color-text-muted)]">
                Powered by DiceBear v9 — changes as you type your username.
              </p>
            </div>
          </div>

          <Input
            label="Username"
            placeholder="alex_j"
            leftIcon={<AtSign size={16} />}
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label="Email"
            placeholder="alex@example.com"
            leftIcon={<Mail size={16} />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock size={16} />}
            error={errors.password?.message}
            {...register('password')}
          />

          {err && (
            <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
              {err}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} fullWidth size="lg">
            Create account
          </Button>

          <p className="text-center text-xs text-[var(--color-text-secondary)]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[var(--color-accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
