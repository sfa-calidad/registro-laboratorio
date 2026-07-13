const { app, BrowserWindow, shell, Menu, dialog, session, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// La URL de la app publicada se lee de config.json (editable sin recompilar,
// se puede sobreescribir con la variable de entorno APP_URL).
function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'))
    return cfg.appUrl
  } catch {
    return null
  }
}

const APP_URL = getAppUrl()

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Registro Laboratorio SFA',
    backgroundColor: '#3b1d52',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Menú mínimo (sin herramientas de desarrollo ni menús de Electron por defecto).
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Archivo',
        submenu: [
          { label: 'Recargar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
          { type: 'separator' },
          { role: 'quit', label: 'Salir' },
        ],
      },
      {
        label: 'Editar',
        submenu: [
          { role: 'cut', label: 'Cortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Pegar' },
          { role: 'selectAll', label: 'Seleccionar todo' },
        ],
      },
      {
        label: 'Ver',
        submenu: [
          { role: 'resetZoom', label: 'Zoom normal' },
          { role: 'zoomIn', label: 'Acercar' },
          { role: 'zoomOut', label: 'Alejar' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Pantalla completa' },
        ],
      },
    ])
  )

  if (!APP_URL || APP_URL.includes('REEMPLAZAR')) {
    dialog.showErrorBox(
      'Configuración incompleta',
      'Falta configurar la dirección de la aplicación en config.json (campo "appUrl").'
    )
    mainWindow.loadURL('data:text/html,' + encodeURIComponent(
      '<body style="font-family:sans-serif;padding:2rem;color:#3b1d52">' +
      '<h2>Configuración incompleta</h2>' +
      '<p>Editá <b>config.json</b> y poné la dirección real de la aplicación en <b>appUrl</b>.</p></body>'
    ))
    return
  }

  mainWindow.loadURL(APP_URL)

  // Las ventanas internas se permiten (la impresión clásica usa about:blank);
  // los links externos (fuera del dominio de la app) se abren en el navegador.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || (APP_URL && url.startsWith(APP_URL))) {
      return { action: 'allow' }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Si pierde conexión y no puede cargar, muestra un aviso amable.
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    mainWindow.loadURL('data:text/html,' + encodeURIComponent(
      '<body style="font-family:sans-serif;padding:2rem;color:#3b1d52;text-align:center">' +
      '<h2>No se pudo conectar</h2>' +
      '<p>Verificá tu conexión a internet e intentá de nuevo.</p>' +
      '<button onclick="location.href=\'' + APP_URL + '\'" ' +
      'style="padding:.6rem 1.2rem;background:#3b1d52;color:#fff;border:0;border-radius:8px;cursor:pointer">Reintentar</button>' +
      '</body>'
    ))
  })
}

// --- Impresión rápida de rótulos (sin diálogo) -----------------------------

ipcMain.handle('rotulos:get-printers', async () => {
  const win = mainWindow || BrowserWindow.getAllWindows()[0]
  if (!win) return []
  const printers = await win.webContents.getPrintersAsync()
  return printers.map((p) => ({ name: p.name, isDefault: !!p.isDefault }))
})

ipcMain.handle('rotulos:print-label', async (_e, opts) => {
  const { html, deviceName, widthMm, heightMm } = opts || {}
  if (typeof html !== 'string' || !html) {
    return { success: false, failureReason: 'Rótulo vacío' }
  }
  const w = Number(widthMm) > 0 ? Number(widthMm) : 100
  const h = Number(heightMm) > 0 ? Number(heightMm) : 45

  // Resuelve la impresora: la elegida, o la predeterminada real del sistema.
  // "silent" con deviceName vacío falla en Windows ("Invalid printer settings"),
  // así que siempre se pasa un nombre concreto y validado.
  let printer = typeof deviceName === 'string' ? deviceName : ''
  const anyWin = mainWindow || BrowserWindow.getAllWindows()[0]
  if (anyWin) {
    const printers = await anyWin.webContents.getPrintersAsync()
    if (printers.length === 0) {
      return { success: false, failureReason: 'No hay impresoras instaladas en esta PC' }
    }
    if (!printer) {
      printer = (printers.find((p) => p.isDefault) || printers[0]).name
    } else if (!printers.some((p) => p.name === printer)) {
      return { success: false, failureReason: `La impresora "${printer}" no está instalada en esta PC` }
    }
  }

  const attempt = (pageSize) =>
    new Promise((resolve) => {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      })
      let settled = false
      const done = (success, failureReason) => {
        if (settled) return
        settled = true
        if (!printWin.isDestroyed()) printWin.destroy()
        resolve({ success, failureReason: failureReason || '' })
      }
      printWin.webContents.once('did-finish-load', () => {
        printWin.webContents.print(
          {
            silent: true,
            deviceName: printer || undefined,
            printBackground: true,
            margins: { marginType: 'none' },
            ...(pageSize ? { pageSize } : {}),
          },
          (success, failureReason) => done(success, failureReason)
        )
      })
      printWin.webContents.once('did-fail-load', () => done(false, 'No se pudo cargar el rótulo'))
      setTimeout(() => done(false, 'Tiempo de espera agotado'), 30000)
      printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    })

  // Primero con el tamaño real de la etiqueta (micrones = mm * 1000); si el
  // driver lo rechaza, reintenta con el tamaño de papel configurado en el driver.
  let result = await attempt({ width: Math.round(w * 1000), height: Math.round(h * 1000) })
  if (!result.success) {
    result = await attempt(null)
  }
  return result
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Al cerrar la app se borran las cookies (la sesión iniciada), así al volver
// a abrirla siempre pide la contraseña de nuevo.
let cookiesCleared = false
app.on('before-quit', (e) => {
  if (cookiesCleared) return
  e.preventDefault()
  cookiesCleared = true
  session.defaultSession
    .clearStorageData({ storages: ['cookies'] })
    .catch(() => {})
    .finally(() => app.quit())
})
