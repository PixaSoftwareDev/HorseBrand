/**
 * Contact information — single source of truth.
 * Update these values when real data is confirmed.
 */

export const WHATSAPP_NUMBER_DISPLAY = "+54 9 11 7650-1337";
export const WHATSAPP_NUMBER_E164 = "5491176501337"; // for wa.me
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER_E164}`;

export const EMAIL = "lifestyle@horsebrandcompany.com.ar";
export const EMAIL_URL = `mailto:${EMAIL}`;

export const ATELIER_ADDRESS = "Golfers 2963 · Manuel Alberti, Buenos Aires";
export const ATELIER_HOURS_ES: readonly string[] = [
  "Lunes a Viernes 10–18h",
  "Sábados 10–14h",
];
export const ATELIER_HOURS_EN: readonly string[] = [
  "Mon–Fri 10am–6pm",
  "Sat 10am–2pm",
];

export const INSTAGRAM_HANDLE = "@horsebrand.lifestyle";
export const INSTAGRAM_URL = "https://instagram.com/horsebrand.lifestyle";

/**
 * Policy URL — Tiendanube terms page. Currently the slug 404s, so the
 * footer link is hidden (see Footer.astro). Restore the link once the
 * Tiendanube terms page is live and confirm the final slug here.
 */
export const TERMS_URL: string | null = null;
