# Stockia

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
- Las reglas de Storage solo exigen sesión iniciada, tamaño y que sea imagen:
  no pueden consultar Firestore, así que no hay forma de verificar ahí la
  membresía. Lo que resguarda las fotos es que su ruta lleva dos ids aleatorios
  que no se pueden listar; los datos del negocio siguen protegidos por
  `firestore.rules`.
- Desde el teléfono la foto se puede sacar en el momento con la cámara o
  elegir de la galería; en la computadora se elige el archivo. Se achica en el
  navegador (lado más largo a 800px, JPEG) antes de subirla, respetando la
  orientación con que se sacó. Se ve al costado de la
  tarjeta o como miniatura en la tabla, y tocarla la abre en grande.
- El teléfono no muestra la tabla achicada sino su propia tarjeta, con el
  stock grande y la foto al costado. Costo y mínimo quedan para la ficha del
  producto: en la lista pesan más de lo que aportan.
- En la lista, cada producto tiene **+ Entrada** y **− Retirar**, que es lo del
  día a día. Editar, ajustar stock y borrar viven en el menú «⋯», para que
  borrar no quede al lado de lo que se toca a cada rato.
- La entrada no pregunta el costo: se guarda el que tiene el producto. Después
  de una entrada grande (la que suma al menos la mitad del stock que había, o
  cualquiera sobre un producto en cero) se ofrece revisar costo y precio, que
  es cuando de verdad suelen cambiar.
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
npm run test:rules            # firestore.rules contra el emulador
npm run test:rules:storage    # storage.rules contra el motor real de Firebase
```

`npm run test:rules` arma un negocio de prueba y verifica quién puede hacer qué.

`npm run test:rules:storage` va aparte y no usa el emulador a propósito: el
emulador de Storage acepta funciones que el servicio real no tiene (`firestore.
exists`, por ejemplo), así que daba por buenas reglas que en producción
rechazaban todas las subidas. Evalúa el archivo con la API de Firebase Rules,
la misma que corre en producción, sin subir ni tocar nada.

El seed da de alta un email como super admin y miembro de los dos negocios. Por
defecto es `demo@stockia.test`; en el emulador el popup de Google deja entrar
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
4. Dar de alta el primer super admin. Desde el proyecto:

   ```bash
   npm run superadmin -- alguien@gmail.com        # alta
   npm run superadmin -- alguien@gmail.com --baja # baja
   npm run superadmin                             # ver quiénes son
   ```

   O a mano en la consola: colección `superAdmins`, documento con id igual al
   email y un campo `email` con ese mismo valor. Es lo único que no se hace
   desde la app —las reglas prohíben escribir esa colección, que es la llave
   para crear negocios—. Con eso ya se crean negocios con **+ Negocio**, y cada
   dueño configura el suyo desde el ⚙ del encabezado.
5. Publicar reglas e índices:
   `firebase deploy --only firestore:rules,firestore:indexes,storage`.

## Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage
```
