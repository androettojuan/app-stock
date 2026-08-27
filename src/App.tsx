import { useEffect, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTema } from './hooks/useTema'
import { useEsMovil } from './hooks/useEsMovil'
import { configDe, escucharNegocio, negociosDelUsuario } from './data/negocios'
import { crearNegocio, esSuperAdmin } from './data/admin'
import { escucharProductos } from './data/productos'
import { escucharMovimientos } from './data/movimientos'
import { Login } from './components/Login'
import { SelectorNegocio } from './components/SelectorNegocio'
import { Productos } from './components/Productos'
import { Movimientos } from './components/Movimientos'
import { Configuracion } from './components/Configuracion'
import { MenuUsuario } from './components/MenuUsuario'
import {
  IconoCambiar,
  IconoEngranaje,
  IconoHistorial,
  IconoLuna,
  IconoMas,
  IconoSalir,
  IconoSol,
} from './components/iconos'
import { FormNegocio } from './components/FormNegocio'
import { Modal } from './components/Modal'
import { usaEmulador } from './firebase/config'
import type { Movimiento, Negocio, Producto } from './types'

const CLAVE_NEGOCIO = 'stockia:negocio'
/** Se llamaba app-stock: se lee una vez para no perder el negocio elegido. */
const CLAVE_NEGOCIO_VIEJA = 'app-stock:negocio'

/** Productos es el día a día; a las otras dos se entra desde el menú. */
type Vista = 'productos' | 'movimientos' | 'configuracion'

export default function App() {
  const { usuario, cargando, entrar, salir } = useAuth()
  const { tema, alternar } = useTema()
  // En la computadora entran las solapas de siempre; en el teléfono no, y
  // Movimientos se pasa al menú.
  const esMovil = useEsMovil()
  const [negocios, setNegocios] = useState<Negocio[] | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [vista, setVista] = useState<Vista>('productos')
  // La configuración avisa si hay cambios sin guardar, así que le preguntamos a
  // ella antes de sacarla del medio, y recordamos adónde iba el usuario.
  const salirDeConfig = useRef(() => setVista('productos'))
  const destino = useRef<Vista>('productos')
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
        const guardado =
          localStorage.getItem(CLAVE_NEGOCIO) ?? localStorage.getItem(CLAVE_NEGOCIO_VIEJA)
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
    setVista('productos')
    setCreandoNegocio(false)
  }

  function irA(destinoNuevo: Vista) {
    if (vista === 'configuracion' && destinoNuevo !== 'configuracion') {
      destino.current = destinoNuevo
      salirDeConfig.current()
    } else {
      setVista(destinoNuevo)
    }
  }

  function cambiarNegocio() {
    setVista('productos')
    localStorage.removeItem(CLAVE_NEGOCIO)
    setNegocio(null)
    setProductos([])
    setMovimientos([])
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>{negocio?.nombre ?? 'Stockia'}</h1>
          {usaEmulador && <span className="tag emulador">emulador</span>}
        </div>
        <MenuUsuario email={usuario.email ?? ''}>
          {negocio && (
            <button
              className={`secundario icono ${vista === 'configuracion' ? 'activo' : ''}`}
              onClick={() => irA(vista === 'configuracion' ? 'productos' : 'configuracion')}
              title="Configuración del negocio"
              aria-label="Configuración del negocio"
              aria-pressed={vista === 'configuracion'}
            >
              <IconoEngranaje /><span className="etiqueta">Configuración</span>
            </button>
          )}
          <button
            className="secundario icono"
            onClick={alternar}
            title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
            <span className="etiqueta">{tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
          {/* El alta va acá y no solo en el selector: con un negocio único no
              se pasa por esa pantalla y no habría por dónde crear otro. */}
          {negocio && esMovil && (
            <button
              className="secundario"
              onClick={() => irA(vista === 'movimientos' ? 'productos' : 'movimientos')}
            >
              <span className="solo-menu"><IconoHistorial /></span>
              {vista === 'movimientos' ? 'Productos' : 'Movimientos'}
            </button>
          )}
          {superAdmin && (
            <button className="secundario" onClick={() => setCreandoNegocio(true)}>
              <span className="solo-menu"><IconoMas /></span>Agregar negocio
            </button>
          )}
          {negocio && negocios && negocios.length > 1 && (
            <button className="secundario" onClick={cambiarNegocio}>
              <span className="solo-menu"><IconoCambiar /></span>Cambiar negocio
            </button>
          )}
          <button className="secundario" onClick={salir}>
            <span className="solo-menu"><IconoSalir /></span>Salir
          </button>
        </MenuUsuario>
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
      ) : vista === 'configuracion' ? (
        <main>
          <Configuracion
            negocio={negocio}
            usuario={usuario.email ?? ''}
            puedeEditar={negocio.rol === 'admin' || superAdmin}
            onVolver={() => setVista(destino.current)}
            registrarSalida={(fn) => { salirDeConfig.current = fn }}
          />
        </main>
      ) : (
        <main>
          {!esMovil && (
            <nav className="tabs">
              <button
                className={vista === 'productos' ? 'activo' : ''}
                onClick={() => setVista('productos')}
              >
                Productos
              </button>
              <button
                className={vista === 'movimientos' ? 'activo' : ''}
                onClick={() => setVista('movimientos')}
              >
                Movimientos
              </button>
            </nav>
          )}

          {vista === 'movimientos' ? (
            <>
              {/* En el teléfono no hay solapas: hace falta el título y la salida. */}
              {esMovil && (
                <div className="encabezado-pantalla">
                  <h2>Movimientos</h2>
                  <button className="secundario" onClick={() => setVista('productos')}>
                    Volver al stock
                  </button>
                </div>
              )}
              <Movimientos movimientos={movimientos} />
            </>
          ) : (
            <Productos
              negocioId={negocio.id}
              productos={productos}
              usuario={usuario.email ?? ''}
              config={configDe(negocio)}
            />
          )}
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
