// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Modal } from '@/components/ui/Modal';
// import { Button } from '@/components/ui/Button';
// import { Input } from '@/components/ui/Input';
// import { api } from '@/lib/api';
// import { cn } from '@/lib/utils';

// interface Props {
//   open: boolean;
//   onClose: () => void;
//   onCreated?: (roomId: string) => void;
// }

// const CATEGORIES = [
//   { id: 'general', label: 'General', emoji: '💬' },
//   { id: 'tech', label: 'Tech', emoji: '🚀' },
//   { id: 'gaming', label: 'Gaming', emoji: '🎮' },
//   { id: 'science', label: 'Science', emoji: '🔬' },
//   { id: 'music', label: 'Music', emoji: '🎵' },
//   { id: 'sports', label: 'Sports', emoji: '⚽' },
//   { id: 'random', label: 'Random', emoji: '🎲' },
// ] as const;

// const MOODS = [
//   { id: 'chill', label: 'Chill', emoji: '😎' },
//   { id: 'serious', label: 'Serious', emoji: '🧠' },
//   { id: 'funny', label: 'Funny', emoji: '😂' },
//   { id: 'tech', label: 'Tech', emoji: '💻' },
//   { id: 'creative', label: 'Creative', emoji: '🎨' },
//   { id: 'debate', label: 'Debate', emoji: '⚡' },
// ] as const;

// const ICONS = ['💬', '🚀', '🎮', '🔬', '🎵', '⚽', '🎲', '🌌', '🍕', '☕', '🔥', '🎬', '📚', '🐈', '🤖'];

// export function CreateRoomModal({ open, onClose, onCreated }: Props) {
//   const router = useRouter();
//   const [name, setName] = useState('');
//   const [description, setDescription] = useState('');
//   const [category, setCategory] = useState<typeof CATEGORIES[number]['id']>('general');
//   const [mood, setMood] = useState<typeof MOODS[number]['id']>('chill');
//   const [icon, setIcon] = useState('💬');
//   const [submitting, setSubmitting] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const reset = () => {
//     setName('');
//     setDescription('');
//     setCategory('general');
//     setMood('chill');
//     setIcon('💬');
//     setErr(null);
//   };

//   const close = () => {
//     if (submitting) return;
//     reset();
//     onClose();
//   };

//   const submit = async () => {
//     setErr(null);
//     if (name.trim().length < 2) {
//       setErr('Name must be at least 2 characters');
//       return;
//     }
//     setSubmitting(true);
//     try {
//       const r = await api.post('/rooms', {
//         name: name.trim(),
//         description: description.trim(),
//         category,
//         mood,
//         icon,
//       });
//       const newId: string = r.data.room.id;
//       reset();
//       onClose();
//       onCreated?.(newId);
//       router.push(`/chat/${newId}`);
//     } catch (e: unknown) {
//       const msg =
//         (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
//         'Could not create room';
//       setErr(msg);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <Modal open={open} onClose={close} title="Create a room">
//       <div className="space-y-4">
//         <div className="flex items-center gap-3">
//           <button
//             type="button"
//             onClick={() => {
//               const next = ICONS[(ICONS.indexOf(icon) + 1) % ICONS.length];
//               setIcon(next);
//             }}
//             className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)] text-2xl border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]"
//             title="Click to cycle icon"
//           >
//             {icon}
//           </button>
//           <div className="flex-1">
//             <Input
//               label="Room name"
//               placeholder="General Chat"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               maxLength={50}
//             />
//           </div>
//         </div>

//         <div>
//           <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
//             Description (optional)
//           </label>
//           <textarea
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             maxLength={200}
//             rows={2}
//             placeholder="What's this room about?"
//             className="w-full resize-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
//           />
//         </div>

//         <div>
//           <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Category</p>
//           <div className="flex flex-wrap gap-2">
//             {CATEGORIES.map((c) => (
//               <button
//                 key={c.id}
//                 type="button"
//                 onClick={() => setCategory(c.id)}
//                 className={cn(
//                   'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
//                   category === c.id
//                     ? 'bg-[var(--color-accent)] text-white'
//                     : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
//                 )}
//               >
//                 {c.emoji} {c.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         <div>
//           <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Mood</p>
//           <div className="flex flex-wrap gap-2">
//             {MOODS.map((m) => (
//               <button
//                 key={m.id}
//                 type="button"
//                 onClick={() => setMood(m.id)}
//                 className={cn(
//                   'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
//                   mood === m.id
//                     ? 'bg-[var(--color-accent)] text-white'
//                     : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
//                 )}
//               >
//                 {m.emoji} {m.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {err && (
//           <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
//             {err}
//           </p>
//         )}

//         <div className="flex gap-2 pt-2">
//           <Button variant="secondary" onClick={close} disabled={submitting} fullWidth>
//             Cancel
//           </Button>
//           <Button onClick={submit} loading={submitting} fullWidth>
//             Create room
//           </Button>
//         </div>
//       </div>
//     </Modal>
//   );
// }














'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (roomId: string) => void;
}

const CATEGORIES = [
  { id: 'general', label: 'General', emoji: '💬' },
  { id: 'tech', label: 'Tech', emoji: '🚀' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'random', label: 'Random', emoji: '🎲' },
] as const;

const MOODS = [
  { id: 'chill', label: 'Chill', emoji: '😎' },
  { id: 'serious', label: 'Serious', emoji: '🧠' },
  { id: 'funny', label: 'Funny', emoji: '😂' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'debate', label: 'Debate', emoji: '⚡' },
] as const;

const ICONS = ['💬', '🚀', '🎮', '🔬', '🎵', '⚽', '🎲', '🌌', '🍕', '☕', '🔥', '🎬', '📚', '🐈', '🤖'];

export function CreateRoomModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['id']>('general');
  const [mood, setMood] = useState<typeof MOODS[number]['id']>('chill');
  const [icon, setIcon] = useState('💬');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setDescription('');
    setCategory('general');
    setMood('chill');
    setIcon('💬');
    setErr(null);
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2) {
      setErr('Name must be at least 2 characters');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post('/rooms', {
        name: name.trim(),
        description: description.trim(),
        category,
        mood,
        icon,
      });
      const newId: string = r.data.room.id;
      reset();
      onClose();
      onCreated?.(newId);
      router.push(`/chat/${newId}`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Could not create room';
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Create a room">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const next = ICONS[(ICONS.indexOf(icon) + 1) % ICONS.length];
              setIcon(next);
            }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-elevated)] text-2xl border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]"
            title="Click to cycle icon"
          >
            {icon}
          </button>
          <div className="flex-1">
            <Input
              label="Room name"
              placeholder="General Chat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="What's this room about?"
            className="w-full resize-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  category === c.id
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                )}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Mood</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMood(m.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  mood === m.id
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                )}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {err && (
          <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
            {err}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={close} disabled={submitting} fullWidth>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} fullWidth>
            Create room
          </Button>
        </div>
      </div>
    </Modal>
  );
}
