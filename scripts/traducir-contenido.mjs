/**
 * Traduce el CONTENIDO del año demo (la vida de Pep@) a los idiomas nuevos.
 *
 * El contenido no pasa por `dict.ts`: en cuanto se crea es dato del usuario, no
 * interfaz. Cada cuarto lo tiene en `demo.data.ts` con una rama por idioma, y
 * las ramas nuevas se escriben aparte, en `demo.data.i18n.ts`, que solo baja
 * quien esté en uno de esos idiomas (lo carga `ctx.textos`).
 *
 * QUÉ SE TRADUCE Y QUÉ NO: no hace falta adivinarlo ni listar campos. Un valor
 * es texto si el español y el inglés DIFIEREN; si coinciden es estructura
 * (`tipo: 'meditacion'`), un número (`dia: -302`) o un nombre propio («Piano»,
 * «Clair de Lune») y se copia tal cual. Las dos ramas que ya existen son, de
 * hecho, la especificación de qué es traducible.
 *
 * El texto es NARRATIVO y en primera persona, así que se pide adaptación
 * cultural, no traducción literal: la panadería de abajo y el bus que llega a
 * tiempo tienen que sonar creíbles en Curitiba, Lyon, Leipzig y Bolonia.
 *
 *   node scripts/traducir-contenido.mjs --dry
 *   node scripts/traducir-contenido.mjs --solo=fr
 *   node scripts/traducir-contenido.mjs --cuarto=jardin
 *   node scripts/traducir-contenido.mjs --forzar
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sistemaDe } from './traducir/glosario.mjs'
import { comillas, crearCliente, nuevoGasto, resumenGasto, traducirTextos } from './traducir/motor.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOMS = path.join(RAIZ, 'src', 'rooms')
const I18N = path.join(RAIZ, 'src', 'core', 'i18n')

const args = process.argv.slice(2)
const flag = (n) => args.some((a) => a === `--${n}`)
const valor = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

const DRY = flag('dry')
const FORZAR = flag('forzar')

const INSTRUCCION = `Traduce estos textos del año demo de MPH: son el diario de una persona
—notas de sus sesiones, recetas que cocinó, apuntes, recuerdos de viaje— en
primera persona y en tono coloquial, tal y como los habría escrito ella.

Adáptalos culturalmente en vez de calcarlos: los nombres propios, las comidas,
los lugares, las monedas y las unidades pueden y deben cambiar para que la vida
que cuentan resulte creíble en tu idioma. Lo que NO puede cambiar es lo que
pasó: si la nota dice que corrió 10 km y le dolió la rodilla, eso se mantiene.

Conserva la longitud aproximada y el registro: son notas rápidas, no redacciones.`

/**
 * Idiomas se queda fuera de la pasada automática: su contenido son TARJETAS de
 * vocabulario, y ahí la regla «es distinto de en, luego es traducible» miente.
 * En la rama española Pep@ aprende inglés (`termino: 'homesick'`) y en la
 * inglesa aprende español, así que las dos ramas difieren en los dos campos y
 * el traductor pondría el término a aprender en portugués: justo lo que no es.
 * Necesita su propia pasada, decidiendo antes qué idioma estudia cada Pep@.
 */
const FUERA = new Set(['idiomas'])

/** Los archivos de contenido y dónde va su traducción. */
function objetivos() {
  const salida = []
  for (const cuarto of readdirSync(ROOMS)) {
    if (FUERA.has(cuarto)) continue
    for (const base of ['demo.data', 'demo.recetas.data']) {
      const fuente = path.join(ROOMS, cuarto, `${base}.ts`)
      if (existsSync(fuente)) salida.push({ cuarto, base, fuente, destino: path.join(ROOMS, cuarto, `${base}.i18n.ts`) })
    }
  }
  return salida
}

// --- Recorrido de la pareja es/en ------------------------------------------

/**
 * Recoge los textos traducibles comparando las dos ramas. Devuelve rutas
 * (`notasSesion.3.nota`) para poder reconstruir el objeto después.
 */
function recogerTextos(es, en, ruta = [], salida = []) {
  if (typeof es === 'string') {
    if (typeof en === 'string' && es !== en) salida.push({ id: ruta.join('.'), es, en })
    return salida
  }
  if (Array.isArray(es)) {
    es.forEach((x, i) => recogerTextos(x, Array.isArray(en) ? en[i] : undefined, [...ruta, i], salida))
    return salida
  }
  if (es && typeof es === 'object') {
    for (const k of Object.keys(es)) recogerTextos(es[k], en?.[k], [...ruta, k], salida)
  }
  return salida
}

/** Copia la rama española poniendo cada traducción en su sitio. */
function reconstruir(es, traducciones, ruta = []) {
  if (typeof es === 'string') return traducciones.get(ruta.join('.')) ?? es
  if (Array.isArray(es)) return es.map((x, i) => reconstruir(x, traducciones, [...ruta, i]))
  if (es && typeof es === 'object') {
    return Object.fromEntries(Object.entries(es).map(([k, v]) => [k, reconstruir(v, traducciones, [...ruta, k])]))
  }
  return es
}

const CABECERA = (cuarto, base) => `/**
 * El año demo de ${cuarto} en los idiomas que NO viajan en \`${base}.ts\`
 * (donde están el español y el inglés). Vive aparte para que el chunk que ya
 * baja todo el mundo no engorde con seis idiomas de contenido: solo se
 * descarga si el usuario está en uno de estos.
 *
 * GENERADO por \`npm run traducir:contenido\` — no lo edites a mano.
 */`

// --- El manual de comandos --------------------------------------------------

const MANUAL_TSX = path.join(RAIZ, 'src', 'core', 'chat', 'ManualComandos.tsx')
const CADENA = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`
const desencomillar = (s) => s.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')

/**
 * Saca del componente los pares español/inglés que hay escritos en línea. No se
 * puede importar el módulo (es TSX y Node no traga JSX), así que se leen con
 * regex: cada campo busca su `en:` dentro del mismo literal, que va justo
 * detrás y en el mismo objeto.
 */
function extraerManual() {
  const texto = readFileSync(MANUAL_TSX, 'utf8')
  const pares = (campo) => {
    const re = new RegExp(String.raw`\b${campo}:\s*(${CADENA})([\s\S]{0,300}?)\ben:\s*(${CADENA})`, 'g')
    const salida = []
    const vistos = new Set()
    for (const m of texto.matchAll(re)) {
      const es = desencomillar(m[1])
      const en = desencomillar(m[3])
      if (es === en || vistos.has(es)) continue
      vistos.add(es)
      salida.push({ id: es, es, en })
    }
    return salida
  }
  // `teclasEn` va pegado a `teclas`, sin `en:` de por medio.
  const teclas = []
  const vistas = new Set()
  for (const m of texto.matchAll(new RegExp(String.raw`\bteclas:\s*(${CADENA}),\s*teclasEn:\s*(${CADENA})`, 'g'))) {
    const es = desencomillar(m[1])
    if (vistas.has(es)) continue
    vistas.add(es)
    teclas.push({ id: es, es, en: desencomillar(m[2]) })
  }
  return { frases: pares('frase'), atajos: pares('accion'), teclas }
}

const INSTRUCCION_MANUAL = `Traduce estas frases de EJEMPLO del manual de comandos: son lo que el usuario
le diría al chat de la app para que haga algo, escritas como las diría de viva
voz. Tienen que sonar a persona hablando, no a comando de terminal.

El marcado es load-bearing: los [corchetes] envuelven la ORDEN (el verbo y lo
que lo acompaña) y las {llaves} envuelven el DATO que el usuario cambiaría por
el suyo. Los dos tienen que seguir envolviendo lo mismo en la traducción,
aunque el orden de las palabras cambie.`

const INSTRUCCION_TECLAS = `Traduce estos nombres de TECLA como los llama el teclado en tu idioma
(Mayús → Shift/Umschalt/Maj según corresponda). Si en tu idioma la tecla se
llama igual que en el original, repite el original.`

const CABECERA_MANUAL = (nombre) => `/**
 * Las frases de ejemplo del manual de comandos en ${nombre}, indexadas por su
 * texto español de origen (ver \`manualI18n.ts\`).
 *
 * GENERADO por \`npm run traducir:contenido\` — no lo edites a mano.
 */`

async function traducirManual(cliente, destinos) {
  const grupos = extraerManual()
  console.log(
    `manual: ${grupos.frases.length} frases, ${grupos.atajos.length} atajos, ${grupos.teclas.length} teclas`,
  )
  if (DRY) return

  for (const id of destinos) {
    const destino = path.join(RAIZ, 'src', 'core', 'chat', `manual.${id}.ts`)
    const gasto = nuevoGasto()
    const sistema = sistemaDe(id)
    const frases = await traducirTextos(cliente, sistema, grupos.frases, gasto, { instruccion: INSTRUCCION_MANUAL })
    const atajos = await traducirTextos(cliente, sistema, grupos.atajos, gasto, { instruccion: INSTRUCCION_MANUAL })
    const teclas = await traducirTextos(cliente, sistema, grupos.teclas, gasto, { instruccion: INSTRUCCION_TECLAS })

    const bloque = (mapa) =>
      [...mapa].map(([es, traducido]) => `    ${comillas(es)}: ${comillas(traducido)},`).join('\n')
    const cuerpo = `import type { ManualTraducido } from './manualI18n'

${CABECERA_MANUAL(id)}
export const MANUAL_${id.toUpperCase()}: ManualTraducido = {
  frases: {
${bloque(frases)}
  },
  atajos: {
${bloque(atajos)}
  },
  teclas: {
${bloque(teclas)}
  },
}
`
    writeFileSync(destino, cuerpo, 'utf8')
    console.log(`  ${id}: ${frases.size}+${atajos.size}+${teclas.size} · ${resumenGasto(gasto)}`)
  }
}

async function main() {
  const { IDIOMAS, IDIOMA_BASE } = await import(pathToFileURL(path.join(I18N, 'idiomas.ts')))
  const soloIdioma = valor('solo')
  const soloCuarto = valor('cuarto')
  const que = valor('que') ?? 'todo'
  const destinos = IDIOMAS.map((i) => i.id)
    .filter((id) => id !== IDIOMA_BASE && id !== 'en')
    .filter((id) => !soloIdioma || id === soloIdioma)

  const cliente = DRY ? null : crearCliente(RAIZ)

  if (que === 'manual' || que === 'todo') await traducirManual(cliente, destinos)
  if (que === 'manual') return

  for (const obj of objetivos().filter((o) => !soloCuarto || o.cuarto === soloCuarto)) {
    const modulo = await import(pathToFileURL(obj.fuente))
    const simbolo = Object.keys(modulo).find((k) => modulo[k]?.es)
    if (!simbolo) {
      console.log(`· ${obj.cuarto}/${obj.base}: sin rama es, se salta`)
      continue
    }
    const catalogo = modulo[simbolo]
    const textos = recogerTextos(catalogo.es, catalogo.en)
    const chars = textos.reduce((a, t) => a + t.es.length, 0)

    const previas = !FORZAR && existsSync(obj.destino) ? ((await import(pathToFileURL(obj.destino))).default ?? {}) : {}
    const pendientes = destinos.filter((id) => !previas[id])

    console.log(
      `${obj.cuarto}/${obj.base}: ${textos.length} textos (${Math.round(chars / 1000)} KB)` +
        ` · faltan ${pendientes.length ? pendientes.join(', ') : '—'}`,
    )
    if (DRY || !pendientes.length) continue

    const ramas = { ...previas }
    for (const id of pendientes) {
      const gasto = nuevoGasto()
      const traducidos = await traducirTextos(cliente, sistemaDe(id), textos, gasto, { instruccion: INSTRUCCION })
      ramas[id] = reconstruir(catalogo.es, traducidos)
      console.log(`  ${id}: ${traducidos.size}/${textos.length} · ${resumenGasto(gasto)}`)
    }

    const cuerpo = `${CABECERA(obj.cuarto, obj.base)}\nexport default ${JSON.stringify(ramas, null, 2)}\n`
    writeFileSync(obj.destino, cuerpo, 'utf8')
  }
}

await main()
