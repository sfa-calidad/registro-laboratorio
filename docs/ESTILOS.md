# Guía de estilos

Cómo se ve y cómo se arma la interfaz de la app. Todo lo de acá está tomado del
código en producción: los colores de `src/app/globals.css`, los componentes de
`src/components/*.tsx` y los informes de `src/lib/informe.ts`.

Para hacer algo nuevo, copiar de acá antes que inventar una variante.

---

## 1. Paleta

Los tokens viven en el bloque `@theme` de `src/app/globals.css`, así que en
Tailwind se usan por nombre: `bg-brand-green`, `text-brand-dark`. Fuera de esta
lista solo se usan los grises de Tailwind, para bordes y texto secundario.

| Token | Hex | Para qué |
| --- | --- | --- |
| `brand-green` | `#8bc53f` | Acción principal, elemento activo del menú, "con resultado" |
| `brand-green-dark` | `#6fa32e` | Hover del botón principal, texto verde sobre fondo claro |
| `brand-green-light` | `#eaf5da` | Fondo de pastillas, fichas de ensayo, avisos positivos |
| `brand-dark` | `#2b332a` | Menú lateral, avisos flotantes, texto de los informes |
| `brand-dark-hover` | `#3a4538` | Hover y separadores dentro del menú |
| `brand-mustard` | `#e0a32a` | Atención sin gravedad: enviada, pendiente, versión vieja |
| `brand-mustard-dark` | `#c08a1f` | Texto sobre el fondo mostaza al 10% |
| `brand-red` | `#b6394a` | Error, demora, valor fuera de especificación |
| `brand-red-dark` | `#973040` | Hover de lo anterior |
| `brand-bg` | `#eaeae6` | Fondo de las pantallas, detrás de las tarjetas blancas |

**El verde y el mostaza no son intercambiables.** El verde dice "listo", el
mostaza dice "falta algo pero no está mal", el rojo dice "revisar ahora". Si un
estado nuevo no entra claramente en una de las tres, probablemente no necesite
color.

También hay una animación registrada como token: `animate-fade-in`, que usan los
avisos flotantes.

---

## 2. Tipografía

`Arial, Helvetica, sans-serif` en todo, definido en `body`. **No hay fuentes
cargadas de internet, a propósito**: la app de escritorio y las impresiones
tienen que verse igual sin conexión.

| Rol | Clase | Tamaño |
| --- | --- | --- |
| Título de página | `text-2xl font-bold` | 24 px |
| Título de modal | `text-lg font-bold` | 18 px |
| Cuerpo y tablas | `text-base` | 16 px |
| Botones y etiquetas | `text-sm font-medium` | 14 px |
| Pastillas y ayudas | `text-xs` | 12 px |
| Números de serie | `font-mono font-semibold` | — |

Dos detalles que no son casualidad:

- Los inputs van en `text-base` y no en `text-sm`: con 16 px el navegador del
  celular no hace zoom al tocarlos.
- Los números de muestra, remito y contrato siempre en `font-mono`, porque se
  comparan de un vistazo.

---

## 3. Botones

Verde lleno para la acción que la persona vino a hacer; **uno solo por
pantalla**. Todo lo demás es contorno, texto o enlace. Radio `rounded-lg` en
todos.

```tsx
// principal
className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark"

// secundario
className="px-4 py-2 text-sm border border-brand-green text-brand-green-dark rounded-lg hover:bg-brand-green-light"

// fantasma (cancelar, cerrar)
className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"

// deshabilitado: se agrega al principal
disabled={!listo}
className="... disabled:opacity-40 disabled:cursor-not-allowed"
```

### Acciones dentro de una fila

En las tablas los botones son texto, no cajas: una fila con cuatro botones
llenos es ilegible. El borrado es el único rojo y va último.

```tsx
// acción neutra
className="text-gray-500 hover:text-gray-700 text-sm font-medium mr-2"

// acción principal de la fila
className="text-brand-green-dark hover:text-brand-green text-sm font-medium"

// destructiva, siempre al final
className="text-red-500 hover:text-red-700 text-sm font-medium ml-2"
```

---

## 4. Superficies y tablas

El contenido va en tarjetas blancas con `rounded-xl shadow` sobre el fondo
`brand-bg`. La separación la hace la sombra, no una línea.

```tsx
<div className="bg-white rounded-xl shadow p-5 space-y-4">
  <h3 className="font-semibold text-gray-700 border-b pb-2">Resultados</h3>
  …
</div>
```

```tsx
<div className="bg-white rounded-xl shadow overflow-x-auto">
  <table className="w-full text-base">
    <thead className="bg-gray-50 border-b">
      <tr>
        <th className="text-left px-3 py-2 font-medium text-gray-600">N° muestra</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b last:border-0 hover:bg-gray-50">
        <td className="px-3 py-2 font-mono font-semibold">26301</td>
      </tr>
    </tbody>
  </table>
</div>
```

Celdas de uso frecuente: `px-3 py-2 text-gray-400` para el `#id`,
`px-3 py-2 max-w-xs truncate text-gray-600` para observaciones largas.

### Paginación

Quince por página, resuelta en el cliente. El rango a la izquierda, los
controles a la derecha, fuera de la tarjeta.

```tsx
const PAGE_SIZE = 15
const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
const currentPage = Math.min(page, totalPages)   // nunca queda una página vacía
const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
```

```tsx
className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50
           disabled:opacity-40 disabled:cursor-not-allowed"
```

El buscador filtra sobre el conjunto completo y resetea a la página 1.

---

## 5. Formularios

Etiqueta arriba, campo debajo. Siempre en ese orden, nunca al costado. El
asterisco marca lo obligatorio y va en la etiqueta.

```tsx
<div>
  <label className="text-sm font-medium text-gray-700">Tanque *</label>
  <input
    value={form.tanque}
    onChange={(e) => setForm({ ...form, tanque: e.target.value })}
    className="mt-1 w-full border rounded-lg px-3 py-2 text-base" />
</div>
```

La grilla del formulario dentro del modal: `grid grid-cols-1 md:grid-cols-2 gap-3`.

---

## 6. Estados y avisos

### Pastillas

Redondas, 12 px, texto blanco sobre color. Las de estado se calculan en una sola
función (`badgeEstado` en `MuestrasList.tsx`) para que ninguna pantalla invente
una variante.

```tsx
className="text-xs px-2 py-0.5 rounded-full bg-brand-green text-white"      // con resultado
className="text-xs px-2 py-0.5 rounded-full bg-brand-mustard text-white"    // enviada
className="text-xs px-2 py-0.5 rounded-full bg-brand-mustard/80 text-white" // en análisis
className="text-xs px-2 py-0.5 rounded-full bg-brand-red text-white"        // demorada
className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"      // identificada
className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-400 line-through" // anulada
```

Etiqueta de categoría y ficha removible:

```tsx
// categoría (tipo de rótulo)
className="bg-brand-green-light text-brand-green-dark text-xs px-2 py-1 rounded-full"

// ficha con borde, se puede quitar (ensayo elegido)
className="text-xs px-2 py-1 rounded-full bg-brand-green-light text-brand-green-dark
           border border-brand-green flex items-center gap-1"
```

### Avisos

**Nada de `alert()` ni `confirm()` en flujos con foco**: en la app de escritorio
rompen la ventana de Electron y el modal siguiente queda inutilizable. Todo
aviso es in-app.

```tsx
// flotante: 4 a 5 segundos y desaparece
className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm
            text-white animate-fade-in ${error ? 'bg-brand-red' : 'bg-brand-dark'}`}

// en bloque, advertencia
className="rounded-lg bg-brand-mustard/10 border border-brand-mustard/40
           px-3 py-2 text-sm text-brand-mustard-dark"

// en bloque, confirmación
className="rounded-xl border p-4 bg-brand-green-light border-brand-green text-brand-green-dark"
```

---

## 7. Gráficos

Recharts, sin dependencias nuevas. Los gráficos son SVG puro, así que no rompen
la regla de no cargar nada de internet.

**La paleta no alcanza para series categóricas.** Hay tres colores semánticos
(verde = listo, mostaza = atención, rojo = actuar) y ninguna escala de
categorías. Para una serie más se usa `#d1d5db` (`gray-300`), que es el neutro
que ya venía usándose. Si un gráfico necesita seis colores distintos, casi
siempre el problema es el gráfico y no la paleta.

```tsx
const VERDE = '#8bc53f'; const VERDE_OSCURO = '#6fa32e'
const MOSTAZA = '#e0a32a'; const ROJO = '#b6394a'; const GRIS = '#d1d5db'

<ResponsiveContainer width="100%" height={280}>
  <ComposedChart data={datos} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
    <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#6b7280' }}
           tickLine={false} axisLine={{ stroke: GRIS }} />
    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }}
           tickLine={false} axisLine={false} />
    <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRIS}`, fontSize: 13 }} />
    <Legend wrapperStyle={{ fontSize: 13 }} />
    <Bar dataKey="identificadas" fill={VERDE} radius={[4, 4, 0, 0]} />
  </ComposedChart>
</ResponsiveContainer>
```

Reglas de la casa:

- **Grilla tenue y ejes sin línea.** `stroke="#f3f4f6"`, `axisLine={false}`,
  `tickLine={false}`. El dato manda, no el marco.
- **`allowDecimals={false}`** en cualquier eje que cuente cosas: no existen 2,5
  muestras.
- Cada gráfico va en su tarjeta (`bg-white rounded-xl shadow p-5`) con título y
  **una línea que explica cómo leerlo**. Un gráfico que necesita que alguien lo
  interprete al lado no está terminado.
- **Barras horizontales cuando la categoría es un nombre** (analistas, tramos):
  los nombres no entran rotados en el eje de abajo.
- Números en columnas con `tabular-nums`, para que se puedan comparar de un
  vistazo.

### Cómo se presentan los números

Las decisiones de análisis están en `src/lib/metricas.ts`, que son funciones
puras y tienen tests. Las que conviene respetar en cualquier métrica nueva:

- **Mediana y percentil 90, nunca promedio.** En los datos de prueba el
  laboratorio externo da mediana 12 días y promedio 27,3 por una sola muestra
  olvidada de 60 días. El promedio describe un laboratorio que no existe.
- **Junto a cada número agregado, sobre cuántos casos se calculó.** Una muestra
  puede quedar cerrada sin fecha de resultado, así que no todas las cerradas se
  pueden medir: se muestra "medido sobre 3 de 4".
- **Lo que no tiene analista cargado va en una fila "Sin asignar", no se
  descarta.** Cuatro de las formas de atribuir trabajo son texto y admiten
  vacío; esconder ese resto haría que los totales no cierren.
- **Mostrar la cobertura de atribución.** Si menos del 70% de los registros
  tiene analista, comparar personas es comparar ruido, y el panel lo advierte.

## 8. Modales

Fondo negro al 40%, tarjeta centrada. Cabeza, cuerpo y pie separados por bordes.
El clic en el fondo cierra; el clic dentro no (`stopPropagation`). El ancho lo
define el contenido: `max-w-xs` para confirmar, `max-w-4xl` para un formulario
con vista previa al lado.

```tsx
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
     onClick={() => setAbierto(false)}>
  <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
       onClick={(e) => e.stopPropagation()}>
    <div className="p-5 border-b">…</div>
    <div className="p-5">…</div>
    <div className="p-5 border-t flex justify-end gap-2">…</div>
  </div>
</div>
```

**Capas.** Los modales van en `z-50`. Un modal que se abre *encima* de otro (el
glosario sobre el formulario) va en `z-[60]`, y el aviso flotante que tiene que
verse sobre todo, en `z-[70]`. Dos elementos con el mismo z-index ya causaron un
bug de un modal escondido detrás del formulario.

---

## 9. Navegación

Es la única superficie oscura de la app. Se puede colapsar a solo iconos y en
pantalla chica pasa a ser una barra superior.

```tsx
className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
  activo ? 'bg-brand-green text-white' : 'text-slate-300 hover:bg-brand-dark-hover'
}`}
```

---

## 10. Los informes

Esta es la parte que más conviene entender antes de armar un informe nuevo.

### Un contenido, tres salidas

El contenido se arma **una sola vez** en un objeto `InformeTanque`, y de ahí
salen las tres vistas. Si mañana se agrega una fila, aparece en las tres sin
tocar nada más.

| Salida | Qué es | Dónde |
| --- | --- | --- |
| Pantalla | JSX dentro del modal, lo que se ve antes de mandarlo | `AnalisisTanqueList.tsx` |
| HTML para imprimir | Ventana + `window.print()`, con `@page A4`; sirve para guardar como PDF | `buildInformeHTML()` |
| SVG → PNG | Se dibuja en un canvas y se exporta como imagen: es lo que se copia o comparte | `buildInformeSVG()` |

### El contenido

```ts
export type FilaResultado = {
  etiqueta: string      // "Humedad · Karl Fischer"
  valor: string         // "0,12"
  unidad: string        // "%"
  spec: string          // "máx. 0,20"
  fueraDeSpec: boolean  // pinta la fila de rojo y le agrega ⚠
}

export type InformeTanque = {
  empresa: string
  logo: string                       // data:image/... o vacío
  titulo: string
  identificacion: [string, string][] // pares etiqueta/valor, en dos columnas
  resultados: FilaResultado[]
  comentario: string
  pie: string                        // "Generado el 30/07/2026 a las 10:56"
}
```

### Los cinco colores

El informe no usa Tailwind: se imprime y se convierte a imagen, así que los
colores van literales en constantes al principio del archivo.

```ts
const COLOR_TEXTO = '#2b332a'   // brand-dark
const COLOR_SUAVE = '#4b5563'   // etiquetas, unidades, pie (7,5:1 sobre blanco)
const COLOR_LINEA = '#d1d5db'   // separadores
const COLOR_VERDE = '#8bc53f'   // la regla de 3px bajo el encabezado
const COLOR_ROJO  = '#b6394a'   // fuera de especificación
```

### Reglas de la versión HTML

- `@page { size: A4; margin: 14mm }` y la hoja limitada a 760 px, para que el
  PDF salga en una carilla.
- El encabezado lleva una regla verde de 3 px. Es el único elemento decorativo.
- Si hay logo cargado, **el nombre de la empresa no se repite en texto**: el
  título pasa a ser el encabezado principal (`.titulo.solo`). Sin logo, vuelven
  las dos líneas.
- La identificación es una grilla de dos columnas de pares etiqueta/valor:
  etiqueta en gris, valor en negrita.
- Una fila fuera de especificación se pinta entera de rojo y le suma `⚠` por
  CSS. El `::after` cuelga de `.param`, **no del `<td>`**: en pantalla chica la
  especificación pasa a ser un bloque dentro de la misma celda y el `⚠` caía
  debajo, en una línea suelta.
- `print-color-adjust: exact`, si no el navegador descarta los fondos al
  imprimir.
- Lleva `<meta name="viewport">` y un bloque `@media screen and (max-width:
  620px)`: sin viewport el celular renderiza a 980 px y achica todo. En pantalla
  chica la identificación pasa a una columna, el cuerpo sube a 16 px y la
  columna de especificación se esconde: el dato aparece bajo el parámetro
  (`.spec-movil`). La hoja impresa no cambia — todo eso es `@media screen`.

### Reglas de la versión SVG

- **Ancho fijo de 560 px**, margen de 26. El alto se calcula al final, según
  cuánto haya crecido el contenido.
- El ancho es angosto a propósito. Esta imagen se manda por WhatsApp y se lee en
  un celular, que la achica para que entre en la pantalla: lo que decide si se
  lee no es el tamaño de la letra en píxeles sino **su tamaño relativo al ancho
  de la imagen**. La cuenta es `fuente × 390 / ancho` (390 pt es el viewport de
  un teléfono común). Con 820 px de ancho y cuerpo de 13, daba 6 pt y había que
  hacer zoom; con 560 y cuerpo de 18 da 12,5 pt, que es lectura normal.
- **Piso de 16 px** para cualquier texto, incluido el pie.
- Los resultados van en dos columnas —parámetro a la izquierda, valor pegado al
  margen derecho con `text-anchor="end"`, especificación debajo en chico—. Tres
  columnas no entran en ese ancho sin cortar los nombres largos de los ensayos.
- El valor **tiene que ir con `fin: true`** (`text-anchor="end"`). Sin eso se
  dibuja hacia la derecha desde el margen y queda cortado fuera de la imagen.
- Se lleva un cursor `y` que va bajando: cada bloque dibuja y suma su alto. No
  hay layout automático.
- **Solo texto y formas: nada de `foreignObject`.** Si se mete HTML dentro del
  SVG, el canvas queda bloqueado y `toBlob()` no puede exportar la imagen.
- El SVG no reajusta el texto solo: se corta con `quebrarPorAncho(texto,
  anchoDisponible, fuente)`, que estima el ancho en 0,52 del cuerpo por carácter
  (el promedio de Arial para castellano).
- Se exporta al doble de escala para que se lea al ampliar.
- `tests/informe.test.ts` fija todo esto: el tamaño efectivo en el celular, el
  contraste de cada color y que nada quede cortado en el borde. Si tocás el
  informe, esos tests tienen que fallar antes de que lo arregles.

```ts
let y = margen

// cada bloque dibuja en la posición actual y después baja el cursor
partes.push(`<text x="${margen}" y="${y + 22}" font-size="21" font-weight="bold"
             fill="${COLOR_TEXTO}">${escaparXml(informe.empresa)}</text>`)
y += 60

partes.push(`<rect x="${margen}" y="${y}" width="${anchoUtil}" height="3" fill="${COLOR_VERDE}"/>`)
y += 26

// …y al final el alto sale del cursor
const alto = Math.ceil(y)
```

### De imagen a compartir

Un solo blob alimenta los cuatro caminos.

```ts
function informeAPng(a: Analisis): Promise<Blob | null> {
  const { svg, ancho, alto } = buildInformeSVG(armarInforme(a))
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  // …img.onload → canvas a 2x → ctx.drawImage → canvas.toBlob(...)
}

await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])          // copiar
await navigator.share({ files: [new File([blob], nombre, { type: 'image/png' })] })  // compartir
enlace.download = nombre; enlace.click()                                             // descargar
w.document.write(buildInformeHTML(...)); w.print()                                   // PDF
```

Copiar y compartir se muestran solo si el navegador los soporta
(`ClipboardItem` y `navigator.canShare({ files })`).

---

## 11. Armar un informe nuevo

La estructura de `informe.ts` sirve para cualquier informe de una ficha con
encabezado, datos, tabla y comentario.

1. **Definí el contenido primero.** Un tipo nuevo, o reusá `InformeTanque` si
   encaja. Si te alcanza con cambiar el `titulo` y las filas, no hace falta tipo
   nuevo.
2. **Armá el objeto en el componente.** Una función `armarInforme(x)` que
   traduce el registro a ese objeto: ahí se resuelven formatos, unidades y qué
   está fuera de especificación. Las funciones de dibujo no deciden nada.
3. **Reusá las dos funciones de dibujo.** Si la estructura es la misma,
   `buildInformeHTML` y `buildInformeSVG` se usan tal cual. Si cambia, copiá el
   esqueleto y respetá los cinco colores y el cursor `y`.
4. **Escapá todo lo que venga de la base.** `escaparXml()` en cada valor y
   `logoSeguro()` en el logo, de `src/lib/texto.ts`.
5. **Enganchá los cuatro botones.** Copiar, compartir, descargar imagen y
   descargar PDF salen todos del mismo blob.

---

## 12. Reglas que no se rompen

Cada una está acá porque ya falló una vez.

- **Fechas de calendario con `formatDateOnly`.** Se guardan como medianoche UTC
  y se muestran con los componentes UTC. `formatDate` es solo para momentos
  reales (`createdAt`, `completadaAt`). Mezclarlas mostraba un día menos en los
  listados y el día correcto en el dashboard.
- **"Hoy" es el día del laboratorio.** El servidor corre en UTC y la planta está
  tres horas atrás. Todo lo que sea "hoy", "este mes" o "este año" usa
  `hoyEnLaboratorio()` o `todayISO()`, nunca `new Date()` directo.
- **Nada de `alert()` ni `confirm()` en la app de escritorio.**
- **Todo lo que se concatena en HTML se escapa.** Rótulos e informes se arman
  con plantillas de texto y se inyectan con `document.write` en una ventana del
  mismo origen. Sin escapar, un destino como `Fulano & Cía <SA>` sale mutilado,
  y lo que entre ahí se ejecuta.
- **El orden de las listas lleva desempate:** `[{ fecha: 'desc' }, { id: 'desc' }]`.
  Sin el `id`, editar un registro lo hacía saltar de lugar.
- **Para la Zebra, ZPL o diálogo — nunca impresión silenciosa gráfica.** El
  driver la rechaza con "Invalid printer settings".

---

Las convenciones de datos y las notas de mantenimiento están en `AGENTS.md`.
Los casos que fallaron y no tienen que volver a fallar, en `tests/`.
