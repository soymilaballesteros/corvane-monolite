# CORVANE MONOLITE — Prompts de generación

Orden: **1) imagen → 2) clip rotación → 3) clip despiece**.
Los dos vídeos usan la MISMA imagen como fotograma inicial (image-to-video).
Eso garantiza que sea la misma zapatilla en las dos animaciones.

## Ajustes técnicos
- Imagen: **16:9**, máxima calidad. Guardar como `assets/source/sneaker-ref.png`
- Vídeos: **1080p**, **16:9**, **8 segundos**, **sin audio**, modo **image-to-video**
  (la imagen de arriba como start frame / primer fotograma)
- Guardar como `assets/source/sneaker-rotate.mp4` y `assets/source/sneaker-explode.mp4`

---

## 1 · IMAGEN DE REFERENCIA

Ultra-detailed photorealistic product photograph of a luxury low-top sneaker, shot in a professional studio.

THE SHOE: A minimalist luxury sneaker with a SEAMLESS one-piece upper made of natural vegetable-tanned vachetta calf leather in a warm honey-tan colour, with a subtle hand-burnished patina at the toe and heel. No logos, no branding, no visible stitching on the upper. Cream-coloured leather lining just visible at the collar. A natural cork midsole with a clean, precisely cut edge. A dark charcoal gum rubber outsole. Tonal waxed cotton laces in soft champagne. Understated, architectural, Italian atelier craftsmanship — think Berluti or Common Projects, not sportswear.

COMPOSITION: A single shoe, lateral profile view rotated about 20 degrees toward the camera. Centred in frame, occupying roughly 45% of the image width, with generous negative space on all sides. Camera at product level, straight on, no tilt.

LIGHTING & BACKGROUND: Very dark charcoal-grey seamless studio background, almost black. Cinematic studio lighting: one large soft key light from the upper left, a warm champagne-gold rim light raking across the leather to reveal its grain, and a soft fill. Deep rich shadows. Warm gold and honey reflections on the leather.

STYLE: Shot on a Sony A7R IV with a 90mm macro lens. Photorealistic, hyper-realistic, 8k, extreme detail, visible leather grain and pores, natural colour grading, shallow and constant depth of field, high-end advertising still. 16:9 aspect ratio. No text, no logos, no watermark, no people, no props.

---

## 2 · CLIP A — ROTACIÓN 360°  (image-to-video con la imagen de arriba)

The exact sneaker from the reference image, rotating slowly on its vertical axis as if on an invisible turntable: exactly one full 360-degree revolution that begins and ends in precisely the same position as the first frame.

The camera is completely static — locked off on a tripod. No zoom, no push-in, no handheld shake, no parallax, no camera movement of any kind.

The rotation speed is perfectly constant and linear from the first frame to the last: no ease-in, no ease-out, no acceleration, no pause. The shoe rotates at a mathematically uniform rate.

Identical dark charcoal studio background and identical cinematic lighting throughout, with constant exposure. Warm champagne-gold highlights glide smoothly across the leather and the cork midsole edge as the shoe turns.

Photorealistic, extreme detail, single continuous take, no cuts, no flicker, no text, no people.

---

## 3 · CLIP B — DESPIECE  (image-to-video con la MISMA imagen)

Ultra-detailed macro product video of the exact sneaker from the reference image, in one single continuous take with a completely static locked-off camera.

The shoe begins fully assembled, exactly as in the reference image, and holds still for 1 second. Then it slowly opens into a precise technical exploded view, in the style of an engineering exploded diagram, along one shared vertical axis, each component floating apart in clean, evenly spaced layers: first the waxed laces lift away, then the seamless leather upper rises, then the cream leather lining and the moulded cork footbed separate, then the cork midsole detaches, and finally the dark gum rubber outsole settles at the bottom — revealing the internal construction and the hand-stitched Blake seam.

Every component stays perfectly aligned on the same axis, evenly spaced, gently floating. The motion is slow, linear and perfectly constant from beginning to end — no easing, no speed changes, no bounce. The shot ends holding still for 1 second on the fully separated assembly.

The camera never moves: no zoom, no pan, no tilt, no shake. Identical dark charcoal studio background, identical cinematic lighting and constant exposure throughout. Warm gold and honey reflections on leather and cork.

Photorealistic, extreme detail, shallow and constant depth of field, single continuous take, no cuts, no flicker, no text, no people.

---

## Cómo revisar los clips antes de darlos por buenos
1. ¿La cámara se queda QUIETA? (si hace zoom o se mueve, el scroll "flota" y se nota)
2. ¿La velocidad es constante? (si acelera o frena, el scrub va a tirones)
3. Rotación: ¿acaba en la MISMA posición en la que empieza?
4. ¿La zapatilla se mantiene igual todo el clip? (sin morphing ni parpadeos)
5. ¿Se ve entera y centrada, sin salirse por los bordes?

---

## 4 · OPCIONAL — las 3 imágenes del Atelier

Ahora mismo la sección "El atelier" usa tres recortes del propio clip de rotación.
Funciona, pero si generas estas tres la sección gana muchísimo. Formato **4:5 vertical**.
Guardar como `assets/source/atelier-curtido.png`, `atelier-montado.png`, `atelier-patina.png`.

**a) El curtido**
```
Ultra-detailed photorealistic macro photograph inside an old Florentine tannery: thick hides of vegetable-tanned calf leather resting in a deep oak-bark tanning pit, the liquid dark and still, the leather edges glowing warm honey-tan. Very dark charcoal surroundings, a single shaft of warm directional light from above. Shot on a Sony A7R IV, 8k, shallow depth of field, deep rich shadows, no people, no text, no logos. Vertical 4:5 composition.
```

**b) El montado**
```
Ultra-detailed photorealistic macro photograph of an artisan's hands stretching honey-tan calf leather over a hand-carved beech shoe last with steel lasting pincers, on a worn wooden workbench in a dim Florentine atelier. Only the hands and the tool are visible, no face. Warm champagne-gold directional light raking across the leather grain, very dark charcoal background. Shot on a Sony A7R IV, 8k, shallow depth of field, no text, no logos. Vertical 4:5 composition.
```

**c) La pátina**
```
Ultra-detailed photorealistic macro photograph of an artisan applying patina by hand to a honey-tan leather shoe with a folded cotton cloth, pigment building in translucent layers, small glass pots of dye out of focus behind. Only hands visible, no face. Very dark charcoal background, warm champagne-gold light, visible leather grain. Shot on a Sony A7R IV, 8k, shallow depth of field, no text, no logos. Vertical 4:5 composition.
```
