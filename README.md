# CORVANE — MONOLITE

Landing page de lujo con dos secciones scroll-driven tipo Apple: la pieza gira 360° y
después se desmonta capa a capa, ambas enganchadas al scroll. No son vídeos: son
secuencias de fotogramas WebP pintadas sobre `<canvas>`.

Maison ficticia creada como demostración.

## Requisitos

- Node 20+ y **pnpm**
- **ffmpeg** y **cwebp** (solo para regenerar los fotogramas)
  - macOS: `brew install ffmpeg webp`
  - Ojo: el ffmpeg de este equipo no trae encoder WebP, por eso el pipeline pasa por `cwebp`.

## Puesta en marcha

```bash
pnpm install
pnpm dev          # desarrollo
pnpm build        # producción -> dist/
pnpm preview      # sirve dist/ en el puerto 4173
```

## Regenerar los fotogramas

Los vídeos de origen no se versionan (son pesados y regenerables). Para reconstruir
las secuencias hacen falta en `assets/source/`:

- `sneaker-rotate.mp4` — rotación 360°, cámara fija, velocidad constante
- `sneaker-explode.mp4` — despiece por capas, cámara fija, movimiento lineal

Los prompts exactos con los que se generaron están en `assets/source/PROMPTS.md`.

```bash
pnpm frames
```

El script:

1. Extrae N fotogramas repartidos uniformemente (`rotate` 100, `explode` 120).
2. Genera **dos juegos**: `desktop` (1440 px de ancho) y `mobile` (recorte central 3:4 a 720 px).
3. Convierte a WebP buscando automáticamente la calidad que quepa en el presupuesto,
   bajando de q72 a q48 y, si hace falta, reduciendo la resolución.
4. **Presupuesto duro por secuencia**: desktop ≤ 5 MB, mobile ≤ 2 MB. Falla con error si no cabe.
5. Deriva también el póster del hero, las imágenes de respaldo y las del atelier.
6. Escribe `src/frames.manifest.json` con el número real de fotogramas.

> El manifest es lo que evita el fallo clásico de esta técnica: si el código asume 120
> fotogramas y solo hay 119, salen 404 y el canvas se queda congelado. Los conteos
> vienen siempre del build, nunca escritos a mano.

## Depuración

Abre cualquier página con `?debug=1` y aparece un HUD con la secuencia, el juego
(desktop/mobile), el fotograma actual, cuántos van cargados y el progreso.

Desde la consola, `window.__seq()` devuelve el mismo estado en JSON.

## Cómo funciona el scroll

`src/scroll-sequence.ts` es el componente que usan las dos secciones:

- GSAP ScrollTrigger fija la sección y mapea el progreso 0→1 al índice de fotograma.
- Pinta en `<canvas>` con ajuste `cover` y `devicePixelRatio` limitado a 2.
- Repinta solo dentro de `requestAnimationFrame` y **solo si cambia el fotograma**.
- Precarga progresiva: primero 1 de cada 4 fotogramas, luego el resto.
- Arranca solo cuando **(a)** la sección se acerca al viewport, **(b)** el usuario ha
  hecho scroll y **(c)** la página ha terminado de cargar. Las secuencias no participan
  nunca de la carga inicial ni compiten con el LCP.
- Si el fotograma exacto aún no está, pinta el más cercano ya cargado: el canvas nunca
  se queda en negro.
- Con `prefers-reduced-motion` o si la carga falla, la sección no se fija: pasa a altura
  normal con imagen estática y textos.

No se usa `scroll-behavior: smooth` en CSS: compite con el scrub de ScrollTrigger y hace
que las secuencias vayan a tirones. El suavizado de los enlaces internos está en `src/nav.ts`.

## Fuera de alcance

Sin CMS: los textos se cambian en `index.html`. Sin páginas legales de cookies,
privacidad ni accesibilidad — harían falta antes de usar esto con un cliente real.
El formulario no tiene backend: solo valida y confirma visualmente.
