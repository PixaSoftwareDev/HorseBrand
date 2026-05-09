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
 * High-resolution crop for the zoom-parallax (scales up to 9x).
 *
 * Returns DPR-aware sources via srcset:
 *   - 1x → 3200px wide (standard displays, lighter)
 *   - 2x → 6400px wide (retina / 4K, headroom for peak zoom)
 *
 * The browser picks the right one based on devicePixelRatio. Without srcset
 * the browser can't ask for the bigger variant on high-DPR screens, so even
 * a w_5400 source ends up looking blurry at peak zoom.
 *
 * AVIF via f_auto + q_auto:best keeps weight reasonable
 * (~600 KB at 1x, ~1.5 MB at 2x).
 */
export function cldZoomImage(publicId: string): ResponsiveSrc {
  const base = "f_auto,q_auto:best,c_fill,ar_16:9";
  const src1x = cldTransform(publicId, `${base},w_3200`);
  const src2x = cldTransform(publicId, `${base},w_6400`);
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
