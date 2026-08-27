import { useMemo, useState } from 'react'
import type { ConfigNegocio, Producto, ProductoNuevo } from '../types'
import { formatearImporte, importeOpcional, sinCargar } from '../formato'
import { estaBajoMinimo } from '../stock'
import { borrarProducto, crearProducto, editarProducto, guardarFotoProducto } from '../data/productos'
import { borrarFoto, subirFoto } from '../data/fotos'
import { registrarMovimiento, type AltaMovimiento } from '../data/movimientos'
import { FormProducto, type CambioFoto } from './FormProducto'
import { MenuAcciones } from './MenuAcciones'
import { TarjetaProducto } from './TarjetaProducto'
import { useEsMovil } from '../hooks/useEsMovil'
import { FormMovimiento } from './FormMovimiento'
import { FormPrecios } from './FormPrecios'
import { Modal } from './Modal'

interface Props {
  negocioId: string
  productos: Producto[]
  usuario: string
  config: ConfigNegocio
}

type Dialogo =
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; producto: Producto }
  | { tipo: 'movimiento'; producto: Producto; movimiento: 'entrada' | 'salida' }
  | { tipo: 'precios'; producto: Producto; cantidad: number }
  | { tipo: 'foto'; producto: Producto }
  | null

/**
 * Valores que algún producto está usando, para armar los filtros: la lista de
 * la configuración puede tener otros que no le pusieron a nada.
 */
function valoresEnUso(productos: Producto[], clave: 'categoria' | 'proveedor') {
  return [...new Set(productos.map((p) => p[clave]).filter((v): v is string => !!v))]
    .sort((a, b) => a.localeCompare(b, 'es'))
}

/**
 * Una entrada es "grande" si suma al menos la mitad de lo que ya había, o si el
 * producto estaba en cero: son los casos donde conviene mirar los precios.
 */
function esEntradaGrande(cantidad: number, stockPrevio: number) {
  return stockPrevio <= 0 || cantidad >= stockPrevio / 2
}

export function Productos({ negocioId, productos, usuario, config }: Props) {
  const esMovil = useEsMovil()
  const importe = formatearImporte
  // Costo y precio son opcionales: si no los cargaron, no se muestra la fila.
  const opcional = importeOpcional
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [soloFaltantes, setSoloFaltantes] = useState(false)
  // En el teléfono los filtros se pliegan: si no, la pantalla arranca con
  // cinco renglones de controles antes del primer producto.
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  const categorias = useMemo(() => valoresEnUso(productos, 'categoria'), [productos])
  const proveedores = useMemo(() => valoresEnUso(productos, 'proveedor'), [productos])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (soloFaltantes && !estaBajoMinimo(p)) return false
      if (categoria && p.categoria !== categoria) return false
      if (proveedor && p.proveedor !== proveedor) return false
      if (!texto) return true
      return (
        p.nombre.toLowerCase().includes(texto) ||
        (p.categoria ?? '').toLowerCase().includes(texto) ||
        (p.proveedor ?? '').toLowerCase().includes(texto)
      )
    })
  }, [productos, busqueda, soloFaltantes, categoria, proveedor])

  // Un producto sin costo cargado no aporta al valorizado, no lo arruina con NaN.
  const valorStock = productos.reduce((suma, p) => suma + (p.stock ?? 0) * (p.costo ?? 0), 0)

  async function guardar(datos: ProductoNuevo, foto: CambioFoto) {
    let id: string
    if (dialogo?.tipo === 'editar') {
      id = dialogo.producto.id
      // El stock no se escribe a mano: si lo corrigieron en la ficha, se
      // registra como ajuste para que quede en el histórico igual que el resto.
      const { stock, ...sinStock } = datos
      await editarProducto(negocioId, id, sinStock)
      if (stock !== (dialogo.producto.stock ?? 0)) {
        await registrarMovimiento(negocioId, {
          productoId: id,
          nombre: datos.nombre,
          tipo: 'ajuste',
          cantidad: stock,
          motivo: 'corrección desde la ficha',
          usuario,
        })
      }
    } else {
      // La foto se sube después de crear: recién ahí sabemos el id del producto.
      id = (await crearProducto(negocioId, datos)).id
    }

    if (foto.archivo) {
      await guardarFotoProducto(negocioId, id, await subirFoto(negocioId, id, foto.archivo))
    } else if (foto.quitar) {
      await borrarFoto(negocioId, id)
      await guardarFotoProducto(negocioId, id, null)
    }
    setDialogo(null)
  }

  async function mover(mov: AltaMovimiento) {
    const producto = dialogo?.tipo === 'movimiento' ? dialogo.producto : undefined
    await registrarMovimiento(negocioId, mov)

    // Después de una reposición grande suele haber cambiado el costo, así que
    // ofrecemos revisar los precios en vez de preguntarlo en cada entrada.
    if (producto && mov.tipo === 'entrada' && esEntradaGrande(mov.cantidad, producto.stock ?? 0)) {
      setDialogo({ tipo: 'precios', producto, cantidad: mov.cantidad })
      return
    }
    setDialogo(null)
  }

  async function guardarPrecios(datos: { costo: number; precio: number }) {
    if (dialogo?.tipo !== 'precios') return
    await editarProducto(negocioId, dialogo.producto.id, datos)
    setDialogo(null)
  }

  async function borrar(p: Producto) {
    if (!confirm(`¿Borrar "${p.nombre}"? Los movimientos quedan en el histórico.`)) return
    await borrarProducto(negocioId, p.id)
    // La foto se va con el producto; si falla no vale la pena frenar nada.
    borrarFoto(negocioId, p.id).catch(() => {})
  }

  const filtrosActivos = [categoria, proveedor, soloFaltantes ? 'bajo' : ''].filter(Boolean).length

  function limpiarFiltros() {
    setCategoria('')
    setProveedor('')
    setSoloFaltantes(false)
  }

  const filtros = (
    <>
      {categorias.length > 0 && (
        <select
          className="filtro"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {proveedores.length > 0 && (
        <select
          className="filtro"
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          aria-label="Filtrar por proveedor"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((pr) => <option key={pr} value={pr}>{pr}</option>)}
        </select>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={soloFaltantes}
          onChange={(e) => setSoloFaltantes(e.target.checked)}
        />
        Ver productos con stock bajo
      </label>
    </>
  )

  return (
    <section className="pantalla-productos">
      <div className="barra">
        <input
          placeholder="Buscar por nombre, categoría o proveedor"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button
          className={`secundario ${filtrosActivos ? 'con-filtros' : ''}`}
          onClick={() => setFiltrosAbiertos((v) => !v)}
          aria-expanded={filtrosAbiertos}
        >
          Filtros{filtrosActivos > 0 && ` (${filtrosActivos})`}
        </button>
        <button onClick={() => setDialogo({ tipo: 'nuevo' })}>Agregar producto</button>
      </div>

      {filtrosAbiertos && (
        <div className="panel-filtros">
          {filtros}
          {filtrosActivos > 0 && (
            <button className="enlace" onClick={limpiarFiltros}>Quitar filtros</button>
          )}
        </div>
      )}

      <p className="dato">
        {visibles.length === productos.length
          ? `${productos.length} productos`
          : `${visibles.length} de ${productos.length} productos`}
        {' · valorizado '}
        {importe(valorStock)}
        {visibles.length === productos.length ? '' : ' en total'}
      </p>

      {esMovil ? (
        <div className="lista-tarjetas">
          {visibles.map((p) => (
            <TarjetaProducto
              key={p.id}
              producto={p}
              onEntrada={() => setDialogo({ tipo: 'movimiento', producto: p, movimiento: 'entrada' })}
              onRetiro={() => setDialogo({ tipo: 'movimiento', producto: p, movimiento: 'salida' })}
              onEditar={() => setDialogo({ tipo: 'editar', producto: p })}
              onBorrar={() => borrar(p)}
              onVerFoto={() => setDialogo({ tipo: 'foto', producto: p })}
            />
          ))}
          {visibles.length === 0 && <p className="vacio">No hay productos que coincidan</p>}
        </div>
      ) : (
      <table className="tabla-tarjetas">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Stock</th>
              <th className="num">Mínimo</th>
              <th className="num">Costo</th>
              <th className="num">Precio</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id} className={estaBajoMinimo(p) ? 'alerta' : ''}>
                <td className="celda-principal">
                  <div className="producto-nombre">
                    {p.foto ? (
                      <button
                        className="miniatura-boton"
                        onClick={() => setDialogo({ tipo: 'foto', producto: p })}
                        title="Ver la foto más grande"
                        aria-label={`Ver la foto de ${p.nombre}`}
                      >
                        <img className="miniatura" src={p.foto} alt="" loading="lazy" />
                      </button>
                    ) : (
                      <div className="miniatura vacia" aria-hidden="true" />
                    )}
                    <div>
                      <strong>{p.nombre}</strong>
                      {p.categoria && <span className="tag">{p.categoria}</span>}
                      {!p.activo && <span className="tag gris">inactivo</span>}
                      {p.proveedor && <span className="proveedor">{p.proveedor}</span>}
                    </div>
                  </div>
                </td>
                <td className="num" data-label="Stock">{p.stock ?? 0}</td>
                <td className={`num ${sinCargar(p.minimo) ? 'vacio-dato' : ''}`} data-label="Mínimo">
                  {sinCargar(p.minimo) ? '—' : p.minimo}
                </td>
                <td className={`num ${opcional(p.costo) ? '' : 'vacio-dato'}`} data-label="Costo">
                  {opcional(p.costo) ?? '—'}
                </td>
                <td className={`num ${opcional(p.precio) ? '' : 'vacio-dato'}`} data-label="Precio">
                  {opcional(p.precio) ?? '—'}
                </td>
                <td className="celda-acciones">
                  <div className="acciones-fila">
                  <button onClick={() => setDialogo({ tipo: 'movimiento', producto: p, movimiento: 'entrada' })}>
                    + Entrada
                  </button>
                  <button
                    className="secundario"
                    onClick={() => setDialogo({ tipo: 'movimiento', producto: p, movimiento: 'salida' })}
                    disabled={(p.stock ?? 0) <= 0}
                    title={(p.stock ?? 0) <= 0 ? 'No hay stock para retirar' : undefined}
                  >
                    − Retirar
                  </button>
                  <MenuAcciones etiqueta={`Más acciones de ${p.nombre}`}>
                    <button onClick={() => setDialogo({ tipo: 'editar', producto: p })}>Editar</button>
                    <button className="peligro" onClick={() => borrar(p)}>Borrar</button>
                  </MenuAcciones>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={6} className="vacio-fila">No hay productos que coincidan</td></tr>
            )}
          </tbody>
        </table>
      )}

      {dialogo && (
        <Modal onCerrar={() => setDialogo(null)}>
          {dialogo.tipo === 'movimiento' ? (
            <FormMovimiento
              producto={dialogo.producto}
              tipo={dialogo.movimiento}
              usuario={usuario}
              onRegistrar={mover}
              onCancelar={() => setDialogo(null)}
            />
          ) : dialogo.tipo === 'foto' ? (
            <figure className="foto-grande">
              <img src={dialogo.producto.foto} alt={dialogo.producto.nombre} />
              <figcaption>{dialogo.producto.nombre}</figcaption>
              <div className="acciones">
                <button className="secundario" onClick={() => setDialogo(null)}>Cerrar</button>
              </div>
            </figure>
          ) : dialogo.tipo === 'precios' ? (
            <FormPrecios
              producto={dialogo.producto}
              cantidad={dialogo.cantidad}
              onGuardar={guardarPrecios}
              onCancelar={() => setDialogo(null)}
            />
          ) : (
            <FormProducto
              producto={dialogo.tipo === 'editar' ? dialogo.producto : undefined}
              config={config}
              onGuardar={guardar}
              onCancelar={() => setDialogo(null)}
            />
          )}
        </Modal>
      )}
    </section>
  )
}
