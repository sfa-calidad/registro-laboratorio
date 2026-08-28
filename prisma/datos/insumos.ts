// Foto inicial del inventario. Extraída una sola vez de las dos planillas de
// Excel que este módulo reemplaza ("Stock Reactivos Actual 30-07-2025.xlsx" y
// "Stock Material de vidrio 21-08-2024.xlsx"), ya normalizada: el tamaño del
// envase y el vencimiento venían escritos dentro del nombre, y la cantidad
// mezclaba números con "-" (se pide a pañol) y celdas vacías (nunca se contó).
//
// De acá en adelante el stock lo mueven los movimientos, no este archivo:
// prisma/seed.ts solo lo carga si la tabla está vacía. Editarlo a mano no
// cambia nada en una base que ya tiene datos.

export type InsumoSeed = {
  nombre: string
  categoria: string
  presentacion: string
  ubicacion: string | null
  stock: number
  seControla: boolean
  contenidoPorEnvase: number | null
  unidadContenido: string | null
  observacion: string | null
}

export const UBICACIONES: string[] = [
  "Laboratorio",
  "Laboratorio - Armario",
  "Laboratorio - Croma",
  "Laboratorio - Heladera",
  "Laboratorio - Puerta",
  "Laboratorio - Puerta 1",
  "Laboratorio - Puerta 2",
  "Laboratorio - Puerta 3",
  "Laboratorio - Puerta 4",
  "Laboratorio - Puerta 22",
  "Laboratorio - Puerta 23",
  "Laboratorio - Puerta 24",
  "Laboratorio - Puerta 25",
  "Laboratorio - Puerta 26",
  "Laboratorio - Sala de Muestras",
  "Pañol/Laboratorio",
  "Pañol/Laboratorio - Armario"
]

// Sustancias controladas por RENPRE/SEDRONAR, de la hoja "Sedronar". El enlace
// con cada insumo NO se genera acá: se elige desde el formulario del insumo.
export const SUSTANCIAS: { nombre: string; gtin: string; unidad: string }[] = [
  {
    "nombre": "Acetico",
    "gtin": "88800000000356",
    "unidad": "L"
  },
  {
    "nombre": "HCl 35-37",
    "gtin": "88800000000028",
    "unidad": "L"
  },
  {
    "nombre": "HCl 37",
    "gtin": "88954128283747",
    "unidad": "L"
  },
  {
    "nombre": "Eter",
    "gtin": "88800000000059",
    "unidad": "L"
  },
  {
    "nombre": "Hexano",
    "gtin": "88800000000295",
    "unidad": "L"
  },
  {
    "nombre": "KOH 85%",
    "gtin": "88968578156438",
    "unidad": "kg"
  },
  {
    "nombre": "NaOH",
    "gtin": "88800000000233",
    "unidad": "kg"
  },
  {
    "nombre": "Metanol",
    "gtin": "88800000000509",
    "unidad": "L"
  },
  {
    "nombre": "NaOH 50% (kg)",
    "gtin": "88904789971217",
    "unidad": "kg"
  },
  {
    "nombre": "Acetona",
    "gtin": "88800000000066",
    "unidad": "L"
  },
  {
    "nombre": "Cloroformo",
    "gtin": "88800000001247",
    "unidad": "L"
  },
  {
    "nombre": "Sulfurico",
    "gtin": "88800000000035",
    "unidad": "L"
  },
  {
    "nombre": "NaOH 50% (L)",
    "gtin": "88800000001445",
    "unidad": "L"
  },
  {
    "nombre": "NaOH 32%",
    "gtin": "88941599171697",
    "unidad": "kg"
  }
]

export const INSUMOS: InsumoSeed[] = [
  {
    "nombre": "Acido Clorhidrico 37%",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Acido Clorhidrico 36,5-38%",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Acido Acetico",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Solución ácido sulfúrico 0,1N",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Acido Sulfurico 95-98% P.A",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Acido Fosforico 85%",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Acido Nitrico 65%",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Acido Perclorico 70%",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Ciclohexano (Cromatografico)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Acido Clorhídrico 0,1N",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Alcohol Etilico 99,5%",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Pañol/Laboratorio - Armario",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Se pide a pañol; no se cuenta en el laboratorio"
  },
  {
    "nombre": "Reactivo de Wijs 0,1M",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Trimetilpentano",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 6,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Tiosulfato 0,1N",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Ciclohexano",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 12,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Hidroxido de Sodio 0,01N",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Pañol/Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Se pide a pañol; no se cuenta en el laboratorio"
  },
  {
    "nombre": "Hidroxido de Sodio 0,1N",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Pañol/Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Se pide a pañol; no se cuenta en el laboratorio"
  },
  {
    "nombre": "Fenolftaleina 1%",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Puerta 23",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Metanol Pro Análisis",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Marcado como vencido en la planilla original"
  },
  {
    "nombre": "Buffer 4 (Cicarelli)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Heladera",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Buffer 7 (Cicarelli)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Heladera",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Cloroformo",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 11,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Etilo Acetato",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Eter Sulfurico",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "HYDRANAL (Karl Fischer) Catolito",
    "categoria": "REACTIVO",
    "presentacion": "0,05 L",
    "ubicacion": "Laboratorio - Croma",
    "stock": 12,
    "seControla": true,
    "contenidoPorEnvase": 0.05,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "HYDRANAL COULOMAT OIL - FLUKA",
    "categoria": "REACTIVO",
    "presentacion": "500 ml",
    "ubicacion": "Laboratorio - Croma",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": 0.5,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Dichiloromethane (ampolla)",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Croma",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Combicoulomat fritless (K.F) Aquastar",
    "categoria": "REACTIVO",
    "presentacion": "500 ml",
    "ubicacion": "Laboratorio - Croma",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.5,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Acetona",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Pañol/Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Se pide a pañol; no se cuenta en el laboratorio"
  },
  {
    "nombre": "Hexano",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Pañol/Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Se pide a pañol; no se cuenta en el laboratorio"
  },
  {
    "nombre": "Tolueno",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Heladera",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Piridinina 0,1% H2O",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Agua Bidestilada",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Pañol/Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Se pide a pañol; no se cuenta en el laboratorio"
  },
  {
    "nombre": "Alcohol Iso-Propilico (Pro.Analisis)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 8,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Buffer 4 (Certipur)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Heladera",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Buffer 7 (Certipur)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Heladera",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Acido Propionico (P.A)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Alcohol Absoluto",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Fosfato monobasico de potasio",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Metanol grado HPLC",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Water standard 0,01% (Cajax10ampollas0,1mg)",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Heladera",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Cloruro de Pootasio 3M",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Heptano (Cromatografico)",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Armario",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Almidon Soluble Pro Analisis",
    "categoria": "REACTIVO",
    "presentacion": "100 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": 0.1,
    "unidadContenido": "kg",
    "observacion": "Marcado como vencido en la planilla original"
  },
  {
    "nombre": "Solución hidróxido de sodio 30-32%",
    "categoria": "REACTIVO",
    "presentacion": "5 L",
    "ubicacion": "Laboratorio - Puerta",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 5,
    "unidadContenido": "L",
    "observacion": "Abierto según la planilla. Ubicación incompleta en la planilla: la puerta no tenía número"
  },
  {
    "nombre": "Hidroxido de Sodio (Pro Analisis)",
    "categoria": "REACTIVO",
    "presentacion": "5 kg",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 5,
    "unidadContenido": "kg",
    "observacion": "Abierto según la planilla"
  },
  {
    "nombre": "Hidroxido de Sodio (Pro Analisis)",
    "categoria": "REACTIVO",
    "presentacion": "1 kg",
    "ubicacion": "Laboratorio - Puerta 25",
    "stock": 30,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Azul de Bromofenol (Pro Analisis)",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Oxido de Cinc (Pro Analisis)",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Anaranjado de Metilo",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Bicarbonato de Sodio",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Acido Citrico (Anhidrido)",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 23",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Ioduro de Potasio",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Ioduro de Potasio",
    "categoria": "REACTIVO",
    "presentacion": "1 kg",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Potasio Fosfato",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Molibdato de Sodio",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Sulfato de Hidracina",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Tamis molecular 0,3mm (K.F)(Frasco)",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Carbonato de sodio",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Sulfato Heptahidrato Hierro (II)",
    "categoria": "REACTIVO",
    "presentacion": "1 kg",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Rojo de metilo",
    "categoria": "REACTIVO",
    "presentacion": "1 kg",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Negro eriocromo T",
    "categoria": "REACTIVO",
    "presentacion": "10 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.01,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Biftalato de potasio",
    "categoria": "REACTIVO",
    "presentacion": "80 g",
    "ubicacion": "Laboratorio - Heladera",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.08,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Hidróxido de potasio",
    "categoria": "REACTIVO",
    "presentacion": "1 kg",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Carbonato de calcio",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "EDTA disodica",
    "categoria": "REACTIVO",
    "presentacion": "100 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.1,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Vaselina solida",
    "categoria": "REACTIVO",
    "presentacion": "1 kg",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Vaselina liquida",
    "categoria": "REACTIVO",
    "presentacion": "1 L",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 1,
    "unidadContenido": "L",
    "observacion": null
  },
  {
    "nombre": "Amonio meta vanadato",
    "categoria": "REACTIVO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Molibdato de Amonio",
    "categoria": "REACTIVO",
    "presentacion": "250 g",
    "ubicacion": "Laboratorio - Puerta 24",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": 0.25,
    "unidadContenido": "kg",
    "observacion": null
  },
  {
    "nombre": "Ampolla de Decantacion 250 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 11,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Ampolla Periforme 100ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 14,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Ampolla de Decantacion 500 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 9,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Ampollas de decantacion 25 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Ampollas de decantacion 100 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Ampollas de decantacion 2000 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Balon de destilacion",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 9,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Bureta Sem. Auto caramelos de 50 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 22",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Bureta Sem. Auto caramelo de 25 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 22",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Buretas 50 ml Transparente",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 22",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Crisol de porcelana 100ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 35,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Copa para filtracion al vacio 300ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Caja de Petri 100 mm",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 7,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 0,700-0,800",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 6,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 0,800-0,900",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 0,900-1,00",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,000-1,100",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 30,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,100-1,200",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 22,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,200 -1,300",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 33,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,500 -1,600",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 12,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,400 -1,500",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 21,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,600 -1700",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,400 -1620",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 15,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,760 -2,000",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,100 -2,000",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,300 -1,400",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 29,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,850 -1,950",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 6,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,750 -1,850",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 6,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 0 -20",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 0 -50",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,000 -1,180",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,800 -1,900",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,500-2,000",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Densimetro 1,800-2,000",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 4",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Embudo 100 mm",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 16,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Embudo 90 mm",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Embudo de 40 mm",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Embudo de plastico chico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Embudo de plastico mediano",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 12,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Erlenmeyer cuello comun 500ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 8,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Erlenmeyer cuello comun 250ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 6,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Erlenmeyer cuello comun 100ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 18,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Erlenmeyer extraccion twisselman",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 26,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Erlenmeyer cuello fino. Esmerilado",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 26",
    "stock": 17,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Extractor twisselman",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 22",
    "stock": 11,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 100 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 63,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 200 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 20,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 200 ml (Caramelo)",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 250 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 28,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 50 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 22,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 25 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 36,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 10 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz de 1000 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 29,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz de 2000 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz de 500 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 40,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Navesillas metalicas. Para Humedad por estufa",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 17,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Navesillas metalicas Hum. P/ T.Balanza",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 89,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta 1 ml - 1/10",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 12,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "pipeta 2 ml - 1/10",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 1 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 2 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 3 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 4 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 5 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 14,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 10 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 20 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 9,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 25 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 50 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "bolbpipeta 100 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta 5 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 17,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta 5 ml doble aforo",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta de 10 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 10,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta de 25 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta doble Aforo 2 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta doble Aforo 1 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 4,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipeta doble Aforo 10 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 11,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipetas doble aforo 20 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Pipetas doble aforo 25 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 100 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 50 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 1000 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 500 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 23,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 250 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 15,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 250 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 8,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 100 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 10,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 500 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 50 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta 1000 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Probeta de 25 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Refrigerante para destilar",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 22",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Sistema Filtrantes al Vacio",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 1",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Termometro alcohol -10°/150 °C Alc.",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Termometro alcohol -10°/110 °C Alc.",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 0,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "termometro Hg -10°/150 °C",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Termometro -10°C/360°C Hg",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Termometro 0°C a 50°C Hg",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Termometro -10°C/60°C Alcohol",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Tubos de ensayos 10 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Sin cantidad en la planilla original"
  },
  {
    "nombre": "Tubos de ensayos 5 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Sin cantidad en la planilla original"
  },
  {
    "nombre": "Varilla de vidrio",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Sin cantidad en la planilla original"
  },
  {
    "nombre": "Vaso ppdo 1000 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso ppdo 100ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 17,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso precipitado 50ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 12,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso ppdo 200ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 10,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "vaso ppdo 2000 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 2,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso ppdo 250 ml LARGO",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 12,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso ppdo 250 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 96,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso ppdo 400 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 28,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso ppdo 500 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 3,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vaso ppdo 600 ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 3",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Vidrio reloj 100 mm",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Sin cantidad en la planilla original"
  },
  {
    "nombre": "Vidrio reloj 50 mm",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Puerta 2",
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Sin cantidad en la planilla original"
  },
  {
    "nombre": "Intermedirarios P/ Matraz Extrc Mat. G. 250ml",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": null,
    "stock": 0,
    "seControla": false,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": "Sin cantidad en la planilla original"
  },
  {
    "nombre": "Matraz de 1000 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Sala de Muestras",
    "stock": 15,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz de 500 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Sala de Muestras",
    "stock": 7,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 100 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Sala de Muestras",
    "stock": 5,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  },
  {
    "nombre": "Matraz 50 ml plastico",
    "categoria": "VIDRIO",
    "presentacion": "",
    "ubicacion": "Laboratorio - Sala de Muestras",
    "stock": 1,
    "seControla": true,
    "contenidoPorEnvase": null,
    "unidadContenido": null,
    "observacion": null
  }
]
