import '@fontsource-variable/bodoni-moda/wght.css'
import '@fontsource-variable/instrument-sans/wght.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/chrome.css'
import './styles/sections.css'
import './styles/sequence.css'

import ScrollTrigger from 'gsap/ScrollTrigger'
import { ScrollSequence } from './scroll-sequence'
import { initReveal } from './reveal'
import { initForm } from './form'
import { initSpine } from './spine'
import { initNav } from './nav'

const sequences: ScrollSequence[] = []

/** Enciende el hito del despiece que corresponde al progreso. */
function bindBeats(section: HTMLElement): (p: number) => void {
  const beats = Array.from(section.querySelectorAll<HTMLElement>('.beat'))
  if (!beats.length) return () => {}
  let active = -1
  return (p: number) => {
    const i = Math.min(beats.length - 1, Math.floor(p * beats.length))
    if (i === active) return
    active = i
    beats.forEach((b, n) => b.classList.toggle('is-on', n === i))
  }
}

function initSequences(): void {
  const sections = document.querySelectorAll<HTMLElement>('.seq[data-seq]')
  for (const section of sections) {
    const name = section.dataset.seq!
    const lengthVh = Number(section.dataset.length) || 300
    const seq = new ScrollSequence({
      section,
      name,
      lengthVh,
      onProgress: bindBeats(section),
    })
    seq.init()
    sequences.push(seq)
  }
}

function initHud(): void {
  if (!new URLSearchParams(location.search).has('debug')) return
  const hud = document.createElement('div')
  hud.className = 'hud'
  hud.id = 'hud'
  document.body.append(hud)
  // Intervalo, no requestAnimationFrame: un bucle rAF permanente mantiene la
  // página siempre "animando" y quema CPU solo para depurar.
  let last = ''
  const tick = (): void => {
    const text = sequences.map((s) => s.debugLine()).join('\n')
    if (text !== last) { last = text; hud.textContent = text }
  }
  tick()
  setInterval(tick, 100)
}

initNav()
initSpine()
initReveal()
initForm()
initSequences()
initHud()

/**
 * El pin debe calcularse con el layout FINAL: si las fuentes o el póster del
 * hero cambian la altura después, queda descuadrado y la animación "no avanza".
 *
 * Pero cada refresh vuelve a medir los dos pins sobre un documento de ~14.000 px
 * y cuesta cerca de un segundo de cálculo de estilos en un móvil modesto. Con
 * dos llamadas sueltas (fuentes + load) el Total Blocking Time se disparaba a
 * más de 1 s. Aquí se espera a que ocurran ambas cosas y se refresca UNA vez.
 */
function refreshOnce(): void {
  let pending = 2
  const done = (): void => {
    if (--pending > 0) return
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }
  if (document.fonts) document.fonts.ready.then(done, done)
  else done()
  if (document.readyState === 'complete') done()
  else window.addEventListener('load', done, { once: true })
}

// La barra de direcciones del móvil cambia de alto al hacer scroll; sin esto,
// ScrollTrigger se refresca en mitad del scroll y provoca tirones.
ScrollTrigger.config({ ignoreMobileResize: true })
refreshOnce()

// Puente para la verificación automatizada en navegador.
declare global {
  interface Window { __seq?: () => Record<string, unknown>[] }
}
window.__seq = () => sequences.map((s) => s.debugState())
