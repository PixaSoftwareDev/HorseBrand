import { defineCollection, z } from "astro:content";

const products = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
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
      image: image(),
      alt: z.string(),
      tiendanubeUrl: z.string().url().optional(),
    }),
});

export const collections = { products };
