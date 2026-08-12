import { lazy } from 'react'
import type { EsquemaCaptura, Plantilla } from '../../core/appContrato'
import { vFecha, vLista, vNumero, vTexto } from '../../core/appContrato'
import {
  entradasBiblioRepo,
  objetivoDiarioDe,
  sesionesEstudioRepo,
} from '../../core/data/repository'
import { actividadId } from '../../core/rutinas'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO } from '../../core/planIA'
import { flujosBiblioteca } from './tutorial.meta'
import { PILARES } from './pilares'
import { PILAR_GENERAL } from './constantes'
import { OPERACIONES_IA } from './costosIA'

const IDS_PILARES = [...PILARES.map((p) => p.id), PILAR_GENERAL.id]
const DESC_PILARES = PILARES.map((p) => `${p.id} = ${p.titulo}`).join(', ')

const pilarValido = (v: unknown) => {
  const id = vTexto(v)
  return IDS_PILARES.includes(id) ? id : PILAR_GENERAL.id
}

/** Esquemas para el asistente global: apuntes de conocimiento y sesiones de estudio. */
const esquemas: EsquemaCaptura[] = [
  {
    id: 'apunte',
    descripcion:
      'Guarda una entrada de conocimiento en la enciclopedia personal cuando el usuario cuenta algo que aprendió, leyó o quiere apuntar ("aprendí que…", "apunta esto sobre…"). Destila tú el aprendizaje en formato wiki.',
    campos: [
      { campo: 'titulo', tipo: 'texto', descripcion: 'Título corto de la entrada (estilo wiki)', requerido: true },
      { campo: 'resumen', tipo: 'texto', descripcion: 'Resumen de 2-4 frases de lo aprendido', requerido: true },
      { campo: 'puntosClave', tipo: 'lista', descripcion: 'De 2 a 5 puntos clave, uno por elemento' },
      {
        campo: 'pilarId',
        tipo: 'opcion',
        opciones: IDS_PILARES,
        descripcion: `Campo del conocimiento de la entrada: ${DESC_PILARES}, general = sin clasificar`,
      },
    ],
    guardar: async (v) => {
      const titulo = vTexto(v.titulo)
      const resumen = vTexto(v.resumen)
      if (!titulo || !resumen) return
      const ahora = new Date().toISOString()
      await entradasBiblioRepo.add({
        pilarId: pilarValido(v.pilarId),
        titulo,
        resumen,
        puntosClave: vLista(v.puntosClave),
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
    },
  },
  {
    id: 'estudio',
    descripcion:
      'Registra una sesión de estudio cuando el usuario dice cuánto tiempo estudió un tema (ej. "estudié 40 minutos de historia").',
    campos: [
      { campo: 'minutos', tipo: 'numero', descripcion: 'Minutos estudiados (1 hora = 60)', requerido: true },
      {
        campo: 'pilarId',
        tipo: 'opcion',
        opciones: IDS_PILARES,
        descripcion: `Campo del conocimiento estudiado: ${DESC_PILARES}`,
      },
      { campo: 'nota', tipo: 'texto', descripcion: 'Tema concreto estudiado, si se menciona' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const minutos = Math.round(vNumero(v.minutos))
      if (minutos <= 0) return
      await sesionesEstudioRepo.add({
        pilarId: pilarValido(v.pilarId),
        minutos,
        fecha: vFecha(v.fecha),
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const BibliotecaApp = lazy(() => import('./BibliotecaApp').then((m) => ({ default: m.BibliotecaApp })))

const biblioteca: Plantilla = {
  id: 'biblioteca',
  nombre: 'Biblioteca · Enciclopedia',
  icon: '📚',
  categoria: 'mente',
  color: '#818cf8',
  App: BibliotecaApp,
  flujos: flujosBiblioteca,
  esquemas,
  operacionesIA: OPERACIONES_IA,
  // El planificador ✨ del cronograma (pestaña Estudio) ofrece reservar el rato
  // de estudio: aceptar el plan le pone hora y días en el calendario. Es el
  // MISMO bloque `biblioteca:estudio` que agenda EstudioTab.
  rutinasPlan: async () => {
    const minutos = 25
    return [
      {
        tipo: 'estudio',
        tipoEtiqueta: tGlobal('biblioteca.plan.tipo', 'Estudio'),
        actividad: {
          actividadId: actividadId('biblioteca', 'estudio'),
          plantillaId: 'biblioteca',
          nombre: tGlobal('biblioteca.est.bloque', 'Estudiar'),
          emoji: '📚',
          horaSugerida: '19:00',
          duracionMin: minutos,
          seccion: 'estudio',
          registroRapido: {
            esquemaId: 'estudio',
            valores: { minutos },
            etiqueta: tGlobal('biblioteca.registrarMin', 'Registrar {n} min', { n: minutos }),
          },
        },
      },
    ]
  },
  // Acotamiento del planificador ✨: en biblioteca el plan es SIEMPRE de estudio.
  planMetas: async () => {
    const hoy = fechaLocalISO()
    const desde = isoMasDias(hoy, -29)
    const sesiones = (await sesionesEstudioRepo.list()).filter((s) => s.fecha >= desde && s.fecha <= hoy)
    const contexto: string[] = []
    if (sesiones.length > 0)
      contexto.push(
        `Últimos 30 días: ${sesiones.reduce((s, x) => s + x.minutos, 0)} min de estudio en ${sesiones.length} sesiones.`,
      )
    const entradas = await entradasBiblioRepo.list()
    if (entradas.length > 0) contexto.push(`Enciclopedia personal: ${entradas.length} entradas.`)
    return {
      guia: [
        'La meta es de la app de Biblioteca: eres un mentor de estudio y el plan es SIEMPRE un plan de estudio del tema que nombre la meta.',
        'Las fases son unidades temáticas ordenadas de los fundamentos a lo específico.',
        'Los hijos son temas por dominar o entregables concretos («Resolver 20 ejercicios de derivadas», «Resumir los 3 primeros capítulos»).',
        CLAUSULA_RECHAZO('el estudio o el aprendizaje de un tema'),
      ],
      contexto,
      ejemplo: tGlobal('biblioteca.plan.ejemplo', 'Dominar los fundamentos de estadística'),
      // El material son las entradas YA escritas: si alguna toca el tema de la
      // meta, el plan la usa como base de repaso en vez de partir de cero.
      material:
        entradas.length > 0
          ? {
              titulo: tGlobal('biblioteca.plan.material', 'De tu enciclopedia'),
              instruccion:
                'El material son entradas ya escritas en la enciclopedia personal del usuario. Elige SOLO las que tocan el tema de la meta y en el motivo di qué aporta releerlas o ampliarlas; si ninguna toca el tema, manda "material": []. Deja "rutina" vacía.',
              items: entradas.map((e) => ({
                nombre: e.titulo,
                detalle: e.resumen.slice(0, 90),
              })),
            }
          : undefined,
    }
  },
  metaDiaria: {
    clave: 'biblioteca.metaDiaria',
    etiquetaEs: 'Estudio de hoy',
    unidad: 'min',
    seccion: 'estudio',
    ajustable: true,
    del: async (fecha) => ({
      hecho: (await sesionesEstudioRepo.list())
        .filter((s) => s.fecha === fecha)
        .reduce((s, x) => s + x.minutos, 0),
      objetivo: await objetivoDiarioDe('biblioteca', 20),
    }),
  },
  comandos: [
    { seccion: 'charlas', etiqueta: 'Charlas', nombres: ['charlas'] },
    { seccion: 'enciclopedia', etiqueta: 'Enciclopedia', nombres: ['enciclopedia', 'wiki'] },
    { seccion: 'estudio', etiqueta: 'Estudio', nombres: ['sesion de estudio', 'temporizador de estudio'] },
    { seccion: 'resumen', etiqueta: 'Resumen', nombres: ['resumen de estudio', 'progreso de estudio'] },
  ],
}

export default biblioteca
