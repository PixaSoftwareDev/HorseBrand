/**
 * Hero → Manifesto envolvente — Phase 2 pilot.
 *
 * The brief
 * ---------
 * Today every section animates once on entry and then sits static. Floema-tier
 * sites feel like one continuous film: as you scroll out of section A, it
 * transforms (scrim deepens, content fades, image scales) and section B
 * doesn't just "appear next" — it rises into the same viewport with its own
 * scroll-coupled timeline. This file encodes that grammar for the first
 * Hero → Manifesto handoff so we can validate the direction before
 * applying it across the whole page.
 *
 * What this file does
 * -------------------
 *  1. PIN the Hero for an extra ~120vh of scroll budget. The Hero stays in
 *     the viewport while the user scrolls "through" it. During that pinned
 *     window we scrub three properties:
 *        · .hero__overlay  opacity  →  1     (scrim deepens for cinematic exit)
 *        · .hero__content  opacity  →  0  +  translateY -40px (text floats up & out)
 *        · .hero__split    scale    →  1.08  (the diptych quietly pushes in)
 *     This makes the Hero feel like it's *transforming* as you leave it,
 *     not just scrolling past.
 *
 *  2. Let Manifesto enter as a parallax pair with depth. The text column
 *     and the editorial image travel at different speeds inside the
 *     section's scroll lifetime — text drifts up faster, image lags behind
 *     by ~30%. That tiny speed gap is what reads as "depth" instead of
 *     a flat slab.
 *
 *  3. Reveal the Manifesto title and pull-quote word-by-word with SplitType
 *     + GSAP stagger. The Reveal component already animates the lines as a
 *     block; SplitType breaks them into words so each one rises with a
 *     micro-stagger (35ms) — the cue that says "this site has typography,
 *     not just text".
 *
 * What this file does NOT do
 * --------------------------
 *  - Does NOT touch Hero's existing slideshow timer or cursor parallax.
 *    The clip-path slide transitions and the pointer-driven half drift
 *    are independent of the scroll-out timeline; they coexist on different
 *    transform stacks (.hero__half vs .hero__split / .hero__content).
 *  - Does NOT replace Manifesto's existing Reveal entries — the Reveal
 *    component still handles the eyebrow + body + media wrapper. We add a
 *    second pass on top for the words/parallax.
 *  - Does NOT pin on mobile. Pin behaviour with finger-driven scroll feels
 *    like the page is broken (you swipe and nothing happens for 100vh).
 *    On <900px we keep the parallax + word reveals but skip the pin.
 *  - Does NOT touch Gallery or Craft (benchmark sections, untouchable per
 *    project memory). Their existing scroll logic continues to work
 *    transparently with Lenis.
 *
 * Cleanup contract
 * ----------------
 * All ScrollTriggers and SplitType instances created here are tagged with
 * `id: "hero-exit"` / kept on a module-scope array, so a single call to
 * `destroyHeroExit()` (wired from the SPA `astro:before-swap` hook)
 * tears everything down cleanly when the user navigates between locales.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

let mm: gsap.MatchMedia | null = null;
let splits: SplitType[] = [];

export function initHeroExit(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const hero = document.querySelector<HTMLElement>(".hero");
  const heroOverlay = document.querySelector<HTMLElement>(".hero__overlay");
  const heroContent = document.querySelector<HTMLElement>(".hero__content");
  const heroSplit = document.querySelector<HTMLElement>(".hero__split");
  const manifesto = document.querySelector<HTMLElement>(".manifesto");
  const manifestoText = document.querySelector<HTMLElement>(".manifesto__text");
  // Reveal renders its wrapper with the consumer-provided class (manifesto__media).
  // The inner [data-scroll-reveal] is the image holder — both are usable
  // anchors for parallax; we transform the outer wrapper so the caption
  // beneath the image moves with it as a single visual block.
  const manifestoMediaWrap =
    document.querySelector<HTMLElement>(".manifesto .manifesto__media") ??
    document.querySelector<HTMLElement>(".manifesto [data-scroll-reveal]");

  if (!hero || !manifesto) return;

  // Wait for the IntroSplash to dismiss so the Hero's clip-path entrance
  // animations finish in their own time before scroll-coupling kicks in.
  // Without this, ScrollTrigger snapshots the pre-animation state and the
  // pin starts from a half-revealed Hero.
  const start = (): void => buildTimeline({
    hero,
    heroOverlay,
    heroContent,
    heroSplit,
    manifesto,
    manifestoText,
    manifestoMediaWrap,
  });

  if (document.body.classList.contains("intro-done")) {
    // The IntroSplash has already finished (e.g. SPA re-entry). Defer one
    // frame so any layout-affecting CSS keyframes settle before we measure.
    requestAnimationFrame(start);
  } else {
    window.addEventListener("hb:intro-done", () => requestAnimationFrame(start), {
      once: true,
    });
  }
}

interface Targets {
  hero: HTMLElement;
  heroOverlay: HTMLElement | null;
  heroContent: HTMLElement | null;
  heroSplit: HTMLElement | null;
  manifesto: HTMLElement;
  manifestoText: HTMLElement | null;
  manifestoMediaWrap: HTMLElement | null;
}

function buildTimeline(t: Targets): void {
  // gsap.matchMedia is the canonical way to scope animations to a viewport
  // range. Pin behaviour is desktop-only; mobile gets parallax + word
  // reveals without the pin so finger scroll stays predictable.
  mm = gsap.matchMedia();

  // ---------- DESKTOP (≥901px) — full envolvente ----------
  mm.add("(min-width: 901px)", () => {
    // 1. Hero scroll-out timeline — pin + scrub.
    // The +120% end means the Hero stays pinned for an extra 1.2 viewports
    // of scroll; during that window we scrub the exit transformations.
    const exitTl = gsap.timeline({
      scrollTrigger: {
        id: "hero-exit-pin",
        trigger: t.hero,
        start: "top top",
        end: "+=120%",
        pin: true,
        // pinSpacing keeps the natural document flow — without it, the
        // pinned viewport collapses and Manifesto would jump up under it.
        pinSpacing: true,
        scrub: 0.6, // 0.6s of smoothing — the timeline doesn't snap to
        // every tick, it eases toward the scroll position. Reads as
        // "intentional", not "frame-perfect".
        anticipatePin: 1,
      },
    });

    if (t.heroOverlay) {
      exitTl.to(t.heroOverlay, { opacity: 1, ease: "power2.in" }, 0);
    }
    if (t.heroContent) {
      // OPACITY ONLY on .hero__content — the cursor parallax already owns
      // its `transform` (via CSS vars --ptx/--pty). If GSAP wrote transform
      // here it would override the CSS rule and the cursor parallax would
      // visibly freeze. Opacity is a safe lane: nothing else animates it.
      exitTl.to(t.heroContent, { opacity: 0, ease: "power2.in" }, 0);
    }
    if (t.heroSplit) {
      // Scale on the SPLIT (parent of .hero__half). The cursor parallax
      // translates the half (child) — child transforms compose correctly
      // on top of a scaled parent without fighting it.
      exitTl.to(t.heroSplit, { scale: 1.08, ease: "none" }, 0);
    }

    // 2. Manifesto parallax — text drifts faster than image (depth cue).
    // Each y-shift runs over the section's own scroll lifetime, scrubbed.
    if (t.manifestoText) {
      gsap.fromTo(
        t.manifestoText,
        { y: 80 },
        {
          y: -40,
          ease: "none",
          scrollTrigger: {
            id: "manifesto-text-parallax",
            trigger: t.manifesto,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        }
      );
    }
    if (t.manifestoMediaWrap) {
      gsap.fromTo(
        t.manifestoMediaWrap,
        { y: 120 },
        {
          y: -10,
          ease: "none",
          scrollTrigger: {
            id: "manifesto-media-parallax",
            trigger: t.manifesto,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2, // higher scrub = more lag = depth illusion
          },
        }
      );
    }

    return () => {
      // matchMedia cleanup — kills the timelines and their ScrollTriggers
      // when the viewport leaves this media query (e.g. resize past 900px).
      exitTl.scrollTrigger?.kill();
      exitTl.kill();
      ScrollTrigger.getById("manifesto-text-parallax")?.kill();
      ScrollTrigger.getById("manifesto-media-parallax")?.kill();
    };
  });

  // ---------- MOBILE (≤900px) — parallax only, no pin ----------
  mm.add("(max-width: 900px)", () => {
    if (t.manifestoMediaWrap) {
      gsap.fromTo(
        t.manifestoMediaWrap,
        { y: 60 },
        {
          y: -20,
          ease: "none",
          scrollTrigger: {
            id: "manifesto-media-parallax-mobile",
            trigger: t.manifesto,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        }
      );
    }
    return () => {
      ScrollTrigger.getById("manifesto-media-parallax-mobile")?.kill();
    };
  });

  // ---------- BOTH viewports — word-stagger reveal on Manifesto title + quote ----------
  mm.add("(min-width: 1px)", () => {
    const title = document.querySelector<HTMLElement>(".manifesto__text h2");
    const quote = document.querySelector<HTMLElement>(
      ".manifesto__pullquote blockquote"
    );

    if (title) {
      // The title is wrapped in <Reveal as="h2">, which renders as
      // `class="reveal"` and starts at opacity:0 + translateY(28px) until
      // its IntersectionObserver adds `.is-visible`. SplitType wraps each
      // child word in a span — but those spans inherit the parent H2's
      // opacity, so without short-circuiting Reveal here the words would
      // animate inside an invisible parent. We pre-flag the H2 as
      // visible so the Reveal CSS becomes a no-op and SplitType is the
      // sole driver of the entrance.
      title.classList.add("is-visible");
      gsap.set(title, { opacity: 1, y: 0, clearProps: "transform" });

      const split = new SplitType(title, { types: "words", tagName: "span" });
      splits.push(split);
      // Each word starts clipped from below + translated; on enter, they
      // rise in stagger. The clip-path reveal preserves the silhouette of
      // the line and reads as "type written", not "fade in".
      gsap.set(split.words, {
        y: "100%",
        clipPath: "inset(0 0 100% 0)",
        WebkitClipPath: "inset(0 0 100% 0)",
        display: "inline-block",
      });
      ScrollTrigger.create({
        id: "manifesto-title-words",
        trigger: title,
        start: "top 78%",
        once: true,
        onEnter: () => {
          gsap.to(split.words, {
            y: 0,
            clipPath: "inset(0 0 0 0)",
            WebkitClipPath: "inset(0 0 0 0)",
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.035,
          });
        },
      });
    }

    if (quote) {
      const splitQ = new SplitType(quote, {
        types: "words",
        tagName: "span",
      });
      splits.push(splitQ);
      gsap.set(splitQ.words, {
        y: "60%",
        opacity: 0,
        display: "inline-block",
      });
      ScrollTrigger.create({
        id: "manifesto-quote-words",
        trigger: quote,
        start: "top 82%",
        once: true,
        onEnter: () => {
          gsap.to(splitQ.words, {
            y: 0,
            opacity: 1,
            duration: 1.0,
            ease: "expo.out",
            stagger: 0.05,
          });
        },
      });
    }

    return () => {
      ScrollTrigger.getById("manifesto-title-words")?.kill();
      ScrollTrigger.getById("manifesto-quote-words")?.kill();
    };
  });

  // SPA cleanup wire — destroyHeroExit called from astro:before-swap.
  document.addEventListener("astro:before-swap", destroyHeroExit, { once: true });
}

export function destroyHeroExit(): void {
  if (mm) {
    mm.revert();
    mm = null;
  }
  // SplitType.revert() restores the original innerHTML so the markup is
  // clean for the next page (or the next mount in HMR).
  splits.forEach((s) => s.revert());
  splits = [];
}
