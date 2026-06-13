'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/**
 * Compatibility page: old links and the "DM this user" buttons land here.
 * We resolve the userId → threadId via POST /dms/with/:userId, then redirect.
 */
export default function StartDMPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params.userId) return;
    api
      .post(`/dms/with/${params.userId}`)
      .then((r) => router.replace(`/dms/${r.data.thread.id}`))
      .catch(() => router.replace('/dms'));
  }, [params.userId, router]);

  return (
    <div className="flex h-screen items-center justify-center text-[var(--color-text-secondary)]">
      Opening conversation…
    </div>
  );
}
