import { WebIO, type Document } from '@gltf-transform/core'
import { KHRMeshQuantization } from '@gltf-transform/extensions'
import { weld, simplify, dedup, prune, quantize } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'

/** Presupuesto de triángulos: por encima de esto se decima la malla. */
const LIMITE_TRIS = 150_000

/** Cuenta los triángulos de todas las mallas del documento. */
function contarTris(doc: Document): number {
  let t = 0
  for (const m of doc.getRoot().listMeshes()) {
    for (const p of m.listPrimitives()) {
      const idx = p.getIndices()
      const pos = p.getAttribute('POSITION')
      t += (idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3
    }
  }
  return Math.round(t)
}

/**
 * Optimiza un `.glb` subido para que pese poco y se renderice: decima la malla a
 * un presupuesto de triángulos (meshoptimizer), limpia nodos/datos sobrantes y
 * cuantiza los atributos (KHR_mesh_quantization, soportado por three). Los modelos
 * generados por IA (Hitem3d y similares) suelen traer millones de triángulos y
 * decenas de MB, y por eso no cargan. Todo corre en el navegador, sin servicios.
 */
export async function optimizarGlb(entrada: Blob): Promise<Blob> {
  const io = new WebIO().registerExtensions([KHRMeshQuantization])
  const doc = await io.readBinary(new Uint8Array(await entrada.arrayBuffer()))
  await MeshoptSimplifier.ready
  const tris = contarTris(doc)
  const ratio = tris > LIMITE_TRIS ? LIMITE_TRIS / tris : 1
  await doc.transform(
    weld(),
    ...(ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001 })] : []),
    prune(),
    dedup(),
    quantize(),
  )
  const out = await io.writeBinary(doc)
  return new Blob([out], { type: 'model/gltf-binary' })
}
