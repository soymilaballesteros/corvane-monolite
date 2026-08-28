import { defineConfig, type Plugin } from 'vite'

/**
 * Incrusta el CSS en el HTML y elimina el <link>. En una conexión móvil lenta,
 * el viaje de ida y vuelta extra para pedir la hoja de estilos cuesta más que
 * los ~4 KB comprimidos que añade al documento, y además bloquea el render.
 * Las url() de las fuentes ya salen absolutas (/assets/…), así que no se rompen.
 */
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        let out = html
        for (const [file, asset] of Object.entries(ctx.bundle)) {
          if (!file.endsWith('.css') || asset.type !== 'asset') continue
          const name = file.split('/').pop()!
          const link = new RegExp(`<link[^>]*href="[^"]*${name}"[^>]*>`)
          if (!link.test(out)) continue
          out = out.replace(link, `<style>${String(asset.source)}</style>`)
          delete ctx.bundle[file]
        }
        return out
      },
    },
  }
}

export default defineConfig({
  plugins: [inlineCss()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        // GSAP en su propio chunk: cachea aparte del código de la página.
        manualChunks: { gsap: ['gsap', 'gsap/ScrollTrigger'] },
      },
    },
  },
})
