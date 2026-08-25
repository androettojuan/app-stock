// Verifica firestore.rules contra el emulador: arma un negocio de prueba, y
// comprueba qué puede hacer cada uno (dueño, operador, ajeno).
//
// Uso: npm run emulators (en otra terminal) y después npm run test:rules
//
// El emulador acepta JWT sin firmar, así que alcanza con armarlos a mano para
// hacerse pasar por cada usuario. Con el token especial `owner` se saltean las
// reglas: lo usamos solo para preparar y limpiar los datos.
import { readFileSync } from 'node:fs'

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const PROY =
  process.env.GCLOUD_PROJECT ??
  JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default
const BASE = `http://${HOST}/v1/projects/${PROY}/databases/(default)/documents`

const NEGOCIO = 'negocio-de-prueba-reglas'
const DUENIO = 'duenio.prueba@example.com'
const OPERADOR = 'operador.prueba@example.com'
const AJENO = 'ajeno.prueba@example.com'

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

function token(email) {
  const ahora = Math.floor(Date.now() / 1000)
  return `${b64({ alg: 'none', type: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROY}`,
    aud: PROY,
    sub: email,
    user_id: email,
    email,
    email_verified: true,
    auth_time: ahora,
    iat: ahora,
    exp: ahora + 3600,
    firebase: { sign_in_provider: 'google.com', identities: { email: [email] } },
  })}.`
}

const pedir = (url, opciones, email) =>
  fetch(url, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${email === 'owner' ? 'owner' : token(email)}`,
    },
  })

const texto = (v) => ({ stringValue: v })

async function preparar() {
  await pedir(`${BASE}/negocios?documentId=${NEGOCIO}`, {
    method: 'POST',
    body: JSON.stringify({ fields: { nombre: texto('Negocio de prueba'), activo: { booleanValue: true } } }),
  }, 'owner')
  for (const [email, rol] of [[DUENIO, 'admin'], [OPERADOR, 'operador']]) {
    await pedir(`${BASE}/negocios/${NEGOCIO}/miembros/${email}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { email: texto(email), rol: texto(rol) } }),
    }, 'owner')
  }
}

async function limpiar() {
  const rutas = [
    `${BASE}/negocios/${NEGOCIO}/miembros/${DUENIO}`,
    `${BASE}/negocios/${NEGOCIO}/miembros/${OPERADOR}`,
    `${BASE}/negocios/${NEGOCIO}/miembros/colado@example.com`,
    `${BASE}/negocios/${NEGOCIO}/productos/prueba`,
    `${BASE}/negocios/${NEGOCIO}`,
  ]
  for (const r of rutas) await pedir(r, { method: 'DELETE' }, 'owner')
}

const resultados = []

async function probar(descripcion, email, url, opciones, esperado) {
  const r = await pedir(url, opciones, email)
  const bien = esperado === 'permite' ? r.ok : !r.ok
  resultados.push(bien)
  console.log(`${bien ? '✓' : '✗'} ${descripcion}: ${r.ok ? 'permitido' : 'rechazado'} (${r.status})`)
}

await preparar()

const nombre = (v) => ({ method: 'PATCH', body: JSON.stringify({ fields: { nombre: texto(v) } }) })
const negocioUrl = `${BASE}/negocios/${NEGOCIO}`

await probar('el dueño configura su negocio', DUENIO, `${negocioUrl}?updateMask.fieldPaths=nombre`, nombre('Renombrado'), 'permite')
await probar('el operador NO configura el negocio', OPERADOR, `${negocioUrl}?updateMask.fieldPaths=nombre`, nombre('Colado'), 'rechaza')
await probar('el dueño da de alta miembros', DUENIO, `${BASE}/negocios/${NEGOCIO}/miembros/colado@example.com`, {
  method: 'PATCH',
  body: JSON.stringify({ fields: { email: texto('colado@example.com'), rol: texto('operador') } }),
}, 'permite')
await probar('el operador NO da de alta miembros', OPERADOR, `${BASE}/negocios/${NEGOCIO}/miembros/otro@example.com`, {
  method: 'PATCH',
  body: JSON.stringify({ fields: { email: texto('otro@example.com'), rol: texto('admin') } }),
}, 'rechaza')
await probar('el operador carga productos', OPERADOR, `${BASE}/negocios/${NEGOCIO}/productos/prueba`, {
  method: 'PATCH',
  body: JSON.stringify({ fields: { nombre: texto('Producto'), stock: { integerValue: '1' } } }),
}, 'permite')
await probar('un ajeno no ve el negocio', AJENO, negocioUrl, {}, 'rechaza')
await probar('un ajeno no ve los productos', AJENO, `${BASE}/negocios/${NEGOCIO}/productos`, {}, 'rechaza')

await limpiar()

const bien = resultados.filter(Boolean).length
console.log(`\n${bien}/${resultados.length} como se esperaba`)
process.exit(bien === resultados.length ? 0 : 1)
