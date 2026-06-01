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
