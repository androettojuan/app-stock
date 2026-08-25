import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase/config'

const LADO_MAXIMO = 800
const CALIDAD = 0.8

const fotoRef = (negocioId: string, productoId: string) =>
  ref(storage, `negocios/${negocioId}/productos/${productoId}.jpg`)

/**
 * Achica la foto antes de subirla: una cámara de teléfono saca varios MB y para
 * una miniatura de producto alcanza con el lado más largo en 800px.
 */
export async function achicar(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((listo) =>
    lienzo.toBlob(listo, 'image/jpeg', CALIDAD),
  )
  if (!blob) throw new Error('No se pudo procesar la imagen')
  return blob
}

/** Sube la foto del producto y devuelve la URL para guardar en el documento. */
export async function subirFoto(negocioId: string, productoId: string, archivo: File) {
  const blob = await achicar(archivo)
  const destino = fotoRef(negocioId, productoId)
  await uploadBytes(destino, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(destino)
}

/** Borra la foto. Que no exista no es un error: el producto simplemente no tenía. */
export async function borrarFoto(negocioId: string, productoId: string) {
  try {
    await deleteObject(fotoRef(negocioId, productoId))
  } catch (e) {
    if ((e as { code?: string }).code !== 'storage/object-not-found') throw e
  }
}
