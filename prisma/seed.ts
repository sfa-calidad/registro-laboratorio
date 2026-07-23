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
  // Razones sociales importadas del listado de clientes/proveedores.
  const razonesSociales = [
    "Aceites Refinados Salto SA",
    "Acrise",
    "Actiagro",
    "Advances Organic Material",
    "AGB",
    "AGD",
    "Agro MYG",
    "Agro Spray",
    "Agroleaginosas",
    "Agropecuaria",
    "Alimentar Trading LP",
    "Alimentos Santa Rosa",
    "Amarus",
    "Ambiental Cord",
    "America Pampa Agroindustrial",
    "Andreu Leonardo",
    "Anjober",
    "Aren Oil",
    "Argen Group",
    "Arrows Argentina",
    "Avangram",
    "Baldobino Jose",
    "Beltramo Andres",
    "Beron Matias",
    "Bio Nogoya",
    "Bravo Energy Argentina",
    "Bunge",
    "Calisa",
    "Cargill",
    "Cil Aceitera",
    "Cofco International",
    "College Biofuels Unlimited Company",
    "Comercial Eusebia",
    "Compañia DAB",
    "Congelados del Sur",
    "Coop. Agricola Gral. Ramirez",
    "Coop. Ganadera Agricola y de Consumo",
    "Coop. Guillermo Lehmann",
    "Cremer",
    "Diaser",
    "Dicoal",
    "Distribuidora DAL SAS",
    "Doble L",
    "Don Mauricio Agroganadera",
    "Dunbeck Trading SpA",
    "Eccofeed",
    "Eco Chabas",
    "Ecoser",
    "Ecosut",
    "El Albardon",
    "El Arrayan",
    "Entranuts",
    "Entre Rios Crushing",
    "ERA",
    "Estruzados La Carreta",
    "Faenar",
    "Ferrero Marcelo",
    "Fidelio",
    "Fondelir",
    "Frigorifico Entrerriano de Prod. Avicolas",
    "Galaxy Lithium / Minera del Altiplano",
    "Gente de la Pampa (GDLP)",
    "Glardon Anibal",
    "Glardon Rodrigo",
    "Glucovil",
    "Grupo Bongiovanni",
    "Grupo Omics",
    "HEGE SRL",
    "IBS",
    "IF Ingenieria en Fertilizantes",
    "Indio Quimica",
    "Industrias Avicolas",
    "IQO",
    "J.M. Falavigna",
    "Juan Prete Conti",
    "La Hermandad",
    "La Morera",
    "La Pacor",
    "La Teresita",
    "Laboratorios Quimicos",
    "Lancopinto",
    "Larusso",
    "Latin Bio",
    "LDC",
    "Lombard",
    "Lombardo Daniel",
    "Luciani Negocios Agropecuarios",
    "Marine Olie",
    "Martin Grande",
    "Mihlager",
    "Molca",
    "Molino Cañuelas",
    "Molinos Rio de la Plata",
    "Moreno Hernan Gustavo",
    "MSO Renewables",
    "Mustafa Group",
    "NAT",
    "Nicolas Dangelo",
    "Nitromax",
    "Nouryon",
    "Omar Etcheverry",
    "Pacini",
    "Pampa del Sur",
    "Patagonia",
    "Plus Quimica",
    "Polydem",
    "Prave",
    "Preisz Marcos",
    "Prodeman",
    "Prodinsa",
    "Proquimed",
    "Prosevic",
    "Protegras",
    "Puente del Sur",
    "Quimica Atlantica",
    "RBE",
    "Refineria Sudamericana",
    "Renova",
    "Ricedal",
    "Rosenbrock",
    "Ruiz Santiago",
    "RV-SC Servicios S.A.S.",
    "Sanchez y Sanchez",
    "Santiago Eichhorn",
    "Seda",
    "Sembrar Agropecuaria",
    "Seti SL",
    "Solamb",
    "Solkem",
    "Solor",
    "Soychu",
    "Starplastic",
    "T6",
    "Taico",
    "Tello",
    "Ticino",
    "Tombesi",
    "Total Quimica",
    "Union Agricola de Avellaneda",
    "Valorasoy",
    "Vicentin",
    "Viterra",
    "Worms",
  ]
  for (const nombre of razonesSociales) {
    const existe = await prisma.contacto.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } },
    })
    if (!existe) await prisma.contacto.create({ data: { nombre } })
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
