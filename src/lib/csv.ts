// Armado de CSV para las descargas. El módulo de inventario tiene tres
// exportaciones y las tres necesitan lo mismo: comillas escapadas y el BOM que
// hace que Excel abra el archivo en UTF-8 en vez de romper los acentos.
export function aCsv(headers: string[], rows: (string | number)[][]): string {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  return '﻿' + csv
}
