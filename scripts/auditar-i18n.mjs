/**
 * Auditoría de traducción: lo que `verificar-i18n.mjs` NO ve (ver
 * docs/AUDITORIA-TRADUCCION-2026-10.md, «Puntos ciegos»). El verificador cruza
 * las claves LITERALES de `t()` con los diccionarios; aquí se miran las otras
 * vías por las que un texto acaba en español (o en inglés) en los 15 idiomas:
 *
 *   1. Claves guardadas en DATOS (`clave:`, `labelKey:`, `dondeClave:`…) que
 *      luego pasan por `t()`: cada una debe existir en el inglés y en los 15.
 *   2. Familias dinámicas `t(\`prefijo.${id}\`)`: el verificador las da por
 *      buenas con UNA clave del prefijo. Aquí se cuenta la familia entera por
 *      idioma y, si el catálogo del que sale `id` se resuelve estáticamente,
 *      se exige una clave por cada id.
 *   3. Objetos por idioma (`PorIdioma`, `{ es, en }`) con solo algunos idiomas:
 *      el resto cae al inglés en silencio.
 *   4. Texto visible fuera de `t()` en JSX (INFORME: no falla).
 *
 *   node scripts/auditar-i18n.mjs
 *   node scripts/auditar-i18n.mjs --seccion=1,2
 *   node scripts/auditar-i18n.mjs --json            (hallazgos en JSON por stdout)
 *   node scripts/auditar-i18n.mjs --json=salida.json
 *   node scripts/auditar-i18n.mjs --muestras=80     (muestras de la sección 4)
 *
 * Sale con código 1 si hay errores en las secciones 1-3.
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const I18N = path.join(RAIZ, 'src', 'core', 'i18n')
const ts = createRequire(path.join(RAIZ, 'package.json'))('typescript')

const args = process.argv.slice(2)
const argSeccion = args.find((a) => a.startsWith('--seccion='))?.split('=')[1]
const SECCIONES = new Set(argSeccion ? argSeccion.split(',').map(Number) : [1, 2, 3, 4])
const argJson = args.find((a) => a === '--json' || a.startsWith('--json='))
const rutaJson = argJson?.includes('=') ? argJson.split('=')[1] : null
const MUESTRAS = Number(args.find((a) => a.startsWith('--muestras='))?.split('=')[1] ?? 40)
/** Con `--json` a secas el JSON va por stdout y el texto se calla. */
const log = argJson && !rutaJson ? () => {} : (...a) => console.log(...a)

// =============================================================================
// LISTAS BLANCAS (cada entrada con su motivo)
// =============================================================================

/**
 * Archivos cuyos `clave:` NO son claves de `dict.ts` sino de otro diccionario.
 */
const ARCHIVOS_CLAVE_AJENA = {
  'src/core/ui/queEs/laminas.ts': 'las claves (`ia.cap.*`, `car.*`, `cifras.*`) son de los textos de la WEB pública (`textos` que recibe `construirLaminas`), no de dict.ts',
}

/**
 * Familias dinámicas que se aceptan incompletas: la plantilla tal como sale en
 * el informe (`${…}` en el hueco) → por qué no hace falta la clave de cada id.
 */
const FAMILIAS_INCOMPLETAS_ACEPTADAS = {
  'room.${…}.sub':
    'solo se pinta si un cuarto tiene por id el de la app; los cuartos nuevos llevan id generado (`cuarto-…`), así que los ids sin `.sub` no se ven (auditoría oct 2026, 1.4)',
}

/**
 * Objetos por idioma incompletos A PROPÓSITO. Clave: archivo; valor: motivo y,
 * opcionalmente, `decl` = nombre de la declaración/propiedad que lo contiene
 * (si falta, vale para todo el archivo).
 */
const POR_IDIOMA_PERMITIDOS = [
  {
    archivo: 'src/core/partida/juegosInvitables.ts',
    decl: 'JUEGOS_INVITABLES',
    motivo: '`es` es el respaldo de `t(def.clave)` y `en` el nombre de la orden que entiende el parser del chat (las órdenes de Amigos solo existen en es/en)',
  },
  {
    archivo: 'src/rooms/entretenimiento/juegos/ahorcado.palabras.ts',
    decl: 'BANCOS_AHORCADO',
    motivo: 'solo escrituras alfabéticas: ja/zh/ko/hi/ar caen al inglés A PROPÓSITO (adivinar letra a letra no funciona en ellas; decisión del glosario)',
  },
  {
    archivo: 'src/rooms/video/promo.data.ts',
    decl: 'calendarios',
    motivo: 'duraciones de los calendarios GRABADOS (datos de archivos de `public/promo/`), no texto',
  },
  {
    archivo: 'src/rooms/video/promo.data.ts',
    decl: 'PROMO_NOMBRES',
    motivo: 'se elige por el juego de clips GRABADO (es|en, `plan.clips`), no por el idioma de la interfaz',
  },
]

/**
 * Palabras que se quedan igual en todos los idiomas (sección 4): marcas,
 * siglas y unidades. NUNCA «XP» ni «Lv»: se traducen (ver memoria de la
 * auditoría i18n). Los endónimos de los idiomas se añaden solos desde idiomas.ts.
 */
const PALABRAS_FIJAS = new Set(
  (
    'MindHaOS MPH Nissan Google Apple YouTube TikTok Instagram Facebook Meta WhatsApp Telegram Spotify Discord GitHub ' +
    'OpenAI ChatGPT Claude Anthropic Gemini Ollama Llama Mistral DeepSeek Grok Supabase Stripe PayPal RevenueCat Cloudflare ' +
    'HERE Leaflet OpenStreetMap Wikipedia Windows Android iOS macOS Linux Chrome Safari Firefox Edge Electron Capacitor ' +
    'Play Store App Microsoft Remotion Three.js React TipTap Yjs KaTeX Mermaid Excel Word PowerPoint Markdown Lofi ' +
    'MIDI GIF PNG JPG JPEG WEBP SVG PDF CSV JSON MP3 MP4 WAV OGG WEBM ZIP URL API SDK AI AR VR RA 2D 3D HD 4K FPS ' +
    'BPM Hz kHz dB km kg cm mm ms px kcal OK ID PIN QR USB RGB HEX HSL CMYK DJ FX EQ LFO ADSR VU BMI IMC ISBN DOI ' +
    'PRO Pro Plus Free MCER A1 A2 B1 B2 C1 C2 UTC GMT AM PM KB MB GB TB mg ml CPU RAM GPU RPE VS Ctrl Shift Alt Cmd Esc Enter Tab Aa Jev'
  ).split(/\s+/),
)

// =============================================================================
// Carga de diccionarios y fuentes (misma forma que verificar-i18n.mjs)
// =============================================================================

async function leer(archivo, simbolo) {
  const ruta = path.join(I18N, archivo)
  if (!existsSync(ruta)) return null
  return (await import(pathToFileURL(ruta)))[simbolo] ?? {}
}

function* archivosFuente(dir) {
  for (const entrada of readdirSync(dir)) {
    const p = path.join(dir, entrada)
    if (statSync(p).isDirectory()) yield* archivosFuente(p)
    else if (/\.tsx?$/.test(p) && !/\.d\.ts$/.test(p)) yield p
  }
}

const relDe = (abs) => path.relative(RAIZ, abs).split(path.sep).join('/')

/** Árboles de sintaxis compartidos por las cuatro secciones y el evaluador. */
const modulos = new Map()
function modulo(abs) {
  abs = path.resolve(abs)
  let mod = modulos.get(abs)
  if (mod) return mod
  const texto = readFileSync(abs, 'utf8')
  const sf = ts.createSourceFile(abs, texto, ts.ScriptTarget.Latest, true, abs.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  mod = { abs, rel: relDe(abs), sf, texto, consts: null, imports: null, valores: new Map() }
  modulos.set(abs, mod)
  return mod
}
const lineaDe = (nodo, sf) => sf.getLineAndCharacterOfPosition(nodo.getStart(sf)).line + 1

// =============================================================================
// Evaluador estático de constantes (adaptado de la auditoría de oct 2026):
// objetos, arrays, cadenas, `as const`, spreads e identificadores del mismo
// archivo o importados de rutas relativas. Lo demás → { __opaco }.
// =============================================================================

const OPACO = (motivo) => ({ __opaco: motivo })
const esOpaco = (v) => v != null && typeof v === 'object' && '__opaco' in v

function indexar(mod) {
  if (mod.consts) return
  mod.consts = new Map()
  mod.imports = new Map()
  for (const st of mod.sf.statements) {
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) mod.consts.set(d.name.text, d.initializer)
    } else if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.moduleSpecifier.text.startsWith('.')) {
      const base = path.resolve(path.dirname(mod.abs), st.moduleSpecifier.text)
      const destino = ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((x) => base + x).find((p) => existsSync(p))
      const cl = st.importClause
      if (!cl || !destino || !cl.namedBindings || !ts.isNamedImports(cl.namedBindings)) continue
      for (const el of cl.namedBindings.elements) mod.imports.set(el.name.text, { archivo: destino, nombre: (el.propertyName ?? el.name).text })
    }
  }
}

function valorDe(mod, nombre, pila = new Set()) {
  indexar(mod)
  if (mod.valores.has(nombre)) return mod.valores.get(nombre)
  const id = mod.abs + '#' + nombre
  if (pila.has(id)) return OPACO('ciclo ' + nombre)
  pila.add(id)
  let v
  if (mod.consts.has(nombre)) v = evaluar(mod.consts.get(nombre), mod, pila)
  else if (mod.imports.has(nombre)) {
    const im = mod.imports.get(nombre)
    v = valorDe(modulo(im.archivo), im.nombre, pila)
  } else v = OPACO('identificador ' + nombre)
  pila.delete(id)
  mod.valores.set(nombre, v)
  return v
}

function nombrePropiedad(n, mod, pila) {
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return n.text
  if (ts.isComputedPropertyName(n)) {
    const v = evaluar(n.expression, mod, pila)
    return typeof v === 'string' || typeof v === 'number' ? String(v) : null
  }
  return null
}

const sinEnvoltorio = (n) => {
  while (n && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || ts.isSatisfiesExpression?.(n) || ts.isTypeAssertionExpression?.(n)))
    n = n.expression
  return n
}

function evaluar(n, mod, pila = new Set()) {
  n = sinEnvoltorio(n)
  if (!n) return undefined
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text
  if (ts.isNumericLiteral(n)) return Number(n.text)
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false
  if (n.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isIdentifier(n)) return n.text === 'undefined' ? undefined : valorDe(mod, n.text, pila)
  if (ts.isTemplateExpression(n)) {
    let s = n.head.text
    for (const sp of n.templateSpans) {
      const v = evaluar(sp.expression, mod, pila)
      if (typeof v !== 'string' && typeof v !== 'number') return OPACO('plantilla')
      s += v + sp.literal.text
    }
    return s
  }
  if (ts.isObjectLiteralExpression(n)) {
    const o = {}
    for (const p of n.properties) {
      if (ts.isPropertyAssignment(p)) {
        const k = nombrePropiedad(p.name, mod, pila)
        if (k != null) o[k] = evaluar(p.initializer, mod, pila)
      } else if (ts.isShorthandPropertyAssignment(p)) o[p.name.text] = valorDe(mod, p.name.text, pila)
      else if (ts.isSpreadAssignment(p)) {
        const v = evaluar(p.expression, mod, pila)
        if (v && typeof v === 'object' && !esOpaco(v)) Object.assign(o, v)
        else o.__spreadOpaco = true
      } else if (ts.isMethodDeclaration(p)) {
        const k = nombrePropiedad(p.name, mod, pila)
        if (k != null) o[k] = OPACO('método')
      }
    }
    return o
  }
  if (ts.isArrayLiteralExpression(n)) {
    const a = []
    for (const e of n.elements) {
      if (ts.isSpreadElement(e)) {
        const v = evaluar(e.expression, mod, pila)
        if (Array.isArray(v)) a.push(...v)
        else a.push(OPACO('spread'))
      } else a.push(evaluar(e, mod, pila))
    }
    return a
  }
  if (ts.isPropertyAccessExpression(n)) {
    const o = evaluar(n.expression, mod, pila)
    return o && typeof o === 'object' && !esOpaco(o) ? o[n.name.text] : OPACO('acceso')
  }
  if (ts.isElementAccessExpression(n)) {
    const o = evaluar(n.expression, mod, pila)
    const k = evaluar(n.argumentExpression, mod, pila)
    return o && typeof o === 'object' && !esOpaco(o) && (typeof k === 'string' || typeof k === 'number') ? o[k] : OPACO('acceso')
  }
  if (ts.isCallExpression(n)) {
    // `X.filter(p => p.campo === 'lit')`, `Object.keys/values/entries(X)`: los catálogos derivados más comunes.
    const lista = elementosDeLlamada(n, mod, pila)
    return lista ?? OPACO('llamada')
  }
  return OPACO(ts.SyntaxKind[n.kind])
}

/** Recorre una ruta de propiedades (`#0` = índice de una tupla de `entries`). */
const recorrer = (v, ruta) => ruta.reduce((a, k) => (a == null || typeof a !== 'object' || esOpaco(a) ? undefined : a[k.startsWith('#') ? Number(k.slice(1)) : k]), v)

/** Predicado simple de `filter`: `x => x.a === 'lit'` / `!==` / `({ a }) => a === 'lit'`. */
function predicadoSimple(fn, mod, pila) {
  if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) || fn.parameters.length < 1) return null
  let cuerpo = fn.body
  if (ts.isBlock(cuerpo)) {
    const ret = cuerpo.statements.length === 1 && ts.isReturnStatement(cuerpo.statements[0]) ? cuerpo.statements[0].expression : null
    if (!ret) return null
    cuerpo = ret
  }
  cuerpo = sinEnvoltorio(cuerpo)
  const param = fn.parameters[0].name
  const rutaDe = (e) => {
    e = sinEnvoltorio(e)
    const ruta = []
    while (ts.isPropertyAccessExpression(e)) {
      ruta.unshift(e.name.text)
      e = e.expression
    }
    if (!ts.isIdentifier(e)) return null
    if (ts.isIdentifier(param) && e.text === param.text) return ruta
    if (ts.isObjectBindingPattern(param)) {
      const el = param.elements.find((x) => ts.isIdentifier(x.name) && x.name.text === e.text)
      if (el) return [(el.propertyName ?? el.name).text, ...ruta]
    }
    return null
  }
  if (!ts.isBinaryExpression(cuerpo)) return null
  const op = cuerpo.operatorToken.kind
  const igual = op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken
  const distinto = op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken
  if (!igual && !distinto) return null
  let ruta = rutaDe(cuerpo.left)
  let otro = cuerpo.right
  if (!ruta) {
    ruta = rutaDe(cuerpo.right)
    otro = cuerpo.left
  }
  if (!ruta) return null
  const valor = evaluar(otro, mod, pila)
  if (esOpaco(valor)) return null
  return (x) => (recorrer(x, ruta) === valor) === igual
}

function elementosDeLlamada(n, mod, pila) {
  const callee = sinEnvoltorio(n.expression)
  if (!ts.isPropertyAccessExpression(callee)) return null
  const metodo = callee.name.text
  const receptor = sinEnvoltorio(callee.expression)
  if (ts.isIdentifier(receptor) && receptor.text === 'Object' && n.arguments.length === 1) {
    const o = evaluar(n.arguments[0], mod, pila)
    if (!o || typeof o !== 'object' || esOpaco(o) || Array.isArray(o) || o.__spreadOpaco) return null
    if (metodo === 'keys') return Object.keys(o)
    if (metodo === 'values') return Object.values(o)
    if (metodo === 'entries') return Object.entries(o)
    return null
  }
  if (metodo === 'filter') {
    const base = evaluar(receptor, mod, pila)
    const pred = predicadoSimple(n.arguments[0], mod, pila)
    if (!Array.isArray(base) || !pred) return null
    return base.filter((x) => !esOpaco(x) && pred(x))
  }
  if (['sort', 'toSorted', 'reverse', 'toReversed'].includes(metodo)) {
    const base = evaluar(receptor, mod, pila)
    return Array.isArray(base) ? base : null
  }
  return null
}

/** Busca la declaración local de `nombre` subiendo por los bloques; si no, la del módulo. */
function resolverIdentificador(nombre, desde, mod) {
  for (let n = desde.parent; n; n = n.parent) {
    const sentencias = ts.isBlock(n) || ts.isSourceFile(n) || ts.isModuleBlock(n) ? n.statements : ts.isCaseClause(n) || ts.isDefaultClause(n) ? n.statements : null
    if (!sentencias) continue
    for (const st of sentencias) {
      if (!ts.isVariableStatement(st)) continue
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === nombre && d.initializer) return evaluar(d.initializer, mod)
    }
  }
  return valorDe(mod, nombre)
}

// =============================================================================
// Utilidades de AST
// =============================================================================

const RE_FORMA_CLAVE = /^[a-z][A-Za-z0-9_-]*(\.[\p{L}\p{N}_-]+)+$/u
const RE_EXT_ARCHIVO = /\.(ts|tsx|js|mjs|json|png|webp|jpe?g|svg|glb|gltf|mp3|mp4|wav|ogg|css|html|com|org|io|net|mx|app)$/
const TRADUCTORES = new Set(['t', 'tGlobal', 'T'])

/** Literales que puede valer una expresión a través de `?:`, `&&`, `||`, `??` y paréntesis. */
function literalesDe(n, out = []) {
  n = sinEnvoltorio(n)
  if (!n) return out
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) out.push(n)
  else if (ts.isConditionalExpression(n)) {
    literalesDe(n.whenTrue, out)
    literalesDe(n.whenFalse, out)
  } else if (ts.isBinaryExpression(n)) {
    const op = n.operatorToken.kind
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) literalesDe(n.right, out)
    else if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      literalesDe(n.left, out)
      literalesDe(n.right, out)
    }
  }
  return out
}

const textoDe = (n) =>
  ts.isTemplateExpression(n) ? [n.head.text, ...n.templateSpans.map((s) => '${…}' + s.literal.text)].join('') : n.text

const nombreNodo = (n) => (n && (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) ? n.text : null)

/** Nombres de las declaraciones/propiedades que contienen al nodo (de dentro afuera). */
function contenedores(nodo) {
  const nombres = []
  for (let n = nodo.parent; n; n = n.parent) {
    if (ts.isPropertyAssignment(n) || ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isPropertyDeclaration(n)) {
      const k = nombreNodo(n.name)
      if (k) nombres.push(k)
    }
  }
  return nombres
}

// =============================================================================
// Principal
// =============================================================================

async function main() {
  const t0 = Date.now()
  const { IDIOMAS, IDIOMA_BASE } = await import(pathToFileURL(path.join(I18N, 'idiomas.ts')))
  const TODOS = IDIOMAS.map((i) => i.id)
  const destinos = TODOS.filter((id) => id !== IDIOMA_BASE) // en + los 14
  const dicts = {}
  for (const id of destinos) {
    dicts[id] = { ...(await leer(`dict.${id}.ts`, id.toUpperCase())), ...(await leer(`dict.${id}.tut.ts`, `${id.toUpperCase()}_TUT`)) }
  }
  const EN = dicts.en
  const clavesEn = Object.keys(EN)
  const prefijosEn = new Set(clavesEn.map((k) => k.split('.')[0]))
  const otros = destinos.filter((id) => id !== 'en')
  for (const i of IDIOMAS) for (const w of String(i.endonimo ?? '').split(/\s+/)) w && PALABRAS_FIJAS.add(w)

  // ---- Recolección: un solo recorrido del AST por archivo ----------------------
  const datos = new Map() // clave → { archivo, linea, prop }
  const familias = new Map() // plantilla → { partes, re, usos:[{archivo,linea,catalogo}] }
  const porIdioma = [] // objetos por idioma incompletos
  const objetosIdioma = [] // candidatos `{ es, en, … }`, se resuelven al final
  /** Cargadores perezosos por idioma de cada archivo (`{ pt: () => import('./x.pt') }`). */
  const perezososPorArchivo = new Map()
  /** Nombre de constante → idiomas que le añade un objeto que la expande (`{ ...X, pt }`). */
  const spreadsCompletan = new Map()
  const visibles = [] // texto visible fuera de t()

  const PROPS_CLAVE = new Set(['clave', 'labelKey', 'tituloKey', 'claveNombre', 'dondeClave', 'notaClave', 'claveNuevo', 'descClave', 'claveT'])
  const RE_PROP_CLAVE = /^(clave[A-Z]\w*|\w+Clave|\w+Key)$/
  const ATRIBUTOS = new Set(['title', 'placeholder', 'alt', 'aria-label', 'label', 'titulo', 'subtitulo', 'texto', 'descripcion', 'etiqueta', 'mensaje'])
  const SET_IDIOMAS = new Set(TODOS)

  for (const abs of archivosFuente(path.join(RAIZ, 'src'))) {
    const rel = relDe(abs)
    if (rel.startsWith('src/core/i18n/')) continue
    const mod = modulo(abs)
    const { sf } = mod
    const esTraduccion = /\.i18n(\.\w+)?\.ts$/.test(rel) || /manual\.\w\w\.ts$/.test(rel) || /\.test\.tsx?$/.test(rel)
    const perezosos = new Set()
    perezososPorArchivo.set(rel, perezosos)

    const visitar = (n) => {
      // -- 1. claves guardadas en datos
      if (SECCIONES.has(1) && ts.isPropertyAssignment(n) && !ARCHIVOS_CLAVE_AJENA[rel]) {
        const prop = nombreNodo(n.name)
        const explicita = prop && PROPS_CLAVE.has(prop)
        if (explicita || (prop && RE_PROP_CLAVE.test(prop))) {
          for (const lit of literalesDe(n.initializer)) {
            if (ts.isTemplateExpression(lit)) continue
            const k = lit.text
            if (!RE_FORMA_CLAVE.test(k) || RE_EXT_ARCHIVO.test(k)) continue
            if (!explicita && !prefijosEn.has(k.split('.')[0])) continue
            if (!datos.has(k)) datos.set(k, { archivo: rel, linea: lineaDe(lit, sf), prop })
          }
        }
      }

      // -- 2. familias dinámicas
      if (SECCIONES.has(2) && ts.isCallExpression(n) && ts.isIdentifier(n.expression) && TRADUCTORES.has(n.expression.text)) {
        const a0 = n.arguments[0] && sinEnvoltorio(n.arguments[0])
        if (a0 && ts.isTemplateExpression(a0)) {
          const partes = [a0.head.text, ...a0.templateSpans.map((s) => s.literal.text)]
          const plantilla = partes.join('${…}')
          let f = familias.get(plantilla)
          if (!f) {
            const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            f = { plantilla, partes, re: new RegExp('^' + partes.map(esc).join('(.+?)') + '$'), usos: [] }
            familias.set(plantilla, f)
          }
          const hueco = a0.templateSpans.length === 1 ? a0.templateSpans[0].expression : null
          const catalogo = hueco ? (catalogoDe(hueco, n, mod) ?? catalogoPorRespaldo(hueco, n.arguments[1], n, mod)) : null
          f.usos.push({ archivo: rel, linea: lineaDe(n, sf), catalogo })
        }
      }

      // -- 3. objetos por idioma
      if (SECCIONES.has(3) && ts.isObjectLiteralExpression(n)) {
        const props = []
        let spread = null
        let perezoso = 0
        for (const p of n.properties) {
          if (ts.isSpreadAssignment(p)) {
            spread = p
            continue
          }
          const k = ts.isShorthandPropertyAssignment(p) ? p.name.text : nombreNodo(p.name)
          if (k == null) continue
          props.push(k)
          if (SET_IDIOMAS.has(k) && ts.isPropertyAssignment(p) && ts.isArrowFunction(p.initializer) && /\bimport\(/.test(p.initializer.getText(sf))) perezoso++
        }
        const idiomas = props.filter((k) => SET_IDIOMAS.has(k) && k !== 'id')
        const extra = idiomas.filter((k) => k !== 'es' && k !== 'en')
        // `id` cuenta como indonesio solo en un mapa con varios idiomas más.
        if (props.includes('id') && extra.length >= 3) idiomas.push('id')
        if (perezoso >= 3) for (const k of idiomas) perezosos.add(k)
        else if (idiomas.includes('es') && idiomas.length >= 2) objetosIdioma.push({ n, idiomas, spread, mod })
        // `{ ...TEXTOS_X, pt: …, fr: … }`: los idiomas de este objeto completan a TEXTOS_X.
        if (idiomas.length) {
          for (const p of n.properties) {
            if (!ts.isSpreadAssignment(p) || !ts.isIdentifier(sinEnvoltorio(p.expression))) continue
            const nombre = sinEnvoltorio(p.expression).text
            const s = spreadsCompletan.get(nombre) ?? new Set()
            for (const k of idiomas) s.add(k)
            spreadsCompletan.set(nombre, s)
          }
        }
      }

      // -- 4. texto visible en JSX
      if (SECCIONES.has(4) && !esTraduccion) {
        if (ts.isJsxText(n)) {
          const s = n.text.replace(/\s+/g, ' ').trim()
          if (s) visibles.push({ archivo: rel, linea: lineaDe(n, sf), donde: 'hijo', texto: s })
        } else if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
          for (const lit of literalesDe(n.expression)) visibles.push({ archivo: rel, linea: lineaDe(lit, sf), donde: 'hijo', texto: textoDe(lit) })
        } else if (ts.isJsxAttribute(n) && n.initializer) {
          const nombre = n.name.getText(sf)
          if (ATRIBUTOS.has(nombre)) {
            const ini = n.initializer
            const lits = ts.isStringLiteral(ini) ? [ini] : ts.isJsxExpression(ini) && ini.expression ? literalesDe(ini.expression) : []
            for (const lit of lits) visibles.push({ archivo: rel, linea: lineaDe(lit, sf), donde: nombre, texto: textoDe(lit) })
          }
        }
      }
      ts.forEachChild(n, visitar)
    }
    visitar(sf)
  }

  // Sección 3: con todos los archivos vistos ya se conocen los cargadores perezosos
  // (propios o del compañero `X.i18n.ts`) y los spreads que completan cada objeto.
  for (const { n, idiomas, spread, mod } of objetosIdioma) {
    const { rel, sf } = mod
    const perezosos = new Set([...(perezososPorArchivo.get(rel) ?? []), ...(perezososPorArchivo.get(rel.replace(/\.tsx?$/, '.i18n.ts')) ?? [])])
    let arriba = n.parent
    while (arriba && (ts.isAsExpression(arriba) || ts.isSatisfiesExpression?.(arriba) || ts.isParenthesizedExpression(arriba))) arriba = arriba.parent
    const decl = arriba && ts.isVariableDeclaration(arriba) && ts.isIdentifier(arriba.name) ? arriba.name.text : null
    const presentes = new Set([...idiomas, ...((decl && spreadsCompletan.get(decl)) ?? [])])
    let spreadOpaco = false
    if (spread) {
      const v = evaluar(spread.expression, mod)
      if (v && typeof v === 'object' && !esOpaco(v) && !v.__spreadOpaco) for (const k of Object.keys(v)) presentes.add(k)
      else spreadOpaco = true
    }
    const faltan = TODOS.filter((k) => !presentes.has(k) && !perezosos.has(k))
    if (!faltan.length) continue
    const nombres = contenedores(n)
    const permiso = POR_IDIOMA_PERMITIDOS.find((p) => p.archivo === rel && (!p.decl || nombres.includes(p.decl)))
    porIdioma.push({ archivo: rel, linea: lineaDe(n, sf), en: nombres.slice(0, 3).reverse().join('.'), faltan, spreadOpaco, permitido: permiso?.motivo ?? null })
  }

  const informe = { errores: {}, secciones: {} }
  const resumen = []

  // ---- Sección 1 ---------------------------------------------------------------
  if (SECCIONES.has(1)) {
    log('\n== 1. Claves guardadas en datos ==')
    const errores = []
    for (const [k, d] of [...datos].sort((a, b) => a[1].archivo.localeCompare(b[1].archivo) || a[1].linea - b[1].linea)) {
      const faltan = destinos.filter((id) => dicts[id][k] == null)
      if (faltan.length) errores.push({ clave: k, ...d, faltan })
    }
    const n = errores.reduce((s, e) => s + e.faltan.length, 0)
    log(`${errores.length ? '✗' : '✓'} ${datos.size} claves en datos (${[...PROPS_CLAVE].join(', ')} y *Clave/*Key); ${errores.length} con huecos, ${n} entradas faltantes`)
    for (const e of errores) {
      const quien = e.faltan.length === destinos.length ? 'TODOS (ni en inglés)' : e.faltan.includes('en') ? `sin inglés y ${e.faltan.length - 1} más` : e.faltan.join(',')
      log(`    ${e.clave}  [${e.prop}]  ${e.archivo}:${e.linea}  → falta en: ${quien}`)
    }
    informe.secciones[1] = { total: datos.size, errores, archivosExcluidos: ARCHIVOS_CLAVE_AJENA }
    informe.errores[1] = n
    resumen.push(`1. claves en datos: ${n} errores (${errores.length} claves afectadas de ${datos.size})`)
  }

  // ---- Sección 2 ---------------------------------------------------------------
  if (SECCIONES.has(2)) {
    log('\n== 2. Familias dinámicas ==')
    const filas = []
    let n = 0
    let resueltas = 0
    for (const f of [...familias.values()].sort((a, b) => a.plantilla.localeCompare(b.plantilla))) {
      const deFamilia = clavesEn.filter((k) => f.re.test(k))
      const porIdiomaFaltan = {}
      for (const id of otros) {
        const faltan = deFamilia.filter((k) => dicts[id][k] == null)
        if (faltan.length) porIdiomaFaltan[id] = faltan
      }
      // Ids del catálogo (unión de los usos resueltos) sin clave en inglés.
      const catalogos = f.usos.map((u) => u.catalogo).filter(Boolean)
      let idsSinIngles = []
      let ids = null
      if (catalogos.length) {
        resueltas++
        ids = [...new Set(catalogos.flatMap((c) => c.ids))]
        idsSinIngles = ids.filter((id) => EN[f.partes[0] + id + f.partes[1]] == null)
      }
      const aceptada = FAMILIAS_INCOMPLETAS_ACEPTADAS[f.plantilla] ?? null
      const errs = aceptada ? 0 : Object.values(porIdiomaFaltan).reduce((s, l) => s + l.length, 0) + idsSinIngles.length
      n += errs
      const fila = {
        plantilla: f.plantilla,
        usos: f.usos.map((u) => `${u.archivo}:${u.linea}`),
        clavesEn: deFamilia.length,
        catalogo: catalogos.length ? { origen: [...new Set(catalogos.map((c) => c.origen))], ids: ids.length } : null,
        idsSinIngles,
        porIdiomaFaltan,
        aceptada,
      }
      filas.push(fila)
      if (errs || (aceptada && (idsSinIngles.length || Object.keys(porIdiomaFaltan).length))) {
        log(`${aceptada ? '·' : '✗'} ${f.plantilla}  (${fila.usos[0]}${fila.usos.length > 1 ? ` +${fila.usos.length - 1}` : ''}) — ${deFamilia.length} claves en inglés` +
          (fila.catalogo ? `, catálogo ${fila.catalogo.origen.join('/')} con ${fila.catalogo.ids} ids` : ', catálogo sin resolver'))
        if (aceptada) log(`    aceptada: ${aceptada}`)
        if (idsSinIngles.length) log(`    ids sin clave en inglés (${idsSinIngles.length}): ${idsSinIngles.join(', ')}`)
        for (const [id, l] of Object.entries(porIdiomaFaltan)) log(`    ${id}: faltan ${l.length} → ${l.slice(0, 6).join(', ')}${l.length > 6 ? ' …' : ''}`)
      }
    }
    const sinResolver = filas.filter((f) => !f.catalogo).length
    log(`${n ? '✗' : '✓'} ${familias.size} familias; catálogo resuelto en ${resueltas}, sin resolver en ${sinResolver} (de esas solo se compara idioma contra inglés); ${n} errores`)
    informe.secciones[2] = { familias: filas, aceptadas: FAMILIAS_INCOMPLETAS_ACEPTADAS }
    informe.errores[2] = n
    resumen.push(`2. familias dinámicas: ${n} errores (${filas.filter((f) => !f.aceptada && (f.idsSinIngles.length || Object.keys(f.porIdiomaFaltan).length)).length} familias afectadas de ${familias.size})`)
  }

  // ---- Sección 3 ---------------------------------------------------------------
  if (SECCIONES.has(3)) {
    log('\n== 3. Objetos por idioma incompletos ==')
    const errores = porIdioma.filter((p) => !p.permitido && !p.spreadOpaco)
    const avisos = porIdioma.filter((p) => !p.permitido && p.spreadOpaco)
    const permitidos = porIdioma.filter((p) => p.permitido)
    const resumir = (f) => (f.length === TODOS.length - 2 && !f.includes('es') && !f.includes('en') ? 'todos menos es/en' : f.join(','))
    log(`${errores.length ? '✗' : '✓'} ${errores.length} objetos con idiomas que faltan (caen al inglés)` + (permitidos.length ? `; ${permitidos.length} permitidos por la lista blanca` : ''))
    for (const p of errores) log(`    ${p.archivo}:${p.linea}  ${p.en || '(anónimo)'}  → faltan: ${resumir(p.faltan)}`)
    if (avisos.length) {
      log(`  · ${avisos.length} con un spread que no se pudo resolver (revisar a mano, no cuentan como error):`)
      for (const p of avisos) log(`    ${p.archivo}:${p.linea}  ${p.en || '(anónimo)'}  → faltan sin el spread: ${resumir(p.faltan)}`)
    }
    informe.secciones[3] = { errores, avisos, permitidos, listaBlanca: POR_IDIOMA_PERMITIDOS }
    informe.errores[3] = errores.length
    resumen.push(`3. objetos por idioma: ${errores.length} errores` + (avisos.length ? ` (+${avisos.length} avisos de spread)` : ''))
  }

  // ---- Sección 4 ---------------------------------------------------------------
  if (SECCIONES.has(4)) {
    log('\n== 4. Texto visible fuera de t() (informe, no falla) ==')
    const hallados = visibles.filter((v) => pareceTexto(v.texto, PALABRAS_FIJAS))
    const porArchivo = new Map()
    for (const v of hallados) porArchivo.set(v.archivo, (porArchivo.get(v.archivo) ?? 0) + 1)
    const orden = [...porArchivo].sort((a, b) => b[1] - a[1])
    log(`· ${hallados.length} textos en ${orden.length} archivos`)
    for (const [a, c] of orden.slice(0, 30)) log(`    ${String(c).padStart(4)}  ${a}`)
    if (orden.length > 30) log(`    … y ${orden.length - 30} archivos más`)
    log(`  primeras ${Math.min(MUESTRAS, hallados.length)} muestras:`)
    for (const v of hallados.slice(0, MUESTRAS)) log(`    ${v.archivo}:${v.linea}  [${v.donde}]  ${v.texto.slice(0, 90)}`)
    informe.secciones[4] = { total: hallados.length, porArchivo: Object.fromEntries(orden), hallazgos: hallados }
    resumen.push(`4. texto fuera de t(): ${hallados.length} candidatos en ${orden.length} archivos (informe)`)
  }

  const errores = Object.values(informe.errores).reduce((s, x) => s + x, 0)
  log(`\n== Resumen (${((Date.now() - t0) / 1000).toFixed(1)} s) ==`)
  for (const r of resumen) log('  ' + r)
  log(errores ? `\n${errores} errores` : '\nsin errores')
  informe.total = errores
  if (argJson) {
    const json = JSON.stringify(informe, null, 1)
    if (rutaJson) writeFileSync(path.resolve(rutaJson), json)
    else console.log(json)
  }
  if (errores) process.exitCode = 1
}

// =============================================================================
// Sección 2: de dónde sale el `id` de `t(\`prefijo.${id}\`)`
// =============================================================================

const METODOS_ITERAR = new Set(['map', 'forEach', 'flatMap', 'filter', 'some', 'every', 'find', 'findIndex', 'findLast'])

/** `x.a.b` → { base: 'x', ruta: ['a', 'b'] }; null si no es una cadena de accesos. */
function cadenaDe(expr) {
  const ruta = []
  let base = sinEnvoltorio(expr)
  while (ts.isPropertyAccessExpression(base)) {
    ruta.unshift(base.name.text)
    base = sinEnvoltorio(base.expression)
  }
  return ts.isIdentifier(base) ? { base: base.text, ruta } : null
}

/** Ruta, dentro del valor del parámetro, a la que queda ligado `nombre` (destructuring incluido). */
function ligar(patron, nombre) {
  if (ts.isIdentifier(patron)) return patron.text === nombre ? [] : null
  if (ts.isObjectBindingPattern(patron)) {
    for (const el of patron.elements) {
      const sub = ligar(el.name, nombre)
      if (sub) return [el.propertyName ? nombreNodo(el.propertyName) : el.name.text, ...sub]
    }
  }
  if (ts.isArrayBindingPattern(patron)) {
    for (let i = 0; i < patron.elements.length; i++) {
      const el = patron.elements[i]
      if (ts.isOmittedExpression(el)) continue
      const sub = ligar(el.name, nombre)
      if (sub) return ['#' + i, ...sub]
    }
  }
  return null
}

/**
 * Resuelve el catálogo de ids del hueco: `x.id` / `id` / `[k]` ligado al
 * parámetro de un `CAT.map(...)` (o un `for (const x of CAT)`), con `CAT`
 * evaluable estáticamente. Respeta las guardas `x.nota && t(…)` / `x.nota ? t(…) : …`
 * (solo cuentan los elementos que las cumplen). Devuelve `{ origen, ids }` o null.
 */
function catalogoDe(expr, llamada, mod) {
  const cad = cadenaDe(expr)
  if (!cad) return null
  const guardas = [] // { cond, si }
  let hijo = llamada
  for (let n = llamada.parent; n; hijo = n, n = n.parent) {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && n.right === hijo) guardas.push({ cond: n.left, si: true })
    else if (ts.isConditionalExpression(n) && hijo !== n.condition) guardas.push({ cond: n.condition, si: hijo === n.whenTrue })
    else if (ts.isIfStatement(n) && hijo !== n.expression) guardas.push({ cond: n.expression, si: hijo === n.thenStatement })

    let patron = null
    let catalogo = null
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) {
      const idx = n.parameters.findIndex((p) => ligar(p.name, cad.base))
      if (idx < 0) continue
      if (idx !== 0) return null
      const padre = n.parent
      if (!ts.isCallExpression(padre) || padre.arguments[0] !== n) return null
      const callee = sinEnvoltorio(padre.expression)
      if (!ts.isPropertyAccessExpression(callee) || !METODOS_ITERAR.has(callee.name.text)) return null
      patron = n.parameters[0].name
      catalogo = callee.expression
    } else if (ts.isForOfStatement(n) && ts.isVariableDeclarationList(n.initializer)) {
      const d = n.initializer.declarations[0]
      if (!d || !ligar(d.name, cad.base)) continue
      patron = d.name
      catalogo = n.expression
    } else continue

    // Guardas expresables sobre el elemento: `x.campo`, `!x.campo`.
    const filtros = []
    for (const { cond, si } of guardas) {
      let c = sinEnvoltorio(cond)
      let polaridad = si
      while (ts.isPrefixUnaryExpression(c) && c.operator === ts.SyntaxKind.ExclamationToken) {
        polaridad = !polaridad
        c = sinEnvoltorio(c.operand)
      }
      const cc = cadenaDe(c)
      const pre = cc && ligar(patron, cc.base)
      if (pre) filtros.push((item) => Boolean(recorrer(item, [...pre, ...cc.ruta])) === polaridad)
    }
    return idsDe(catalogo, [...ligar(patron, cad.base), ...cad.ruta], n, mod, filtros)
  }
  return null
}

function listaDe(exprCat, desde, mod) {
  const e = sinEnvoltorio(exprCat)
  const v = ts.isIdentifier(e) ? resolverIdentificador(e.text, desde, mod) : evaluar(e, mod)
  return Array.isArray(v) && v.length && !v.some(esOpaco) ? v : null
}

function idsDe(exprCat, ruta, desde, mod, filtros = []) {
  const lista = listaDe(exprCat, desde, mod)
  if (!lista) return null
  const ids = []
  for (const item of lista) {
    if (!filtros.every((f) => f(item))) continue
    const v = recorrer(item, ruta)
    if (typeof v === 'string' || typeof v === 'number') ids.push(String(v))
    else if (v !== undefined) return null // un id que no es literal: catálogo a medias
  }
  if (!ids.length) return null
  return { origen: sinEnvoltorio(exprCat).getText(mod.sf).replace(/\s+/g, ' ').slice(0, 60), ids }
}

/**
 * Catálogo deducido del RESPALDO en español, cuando indexa con lo mismo que el hueco:
 *   t(`p.${k}`, MAPA[k])  ·  t(`p.${k}`, MAPA[k].labelEs)  ·  t(`p.${k}`, MAPA[k] ?? k)
 *   t(`p.${k}`, LISTA.find((x) => x.id === k)?.nombre ?? k)
 * Las claves de MAPA (o los `id` de LISTA) son el catálogo.
 */
function catalogoPorRespaldo(hueco, respaldo, llamada, mod) {
  if (!respaldo) return null
  const textoHueco = sinEnvoltorio(hueco).getText(mod.sf).replace(/\s+/g, '')
  let r = sinEnvoltorio(respaldo)
  while (ts.isBinaryExpression(r) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(r.operatorToken.kind)) r = sinEnvoltorio(r.left)
  while (ts.isPropertyAccessExpression(r)) r = sinEnvoltorio(r.expression)
  if (ts.isElementAccessExpression(r) && sinEnvoltorio(r.argumentExpression).getText(mod.sf).replace(/\s+/g, '') === textoHueco) {
    const obj = sinEnvoltorio(r.expression)
    const v = ts.isIdentifier(obj) ? resolverIdentificador(obj.text, llamada, mod) : evaluar(obj, mod)
    if (!v || typeof v !== 'object' || Array.isArray(v) || esOpaco(v) || v.__spreadOpaco) return null
    const ids = Object.keys(v)
    return ids.length ? { origen: obj.getText(mod.sf).slice(0, 60), ids } : null
  }
  // LISTA.find((x) => x.campo === hueco)
  if (ts.isCallExpression(r) && ts.isPropertyAccessExpression(sinEnvoltorio(r.expression)) && sinEnvoltorio(r.expression).name.text === 'find') {
    const fn = r.arguments[0]
    if (!fn || !ts.isArrowFunction(fn) || !fn.parameters.length) return null
    const cuerpo = sinEnvoltorio(fn.body)
    if (!ts.isBinaryExpression(cuerpo) || cuerpo.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return null
    const lados = [cuerpo.left, cuerpo.right]
    const otro = lados.find((l) => sinEnvoltorio(l).getText(mod.sf).replace(/\s+/g, '') === textoHueco)
    const campo = lados.find((l) => l !== otro)
    const cc = otro && cadenaDe(campo)
    const pre = cc && ligar(fn.parameters[0].name, cc.base)
    if (!pre) return null
    return idsDe(sinEnvoltorio(r.expression).expression, [...pre, ...cc.ruta], llamada, mod)
  }
  return null
}

// =============================================================================
// Sección 4: ¿parece texto para una persona?
// =============================================================================

const RE_LETRA = /\p{L}/u
const RE_ACENTO = /[áéíóúüñ¿¡]/i

function pareceTexto(bruto, fijas) {
  // Los huecos de plantilla y lo que no es letra no cuentan.
  const v = bruto.replace(/\$\{…\}/g, ' ').replace(/\s+/g, ' ').trim()
  if (!RE_LETRA.test(v)) return false
  if (/^(https?:|mailto:|data:|www\.|\/|\.\.?\/|#[0-9a-f]{3,8}$)/i.test(v)) return false
  if (/^[\w.-]+@[\w.-]+$/.test(v)) return false // correo
  const tokens = v.split(' ')
  // Clases CSS / utilidades de Tailwind: todo minúsculas y alguna con - : / [ ].
  if (tokens.every((tk) => /^[!-]?[a-z0-9][\w:/.[\]#%()!-]*$/.test(tk)) && tokens.some((tk) => /[-:/[\]]/.test(tk))) return false
  // Identificadores (camelCase, snake_case, kebab, con puntos) sin espacios.
  if (tokens.length === 1 && /^[a-z][\w.-]*$/i.test(v) && /[a-z][A-Z]|[_.]|^[a-z]+-[a-z-]+$/.test(v)) return false
  // Una sola palabra en minúsculas sin acento: parece un id.
  if (tokens.length === 1 && /^[a-z0-9]+$/.test(v)) return false
  // Quitando marcas, siglas, unidades, números y signos, ¿queda alguna palabra?
  const palabras = (v.match(/[\p{L}\p{N}.#'’-]+/gu) ?? []).map((w) => w.replace(/^[.'’-]+|[.'’-]+$/g, ''))
  // Las letras sueltas (variables de una fórmula, «x», «A») tampoco cuentan.
  const restantes = palabras.filter((w) => (w.match(/\p{L}/gu) ?? []).length >= 2 && !fijas.has(w) && !/^\p{N}+[\p{L}%°]*$/u.test(w))
  if (!restantes.length) return false
  const letras = restantes.join('').match(/\p{L}/gu) ?? []
  if (letras.length < 2) return false
  // Código colado: llaves, flechas, punto y coma… sin acentos.
  if (/[{};]|=>|\(\)/.test(v) && !RE_ACENTO.test(v)) return false
  return true
}

await main()
