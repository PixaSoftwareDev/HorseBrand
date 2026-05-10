/**
 * Cloudinary helpers for HorseBrand.
 *
 * The cloud name is read from `PUBLIC_CLOUDINARY_CLOUD` (set in Vercel env
 * or local `.env`). It's a public value (it's part of every image URL),
 * so the prefix `PUBLIC_` is intentional. A hardcoded fallback keeps dev
 * working out-of-the-box without requiring any env setup.
 */

export const CLOUDINARY_CLOUD =
  import.meta.env.PUBLIC_CLOUDINARY_CLOUD ?? "dukv3ov6t";

const BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

/** Build a transformed URL. `transforms` is a comma-separated string. */
export function cldTransform(publicId: string, transforms: string): string {
  return `${BASE}/${transforms}/${publicId}`;
}

export interface ResponsiveSrc {
  src: string;
  srcSet: string;
  sizes: string;
}

/**
 * Responsive crop for the zoom-parallax.
 *
 * Cap: w_3600 max. Going higher caused 400s on other machines because
 * Cloudinary refuses to upscale above the original (most uploaded sources
 * are ~4000px wide phone photos, so w_5400+ is never delivered cleanly,
 * and free plans return 400 for upscale attempts).
 *
 * The counter-scale architecture in ZoomParallax already renders the IMG
 * at peak layout size, so the GPU keeps a sharp texture from frame 0 —
 * we don't need a giant source on top of that. 3600w on retina at scale 6
 * gives enough resolution without any upscale risk.
 */
export function cldZoomImage(publicId: string): ResponsiveSrc {
  const base = "f_auto,q_auto:good,c_fill,ar_16:9";
  const make = (w: number): string => cldTransform(publicId, `${base},w_${w}`);
  return {
    src: make(1600),
    srcSet: [
      `${make(640)} 640w`,
      `${make(960)} 960w`,
      `${make(1600)} 1600w`,
      `${make(2400)} 2400w`,
      `${make(3600)} 3600w`,
    ].join(", "),
    sizes: "(max-width: 900px) 100vw, 3600px",
  };
}

/** Standard editorial image (gallery thumbnail, hero slide, etc.). */
export function cldImage(publicId: string, width = 1600): string {
  return cldTransform(publicId, `f_auto,q_auto:good,w_${width}`);
}

/**
 * Responsive editorial image — returns `src` + `srcSet` so the browser can
 * pick the right size based on the rendered width × DPR. Use this for any
 * full-bleed or half-bleed photo (manifesto, split, hero slide).
 *
 * Pair with a meaningful `sizes` attribute on the <img>, e.g.
 *   sizes="(min-width:900px) 50vw, 100vw"
 */
export function cldImageSrcset(publicId: string): {
  src: string;
  srcSet: string;
} {
  const make = (w: number): string =>
    cldTransform(publicId, `f_auto,q_auto:good,w_${w}`);
  return {
    src: make(1600),
    srcSet: [
      `${make(640)} 640w`,
      `${make(960)} 960w`,
      `${make(1280)} 1280w`,
      `${make(1600)} 1600w`,
      `${make(2400)} 2400w`,
    ].join(", "),
  };
}

/** Open Graph share image: 1200×630 (the standard for Facebook / LinkedIn / Twitter). */
export function cldOgImage(publicId: string): string {
  return cldTransform(publicId, "f_auto,q_auto:good,w_1200,h_630,c_fill");
}
