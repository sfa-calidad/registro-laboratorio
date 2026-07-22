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

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
