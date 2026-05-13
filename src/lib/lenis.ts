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
    // Lerp mode (not `duration`): the scroll position continuously
    // interpolates toward the target by `lerp` each frame. This gives the
    // "trailing" feel of Floema / Aesop — the page is always *catching
    // up* to where you scrolled to, instead of running discrete animations
    // per wheel tick. 0.08 is the sweet spot:
    //   - lower (0.04) → very floaty, can feel laggy on long scrolls
    //   - higher (0.15) → almost native, defeats the point
    lerp: 0.08,
    smoothWheel: true,
    // Each wheel tick is amplified slightly so a single wheel notch travels
    // further than native — combined with the lerp easing, this is what
    // creates the "the page drifts with momentum" perception.
    wheelMultiplier: 1.1,
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
  // when the user moves between locale pages. Registered once at module
  // scope (not per-init) so it survives across re-inits and only ever
  // attaches a single handler.
  ensureSwapHandler();
}

let swapHandlerWired = false;
function ensureSwapHandler(): void {
  if (swapHandlerWired) return;
  swapHandlerWired = true;
  document.addEventListener("astro:before-swap", destroyLenis);
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
