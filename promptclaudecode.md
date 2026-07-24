# Prompt para Claude Code

> Pegalo tal cual en la raíz del repo `registro-laboratorio`. Está pensado para trabajarse **por etapas**: pedile que haga la etapa 1, revisás, y seguís.

---

Vamos a sumar dos módulos nuevos a esta app: **Análisis de tanques** y **Muestras a laboratorio**. Reemplazan dos planillas Excel que hoy se llevan a mano.

Antes de escribir código:

1. Leé `AGENTS.md`. Esta versión de Next.js tiene cambios que no están en tu entrenamiento: consultá `node_modules/next/dist/docs/` antes de tocar rutas, layouts o server components.
2. Leé `prisma/schema.prisma`, `src/app/api/ingresos/route.ts`, `src/app/api/ingresos/export/route.ts`, `src/app/ingresos/page.tsx`, `src/components/IngresosList.tsx`, `src/components/ConfiguracionForm.tsx`, `src/components/Sidebar.tsx`, `src/lib/auth.ts` y `src/lib/utils.ts`.
3. **Seguí exactamente esos patrones**: validación con zod en la API, `getRoleFromRequest` en cada handler, `export const dynamic = 'force-dynamic'`, page server component que consulta con prisma y le pasa los datos a un componente cliente, `formatDateOnly` para fechas-calendario, clases de Tailwind con los colores `brand-green` / `brand-dark` / `brand-red` / `brand-mustard` que ya están en `globals.css`. No introduzcas librerías nuevas.
4. Todo el texto de la interfaz en español rioplatense, igual que el resto de la app.

### Glosario del dominio (necesario para modelar bien)

En el muestreo de tanques, la altura siempre se declara contra una referencia:

- **AF — antes del fondo**: se mide desde el fondo hacia arriba. *2 m AF* = dos metros por encima del fondo.
- **DS — desde la superficie**: se mide desde el espejo hacia abajo. *2 m DS* = dos metros por debajo de la superficie.
- **AC — antes del cono**: referencia para tanques de fondo cónico.
- **HA — hacia arriba**: **no es una altura ni una referencia**. Indica que la muestra es un **conjunto** (un brend) tomado desde esa altura hacia arriba. *1 m AF HA* = mezcla de 1 m AF, 2 m AF, 4 m DS, 2 m DS y superficie.

Por eso `referencia` y `conjuntoHaciaArriba` son dos campos separados: una muestra puntual y un compuesto no son lo mismo, y hoy quedan mezclados en la misma celda de texto. Y `alturaM` **nunca se muestra sin su referencia**: 2 m AF y 2 m DS son puntos distintos del tanque.

**Los dos módulos no se relacionan entre sí.** Un análisis de tanque de rutina no lleva número de muestra; si una muestra de tanque se manda a un laboratorio externo, se carga como muestra aparte. No agregues claves foráneas entre `AnalisisTanque` y `Muestra`: lo único que comparten es el catálogo `Parametro`.

En un conjunto (HA) alcanza con guardar el punto de arranque (`alturaM` + `referencia` + `conjuntoHaciaArriba`). No hace falta enumerar los puntos que lo componen.

### Para qué se usa el registro de muestras

No es solo el listado de envíos a laboratorios externos. Es el registro con el que el laboratorio **identifica y sigue cualquier muestra que entra**: la que trae un comercial de un posible cliente, la de rutina de un tanque, la de un reclamo, la que se manda a Intertek. El laboratorio externo es un atributo de la muestra, no su razón de ser. El módulo tiene que funcionar igual de bien para una muestra que nunca sale de la planta.

---

## Etapa 1 — Esquema de datos

Agregá a `prisma/schema.prisma`:

```prisma
model Parametro {          // catálogo único de ensayos, sirve para tanques y muestras
  id          Int     @id @default(autoincrement())
  nombre      String                // "Humedad y volátiles", "Acidez", "Azufre"
  metodo      String?               // "Termobalanza", "Karl Fischer" — parte de la identidad del ensayo
  abreviatura String?               // "Hum. TB", "Hum. KF" — es lo que va en los encabezados de tabla
  unidad      String?               // "%", "ppm", "g/cm³"
  decimales   Int     @default(2)
  orden       Int     @default(0)
  activo      Boolean @default(true)
  @@unique([nombre, metodo])
}

model PerfilProducto {     // qué parámetros se muestran por defecto según el producto
  id          Int    @id @default(autoincrement())
  producto    String
  parametroId Int
  orden       Int    @default(0)
  @@unique([producto, parametroId])
}

model Especificacion {     // rangos para marcar en rojo lo que se va de spec
  id          Int     @id @default(autoincrement())
  producto    String
  parametroId Int
  min         Float?
  max         Float?
  @@unique([producto, parametroId])
}

model AnalisisTanque {
  id                  Int      @id @default(autoincrement())
  fecha               DateTime
  producto            String
  tanques             String              // admite varios: "26 + 27", "114/118/119"
  punto               String?             // Válvula | Conjunto general | Superficie | Fondo | Recirculado | Purga de fondo
  alturaM             Float?
  referencia          String?             // AF | DS | AC | null  → desde dónde se mide la altura
  conjuntoHaciaArriba Boolean  @default(false)   // el "HA": la muestra es un brend desde esa altura para arriba
  analista            String?
  comentario          String?
  createdAt           DateTime @default(now())
  resultados          ResultadoTanque[]
}

model ResultadoTanque {
  id          Int            @id @default(autoincrement())
  analisisId  Int
  analisis    AnalisisTanque @relation(fields: [analisisId], references: [id], onDelete: Cascade)
  parametroId Int
  parametro   Parametro      @relation(fields: [parametroId], references: [id])
  valor       Float?
  valorTexto  String?         // para lo que no es numérico ("18 °C", "7 %")
  @@unique([analisisId, parametroId])
}

model Laboratorio {
  id        Int     @id @default(autoincrement())
  nombre    String  @unique
  esExterno Boolean @default(true)
  delExterior Boolean @default(false)   // habilita el campo AWB
  activo    Boolean @default(true)
}

model LugarMuestreo {
  id     Int     @id @default(autoincrement())
  nombre String  @unique
  activo Boolean @default(true)
}

model Muestra {
  id                  Int      @id @default(autoincrement())
  numero              String   @unique     // "26222", serie por año — es la etiqueta física del envase
  fecha               DateTime
  producto            String
  detalle             String?
  motivo              String?              // ver catálogo Motivo
  tipoOrigen          String?              // Tanque | Camión | Buque | Isotanque | Bidón | N/A
  identificacionOrigen String?
  lugarMuestreo       String?
  contacto            String?              // cliente / proveedor
  solicitadoPor       String?
  remito              String?
  envase              String?              // "bidón 5 L"
  laboratorio         String?
  estado              String   @default("IDENTIFICADA")
  // IDENTIFICADA | EN_ANALISIS | ENVIADA | CON_RESULTADO | ANULADA
  fechaEnvio          DateTime?
  awb                 String?
  protocolo           String?
  fechaResultado      DateTime?
  resultado           String?
  adjuntoUrl          String?
  observacion         String?
  cargadoPor          String?
  createdAt           DateTime @default(now())
  ensayos             MuestraEnsayo[]
}

model Motivo {
  id     Int     @id @default(autoincrement())
  nombre String  @unique
  activo Boolean @default(true)
}

model MuestraEnsayo {
  id          Int       @id @default(autoincrement())
  muestraId   Int
  muestra     Muestra   @relation(fields: [muestraId], references: [id], onDelete: Cascade)
  parametroId Int?
  parametro   Parametro? @relation(fields: [parametroId], references: [id])
  libre       String?    // ensayo que no está en el catálogo
}
```

Agregá las relaciones inversas que falten en `Parametro`. Después: `prisma generate` y `prisma db push`.

**Seed** (`prisma/seed.ts`, sumando a lo que ya hay, siempre con `upsert` para que sea idempotente):

- Parámetros de tanques (nombre · método · abreviatura · unidad):
  - **Humedad y volátiles · Termobalanza · "Hum. TB" · %** — la termobalanza mide pérdida por secado, o sea agua **más** volátiles.
  - **Humedad · Karl Fischer · "Hum. KF" · %** — mide agua sola.
  - Insolubles en hexano · "Ins. HEX." · % · Insolubles en acetona · "Ins. ACET." · % · Acidez (como ác. oleico) · % · Fósforo · ppm · Sedimento por centrífuga · % · Densidad · g/cm³ · Azufre · ppm · Índice de yodo · Insaponificables · % · MIU · % · Índice de peróxido · pH · Temperatura · °C.

**Humedad TB y humedad KF son dos parámetros distintos y no se fusionan nunca.** Miden cosas distintas por métodos distintos: en las 18 filas de 2026 que tienen las dos cargadas, la TB siempre da más alta que la KF (1,61 % contra 0,96 %; 3,10 % contra 1,82 %). No hagas una columna "Humedad" que muestre una u otra según cuál esté cargada, no las promedies y no las compares entre sí en gráficos ni en especificaciones. En la interfaz el método va siempre visible junto al nombre.
- Los 44 ensayos de la hoja "Codificación análisis". **Varios ya están en la lista de arriba: no los dupliques**, reusá el mismo registro. Equivalencias: *Humedad Karl Fischer* → Humedad · Karl Fischer · *Índice de fósforo* → Fósforo · *Insolubles en hexano / acetona* → los mismos de arriba · *Acidez (como ác. oleico)* → Acidez · *Índice de peróxido*, *Insaponificables*, *pH*, *Índice de iodo* → los mismos. Los que sí son nuevos: Acidez (como ác. oleico), Acidez (mineral), Aflatoxinas, Antimonio, Aromáticos, Color Gardner, Componentes nutricionales, DBO, Dioxinas tipificadas, Dioxinas tipo no PCB, Dioxinas totales, DQO, Fisicoquímico, Flúor, HC, Hidrocarburos, Humedad Karl Fischer, Índice de fósforo, Índice de iodo, Índice de peróxido, Insaponificables, Insolubles en acetona, Insolubles en hexano, Materia grasa, Melting point, Metalaxil, Metales pesados, Metanol, Microbiológico, Omega 3 y 6, Otros contaminantes, Oxígeno disuelto, Perfil de ácidos grasos, Pesticidas, pH, Plaguicidas organoclorados, Plaguicidas organofosforados, Plomo, Sólido, SSEE, Viscosidad, Volátiles, Cinc total, Contenido de agua. (Unificá los que se repiten con la lista de arriba, un solo registro por ensayo.)
- Perfiles: **Oleína** → Humedad TB, Humedad KF, Ins. HEX., Ins. ACET., Acidez · **UCO** → Humedad TB, Acidez, Ins. HEX., Azufre · **Aceite** → Humedad TB, Acidez, Fósforo, Ins. HEX. · **Ácido graso** → Acidez, Humedad TB, Insaponificables.
- Laboratorios: SFA (interno), I+D (interno), Intertek, Oleochem, GreenLab, Cotecna, NofaLab, HSE, Protegras, Litoral, Marvesa, Bio Group, JLA. Marcá `delExterior: true` en NofaLab y Marvesa.
- Lugares de muestreo: SFA, SFF, Protegras, ECOSER, DH-SH, Molinos, Ecoparaná, Patagonia, Arenoil, TPR, Tello, ERA, Glardón, Vicentin Ricardone.
- Motivos: Control interno, Posible cliente o proveedor, Posible venta, Monitoreo semestral, Reclamo, Proyecto / I+D, Contramuestra. (Salen de los códigos PV, MOS, CO y MT de la hoja auxiliar, que hoy se cargan en la columna de cliente.)

## Etapa 2 — API

Replicando el patrón de `api/ingresos`:

- `api/parametros`, `api/laboratorios`, `api/lugares-muestreo` → GET / POST / DELETE por id.
- `api/analisis-tanque` → GET (orden `fecha desc, id desc`), POST, y `[id]` con PUT / DELETE. El POST recibe los resultados como `{ parametroId, valor }[]` y los crea anidados.
- `api/muestras` → igual, más:
  - `GET /api/muestras/proximo-numero` que devuelve el siguiente de la serie del año (prefijo = 2 dígitos del año, 3 dígitos de secuencia; si el año no tiene ninguna, arranca en `AA000`).
  - Al crear, si el laboratorio es interno, el protocolo se completa solo con el número de muestra.
  - El `estado` se deriva si no lo mandan: con `fechaResultado`, `resultado` o `protocolo` → `CON_RESULTADO`; con `fechaEnvio` y laboratorio externo → `ENVIADA`; con laboratorio interno y sin resultado → `EN_ANALISIS`; si no → `IDENTIFICADA`.
- `api/analisis-tanque/export` y `api/muestras/export` → CSV con BOM y filtro `desde` / `hasta`, calcado de `api/ingresos/export`. En tanques, una columna por parámetro que aparezca en el rango exportado.

## Etapa 3 — Pantalla de tanques

`src/app/tanques/page.tsx` + `src/components/AnalisisTanqueList.tsx`, copiando la estructura de `IngresosList` (buscador, paginado de 15, modal de alta/edición, duplicar, exportar, `router.refresh()`).

Particularidades del formulario:

- Campos de identificación: fecha, producto (select del catálogo `Producto`), tanques (texto libre, admite `26 + 27`), punto de extracción (select: Válvula, Conjunto general, Superficie, Fondo, Recirculado, Purga de fondo), altura en metros (número), **medida desde** (select AF / DS / AC / No aplica), **casilla "Conjunto hacia arriba (HA)"**, analista (select de `Analista`).
- Debajo de esos campos, una línea de ayuda que arme en vivo cómo va a quedar guardado: `Conjunto general · 2 m AF ↑`. Y un enlace "¿Qué significan AF, DS, AC y HA?" que abra el glosario de arriba en un modal — lo van a usar analistas nuevos.
- En toda la app, la altura se muestra **siempre con su referencia** (`2 m AF`, nunca `2 m`), y el conjunto con la flecha `↑`.
- Al elegir el producto, se renderizan los inputs de los parámetros de su `PerfilProducto`. Un botón "+ Agregar parámetro" permite sumar cualquier otro del catálogo a esa carga puntual.
- Si hay `Especificacion` para ese producto y parámetro, y el valor se va del rango, el input se marca en `brand-red` con el rango como ayuda. Es un aviso, no bloquea el guardado.
- En la tabla, columnas fijas de identificación + los parámetros más usados (Humedad TB, Humedad KF, Ins. HEX., Ins. ACET., Acidez, Fósforo). Los valores fuera de spec en rojo.
- Botón "Guardar y cargar otro" que conserva producto, tanque y fecha (se cargan muchos análisis seguidos del mismo tanque).

## Etapa 4 — Pantalla de muestras

`src/app/muestras/page.tsx` + `src/components/MuestrasList.tsx`.

- El número se muestra ya asignado y de solo lectura al abrir el formulario.
- **Motivo** es campo de primera línea, al lado de producto: es lo que separa la muestra de rutina de la que trajo un comercial.
- Origen: select de tipo + un input cuya etiqueta cambia según el tipo (Tanque → "Identificación del tanque", Camión → "Patente / N° de camión", etc.).
- Rótulo Zebra: **no se imprime solo al guardar**. Un botón "Imprimir rótulo" en cada fila de la tabla, y otro en el formulario una vez guardada la muestra. Reusá `src/lib/zpl.ts` y el modelo `Rotulo` con un `tipo` nuevo `MUESTRAS`; el rótulo lleva número de muestra, producto, fecha y motivo.
- Ensayos: multiselección con chips sobre el catálogo de parámetros, más un campo libre para lo que no está.
- El campo AWB solo se muestra si el laboratorio elegido tiene `delExterior`.
- Estado con badge de color: identificada en gris, en análisis en `brand-mustard`, enviada en `brand-mustard`, con resultado en `brand-green`, anulada en gris claro. Si está `ENVIADA` hace más de 15 días sin protocolo, badge en `brand-red` con los días transcurridos.
- Filtros rápidos: "Sin resultado", filtro por laboratorio y filtro por motivo.
- Arriba, cuatro tarjetas: muestras identificadas en el año, enviadas a laboratorio externo, sin resultado cargado, y demoradas más de 15 días.
- El módulo tiene que servir igual para una muestra que nunca sale de la planta: nada de campos obligatorios que solo apliquen a envíos externos (fecha de envío, AWB y protocolo son todos opcionales).

## Etapa 5 — Integración

- Sumá los dos ítems al `Sidebar`, entre Despachos y Tareas, con íconos SVG inline en la misma línea que los existentes (18×18, `stroke="currentColor"`, `strokeWidth="2"`).
- En `ConfiguracionForm`, agregá secciones para administrar Parámetros (nombre, unidad, decimales), Laboratorios, Lugares de muestreo, Perfiles por producto y Especificaciones — con el mismo patrón que las secciones de Productos y Contactos.
- En el dashboard (`src/app/page.tsx`), sumá dos indicadores: análisis de tanque del mes y muestras pendientes de resultado.
- Subí la versión en `package.json` a 1.3.0.

## Etapa 6 — Importación histórica

Un script `scripts/importar-planillas.ts` que lea los dos Excel y cargue los datos existentes:

- Hoja `Tanques` de la planilla digital → `AnalisisTanque`. Hay que normalizar mientras se importa:
  - **Producto**: `Oleina` / `OLEINA` / `oleina` / `Oliena` → "Oleína"; `UCO` / `Uco` → "UCO"; etc. Dejá el mapa de normalización en una constante visible arriba del archivo.
  - **Altura**: parseá el texto libre a punto + alturaM + referencia + conjuntoHaciaArriba. Casos reales que tienen que salir bien:
    - `Val 2m`, `Val 2 m`, `Val 2 mts`, `val 2AF` → punto Válvula, altura 2, referencia AF cuando esté explícita.
    - `Conj Gral 1m AF - HA`, `Conj Gral 0,5m AF HA`, `Conjunto 0,5m AFHA`, `1m AFHA` → punto Conjunto general, altura, referencia AF, `conjuntoHaciaArriba: true`. Ojo con `AFHA` todo junto y con los separadores ` - ` / ` `.
    - `2m DS`, `Conj Gral 2,9m DS HA`, `4m DS` → referencia DS.
    - `Fondo`, `Purga fondo`, `Recirculado`, `Superficie` → punto sin altura.
    - Coma decimal (`0,5m`) y unidades mezcladas (`m`, `mts`, `mt`).
    - Un texto con HA y sin `Conj` igual es conjunto: HA implica compuesto.
  - Lo que no matchee, guardalo tal cual en `comentario` con el prefijo `[altura sin parsear]` en vez de perderlo, y listalo en el resumen final para revisarlo a mano.
  - Los valores vienen como fracción (0,0157 = 1,57 %). Definí y documentá la convención: guardá el número tal cual está en la planilla y que el formato lo ponga la unidad del parámetro.
- Hojas por año del listado de muestras → `Muestra`. Empezá por 2025 y 2026; las hojas viejas tienen otras columnas, dejalas para después.
- El script tiene que ser idempotente (upsert por `numero` en muestras) y terminar imprimiendo un resumen: importados, salteados y filas con problemas.

---

## Reglas de cierre

- Trabajá una etapa por vez y frená a mostrarme el diff antes de seguir con la siguiente.
- Después de cada etapa: `npm run lint` y `npm run build:local` tienen que pasar limpios.
- No toques `Ingreso`, `Despacho`, `Rotulo` ni `Tarea`.
- Comentarios en el código solo donde haya una decisión no obvia (el parseo de alturas, la derivación del estado, la serie del número de muestra, por qué `referencia` y `conjuntoHaciaArriba` van separados), en el mismo tono que los comentarios que ya existen en `api/ingresos/route.ts` y `lib/utils.ts`.
