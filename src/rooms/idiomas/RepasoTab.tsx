import { useState } from 'react'
import type { PerfilIdioma, TarjetaIdioma } from '../../core/data/db'
import { registrarRepasoDia, tarjetasIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { actividadId } from '../../core/rutinas'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { programarRepaso, tarjetasVencidas } from './srs'
import { barajar, generarEjercicios, tarjetasConCloze, type Ejercicio, type ModoEjercicio } from './ejercicios'
import { hablar, hayTTS } from './tts'
import { hoyISO } from './stats'
import { VistaBlob } from '../_shared/ImagenIA'

/** Sesión de repaso de tarjetas: cola local (las falladas vuelven al final). */
interface Sesion {
  cola: number[]
  hecho: number
  aciertos: number
  /** Repaso libre (sin vencidas): acertar NO adelanta el próximo repaso. */
  libre: boolean
}

export function RepasoTab({ perfil }: { perfil: PerfilIdioma }) {
  const t = useT()
  const tarjetas = (tarjetasIdiomaRepo.useAll() ?? []).filter((x) => x.idiomaId === perfil.id)
  const [modo, setModo] = useState<'tarjetas' | 'ejercicios'>('tarjetas')

  const pill = (activo: boolean) =>
    `flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      activo ? 'text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
    }`

  return (
    <div className="space-y-3" data-tut="idiomas.repaso.panel">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setModo('tarjetas')}
          className={pill(modo === 'tarjetas')}
          style={modo === 'tarjetas' ? { background: COLOR } : undefined}
        >
          {t('idiomas.rep.modoTarjetas', 'Tarjetas')}
        </button>
        <button
          type="button"
          onClick={() => setModo('ejercicios')}
          className={pill(modo === 'ejercicios')}
          style={modo === 'ejercicios' ? { background: COLOR } : undefined}
        >
          {t('idiomas.rep.modoEjercicios', 'Ejercicios')}
        </button>
      </div>

      {/* Sin registro rápido a propósito: la meta la pone el SRS y se cumple cuando
          no quedan tarjetas vencidas. Un «repasé» de un toque no repasa ninguna
          carta: sería declararse estudiado sin estudiar. El aviso lleva al mazo. */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-white/50">
          {t('idiomas.rep.reservar', 'Tu rato de repaso')}
        </span>
        <HorarioActividad
          actividad={{
            actividadId: actividadId('idioma', perfil.id!),
            plantillaId: 'idiomas',
            nombre: t('idiomas.rep.bloque', 'Repasar {idioma}', { idioma: perfil.nombre }),
            emoji: '🌐',
            horaSugerida: '20:00',
            seccion: 'repaso',
          }}
          hechoHoy={tarjetasVencidas(tarjetas, hoyISO()).length === 0}
        />
      </div>

      {modo === 'tarjetas' ? <RepasoTarjetas perfil={perfil} tarjetas={tarjetas} /> : <Ejercicios perfil={perfil} tarjetas={tarjetas} />}
    </div>
  )
}

function RepasoTarjetas({ perfil, tarjetas }: { perfil: PerfilIdioma; tarjetas: TarjetaIdioma[] }) {
  const t = useT()
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [revelado, setRevelado] = useState(false)

  const conTTS = hayTTS()
  const vencidas = tarjetasVencidas(tarjetas)
  const actual = sesion ? tarjetas.find((x) => x.id === sesion.cola[0]) : undefined

  const empezar = (libre: boolean) => {
    const base = libre ? barajar(tarjetas).slice(0, 20) : vencidas
    const cola = base.map((x) => x.id).filter((n): n is number => n != null)
    if (!cola.length) return
    setRevelado(false)
    setSesion({ cola, hecho: 0, aciertos: 0, libre })
  }

  const responder = async (acierto: boolean) => {
    if (!sesion || actual?.id == null) return
    const id = actual.id
    setRevelado(false)
    const hoy = hoyISO()
    // En repaso libre acertar no adelanta el intervalo (no inflar el SRS);
    // fallar sí castiga: esa tarjeta no estaba tan dominada.
    if (!sesion.libre || !acierto) {
      await tarjetasIdiomaRepo.update(id, programarRepaso(actual.caja, acierto, hoy))
    }
    if (perfil.id != null) await registrarRepasoDia(perfil.id, hoy, 1, acierto ? 1 : 0)
    setSesion((s) => {
      if (!s) return s
      const resto = s.cola.slice(1)
      return {
        ...s,
        cola: acierto ? resto : [...resto, id],
        hecho: s.hecho + 1,
        aciertos: s.aciertos + (acierto ? 1 : 0),
      }
    })
  }

  // Pantalla de cierre de la sesión.
  if (sesion && sesion.cola.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-2 text-sm font-semibold text-white/90">
          {t('idiomas.rep.fin', '¡Sesión terminada!')}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {t('idiomas.rep.finDetalle', '{aciertos} aciertos de {total} respuestas', {
            aciertos: String(sesion.aciertos),
            total: String(sesion.hecho),
          })}
        </p>
        <button
          type="button"
          onClick={() => setSesion(null)}
          className="mt-4 rounded-xl px-6 py-2 text-sm font-semibold text-black"
          style={{ background: COLOR }}
        >
          {t('idiomas.rep.listo', 'Listo')}
        </button>
      </div>
    )
  }

  // Carta de la sesión activa.
  if (sesion && actual) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>
            {sesion.libre
              ? t('idiomas.rep.libreTag', 'Repaso libre')
              : t('idiomas.rep.quedan', 'Quedan {n}', { n: String(sesion.cola.length) })}
          </span>
          <span>
            {t('idiomas.rep.marcador', '{aciertos}/{hecho} aciertos', {
              aciertos: String(sesion.aciertos),
              hecho: String(sesion.hecho),
            })}
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-[10px] uppercase tracking-wide text-white/35">
            {actual.nivel} · {t(`idiomas.tipo.${actual.tipo}`, actual.tipo)}
          </p>
          <p className="mt-3 text-2xl font-bold text-white/95">{actual.termino}</p>
          {conTTS && (
            <button
              type="button"
              onClick={() => hablar(actual.termino, perfil.codigo)}
              className="mt-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm transition hover:bg-white/10"
              title={t('idiomas.voc.escuchar', 'Escuchar')}
            >
              <Icono nombre="bocina" />
            </button>
          )}

          {revelado ? (
            <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
              <p className="text-lg text-white/90">{actual.traduccion}</p>
              {actual.imagen && (
                <VistaBlob blob={actual.imagen} className="mx-auto mt-2 h-28 w-28 rounded-xl" />
              )}
              {actual.ejemplo && <p className="text-xs italic text-white/45">{actual.ejemplo}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevelado(true)}
              className="mt-5 w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold transition hover:bg-white/15"
            >
              {t('idiomas.rep.mostrar', 'Mostrar respuesta')}
            </button>
          )}
        </div>

        {revelado && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void responder(false)}
              className="flex-1 rounded-xl border border-rose-400/30 bg-rose-400/10 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20"
            >
              {t('idiomas.rep.noSabia', 'No la sabía')}
            </button>
            <button
              type="button"
              onClick={() => void responder(true)}
              className="flex-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
            >
              {t('idiomas.rep.siSabia', 'La sabía')}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSesion(null)}
          className="w-full rounded-xl bg-white/5 py-2 text-xs text-white/50 transition hover:bg-white/10"
        >
          {t('idiomas.rep.salir', 'Terminar por hoy')}
        </button>
      </div>
    )
  }

  // Portada: qué hay para hoy.
  return (
    <div className="rounded-2xl border border-white/10 p-5 text-center" style={{ background: `${COLOR}18` }}>
      {vencidas.length > 0 ? (
        <>
          <p className="text-3xl font-black text-white/95">{vencidas.length}</p>
          <p className="mt-1 text-xs text-white/55">
            {t('idiomas.rep.paraHoy', 'tarjetas para repasar hoy en {idioma}', { idioma: perfil.nombre })}
          </p>
          <button
            type="button"
            onClick={() => empezar(false)}
            className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-black"
            style={{ background: COLOR }}
          >
            <Icono nombre="repetir" /> {t('idiomas.rep.empezar', 'Empezar repaso')}
          </button>
        </>
      ) : (
        <>
          <p className="text-3xl">🎉</p>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            {tarjetas.length === 0
              ? t('idiomas.rep.sinTarjetas', 'Aún no hay tarjetas que repasar: crea vocabulario en la pestaña Vocabulario o charlando con tu tutor.')
              : t('idiomas.rep.alDia', 'Estás al día: ninguna tarjeta vencida. Vuelve mañana o haz un repaso libre.')}
          </p>
          {tarjetas.length > 0 && (
            <button
              type="button"
              onClick={() => empezar(true)}
              className="mt-4 w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold transition hover:bg-white/15"
            >
              <Icono nombre="repetir" /> {t('idiomas.rep.libre', 'Repaso libre')}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Ejercicios({ perfil, tarjetas }: { perfil: PerfilIdioma; tarjetas: TarjetaIdioma[] }) {
  const t = useT()
  const [modoEj, setModoEj] = useState<ModoEjercicio>('opcion')
  const [ejercicios, setEjercicios] = useState<Ejercicio[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [elegida, setElegida] = useState<number | null>(null)
  const [aciertos, setAciertos] = useState(0)

  const conTTS = hayTTS()
  const nCloze = tarjetasConCloze(tarjetas).length
  const MODOS: { id: ModoEjercicio; labelEs: string }[] = [
    { id: 'opcion', labelEs: '¿Qué significa?' },
    { id: 'inverso', labelEs: 'Al revés' },
    { id: 'cloze', labelEs: 'Completar' },
  ]

  const empezar = () => {
    const lista = generarEjercicios(tarjetas, modoEj, 10)
    if (!lista.length) return
    setEjercicios(lista)
    setIdx(0)
    setElegida(null)
    setAciertos(0)
  }

  const responder = async (i: number) => {
    if (elegida != null || !ejercicios) return
    setElegida(i)
    const e = ejercicios[idx]
    const acierto = i === e.correcta
    if (acierto) setAciertos((n) => n + 1)
    const hoy = hoyISO()
    if (e.tarjeta.id != null) {
      await tarjetasIdiomaRepo.update(e.tarjeta.id, programarRepaso(e.tarjeta.caja, acierto, hoy))
    }
    if (perfil.id != null) await registrarRepasoDia(perfil.id, hoy, 1, acierto ? 1 : 0)
    // Al revés: se escucha el término correcto al resolver.
    if (e.modo === 'inverso') hablar(e.opciones[e.correcta], perfil.codigo)
  }

  // Selección de modo / portada.
  if (!ejercicios) {
    const sinCloze = modoEj === 'cloze' && nCloze === 0
    return (
      <div className="space-y-3">
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

        <p className="text-xs leading-relaxed text-white/45">
          {modoEj === 'opcion' && t('idiomas.ej.descOpcion', 'Se muestra un término en {idioma} y eliges su traducción.', { idioma: perfil.nombre })}
          {modoEj === 'inverso' && t('idiomas.ej.descInverso', 'Se muestra la traducción y eliges el término correcto en {idioma}.', { idioma: perfil.nombre })}
          {modoEj === 'cloze' && t('idiomas.ej.descCloze', 'Completa la frase de ejemplo con el término que falta.')}
        </p>

        {tarjetas.length < 4 ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
            {t('idiomas.ej.pocas', 'Necesitas al menos 4 tarjetas de {idioma} para generar ejercicios.', { idioma: perfil.nombre })}
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

  // Resumen final.
  if (idx >= ejercicios.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-3xl">{aciertos === ejercicios.length ? '🏆' : '🎉'}</p>
        <p className="mt-2 text-sm font-semibold text-white/90">
          {t('idiomas.ej.fin', '{aciertos} de {total} correctas', {
            aciertos: String(aciertos),
            total: String(ejercicios.length),
          })}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setEjercicios(null)}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            {t('idiomas.ej.cambiarModo', 'Cambiar modo')}
          </button>
          <button
            type="button"
            onClick={empezar}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-black"
            style={{ background: COLOR }}
          >
            {t('idiomas.ej.otraRonda', 'Otra ronda')}
          </button>
        </div>
      </div>
    )
  }

  const e = ejercicios[idx]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span>{idx + 1} / {ejercicios.length}</span>
        <span>{t('idiomas.rep.marcador', '{aciertos}/{hecho} aciertos', { aciertos: String(aciertos), hecho: String(idx + (elegida != null ? 1 : 0)) })}</span>
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
          onClick={() => {
            setIdx((n) => n + 1)
            setElegida(null)
          }}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-black"
          style={{ background: COLOR }}
        >
          {idx + 1 < ejercicios.length
            ? t('idiomas.ej.siguiente', 'Siguiente')
            : t('idiomas.ej.verResumen', 'Ver resumen')}
        </button>
      )}
    </div>
  )
}
