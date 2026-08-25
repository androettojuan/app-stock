import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTema } from './hooks/useTema'
import { configDe, escucharNegocio, negociosDelUsuario } from './data/negocios'
import { crearNegocio, esSuperAdmin } from './data/admin'
import { escucharProductos } from './data/productos'
import { escucharMovimientos } from './data/movimientos'
import { Login } from './components/Login'
import { SelectorNegocio } from './components/SelectorNegocio'
import { Productos } from './components/Productos'
import { Movimientos } from './components/Movimientos'
import { Configuracion } from './components/Configuracion'
import { FormNegocio } from './components/FormNegocio'
import { Modal } from './components/Modal'
import { usaEmulador } from './firebase/config'
import type { Movimiento, Negocio, Producto } from './types'

const CLAVE_NEGOCIO = 'app-stock:negocio'

type Solapa = 'productos' | 'movimientos'

export default function App() {
  const { usuario, cargando, entrar, salir } = useAuth()
  const { tema, alternar } = useTema()
  const [negocios, setNegocios] = useState<Negocio[] | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [solapa, setSolapa] = useState<Solapa>('productos')
  // La configuración es una pantalla aparte, no una solapa más del día a día.
  const [enConfig, setEnConfig] = useState(false)
  const [superAdmin, setSuperAdmin] = useState(false)
  const [creandoNegocio, setCreandoNegocio] = useState(false)
  const [error, setError] = useState('')

  // Al entrar, buscamos en qué negocios está el usuario y recordamos el último.
  useEffect(() => {
    if (!usuario?.email) {
      setNegocios(null)
      setNegocio(null)
      setSuperAdmin(false)
      return
    }
    let vigente = true
    const email = usuario.email
    esSuperAdmin(email).then((es) => vigente && setSuperAdmin(es))
    negociosDelUsuario(email)
      .then((lista) => {
        if (!vigente) return
        setNegocios(lista)
        const guardado = localStorage.getItem(CLAVE_NEGOCIO)
        const elegido = lista.find((n) => n.id === guardado)
        if (elegido) setNegocio(elegido)
        else if (lista.length === 1) setNegocio(lista[0])
      })
      .catch(() => vigente && setError('No se pudieron cargar los negocios'))
    return () => { vigente = false }
  }, [usuario])

  const negocioId = negocio?.id
  useEffect(() => {
    if (!negocioId) return
    const id = negocioId
    localStorage.setItem(CLAVE_NEGOCIO, id)
    const corta = [
      escucharProductos(id, setProductos, () => setError('No se pudieron leer los productos')),
      escucharMovimientos(id, setMovimientos, () => setError('No se pudieron leer los movimientos')),
      escucharNegocio(id, (datos) => {
        setNegocio((actual) => (actual && actual.id === id ? { ...actual, ...datos } : actual))
      }),
    ]
    return () => corta.forEach((f) => f())
  }, [negocioId])

  if (cargando) return <div className="cargando">Cargando…</div>
  if (!usuario) return <Login entrar={entrar} tema={tema} onCambiarTema={alternar} />

  async function altaNegocio(datos: { nombre: string; rubro?: string }) {
    const email = usuario?.email
    if (!email) return
    const id = await crearNegocio(datos, email)
    const nuevo = { id, nombre: datos.nombre, rubro: datos.rubro, activo: true, rol: 'admin' as const }
    setNegocios((lista) => [...(lista ?? []), nuevo])
    setNegocio(nuevo)
    setSolapa('productos')
    setEnConfig(false)
    setCreandoNegocio(false)
  }

  function cambiarNegocio() {
    setEnConfig(false)
    localStorage.removeItem(CLAVE_NEGOCIO)
    setNegocio(null)
    setProductos([])
    setMovimientos([])
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>{negocio?.nombre ?? 'app-stock'}</h1>
          {usaEmulador && <span className="tag emulador">emulador</span>}
        </div>
        <div className="header-acciones">
          <span className="dato email">{usuario.email}</span>
          {negocio && (
            <button
              className={`secundario icono ${enConfig ? 'activo' : ''}`}
              onClick={() => setEnConfig((v) => !v)}
              title="Configuración del negocio"
              aria-label="Configuración del negocio"
              aria-pressed={enConfig}
            >
              ⚙
            </button>
          )}
          <button
            className="secundario icono"
            onClick={alternar}
            title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {tema === 'oscuro' ? '☀' : '☾'}
          </button>
          {negocio && negocios && negocios.length > 1 && (
            <button className="secundario" onClick={cambiarNegocio}>Cambiar negocio</button>
          )}
          <button className="secundario" onClick={salir}>Salir</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {!negocio ? (
        negocios === null
          ? <div className="cargando">Buscando tus negocios…</div>
          : (
            <SelectorNegocio
              negocios={negocios}
              onElegir={setNegocio}
              puedeCrear={superAdmin}
              onCrear={() => setCreandoNegocio(true)}
            />
          )
      ) : enConfig ? (
        <main>
          <div className="config-encabezado">
            <h2>Configuración</h2>
            <button className="secundario" onClick={() => setEnConfig(false)}>Volver al stock</button>
          </div>
          <Configuracion
            negocio={negocio}
            usuario={usuario.email ?? ''}
            puedeEditar={negocio.rol === 'admin' || superAdmin}
          />
        </main>
      ) : (
        <main>
          <nav className="tabs">
            <button className={solapa === 'productos' ? 'activo' : ''} onClick={() => setSolapa('productos')}>
              Productos
            </button>
            <button className={solapa === 'movimientos' ? 'activo' : ''} onClick={() => setSolapa('movimientos')}>
              Movimientos
            </button>
          </nav>
          {solapa === 'productos' && (
            <Productos
              negocioId={negocio.id}
              productos={productos}
              usuario={usuario.email ?? ''}
              config={configDe(negocio)}
            />
          )}
          {solapa === 'movimientos' && <Movimientos movimientos={movimientos} />}
        </main>
      )}

      {creandoNegocio && (
        <Modal onCerrar={() => setCreandoNegocio(false)}>
          <FormNegocio onGuardar={altaNegocio} onCancelar={() => setCreandoNegocio(false)} />
        </Modal>
      )}
    </div>
  )
}
