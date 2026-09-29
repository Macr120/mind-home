import { conversarIA, extraerJSON } from '../chat/ia'
import { EFECTOS, ESTILOS, getEstilo, type EfectosConfig } from './estilos'
import { ESCENARIOS, TEMAS, esTemaFabrica, type EscenarioId, type Tema, type TemaLuz, type TemaNiebla } from './temas'
import { MATERIALES_MUEBLE, MATERIALES_MURO, esMaterialPbr } from './materialesPBR'
import { HDRIS, esHdri } from './EntornoIBL'

/**
 * «IA directora de arte»: a partir de una descripción libre («cabaña nórdica al
 * atardecer», «maqueta de arquitecto») la IA diseña un TEMA completo de la casa
 * —colores, cascarón, luz, niebla, estilo de render y efectos— que se guarda
 * como un tema más del usuario. Solo pide texto (1 crédito).
 */

const SYSTEM = [
  'Eres directora de arte de un juego de casa isométrica 3D con materiales sencillos (colores planos, sin texturas).',
  'A partir de la descripción del usuario diseñas un TEMA visual para toda la casa.',
  'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor, con esta forma:',
  '{"nombre":string,"icon":string,"base":string|null,"paleta":[hex,hex,hex,hex],"tinte":hex,"fuerza":number,',
  '"roughness":number,"metalness":number,"emissive":hex,"emissiveIntensity":number,"fondo":hex,',
  '"shell":{"muroInt":hex,"muroExt":hex,"piso":hex,"techo":hex},',
  '"texturas":{"muroInt":string,"muroExt":string,"mueble":string},',
  '"luz":{"sol":hex,"fuerzaSol":number,"intensidadSol":number,"ambiente":hex,"fuerzaAmbiente":number,"focos":hex,"ibl":number,"exposicion":number,"hdri":string},',
  '"niebla":{"color":hex,"near":number,"far":number}|null,',
  '"estilo":string,"efectos":{"<efecto>":{"on":boolean,"val":number}},"escenario":string|null}',
  'Reglas:',
  '- hex = color "#rrggbb". "nombre": 1 a 3 palabras en el idioma del usuario. "icon": UN solo emoji.',
  `- "base": el tema de fábrica más parecido para vestir al personaje y la interfaz (${TEMAS.map((t) => t.id).join(', ')}) o null si ninguno encaja.`,
  '- "tinte" se mezcla sobre el color de cada objeto con "fuerza" (0 a 1; 0.2-0.5 es lo habitual).',
  '- roughness, metalness, emissiveIntensity, fuerzaSol, fuerzaAmbiente e ibl van de 0 a 1; intensidadSol de 0 a 2; exposicion de 0.5 a 1.5.',
  '- Sin brillo propio: "emissive":"#000000" y "emissiveIntensity":0.',
  '- "shell" son los colores de muros interiores, fachada, piso y techo. "fondo" es el cielo de noche/fondo.',
  '- "niebla": near de 5 a 80 y far de 40 a 160 (far mayor que near); null si no aporta.',
  `- "estilo": uno de ${ESTILOS.map((e) => e.id).join(', ')}.`,
  `- "efectos": solo los que quieras encender, de: ${EFECTOS.map((e) => `${e.id} (${e.desc})`).join('; ')}. "val" de 0 a 1.`,
  `- "texturas" (solo se ven si el usuario activa el realismo): muros de ${MATERIALES_MURO.join(', ')}; muebles de ${MATERIALES_MUEBLE.join(', ')}.`,
  `- "luz.hdri": entorno de reflejos, uno de ${HDRIS.join(', ')}.`,
  `- "escenario": SOLO si la descripción pide que la casa viaje o vaya montada en algo (nave, avión, vehículo, animal gigante): uno de ${ESCENARIOS.join(', ')}; si no, null.`,
  '- Para un look realista: estilo "normal", oclusion y bloom suaves, colores naturales poco saturados, fuerza baja.',
].join('\n')

const HEX = /^#[0-9a-f]{6}$/i

function hex(v: unknown, def: string): string {
  return typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : def
}

function num(v: unknown, min: number, max: number, def: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** Toma el primer emoji del texto (la IA a veces añade palabras). */
function emoji(v: unknown): string {
  const m = typeof v === 'string' ? v.match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/u) : null
  return m?.[0] ?? '🎨'
}

/** Pide a la IA un tema a partir de la descripción. Lanza si la IA falla o la respuesta no sirve. */
export async function generarTemaIA(descripcion: string): Promise<Tema> {
  const respuesta = await conversarIA(SYSTEM, [{ rol: 'usuario', texto: descripcion }], 1200, { compartible: true })
  return temaDesdeJSON(extraerJSON(respuesta), descripcion)
}

/** Sanea la respuesta de la IA campo a campo y la convierte en un tema del usuario. */
export function temaDesdeJSON(j: Record<string, unknown>, descripcion: string): Tema {

  const shellJ = obj(j.shell)
  const luzJ = obj(j.luz)
  const tinte = hex(j.tinte, '')
  const piso = hex(shellJ.piso, '')
  // Sin tinte ni cascarón no hay tema que ver: mejor avisar que guardar uno vacío.
  if (!tinte || !piso) throw new Error('La IA no devolvió un tema usable')

  const texJ = obj(j.texturas)
  const deUso = (v: unknown, uso: 'muro.' | 'mueble.') => (esMaterialPbr(v) && v.startsWith(uso) ? v : undefined)
  const shell: Tema['shell'] = {
    muroInt: hex(shellJ.muroInt, '#d9d4cc'),
    muroExt: hex(shellJ.muroExt, '#b8b0a4'),
    piso,
    techo: hex(shellJ.techo, '#8a7d6c'),
    texturas: {
      muroInt: deUso(texJ.muroInt, 'muro.'),
      muroExt: deUso(texJ.muroExt, 'muro.'),
      mueble: deUso(texJ.mueble, 'mueble.'),
    },
  }
  const luz: TemaLuz = {
    sol: hex(luzJ.sol, '#fff4e0'),
    fuerzaSol: num(luzJ.fuerzaSol, 0, 1, 0.35),
    intensidadSol: num(luzJ.intensidadSol, 0, 2, 1),
    ambiente: hex(luzJ.ambiente, '#f0f0f0'),
    fuerzaAmbiente: num(luzJ.fuerzaAmbiente, 0, 1, 0.35),
    focos: hex(luzJ.focos, '#ffd9a0'),
    ibl: num(luzJ.ibl, 0, 1, 0.25),
    exposicion: num(luzJ.exposicion, 0.5, 1.5, 1),
    hdri: esHdri(luzJ.hdri) ? luzJ.hdri : undefined,
  }
  let niebla: TemaNiebla | undefined
  if (j.niebla) {
    const n = obj(j.niebla)
    const near = num(n.near, 5, 80, 40)
    niebla = { color: hex(n.color, shell.muroExt), near, far: Math.max(near + 10, num(n.far, 40, 160, 110)) }
  }
  const efectos: EfectosConfig = {}
  for (const [id, v] of Object.entries(obj(j.efectos))) {
    if (!EFECTOS.some((e) => e.id === id)) continue
    const e = obj(v)
    efectos[id as keyof EfectosConfig] = { on: e.on !== false, val: num(e.val, 0, 1, 0.5) }
  }
  const paleta = (Array.isArray(j.paleta) ? j.paleta : [])
    .map((c) => hex(c, ''))
    .filter(Boolean)
    .slice(0, 5)

  const nombre = typeof j.nombre === 'string' && j.nombre.trim() ? j.nombre.trim().slice(0, 30) : descripcion.slice(0, 30)
  return {
    id: `u_${crypto.randomUUID().slice(0, 8)}`,
    nombre,
    icon: emoji(j.icon),
    paleta: paleta.length >= 2 ? paleta : [tinte, shell.muroInt, shell.piso, shell.techo],
    tinte,
    fuerza: num(j.fuerza, 0, 1, 0.35),
    roughness: num(j.roughness, 0, 1, 0.7),
    metalness: num(j.metalness, 0, 1, 0.05),
    emissive: hex(j.emissive, '#000000'),
    emissiveIntensity: num(j.emissiveIntensity, 0, 1, 0),
    fondo: hex(j.fondo, '#101418'),
    shell,
    luz,
    niebla,
    estilo: getEstilo(typeof j.estilo === 'string' ? j.estilo : null),
    efectosConfig: efectos,
    base: typeof j.base === 'string' && esTemaFabrica(j.base) ? j.base : null,
    escenario: ESCENARIOS.includes(j.escenario as EscenarioId) ? (j.escenario as EscenarioId) : undefined,
  }
}
