# app-stock

Control de stock multi-negocio: cada negocio tiene sus productos y su histórico
de movimientos, y un mismo usuario puede pertenecer a varios.

Stack: Vite + React 19 + TypeScript + Firebase (Auth + Firestore).

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

El seed crea `demo@app-stock.test` / `123456` como miembro de dos negocios.

`npm run dev` apunta a Firebase real: usarlo solo cuando haga falta.

## Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes
```
