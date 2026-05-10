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
 * Width descriptors (not 1x/2x): on mobile the layout collapses to a flat
 * vertical stack and we want browsers to pick a small source (~640-960w),
 * not the 9000w retina source — which used to fail on phones (broken-image
 * placeholders) due to AVIF size + Cloudinary upscaling limits.
 *
 * The `sizes` hint lies a little: it tells the browser the desktop layout
 * box is ~5400px wide so that on retina laptops the picker still chooses
 * the largest available source — covering the parallax max zoom (9x).
 */
export function cldZoomImage(publicId: string): ResponsiveSrc {
  const base = "f_auto,q_auto:best,c_fill,ar_16:9";
  const make = (w: number): string => cldTransform(publicId, `${base},w_${w}`);
  return {
    src: make(1600),
    srcSet: [
      `${make(640)} 640w`,
      `${make(960)} 960w`,
      `${make(1600)} 1600w`,
      `${make(2400)} 2400w`,
      `${make(3600)} 3600w`,
      `${make(5400)} 5400w`,
    ].join(", "),
    sizes: "(max-width: 900px) 100vw, 5400px",
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
