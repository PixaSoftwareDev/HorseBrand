/**
 * Section marker driver.
 *
 * Reads the JSON list of sections off the marker element (server-rendered
 * by `SectionMarker.astro` with locale-correct labels), then on every
 * scroll tick picks the section whose vertical span currently contains the
 * viewport mid-line. When the active section changes, the marker's number
 * + name fade out, swap, and fade back in via the `.is-swapping` modifier.
 *
 * Why a manual scroll-coupled query instead of IntersectionObserver
 * ----------------------------------------------------------------
 * IO with a tall rootMargin (e.g. `-49% 0 -49% 0`) does conceptually the
 * same thing — fires when an element crosses the centre band — but on a
 * 22 000 px page with 10 sections, the boundary between two adjacent
 * sections sits exactly at the band edge. IO is jittery there: scrolling
 * past it can fire `intersect=true` for the new section before
 * `intersect=false` for the old one, giving us a moment of "two sections
 * active". A direct query (the section whose `top <= probe < bottom`) is
 * deterministic.
 *
 * Cost is bounded: ~10 `getBoundingClientRect()` calls per scroll-rAF
 * tick. Profiled at <0.2 ms on a 1440×900 viewport, negligible compared
 * to the Lenis ticker and ScrollTrigger.update budget already in place.
 *
 * Dark-background sections
 * ------------------------
 * The marker palette flips to ivory when the active section is one of
 * the dark editorial moments (currently `#patrimonio`). The flip is
 * driven by adding `.section-marker--dark` to `<body>`, which the CSS in
 * SectionMarker.astro picks up via a `:global(body.section-marker--dark)`
 * descendant rule. Add IDs to `DARK_SECTIONS` below to extend the list.
 */

interface SectionEntry {
  id: string;
  num: string;
  label: string;
}

// Heritage solía ser dark (--color-ink bg) y el marker se invertía para
// que se leyera en cream sobre el fondo oscuro. Ahora Heritage también
// es paper canvas como el resto del home, así que ninguna sección
// requiere el flip del marker. Si en el futuro vuelve alguna sección
// dark (e.g. un hero secundario), agregás su id a este Set.
const DARK_SECTIONS = new Set<string>([]);

export function initSectionMarker(): void {
  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (window.matchMedia("(hover: none)").matches) return;

  const marker = document.getElementById("sectionMarker");
  const numEl = document.getElementById("sectionMarkerNum");
  const nameEl = document.getElementById("sectionMarkerName");
  if (!marker || !numEl || !nameEl) return;

  let sections: SectionEntry[] = [];
  try {
    sections = JSON.parse(marker.dataset.sections ?? "[]");
  } catch {
    return;
  }
  if (!sections.length) return;

  // Resolve each section's DOM element once; sections without a matching
  // element are dropped silently (e.g. a 404 layout missing most ids).
  const resolved = sections
    .map((s) => ({ ...s, el: document.getElementById(s.id) }))
    .filter((s): s is SectionEntry & { el: HTMLElement } => Boolean(s.el));
  if (!resolved.length) return;

  let currentIdx = -1;
  let swapTimer: number | null = null;

  const apply = (idx: number): void => {
    if (idx === currentIdx) return;
    const next = idx >= 0 ? resolved[idx] : null;

    if (next === null) {
      // Leaving the marker-eligible range altogether (back to Hero).
      marker.classList.remove("is-visible");
      document.body.classList.remove("section-marker--dark");
      currentIdx = -1;
      return;
    }

    // Brief fade-out → swap text → fade back in. Times match the
    // 0.35s opacity transition in SectionMarker.astro.
    marker.classList.add("is-swapping");
    if (swapTimer !== null) window.clearTimeout(swapTimer);
    swapTimer = window.setTimeout(() => {
      numEl.textContent = next.num;
      nameEl.textContent = next.label;
      document.body.classList.toggle(
        "section-marker--dark",
        DARK_SECTIONS.has(next.id)
      );
      marker.classList.remove("is-swapping");
      marker.classList.add("is-visible");
      swapTimer = null;
    }, 220);

    currentIdx = idx;
  };

  const probe = (): number => window.innerHeight * 0.5;

  const findActive = (): number => {
    const y = probe();
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i].el.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) return i;
    }
    return -1;
  };

  let rafId: number | null = null;
  const queue = (): void => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      apply(findActive());
    });
  };

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });

  // Initial paint — pick whatever section currently covers the probe so
  // the marker is correct on a deep-link / page reload at any scroll
  // position. If the user is at Hero the function returns -1 and the
  // marker stays hidden.
  apply(findActive());

  document.addEventListener(
    "astro:before-swap",
    () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (swapTimer !== null) window.clearTimeout(swapTimer);
      document.body.classList.remove("section-marker--dark");
    },
    { once: true }
  );
}
