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

// Los dos caminos para imprimir un rótulo:
//
//  - 'zpl' (impresión rápida): manda ZPL crudo al spooler, sin diálogo. Es lo
//    más rápido y el texto sale nítido, pero la Zebra dibuja solo lo que el ZPL
//    describe: sin logo ni tipografías. Solo existe en la app de escritorio.
//  - 'diseno': abre la ventana con el diálogo de impresión y manda el HTML,
//    igual que el botón "Imprimir rótulo" de los rótulos de movimientos. Sale
//    tal cual la vista previa, con logo.
//
// No se usa el camino de impresión silenciosa de Chromium para el diseño: en
// Windows el driver de la Zebra lo rechaza con "Invalid printer settings"
// (electron#39092). El diálogo, en cambio, funciona.
export type ModoImpresion = 'zpl' | 'diseno'

function imprimirPorDialogo(html: string): ResultadoImpresion {
  const w = window.open('', '_blank')
  if (!w) return { ok: false, mensaje: 'El navegador bloqueó la ventana de impresión', usoDialogo: true }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 500)
  return { ok: true, mensaje: '', usoDialogo: true }
}

export async function imprimirEtiqueta(
  tipo: string,
  data: LabelData,
  config: EtiquetaConfig,
  opciones: { deviceName?: string; modo?: ModoImpresion } = {}
): Promise<ResultadoImpresion> {
  const html = buildLabelHTML(tipo, data, config)
  const modo: ModoImpresion = opciones.modo ?? 'zpl'

  // En el navegador siempre va por el diálogo; en la app de escritorio, cuando
  // se pide el diseño.
  if (!window.desktopPrinter || modo === 'diseno') {
    return imprimirPorDialogo(html)
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
