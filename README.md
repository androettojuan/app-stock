# app-stock

Control de stock multi-negocio: cada negocio tiene sus productos y su histórico
de movimientos, y un mismo usuario puede pertenecer a varios.

Stack: Vite + React 19 + TypeScript + Firebase (Auth con Google + Firestore +
Storage para las fotos de producto).
Interfaz responsive (en el teléfono las tablas se muestran como tarjetas) con
tema claro y oscuro: arranca según el sistema y se cambia con el botón ☾/☀.

## Modelo de datos

```
superAdmins/{email}                      alta manual desde la consola
negocios/{negocioId}                     { nombre, rubro, activo, creado,
                                           config: { moneda, unidadDefecto,
                                             minimoDefecto, categorias[],
                                             unidades[] } }
negocios/{negocioId}/miembros/{email}    { email, nombre?, rol, creado }
negocios/{negocioId}/productos/{id}      { nombre, sku, categoria, unidad,
                                           stock, minimo, costo, precio, activo,
                                           foto? }

Storage:
negocios/{negocioId}/productos/{id}.jpg  foto del producto
negocios/{negocioId}/movimientos/{id}    { productoId, nombre, tipo, cantidad,
                                           costo?, motivo?, usuario, fecha, ts }
```

- Miembro con rol `operador`: trabaja con productos y movimientos. Ve la
  configuración del negocio, pero no la cambia.
- Miembro con rol `admin` (el dueño): además configura el negocio y da de alta
  o baja miembros, desde el ⚙ del encabezado.
- Super admin: crea y borra negocios, y puede todo en cualquiera. Al crear un
  negocio queda como miembro admin, si no nadie podría verlo.
- Costo y precio son opcionales: el producto que no los tenga cargados no los
  muestra en la lista, en vez de mostrar un importe en cero.
- La foto se achica en el navegador (lado más largo a 800px, JPEG) antes de
  subirla: desde el teléfono se saca en varios MB y para la lista alcanza con
  una miniatura.
- Los movimientos son histórico: se crean y no se editan. El stock del producto
  se corrige en la misma transacción que registra el movimiento, así dos cargas
  simultáneas no se pisan.

## Desarrollo

```bash
npm install
cp .env.example .env      # completar con los datos del proyecto Firebase

npm run emulators         # terminal 1: Auth + Firestore locales
npm run db:seed           # terminal 2 (una vez): datos de prueba
npm run dev:emulator      # terminal 2: la app apuntando al emulador
npm run test:rules        # comprueba firestore.rules contra el emulador
```

`npm run test:rules` arma un negocio de prueba y verifica quién puede hacer
qué: conviene correrlo después de tocar `firestore.rules` o `storage.rules`.

El seed da de alta un email como super admin y miembro de los dos negocios. Por
defecto es `demo@app-stock.test`; en el emulador el popup de Google deja entrar
con cualquier cuenta, así que conviene sembrar la que vayas a usar:

```bash
SEED_EMAIL=tu.cuenta@gmail.com npm run db:seed
```

`npm run dev` apunta a Firebase real: usarlo solo cuando haga falta.

## Puesta a punto del proyecto en Firebase

Una sola vez, desde la consola del proyecto (`stock-app-b7a37`):

1. **Authentication → Sign-in method**: habilitar el proveedor **Google**.
2. **Authentication → Settings → Authorized domains**: agregar el dominio donde
   se publique (`localhost` ya viene habilitado).
3. **Firestore** y **Storage**: crear la base de datos y el bucket.
4. Dar de alta el primer super admin a mano: colección `superAdmins`, documento
   con id igual al email, campo `email` con ese mismo valor. Es el único paso
   que se hace desde la consola: el super admin ya crea negocios con **+
   Negocio**, y cada dueño configura el suyo desde el ⚙ del encabezado.
5. Publicar reglas e índices:
   `firebase deploy --only firestore:rules,firestore:indexes,storage`.

## Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage
```
