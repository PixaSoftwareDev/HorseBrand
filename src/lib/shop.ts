/**
 * Shop categories shown in the side drawer.
 * Each entry maps to a category page on shop.horse-brand.com.
 */

export const SHOP_BASE_URL = "https://shop.horse-brand.com";

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
  { key: "furniture", url: "https://shop.horse-brand.com/muebles1/" },
  { key: "home",      url: "https://shop.horse-brand.com/home-deco/" },
  { key: "mate",      url: "https://shop.horse-brand.com/mates-materas/" },
  { key: "bags",      url: "https://shop.horse-brand.com/bolsos-carteras/" },
  { key: "rugs",      url: "https://shop.horse-brand.com/alfombras-lanares/" },
];
