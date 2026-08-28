import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import manifest from './frames.manifest.json'

gsap.registerPlugin(ScrollTrigger)

type Variant = 'desktop' | 'mobile'

interface VariantMeta { count: number; width: number; height: number }
interface SequenceMeta { frames: number; desktop: VariantMeta; mobile: VariantMeta }

const MANIFEST = manifest as unknown as Record<string, SequenceMeta | undefined>

const MOBILE_QUERY = '(max-width: 700px)'
const PRELOAD_CONCURRENCY = 6
/** Fase 1: uno de cada N. Fase 2: rellena el resto. */
const COARSE_STEP = 4


/**
 * Resuelve en cuanto el usuario ha hecho scroll aunque sea una vez.
 * Sin esto, en móvil la primera secuencia queda a ~600 px del pliegue y el
 * IntersectionObserver dispara nada más cargar: cientos de KB de fotogramas
 * en la carga inicial. Si nadie hace scroll, nadie ve las secuencias.
 */
let scrolledOnce: Promise<void> | null = null
function afterFirstScroll(): Promise<void> {
  if (!scrolledOnce) {
    scrolledOnce = window.scrollY > 0
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          const done = (): void => {
            window.removeEventListener('scroll', done)
            resolve()
          }
          window.addEventListener('scroll', done, { once: true, passive: true })
        })
  }
  return scrolledOnce
}

/** Ejecuta cuando la página ha cargado y el hilo principal está ocioso. */
function afterLoad(fn: () => void): void {
  const idle = (): void => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
    if (ric) ric(fn, { timeout: 1200 })
    else setTimeout(fn, 200)
  }
  if (document.readyState === 'complete') idle()
  else window.addEventListener('load', idle, { once: true })
}

export interface ScrollSequenceOptions {
  section: HTMLElement
  name: string
  /** Longitud del pin en % de la altura del viewport (300 = 300vh). */
  lengthVh: number
  onProgress?: (progress: number) => void
}

export class ScrollSequence {
  readonly name: string
  private readonly section: HTMLElement
  private readonly pin: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly still: HTMLImageElement | null
  private readonly lengthVh: number
  private readonly onProgress?: (p: number) => void

  private meta: SequenceMeta | undefined
  private variant: Variant = 'desktop'
  private count = 0

  private images: (HTMLImageElement | null)[] = []
  private pending = new Set<number>()
  private loadedCount = 0
  private failures = 0

  private target = 0
  /** Índice del frame REALMENTE pintado. Si no coincide con el objetivo, hay que repintar. */
  private drawn = -1
  private sizeDirty = true
  private raf = 0

  private trigger?: ScrollTrigger
  private mq?: MediaQueryList
  private isStatic = false
  progress = 0

  constructor(opts: ScrollSequenceOptions) {
    this.name = opts.name
    this.section = opts.section
    this.lengthVh = opts.lengthVh
    this.onProgress = opts.onProgress

    this.pin = this.section.querySelector<HTMLElement>('.seq__pin')!
    this.canvas = this.section.querySelector<HTMLCanvasElement>('.seq__canvas')!
    this.still = this.section.querySelector<HTMLImageElement>('.seq__still')
    this.ctx = this.canvas.getContext('2d', { alpha: false })

    this.meta = MANIFEST[this.name]
  }

  init(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Sin manifest, sin canvas o con reduce-motion: imagen estática, sin pin.
    if (!this.meta || !this.ctx || reduced) {
      this.goStatic()
      return
    }

    this.mq = window.matchMedia(MOBILE_QUERY)
    this.applyVariant(this.mq.matches ? 'mobile' : 'desktop')
    this.mq.addEventListener('change', this.onVariantChange)

    this.mount()
    this.watchViewport()
    window.addEventListener('resize', this.onResize, { passive: true })
  }

  // ── Carga ────────────────────────────────────────────────────

  private applyVariant(variant: Variant): void {
    this.variant = variant
    const v = this.meta![variant]
    this.count = v.count || this.meta!.frames
    // El CSS necesita la proporción REAL del juego activo para dibujar la banda
    // en pantallas verticales sin que `cover` recorte nada.
    this.section.style.setProperty('--seq-ratio', String(v.width / v.height))
    this.images = new Array(this.count).fill(null)
    this.pending.clear()
    this.loadedCount = 0
    this.failures = 0
    this.drawn = -1
    this.sizeDirty = true
  }

  private onVariantChange = (e: MediaQueryListEvent): void => {
    this.applyVariant(e.matches ? 'mobile' : 'desktop')
    void this.preload()
    ScrollTrigger.refresh()
  }

  private url(i: number): string {
    const n = String(i + 1).padStart(4, '0')
    return `/frames/${this.name}/${this.variant}/frame-${n}.webp`
  }

  /**
   * La precarga exige TRES condiciones: que la sección esté cerca del viewport,
   * que el usuario haya hecho scroll y que la página haya terminado de cargar.
   * Las secuencias no participan nunca de la carga inicial ni compiten con el LCP.
   */
  private watchViewport(): void {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        void afterFirstScroll().then(() => afterLoad(() => void this.preload()))
      },
      { rootMargin: '150% 0px 150% 0px' }
    )
    io.observe(this.section)
  }

  private async loadOne(i: number): Promise<void> {
    if (this.images[i] || this.pending.has(i)) return
    this.pending.add(i)
    const img = new Image()
    img.decoding = 'async'
    img.src = this.url(i)
    try {
      await img.decode()
      this.images[i] = img
      this.loadedCount++
      // Mientras el fotograma pintado no sea el que toca, cada carga nueva pide
      // repintado. Sin esto, si entras en la sección antes de que haya cargado
      // nada, se pinta el fotograma más cercano como aproximación y el lienzo
      // se queda ahí para siempre: nada vuelve a pedir que se repinte.
      if (this.drawn !== this.target) this.requestPaint()
    } catch {
      this.failures++
    } finally {
      this.pending.delete(i)
    }
  }

  private async runQueue(indices: number[]): Promise<void> {
    let next = 0
    const worker = async (): Promise<void> => {
      while (next < indices.length) await this.loadOne(indices[next++])
    }
    await Promise.all(Array.from({ length: PRELOAD_CONCURRENCY }, worker))
  }

  private async preload(): Promise<void> {
    const all = Array.from({ length: this.count }, (_, i) => i)
    const coarse = all.filter((i) => i % COARSE_STEP === 0)
    if (!coarse.includes(this.count - 1)) coarse.push(this.count - 1)

    await this.runQueue(coarse)

    // Si la pasada gruesa falló entera, son 404: pasa a estático en vez de
    // dejar un canvas congelado (este fue el fallo del intento anterior).
    if (this.loadedCount === 0) {
      console.error(`[seq:${this.name}] ningún frame cargó desde ${this.url(0)}`)
      this.goStatic()
      return
    }
    await this.runQueue(all.filter((i) => i % COARSE_STEP !== 0))
  }

  // ── Pintado ─────────────────────────────────────────────────

  /** Frame cargado más cercano al objetivo, para no dejar hueco durante la precarga. */
  private nearest(i: number): { img: HTMLImageElement; index: number } | null {
    if (this.images[i]) return { img: this.images[i]!, index: i }
    for (let d = 1; d < this.count; d++) {
      const lo = i - d
      const hi = i + d
      if (lo >= 0 && this.images[lo]) return { img: this.images[lo]!, index: lo }
      if (hi < this.count && this.images[hi]) return { img: this.images[hi]!, index: hi }
    }
    return null
  }

  private requestPaint(): void {
    if (this.raf) return
    this.raf = requestAnimationFrame(this.paint)
  }

  private paint = (): void => {
    this.raf = 0
    const ctx = this.ctx
    if (!ctx) return

    const found = this.nearest(this.target)
    if (!found) return
    if (found.index === this.drawn && !this.sizeDirty) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(this.canvas.clientWidth * dpr)
    const h = Math.round(this.canvas.clientHeight * dpr)
    // Lienzo sin tamaño (sección oculta o aún sin layout): no pintes, y sobre
    // todo no marques este fotograma como pintado o no se repintará nunca.
    if (w === 0 || h === 0) return
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.sizeDirty = false

    const { img } = found
    // Ajuste tipo object-fit: cover.
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    ctx.fillStyle = '#0B0B0C'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    this.drawn = found.index
  }

  private onResize = (): void => {
    this.sizeDirty = true
    this.requestPaint()
  }

  // ── Scroll ──────────────────────────────────────────────────

  private mount(): void {
    this.trigger = ScrollTrigger.create({
      trigger: this.section,
      start: 'top top',
      end: () => `+=${Math.round((window.innerHeight * this.lengthVh) / 100)}`,
      pin: this.pin,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        this.progress = self.progress
        const i = Math.round(self.progress * (this.count - 1))
        this.target = Math.min(this.count - 1, Math.max(0, i))
        this.requestPaint()
        this.onProgress?.(self.progress)
        if (self.progress > 0.02) this.section.classList.add('is-scrubbing')
      },
    })
  }

  private goStatic(): void {
    this.isStatic = true
    this.section.classList.add('is-static')
    if (this.still) {
      // La imagen de respaldo se pide solo aquí. Con `src` en el HTML el
      // navegador la descarga aunque esté oculta, y son ~20 KB que casi nunca
      // se ven: solo con reduce-motion o si fallan los fotogramas.
      const src = this.still.dataset.src
      if (src && !this.still.src) this.still.src = src
      this.still.hidden = false
    }
    this.trigger?.kill()
    this.trigger = undefined
  }

  // ── HUD ─────────────────────────────────────────────────────

  debugLine(): string {
    if (this.isStatic) return `${this.name.padEnd(8)} ESTÁTICO (fallback)`
    return (
      `${this.name.padEnd(8)} ${this.variant.padEnd(7)} ` +
      `frame ${String(this.target + 1).padStart(3)}/${this.count} · ` +
      `cargados ${String(this.loadedCount).padStart(3)}/${this.count}` +
      (this.failures ? ` · fallos ${this.failures}` : '') +
      ` · ${(this.progress * 100).toFixed(1)}%`
    )
  }

  /** Para la verificación automatizada en navegador. */
  debugState(): Record<string, unknown> {
    return {
      name: this.name,
      variant: this.variant,
      frame: this.target + 1,
      count: this.count,
      drawn: this.drawn + 1,
      loaded: this.loadedCount,
      failures: this.failures,
      progress: Number(this.progress.toFixed(4)),
      static: this.isStatic,
    }
  }
}
