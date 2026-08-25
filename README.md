# app-stock

Control de stock multi-negocio: cada negocio tiene sus productos y su histórico
de movimientos, y un mismo usuario puede pertenecer a varios.

Stack: Vite + React 19 + TypeScript + Firebase (Auth con Google + Firestore).
Interfaz responsive (en el teléfono las tablas se muestran como tarjetas) con
tema claro y oscuro: arranca según el sistema y se cambia con el botón ☾/☀.

## Modelo de datos

```
superAdmins/{email}                      alta manual desde la consola
negocios/{negocioId}                     { nombre, rubro, activo, creado }
negocios/{negocioId}/miembros/{email}    { email, nombre?, rol, creado }
negocios/{negocioId}/productos/{id}      { nombre, sku, categoria, unidad,
                                           stock, minimo, costo, precio, activo }
negocios/{negocioId}/movimientos/{id}    { productoId, nombre, tipo, cantidad,
                                           costo?, motivo?, usuario, fecha, ts }
```

- Miembro de un negocio: puede todo dentro de ese negocio, menos dar de alta o
  baja miembros y borrar el negocio.
- Super admin: crea negocios y administra sus miembros.
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
```

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
3. **Firestore**: crear la base de datos.
4. Dar de alta el primer super admin a mano: colección `superAdmins`, documento
   con id igual al email, campo `email` con ese mismo valor. Desde ahí ya se
   pueden crear negocios y agregar miembros.
5. Publicar reglas e índices: `firebase deploy --only firestore:rules,firestore:indexes`.

## Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes
```
