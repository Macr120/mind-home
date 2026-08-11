import { useEffect, useRef, useState } from 'react'
import type { PerfilIdioma, RetoEjercicio, TarjetaIdioma } from '../../core/data/db'
import { partidasEjercicioRepo, registrarRepasoDia, tarjetasIdiomaRepo } from '../../core/data/repository'
import { festejarAleatorio } from '../../core/gamificacion/festejo'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { generarEjercicios, tarjetasConCloze, type Ejercicio, type ModoEjercicio } from './ejercicios'
import {
  LOTE_ABIERTO,
  MEDALLAS,
  PREGUNTAS_RONDA,
  RETOS,
  SEGUNDOS_CONTRARRELOJ,
  VIDAS_INICIALES,
  ahoraMs,
  medallasDe,
  multiplicador,
  puntosRespuesta,
  restanteS,
  transcurridoMs,
  type ResumenPartida,
} from './juego'
import { MisionesDia } from './MisionesDia'
import { programarRepaso, tarjetasVencidas } from './srs'
import { hoyISO } from './stats'
import { hablar, hayTTS } from './tts'
import { OpcionesTemas } from './OpcionesTemas'
import { filtrarTemario, useTemario } from './temarioVivo'

/** Partida en curso. Vive en memoria: una ronda es de una sentada. */
interface Partida {
  modo: ModoEjercicio
  reto: RetoEjercicio
  lista: Ejercicio[]
  idx: number
  aciertos: number
  puntos: number
  combo: number
  comboMax: number
  vidas: number
  inicioMs: number
  /** Deadline del contrarreloj; sin él, la partida no tiene reloj. */
  finMs?: number
}

const MODOS: { id: ModoEjercicio; labelEs: string }[] = [
  { id: 'opcion', labelEs: '¿Qué significa?' },
  { id: 'inverso', labelEs: 'Al revés' },
  { id: 'cloze', labelEs: 'Completar' },
]

/**
 * Ejercicios con capa de juego: combo que multiplica los puntos, tres vidas o
 * contrarreloj, medallas al cerrar y misiones del día.
 *
 * El SRS se mantiene intacto: acertar y fallar programan la caja como siempre,
 * pero quedarse sin tiempo (o sin la última vida con la pregunta en el aire) NO
 * escribe nada — que el reloj te gane no es no sabérsela.
 */
export function EjerciciosTab({ perfil, tarjetas, temaInicial, onTemaAplicado }: {
  perfil: PerfilIdioma
  tarjetas: TarjetaIdioma[]
  /** Tema con el que se llega desde el temario (▶ practicar); null = lo de hoy. */
  temaInicial?: string | null
  onTemaAplicado?: () => void
}) {
  const t = useT()
  const tx = useTemario(perfil.id)
  const [modoEj, setModoEj] = useState<ModoEjercicio>('opcion')
  const [reto, setReto] = useState<RetoEjercicio>('libre')
  /** Qué se pregunta: 'hoy' (vencidas), 'todo' o un tema del temario. */
  const [fuente, setFuente] = useState<string>(temaInicial ?? 'hoy')
  const [partida, setPartida] = useState<Partida | null>(null)
  const [elegida, setElegida] = useState<number | null>(null)
  const [fin, setFin] = useState<(ResumenPartida & { medallas: string[] }) | null>(null)
  const [, setTick] = useState(0)
  /** Instante en que apareció la pregunta actual (bonus de rapidez). */
  const mostradaMs = useRef(0)

  const conTTS = hayTTS()

  // El temario decide qué entra a la ronda; los distractores siguen saliendo de
  // todo el idioma (ver `generarEjercicios`).
  const vencidas = tarjetasVencidas(tarjetas)
  const foco =
    fuente === 'todo'
      ? tarjetas
      : fuente === 'hoy'
        ? (vencidas.length > 0 ? vencidas : tarjetas)
        : tarjetas.filter((x) => x.temaId === fuente)
  const nCloze = tarjetasConCloze(foco).length
  const temasConTarjetas = new Set(tarjetas.map((x) => x.temaId).filter((x): x is string => !!x))

  const cerrar = async (p: Partida) => {
    const resumen: ResumenPartida = {
      modo: p.modo,
      reto: p.reto,
      preguntas: p.idx,
      aciertos: p.aciertos,
      comboMax: p.comboMax,
      puntos: p.puntos,
      segundos: Math.round(transcurridoMs(p.inicioMs) / 1000),
      vidas: p.vidas,
    }
    const medallas = medallasDe(resumen)
    setPartida(null)
    setElegida(null)
    setFin({ ...resumen, medallas })
    if (perfil.id != null && resumen.preguntas > 0) {
      await partidasEjercicioRepo.add({
        idiomaId: perfil.id,
        fecha: hoyISO(),
        modo: resumen.modo,
        reto: resumen.reto,
        preguntas: resumen.preguntas,
        aciertos: resumen.aciertos,
        comboMax: resumen.comboMax,
        puntos: resumen.puntos,
        segundos: resumen.segundos,
        medallas,
        creadoEn: new Date().toISOString(),
      })
    }
    // El personaje lo celebra en la casa: la medalla se nota fuera de la app.
    if (medallas.length) festejarAleatorio()
  }

  // Un solo intervalo: repinta el reloj y, al agotarse, cierra la partida SIN
  // tocar la pregunta en el aire (que el reloj te gane no es no sabérsela).
  // Se re-suscribe con cada respuesta para cerrar con el marcador vigente.
  useEffect(() => {
    const fin = partida?.finMs
    if (!fin) return
    const id = setInterval(() => {
      if (restanteS(fin) <= 0) void cerrar(partida)
      else setTick((n) => n + 1)
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cerrar es del render vigente
  }, [partida])

  const empezar = () => {
    const cuantos = reto === 'libre' ? PREGUNTAS_RONDA : LOTE_ABIERTO
    const lista = generarEjercicios(tarjetas, modoEj, cuantos, foco)
    if (!lista.length) return
    const ahora = ahoraMs()
    mostradaMs.current = ahora
    setFin(null)
    setElegida(null)
    setPartida({
      modo: modoEj,
      reto,
      lista,
      idx: 0,
      aciertos: 0,
      puntos: 0,
      combo: 0,
      comboMax: 0,
      vidas: VIDAS_INICIALES,
      inicioMs: ahora,
      ...(reto === 'contrarreloj' ? { finMs: ahora + SEGUNDOS_CONTRARRELOJ * 1000 } : {}),
    })
  }

  const responder = async (i: number) => {
    if (elegida != null || !partida) return
    setElegida(i)
    const e = partida.lista[partida.idx]
    const acierto = i === e.correcta
    const ms = transcurridoMs(mostradaMs.current)
    const hoy = hoyISO()

    // El SRS y la meta diaria se escriben SIEMPRE que la respuesta la elegiste
    // tú (acierto o fallo): eso sí dice algo de si te la sabes.
    if (e.tarjeta.id != null) {
      await tarjetasIdiomaRepo.update(e.tarjeta.id, programarRepaso(e.tarjeta.caja, acierto, hoy))
    }
    if (perfil.id != null) await registrarRepasoDia(perfil.id, hoy, 1, acierto ? 1 : 0)

    setPartida((p) => {
      if (!p) return p
      const combo = acierto ? p.combo + 1 : 0
      return {
        ...p,
        aciertos: p.aciertos + (acierto ? 1 : 0),
        puntos: p.puntos + (acierto ? puntosRespuesta(p.combo, p.reto === 'contrarreloj' ? ms : undefined) : 0),
        combo,
        comboMax: Math.max(p.comboMax, combo),
        vidas: p.reto === 'vidas' && !acierto ? p.vidas - 1 : p.vidas,
      }
    })
    if (e.modo === 'inverso') hablar(e.opciones[e.correcta], perfil.codigo)
  }

  const siguiente = () => {
    if (!partida) return
    const idx = partida.idx + 1
    const sinVidas = partida.reto === 'vidas' && partida.vidas <= 0
    const seAcabo = idx >= partida.lista.length
    if (sinVidas || (seAcabo && partida.reto === 'libre')) {
      void cerrar({ ...partida, idx })
      return
    }
    // Retos abiertos: al agotar el lote se genera otro y la partida sigue.
    const lista = seAcabo ? generarEjercicios(tarjetas, partida.modo, LOTE_ABIERTO, foco) : partida.lista
    if (seAcabo && !lista.length) {
      void cerrar({ ...partida, idx })
      return
    }
    mostradaMs.current = ahoraMs()
    setElegida(null)
    setPartida({ ...partida, lista, idx: seAcabo ? 0 : idx })
  }

  // ----- Portada: modo, reto y misiones -----
  if (!partida) {
    const sinCloze = modoEj === 'cloze' && nCloze === 0
    return (
      <div className="space-y-3">
        {perfil.id != null && <MisionesDia idiomaId={perfil.id} />}

        {fin && <Cierre resumen={fin} onCerrar={() => setFin(null)} />}

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/40">
            {t('idiomas.ej.fuente', 'Qué repasas')}
          </span>
          <select
            value={fuente}
            onChange={(e) => {
              setFuente(e.target.value)
              onTemaAplicado?.()
            }}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-white/30"
            title={t('idiomas.ej.fuenteTip', 'Las tarjetas que entran a la ronda')}
          >
            <option value="hoy">
              {t('idiomas.ej.fuenteHoy', 'Lo que toca hoy ({n})', { n: String(vencidas.length) })}
            </option>
            <option value="todo">
              {t('idiomas.ej.fuenteTodo', 'Todo el vocabulario ({n})', { n: String(tarjetas.length) })}
            </option>
            {/* Solo los temas que ya tienen tarjetas: el resto no daría ronda. */}
            <OpcionesTemas tx={filtrarTemario(tx, (x) => temasConTarjetas.has(x.id))} />
          </select>
        </div>

        <div className="flex gap-1.5">
          {MODOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModoEj(m.id)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                modoEj === m.id ? 'text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
              style={modoEj === m.id ? { background: COLOR } : undefined}
            >
              {t(`idiomas.ej.modo.${m.id}`, m.labelEs)}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {RETOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReto(r.id)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                reto === r.id ? 'text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
              style={reto === r.id ? { background: COLOR } : undefined}
            >
              <Icono nombre={r.icono} /> {t(`idiomas.ej.reto.${r.id}`, r.labelEs)}
            </button>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-white/45">
          {modoEj === 'opcion' && t('idiomas.ej.descOpcion', 'Se muestra un término en {idioma} y eliges su traducción.', { idioma: perfil.nombre })}
          {modoEj === 'inverso' && t('idiomas.ej.descInverso', 'Se muestra la traducción y eliges el término correcto en {idioma}.', { idioma: perfil.nombre })}
          {modoEj === 'cloze' && t('idiomas.ej.descCloze', 'Completa la frase de ejemplo con el término que falta.')}
          {' '}
          {reto === 'libre' && t('idiomas.ej.descLibre', 'Ronda de {n} preguntas, sin prisa.', { n: String(PREGUNTAS_RONDA) })}
          {reto === 'vidas' && t('idiomas.ej.descVidas', 'Sigues mientras te queden vidas: cada fallo cuesta una.')}
          {reto === 'contrarreloj' && t('idiomas.ej.descReloj', 'Todas las que puedas en {n} segundos; responder rápido da puntos extra.', { n: String(SEGUNDOS_CONTRARRELOJ) })}
        </p>

        {tarjetas.length < 4 ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            {t('idiomas.ej.pocas2', 'Necesitas al menos 4 tarjetas de {idioma} para generar ejercicios: créalas en el temario, charlando con tu tutor o pidiéndoselas a la IA.', { idioma: perfil.nombre })}
          </p>
        ) : foco.length === 0 ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            {t('idiomas.ej.temaVacio', 'Ese tema aún no tiene tarjetas. Elige otro o genéralas desde el temario.')}
          </p>
        ) : sinCloze ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            {t('idiomas.ej.sinCloze', 'Ninguna tarjeta tiene frase de ejemplo con su término: agrégales un ejemplo para practicar completar.')}
          </p>
        ) : (
          <button
            type="button"
            onClick={empezar}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-black"
            style={{ background: COLOR }}
          >
            {t('idiomas.ej.empezar', 'Empezar ejercicios')}
          </button>
        )}
      </div>
    )
  }

  // ----- Partida en curso -----
  const e = partida.lista[partida.idx]
  const mult = multiplicador(partida.combo)
  // Se lee en cada repintado (el intervalo de arriba lo provoca), igual que el
  // temporizador de Biblioteca: el reloj vive en el deadline, no en el estado.
  const quedan = partida.finMs != null ? restanteS(partida.finMs) : null
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="flex items-center gap-2">
          <span className="font-bold" style={{ color: COLOR }}>
            <Icono nombre="gema" /> {partida.puntos}
          </span>
          {partida.combo >= 3 && (
            <span className="font-semibold text-amber-300">
              <Icono nombre="racha" /> {partida.combo} ·{' '}
              {t('idiomas.ej.mult', '{n}×', { n: mult.toString().replace('.', ',') })}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-white/45">
          {partida.reto === 'vidas' && (
            <span title={t('idiomas.ej.vidas', '{n} vidas', { n: String(partida.vidas) })}>
              {'❤️'.repeat(Math.max(0, partida.vidas))}
              <span className="opacity-25">{'🖤'.repeat(VIDAS_INICIALES - Math.max(0, partida.vidas))}</span>
            </span>
          )}
          {quedan !== null && (
            <span className={`font-bold tabular-nums ${quedan <= 10 ? 'text-rose-300' : 'text-white/70'}`}>
              <Icono nombre="cronometro" /> {quedan}s
            </span>
          )}
          <span>
            {t('idiomas.rep.marcador', '{aciertos}/{hecho} aciertos', {
              aciertos: String(partida.aciertos),
              hecho: String(partida.idx + (elegida != null ? 1 : 0)),
            })}
          </span>
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
        <p className="text-lg font-semibold leading-snug text-white/95">{e.enunciado}</p>
        {conTTS && (e.modo === 'opcion' || (e.modo === 'cloze' && elegida != null)) && (
          <button
            type="button"
            onClick={() => hablar(e.modo === 'cloze' ? (e.tarjeta.ejemplo ?? e.tarjeta.termino) : e.enunciado, perfil.codigo)}
            className="mt-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm transition hover:bg-white/10"
            title={t('idiomas.voc.escuchar', 'Escuchar')}
          >
            <Icono nombre="bocina" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {e.opciones.map((op, i) => {
          const esCorrecta = elegida != null && i === e.correcta
          const esErrada = elegida === i && i !== e.correcta
          return (
            <button
              key={i}
              type="button"
              onClick={() => void responder(i)}
              disabled={elegida != null}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                esCorrecta
                  ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-100'
                  : esErrada
                    ? 'border-rose-400/50 bg-rose-400/15 text-rose-100'
                    : 'border-white/10 bg-white/5 text-white/85 enabled:hover:bg-white/10'
              }`}
            >
              {op}
            </button>
          )
        })}
      </div>

      {elegida != null && (
        <button
          type="button"
          onClick={siguiente}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-black"
          style={{ background: COLOR }}
        >
          {partida.reto === 'vidas' && partida.vidas <= 0
            ? t('idiomas.ej.verResumen', 'Ver resumen')
            : t('idiomas.ej.siguiente', 'Siguiente')}
        </button>
      )}

      <button
        type="button"
        onClick={() => void cerrar(partida)}
        className="w-full rounded-xl bg-white/5 py-2 text-xs text-white/50 transition hover:bg-white/10"
      >
        {t('idiomas.ej.terminar', 'Terminar la ronda')}
      </button>
    </div>
  )
}

/** Marcador final con las medallas que se llevó la partida. */
function Cierre({
  resumen,
  onCerrar,
}: {
  resumen: ResumenPartida & { medallas: string[] }
  onCerrar: () => void
}) {
  const t = useT()
  const ganadas = MEDALLAS.filter((m) => resumen.medallas.includes(m.id))
  return (
    <div className="space-y-3 rounded-2xl border p-5 text-center" style={{ borderColor: `${COLOR}55`, background: `${COLOR}14` }}>
      <p className="text-3xl font-black" style={{ color: COLOR }}>
        {resumen.puntos}
      </p>
      <p className="text-xs text-white/60">
        {t('idiomas.ej.fin', '{aciertos} de {total} correctas', {
          aciertos: String(resumen.aciertos),
          total: String(resumen.preguntas),
        })}
        {resumen.comboMax >= 3 &&
          ` · ${t('idiomas.ej.mejorCombo', 'mejor racha {n}', { n: String(resumen.comboMax) })}`}
      </p>

      {ganadas.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {ganadas.map((m) => (
            <span
              key={m.id}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-black"
              style={{ background: COLOR }}
            >
              <Icono nombre={m.icono} /> {t(`idiomas.medalla.${m.id}`, m.es)}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onCerrar}
        className="rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold transition hover:bg-white/15"
      >
        {t('idiomas.rep.listo', 'Listo')}
      </button>
    </div>
  )
}
