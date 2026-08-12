import { lazy } from 'react'
import type { Plantilla, EsquemaCaptura } from '../../core/appContrato'
import { vTexto, vNumero, vFecha } from '../../core/appContrato'
import { hobbiesRepo, proyectosHobbyRepo, sesionesHobbyRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { actividadId } from '../../core/rutinas'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO } from '../../core/planIA'
import { flujosHobbies } from './tutorial.meta'

/** Duración en minutos detectada en el texto ("30 min", "1 hora", "45m"), o 0. */
function extraerMinutos(norm: string): number {
  const minMatch = norm.match(/(\d+)\s*(?:min(?:utos?)?|m\b)/)
  const hrMatch = norm.match(/(\d+(?:\.\d+)?)\s*h(?:oras?|rs?)?/)
  if (minMatch) return parseInt(minMatch[1])
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]) * 60)
  return 0
}

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  // El nombre de un hobby existente debe aparecer en el texto (el más largo gana).
  const lista = await hobbiesRepo.list()
  const hobby = lista
    .filter((h) => h.id != null && norm.includes(normalizar(h.nombre)))
    .sort((a, b) => b.nombre.length - a.nombre.length)[0]
  if (!hobby) return false

  const minutos = extraerMinutos(norm)
  if (minutos <= 0) return false

  await sesionesHobbyRepo.add({
    hobbyId: hobby.id!,
    fecha: fechaLocalISO(),
    minutos,
    nota: texto,
  })
  return true
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'practica',
    descripcion: 'Una sesión de práctica de un hobby o pasatiempo del usuario.',
    campos: [
      { campo: 'hobby', tipo: 'texto', descripcion: 'Nombre del hobby practicado (ej. "guitarra", "pintura", "ajedrez")', requerido: true },
      { campo: 'minutos', tipo: 'numero', descripcion: 'Minutos dedicados a la práctica', requerido: true },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Observación breve de la sesión' },
    ],
    guardar: async (v) => {
      const minutos = vNumero(v.minutos)
      const nombre = vTexto(v.hobby)
      if (minutos <= 0 || !nombre) return
      // Busca el hobby por nombre normalizado; si no existe se crea (la captura no descarta datos).
      const lista = await hobbiesRepo.list()
      const existente = lista.find((h) => normalizar(h.nombre) === normalizar(nombre))
      const hobbyId =
        existente?.id ??
        (await hobbiesRepo.add({
          nombre,
          emoji: '🎯',
          color: '#8b5cf6',
          creadoEn: new Date().toISOString(),
        }))
      await sesionesHobbyRepo.add({
        hobbyId,
        fecha: vFecha(v.fecha),
        minutos,
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
]

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const HobbiesApp = lazy(() => import('./HobbiesApp').then((m) => ({ default: m.HobbiesApp })))

const hobbies: Plantilla = {
  id: 'hobbies',
  nombre: 'Hobbies',
  icon: '🎯',
  categoria: 'complemento',
  color: '#8b5cf6',
  App: HobbiesApp,
  flujos: flujosHobbies,
  capturar,
  esquemas,
  // El cronograma ya no es una pestaña: cada hobby y cada proyecto lleva el suyo,
  // así que el deep-link solo puede llevar a la lista.
  comandos: [
    { seccion: 'hobbies', etiqueta: 'Hobbies', nombres: ['mis hobbies', 'pasatiempos', 'mis proyectos'] },
  ],
  // El planificador ✨ de los cronogramas (por hobby o por proyecto) ofrece la
  // práctica del hobby del ámbito: aceptar el plan le pone hora y días en el
  // calendario. El MISMO bloque `hobby:<id>` que agenda DetalleHobby.
  rutinasPlan: async (ambitoId) => {
    let lista = (await hobbiesRepo.list()).filter((h) => h.id != null)
    if (ambitoId?.startsWith('hobby:')) {
      lista = lista.filter((h) => actividadId('hobby', h.id!) === ambitoId)
    } else if (ambitoId?.startsWith('proyecto:')) {
      const p = (await proyectosHobbyRepo.list()).find((x) => `proyecto:${x.id}` === ambitoId)
      lista = lista.filter((h) => h.id === p?.hobbyId)
    }
    const minutos = 30
    return lista.map((h) => ({
      tipo: 'hobby',
      tipoEtiqueta: tGlobal('hobbies.plan.tipo', 'Práctica'),
      actividad: {
        actividadId: actividadId('hobby', h.id!),
        plantillaId: 'hobbies',
        nombre: h.nombre,
        emoji: h.emoji,
        horaSugerida: '19:00',
        duracionMin: minutos,
        seccion: 'hobbies',
        registroRapido: {
          esquemaId: 'practica',
          valores: { hobby: h.nombre, minutos },
          etiqueta: tGlobal('hobbies.registrarMin', 'Registrar {n} min', { n: minutos }),
        },
      },
    }))
  },
  // Acotamiento del planificador ✨ por ámbito: progresar en el hobby o terminar
  // el proyecto, calibrado con la meta semanal y las sesiones reales.
  planMetas: async (ambitoId) => {
    const hoy = fechaLocalISO()
    const desde = isoMasDias(hoy, -29)
    const contexto: string[] = []

    if (ambitoId?.startsWith('proyecto:')) {
      const p = (await proyectosHobbyRepo.list()).find((x) => `proyecto:${x.id}` === ambitoId)
      if (p) {
        contexto.push(`Proyecto «${p.nombre}», estado: ${p.estado === 'terminado' ? 'terminado' : 'en curso'}.`)
        if (p.nota) contexto.push(`Descripción del proyecto: ${p.nota.slice(0, 200)}`)
        const sesiones = (await sesionesHobbyRepo.list()).filter(
          (s) => s.proyectoId === p.id && s.fecha >= desde && s.fecha <= hoy,
        )
        if (sesiones.length > 0)
          contexto.push(
            `Últimos 30 días: ${sesiones.length} sesiones, ${sesiones.reduce((s, x) => s + x.minutos, 0)} min dedicados.`,
          )
      }
      return {
        guia: [
          p
            ? `La meta es de la app de Hobbies y trata del proyecto «${p.nombre}»: el plan es SIEMPRE para terminar ese proyecto.`
            : 'La meta es de la app de Hobbies y trata de un proyecto: el plan es SIEMPRE para terminarlo.',
          'Las fases son etapas del proyecto (diseño, ejecución, acabado).',
          'Los hijos son entregables concretos y medibles, no consejos.',
          CLAUSULA_RECHAZO('el proyecto o el pasatiempo'),
        ],
        contexto,
        ejemplo: p
          ? tGlobal('hobbies.plan.ejProyecto', 'Terminar {proyecto}', { proyecto: p.nombre })
          : tGlobal('hobbies.plan.ejemplo', 'Tocar 3 canciones completas'),
      }
    }

    const h = ambitoId?.startsWith('hobby:')
      ? (await hobbiesRepo.list()).find((x) => x.id != null && actividadId('hobby', x.id) === ambitoId)
      : undefined
    if (h) {
      if (h.metaDiasSemana) contexto.push(`Meta propia: practicar ${h.metaDiasSemana} días por semana.`)
      const sesiones = (await sesionesHobbyRepo.list()).filter(
        (s) => s.hobbyId === h.id && s.fecha >= desde && s.fecha <= hoy,
      )
      if (sesiones.length > 0)
        contexto.push(
          `Últimos 30 días: ${sesiones.length} sesiones, ${sesiones.reduce((s, x) => s + x.minutos, 0)} min de práctica.`,
        )
    }
    // El material son los proyectos reales del hobby: progresar suele pasar por
    // terminarlos, y el motivo dice qué práctica aporta cada uno a la meta.
    const proyectos = h
      ? (await proyectosHobbyRepo.list()).filter((p) => p.hobbyId === h.id)
      : []
    return {
      guia: [
        h
          ? `La meta es de la app de Hobbies y trata del pasatiempo «${h.nombre}»: eres un mentor de práctica deliberada y el plan es SIEMPRE para progresar en ese pasatiempo.`
          : 'La meta es de la app de Hobbies: eres un mentor de práctica deliberada y el plan es SIEMPRE para progresar en el pasatiempo que nombre la meta.',
        'Las fases son hitos de habilidad de menor a mayor.',
        'Los hijos son prácticas o piezas concretas y medibles («Tocar la canción completa sin errores», «Terminar 3 bocetos»).',
        CLAUSULA_RECHAZO('el pasatiempo'),
      ],
      contexto,
      ejemplo: tGlobal('hobbies.plan.ejemplo', 'Tocar 3 canciones completas'),
      material:
        proyectos.length > 0
          ? {
              titulo: tGlobal('hobbies.plan.material', 'Proyectos del plan'),
              instruccion:
                'El material son los proyectos reales del pasatiempo del usuario. Integra al plan los que sirven a la meta y en el motivo di qué práctica aporta avanzarlos o terminarlos. Deja "rutina" vacía.',
              items: proyectos.map((p) => ({
                nombre: p.nombre,
                detalle:
                  (p.estado === 'terminado' ? 'terminado' : 'en curso') +
                  (p.nota ? ` · ${p.nota.slice(0, 80)}` : ''),
              })),
            }
          : undefined,
    }
  },
  // `metaDiasSemana` es por hobby y semanal: el x/7 de cada uno se queda en su
  // detalle. Aquí la pregunta es la de la app entera: ¿practicaste algo hoy?
  metaDiaria: {
    clave: 'hobbies.metaDiaria',
    etiquetaEs: 'Practica hoy',
    del: async (fecha) => {
      const sesiones = (await sesionesHobbyRepo.list()).filter((s) => s.fecha === fecha)
      const minutos = sesiones.reduce((s, x) => s + x.minutos, 0)
      return {
        hecho: sesiones.length,
        objetivo: 1,
        detalle: minutos > 0 ? `${minutos} min` : undefined,
      }
    },
  },
}

export default hobbies
