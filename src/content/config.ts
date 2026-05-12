import { defineCollection, z } from "astro:content";

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
    // Cloudinary key (validated against CLD_IDS at runtime in Collection.astro)
    image: z.string(),
    alt: z.string(),
    tiendanubeUrl: z.string().url().optional(),
  }),
});

export const collections = { products };
