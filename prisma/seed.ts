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
  console.log('Seed completado')
}

main().catch(console.error).finally(() => prisma.$disconnect())
