import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const DIR = __dirname

function parseFecha(s: string | null): Date | null {
  if (!s) return null
  s = s.trim()
  const iso = /^\d{4}-\d{2}-\d{2}/
  if (iso.test(s)) return new Date(s)
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`)
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function blank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

const USUARIOS: Record<string, { nombre: string; apellido: string }> = {
  '6e7a9d2d-4664-4be8-8965-2baf748d2f8e': { nombre: 'Martin', apellido: 'Cerrudo' },
  '5ab316cd-6f90-4adc-b56d-95e9b775a2af': { nombre: 'Laboratorio', apellido: 'SFA' },
  '70928390-b16d-4905-b8d6-da20391bea6b': { nombre: 'Analistas', apellido: 'I+D' },
}

const ESTADO_A_COLUMNA: Record<string, string> = {
  'Completado': 'Completado',
  'En curso': 'En Progreso',
  'No iniciado': 'Pendiente',
}

const PRIORIDAD_MAP: Record<string, string> = {
  'Urgente': 'alta',
  'Importante': 'alta',
  'Media': 'media',
  'Baja': 'baja',
}

async function main() {
  const analistaIdByUserId: Record<string, number> = {}
  for (const [userId, { nombre, apellido }] of Object.entries(USUARIOS)) {
    const a = await prisma.analista.upsert({
      where: { nombre_apellido: { nombre, apellido } },
      update: {},
      create: { nombre, apellido },
    })
    analistaIdByUserId[userId] = a.id
  }

  const columnas = await prisma.columnaKanban.findMany()
  const columnaIdByNombre: Record<string, number> = {}
  for (const c of columnas) columnaIdByNombre[c.nombre] = c.id

  const tareasRaw: Record<string, string | null>[] = JSON.parse(fs.readFileSync(path.join(DIR, 'tareas.json'), 'utf-8'))
  let tareasCreadas = 0
  for (const r of tareasRaw) {
    const titulo = r['Nombre de la tarea']
    if (blank(titulo)) continue
    const estado = r['Estado'] || 'No iniciado'
    const columnaId = columnaIdByNombre[ESTADO_A_COLUMNA[estado] || 'Pendiente']
    const prioridad = r['Priority'] ? PRIORIDAD_MAP[r['Priority']] || null : null
    const creadoPorUserId = r['Creado por']
    const completadoPorUserId = r['Completado por']
    const creadoPor = (creadoPorUserId && USUARIOS[creadoPorUserId])
      ? `${USUARIOS[creadoPorUserId].nombre} ${USUARIOS[creadoPorUserId].apellido}`
      : 'supervisor'
    const analistaId1 = completadoPorUserId ? analistaIdByUserId[completadoPorUserId] ?? null : null
    const fechaCreacion = parseFecha(r['Fecha de creación'])
    const fechaVencimiento = parseFecha(r['Fecha de vencimiento'])
    const fechaFinalizacion = parseFecha(r['Fecha de finalización'])
    const notasTexto = r['Notas']
    const etiquetaTexto = r['Etiquetas']

    await prisma.tarea.create({
      data: {
        titulo: titulo!.trim(),
        descripcion: r['Elementos de la lista de comprobación'] || null,
        columnaId,
        analistaId1,
        prioridad,
        fechaVencimiento,
        creadoPor,
        completadaAt: estado === 'Completado' ? (fechaFinalizacion || fechaCreacion) : null,
        createdAt: fechaCreacion || undefined,
        etiquetas: etiquetaTexto ? JSON.stringify([{ texto: etiquetaTexto, color: '#8bc53f' }]) : null,
        notas: notasTexto ? JSON.stringify([{ texto: notasTexto, mostrarEnTarjeta: false }]) : null,
      },
    })
    tareasCreadas++
  }
  console.log('Tareas creadas:', tareasCreadas)

  const ingresosRaw: Record<string, string | number | null>[] = JSON.parse(fs.readFileSync(path.join(DIR, 'ingresos.json'), 'utf-8'))
  let ingresosCreados = 0
  for (const r of ingresosRaw) {
    const hr = r['H.R./REMITO']
    const fecha = parseFecha(r['FECHA'] as string | null)
    const origen = r['ORIGEN']
    const producto1 = r['PRODUCTO 1']
    if (blank(hr) || !fecha || blank(origen) || blank(producto1)) continue
    await prisma.ingreso.create({
      data: {
        hrRemito: String(hr).trim(),
        fecha,
        origen: String(origen).trim(),
        producto1: String(producto1).trim(),
        producto2: blank(r['PRODUCTO 2']) ? null : String(r['PRODUCTO 2']).trim(),
        observacion: blank(r['OBSERVACIÓN']) ? null : String(r['OBSERVACIÓN']).trim(),
        createdAt: fecha,
      },
    })
    ingresosCreados++
  }
  console.log('Ingresos creados:', ingresosCreados)

  const despachosRaw: Record<string, string | number | null>[] = JSON.parse(fs.readFileSync(path.join(DIR, 'despachos.json'), 'utf-8'))
  let despachosCreados = 0
  for (const r of despachosRaw) {
    const hr = r['H.R./CONTRATO']
    const fecha = parseFecha(r['FECHA'] as string | null)
    const destino = r['DESTINO']
    const producto = r['PRODUCTO']
    if (blank(hr) || !fecha || blank(destino) || blank(producto)) continue
    await prisma.despacho.create({
      data: {
        hrContrato: String(hr).trim(),
        fecha,
        destino: String(destino).trim(),
        producto: String(producto).trim(),
        deposito: blank(r['DEPÓSITO']) ? null : String(r['DEPÓSITO']).trim(),
        idTransporte: blank(r['ID TRANSPORTE']) ? '-' : String(r['ID TRANSPORTE']).trim(),
        observacion: blank(r['OBSERVACIÓN']) ? null : String(r['OBSERVACIÓN']).trim(),
        precintSFA: blank(r['PRECINTO SFA']) ? null : String(r['PRECINTO SFA']).trim(),
        precintAduana: blank(r['PRECINTO ADUANA']) ? null : String(r['PRECINTO ADUANA']).trim(),
        createdAt: fecha,
      },
    })
    despachosCreados++
  }
  console.log('Despachos creados:', despachosCreados)
}

main().catch(console.error).finally(() => prisma.$disconnect())
