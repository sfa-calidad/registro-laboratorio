import { PrismaClient } from '@prisma/client'
import { INSUMOS, SUSTANCIAS, UBICACIONES } from './datos/insumos'

const prisma = new PrismaClient()

async function main() {
  // Renombres a la forma normalizada (la que usan los perfiles de tanques).
  // Idempotente: solo si existe el nombre viejo; si el nuevo ya está, se
  // elimina el duplicado viejo.
  const renombres: [string, string][] = [
    ['Oleina', 'Oleína'],
    ['Ácidos grasos', 'Ácido graso'],
  ]
  for (const [viejo, nuevo] of renombres) {
    const existente = await prisma.producto.findUnique({ where: { nombre: viejo } })
    if (!existente) continue
    const destino = await prisma.producto.findUnique({ where: { nombre: nuevo } })
    if (destino) {
      await prisma.producto.delete({ where: { id: existente.id } })
    } else {
      await prisma.producto.update({ where: { id: existente.id }, data: { nombre: nuevo } })
    }
  }

  const productos = [
    'Borra',
    'Borra Neutra',
    'Aceite',
    'Ácido graso',
    'Residuo Orgánico',
    'UCO',
    'BN GMP+',
    'Oleína',
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

  // --- Análisis de tanques y muestras: catálogos base -----------------------

  // Parámetros de tanques. El método integra la identidad del ensayo:
  // Humedad TB (termobalanza: agua + volátiles) y Humedad KF (Karl Fischer:
  // agua sola) son ensayos distintos y no se fusionan nunca.
  // El unique [nombre, metodo] tiene metodo nullable, así que no sirve el
  // upsert de Prisma: se resuelve con findFirst + create (idempotente igual).
  const parametrosTanque: [string, string | null, string | null, string | null][] = [
    ['Humedad y volátiles', 'Termobalanza', 'Hum. TB', '%'],
    ['Humedad', 'Karl Fischer', 'Hum. KF', '%'],
    ['Insolubles en hexano', null, 'Ins. HEX.', '%'],
    ['Insolubles en acetona', null, 'Ins. ACET.', '%'],
    ['Acidez (como ác. oleico)', null, null, '%'],
    ['Fósforo', null, null, 'ppm'],
    ['Sedimento por centrífuga', null, null, '%'],
    ['Densidad', null, null, 'g/cm³'],
    ['Azufre', null, null, 'ppm'],
    ['Índice de yodo', null, null, null],
    ['Insaponificables', null, null, '%'],
    ['MIU', null, null, '%'],
    ['Índice de peróxido', null, null, null],
    ['pH', null, null, null],
    ['Temperatura', null, null, '°C'],
  ]
  let ordenParametro = 1
  for (const [nombre, metodo, abreviatura, unidad] of parametrosTanque) {
    const existe = await prisma.parametro.findFirst({ where: { nombre, metodo } })
    if (!existe) {
      await prisma.parametro.create({ data: { nombre, metodo, abreviatura, unidad, orden: ordenParametro } })
    }
    ordenParametro++
  }

  // Ensayos de la hoja "Codificación análisis" que no están ya arriba.
  // Equivalencias con los de tanques (un solo registro por ensayo):
  //   Humedad Karl Fischer → Humedad · Karl Fischer
  //   Índice de fósforo → Fósforo · Índice de iodo → Índice de yodo
  //   Insolubles en hexano/acetona, Acidez (como ác. oleico), Índice de
  //   peróxido, Insaponificables y pH → los mismos registros de arriba.
  const ensayosCodificacion = [
    'Acidez (mineral)', 'Aflatoxinas', 'Antimonio', 'Aromáticos', 'Color Gardner',
    'Componentes nutricionales', 'DBO', 'Dioxinas tipificadas', 'Dioxinas tipo no PCB',
    'Dioxinas totales', 'DQO', 'Fisicoquímico', 'Flúor', 'HC', 'Hidrocarburos',
    'Materia grasa', 'Melting point', 'Metalaxil', 'Metales pesados', 'Metanol',
    'Microbiológico', 'Omega 3 y 6', 'Otros contaminantes', 'Oxígeno disuelto',
    'Perfil de ácidos grasos', 'Pesticidas', 'Plaguicidas organoclorados',
    'Plaguicidas organofosforados', 'Plomo', 'Sólido', 'SSEE', 'Viscosidad',
    'Volátiles', 'Cinc total', 'Contenido de agua',
  ]
  for (const nombre of ensayosCodificacion) {
    const existe = await prisma.parametro.findFirst({ where: { nombre, metodo: null } })
    if (!existe) {
      await prisma.parametro.create({ data: { nombre, orden: ordenParametro } })
    }
    ordenParametro++
  }

  // Ensayos que aparecen en el reporte de calidad de materia prima y no están
  // en las listas de arriba.
  const parametrosMateriaPrima: [string, string | null, string | null, string | null][] = [
    ['Jabones', null, null, 'ppm'],
    ['C18:2', null, null, '%'],
  ]
  for (const [nombre, metodo, abreviatura, unidad] of parametrosMateriaPrima) {
    const existe = await prisma.parametro.findFirst({ where: { nombre, metodo } })
    if (!existe) {
      await prisma.parametro.create({ data: { nombre, metodo, abreviatura, unidad, orden: ordenParametro } })
    }
    ordenParametro++
  }

  // La materia grasa entró por la hoja de codificación, sin unidad. En el
  // reporte de materia prima se informa en % y es la que calcula la app.
  await prisma.parametro.updateMany({
    where: { nombre: 'Materia grasa', metodo: null, unidad: null },
    data: { unidad: '%', abreviatura: 'M. grasa' },
  })

  // Perfiles por producto: qué parámetros se muestran por defecto al cargar
  // un análisis de tanque de ese producto.
  const perfiles: Record<string, [string, string | null][]> = {
    'Oleína': [
      ['Humedad y volátiles', 'Termobalanza'],
      ['Humedad', 'Karl Fischer'],
      ['Insolubles en hexano', null],
      ['Insolubles en acetona', null],
      ['Acidez (como ác. oleico)', null],
    ],
    'UCO': [
      ['Humedad y volátiles', 'Termobalanza'],
      ['Acidez (como ác. oleico)', null],
      ['Insolubles en hexano', null],
      ['Azufre', null],
    ],
    'Aceite': [
      ['Humedad y volátiles', 'Termobalanza'],
      ['Acidez (como ác. oleico)', null],
      ['Fósforo', null],
      ['Insolubles en hexano', null],
    ],
    'Ácido graso': [
      ['Acidez (como ác. oleico)', null],
      ['Humedad y volátiles', 'Termobalanza'],
      ['Insaponificables', null],
    ],
  }
  // Perfiles del camión que entra, tomados del "Reporte de calidad": cada
  // familia de producto tiene su juego de ensayos y es más largo que el del
  // control de tanque. La materia grasa va última porque se calcula a partir de
  // la humedad y los insolubles de arriba.
  const aceites: [string, string | null][] = [
    ['Humedad', 'Karl Fischer'],
    ['Insolubles en hexano', null],
    ['Insolubles en acetona', null],
    ['Acidez (como ác. oleico)', null],
    ['Sedimento por centrífuga', null],
    ['Densidad', null],
    ['Jabones', null],
    ['Materia grasa', null],
  ]
  const borras: [string, string | null][] = [
    ['Humedad y volátiles', 'Termobalanza'],
    ['Insolubles en acetona', null],
    ['Jabones', null],
    ['Fósforo', null],
    ['Materia grasa', null],
  ]
  const perfilesMateriaPrima: Record<string, [string, string | null][]> = {
    'Aceite': aceites,
    'Aceite Animal': aceites,
    'Ácido graso': [['Humedad y volátiles', 'Termobalanza'], ...aceites],
    'UCO': [
      ['Humedad y volátiles', 'Termobalanza'],
      ['Insolubles en hexano', null],
      ['Insolubles en acetona', null],
      ['Acidez (como ác. oleico)', null],
      ['Sedimento por centrífuga', null],
      ['Materia grasa', null],
    ],
    'Oleína': [
      ['Humedad', 'Karl Fischer'],
      ['Insolubles en hexano', null],
      ['Insolubles en acetona', null],
      ['Acidez (como ác. oleico)', null],
      ['Sedimento por centrífuga', null],
      ['Insaponificables', null],
      ['Índice de yodo', null],
      ['Fósforo', null],
      ['C18:2', null],
      ['pH', null],
      ['Materia grasa', null],
    ],
    'Borra': borras,
    'Borra Neutra': borras,
    'BN GMP+': borras,
  }

  const perfilesPorContexto: [string, Record<string, [string, string | null][]>][] = [
    ['TANQUE', perfiles],
    ['MATERIA_PRIMA', perfilesMateriaPrima],
  ]
  for (const [contexto, mapa] of perfilesPorContexto) {
    for (const [producto, params] of Object.entries(mapa)) {
      for (let i = 0; i < params.length; i++) {
        const [nombre, metodo] = params[i]
        const parametro = await prisma.parametro.findFirst({ where: { nombre, metodo } })
        if (!parametro) continue
        await prisma.perfilProducto.upsert({
          where: { producto_parametroId_contexto: { producto, parametroId: parametro.id, contexto } },
          update: { orden: i + 1 },
          create: { producto, parametroId: parametro.id, contexto, orden: i + 1 },
        })
      }
    }
  }

  // Laboratorios (SFA e I+D son internos; NofaLab y Marvesa, del exterior).
  const laboratorios: [string, boolean, boolean][] = [
    ['SFA', false, false],
    ['I+D', false, false],
    ['Intertek', true, false],
    ['Oleochem', true, false],
    ['GreenLab', true, false],
    ['Cotecna', true, false],
    ['NofaLab', true, true],
    ['HSE', true, false],
    ['Protegras', true, false],
    ['Litoral', true, false],
    ['Marvesa', true, true],
    ['Bio Group', true, false],
    ['JLA', true, false],
  ]
  for (const [nombre, esExterno, delExterior] of laboratorios) {
    await prisma.laboratorio.upsert({
      where: { nombre },
      update: { esExterno, delExterior },
      create: { nombre, esExterno, delExterior },
    })
  }

  const lugaresMuestreo = [
    'SFA', 'SFF', 'Protegras', 'ECOSER', 'DH-SH', 'Molinos', 'Ecoparaná',
    'Patagonia', 'Arenoil', 'TPR', 'Tello', 'ERA', 'Glardón', 'Vicentin Ricardone',
  ]
  for (const nombre of lugaresMuestreo) {
    await prisma.lugarMuestreo.upsert({ where: { nombre }, update: {}, create: { nombre } })
  }

  // --- Inventario de insumos -------------------------------------------------
  // Ubicaciones y sustancias son datos base: se reponen en cada deploy, como los
  // productos o los laboratorios.
  for (let i = 0; i < UBICACIONES.length; i++) {
    await prisma.ubicacionInsumo.upsert({
      where: { nombre: UBICACIONES[i] },
      update: { orden: i },
      create: { nombre: UBICACIONES[i], orden: i },
    })
  }
  for (const s of SUSTANCIAS) {
    // Por GTIN y no por nombre: el GTIN es el código con el que la sustancia se
    // declara, y dos filas de la planilla se llaman igual siendo distintas.
    // El nombre y la unidad no se pisan: si el supervisor los corrigió en
    // Configuración, la corrección vale más que lo que decía la planilla.
    await prisma.sustanciaControlada.upsert({
      where: { gtin: s.gtin },
      update: {},
      create: { nombre: s.nombre, gtin: s.gtin, unidad: s.unidad },
    })
  }

  // Los insumos son la foto inicial, no datos base: entran una sola vez. De ahí
  // en adelante el stock lo mueven los movimientos, y volver a cargarlos en cada
  // deploy pisaría lo que el laboratorio contó.
  const insumosCargados = await prisma.insumo.count()
  if (insumosCargados === 0) {
    // En lotes y no de a uno: son 187 insumos más un asiento por cada uno con
    // stock, y el seed corre en cada deploy contra Neon. De a uno serían más de
    // trescientas idas y vueltas por red dentro del build.
    await prisma.insumo.createMany({ data: INSUMOS })

    const creados = await prisma.insumo.findMany({ select: { id: true, stock: true } })
    // El stock inicial también deja su asiento: si no, el primer número del
    // inventario sería el único que nadie podría explicar.
    const fecha = new Date()
    await prisma.movimientoInsumo.createMany({
      data: creados
        .filter((i) => i.stock !== 0)
        .map((i) => ({
          insumoId: i.id,
          tipo: 'ENTRADA',
          cantidad: i.stock,
          stockPrevio: 0,
          stockNuevo: i.stock,
          motivo: 'Carga inicial desde la planilla de Excel',
          fecha,
        })),
    })
    console.log(`Inventario: ${INSUMOS.length} insumos cargados`)
  }

  console.log('Seed completado')
}

main().catch(console.error).finally(() => prisma.$disconnect())
