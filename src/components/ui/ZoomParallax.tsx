import {
  useScroll,
  useSpring,
  useTransform,
  motion,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface ZoomImage {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
}

interface Props {
  images: ZoomImage[];
}

/**
 * Zoom-parallax tile config.
 *
 * `pos` is the BASE (resting / progress=0) layout in viewport units.
 * `max` is the peak zoom factor at scroll-end.
 *
 * Counter-scale trick (matters a lot for sharpness)
 * -------------------------------------------------
 * The intuitive implementation — render the inner at `pos.w × pos.h`, then
 * `transform: scale(N)` it up — looks blurry at peak. Reason: the browser
 * rasterizes the GPU texture at layout-box × DPR. Transform-scale then
 * up-samples that small texture, throwing away the high-res srcset.
 *
 * Fix: render the inner at PEAK size (`pos × max`), and counter-scale via
 * transform to `1/max` at rest. Visual size at progress=0 is identical to
 * before, but the GPU texture is now allocated at peak resolution from the
 * start — so as the user scrolls and the transform goes 1/max → 1, the
 * image stays crisp the whole way through. No browser-specific
 * re-rasterization heuristics required.
 *
 * Position offsets (top/left) are also multiplied by `max` so they shrink
 * back to their original values at rest (because the entire item is
 * counter-scaled by 1/max).
 */
/* Max scales softened from the 21st.dev original (4..9) to (3..6).
 * The biggest tile (index 6, 15vw base × 6) reaches ~90vw at peak, leaving
 * visible viewport margin instead of overflowing edge-to-edge. Same
 * crescendo feel, less claustrophobic — closer to editorial than demo. */
const TILES: { top: number; left: number; w: number; h: number; max: number }[] = [
  { top: 0,     left: 0,      w: 25, h: 25, max: 3   },
  { top: -30,   left: 5,      w: 35, h: 30, max: 3.5 },
  { top: -10,   left: -25,    w: 20, h: 45, max: 4   },
  { top: 0,     left: 27.5,   w: 25, h: 25, max: 3.5 },
  { top: 27.5,  left: 5,      w: 20, h: 25, max: 4   },
  { top: 27.5,  left: -22.5,  w: 30, h: 25, max: 5.5 },
  { top: 22.5,  left: 25,     w: 15, h: 15, max: 6   },
];

export default function ZoomParallax({ images }: Props) {
  const container = useRef<HTMLDivElement>(null);

  /*
   * Reduced-motion detection.
   *
   * Cannot use framer-motion's `useReducedMotion` because it reads the
   * matchMedia value synchronously on first render — during SSR that's
   * always `null`, but during hydration on a reduced-motion client it
   * returns `true`, which causes the React tree to render a different
   * structure than the server emitted (the static `.zp-reduced` variant
   * vs the absolute parallax variant). React then logs a hydration
   * mismatch and gives up patching.
   *
   * The fix: start with `reduceMotion = false` (matches SSR), then
   * upgrade to the real value in `useEffect` AFTER hydration. The first
   * client render uses the motion variant just long enough for React
   * to reconcile the tree, then a second render swaps to the static
   * grid. Reduced-motion users see a one-frame flash of the parallax
   * before it settles — unavoidable trade-off, but the alternative
   * (`client:only`) would leave the section empty until JS loads.
   */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent): void => setReduceMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  /*
   * Spring damping on scrollYProgress.
   *
   * Without this the scale transforms map 1:1 to raw scroll position —
   * even with Lenis amortiguando the scroll value itself, the tiles
   * jump exactly with each wheel tick. Wrapping the progress in
   * `useSpring` adds a tiny "trailing" lag (the images keep moving for
   * a beat after you stop scrolling), which is the hallmark of the
   * Floema / Aesop / Studio.bridge feel. Values picked to match the
   * Hero pin's `scrub: 0.6` perceptually — quick enough to feel
   * responsive on a flick, slow enough to read as "the parallax is
   * following me", not "the parallax is glued to my wheel".
   */
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 36,
    mass: 0.4,
    restDelta: 0.001,
  });

  // Each item interpolates transform-scale from 1/max → 1.
  // Combined with the inner being sized at `pos × max`, this yields the
  // same visual size curve as the naive approach (base → peak), but with
  // a high-resolution texture rasterized from frame 0.
  const scales: MotionValue<number>[] = TILES.map((tile) =>
    useTransform(smoothProgress, [0, 1], [1 / tile.max, 1])
  );

  /*
   * Reduced-motion bypass.
   *
   * When the OS asks for reduced motion, render the static grid that
   * the CSS already produces on touch / ≤900px — no motion.divs, no
   * spring, no scroll-coupled transforms. Saves a continuous rAF
   * subscription and removes any vestibular motion entirely.
   * The grid layout itself is handled by the `.zp-reduced` class hook
   * in Gallery.astro CSS so we don't duplicate flex/grid rules here.
   */
  if (reduceMotion) {
    return (
      <div ref={container} className="zoom-parallax zp-reduced">
        <div className="zp-sticky">
          {images.slice(0, 7).map(({ src, srcSet, sizes, alt }, i) => (
            <div key={i} className="zp-item">
              <div className="zp-inner">
                <img
                  src={src}
                  alt={alt ?? ""}
                  loading="lazy"
                  decoding="async"
                  {...({ srcset: srcSet, sizes } as Record<string, string>)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={container} className="zoom-parallax">
      <div className="zp-sticky">
        {images.slice(0, 7).map(({ src, srcSet, sizes, alt }, i) => {
          const tile = TILES[i] ?? TILES[0];
          // Pre-multiply layout vh/vw values by the tile's max scale.
          const peakTop = `${tile.top * tile.max}vh`;
          const peakLeft = `${tile.left * tile.max}vw`;
          const peakW = `${tile.w * tile.max}vw`;
          const peakH = `${tile.h * tile.max}vh`;
          /* Smart crop per-tile · reescribimos el URL de Cloudinary
           * para que cada tile pida la foto en SU aspect ratio
           * exacto. `g_auto` activa detección de sujeto/cara — la
           * foto vertical original se entrega cropeada a la forma
           * del tile (square, landscape, portrait, lo que sea) PERO
           * con el sujeto centrado en el frame. Cada tile llena
           * completo, ninguna parte importante de la foto se pierde. */
          const tileAspect = `${Math.round(tile.w * 10)}:${Math.round(tile.h * 10)}`;
          const smartSrc = src.replace(
            /\/c_limit,/,
            `/c_fill,g_auto,ar_${tileAspect},`
          );
          const smartSrcSet = srcSet.replace(
            /\/c_limit,/g,
            `/c_fill,g_auto,ar_${tileAspect},`
          );
          return (
            <motion.div key={i} style={{ scale: scales[i] }} className="zp-item">
              <div
                className="zp-inner"
                style={{
                  position: "relative",
                  top: peakTop,
                  left: peakLeft,
                  height: peakH,
                  width: peakW,
                }}
              >
                {/*
                  Lowercase `srcset` / `sizes` via prop spread — Astro 5 +
                  React 19 SSR has a known glitch where camelCase `srcSet`
                  is serialized with a literal capital S in the HTML, so
                  browsers ignore it and fall back to the default `src`
                  (1600w default), defeating the whole point of the high-res
                  srcset. Spreading lowercase keys forces the renderer to
                  emit valid HTML attribute names.

                  All gallery images are `loading="lazy"` (no `eager` /
                  `fetchpriority="high"`) because the section sits ~9 blocks
                  below the fold. Eager preloads on below-fold images
                  trigger Chrome's "preloaded but not used in time" warning
                  AND waste bandwidth on every page-load.
                */}
                <img
                  src={smartSrc}
                  alt={alt ?? ""}
                  loading="lazy"
                  decoding="async"
                  {...({ srcset: smartSrcSet, sizes } as Record<string, string>)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
