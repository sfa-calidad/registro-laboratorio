const { contextBridge, ipcRenderer } = require('electron')

// API mínima expuesta a la app web para "impresión rápida": imprimir un
// rótulo directo a la impresora (sin diálogo) y listar impresoras instaladas.
contextBridge.exposeInMainWorld('desktopPrinter', {
  getPrinters: () => ipcRenderer.invoke('rotulos:get-printers'),
  printLabel: (opts) => ipcRenderer.invoke('rotulos:print-label', opts),
  getVersion: () => ipcRenderer.invoke('rotulos:app-version'),
})
