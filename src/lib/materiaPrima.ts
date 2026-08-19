// Reglas del análisis de materia prima que no dependen de la pantalla ni de la
// base, para que el listado y la API digan lo mismo.

export type ProductosDelIngreso = { producto1: string; producto2?: string | null }

/**
 * Los productos que trae el camión, en orden y sin repetir.
 *
 * Un ingreso puede traer dos: el caso que lo motivó es una borra con
 * sobrenadante de aceite, que se carga con `producto1 = Borra` y
 * `producto2 = Aceite` y se informa por separado. Si los dos campos traen lo
 * mismo, es un solo producto: analizarlo dos veces no significa nada y el
 * único de (ingresoId, producto) lo rechazaría igual.
 */
export function productosDelIngreso(ingreso: ProductosDelIngreso): string[] {
  const productos = [ingreso.producto1, ingreso.producto2 ?? '']
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  return [...new Set(productos)]
}

/** Si se puede cargar un análisis de ese producto para ese ingreso. */
export function esProductoDelIngreso(producto: string, ingreso: ProductosDelIngreso): boolean {
  return productosDelIngreso(ingreso).includes(producto.trim())
}
