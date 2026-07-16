const { app, BrowserWindow, shell, Menu, dialog, session, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFile } = require('child_process')

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

// Script PowerShell que manda bytes crudos (ZPL) al spooler de Windows con
// winspool.drv. Se escribe a un archivo temporal al momento de usarlo porque
// PowerShell no puede leer archivos empaquetados dentro del .asar.
const RAW_PRINT_PS1 = `param([string]$PrinterName, [string]$FilePath)
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  public static bool SendFile(string printerName, string filePath) {
    byte[] bytes = File.ReadAllBytes(filePath);
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Rotulo Laboratorio SFA";
    di.pDataType = "RAW";
    bool ok = false;
    if (StartDocPrinter(hPrinter, 1, di)) {
      if (StartPagePrinter(hPrinter)) {
        IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, p, bytes.Length);
        int written;
        ok = WritePrinter(hPrinter, p, bytes.Length, out written);
        Marshal.FreeCoTaskMem(p);
        EndPagePrinter(hPrinter);
      }
      EndDocPrinter(hPrinter);
    }
    ClosePrinter(hPrinter);
    return ok;
  }
}
'@
if ([RawPrinter]::SendFile($PrinterName, $FilePath)) { exit 0 } else { exit 1 }
`

function printRawZpl(printerName, zpl) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, failureReason: 'ZPL directo solo disponible en Windows' })
      return
    }
    let dir
    try {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotulo-'))
      fs.writeFileSync(path.join(dir, 'print-raw.ps1'), RAW_PRINT_PS1, 'utf8')
      fs.writeFileSync(path.join(dir, 'rotulo.zpl'), zpl, 'utf8')
    } catch (e) {
      resolve({ success: false, failureReason: 'No se pudo preparar el archivo ZPL' })
      return
    }
    const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} }
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
       '-File', path.join(dir, 'print-raw.ps1'),
       '-PrinterName', printerName,
       '-FilePath', path.join(dir, 'rotulo.zpl')],
      { timeout: 30000, windowsHide: true },
      (error) => {
        cleanup()
        if (error) resolve({ success: false, failureReason: 'El spooler rechazó el envío ZPL' })
        else resolve({ success: true, failureReason: '' })
      }
    )
  })
}

ipcMain.handle('rotulos:app-version', () => app.getVersion())

ipcMain.handle('rotulos:get-printers', async () => {
  const win = mainWindow || BrowserWindow.getAllWindows()[0]
  if (!win) return []
  const printers = await win.webContents.getPrintersAsync()
  return printers.map((p) => ({ name: p.name, isDefault: !!p.isDefault }))
})

ipcMain.handle('rotulos:print-label', async (_e, opts) => {
  const { html, deviceName, widthMm, heightMm, zpl } = opts || {}
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

  // Con impresoras Zebra (driver ZPL) lo más confiable es mandar el ZPL crudo
  // al spooler, sin pasar por el sistema de impresión de Chromium.
  if (typeof zpl === 'string' && zpl && /zdesigner|zebra|zpl/i.test(printer)) {
    const rawResult = await printRawZpl(printer, zpl)
    if (rawResult.success) return { success: true, failureReason: '', usedZpl: true }
  }

  const attempt = (extra) =>
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
            ...extra,
          },
          (success, failureReason) => done(success, failureReason)
        )
      })
      printWin.webContents.once('did-fail-load', () => done(false, 'No se pudo cargar el rótulo'))
      setTimeout(() => done(false, 'Tiempo de espera agotado'), 30000)
      printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    })

  // Electron en Windows a veces rechaza la impresión silenciosa según qué
  // opciones reciba ("Invalid printer settings", electron#39092). Se intenta
  // de más específico a más simple: tamaño real de etiqueta + dpi (203 es la
  // resolución típica de las Zebra), solo tamaño, solo dpi, y básico.
  const pageSize = { width: Math.round(w * 1000), height: Math.round(h * 1000) } // micrones
  const dpi = { horizontal: 203, vertical: 203 }
  let result = { success: false, failureReason: '' }
  for (const extra of [{ pageSize, dpi }, { pageSize }, { dpi }, {}]) {
    result = await attempt(extra)
    if (result.success) return result
  }

  // Último recurso: si la impresión silenciosa falló con todas las variantes,
  // se abre el diálogo de impresión para que la etiqueta pueda salir igual.
  const dialogResult = await new Promise((resolve) => {
    // La ventana debe ser visible: el diálogo de impresión no aparece si la
    // ventana dueña está oculta.
    const printWin = new BrowserWindow({
      show: true,
      width: 500,
      height: 320,
      title: 'Imprimiendo rótulo…',
      parent: mainWindow || undefined,
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
        { silent: false, deviceName: printer || undefined, printBackground: true },
        (success, failureReason) => done(success, failureReason)
      )
    })
    printWin.webContents.once('did-fail-load', () => done(false, 'No se pudo cargar el rótulo'))
    setTimeout(() => done(false, 'Tiempo de espera agotado'), 10 * 60 * 1000)
    printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  })
  if (dialogResult.success) return { success: true, failureReason: '', usedDialog: true }

  return {
    success: false,
    failureReason: `${result.failureReason || 'error desconocido'} (impresora: ${printer || 'predeterminada'})`,
  }
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
