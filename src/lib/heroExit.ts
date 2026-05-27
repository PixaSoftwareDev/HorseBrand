/**
 * Hero → Manifesto · Close & Dissolve (v2 · single-target)
 * =========================================================
 *
 * The diptych collapses toward the centre and dissolves, then the brand
 * moment surfaces over paper before the Manifesto rises from below.
 *
 * Why the rewrite
 * ---------------
 * Earlier iterations animated each half (.hero__half--left / --right)
 * separately. That meant GSAP was writing scale/opacity/xPercent/
 * transformOrigin onto two parents while a CSS keyframe animation
 * (heroKenBurns) was running on the .hero__slide children of those
 * parents — three timelines stacked vertically (browser composite,
 * GSAP ticker, CSS animation timeline). Every per-tick write composed
 * with an in-flight CSS animation on a different timeline, producing
 * a visible shimmer/flicker during the close.
 *
 * This version animates ONE element — `.hero__split`, the wrapper that
 * contains both halves and the seam. A single scale + opacity transform
 * on a single parent composes cleanly with whatever is happening inside.
 * The diptych closes as a single rigid unit toward its centre, so the
 * gesture still reads as "the two halves come together" without the
 * per-half choreography that was producing the bugs.
 *
 * Choreography (scroll progress 0..1 inside the pin)
 * --------------------------------------------------
 *   PHASE 1 · Silence       [0.00, 0.22]
 *     Hero copy (eyebrow, title, CTAs) and bottom chrome (progress bar,
 *     scroll indicator) fade out. The page goes quiet before the gesture.
 *     Body gains `.hero-quiet` (crosses at p=0.08) so global floating
 *     chrome — the Tienda chip in particular — fades alongside, keeping
 *     the canvas editorial. The nav stays present throughout: it now
 *     renders in ink on the paper canvas, so it reads as part of the
 *     brand moment instead of fighting it.
 *
 *   PHASE 2 · Bg shift      [0.18, 0.55]
 *     Hero background colour eases from --color-ink to --color-paper so
 *     by the time the diptych starts lifting, the surrounding canvas is
 *     already the brand's editorial paper tone — the photos are leaving
 *     a paper room, not punching out into dark.
 *
 *   PHASE 3 · Contract      [0.22, 0.62]
 *     `.hero__split` scales 1 → 0.55 from its centre. Both halves
 *     shrink toward the seam together as one rigid unit — the gesture
 *     reads as "the diptych is closing in on itself". Earlier this
 *     phase took scale all the way to 0.42; the photos became too
 *     small and the rest of the canvas felt empty. 0.55 keeps the
 *     photos a substantial visual presence while still leaving room
 *     below for the story-opener line. Opacity stays at 1.0.
 *
 *   PHASE 4 · Settle up     [0.55, 0.85]
 *     The shrunken split lifts slightly (yPercent 0 → -10) so it
 *     settles in the upper third of the viewport — clearing the
 *     lower half for the story-opener line. The diptych STAYS
 *     VISIBLE through the rest of the moment; it's the visual anchor
 *     of the title-page composition.
 *
 *   PHASE 5 · Story reveal  [0.62, 0.82]
 *     Runs IN PARALLEL with the settle-up phase, intentionally. An
 *     earlier version had this fade starting at p=0.78 — that left a
 *     visible "no-content" gap between the shrink finishing (p=0.62)
 *     and the brand moment appearing (p=0.78): the user saw two small
 *     photos on empty paper for ~150 px of scroll. Starting the
 *     reveal at p=0.62 closes that gap: the moment the diptych lands
 *     at its smallest, the story line is already beginning to write
 *     itself underneath. A one-shot `hb:hero-story-cue` event fires
 *     at p=0.65 so the typewriter in Hero.astro starts running just
 *     after the fade begins. The localised opener phrase ("Comienza
 *     con un caballo." / "It begins with a horse.") types character
 *     by character — a narrative beat that hands off to the Manifesto.
 *
 *   PHASE 6 · Hold          [0.85, 1.00]
 *     Diptych + finished typed line at full opacity over the paper
 *     canvas — the moment lands. Pin distance is +=100% (kept short)
 *     so this hold runs ~10% of pin = ~90 px of scroll — long enough
 *     for the eye to read the typed line as a punctuation, brief
 *     enough that the user doesn't feel held in place.
 *
 *   PHASE 7 · Release       (implicit, after pin)
 *     Pin releases at p=1.0. Hero un-pins and the natural document
 *     flow takes over: as the user scrolls, the hero (with its
 *     shrunken diptych + typed line still rendered at the bottom)
 *     scrolls UP out of viewport while the Manifesto rises from
 *     BELOW. The two sections never overlap visually — they're in
 *     two different viewport regions through the whole transition.
 *
 *   PHASE 6 · Release       (implicit, after pin)
 *     Pin releases at p=1.0. Hero un-pins and scrolls upward in document
 *     flow; the Manifesto, positioned below in source order, rises into
 *     view over the paper canvas the hero is already showing. The brand
 *     logo leaves UP as the Manifesto title rises from BELOW — a
 *     torch-pass gesture. The diptych is already off-screen above, so
 *     it doesn't interfere with this transition.
 *
 * Slideshow + Ken Burns
 * ---------------------
 * The slideshow inside the halves is paused via custom event
 * `hb:hero-leaving` (dispatched once when pin progress crosses 5%).
 * Additionally, while the hero carries the `.is-pinning` class, all
 * CSS animations and transitions on `.hero__slide` are frozen via
 * `animation-play-state: paused; transition: none`. The photo the user
 * engaged with stays rigidly visible through the whole close.
 *
 * Mobile (≤900px)
 * ---------------
 * No diptych on mobile (right half hidden via CSS). The mobile branch
 * scrubs a simple content fade over the hero's normal scroll lifetime —
 * no pin, no gesture. Finger-driven scroll on a long pin reads as
 * broken on touch devices.
 *
 * Cleanup
 * -------
 * matchMedia revert; idempotency guard; SPA teardown on astro:before-swap.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

let mm: gsap.MatchMedia | null = null;
let splits: SplitType[] = [];

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const INK = { r: 21, g: 17, b: 13 };
const PAPER = { r: 251, g: 248, b: 242 };
function lerpBg(t: number): string {
  const r = Math.round(INK.r + t * (PAPER.r - INK.r));
  const g = Math.round(INK.g + t * (PAPER.g - INK.g));
  const b = Math.round(INK.b + t * (PAPER.b - INK.b));
  return `rgb(${r}, ${g}, ${b})`;
}

export function initHeroExit(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (mm) destroyHeroExit();

  const hero = document.querySelector<HTMLElement>(".hero");
  const heroSplit = document.querySelector<HTMLElement>(".hero__split");
  const heroContent = document.querySelector<HTMLElement>(".hero__content");
  const heroOverlay = document.querySelector<HTMLElement>(".hero__overlay");
  const heroProgress = document.querySelector<HTMLElement>(".hero__progress");
  const heroScroll = document.querySelector<HTMLElement>(".hero__scroll");
  const heroDivider = document.querySelector<HTMLElement>(".hero__divider");
  const heroBrand = document.querySelector<HTMLElement>("[data-hero-brand]");
  const heroNav = document.querySelector<HTMLElement>("#nav");

  if (!hero) return;

  const start = (): void => {
    requestAnimationFrame(() =>
      buildTimeline({
        hero,
        heroSplit,
        heroContent,
        heroOverlay,
        heroProgress,
        heroScroll,
        heroDivider,
        heroBrand,
        heroNav,
      })
    );
  };

  if (document.body.classList.contains("intro-done")) start();
  else window.addEventListener("hb:intro-done", start, { once: true });
}

interface Targets {
  hero: HTMLElement;
  heroSplit: HTMLElement | null;
  heroContent: HTMLElement | null;
  heroOverlay: HTMLElement | null;
  heroProgress: HTMLElement | null;
  heroScroll: HTMLElement | null;
  heroDivider: HTMLElement | null;
  heroBrand: HTMLElement | null;
  heroNav: HTMLElement | null;
}

function buildTimeline(t: Targets): void {
  mm = gsap.matchMedia();

  // ---------- DESKTOP (≥901px) ----------
  mm.add("(min-width: 901px)", () => {
    let wasLeaving = false;
    let wasQuiet = false;
    // One-shot fire for the story typewriter. Stays true once the
    // user has crossed p=0.78 — Hero.astro's typewriter routine has
    // its own idempotency guard, so re-firing on bounce-back doesn't
    // matter, but flipping the flag here keeps the dispatch cost at
    // zero after the first crossing.
    let storyCueFired = false;
    let wasNavBlurred = false;
    const PAUSE_THRESHOLD = 0.05;
    const QUIET_THRESHOLD = 0.08;
    // Nav blur uses asymmetric thresholds (hysteresis) so the swap reads
    // clean in BOTH directions:
    //
    //   - ON  at p > 0.45 (going down): cream+blur lands mid-bg-shift, in
    //     step with the ink→paper canvas swap. Same as before.
    //   - OFF at p < 0.18 (going up): nav STAYS cream while scrolling
    //     back up through the diptych phase, because the bg is still
    //     mostly paper there — releasing scrolled at 0.45 would put white
    //     nav text on a cream canvas (invisible). 0.18 is the start of
    //     the bg-shift window: at that point the canvas is back to ink
    //     and the hero photo is reasserting itself, so the white over-
    //     photo state reads correctly again.
    const NAV_BLUR_ON = 0.45;
    const NAV_BLUR_OFF = 0.18;
    const setNavBlurred = (on: boolean): void => {
      if (on === wasNavBlurred) return;
      t.heroNav?.classList.toggle("scrolled", on);
      wasNavBlurred = on;
    };

    // `.hero__split` scales from its geometric centre — that anchors
    // the contraction at the seam (which sits at 50% by CSS). Setting
    // once, never per-tick, so the browser doesn't recalc layout each
    // frame. After the contract finishes the same wrapper translates
    // up off-screen, but the origin still matters because the scale
    // and translate compose into one transform — keeping the scale
    // anchored to 50/50 means the slide-out lifts the box from where
    // the eye expects it (the seam centre), not from an offset corner.
    if (t.heroSplit)
      gsap.set(t.heroSplit, { transformOrigin: "50% 50%" });

    // `body.hero-quiet` is a CSS hook for global floating chrome
    // (currently #shopHandle) to fade itself out via its own CSS during
    // the pin. Centralising the toggle here means modules don't all need
    // a ScrollTrigger of their own.
    const setQuiet = (on: boolean): void => {
      if (on === wasQuiet) return;
      document.body.classList.toggle("hero-quiet", on);
      wasQuiet = on;
    };
    const setLeaving = (on: boolean): void => {
      if (on === wasLeaving) return;
      document.dispatchEvent(
        new CustomEvent(on ? "hb:hero-leaving" : "hb:hero-arrived")
      );
      t.hero.classList.toggle("is-pinning", on);
      wasLeaving = on;
    };

    const trigger = ScrollTrigger.create({
      id: "hero-diptych-close",
      trigger: t.hero,
      start: "top top",
      // Pin distance kept short (+=100% instead of the earlier 125%)
      // so the choreography runs over 900 px of scroll — about 9
      // wheel ticks — long enough for the eye to read each phase
      // but tight enough that the user reaches the brand moment
      // without scroll fatigue.
      end: "+=100%",
      pin: true,
      // pinSpacing: true (default) — adds a 100vh spacer in document
      // flow after the hero so Manifesto starts at doc y=1800. The
      // user scrolls the full spacer (900 px) before Manifesto's
      // top reaches viewport top.
      //
      // Earlier we tried `pinSpacing: false` to shave that 900 px
      // off the transition — Manifesto would be at doc y=900,
      // immediately after the hero. The user reported it as broken
      // because:
      //   1. During the in-pin crossfade [0.85, 1.00] the hero
      //      opacity dropped to ~0.5 while Manifesto rose behind,
      //      producing a visible double-image (shrunken diptych
      //      + brand moment + Manifesto title all stacked in the
      //      same viewport region).
      //   2. The chip-restore trigger (`bottom top`) calculated
      //      against the fixed hero and never fired post-pin, so
      //      the nav stayed at opacity 0 forever.
      // Reverting to the default keeps the post-pin transition
      // CLEAN: hero scrolls UP out of viewport while Manifesto
      // rises from BELOW — two sections in two different viewport
      // regions, never compositing on top of each other.
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.6,
      invalidateOnRefresh: true,
      // When the pin releases (forward), clear `.is-pinning` so the
      // slideshow logic resets cleanly. `hero-quiet` is intentionally
      // NOT cleared here — the brand moment is still on screen for the
      // ~900px it takes the hero to scroll out, and a separate trigger
      // (`hero-chip-restore`, below) flips it off once the hero has
      // fully left viewport. Without that deferral, the Tienda chip
      // would pop back in over the brand wordmark.
      // Nav opacity follows the same logic — left at 0 until the hero
      // is out of viewport so the brand moment scrolls past on clean
      // paper, restored together with the chip in `hero-chip-restore`.
      // `onLeaveBack` (scrolling back up past the trigger start) DOES
      // clear everything — at that point the user is above the pin
      // entirely and all chrome should reappear.
      onLeave: () => {
        setLeaving(false);
      },
      onLeaveBack: () => {
        setLeaving(false);
        setQuiet(false);
        setNavBlurred(false);
      },
      onUpdate: (self) => {
        const p = self.progress;

        // Threshold crossings: dispatch slideshow pause/resume events AND
        // toggle .is-pinning on the hero (which freezes Ken Burns +
        // slide transitions via CSS while the close is running).
        setLeaving(p > PAUSE_THRESHOLD);
        // Quiet mode toggles slightly later than the slideshow pause —
        // gives the user a beat of "all chrome present" before the page
        // visibly hides anything.
        setQuiet(p > QUIET_THRESHOLD);
        // Nav cream+blur: asymmetric thresholds so it lands together with
        // the paper canvas going down AND stays cream while scrolling
        // back up through the diptych phase (avoids a white-on-cream
        // flash). See NAV_BLUR_ON / NAV_BLUR_OFF above.
        if (wasNavBlurred) {
          if (p < NAV_BLUR_OFF) setNavBlurred(false);
        } else {
          if (p > NAV_BLUR_ON) setNavBlurred(true);
        }

        // PHASE 1 · Silence (0 → 22%) — copy + chrome fade.
        // The whole .hero__content fades as one (eyebrow/title/CTAs share
        // a coordinated exit), and the progress bar + scroll indicator go
        // with it. The nav stays present — it's now ink-on-paper, so it
        // reads cleanly over the brand moment instead of fighting it.
        const silence = smoothstep(0, 0.22, p);
        if (t.heroContent) gsap.set(t.heroContent, { opacity: 1 - silence });
        if (t.heroProgress) gsap.set(t.heroProgress, { opacity: 1 - silence });
        if (t.heroScroll) gsap.set(t.heroScroll, { opacity: 1 - silence });

        // Scrim follows the bg shift — dark mood departs as paper arrives.
        if (t.heroOverlay)
          gsap.set(t.heroOverlay, { opacity: 1 - smoothstep(0.18, 0.55, p) });

        // PHASE 2 · Background ink → paper [0.18, 0.55].
        // The bg flip lands BEFORE the diptych starts lifting (which
        // begins at 0.30) — so the photos exit upward off a paper
        // canvas, not a dark one. Without this ordering you'd see a
        // strip of dark behind the lifting halves for ~0.05 of pin.
        gsap.set(t.hero, {
          backgroundColor: lerpBg(smoothstep(0.18, 0.55, p)),
        });

        // PHASE 3 · Contract [0.22, 0.62] — the shrink gesture.
        // The split scales 1 → 0.55. A softer shrink than before
        // (was 0.42) — keeps the photos as a real visual presence
        // instead of a small distant card. Opacity stays at 1.
        const contract = smoothstep(0.22, 0.62, p);
        const splitScale = 1 - contract * 0.45; // 1 → 0.55

        // PHASE 4 · Settle up [0.55, 0.85] — small lift, stays visible.
        // The shrunken plate lifts slightly (yPercent 0 → -10) so it
        // sits in the upper portion of the viewport and clears space
        // below for the story-opener line.
        const settleUp = smoothstep(0.55, 0.85, p);

        if (t.heroSplit) {
          gsap.set(t.heroSplit, {
            scale: splitScale,
            yPercent: -10 * settleUp,
          });
        }

        // PHASE 5 · Story reveal [0.62, 0.82]
        // Runs in PARALLEL with the settle-up so the brand moment
        // appears the moment the diptych finishes shrinking — no
        // dead air between "the photos closed" and "the line types".
        // The fade window is wide (20% of pin) so the container is
        // visibly mid-fade across the typewriter window: the line is
        // both opening and writing itself at the same time.
        //
        // Typewriter cue fires at p=0.65 — slightly into the fade so
        // the first letters land into a container that's already
        // ~30% visible (avoids text appearing in a fully invisible
        // box for a frame and looking like nothing happened).
        // Idempotency: the boolean flag stays true once set; the
        // typewriter routine in Hero.astro also self-guards with a
        // `data-typed="1"` attribute, so double-dispatch on bounce
        // is a no-op.
        if (t.heroBrand) {
          gsap.set(t.heroBrand, {
            opacity: smoothstep(0.62, 0.82, p),
          });
        }
        if (p >= 0.65 && !storyCueFired) {
          storyCueFired = true;
          document.dispatchEvent(new CustomEvent("hb:hero-story-cue"));
        }
      },
    });

    // Chip restoration: re-show the Tienda chip once the hero has fully
    // scrolled past the viewport top. `bottom top` on a pinned trigger
    // accounts for the pin spacer, so this fires at `scrollY = pinEnd +
    // heroHeight` — long enough that the brand logo has left the screen
    // and the Manifesto is in view. The nav no longer needs restoring
    // here because it's never hidden during the pin.
    const chipRestoreTrigger = ScrollTrigger.create({
      id: "hero-chip-restore",
      trigger: t.hero,
      start: "bottom top",
      onEnter: () => {
        setQuiet(false);
      },
    });

    return () => {
      trigger.kill();
      chipRestoreTrigger.kill();
      t.hero.classList.remove("is-pinning");
      document.body.classList.remove("hero-quiet");
      [
        t.hero,
        t.heroSplit,
        t.heroContent,
        t.heroOverlay,
        t.heroProgress,
        t.heroScroll,
        t.heroDivider,
        t.heroBrand,
        t.heroNav,
      ].forEach((el) => {
        if (el) gsap.set(el, { clearProps: "all" });
      });
      if (wasLeaving) {
        document.dispatchEvent(new CustomEvent("hb:hero-arrived"));
      }
    };
  });

  // ---------- MOBILE (≤900px) ----------
  mm.add("(max-width: 900px)", () => {
    const trigger = ScrollTrigger.create({
      id: "hero-mobile-fade",
      trigger: t.hero,
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        const fade = smoothstep(0, 0.6, p);
        if (t.heroContent) gsap.set(t.heroContent, { opacity: 1 - fade });
        if (t.heroOverlay)
          gsap.set(t.heroOverlay, { opacity: 1 - fade * 0.5 });
      },
    });
    return () => {
      trigger.kill();
      [t.heroContent, t.heroOverlay].forEach((el) => {
        if (el) gsap.set(el, { clearProps: "opacity" });
      });
    };
  });

  // ---------- Manifesto SplitType reveals (all viewports) ----------
  mm.add("(min-width: 1px)", () => {
    const title = document.querySelector<HTMLElement>(".manifesto__text h2");
    const quote = document.querySelector<HTMLElement>(
      ".manifesto__pullquote blockquote"
    );

    if (title) {
      title.classList.add("is-visible");
      gsap.set(title, { opacity: 1, y: 0, clearProps: "transform" });

      const split = new SplitType(title, { types: "words", tagName: "span" });
      splits.push(split);
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
      const splitQ = new SplitType(quote, { types: "words", tagName: "span" });
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

  document.addEventListener("astro:before-swap", destroyHeroExit, {
    once: true,
  });
}

export function destroyHeroExit(): void {
  if (mm) {
    mm.revert();
    mm = null;
  }
  splits.forEach((s) => s.revert());
  splits = [];
}
