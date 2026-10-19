// Capturas del README: npm run capturas
// Corre dentro de `firebase emulators:exec` (Auth + Firestore en puertos propios,
// ver firebase.capturas.json), carga un almacén de ejemplo y saca cada pantalla en
// la computadora y en el teléfono. Escribe docs/capturas/*.png. No toca Firebase real.
import { mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROYECTO = 'demo-stockia'
const PUERTO_APP = 5299
const APP = `http://localhost:${PUERTO_APP}`
const SALIDA = 'docs/capturas'
const PANTALLAS = 'docs/capturas/pantallas'
// Dibujos de los productos: los emoji de Noto, versión fija.
const EMOJI = (codigo) =>
  `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@v2.051/svg/emoji_u${codigo}.svg`

// ---------- datos de ejemplo ----------
const DUENIA = { email: 'marcela.rios@ejemplo.com', nombre: 'Marcela Ríos' }
const OPERADORES = ['tomas.diaz@ejemplo.com', 'lucia.perez@ejemplo.com']

const FONDOS = {
  Bebidas: '#dbe9fb', Lácteos: '#eef2f7', Almacén: '#f6ead8',
  Golosinas: '#f8e1e4', Panadería: '#f7ecd6', Limpieza: '#dcf1ea',
}

// [nombre, categoría, proveedor, stock, mínimo, costo, precio, emoji]
const PRODUCTOS = [
  ['Gaseosa cola 500 ml', 'Bebidas', 'Distribuidora Norte', 24, 12, 900, 1500, '1f964'],
  ['Jugo de naranja 1 L', 'Bebidas', 'Distribuidora Norte', 3, 6, 1100, 1800, '1f9c3'],
  ['Cerveza rubia 473 ml', 'Bebidas', 'Distribuidora Norte', 36, 24, 1300, 2200, '1f37a'],
  ['Café molido 250 g', 'Almacén', 'Mayorista Central', 9, 4, 3800, 5900, '2615'],
  ['Leche entera 1 L', 'Lácteos', 'Lácteos del Valle', 2, 10, 1050, 1600, '1f95b'],
  ['Queso cremoso x kg', 'Lácteos', 'Lácteos del Valle', 4, 2, 6500, 9800, '1f9c0'],
  ['Huevos x 12', 'Almacén', 'Granja San José', 8, 5, 2600, 3900, '1f95a'],
  ['Fideos tirabuzón 500 g', 'Almacén', 'Mayorista Central', 30, 10, 850, 1350, '1f35d'],
  ['Pan lactal', 'Panadería', 'Panadería del Sol', 0, 4, 1900, 2900, '1f35e'],
  ['Chocolate con leche 100 g', 'Golosinas', 'Mayorista Central', 15, 8, 1400, 2300, '1f36b'],
  ['Galletitas dulces', 'Golosinas', 'Mayorista Central', 18, 10, 950, 1600, '1f36a'],
  ['Papel higiénico x 4', 'Limpieza', 'Higiene Total', 12, 6, 2100, 3400, '1f9fb'],
  ['Jabón de tocador', 'Limpieza', 'Higiene Total', 20, 5, 600, 1100, '1f9fc'],
]

const idDe = (nombre) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Movimientos de los últimos días: [días atrás, hora, producto, tipo, cantidad, motivo, usuario]
const MOVIMIENTOS = [
  [9, 9, 'Gaseosa cola 500 ml', 'entrada', 48, '', 0],
  [9, 9, 'Cerveza rubia 473 ml', 'entrada', 48, '', 0],
  [8, 10, 'Fideos tirabuzón 500 g', 'entrada', 40, '', 0],
  [8, 18, 'Gaseosa cola 500 ml', 'salida', 12, 'venta', 1],
  [7, 11, 'Leche entera 1 L', 'entrada', 24, '', 2],
  [7, 19, 'Queso cremoso x kg', 'ajuste', -1, 'corrección desde la ficha', 0],
  [6, 12, 'Cerveza rubia 473 ml', 'salida', 12, 'venta', 1],
  [5, 9, 'Papel higiénico x 4', 'entrada', 12, '', 0],
  [5, 17, 'Pan lactal', 'salida', 6, 'venta', 2],
  [4, 10, 'Huevos x 12', 'entrada', 10, '', 2],
  [4, 18, 'Leche entera 1 L', 'salida', 14, 'venta', 1],
  [3, 11, 'Fideos tirabuzón 500 g', 'salida', 10, 'venta', 1],
  [3, 16, 'Chocolate con leche 100 g', 'salida', 2, 'vencido', 2],
  [2, 9, 'Galletitas dulces', 'entrada', 24, '', 0],
  [2, 19, 'Gaseosa cola 500 ml', 'salida', 12, 'venta', 2],
  [1, 10, 'Jugo de naranja 1 L', 'salida', 5, 'venta', 1],
  [1, 18, 'Leche entera 1 L', 'salida', 8, 'venta', 2],
  [0, 9, 'Pan lactal', 'salida', 4, 'venta', 1],
  [0, 10, 'Jabón de tocador', 'entrada', 12, '', 0],
  [0, 11, 'Cerveza rubia 473 ml', 'salida', 6, 'venta', 2],
]

// Fecha del movimiento como la guarda la app (AAAA-MM-DD), y su timestamp.
function momento(diasAtras, hora) {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  d.setHours(hora, 15, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return { fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, ts: Timestamp.fromDate(d) }
}

/** Cada producto con su dibujo sobre un fondo según la categoría, como JPEG embebido. */
async function fotos(browser) {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } })
  const resultado = {}
  for (const [nombre, categoria, , , , , , emoji] of PRODUCTOS) {
    await page.setContent(`<body style="margin:0">
      <div id="f" style="width:400px;height:400px;display:grid;place-items:center;
        background:radial-gradient(circle at 50% 40%, #fff 0%, ${FONDOS[categoria]} 70%)">
        <img src="${EMOJI(emoji)}" style="width:62%;filter:drop-shadow(0 10px 14px #0002)">
      </div></body>`)
    const ok = await page.waitForFunction(() => document.querySelector('img').complete && document.querySelector('img').naturalWidth > 0, null, { timeout: 15000 }).then(() => true, () => false)
    if (!ok) { console.warn(`   sin foto: ${nombre}`); continue }
    const jpg = await page.locator('#f').screenshot({ type: 'jpeg', quality: 82 })
    resultado[nombre] = `data:image/jpeg;base64,${jpg.toString('base64')}`
  }
  await page.close()
  return resultado
}

async function sembrar(browser) {
  initializeApp({ projectId: PROYECTO })
  const db = getFirestore()
  const ahora = Timestamp.now()
  const imagenes = await fotos(browser)

  const almacen = db.doc('negocios/almacen-la-esquina')
  await almacen.set({
    nombre: 'Almacén La Esquina', rubro: 'Almacén', activo: true, creado: ahora,
    config: {
      minimoDefecto: 5,
      categorias: Object.keys(FONDOS),
      proveedores: [...new Set(PRODUCTOS.map((p) => p[2]))].sort(),
    },
  })
  await almacen.collection('miembros').doc(DUENIA.email).set({ email: DUENIA.email, nombre: DUENIA.nombre, rol: 'admin', creado: ahora })
  for (const email of OPERADORES) {
    await almacen.collection('miembros').doc(email).set({ email, rol: 'operador', creado: ahora })
  }
  for (const [nombre, categoria, proveedor, stock, minimo, costo, precio] of PRODUCTOS) {
    await almacen.collection('productos').doc(idDe(nombre)).set({
      nombre, categoria, proveedor, stock, minimo, costo, precio, activo: true, actualizado: ahora,
      ...(imagenes[nombre] ? { foto: imagenes[nombre] } : {}),
    })
  }
  const usuarios = [DUENIA.email, ...OPERADORES]
  for (const [i, [dias, hora, nombre, tipo, cantidad, motivo, quien]] of MOVIMIENTOS.entries()) {
    const costo = PRODUCTOS.find((p) => p[0] === nombre)[5]
    await almacen.collection('movimientos').doc(`m${String(i).padStart(3, '0')}`).set({
      productoId: idDe(nombre), nombre, tipo, cantidad, usuario: usuarios[quien],
      ...(tipo === 'entrada' ? { costo } : {}), ...(motivo ? { motivo } : {}),
      ...momento(dias, hora),
    })
  }

  // Un segundo negocio, para que se vea el selector.
  const kiosco = db.doc('negocios/kiosco-del-parque')
  await kiosco.set({ nombre: 'Kiosco del Parque', rubro: 'Kiosco', activo: true, creado: ahora })
  await kiosco.collection('miembros').doc(DUENIA.email).set({ email: DUENIA.email, rol: 'admin', creado: ahora })
}

// ---------- pantallas ----------
const COMUN = { locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' }
const COMPU = { ...COMUN, viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1.5 }
const TELEFONO = { ...COMUN, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

async function sesion(browser, dispositivo, { oscuro = false, entrar = true, negocio = 'almacen-la-esquina' } = {}) {
  const ctx = await browser.newContext({ ...dispositivo, colorScheme: oscuro ? 'dark' : 'light' })
  await ctx.addInitScript((id) => { if (id) localStorage.setItem('stockia:negocio', id) }, negocio)
  const page = await ctx.newPage()
  await page.goto(APP)
  if (entrar) {
    await page.waitForFunction(() => 'stockiaEntrar' in window)
    await page.evaluate((u) => window.stockiaEntrar(u.email, u.nombre), DUENIA)
  }
  return page
}

async function captura(page, nombre, { completa = false } = {}) {
  // La etiqueta «emulador» es para el desarrollo, no para el README.
  await page.addStyleTag({ content: '.tag.emulador { display: none !important; }' })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete || new Promise((r) => { i.onload = i.onerror = r }))))
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${PANTALLAS}/${nombre}.png`, fullPage: completa })
  console.log('  ', nombre)
}

const esperarProductos = (page) => page.waitForSelector('.tarjeta-producto, .tabla-tarjetas tbody tr .miniatura')

async function computadora(browser, oscuro) {
  const sufijo = oscuro ? '-oscuro' : ''
  const page = await sesion(browser, COMPU, { oscuro })
  await esperarProductos(page)
  await captura(page, `compu-productos${sufijo}`)
  if (oscuro) return page.context().close()

  await page.getByRole('button', { name: 'Más acciones de Café molido 250 g' }).click()
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.waitForSelector('.modal')
  await captura(page, 'compu-ficha')
  await page.getByRole('button', { name: 'Cancelar' }).click()

  await page.locator('.tabs').getByRole('button', { name: 'Movimientos' }).click()
  await page.waitForSelector('.tag.venta, .tag.salida')
  await captura(page, 'compu-movimientos')

  await page.getByRole('button', { name: 'Configuración del negocio' }).click()
  await page.waitForSelector('.chip')
  await page.waitForSelector('.config td.celda-principal')
  await captura(page, 'compu-configuracion', { completa: true })
  await page.context().close()
}

async function telefono(browser, oscuro) {
  const sufijo = oscuro ? '-oscuro' : ''
  const page = await sesion(browser, TELEFONO, { oscuro })
  await esperarProductos(page)
  await captura(page, `tel-productos${sufijo}`)
  if (oscuro) return page.context().close()

  await page.getByRole('button', { name: 'Menú' }).click()
  await captura(page, 'tel-menu')
  await page.getByRole('button', { name: 'Menú' }).click()

  await page.getByRole('button', { name: 'Filtros' }).click()
  await page.getByLabel('Ver productos con stock bajo').check()
  await captura(page, 'tel-stock-bajo')
  await page.getByLabel('Ver productos con stock bajo').uncheck()
  await page.getByRole('button', { name: 'Filtros' }).click()

  await page.getByRole('button', { name: 'Ver la foto de Queso cremoso x kg' }).click()
  await page.waitForSelector('.foto-grande img')
  await captura(page, 'tel-foto')
  await page.getByRole('button', { name: 'Cerrar' }).click()

  // Entrada grande sobre un producto con poco stock: después ofrece revisar precios.
  const jugo = page.locator('.tarjeta-producto', { hasText: 'Jugo de naranja' })
  await jugo.getByRole('button', { name: '+ Entrada' }).click()
  await page.getByLabel('Cantidad').fill('12')
  await page.getByLabel('Motivo').fill('compra a Distribuidora Norte')
  await page.getByLabel('Cantidad').blur()
  await captura(page, 'tel-entrada')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await page.waitForSelector('text=¿Actualizamos los precios?')
  await page.getByLabel('Costo').fill('1250')
  await page.getByLabel('Precio de venta').fill('2000')
  await page.getByLabel('Precio de venta').blur()
  await captura(page, 'tel-precios')
  await page.getByRole('button', { name: 'Guardar precios' }).click()

  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Movimientos' }).click()
  await page.waitForSelector('.encabezado-pantalla')
  await captura(page, 'tel-movimientos')
  await page.context().close()
}

async function acceso(browser) {
  let page = await sesion(browser, TELEFONO, { entrar: false, negocio: null })
  await page.waitForSelector('.login')
  await captura(page, 'tel-login')
  await page.context().close()

  page = await sesion(browser, TELEFONO, { negocio: null })
  await page.waitForSelector('.selector li')
  await captura(page, 'tel-selector')
  await page.context().close()
}

// ---------- composiciones ----------
// Lo que muestra el README: la compu en una ventana, los teléfonos uno al lado del otro.
const VENTANA = (img, ancho) => `<div class="ventana" style="width:${ancho}px"><div class="barra"><i></i><i></i><i></i><span>stock-app-b7a37.web.app</span></div><img src="${img}"></div>`
const TEL = (img) => `<img class="tel" src="${img}">`

const COMPOSICIONES = {
  portada: { filas: [[['compu-productos', 'compu', 980], ['tel-productos', 'tel']]] },
  telefono: { leyendas: true, filas: [[['tel-productos', 'tel', 'Stock grande y foto al costado'], ['tel-entrada', 'tel', '+ Entrada: dice cuánto queda'], ['tel-precios', 'tel', 'Revisar precios tras comprar'], ['tel-stock-bajo', 'tel', 'Lo que hay que reponer']]] },
  telefono2: { leyendas: true, filas: [[['tel-foto', 'tel', 'La foto en grande'], ['tel-menu', 'tel', 'El menú'], ['tel-movimientos', 'tel', 'Movimientos'], ['tel-selector', 'tel', 'Varios negocios por usuario']]] },
  movimientos: { filas: [[['compu-movimientos', 'compu', 1100]]] },
  configuracion: { filas: [[['compu-configuracion', 'compu', 1100]]] },
  ficha: { filas: [[['compu-ficha', 'compu', 1100]]] },
  oscuro: { filas: [[['compu-productos-oscuro', 'compu', 980], ['tel-productos-oscuro', 'tel']]], oscuro: true },
}

async function composiciones(browser) {
  const page = await browser.newPage({ deviceScaleFactor: 1.25 })
  for (const [nombre, { filas, leyendas, oscuro }] of Object.entries(COMPOSICIONES)) {
    const datos = {}
    for (const [archivo] of filas.flat()) datos[archivo] = `data:image/png;base64,${(await readFile(`${PANTALLAS}/${archivo}.png`)).toString('base64')}`
    const celda = ([archivo, tipo, extra]) => {
      const img = tipo === 'compu' ? VENTANA(datos[archivo], extra) : TEL(datos[archivo])
      return leyendas ? `<figure>${img}<figcaption>${extra}</figcaption></figure>` : img
    }
    await page.setContent(`<!doctype html><html><head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&display=swap">
      <style>
        body { margin: 0; font-family: Inter, sans-serif; }
        .lienzo { display: inline-flex; flex-direction: column; gap: 32px; padding: 44px 48px 40px;
          background: ${oscuro ? 'linear-gradient(160deg, #1a2030, #0d1017)' : 'linear-gradient(160deg, #eef3fb, #dde6f4)'}; }
        .fila { display: flex; gap: 36px; align-items: center; }
        .ventana { border-radius: 12px; overflow: hidden; background: #fff;
          box-shadow: 0 1px 2px #0002, 0 18px 44px #1b2a4a2e; }
        .ventana .barra { height: 34px; display: flex; align-items: center; gap: 7px; padding: 0 14px;
          background: ${oscuro ? '#232733' : '#e9edf3'}; }
        .ventana .barra i { width: 11px; height: 11px; border-radius: 50%; background: ${oscuro ? '#454b5a' : '#c7ced9'}; }
        .ventana .barra span { margin-left: 14px; font-size: 13px; color: ${oscuro ? '#9aa2b1' : '#626b7c'};
          background: ${oscuro ? '#181b22' : '#fff'}; padding: 3px 14px; border-radius: 6px; }
        .ventana img { display: block; width: 100%; }
        .tel { display: block; width: 300px; border-radius: 30px; border: 7px solid ${oscuro ? '#3a4050' : '#12151b'};
          box-shadow: 0 1px 2px #0003, 0 18px 40px #1b2a4a40; }
        figure { margin: 0; text-align: center; }
        figcaption { margin-top: 16px; font-size: 18px; font-weight: 500; color: #2b3445; }
      </style></head><body><div class="lienzo">
      ${filas.map((f) => `<div class="fila">${f.map(celda).join('')}</div>`).join('')}
      </div></body></html>`)
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.lienzo').screenshot({ path: `${SALIDA}/${nombre}.png` })
    console.log('  ', `${nombre}.png`)
  }
  await page.close()
}

// ---------- corrida ----------
await mkdir(PANTALLAS, { recursive: true })
const browser = await chromium.launch({ args: ['--lang=es-AR'] })
Object.assign(process.env, {
  VITE_USE_EMULATOR: '1',
  VITE_FIREBASE_API_KEY: 'demo',
  VITE_FIREBASE_AUTH_DOMAIN: `${PROYECTO}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: PROYECTO,
  VITE_FIREBASE_STORAGE_BUCKET: `${PROYECTO}.appspot.com`,
  VITE_PUERTO_AUTH: process.env.FIREBASE_AUTH_EMULATOR_HOST.split(':').pop(),
  VITE_PUERTO_FIRESTORE: process.env.FIRESTORE_EMULATOR_HOST.split(':').pop(),
})
const server = await createServer({ server: { port: PUERTO_APP, strictPort: true }, logLevel: 'warn' })
try {
  console.log('Cargando datos de ejemplo…')
  await sembrar(browser)
  await server.listen()
  console.log('Pantallas:')
  await computadora(browser, false)
  await computadora(browser, true)
  // El oscuro primero: el claro registra una entrada y cambia el valorizado.
  await telefono(browser, true)
  await telefono(browser, false)
  await acceso(browser)
  console.log('Composiciones:')
  await composiciones(browser)
} finally {
  await browser.close()
  await server.close()
}
process.exit(0)
