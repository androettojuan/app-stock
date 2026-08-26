// Da de alta (o de baja) un super admin en el Firestore real.
//
// La colección `superAdmins` es la única que las reglas prohíben escribir desde
// la app, a propósito: es la llave que permite crear negocios. Se toca acá, con
// las credenciales del CLI, igual que un deploy.
//
// Uso:
//   npm run superadmin -- alguien@gmail.com        da de alta
//   npm run superadmin -- alguien@gmail.com --baja da de baja
//   npm run superadmin                             lista los que hay
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const [email, bandera] = process.argv.slice(2)
const darDeBaja = bandera === '--baja'

const PROYECTO =
  process.env.GCLOUD_PROJECT ??
  JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default

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

const BASE = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`
const pedir = (ruta, opciones) =>
  fetch(`${BASE}/${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  })

if (email) {
  const limpio = email.trim().toLowerCase()
  if (!limpio.includes('@')) throw new Error(`"${email}" no parece un email`)

  const r = darDeBaja
    ? await pedir(`superAdmins/${encodeURIComponent(limpio)}`, { method: 'DELETE' })
    : await pedir(`superAdmins/${encodeURIComponent(limpio)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: {
            email: { stringValue: limpio },
            creado: { timestampValue: new Date().toISOString() },
          },
        }),
      })
  if (!r.ok) throw new Error(`No se pudo ${darDeBaja ? 'dar de baja' : 'dar de alta'}: ${r.status} ${await r.text()}`)
  console.log(`${darDeBaja ? '−' : '+'} ${limpio}\n`)
}

const { documents = [] } = await (await pedir('superAdmins')).json()
console.log(`Super admins de ${PROYECTO}:`)
for (const d of documents) console.log(' -', d.fields?.email?.stringValue ?? d.name.split('/').pop())
if (documents.length === 0) console.log(' (ninguno)')
