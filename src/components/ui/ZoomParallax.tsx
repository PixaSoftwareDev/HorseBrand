import { useScroll, useTransform, motion, type MotionValue } from "framer-motion";
import { useRef } from "react";

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
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // Each item interpolates transform-scale from 1/max → 1.
  // Combined with the inner being sized at `pos × max`, this yields the
  // same visual size curve as the naive approach (base → peak), but with
  // a high-resolution texture rasterized from frame 0.
  const scales: MotionValue<number>[] = TILES.map((tile) =>
    useTransform(scrollYProgress, [0, 1], [1 / tile.max, 1])
  );

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
                  src={src}
                  alt={alt ?? ""}
                  loading="lazy"
                  decoding="async"
                  {...({ srcset: srcSet, sizes } as Record<string, string>)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
