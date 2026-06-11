import { prisma } from '@/lib/prisma'
import RotulosList from '@/components/RotulosList'

export const dynamic = 'force-dynamic'

export default async function RotulosPage() {
  const rotulos = await prisma.rotulo.findMany({
    orderBy: { createdAt: 'desc' },
    include: { ingreso: true, despacho: true },
  })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Rótulos</h2>
      <RotulosList rotulos={rotulos} />
    </div>
  )
}
