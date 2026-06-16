import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const productos = [
    'Borra',
    'Borra Neutra',
    'Aceite',
    'Ácidos grasos',
    'Residuo Orgánico',
    'UCO',
    'BN GMP+',
    'Oleina',
    'RO',
    'Aceite Animal',
  ]
  for (const nombre of productos) {
    await prisma.producto.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    })
  }
  const columnas = ['Pendiente', 'En Progreso', 'Completado']
  for (let i = 0; i < columnas.length; i++) {
    await prisma.columnaKanban.upsert({
      where: { nombre: columnas[i] },
      update: {},
      create: { nombre: columnas[i], orden: i + 1 },
    })
  }
  const contactos = await prisma.contacto.findMany({ orderBy: { id: 'asc' } })
  const vistos = new Map<string, number>()
  for (const c of contactos) {
    const key = c.nombre.trim().toLowerCase()
    if (vistos.has(key)) {
      await prisma.contacto.delete({ where: { id: c.id } })
    } else {
      vistos.set(key, c.id)
    }
  }

  console.log('Seed completado')
}

main().catch(console.error).finally(() => prisma.$disconnect())
