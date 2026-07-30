import { buildLabelZPL, type LabelData } from '@/lib/zpl'
import { buildLabelHTML, type EtiquetaConfig } from '@/lib/etiqueta'

// API que expone la app de escritorio (Electron) para imprimir sin diálogo.
export type DesktopPrinter = {
  getPrinters: () => Promise<{ name: string; isDefault: boolean }[]>
  printLabel: (opts: {
    html: string
    zpl?: string
    deviceName?: string
    widthMm: number
    heightMm: number
  }) => Promise<{ success: boolean; failureReason: string; usedDialog?: boolean; usedZpl?: boolean }>
  // Existe desde la versión 1.1.0 de la app de escritorio.
  getVersion?: () => Promise<string>
}

declare global {
  interface Window {
    desktopPrinter?: DesktopPrinter
  }
}

// Impresora elegida una vez por PC; la comparten todas las pantallas que
// imprimen rótulos.
export const PRINTER_STORAGE_KEY = 'rotulos_impresora'

export type ResultadoImpresion = { ok: boolean; mensaje: string; usoDialogo: boolean }

// Cómo mandar el rótulo a una Zebra desde la app de escritorio:
//
//  - 'zpl': ZPL crudo al spooler. Es el camino más rápido y confiable, y el
//    texto sale nítido, pero la Zebra dibuja solo lo que el ZPL describe: no
//    hay logo ni tipografías.
//  - 'diseno': se imprime el HTML como gráfico, así que sale igual que la
//    vista previa, con el logo. Tarda un poco más.
//
// En el navegador no aplica: siempre va por el diálogo de impresión, que ya
// imprime el HTML.
export type ModoImpresion = 'zpl' | 'diseno'

export async function imprimirEtiqueta(
  tipo: string,
  data: LabelData,
  config: EtiquetaConfig,
  opciones: { deviceName?: string; modo?: ModoImpresion } = {}
): Promise<ResultadoImpresion> {
  const html = buildLabelHTML(tipo, data, config)
  const modo: ModoImpresion = opciones.modo ?? 'zpl'

  if (!window.desktopPrinter) {
    const w = window.open('', '_blank')
    if (!w) return { ok: false, mensaje: 'El navegador bloqueó la ventana de impresión', usoDialogo: true }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
    return { ok: true, mensaje: '', usoDialogo: true }
  }

  const deviceName = opciones.deviceName || localStorage.getItem(PRINTER_STORAGE_KEY) || undefined
  try {
    const res = await window.desktopPrinter.printLabel({
      html,
      // Sin ZPL, la app de escritorio imprime el HTML como gráfico: es lo que
      // hace que salga el logo.
      zpl: modo === 'zpl' ? buildLabelZPL(tipo, data, config) : undefined,
      deviceName,
      widthMm: Number(config.etiquetaAncho) || 100,
      heightMm: Number(config.etiquetaAlto) || 45,
    })
    if (!res.success) {
      return { ok: false, mensaje: res.failureReason || 'error desconocido', usoDialogo: false }
    }
    return { ok: true, mensaje: '', usoDialogo: Boolean(res.usedDialog) }
  } catch {
    return { ok: false, mensaje: 'No se pudo imprimir el rótulo', usoDialogo: false }
  }
}
