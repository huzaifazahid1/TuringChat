/**
 * Plays the in-app notification sound from /public/sounds/notification.mp3.
 * Browsers block autoplay until the user has interacted with the page,
 * so we lazily resolve a single shared <audio> element and wrap play()
 * in a try/catch.
 */

let audio: HTMLAudioElement | null = null;

function ensure(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio('/sounds/notification.mp3');
    audio.preload = 'auto';
    audio.volume = 0.5;
  }
  return audio;
}

export function playNotificationSound(): void {
  const a = ensure();
  if (!a) return;
  try {
    a.currentTime = 0;
    void a.play().catch(() => {
      /* ignore: autoplay blocked until first user gesture */
    });
  } catch {
    /* ignore */
  }
}

export function setMuted(muted: boolean): void {
  const a = ensure();
  if (!a) return;
  a.muted = muted;
}
