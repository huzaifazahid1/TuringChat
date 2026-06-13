'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, Mail, Lock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, setTokens } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { connectSockets } from '@/lib/socket';

const Schema = z.object({
  identifier: z.string().min(3, 'Enter your username or email'),
  password: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof Schema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(Schema) });

  const onSubmit = async (values: FormValues) => {
    setErr(null);
    try {
      const r = await api.post('/auth/login', values);
      setTokens(r.data.accessToken, r.data.refreshToken);
      setUser(r.data.user);
      connectSockets();
      router.replace('/home');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed';
      setErr(msg);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-game-grid px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/15 glow-accent">
            <MessageSquare size={28} className="text-[var(--color-accent)]" />
          </div>
          <h1 className="mt-4 text-3xl font-bold">
            Turing<span className="text-[var(--color-accent)]">Chat</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Welcome back. Time to spot some AIs.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-6 space-y-4"
        >
          <Input
            label="Username or Email"
            placeholder="alex_j"
            leftIcon={<Mail size={16} />}
            error={errors.identifier?.message}
            {...register('identifier')}
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
            Sign in
          </Button>

          <p className="text-center text-xs text-[var(--color-text-secondary)]">
            New here?{' '}
            <Link href="/register" className="font-semibold text-[var(--color-accent)] hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
