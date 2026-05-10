/**
 * Resilient init wrapper for Astro 5 + <ClientRouter />.
 *
 * Problem this solves
 * -------------------
 * In `astro dev`, scripts are served by Vite ad-hoc and the listener for
 * `astro:page-load` is registered BEFORE the ClientRouter dispatches it on
 * the initial page load. Everything wires up correctly.
 *
 * In production (`astro build` → Vercel static), `<script>` tags become
 * bundled deferred ES modules. Depending on network and parsing order, the
 * initial `astro:page-load` event can fire BEFORE our listener attaches,
 * which leaves the page in its un-hydrated baseline state:
 *   - elements with `clip-path: inset(100% 0 0 0)` stay clipped,
 *   - elements with `opacity: 0` stay invisible,
 *   - the Hero slideshow + cursor parallax never start,
 *   - the Craft sticky-pin RAF never starts,
 *   - the IntroSplash never dismisses (so `body.intro-done` never lands and
 *     the Hero title / CTA keyframes never fire).
 *
 * Mirrors what `PageLoader.astro` already does manually (call immediately
 * AND register for the event) — generalised here.
 *
 * Behaviour
 * ---------
 *  1. Runs `fn` once on initial page load — either immediately if the DOM
 *     is already parsed, or on `DOMContentLoaded`.
 *  2. Runs `fn` again on every `astro:page-load` (ClientRouter swap).
 *  3. Guarantees AT MOST ONE invocation per page lifecycle: a `cycleId`
 *     advances on `astro:before-swap`, so we never double-wire the same
 *     page even if both the initial path and the event fire in the same tick.
 *
 * The wrapped `fn` should still be idempotent at the element level (set
 * `data-wired` flags, unobserve before re-observing, etc.) for resilience.
 */
export function onPageReady(fn: () => void): void {
  let cycleId = 0;
  let ranCycle = -1;

  const run = (): void => {
    if (ranCycle === cycleId) return;
    ranCycle = cycleId;
    try {
      fn();
    } catch (err) {
      // Swallow so a failure in one wire-up doesn't block the others.
      console.error("[onPageReady] init failed:", err);
    }
  };

  // Bump the cycle on every navigation so the next page-load can re-run.
  document.addEventListener("astro:before-swap", () => {
    cycleId++;
  });

  // Primary path — works for both ClientRouter swaps and (usually) the
  // initial load when the listener attaches in time.
  document.addEventListener("astro:page-load", run);

  // Fallback path — guarantees the initial load fires even when the
  // listener attaches AFTER `astro:page-load` was already dispatched.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    // Defer one microtask so any `astro:page-load` listener in the same
    // bundle that registered first still wins the race naturally.
    queueMicrotask(run);
  }
}
