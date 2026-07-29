import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Para timestamps reales (createdAt, completadaAt): se muestra la fecha en la
// zona horaria de quien mira.
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MM/yyyy', { locale: es })
}

// Para fechas-calendario (el `fecha` de ingresos/despachos, `fechaVencimiento`):
// se cargan desde un <input type="date"> y se guardan como medianoche UTC. Hay
// que formatearlas por sus componentes UTC para que muestren el mismo día en
// cualquier zona horaria y tanto en el servidor (UTC) como en el navegador.
export function formatDateOnly(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return format(local, 'dd/MM/yyyy', { locale: es })
}

// Zona del laboratorio. El "día" del laboratorio no es el del proceso que
// ejecuta el código: en Vercel el servidor corre en UTC y a partir de las 21:00
// hora argentina ya está en el día siguiente. Todo lo que sea "hoy", "este mes"
// o "este año" se ancla acá y no al reloj de la máquina, así funciona igual en
// Vercel, en el navegador del operador y en una PC de planta.
export const ZONA_LABORATORIO = 'America/Argentina/Buenos_Aires'

// Fecha de hoy en el laboratorio, como YYYY-MM-DD. Es lo que se precarga en los
// <input type="date">. Antes usaba `toISOString()`, que da la fecha UTC, así que
// después de las 21:00 devolvía el día siguiente y todo lo que se cargaba en el
// turno tarde quedaba fechado un día adelante.
export function todayISO(ahora: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD, que es justo lo que espera el input.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_LABORATORIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
}

// Medianoche UTC del día que hoy es en el laboratorio, para comparar contra las
// fechas-calendario de la base (que se guardan como medianoche UTC).
export function hoyEnLaboratorio(ahora: Date = new Date()): Date {
  return new Date(`${todayISO(ahora)}T00:00:00.000Z`)
}

// Suma días a una fecha-calendario sin salirse de UTC (para armar el tope
// superior de un rango: "desde hoy y antes de mañana").
export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 86400000)
}

// Los parámetros de ruta llegan como texto. Sin validar, un /api/tareas/abc
// terminaba en Prisma con NaN y devolvía un 500 con el stack en vez de un 400.
export function parseId(valor: string): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}
