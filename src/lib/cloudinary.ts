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
}

/**
 * High-resolution crop for the zoom-parallax (scales capped at 5x).
 *
 * Math (worst case at peak zoom):
 *   container 30vw × viewport 1920px × scale 5 × DPR 2 = 5760px physical
 * We deliver:
 *   1x → 5400px wide (covers 1080p / standard laptops up to scale 5)
 *   2x → 9000px wide (covers retina / 4K screens at peak with headroom)
 *
 * The browser picks via DPR. Without srcset, even w_9000 looks blurry on
 * retina because the browser would still pick 1x by default.
 *
 * AVIF via f_auto + q_auto:best keeps weight reasonable
 * (~1 MB at 1x, ~2.2 MB at 2x — only 1 of the two ever ships per visit).
 */
export function cldZoomImage(publicId: string): ResponsiveSrc {
  const base = "f_auto,q_auto:best,c_fill,ar_16:9";
  const src1x = cldTransform(publicId, `${base},w_5400`);
  const src2x = cldTransform(publicId, `${base},w_9000`);
  return {
    src: src1x,
    srcSet: `${src1x} 1x, ${src2x} 2x`,
  };
}

/** Standard editorial image (gallery thumbnail, hero slide, etc.). */
export function cldImage(publicId: string, width = 1600): string {
  return cldTransform(publicId, `f_auto,q_auto:good,w_${width}`);
}

/** Open Graph share image: 1200×630 (the standard for Facebook / LinkedIn / Twitter). */
export function cldOgImage(publicId: string): string {
  return cldTransform(publicId, "f_auto,q_auto:good,w_1200,h_630,c_fill");
}
