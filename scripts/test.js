// Corre los tests con el runner incorporado de Node (node --test), sin agregar
// dependencias. Existe como script de Node y no como una línea en package.json
// para poder definir las variables de entorno de la misma forma en Windows y en
// Linux.
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const raiz = path.join(__dirname, '..')

// Los archivos se enumeran acá: pasarle el directorio a `node --test` no
// funciona con el loader de ts-node, que intenta resolverlo como módulo.
const archivos = fs
  .readdirSync(path.join(raiz, 'tests'))
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => path.join('tests', f))

if (archivos.length === 0) {
  console.error('No se encontró ningún test en tests/')
  process.exit(1)
}

const hijo = spawn(
  process.execPath,
  [
    '--test',
    '--require', 'ts-node/register',
    '--require', 'tsconfig-paths/register',
    ...archivos,
  ],
  {
    cwd: raiz,
    stdio: 'inherit',
    env: {
      ...process.env,
      // El tsconfig del proyecto usa módulos ESM para Next; los tests corren en
      // CommonJS, que es lo que entiende ts-node acá.
      TS_NODE_COMPILER_OPTIONS: JSON.stringify({
        module: 'CommonJS',
        // 'bundler' es para Next; con CommonJS hay que volver a la resolución
        // clásica de Node.
        moduleResolution: 'node',
        baseUrl: '.',
      }),
      TS_NODE_BASEURL: '.',
      TS_NODE_TRANSPILE_ONLY: 'true',
      // Los tests son de funciones puras, pero varios módulos importan cosas
      // que esperan estas variables definidas.
      SUPERVISOR_PASSWORD: process.env.SUPERVISOR_PASSWORD || 'test-supervisor',
      ANALISTA_PASSWORD: process.env.ANALISTA_PASSWORD || 'test-analista',
      TZ: 'America/Argentina/Buenos_Aires',
    },
  }
)

hijo.on('exit', (code) => process.exit(code ?? 1))
