/**
 * Image reveal driven by scroll position.
 * Applies a CSS variable `--reveal-bottom` (100% → 0%) to every element
 * with the `data-scroll-reveal` attribute as it enters the viewport.
 *
 * Usage:
 *   <div data-scroll-reveal>...</div>
 * + global CSS:
 *   [data-scroll-reveal] {
 *     clip-path: inset(0 0 var(--reveal-bottom, 100%) 0);
 *   }
 */
export function initScrollReveal(): void {
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>("[data-scroll-reveal]")
  );
  if (!targets.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((el) => el.style.setProperty("--reveal-bottom", "0%"));
    return;
  }

  let raf: number | null = null;

  function update(): void {
    const vh = window.innerHeight;
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      // Start: top of element enters the bottom of viewport (rect.top === vh)
      // End:   top of element reaches 45% of viewport (image fully revealed)
      const start = vh;
      const end = vh * 0.45;
      const span = start - end;
      const passed = start - rect.top;
      const progress = Math.max(0, Math.min(1, passed / span));
      el.style.setProperty(
        "--reveal-bottom",
        ((1 - progress) * 100).toFixed(1) + "%"
      );
    }
    raf = null;
  }

  function kick(): void {
    if (raf === null) raf = requestAnimationFrame(update);
  }

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  kick();

  // initScrollReveal() runs again on every astro:page-load (SPA nav), so
  // remove the scroll/resize listeners before the swap to avoid stacking
  // duplicates that all fire on the same event.
  document.addEventListener(
    "astro:before-swap",
    () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    },
    { once: true }
  );
}
