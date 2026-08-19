import { lazy } from 'react'
import type { EsquemaCaptura, Plantilla } from '../../core/appContrato'
import { vFecha, vNumero, vTexto } from '../../core/appContrato'
import {
  idiomasRepo,
  registrarRepasoDia,
  repasosIdiomaRepo,
  tarjetasIdiomaRepo,
} from '../../core/data/repository'
import type { TipoTarjeta } from '../../core/data/db'
import { actividadId } from '../../core/rutinas'
import { tGlobal } from '../../core/i18n/useT'
import { planMetasIdiomas } from './plan'
import { esencialIdiomas, flujosIdiomas } from './tutorial.meta'
import { COLOR_FABRICA, NIVELES, TIPOS_TARJETA } from './constantes'
import { tarjetasVencidas } from './srs'
import { hoyISO } from './stats'
import { OPERACIONES_IA } from './costosIA'

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')
const normalizar = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(DIACRITICOS, '')

/**
 * Perfil cuyo nombre o código casa con el texto ("inglés", "en-US"…). Sin
 * mención y con UN solo idioma registrado, se asume ese; con varios, nada.
 */
async function perfilPorNombre(texto: string) {
  const lista = await idiomasRepo.list()
  const clave = normalizar(texto)
  if (!clave) return lista.length === 1 ? lista[0] : undefined
  return (
    lista.find((i) => normalizar(i.nombre) === clave || i.codigo.toLowerCase() === clave) ??
    lista.find((i) => normalizar(i.nombre).includes(clave) || clave.includes(normalizar(i.nombre))) ??
    (lista.length === 1 ? lista[0] : undefined)
  )
}

/** Quick-capture sin IA: "vocab inglés: dog = perro" (o "palabra francés: …"). */
async function capturar(texto: string): Promise<boolean> {
  const m = /^(?:vocab(?:ulario)?|palabra)\s+([^:]+):\s*(.+?)\s*=\s*(.+)$/i.exec(texto.trim())
  if (!m) return false
  const perfil = await perfilPorNombre(m[1])
  if (!perfil?.id) return false
  await tarjetasIdiomaRepo.add({
    idiomaId: perfil.id,
    termino: m[2].trim(),
    traduccion: m[3].trim(),
    tipo: 'palabra',
    nivel: perfil.nivel,
    caja: 0,
    proximaISO: hoyISO(),
    fuente: 'manual',
    creadoEn: new Date().toISOString(),
  })
  return true
}

/** Esquemas para el asistente global: tarjetas de vocabulario y práctica del día. */
const esquemas: EsquemaCaptura[] = [
  {
    id: 'tarjeta',
    descripcion:
      'Guarda una tarjeta de vocabulario cuando el usuario aprende una palabra, frase o expresión de un idioma que estudia ("apunta que serendipity es serendipia", "aprendí a decir bonjour").',
    campos: [
      {
        campo: 'idioma',
        tipo: 'texto',
        descripcion: 'Idioma al que pertenece el término (ej. inglés, francés); omitir si no se menciona',
      },
      { campo: 'termino', tipo: 'texto', descripcion: 'La palabra, frase o expresión en el idioma objetivo', requerido: true },
      { campo: 'traduccion', tipo: 'texto', descripcion: 'Su traducción al español', requerido: true },
      { campo: 'ejemplo', tipo: 'texto', descripcion: 'Frase de ejemplo en el idioma que use el término, si se menciona' },
      {
        campo: 'tipo',
        tipo: 'opcion',
        opciones: TIPOS_TARJETA.map((x) => x.id),
        descripcion: 'palabra = término suelto, frase = oración completa, expresion = modismo o frase hecha',
      },
      {
        campo: 'nivel',
        tipo: 'opcion',
        opciones: NIVELES,
        descripcion: 'Nivel MCER estimado del término (omitir si no es claro)',
      },
    ],
    guardar: async (v) => {
      const termino = vTexto(v.termino)
      const traduccion = vTexto(v.traduccion)
      if (!termino || !traduccion) return
      const perfil = await perfilPorNombre(vTexto(v.idioma))
      if (!perfil?.id) return
      const tipo = TIPOS_TARJETA.some((x) => x.id === v.tipo) ? (v.tipo as TipoTarjeta) : 'palabra'
      await tarjetasIdiomaRepo.add({
        idiomaId: perfil.id,
        termino,
        traduccion,
        ejemplo: vTexto(v.ejemplo) || undefined,
        tipo,
        nivel: NIVELES.includes(vTexto(v.nivel)) ? vTexto(v.nivel) : perfil.nivel,
        caja: 0,
        proximaISO: hoyISO(),
        fuente: 'ia',
        creadoEn: new Date().toISOString(),
      })
    },
  },
  {
    id: 'practica',
    descripcion:
      'Registra práctica de un idioma cuando el usuario dice que estudió o repasó ("repasé inglés", "practiqué 20 tarjetas de francés").',
    campos: [
      { campo: 'idioma', tipo: 'texto', descripcion: 'Idioma practicado; omitir si no se menciona' },
      { campo: 'repasos', tipo: 'numero', descripcion: 'Cuántas tarjetas o ejercicios repasó (1 si no se dice)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const perfil = await perfilPorNombre(vTexto(v.idioma))
      if (!perfil?.id) return
      const n = Math.max(1, Math.round(vNumero(v.repasos, 1)))
      await registrarRepasoDia(perfil.id, vFecha(v.fecha), n)
    },
  },
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const IdiomasApp = lazy(() => import('./IdiomasApp').then((m) => ({ default: m.IdiomasApp })))

const idiomas: Plantilla = {
  id: 'idiomas',
  nombre: 'Idiomas',
  icon: '🌐',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: IdiomasApp,
  flujos: flujosIdiomas,
  esencial: esencialIdiomas,
  capturar,
  esquemas,
  operacionesIA: OPERACIONES_IA,
  // El planificador ✨ del cronograma (pestaña Progreso, acotado por idioma)
  // ofrece reservar el rato de repaso: aceptar el plan le pone hora y días en el
  // calendario. Es el MISMO bloque `idioma:<perfilId>` que agenda RepasoTab
  // (también sin registro rápido: la meta la pone el SRS).
  rutinasPlan: async (ambitoId) => {
    let lista = (await idiomasRepo.list()).filter((i) => i.id != null)
    if (ambitoId?.startsWith('idioma:')) {
      lista = lista.filter((i) => actividadId('idioma', i.id!) === ambitoId)
    }
    return lista.map((i) => ({
      tipo: 'idioma',
      tipoEtiqueta: tGlobal('idiomas.plan.tipo', 'Repaso'),
      actividad: {
        actividadId: actividadId('idioma', i.id!),
        plantillaId: 'idiomas',
        nombre: tGlobal('idiomas.rep.bloque', 'Repasar {idioma}', { idioma: i.nombre }),
        emoji: '🌐',
        horaSugerida: '20:00',
        seccion: 'repaso',
      },
    }))
  },
  planMetas: planMetasIdiomas,
  // El único objetivo que no hay que inventar: lo pone el SRS. La meta se cumple
  // cuando no queda ninguna tarjeta vencida.
  metaDiaria: {
    clave: 'idiomas.metaDiaria',
    etiquetaEs: 'Repaso de hoy',
    unidad: 'tarjetas',
    seccion: 'repaso',
    del: async (fecha) => {
      const vencidas = tarjetasVencidas(await tarjetasIdiomaRepo.list(), fecha).length
      const hecho = (await repasosIdiomaRepo.list())
        .filter((r) => r.fecha === fecha)
        .reduce((s, r) => s + r.repasos, 0)
      // El objetivo es lo que tocaba repasar hoy: lo ya repasado MÁS lo que sigue
      // vencido. Contar solo las vencidas lo haría bajar conforme avanzas y llegaría
      // a 0 (= meta apagada) justo al terminarlas, que es cuando debe darse por
      // cumplida. Sin tarjetas ni idiomas, 0 = no hay nada que repasar, y así se dice.
      return { hecho, objetivo: hecho + vencidas }
    },
  },
  comandos: [
    { seccion: 'charlas', etiqueta: 'Tutor', nombres: ['tutor', 'tutor de idiomas'] },
    { seccion: 'repaso', etiqueta: 'Repaso', nombres: ['repaso', 'ejercicios', 'repasar'] },
    // El vocabulario vive DENTRO del temario desde que las tarjetas cuelgan de
    // sus temas: la palabra sigue llevando ahí.
    { seccion: 'temario', etiqueta: 'Temario', nombres: ['temario', 'vocabulario', 'tarjetas'] },
    { seccion: 'progreso', etiqueta: 'Progreso', nombres: ['progreso de idiomas'] },
  ],
}

export default idiomas
