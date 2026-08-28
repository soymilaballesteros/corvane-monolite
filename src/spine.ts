/**
 * La espina: una única línea continua a la izquierda cuyo tramo champán
 * marca el avance de lectura, y que nombra la sección en la que estás.
 *
 * Las posiciones se cachean y solo se recalculan al redimensionar. Leer
 * offsetTop/scrollHeight en cada frame de scroll fuerza un recálculo de
 * layout por frame (forced reflow) y dispara el Total Blocking Time.
 */
const SECTION_NAMES: Array<[string, string]> = [
  ['manifiesto', 'Manifiesto'],
  ['pieza', 'La pieza'],
  ['atelier', 'Atelier'],
  ['anatomia', 'Anatomía'],
  ['ficha', 'Ficha técnica'],
  ['heritage', 'Heritage'],
  ['coleccion', 'Colección'],
  ['cita', 'Solicitar un par'],
]

export function initSpine(): void {
  const fill = document.querySelector<HTMLElement>('#spineFill')
  const label = document.querySelector<HTMLElement>('#spineLabel')
  if (!fill) return

  const elements = SECTION_NAMES
    .map(([id, name]) => {
      const el = document.getElementById(id)
      return el ? { el, name } : null
    })
    .filter((s): s is { el: HTMLElement; name: string } => s !== null)

  let tops: Array<{ top: number; name: string }> = []
  let maxScroll = 1

  /** Única función que toca el layout. Se llama al cargar y al redimensionar. */
  const measure = (): void => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    tops = elements.map((s) => ({ top: s.el.getBoundingClientRect().top + window.scrollY, name: s.name }))
  }

  let ticking = false
  let current = ''

  const render = (): void => {
    ticking = false
    const y = window.scrollY
    fill.style.height = `${Math.min(100, Math.max(0, (y / maxScroll) * 100)).toFixed(2)}%`

    if (!label) return
    const mid = y + window.innerHeight * 0.4
    let name = 'Florencia'
    for (const s of tops) if (s.top <= mid) name = s.name
    if (name !== current) {
      current = name
      label.textContent = name
    }
  }

  const onScroll = (): void => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(render)
  }

  const onResize = (): void => {
    measure()
    onScroll()
  }

  measure()
  render()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  // El pin de ScrollTrigger cambia la altura del documento al inicializarse.
  window.addEventListener('load', onResize, { once: true })
}
