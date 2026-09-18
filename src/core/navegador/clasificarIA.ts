import { conversarIA } from '../chat/ia'
import { db } from '../data/db'

/**
 * Clasifica con la IA los sitios que el diccionario de fábrica no conoce. Un
 * lote de hasta 40 dominios por llamada (op de texto corto: 1 crédito); la
 * respuesta se valida contra las claves existentes y se marca `porIA` para que
 * el usuario sepa que puede corregirla. «otros» no se guarda: seguiría siendo
 * el valor por defecto.
 */
export async function clasificarSitiosIA(
  hosts: string[],
  categorias: { clave: string; nombre: string }[],
): Promise<number> {
  const lote = hosts.slice(0, 40)
  if (!lote.length) return 0
  const system = [
    'Clasificas dominios web en categorías de uso personal.',
    'Responde SOLO con un objeto JSON {"dominio": "clave"} (sin texto alrededor), usando exclusivamente estas claves:',
    categorias.map((c) => `${c.clave} = ${c.nombre}`).join('; '),
    'Si no conoces el dominio o dudas, usa "otros".',
  ].join('\n')
  const texto = await conversarIA(system, [{ rol: 'usuario', texto: JSON.stringify(lote) }], 600)
  const m = texto.match(/\{[\s\S]*\}/)
  if (!m) return 0
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(m[0]) as Record<string, unknown>
  } catch {
    return 0
  }
  const validas = new Set(categorias.map((c) => c.clave))
  let n = 0
  for (const host of lote) {
    const clave = obj[host]
    if (typeof clave !== 'string' || !validas.has(clave) || clave === 'otros') continue
    const s = await db.sitiosWeb.where('host').equals(host).first()
    if (s?.id == null) continue
    await db.sitiosWeb.update(s.id, { categoria: clave, porIA: true, actualizadoEn: new Date().toISOString() })
    n++
  }
  return n
}
