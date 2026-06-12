import ConfiguracionForm from '@/components/ConfiguracionForm'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  empresa: 'Laboratorio SFA',
  etiquetaAncho: '100',
  etiquetaAlto: '45',
  operadorPredeterminado: '',
}

export default async function ConfiguracionPage() {
  const configs = await prisma.configuracion.findMany()
  const values: Record<string, string> = { ...DEFAULTS }
  for (const c of configs) {
    values[c.clave] = c.valor
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración</h2>
      <ConfiguracionForm values={values} />
    </div>
  )
}
