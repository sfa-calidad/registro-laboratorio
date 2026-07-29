// Escapado para todo lo que se arma concatenando strings en HTML o SVG: el
// informe (src/lib/informe.ts) y los rótulos (src/lib/etiqueta.ts).
//
// Vive acá y no dentro de uno de los dos porque ya pasó: el informe escapaba y
// el rótulo no, y un destino como "Fulano & Cía <SA>" salía impreso mutilado
// (además de que el HTML del rótulo se inyecta con document.write en una
// ventana del mismo origen, así que lo que entrara ahí se ejecutaba).
export function escaparXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// El logo se interpola dentro de un atributo (src=" " / href=" "). Solo se
// acepta un data: URI de imagen; cualquier otra cosa se descarta en vez de
// escaparse, para que no entre por ahí ni un javascript: ni un salto de
// atributo.
const DATA_URI_IMAGEN = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/

export function logoSeguro(logo: string | null | undefined): string {
  if (!logo) return ''
  const limpio = logo.trim()
  return DATA_URI_IMAGEN.test(limpio) ? limpio : ''
}
