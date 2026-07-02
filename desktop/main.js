const { app, BrowserWindow, shell, Menu, dialog } = require('electron')
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

  // Los links externos (que salen del dominio de la app) se abren en el navegador.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
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

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
