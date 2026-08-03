import { lazy } from 'react'
import type { Plantilla, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha, vLista } from '../../core/registry'
import type { MomentoComida } from '../../core/data/db'
import {
  aguaRepo,
  comidasRepo,
  dietasGuardadasRepo,
  itemsCompraRepo,
  listasCompraRepo,
  perfilNutricionRepo,
  recetasRepo,
} from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { actividadId } from '../../core/rutinas'
import { tGlobal } from '../../core/i18n/useT'
import { CATEGORIAS_COMPRA, adivinarCategoria } from './categoriasCompra'
import { HORA_SUGERIDA, MOMENTOS, PERFIL_DEFECTO } from './constantes'
import { CAMPOS_DIETA, CAMPOS_RECETA } from './recetaIA'
import { promptDieta, promptReceta } from './promptsFoto'
import { fotoIA } from './fotoIA'
import { imagenIaActiva } from '../../core/imagenIA'
import { registrarPeso } from './peso'
import { planMetasCocina } from './plan'
import { flujosCocina } from './tutorial'
import { fechaLocalISO } from '../../core/fechaLocal'
import { OPERACIONES_IA } from './costosIA'

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))

  // Registro de agua: "tomé 2 vasos", "bebí 500ml", "agua 1 litro", "1.5l de agua"
  const esAgua = ['agua', 'vaso', 'vasos', 'ml', 'litro', 'litros', 'tome', 'bebi', 'hidrate', 'tomar'].some((k) => tokens.has(k))
  if (esAgua) {
    // Detecta ml directamente
    const mlMatch = norm.match(/(\d+(?:\.\d+)?)\s*ml/)
    // Detecta litros
    const litrosMatch = norm.match(/(\d+(?:\.\d+)?)\s*l(?:itros?)?/)
    // Detecta vasos (aprox 240ml c/u)
    const vasosMatch = norm.match(/(\d+)\s*vasos?/)

    const ml = mlMatch
      ? parseFloat(mlMatch[1])
      : litrosMatch
      ? parseFloat(litrosMatch[1]) * 1000
      : vasosMatch
      ? parseInt(vasosMatch[1]) * 240
      : 0

    if (ml > 0) {
      await aguaRepo.add({ fecha: fechaLocalISO(), ml })
      return true
    }
  }

  // Registro de comida rápido: detecta momento + nombre aproximado
  const MOMENTOS: [string[], string][] = [
    [['desayuno', 'desayune', 'desayunar'], 'desayuno'],
    [['comida', 'almuerzo', 'almorce', 'comi', 'comer'], 'comida'],
    [['cena', 'cene', 'cenar'], 'cena'],
    [['snack', 'colacion', 'merienda', 'botana'], 'snack'],
  ]

  let momento: 'desayuno' | 'comida' | 'cena' | 'snack' | null = null
  for (const [claves, m] of MOMENTOS) {
    if (claves.some((k) => tokens.has(k))) {
      momento = m as 'desayuno' | 'comida' | 'cena' | 'snack'
      break
    }
  }

  // Pesaje corporal: "peso 78 kg", "me pesé 77.5", "mi peso es 78"
  if (tokens.has('peso') || tokens.has('pese')) {
    const kgMatch =
      norm.match(/pes[oe]\s+(?:es\s+|en\s+|de\s+)?(\d+(?:\.\d+)?)/) ??
      norm.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?)\b/)
    const kg = kgMatch ? parseFloat(kgMatch[1]) : 0
    if (kg >= 20 && kg <= 400) {
      await registrarPeso(fechaLocalISO(), kg)
      return true
    }
  }

  const calMatch = norm.match(/(\d+)\s*(?:cal(?:orias?)?|kcal)/)
  if (momento && calMatch) {
    await comidasRepo.add({
      fecha: fechaLocalISO(),
      momento,
      nombre: texto.slice(0, 80),
      calorias: parseInt(calMatch[1]),
      proteinas: 0,
      carbohidratos: 0,
      grasas: 0,
      nota: texto,
    })
    return true
  }

  return false
}

const MOMENTOS_VALIDOS = new Set<string>(['desayuno', 'comida', 'cena', 'snack'])

/**
 * Pinta la portada de lo que el chat acaba de guardar y la escribe cuando
 * llega, SIN que el chat la espere: una dieta con sus recetas son cinco
 * imágenes y dejaría al asistente minutos «pensando». Las listas son
 * reactivas, así que cada foto aparece sola.
 */
function pintarPortada(prompt: string, guardar: (foto: Blob) => Promise<unknown>): void {
  if (!imagenIaActiva()) return
  void fotoIA(prompt).then((foto) => (foto ? guardar(foto) : undefined))
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'comida',
    descripcion: 'Algo que el usuario comió: una comida, platillo o alimento.',
    campos: [
      { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre del platillo o alimento', requerido: true },
      { campo: 'momento', tipo: 'opcion', opciones: ['desayuno', 'comida', 'cena', 'snack'], descripcion: 'Momento del día en que lo comió', requerido: true },
      { campo: 'calorias', tipo: 'numero', descripcion: 'Calorías estimadas (kcal); estima si no se mencionan' },
      { campo: 'proteinas', tipo: 'numero', descripcion: 'Gramos de proteína estimados' },
      { campo: 'carbohidratos', tipo: 'numero', descripcion: 'Gramos de carbohidratos estimados' },
      { campo: 'grasas', tipo: 'numero', descripcion: 'Gramos de grasa estimados' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const m = vTexto(v.momento, 'comida')
      await comidasRepo.add({
        fecha: vFecha(v.fecha),
        momento: (MOMENTOS_VALIDOS.has(m) ? m : 'comida') as MomentoComida,
        nombre: vTexto(v.nombre, 'Comida'),
        calorias: vNumero(v.calorias),
        proteinas: vNumero(v.proteinas),
        carbohidratos: vNumero(v.carbohidratos),
        grasas: vNumero(v.grasas),
      })
    },
  },
  {
    id: 'agua',
    descripcion: 'Agua que el usuario bebió.',
    campos: [
      { campo: 'ml', tipo: 'numero', descripcion: 'Mililitros (1 vaso ≈ 240 ml, 1 litro = 1000 ml)', requerido: true },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const ml = vNumero(v.ml)
      if (ml > 0) await aguaRepo.add({ fecha: vFecha(v.fecha), ml })
    },
  },
  {
    id: 'receta',
    descripcion:
      'Guarda una receta completa en el recetario. Úsala cuando el usuario pida una receta, pregunte cómo preparar un platillo o quiera guardar una. Si solo da el nombre del platillo, INVENTA tú la receta completa: ingredientes con cantidades, pasos claros y macros estimados por porción. Si además pide la lista de la compra de esa receta, añade una llamada a lista_compra con sus ingredientes.',
    campos: CAMPOS_RECETA,
    guardar: async (v) => {
      const ingredientes = vLista(v.ingredientes)
      const pasos = vLista(v.pasos)
      const nombre = vTexto(v.nombre)
      if (!nombre || ingredientes.length === 0) return
      const id = await recetasRepo.add({
        nombre,
        emoji: vTexto(v.emoji, '🍲'),
        porciones: Math.max(1, Math.round(vNumero(v.porciones, 2))),
        minutos: Math.max(0, Math.round(vNumero(v.minutos))),
        etiquetas: vLista(v.etiquetas),
        ingredientes,
        pasos,
        calorias: Math.max(0, Math.round(vNumero(v.calorias))),
        proteinas: Math.max(0, Math.round(vNumero(v.proteinas))),
        carbohidratos: Math.max(0, Math.round(vNumero(v.carbohidratos))),
        grasas: Math.max(0, Math.round(vNumero(v.grasas))),
        fuente: 'ia',
        creadaEn: new Date().toISOString(),
      })
      pintarPortada(promptReceta({ nombre, ingredientes }), (foto) => recetasRepo.update(id, { foto }))
    },
  },
  {
    id: 'compra',
    descripcion:
      'Agrega UN artículo a la lista de compras del súper. Úsala cuando el usuario pida apuntar/agregar algo para comprar (ej. "agrega leche a la lista", "hay que comprar jitomates y pan" → una llamada por artículo).',
    campos: [
      { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre del artículo', requerido: true },
      { campo: 'cantidad', tipo: 'texto', descripcion: 'Cantidad si se menciona (ej. "2 kg", "3 piezas"); omitir si no' },
      {
        campo: 'categoria',
        tipo: 'opcion',
        opciones: CATEGORIAS_COMPRA.map((c) => c.id),
        descripcion: 'Pasillo del súper al que pertenece el artículo',
      },
    ],
    guardar: async (v) => {
      const nombre = vTexto(v.nombre)
      if (!nombre) return
      const cat = vTexto(v.categoria)
      await itemsCompraRepo.add({
        nombre,
        cantidad: vTexto(v.cantidad) || undefined,
        categoria: CATEGORIAS_COMPRA.some((c) => c.id === cat) ? cat : adivinarCategoria(nombre),
        comprado: false,
        creadoEn: new Date().toISOString(),
      })
    },
  },
  {
    id: 'lista_compra',
    descripcion:
      'Guarda una LISTA DE COMPRAS COMPLETA (con nombre y varios artículos de una vez) en la pestaña Compras. Úsala cuando el usuario dicte una lista entera ("apunta la lista del súper: leche, pan, huevos"), pida la lista de los ingredientes de una receta o dieta, o pida armar la despensa de un plan. Para UN solo artículo suelto usa la herramienta compra.',
    campos: [
      { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre de la lista (ej. "Súper semanal", "Ingredientes: pasta al pesto")', requerido: true },
      {
        campo: 'items',
        tipo: 'lista',
        descripcion: 'Un artículo por elemento, CON cantidad cuando se sepa (ej. "2 kg de jitomate", "1 L de leche")',
        requerido: true,
      },
    ],
    guardar: async (v) => {
      const items = vLista(v.items)
      const nombre = vTexto(v.nombre)
      if (!nombre || items.length === 0) return
      const creadoEn = new Date().toISOString()
      const listaId = await listasCompraRepo.add({ nombre, creadoEn })
      for (const item of items) {
        await itemsCompraRepo.add({
          nombre: item,
          categoria: adivinarCategoria(item),
          comprado: false,
          creadoEn,
          listaId,
        })
      }
    },
  },
  {
    id: 'dieta',
    descripcion:
      'Guarda una DIETA o plan de alimentación (con sus metas de macros y las recetas que la componen) en la pestaña Dieta. Úsala cuando el usuario pida una dieta ("hazme una dieta para bajar de peso", "quiero una dieta keto de 1800 kcal"). IMPORTANTE: si la dieta lleva recetas, crea PRIMERO cada receta con la herramienta receta en esta misma respuesta y después nombra esas recetas —con su nombre exacto— en el campo recetas. Si además quiere la lista del súper, añade una llamada a lista_compra con los ingredientes.',
    campos: [
      ...CAMPOS_DIETA,
      {
        campo: 'recetas',
        tipo: 'lista',
        descripcion:
          'Nombres EXACTOS de las recetas que componen la dieta (las que acabas de crear con la herramienta receta, o las que ya existen en el recetario). Una por elemento.',
      },
    ],
    guardar: async (v) => {
      const nombre = vTexto(v.nombre)
      if (!nombre) return
      // Las recetas se nombran, no se anidan: el modelo las creó antes en esta
      // misma respuesta (las tools se ejecutan en orden), así que ya existen.
      const pedidas = vLista(v.recetas).map(normalizar)
      const recetaIds = (await recetasRepo.list())
        .filter((r) => r.id != null && pedidas.includes(normalizar(r.nombre)))
        .map((r) => r.id as number)
      const meta = (x: unknown) => {
        const n = vNumero(x)
        return n > 0 ? Math.round(n) : undefined
      }
      const descripcion = vTexto(v.descripcion)
      const id = await dietasGuardadasRepo.add({
        nombre,
        descripcion,
        calorias: meta(v.calorias),
        proteinas: meta(v.proteinas),
        carbohidratos: meta(v.carbohidratos),
        grasas: meta(v.grasas),
        recetaIds,
        creadoEn: new Date().toISOString(),
      })
      // Las fotos de sus recetas ya las pidió la tool `receta` una por una.
      pintarPortada(promptDieta({ nombre, descripcion }), (foto) => dietasGuardadasRepo.update(id, { foto }))
    },
  },
  {
    id: 'peso',
    descripcion: 'Registra el peso corporal del usuario cuando dice cuánto pesa (ej. "peso 78 kg", "me pesé y salí en 77.5").',
    campos: [
      { campo: 'kg', tipo: 'numero', descripcion: 'Peso corporal en kilogramos', requerido: true },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const kg = vNumero(v.kg)
      if (kg >= 20 && kg <= 400) await registrarPeso(vFecha(v.fecha), kg)
    },
  },
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const CocinaApp = lazy(() => import('./CocinaApp').then((m) => ({ default: m.CocinaApp })))

const cocina: Plantilla = {
  id: 'cocina',
  nombre: 'Cocina · Nutrición',
  icon: '🍳',
  categoria: 'cuerpo',
  color: '#f59e0b',
  App: CocinaApp,
  flujos: flujosCocina,
  capturar,
  esquemas,
  operacionesIA: OPERACIONES_IA,
  // El agua es la única meta de cocina que se cumple llegando: las calorías tienen
  // techo, no piso, y ponerlas de meta premiaría atiborrarse. Van en el detalle,
  // que es donde informan sin empujar.
  metaDiaria: {
    clave: 'cocina.metaDiaria',
    etiquetaEs: 'Agua de hoy',
    unidad: 'ml',
    seccion: 'diario',
    del: async (fecha) => {
      const perfil = (await perfilNutricionRepo.list())[0] ?? PERFIL_DEFECTO
      const hecho = (await aguaRepo.list())
        .filter((a) => a.fecha === fecha)
        .reduce((s, a) => s + a.ml, 0)
      const kcal = (await comidasRepo.list())
        .filter((c) => c.fecha === fecha)
        .reduce((s, c) => s + c.calorias, 0)
      const litros = (ml: number) => (ml / 1000).toFixed(1)
      return {
        hecho,
        objetivo: perfil.aguaMl,
        detalle: `${litros(hecho)} / ${litros(perfil.aguaMl)} L · ${Math.round(kcal)} kcal`,
      }
    },
  },
  // El planificador ✨ del cronograma ofrece los momentos de comida: un plan de
  // nutrición se calendariza poniéndole hora al desayuno, la comida y la cena.
  // El MISMO bloque que agenda RegistroComida (buscarAgenda lo dedupe al guardar).
  rutinasPlan: async () =>
    MOMENTOS.map((m) => ({
      tipo: 'comida',
      tipoEtiqueta: tGlobal('cocina.plan.tipoComida', 'Comida'),
      actividad: {
        actividadId: actividadId('momento', m.id),
        plantillaId: 'cocina',
        nombre: m.label,
        emoji: m.icon,
        horaSugerida: HORA_SUGERIDA[m.id],
        seccion: 'diario',
        // Sin registro rápido, como en RegistroComida: una comida de un toque
        // sería 0 kcal envenenando los totales.
      },
    })),
  planMetas: planMetasCocina,
  // Nada de nombres de UNA palabra como 'peso': se matchean por token y
  // secuestrarían «peso 78 kg», que debe caer en el registro de pesaje.
  comandos: [
    {
      seccion: 'metas',
      etiqueta: 'Metas',
      nombres: ['metas de nutricion', 'mis macros', 'cronograma de nutricion', 'mis metas de peso', 'plan alimenticio'],
    },
    { seccion: 'diario', etiqueta: 'Registro', nombres: ['diario de comidas', 'mis comidas', 'registrar comida'] },
    { seccion: 'progreso', etiqueta: 'Progreso', nombres: ['mi progreso', 'mi peso', 'estadisticas de nutricion'] },
    { seccion: 'plan', etiqueta: 'Dieta', nombres: ['dieta', 'plan de comidas', 'plan semanal de comidas'] },
    { seccion: 'recetas', etiqueta: 'Recetario', nombres: ['recetario', 'recetas'] },
    { seccion: 'compras', etiqueta: 'Compras', nombres: ['compras', 'lista del super', 'lista de compras'] },
  ],
}

export default cocina
