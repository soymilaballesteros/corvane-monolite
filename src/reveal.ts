/** Aparición sobria al entrar en viewport: un fundido y un desplazamiento corto. */
export function initReveal(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
  if (!items.length) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((el) => el.classList.add('is-in'))
    return
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        // Escalona los hermanos para que la sección entre como una unidad.
        const siblings = Array.from(el.parentElement?.children ?? [])
        const idx = siblings.indexOf(el)
        el.style.transitionDelay = `${Math.min(idx, 5) * 70}ms`
        el.classList.add('is-in')
        io.unobserve(el)
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  )
  items.forEach((el) => io.observe(el))
}
