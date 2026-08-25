// Carga datos de prueba en el emulador: dos negocios, un usuario y productos.
// Uso: npm run emulators (en otra terminal) y después npm run db:seed
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'

// El login es con Google: alcanza con el email. En el emulador el popup deja
// entrar con cualquier cuenta, así que este email es el que hay que usar ahí.
const EMAIL = process.env.SEED_EMAIL ?? 'demo@app-stock.test'

// Mismo proyecto que usan los emuladores, así el seed cae en el namespace correcto.
const proyecto =
  process.env.GCLOUD_PROJECT ??
  JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default

initializeApp({ projectId: proyecto })
const db = getFirestore()
const auth = getAuth()

const NEGOCIOS = [
  {
    id: 'kiosco-centro',
    nombre: 'Kiosco Centro',
    rubro: 'Kiosco',
    productos: [
      { nombre: 'Coca 500ml', sku: 'COCA500', categoria: 'Bebidas', unidad: 'u', stock: 24, minimo: 6, costo: 900, precio: 1500 },
      { nombre: 'Alfajor triple', sku: 'ALF3', categoria: 'Golosinas', unidad: 'u', stock: 4, minimo: 10, costo: 700, precio: 1200 },
      { nombre: 'Agua sin gas 1.5L', sku: 'AGUA15', categoria: 'Bebidas', unidad: 'u', stock: 12, minimo: 6, costo: 800, precio: 1300 },
    ],
  },
  {
    id: 'ferreteria-sur',
    nombre: 'Ferretería Sur',
    rubro: 'Ferretería',
    productos: [
      { nombre: 'Tornillo 3x25', sku: 'T325', categoria: 'Tornillería', unidad: 'u', stock: 500, minimo: 100, costo: 30, precio: 80 },
      { nombre: 'Silicona neutra', sku: 'SIL1', categoria: 'Adhesivos', unidad: 'u', stock: 8, minimo: 4, costo: 3500, precio: 6200 },
    ],
  },
]

async function usuarioDemo() {
  try {
    const u = await auth.getUserByEmail(EMAIL)
    return u.uid
  } catch {
    const u = await auth.createUser({ email: EMAIL })
    return u.uid
  }
}

await usuarioDemo()

// Super admin: es quien puede crear negocios y administrar miembros.
await db.collection('superAdmins').doc(EMAIL).set({ email: EMAIL, creado: new Date() })

for (const negocio of NEGOCIOS) {
  const ref = db.collection('negocios').doc(negocio.id)
  await ref.set({ nombre: negocio.nombre, rubro: negocio.rubro, activo: true, creado: new Date() })
  await ref.collection('miembros').doc(EMAIL).set({ email: EMAIL, rol: 'admin', creado: new Date() })

  for (const p of negocio.productos) {
    // Id fijo por SKU: correr el seed dos veces no duplica productos.
    await ref.collection('productos').doc(p.sku).set({ ...p, activo: true, actualizado: new Date() })
  }
  console.log(`✓ ${negocio.nombre}: ${negocio.productos.length} productos`)
}

console.log(`\nEntrá con Google usando ${EMAIL}`)
process.exit(0)
