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

// Imprime un rótulo. En la app de escritorio va directo a la impresora elegida
// (ZPL crudo si es una Zebra); en el navegador abre la ventana con el diálogo
// de impresión de siempre.
export async function imprimirEtiqueta(
  tipo: string,
  data: LabelData,
  config: EtiquetaConfig,
  opciones: { deviceName?: string } = {}
): Promise<ResultadoImpresion> {
  const html = buildLabelHTML(tipo, data, config)

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
      zpl: buildLabelZPL(tipo, data, config),
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
