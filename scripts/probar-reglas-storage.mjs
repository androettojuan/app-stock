// Prueba storage.rules contra el motor real de Firebase, sin subir nada.
//
// Hace falta porque el emulador acepta cosas que el Storage real no tiene: con
// `firestore.exists` las pruebas locales pasaban y en producción todas las
// subidas fallaban con "Function not found". Esto evalúa las reglas con la API
// de Firebase Rules, que es la misma que corre en producción.
//
// Uso: npm run test:rules:storage (requiere `firebase login`)
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROYECTO =
  process.env.GCLOUD_PROJECT ??
  JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default
const BUCKET = process.env.STORAGE_BUCKET ?? `${PROYECTO}.firebasestorage.app`

// Credenciales OAuth públicas de firebase-tools: usamos la sesión del CLI.
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'

const config = JSON.parse(
  readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8'),
)
if (!config.tokens?.refresh_token) throw new Error('No hay sesión del CLI: corré `firebase login`')

const { access_token } = await (await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: config.tokens.refresh_token,
    grant_type: 'refresh_token',
  }),
})).json()

const fuente = readFileSync(new URL('../storage.rules', import.meta.url), 'utf8')
const RUTA = `/b/${BUCKET}/o/negocios/negocio123/productos/producto456.jpg`
const conSesion = {
  uid: 'usuario-de-prueba',
  token: { email: 'alguien@example.com', email_verified: true },
}

const casos = [
  { descripcion: 'con sesión sube una foto', espera: 'ALLOW', auth: conSesion, resource: { size: 120_000, contentType: 'image/jpeg' } },
  { descripcion: 'sin sesión no sube nada', espera: 'DENY', auth: null, resource: { size: 120_000, contentType: 'image/jpeg' } },
  { descripcion: 'no se cuela un archivo que no es imagen', espera: 'DENY', auth: conSesion, resource: { size: 1_000, contentType: 'application/pdf' } },
  { descripcion: 'no se sube una foto enorme', espera: 'DENY', auth: conSesion, resource: { size: 9_000_000, contentType: 'image/jpeg' } },
  { descripcion: 'sin sesión tampoco se leen las fotos', espera: 'DENY', auth: null, metodo: 'get' },
]

const r = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROYECTO}:test`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: { files: [{ name: 'storage.rules', content: fuente }] },
    testSuite: {
      testCases: casos.map((c) => ({
        expectation: c.espera,
        request: {
          auth: c.auth,
          path: RUTA,
          method: c.metodo ?? 'create',
          time: new Date().toISOString(),
          ...(c.resource ? { resource: c.resource } : {}),
        },
      })),
    },
  }),
})

const { testResults = [], error } = await r.json()
if (error) throw new Error(`No se pudieron evaluar las reglas: ${error.message}`)

let bien = 0
testResults.forEach((resultado, i) => {
  const ok = resultado.state === 'SUCCESS'
  if (ok) bien++
  console.log(`${ok ? '✓' : '✗'} ${casos[i].descripcion}`)
  for (const m of resultado.debugMessages ?? []) console.log(`    ${m}`)
})

console.log(`\n${bien}/${casos.length} como se esperaba`)
process.exit(bien === casos.length ? 0 : 1)
