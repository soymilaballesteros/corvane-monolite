#!/usr/bin/env node
/**
 * build-frames.mjs — vídeo → secuencia de frames WebP para <canvas> scroll-driven.
 *
 *   node scripts/build-frames.mjs --input assets/source/x.mp4 --name rotate --frames 100
 *   node scripts/build-frames.mjs --all
 *
 * ffmpeg de este equipo NO trae encoder WebP, así que el pipeline es:
 *   ffmpeg -> PNG (ya escalado/recortado) -> cwebp -> WebP
 *
 * Cada secuencia se genera en dos juegos:
 *   desktop  escala a 1440 px de ancho
 *   mobile   recorta el centro a 3:4 y escala a 720 px (mejor encuadre vertical
 *            y bastantes menos bytes que escalar el 16:9 entero)
 *
 * Si un juego se pasa de presupuesto, baja la calidad y, si hace falta, el ancho,
 * reintentando automáticamente. Solo falla si ni el suelo cumple.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, rm, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const run = promisify(execFile)
const ROOT = path.resolve(import.meta.dirname, '..')
const TMP = path.join(ROOT, '.tmp-frames')
const OUT_ROOT = path.join(ROOT, 'public', 'frames')
const MANIFEST = path.join(ROOT, 'src', 'frames.manifest.json')

/** Secuencias del proyecto. `pnpm frames` construye estas dos. */
const SEQUENCES = [
  { name: 'rotate', input: 'assets/source/sneaker-rotate.mp4', frames: 100 },
  { name: 'explode', input: 'assets/source/sneaker-explode.mp4', frames: 120 },
]

/** Presupuesto DURO por secuencia y juego. */
const BUDGET = {
  desktop: { bytes: 5 * 1024 * 1024, perFrameTargetKB: 35, widths: [1440, 1280, 1152] },
  mobile: { bytes: 2 * 1024 * 1024, perFrameTargetKB: 17, widths: [720, 640, 576] },
}
const QUALITIES = [72, 66, 60, 54, 48]

const KB = (b) => (b / 1024).toFixed(1)
const MB = (b) => (b / 1024 / 1024).toFixed(2)

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all') out.all = true
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i]
  }
  return out
}

async function probe(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_frames,avg_frame_rate:format=duration',
    '-of', 'json', file,
  ])
  const j = JSON.parse(stdout)
  const s = j.streams[0]
  const [num, den] = (s.avg_frame_rate || '0/1').split('/').map(Number)
  return {
    width: s.width,
    height: s.height,
    fps: den ? num / den : 0,
    duration: parseFloat(j.format.duration),
  }
}

/** Filtro de vídeo por juego. mobile recorta al centro en 3:4 antes de escalar. */
function videoFilter(variant, width) {
  return variant === 'mobile'
    ? `crop=floor(ih*3/8)*2:ih,scale=${width}:-2:flags=lanczos`
    : `scale=${width}:-2:flags=lanczos`
}

/** Extrae exactamente `count` PNG repartidos de forma uniforme por todo el clip. */
async function extractPngs(input, dir, { variant, width, count, duration }) {
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  const fps = count / duration
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', input,
    '-vf', `${videoFilter(variant, width)},fps=${fps.toFixed(6)}`,
    '-frames:v', String(count),
    '-vsync', '0',
    path.join(dir, 'f-%05d.png'),
  ])
  const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()
  if (!files.length) throw new Error(`ffmpeg no extrajo ningún frame de ${input}`)
  return files.map((f) => path.join(dir, f))
}

/** cwebp en paralelo, un proceso por core (menos 1). */
async function encodeWebp(pngs, outDir, quality) {
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })
  const limit = Math.max(2, os.cpus().length - 1)
  let next = 0
  let total = 0
  let max = 0

  async function worker() {
    while (next < pngs.length) {
      const i = next++
      const out = path.join(outDir, `frame-${String(i + 1).padStart(4, '0')}.webp`)
      await run('cwebp', ['-quiet', '-q', String(quality), '-m', '6', '-sharp_yuv', pngs[i], '-o', out])
      const { size } = await stat(out)
      total += size
      if (size > max) max = size
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return { total, max, count: pngs.length }
}


/**
 * Stills derivados del mismo clip: póster del hero (LCP), imágenes de
 * respaldo para reduce-motion y los tres retratos del atelier.
 * Salen del vídeo para que TODA la página muestre exactamente la misma pieza.
 */
const IMG_DIR = path.join(ROOT, 'public', 'img')

/** Un frame del vídeo -> WebP recortado y escalado. */
async function still(input, { at, crop, width, height, quality, out }) {
  await mkdir(IMG_DIR, { recursive: true })
  const png = path.join(TMP, `still-${path.basename(out, '.webp')}.png`)
  await mkdir(TMP, { recursive: true })
  const seek = at > 0 ? ['-ss', at.toFixed(3)] : []
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...seek, '-i', input,
    '-frames:v', '1',
    '-vf', `${crop},scale=${width}:${height}:flags=lanczos`,
    png,
  ])
  const dest = path.join(IMG_DIR, out)
  await run('cwebp', ['-quiet', '-q', String(quality), '-m', '6', '-sharp_yuv', png, '-o', dest])
  await rm(png, { force: true })
  const { size } = await stat(dest)
  console.log(`   still  ${out.padEnd(22)} ${width}x${height}  ${KB(size)} KB`)
  return size
}

async function emitStills(seq, meta) {
  const d = meta.duration
  // Recortes centrados calculados sobre la altura, así valen para cualquier fuente.
  const crop34 = 'crop=floor(ih*3/8)*2:ih'
  const crop45 = 'crop=floor(ih*2/5)*2:ih'

  if (seq.name === 'rotate') {
    await still(seq.inputAbs, { at: 0.05, crop: crop34, width: 900, height: 1200, quality: 80, out: 'hero-poster.webp' })
    await still(seq.inputAbs, { at: 0.05, crop: 'crop=iw:ih', width: 1440, height: 810, quality: 72, out: 'fallback-rotate.webp' })
    // Atelier: usa las imágenes generadas si existen; si no, recorta el clip.
    const shots = [
      ['craft-curtido.webp', 0.15, 'atelier-curtido'],
      ['craft-montado.webp', 0.45, 'atelier-montado'],
      ['craft-patina.webp', 0.75, 'atelier-patina'],
    ]
    for (const [out, frac, source] of shots) {
      const custom = ['png', 'jpg', 'jpeg', 'webp']
        .map((ext) => path.join(ROOT, 'assets', 'source', `${source}.${ext}`))
        .find((f) => existsSync(f))
      if (custom) {
        await still(custom, { at: 0, crop: crop45, width: 800, height: 1000, quality: 78, out })
      } else {
        await still(seq.inputAbs, { at: d * frac, crop: crop45, width: 800, height: 1000, quality: 75, out })
      }
    }
  } else if (seq.name === 'explode') {
    // Casi al final: la pieza ya está completamente desplegada.
    await still(seq.inputAbs, { at: Math.max(0, d - 0.3), crop: 'crop=iw:ih', width: 1440, height: 810, quality: 72, out: 'fallback-explode.webp' })
  }
}

async function buildVariant(seq, variant, meta) {
  const budget = BUDGET[variant]
  const tmpDir = path.join(TMP, seq.name, variant)
  const outDir = path.join(OUT_ROOT, seq.name, variant)

  for (const width of budget.widths) {
    const pngs = await extractPngs(seq.inputAbs, tmpDir, {
      variant, width, count: seq.frames, duration: meta.duration,
    })
    // Dimensiones reales del primer PNG (el filtro -2 redondea a par).
    const { stdout } = await run('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', pngs[0],
    ])
    const [w, h] = stdout.trim().split('x').map(Number)

    for (const q of QUALITIES) {
      const res = await encodeWebp(pngs, outDir, q)
      const avg = res.total / res.count
      const ok = res.total <= budget.bytes
      console.log(
        `   ${variant.padEnd(7)} ${w}x${h}  q${q}  ${String(res.count).padStart(3)} frames  ` +
        `medio ${KB(avg).padStart(6)} KB  máx ${KB(res.max).padStart(6)} KB  ` +
        `total ${MB(res.total)} MB  ${ok ? '✓' : '✗ excede'}`
      )
      if (ok) {
        return { count: res.count, width: w, height: h, quality: q, bytes: res.total, avg, max: res.max }
      }
    }
    console.log(`   ${variant}: ningún nivel de calidad cabe a ${width}px, bajo resolución…`)
  }
  await rm(tmpDir, { recursive: true, force: true })
  throw new Error(
    `[${seq.name}/${variant}] IMPOSIBLE cumplir el presupuesto de ${MB(budget.bytes)} MB ` +
    `ni con calidad ${QUALITIES.at(-1)} a ${budget.widths.at(-1)}px.`
  )
}

async function buildSequence(seq) {
  seq.inputAbs = path.resolve(ROOT, seq.input)
  if (!existsSync(seq.inputAbs)) throw new Error(`No existe el vídeo de entrada: ${seq.input}`)

  const meta = await probe(seq.inputAbs)
  console.log(`\n▸ ${seq.name}  ←  ${seq.input}`)
  console.log(
    `   origen ${meta.width}x${meta.height} · ${meta.duration.toFixed(2)}s · ` +
    `${meta.fps.toFixed(2)} fps · objetivo ${seq.frames} frames`
  )

  await emitStills(seq, meta)
  const desktop = await buildVariant(seq, 'desktop', meta)
  const mobile = await buildVariant(seq, 'mobile', meta)
  await rm(path.join(TMP, seq.name), { recursive: true, force: true })

  if (desktop.count !== mobile.count) {
    throw new Error(
      `[${seq.name}] desktop y mobile tienen distinto nº de frames ` +
      `(${desktop.count} vs ${mobile.count}); el runtime asume el mismo índice en ambos.`
    )
  }
  if (desktop.avg / 1024 > BUDGET.desktop.perFrameTargetKB) {
    console.log(
      `   ⚠︎ aviso: ${KB(desktop.avg)} KB/frame supera el objetivo de ` +
      `${BUDGET.desktop.perFrameTargetKB} KB (dentro del presupuesto total, pero apretado).`
    )
  }
  return { frames: desktop.count, desktop, mobile }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const list = args.all
    ? SEQUENCES
    : [{ name: args.name, input: args.input, frames: Number(args.frames) || 100 }]

  if (!args.all && (!args.name || !args.input)) {
    console.error('Uso: --input <vídeo> --name <secuencia> --frames <n>   |   --all')
    process.exit(1)
  }

  const manifest = existsSync(MANIFEST)
    ? JSON.parse(await run('cat', [MANIFEST]).then((r) => r.stdout))
    : {}

  for (const seq of list) manifest[seq.name] = await buildSequence(seq)

  await mkdir(path.dirname(MANIFEST), { recursive: true })
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  await rm(TMP, { recursive: true, force: true })

  console.log('\n── Resumen ──')
  let grand = 0
  for (const [name, s] of Object.entries(manifest)) {
    const t = s.desktop.bytes + s.mobile.bytes
    grand += t
    console.log(
      `  ${name.padEnd(8)} ${String(s.frames).padStart(3)} frames · ` +
      `desktop ${MB(s.desktop.bytes)} MB · mobile ${MB(s.mobile.bytes)} MB · total ${MB(t)} MB`
    )
  }
  console.log(`  ${''.padEnd(8)} TODO: ${MB(grand)} MB`)
  console.log(`\n✓ manifest → src/frames.manifest.json`)
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`)
  process.exit(1)
})
