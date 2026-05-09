/**
 * Shop categories shown in the side drawer.
 * Each entry maps to a category page on horse-brand.com.
 */

export const SHOP_BASE_URL = "https://www.horse-brand.com";

export type ShopCategoryKey =
  | "furniture"
  | "home"
  | "mate"
  | "bags"
  | "rugs";

export interface ShopCategory {
  key: ShopCategoryKey;
  url: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { key: "furniture", url: "https://www.horse-brand.com/muebles1/" },
  { key: "home",      url: "https://www.horse-brand.com/home-deco/" },
  { key: "mate",      url: "https://www.horse-brand.com/mates-materas/" },
  { key: "bags",      url: "https://www.horse-brand.com/bolsos-carteras/" },
  { key: "rugs",      url: "https://www.horse-brand.com/alfombras-lanares/" },
];
