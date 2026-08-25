import { useMemo, useState } from 'react'
import type { ConfigNegocio, Producto, ProductoNuevo } from '../types'
import { formatearImporte } from '../formato'
import { borrarProducto, crearProducto, editarProducto } from '../data/productos'
import { registrarMovimiento, type AltaMovimiento } from '../data/movimientos'
import { FormProducto } from './FormProducto'
import { FormMovimiento } from './FormMovimiento'
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
  | { tipo: 'movimiento'; producto: Producto }
  | null

export function Productos({ negocioId, productos, usuario, config }: Props) {
  const importe = (v: number) => formatearImporte(v, config.moneda)
  const [busqueda, setBusqueda] = useState('')
  const [soloFaltantes, setSoloFaltantes] = useState(false)
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (soloFaltantes && p.stock > p.minimo) return false
      if (!texto) return true
      return (
        p.nombre.toLowerCase().includes(texto) ||
        (p.sku ?? '').toLowerCase().includes(texto) ||
        (p.categoria ?? '').toLowerCase().includes(texto)
      )
    })
  }, [productos, busqueda, soloFaltantes])

  const valorStock = productos.reduce((suma, p) => suma + p.stock * p.costo, 0)

  async function guardar(datos: ProductoNuevo) {
    if (dialogo?.tipo === 'editar') {
      await editarProducto(negocioId, dialogo.producto.id, datos)
    } else {
      await crearProducto(negocioId, datos)
    }
    setDialogo(null)
  }

  async function mover(mov: AltaMovimiento) {
    await registrarMovimiento(negocioId, mov)
    setDialogo(null)
  }

  async function borrar(p: Producto) {
    if (!confirm(`¿Borrar "${p.nombre}"? Los movimientos quedan en el histórico.`)) return
    await borrarProducto(negocioId, p.id)
  }

  return (
    <section>
      <div className="barra">
        <input
          placeholder="Buscar por nombre, SKU o categoría"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={soloFaltantes}
            onChange={(e) => setSoloFaltantes(e.target.checked)}
          />
          Bajo mínimo
        </label>
        <button onClick={() => setDialogo({ tipo: 'nuevo' })}>+ Producto</button>
      </div>

      <p className="dato">
        {productos.length} productos · valorizado {importe(valorStock)}
      </p>

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
            <tr key={p.id} className={p.stock <= p.minimo ? 'alerta' : ''}>
              <td className="celda-principal">
                <strong>{p.nombre}</strong>
                {p.categoria && <span className="tag">{p.categoria}</span>}
                {!p.activo && <span className="tag gris">inactivo</span>}
              </td>
              <td className="num" data-label="Stock">{p.stock} {p.unidad}</td>
              <td className="num" data-label="Mínimo">{p.minimo}</td>
              <td className="num" data-label="Costo">{importe(p.costo)}</td>
              <td className="num" data-label="Precio">{importe(p.precio)}</td>
              <td className="acciones-fila">
                <button onClick={() => setDialogo({ tipo: 'movimiento', producto: p })}>Mover</button>
                <button className="secundario" onClick={() => setDialogo({ tipo: 'editar', producto: p })}>Editar</button>
                <button className="secundario" onClick={() => borrar(p)}>Borrar</button>
              </td>
            </tr>
          ))}
          {visibles.length === 0 && (
            <tr><td colSpan={6} className="vacio-fila">No hay productos que coincidan</td></tr>
          )}
        </tbody>
      </table>

      {dialogo && (
        <Modal onCerrar={() => setDialogo(null)}>
          {dialogo.tipo === 'movimiento' ? (
            <FormMovimiento
              producto={dialogo.producto}
              moneda={config.moneda}
              usuario={usuario}
              onRegistrar={mover}
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
