/**
 * Lenis + GSAP ScrollTrigger orchestrator.
 *
 * What this gives us
 * ------------------
 * - Smooth-scroll with inertia (Lenis) — every wheel tick becomes an animated
 *   easing curve instead of a 1:1 jump. This is the foundation of the
 *   "envolvente" scroll feel.
 * - A single requestAnimationFrame driver shared between Lenis and GSAP
 *   (`gsap.ticker`). Without this, both libraries run their own rAF and
 *   fight for frame timing, causing jitter on heavy sections.
 * - ScrollTrigger.update wired to Lenis's scroll event so scroll-coupled
 *   timelines stay in sync with the eased scroll position, not the raw
 *   browser scroll.
 *
 * Compatibility notes (verified before integration)
 * -------------------------------------------------
 * - Lenis updates `window.scrollY` natively and emits real `scroll` events,
 *   so existing listeners keep working unchanged:
 *     · Nav.astro / initNavScrollState (toggles .scrolled class)
 *     · scrollReveal.ts (data-scroll-reveal clip-path driver)
 *     · ZoomParallax.tsx → framer-motion useScroll (reads window.scrollY)
 *     · Craft.astro sticky-pin RAF
 *   Gallery and Craft are benchmark-quality and untouchable; they should
 *   pick up the inertia transparently with no code changes.
 * - Anchor links (`<a href="#section">`) previously used native
 *   `window.scrollTo({behavior:'smooth'})` which would fight Lenis's wheel
 *   interception. `initSmoothAnchors` in cursor.ts now routes through
 *   `lenisScrollTo` so anchors use the same easing as wheel scroll.
 * - prefers-reduced-motion: we skip Lenis init entirely; the page falls
 *   back to native scroll, which is what users with that preference want.
 *
 * SPA navigation (Astro ClientRouter)
 * -----------------------------------
 * Lenis is destroyed on `astro:before-swap` and re-initialised on the next
 * `astro:page-load` via the standard onPageReady wrapper. This avoids
 * accumulating multiple rAF tickers and detached scroll listeners.
 */

import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;
let tickerCb: ((time: number) => void) | null = null;

/** Returns the active Lenis instance (or null if reduced-motion / not yet booted). */
export function getLenis(): Lenis | null {
  return lenisInstance;
}

/**
 * Smooth-scroll to a target. Use this instead of `window.scrollTo` from any
 * module that needs to programmatically scroll, so the motion matches the
 * global Lenis easing.
 *
 *  - `target` accepts a number (pixel offset), CSS selector, or HTMLElement
 *  - `offset` (negative) shifts the resting position — e.g. -60 to clear
 *    the fixed nav.
 */
export function lenisScrollTo(
  target: number | string | HTMLElement,
  offset = 0
): void {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset });
    return;
  }
  // Fallback (reduced-motion or pre-init): native smooth scroll.
  let top = 0;
  if (typeof target === "number") top = target + offset;
  else {
    const el =
      typeof target === "string"
        ? document.querySelector<HTMLElement>(target)
        : target;
    if (!el) return;
    top = el.getBoundingClientRect().top + window.scrollY + offset;
  }
  window.scrollTo({ top, behavior: "smooth" });
}

export function initLenis(): void {
  // Honour the user's reduced-motion preference: no inertia, no GSAP ticker.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // SPA re-entry guard. astro:before-swap clears these, but if anyone calls
  // initLenis() twice in the same cycle we don't want two instances.
  if (lenisInstance) return;

  lenisInstance = new Lenis({
    // 1.2s feels editorial — slow enough that motion reads as "designed",
    // fast enough that fast scrolls still feel responsive.
    duration: 1.2,
    // Exponential-out easing. The visible cue: the page glides to a stop
    // instead of snapping to a halt.
    easing: (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Touch is left alone — native momentum scrolling on mobile is already
    // tuned by the OS and overriding it makes the page feel laggy on iOS.
    syncTouch: false,
  });

  // Drive ScrollTrigger off Lenis's eased scroll position so any timeline
  // attached to scroll progress is synced with what the eye actually sees.
  lenisInstance.on("scroll", ScrollTrigger.update);

  // Single rAF: GSAP's ticker runs Lenis's raf. Without this, you get two
  // independent rAF loops fighting for the same frame budget.
  tickerCb = (time: number): void => {
    lenisInstance?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCb);
  // Disable lag smoothing so ScrollTrigger doesn't try to "catch up" after
  // a heavy frame — that catch-up reads as a hitch with smooth scroll.
  gsap.ticker.lagSmoothing(0);

  // Cleanup on SPA navigation so we don't leak rAF tickers or listeners
  // when the user moves between locale pages.
  document.addEventListener(
    "astro:before-swap",
    () => {
      destroyLenis();
    },
    { once: true }
  );
}

function destroyLenis(): void {
  if (tickerCb) {
    gsap.ticker.remove(tickerCb);
    tickerCb = null;
  }
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
}
