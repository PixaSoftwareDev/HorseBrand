import { lenisScrollTo } from "./lenis";

export function initCursor(): void {
  if (window.matchMedia("(hover: none)").matches) return;
  const cursor = document.getElementById("cursor");
  const dot = document.getElementById("cursorDot");
  if (!cursor || !dot) return;

  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  let tx = cx;
  let ty = cy;

  window.addEventListener("pointermove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
  });

  function loop(): void {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    cursor!.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  // Generic hover state — slightly bigger ring with a cognac border over
  // any interactive element.
  const hoverables = document.querySelectorAll<HTMLElement>(
    "a, button, .gal, [data-cursor-hover]"
  );
  hoverables.forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("hover"));
  });
}

export function initNavScrollState(): void {
  const nav = document.getElementById("nav");
  if (!nav) return;

  // Observe the Hero. While ANY part of the Hero is in the viewport, the
  // nav stays in its transparent over-photo state. Once the Hero scrolls
  // out of view, the nav switches to its cream + blur "scrolled" state.
  // This way the nav background never covers the Hero photo while the
  // user is still looking at the portada — it only kicks in once they're
  // visually inside the next section.
  //
  // EXCEPTION: while the Hero pin is active (`.is-pinning` on .hero, set
  // by heroExit.ts when pin progress > 0.05), heroExit owns the nav
  // state — it runs the ink→paper canvas swap and decides when the
  // cream nav should land/leave with hysteresis. If we toggled here too,
  // the IO would race heroExit on the way UP from the manifesto: hero
  // re-enters viewport while p is still ~1, IO would yank `scrolled`
  // off immediately, and the user would see white nav text on the
  // (still paper-coloured) canvas during the whole diptych phase.
  // Bailing out while the pin is active hands full control to heroExit
  // for that window; outside the pin (top of page, post-hero pages,
  // mobile) the IO continues to work exactly as before.
  const hero = document.querySelector<HTMLElement>(".hero");

  if (hero && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (hero.classList.contains("is-pinning")) return;
        if (entry.isIntersecting) nav.classList.remove("scrolled");
        else nav.classList.add("scrolled");
      },
      { threshold: 0 }
    );
    io.observe(hero);
    document.addEventListener("astro:before-swap", () => io.disconnect(), {
      once: true,
    });
    return;
  }

  // Fallback for pages without a Hero (e.g. 404) or older browsers
  // without IntersectionObserver: simple scroll-distance threshold.
  const onScroll = (): void => {
    if (window.scrollY > 60) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  // Mirror the IntersectionObserver branch's cleanup so the fallback
  // listener doesn't accumulate across SPA navigations.
  document.addEventListener(
    "astro:before-swap",
    () => window.removeEventListener("scroll", onScroll),
    { once: true }
  );
}

export function initSmoothAnchors(): void {
  // Routed through lenisScrollTo so anchor jumps share the same easing as
  // the global wheel-scroll. The helper falls back to native smooth scroll
  // when Lenis is not active (reduced-motion users).
  //
  // We accept both bare hash links (`#manifiesto`) and same-page links
  // that carry a locale prefix (`/#top`, `/es/#coleccion`). The nav logo
  // uses the second form via `localizedPath(lang, "/") + "#top"`, which
  // the previous `a[href^="#"]` selector silently skipped — clicks fell
  // through to the browser's native anchor scroll, which lands on the
  // .hero element's document position (currently ~1125 px because
  // ScrollTrigger pins it inside a pin-spacer), not on scrollY 0.
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href) return;

      // Only intercept same-page hash links. Skip external, mailto,
      // protocol-relative, and cross-page navigation.
      const hashIdx = href.indexOf("#");
      if (hashIdx < 0) return;
      // Path before the hash must be empty, "/", or the current pathname.
      const path = href.slice(0, hashIdx);
      const isSamePage =
        path === "" ||
        path === "/" ||
        path === window.location.pathname ||
        path === window.location.pathname.replace(/\/$/, "");
      if (!isSamePage) return;

      const id = href.slice(hashIdx); // e.g. "#top"
      if (id.length <= 1) return;

      e.preventDefault();

      // `#top` means "top of the page" by convention — but the .hero
      // element that carries id="top" is the trigger of a GSAP pin with
      // `pinSpacing: true`. After ScrollTrigger wraps it, the element's
      // document position is at the END of the pin-spacer (~1125 px),
      // not at scrollY 0. So `lenisScrollTo(.hero, -60)` would land in
      // the middle of the diptych close (brand moment), not at the
      // portada. Special-case `#top` to go to scrollY 0 directly so a
      // logo click always returns the user to the very first frame of
      // the Hero — the two halves, full size, fresh slideshow.
      if (id === "#top") {
        lenisScrollTo(0);
        return;
      }

      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      lenisScrollTo(target, -60);
    });
  });
}
