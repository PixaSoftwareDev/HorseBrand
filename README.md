# Horse Brand · Lifestyle Equestrian Atelier

Marroquinería artesanal inspirada en el mundo ecuestre. Sitio editorial de marca.

## Stack

- **Astro 5** (SSG)
- **TypeScript** estricto
- **Tailwind CSS v4** (CSS-first config con `@theme`)
- **Sharp** (optimización de imágenes via `<Image>` de Astro)
- **Lenis + GSAP** (scroll inercial + animaciones)

## Comandos

```bash
npm install
npm run dev       # http://localhost:4321
npm run build
npm run preview
```

## Estructura

```
src/
├── assets/        Imágenes optimizadas por <Image> de Astro
├── components/
│   ├── nav/       Nav, MobileMenu, AudioToggle, LangSwitcher
│   ├── sections/  Hero, Manifesto, Collection, Gallery, etc.
│   ├── ui/        Cursor, IntroSplash, Lightbox, PageLoader, SectionMarker
│   └── shared/    Reveal
├── content/       Content Collections (productos en MD)
├── i18n/          Diccionarios ES/EN tipados
├── layouts/       Base.astro
├── lib/           audio.ts, reveal.ts, cursor.ts
├── pages/         Rutas (/, /en/)
└── styles/        tokens.css, fonts.css, global.css
public/
└── audio/ambient.mp3   ← agregar tú
```

## Audio ambient

El reproductor está conectado y el archivo ya está incluido en `public/audio/ambient.mp3`. Para reemplazarlo, sustituí ese archivo manteniendo el mismo nombre y ruta.

## Idiomas

- Español: `/`
- Inglés: `/en/`

Diccionarios en `src/i18n/{es,en}.json`. Helper tipado en `src/i18n/ui.ts`.
