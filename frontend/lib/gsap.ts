import { gsap } from 'gsap';

/**
 * Minimal, targeted GSAP usage as required:
 *  - message stagger
 *  - score counter
 *  - reveal screen drama
 *  - page transitions
 *
 * We do NOT register ScrollTrigger or other heavy plugins.
 */

export function fadeInUp(el: Element | null, delay = 0): gsap.core.Tween | null {
  if (!el) return null;
  return gsap.fromTo(
    el,
    { y: 12, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', delay }
  );
}

export function staggerIn(els: ArrayLike<Element>): gsap.core.Tween | null {
  if (!els || els.length === 0) return null;
  return gsap.fromTo(
    els,
    { y: 10, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out', stagger: 0.05 }
  );
}

export function countUp(el: Element | null, from: number, to: number): void {
  if (!el) return;
  const obj = { v: from };
  gsap.to(obj, {
    v: to,
    duration: 1.0,
    ease: 'power2.out',
    onUpdate: () => {
      (el as HTMLElement).textContent = String(Math.round(obj.v));
    },
  });
}

export function dramaReveal(el: Element | null): void {
  if (!el) return;
  gsap.fromTo(
    el,
    { scale: 0.4, opacity: 0, rotationY: -30 },
    {
      scale: 1,
      opacity: 1,
      rotationY: 0,
      duration: 0.9,
      ease: 'expo.out',
    }
  );
}

export { gsap };
