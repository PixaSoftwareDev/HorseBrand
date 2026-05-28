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
  // `c_limit` en lugar de `c_fill,ar_16:9` · respeta el aspect natural
  // de cada foto. Antes Cloudinary forzaba todo a 16:9 landscape, que
  // cortaba portraits brutalmente. Con c_limit, la foto se entrega a
  // su proporción original y el tile la muestra completa (vía object-fit
  // contain inline en el render). */
  const base = "f_auto,q_auto:good,c_limit";
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
    /*
     * `sizes` must describe what the IMG is **rendered** at — not the
     * source's max. The previous value (3600px) was the largest srcset
     * entry, which made the browser always pick the 3600w source even
     * on viewports where the tile actually paints ~1200-1700 px wide.
     *
     * In ZoomParallax the inner box is sized `w × max` vw at peak, and
     * the largest tile peaks at ~90vw. The browser then chooses the
     * right entry by multiplying `sizes` by DPR:
     *   - 1440 vp · DPR 1 → 1296 px → picks 1600w
     *   - 1440 vp · DPR 2 → 2592 px → picks 2400w (was 3600w before)
     *   - 1920 vp · DPR 2 → 3456 px → still picks 3600w when needed
     * Bandwidth savings: ~30-40% on typical DPR-2 desktops, no visible
     * loss of sharpness because the counter-scale architecture already
     * keeps the texture at peak resolution from frame 0.
     */
    sizes: "(max-width: 900px) 100vw, 90vw",
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

/* ============================================================
 * Video helpers
 * ============================================================
 *
 * Cloudinary sirve video por `/video/upload/...` (mismo cloud, otra rama
 * del path). Las transformaciones aceptan:
 *   - f_auto: formato per-browser (mp4/webm/h265 según soporte)
 *   - q_auto:good: bitrate adaptativo
 *   - vc_auto: video codec automático
 *   - w_NNNN: ancho máximo (Cloudinary mantiene aspect ratio)
 *
 * Para extraer un poster frame del video (Cloudinary genera un JPG a
 * partir del clip), usamos el mismo endpoint `/video/upload/` con la
 * extensión `.jpg` al final del public ID — Cloudinary detecta y
 * extrae el frame 0 automáticamente. `so_2.0` ajustaría el segundo si
 * necesitáramos un frame distinto.
 */
const VIDEO_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/video/upload`;

export function cldVideoTransform(publicId: string, transforms: string): string {
  return `${VIDEO_BASE}/${transforms}/${publicId}`;
}

/** Background/inline video — MP4 explícito (extensión + sin f_auto).
 *
 * Por qué NO usamos `f_auto` para video como sí lo hacemos en imágenes:
 * Cloudinary devuelve UNA sola URL fija (no negocia tipo MIME por
 * request como hace `<picture>` con images). Si dejamos `f_auto`,
 * Chrome recibe WebM mientras el `<source type="video/mp4">` declara
 * MP4 — el browser ignora el source y el video queda en blanco.
 * Pedir `.mp4` explícito le da formato consistente cross-browser.
 *
 * `q_auto:best` en lugar de `q_auto:good` — Cloudinary preserva la
 * máxima calidad visual. Para videos editoriales en hero/full-bleed
 * el costo en peso vale el bump de definición (un q_good agresivo
 * lee como video pixelado, especialmente en displays retina). */
export function cldVideo(publicId: string, width = 1280): string {
  return `${VIDEO_BASE}/q_auto:best,w_${width}/${publicId}.mp4`;
}

/** Poster JPG · primer frame del video para usar como fallback / preload. */
export function cldVideoPoster(publicId: string, width = 1280): string {
  return `${VIDEO_BASE}/f_auto,q_auto:good,w_${width}/${publicId}.jpg`;
}
