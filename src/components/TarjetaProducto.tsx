import type { ConfigNegocio, Producto } from '../types'
import { importeOpcional, sinCargar } from '../formato'
import { estaBajoMinimo } from '../stock'
import { MenuAcciones } from './MenuAcciones'

interface Props {
  producto: Producto
  config: ConfigNegocio
  onEntrada: () => void
  onRetiro: () => void
  onEditar: () => void
  onAjustar: () => void
  onBorrar: () => void
  onVerFoto: () => void
}

/**
 * Versión para el teléfono: el stock es lo que se viene a mirar, así que va
 * grande; la foto al costado, y el resto en una línea al pie.
 */
export function TarjetaProducto({
  producto: p,
  config,
  onEntrada,
  onRetiro,
  onEditar,
  onAjustar,
  onBorrar,
  onVerFoto,
}: Props) {
  const stock = p.stock ?? 0
  const bajoMinimo = estaBajoMinimo(p)
  const precio = importeOpcional(p.precio, config.moneda)

  return (
    <article className={`tarjeta-producto ${bajoMinimo ? 'alerta' : ''}`}>
      <div className="tp-datos">
        {/* Hasta dos líneas, y el alto se reserva aunque el nombre sea corto:
            si no, la tarjeta cambia de alto según el largo del nombre. */}
        <h3>{p.nombre}</h3>
        <p className="tp-stock">
          <strong>{stock}</strong> {p.unidad}
          <span className="tp-leyenda">en stock</span>
        </p>
        <p className="tp-detalle">
          {precio && <span>{precio}</span>}
          {!sinCargar(p.minimo) && (
            <span className={bajoMinimo ? 'negativo' : ''}>mín {p.minimo}</span>
          )}
          {!p.activo && <span>inactivo</span>}
        </p>
      </div>

      {/* El recuadro está siempre, tenga foto o no: si no, las tarjetas de la
          lista quedan de distinto alto. Sin foto, invita a cargarla. */}
      {p.foto ? (
        <button className="tp-foto" onClick={onVerFoto} aria-label={`Ver la foto de ${p.nombre}`}>
          <img src={p.foto} alt="" loading="lazy" />
        </button>
      ) : (
        <button className="tp-foto vacia" onClick={onEditar} aria-label={`Agregar una foto a ${p.nombre}`}>
          Sin foto
        </button>
      )}

      <div className="tp-acciones">
        <button onClick={onEntrada}>+ Entrada</button>
        <button
          className="secundario"
          onClick={onRetiro}
          disabled={stock <= 0}
          title={stock <= 0 ? 'No hay stock para retirar' : undefined}
        >
          − Retirar
        </button>
        <MenuAcciones etiqueta={`Más acciones de ${p.nombre}`}>
          <button onClick={onEditar}>Editar</button>
          <button onClick={onAjustar}>Ajustar stock</button>
          <button className="peligro" onClick={onBorrar}>Borrar</button>
        </MenuAcciones>
      </div>
    </article>
  )
}
