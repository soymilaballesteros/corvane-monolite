/**
 * Desplazamiento suave SOLO en los enlaces internos. No se usa
 * `scroll-behavior: smooth` en CSS porque compite con el scrub de
 * ScrollTrigger y hace que las secuencias vayan a tirones.
 */
export function initNav(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest?.('a[href^="#"]')
    if (!(link instanceof HTMLAnchorElement)) return
    const id = link.getAttribute('href')!.slice(1)
    const target = id ? document.getElementById(id) : document.body
    if (!target) return
    e.preventDefault()
    target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  })
}
