/**
 * DiceBear v9 HTTP API helper.
 * Verified URL format (May 2026):
 *   https://api.dicebear.com/9.x/<style>/svg?seed=<seed>&...
 *
 * Note: we use the URL directly as <img src=>; no npm package needed.
 */

export type DiceBearStyle =
  | 'avataaars'
  | 'avataaars-neutral'
  | 'bottts'         // robotic - used for AI bots
  | 'bottts-neutral'
  | 'lorelei'
  | 'identicon'
  | 'shapes';

const DEFAULT_STYLE: DiceBearStyle = 'avataaars';
const BASE = 'https://api.dicebear.com/9.x';

interface AvatarOptions {
  style?: DiceBearStyle;
  size?: number;
  backgroundColor?: string[]; // hex without # prefix
  radius?: number;
}

export function getAvatarUrl(seed: string, opts: AvatarOptions = {}): string {
  const style = opts.style || DEFAULT_STYLE;
  const params = new URLSearchParams();
  params.set('seed', seed || 'anon');
  if (opts.size) params.set('size', String(opts.size));
  if (opts.radius !== undefined) params.set('radius', String(opts.radius));
  if (opts.backgroundColor && opts.backgroundColor.length) {
    params.set('backgroundColor', opts.backgroundColor.join(','));
  }
  return `${BASE}/${style}/svg?${params.toString()}`;
}

export function getBotAvatarUrl(seed = 'turingbot'): string {
  return getAvatarUrl(seed, {
    style: 'bottts',
    backgroundColor: ['6366f1', '4f46e5', '7c3aed'],
  });
}
