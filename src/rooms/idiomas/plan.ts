import { idiomasRepo, repasosIdiomaRepo, tarjetasIdiomaRepo, temasIdiomaRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import type { NivelPartida } from '../../core/data/db'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'
import { NIVELES } from './constantes'
import { esDominada, tarjetasVencidas } from './srs'
import { hoyISO, rachaActual, sumarDias } from './stats'
import { GRAMATICA, PRONUNCIACION, TEMARIO, type NivelTemario } from './temario'

/**
 * Acotamiento del planificador ✨ en idiomas (cronograma por idioma): plan de
 * aprendizaje con progresión MCER desde el nivel real del perfil, calibrado con
 * el estado del SRS.
 */

/** MCER → punto de partida del formulario. */
const nivelPartida = (mcer: string): NivelPartida =>
  mcer.startsWith('A') ? 'algo' : mcer.startsWith('B') ? 'medio' : 'avanzado'

export async function planMetasIdiomas(ambitoId?: string): Promise<ContextoPlanApp> {
  const id = ambitoId?.startsWith('idioma:') ? Number(ambitoId.slice('idioma:'.length)) : null
  const perfil = id != null ? (await idiomasRepo.list()).find((i) => i.id === id) : undefined

  const guia = [
    perfil
      ? `La meta es de la app de Idiomas y trata de ${perfil.nombre} (nivel MCER actual del usuario: ${perfil.nivel}): eres un tutor de idiomas y el plan es SIEMPRE de aprendizaje de ese idioma.`
      : 'La meta es de la app de Idiomas: eres un tutor de idiomas y el plan es SIEMPRE de aprendizaje del idioma que nombre la meta.',
    'Las fases siguen la progresión MCER desde el nivel actual (no repitas lo ya dominado) y cubren vocabulario, gramática, pronunciación y conversación.',
    'Los hijos son habilidades medibles («Mantener una conversación de 10 minutos», «Dominar el pasado simple», «500 palabras de vocabulario»).',
    CLAUSULA_RECHAZO('el aprendizaje de idiomas'),
  ]

  const contexto: string[] = []
  let ejemplo = tGlobal('idiomas.plan.ejemplo', 'Hablar con soltura en mi próximo viaje')
  let nivel: NivelPartida = 'cero'
  if (perfil?.id != null) {
    nivel = nivelPartida(perfil.nivel)
    const siguiente = NIVELES[NIVELES.indexOf(perfil.nivel) + 1] ?? 'C2'
    ejemplo = tGlobal('idiomas.plan.ejemploNivel', 'Alcanzar nivel {nivel} de {idioma}', {
      nivel: siguiente,
      idioma: perfil.nombre,
    })

    const tarjetas = (await tarjetasIdiomaRepo.list()).filter((t) => t.idiomaId === perfil.id)
    if (tarjetas.length > 0)
      contexto.push(
        `Vocabulario: ${tarjetas.length} tarjetas, ${tarjetas.filter((t) => esDominada(t.caja)).length} dominadas, ${tarjetasVencidas(tarjetas).length} pendientes de repaso hoy.`,
      )

    const repasos = (await repasosIdiomaRepo.list()).filter((r) => r.idiomaId === perfil.id)
    if (repasos.length > 0) {
      const racha = rachaActual(new Set(repasos.map((r) => r.fecha)))
      const d30 = sumarDias(hoyISO(), -29)
      const mes = repasos.filter((r) => r.fecha >= d30)
      const hechos = mes.reduce((s, r) => s + r.repasos, 0)
      const pct = hechos > 0 ? Math.round((mes.reduce((s, r) => s + r.aciertos, 0) / hechos) * 100) : 0
      contexto.push(
        `Repaso: racha de ${racha} días` + (hechos > 0 ? `; ${pct}% de aciertos en los últimos 30 días.` : '.'),
      )
    }
  }

  // El material son los temas del temario del nivel actual (las 3 áreas) más los
  // dinámicos que nacieron de las charlas de ESE idioma: el plan estudia temas
  // concretos del temario, no genéricos inventados.
  let material: ContextoPlanApp['material']
  if (perfil?.id != null) {
    const delNivel = (area: string, lista: NivelTemario[]) =>
      (lista.find((n) => n.nivel === perfil.nivel)?.temas ?? []).map((t) => ({
        nombre: t.titulo,
        detalle: `${perfil.nivel} · ${area} · ${t.descripcion}`,
      }))
    const dinamicos = (await temasIdiomaRepo.list())
      .filter((t) => t.idiomaId === perfil.id)
      .map((t) => ({ nombre: t.titulo, detalle: `${t.nivel} · ${t.descripcion}` }))
    const items = [
      ...delNivel('temas', TEMARIO),
      ...delNivel('pronunciación', PRONUNCIACION),
      ...delNivel('gramática', GRAMATICA),
      ...dinamicos,
    ]
    if (items.length > 0)
      material = {
        titulo: tGlobal('idiomas.plan.material', 'Temas del plan'),
        instruccion:
          'El material son temas del temario del idioma (con su nivel MCER y su área). Elige los que llevan a la meta y en el motivo di qué destreza cubren para lograrla. Deja "rutina" vacía.',
        items,
      }
  }

  return { guia, contexto, nivel, ejemplo, material }
}
