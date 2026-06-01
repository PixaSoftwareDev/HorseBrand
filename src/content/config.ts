import { defineCollection, z } from "astro:content";
import { CLD_IDS } from "../lib/cloudinaryAssets";

const products = defineCollection({
  type: "content",
  schema: z.object({
    order: z.number(),
    name: z.object({
      es: z.string(),
      en: z.string(),
    }),
    tagline: z.object({
      es: z.string(),
      en: z.string(),
    }),
    badge: z.enum(["atelier", "handmade"]).optional(),
    // Cloudinary key · validado contra CLD_IDS en build: si un producto
    // referencia una key inexistente, el content sync falla con un error
    // claro en vez de generar una URL rota con "undefined".
    image: z.enum(Object.keys(CLD_IDS) as [string, ...string[]]),
    alt: z.string(),
    tiendanubeUrl: z.string().url().optional(),
  }),
});

export const collections = { products };
