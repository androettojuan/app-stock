// Verifica firestore.rules y storage.rules contra el emulador: arma un negocio
// de prueba y comprueba qué puede hacer cada uno (dueño, operador, ajeno).
//
// Uso: npm run emulators (en otra terminal) y después npm run test:rules
//
// El emulador acepta JWT sin firmar, así que alcanza con armarlos a mano para
// hacerse pasar por cada usuario. Con el token especial `owner` se saltean las
// reglas: lo usamos solo para preparar y limpiar los datos.
import { readFileSync } from 'node:fs'

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const HOST_STORAGE = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199'
const PROY =
  process.env.GCLOUD_PROJECT ??
  JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default
const BASE = `http://${HOST}/v1/projects/${PROY}/databases/(default)/documents`
const BUCKET = process.env.STORAGE_BUCKET ?? `${PROY}.firebasestorage.app`
const BASE_STORAGE = `http://${HOST_STORAGE}/v0/b/${BUCKET}/o`

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
      ...(opciones?.headers ?? {}),
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

// --- Fotos de producto (storage.rules) ---
const RUTA_CRUDA = `negocios/${NEGOCIO}/productos/prueba.jpg`
const RUTA_FOTO = encodeURIComponent(RUTA_CRUDA)
// Las fotos se suben con el protocolo resumable, igual que el SDK: es la única
// forma en que el emulador completa contentType, que es lo que la regla mira.
async function subirFoto(email) {
  const inicio = await pedir(`${BASE_STORAGE}?name=${RUTA_FOTO}&uploadType=resumable`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Type': 'image/jpeg',
    },
    body: JSON.stringify({ name: RUTA_CRUDA, contentType: 'image/jpeg' }),
  }, email)
  if (!inicio.ok) return inicio

  const url = inicio.headers.get('x-goog-upload-url')
  return pedir(url, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': 'image/jpeg',
    },
    // Un JPEG mínimo alcanza: lo que se prueba es el permiso, no la imagen.
    body: Buffer.from('ffd8ffdb0000ffd9', 'hex'),
  }, email)
}

async function probarSubida(descripcion, email, esperado) {
  const r = await subirFoto(email)
  const bien = esperado === 'permite' ? r.ok : !r.ok
  resultados.push(bien)
  console.log(`${bien ? '✓' : '✗'} ${descripcion}: ${r.ok ? 'permitido' : 'rechazado'} (${r.status})`)
}

await probarSubida('el operador sube la foto de un producto', OPERADOR, 'permite')
await probarSubida('un ajeno no sube fotos al negocio', AJENO, 'rechaza')
await probar('un ajeno no ve las fotos del negocio', AJENO, `${BASE_STORAGE}/${RUTA_FOTO}`, {}, 'rechaza')
await pedir(`${BASE_STORAGE}/${RUTA_FOTO}`, { method: 'DELETE' }, 'owner')

await limpiar()

const bien = resultados.filter(Boolean).length
console.log(`\n${bien}/${resultados.length} como se esperaba`)
process.exit(bien === resultados.length ? 0 : 1)
