import { sonar } from '../../audio/sfx'
import { vibrar } from '../../audio/vibrar'
import { fijarObjetivoDiario } from '../../data/repository'
import type { PasoHoy } from '../../hoy'
import { useT } from '../../i18n/useT'
import { claveObjetivoDiario, marcarMetaDiaria, volverAutomatico } from '../../metaDiaria'
import { toggleMeta, togglePasoMeta } from '../../metas'
import { registrarEsquema, toggleHecho, togglePaso } from '../../rutinas'
import { lanzarIntencionApp } from '../../state/intencionApp'
import { Icono } from '../iconos/Icono'

/**
 * Un paso de hoy. La palomita de la izquierda existe para los casos raros («lo
 * hice y no lo registré»), pero el camino normal es el botón de registro: escribe
 * el dato REAL en la app, y el paso se tacha solo porque ese dato ya existe.
 *
 * Por eso el botón solo está mientras el paso sigue pendiente: volver a pulsarlo
 * ya cumplido escribiría un segundo vaso de agua que nadie se bebió.
 */
export function FilaHoy({
  paso,
  plantillaId,
  fecha,
  color,
  onAgendar,
  onDescartar,
  onIr,
  onAnadir,
}: {
  paso: PasoHoy
  plantillaId: string
  fecha: string
  color: string
  onAgendar?: (paso: PasoHoy) => void
  onDescartar?: (paso: PasoHoy) => void
  /**
   * Llevar a la app en vez de registrar aquí. Lo pasa la lista de TODA la casa
   * (el botón rojo del calendario): allí no estás dentro de ninguna app, así que
   * registrar de un toque escribiría a ciegas en un cuarto que no tienes
   * delante. Con esto puesto, la fila se convierte en un enlace a su sección.
   */
  onIr?: (paso: PasoHoy) => void
  /**
   * Abrir el catálogo de sugerencias de la app. Solo lo usa la misión de ARRANQUE
   * (`sinMisiones`), que se cumple creando una misión y no palomeándola.
   */
  onAnadir?: () => void
}) {
  const t = useT()
  const { accion } = paso
  const arranque = accion.tipo === 'sinMisiones'

  const alternar = async () => {
    // La misión de arranque no se palomea: su palomita va deshabilitada y solo
    // desaparece cuando la app ya tiene misiones de verdad.
    if (accion.tipo === 'sinMisiones') return
    // Sonido de logro SOLO al completar (despalomar es corregir, no celebrar);
    // lo gobierna el volumen de SFX (a 0, silencio).
    if (!paso.hecho) {
      sonar('anotacion')
      vibrar(15)
    }
    if (accion.tipo === 'objetivo') {
      await marcarMetaDiaria(accion.plantillaId, fecha, !paso.hecho, accion.clave)
    } else if (accion.tipo === 'rutina') {
      if (accion.idx == null) await toggleHecho(accion.rutina, fecha)
      else await togglePaso(accion.rutina, accion.idx)
    } else if (accion.idx == null) {
      await toggleMeta(accion.meta)
    } else {
      await togglePasoMeta(accion.meta, accion.idx)
    }
  }

  // Registro de un toque: el objetivo trae su esquema; un paso agendado ya sabe
  // registrarse solo al marcarse (ver `togglePaso`).
  const registro =
    accion.tipo === 'objetivo'
      ? accion.registro
      : accion.tipo === 'rutina' && accion.idx != null && accion.rutina.pasos[accion.idx]?.esquemaId
        ? { clave: 'hoy.registrar', etiquetaEs: 'Registrar' }
        : undefined

  const registrar = async () => {
    if (accion.tipo === 'objetivo' && accion.registro) {
      await registrarEsquema(
        accion.plantillaId,
        accion.registro.esquemaId,
        accion.registro.valores,
        fecha,
      )
    } else if (accion.tipo === 'rutina' && accion.idx != null) {
      await togglePaso(accion.rutina, accion.idx)
    }
  }

  const irARegistrar = () => {
    // La misión de arranque no lleva a ninguna sección: abre el catálogo de
    // sugerencias aquí mismo. En la lista de toda la casa manda `onIr`, que sí
    // tiene a dónde ir (el cuarto), y allí el catálogo no está montado.
    if (arranque && !onIr && onAnadir) {
      onAnadir()
      return
    }
    if (onIr) onIr(paso)
    else lanzarIntencionApp({ appId: plantillaId, seccion: paso.seccion })
  }

  return (
    <div
      data-tut={`hoy.fila.${paso.id}`}
      className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition ${
        paso.urgente ? 'ui-pop border border-amber-400/40 bg-amber-400/10' : 'hover:bg-white/5'
      }`}
    >
      {/* En la lista de toda la casa, lo PENDIENTE no se palomea: ahí no se cumple
          nada a mano, se va a la app. El botón de ir ocupa EXACTAMENTE el hueco de
          la palomita —mismo tamaño y mismo sitio— para que las dos columnas sigan
          alineadas fila a fila. Lo ya cumplido conserva su palomita, que es como se
          deshace un palomeo equivocado. */}
      {onIr && !paso.hecho ? (
        <button
          type="button"
          onClick={irARegistrar}
          title={t('hoy.irApp', 'Ir a la app a registrarlo')}
          className="grid size-5 shrink-0 place-items-center rounded-full border text-[10px] transition hover:brightness-125"
          style={{ borderColor: `${color}66`, color }}
        >
          <Icono nombre="derecha" />
        </button>
      ) : (
      <button
        type="button"
        onClick={() => void alternar()}
        disabled={paso.apagado || arranque}
        title={
          arranque
            ? t('hoy.primera.como', 'Se cumple sola en cuanto le pongas su primera misión')
            : paso.hecho
              ? t('meta.desmarcar', 'Marcar como no cumplida')
              : t('meta.marcar', 'Marcar como cumplida')
        }
        className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] transition ${
          paso.hecho
            ? 'border-transparent bg-emerald-400/25 text-emerald-300'
            : 'border-white/25 text-transparent hover:border-white/50'
        } disabled:border-dashed disabled:hover:border-white/25`}
      >
        <Icono nombre="confirmar" />
      </button>
      )}

      {/* Tocar el paso lleva a donde se registra: la sección la puso quien lo creó. */}
      <button
        type="button"
        onClick={irARegistrar}
        // Con `onIr` siempre se puede ir: sin sección se abre la portada de la
        // app, que ya es más de lo que hacía antes (nada). La de arranque abre el
        // catálogo, así que tampoco necesita sección.
        disabled={!onIr && !paso.seccion && !(arranque && onAnadir)}
        className="min-w-0 flex-1 text-start disabled:cursor-default"
      >
        <p className={`truncate text-xs font-semibold ${paso.hecho ? 'text-white/40 line-through' : 'text-white/85'}`}>
          {paso.urgente && <Icono nombre="alarma" />}
          {paso.emoji && <Icono emoji={paso.emoji} />} {paso.titulo}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          {paso.hora && <span className="shrink-0 tabular-nums">{paso.hora}</span>}
          {paso.apagado && <span className="truncate">{t('meta.apagada', 'Sin objetivo')}</span>}
          {paso.detalle && <span className="truncate">{paso.detalle}</span>}
          {paso.deQuien && <span className="truncate italic">· {paso.deQuien}</span>}
          {paso.manual && (
            <span className="shrink-0 rounded bg-white/10 px-1 text-white/50">{t('meta.aMano', 'a mano')}</span>
          )}
        </div>
        {/* La barra del día va en TODAS las filas, no solo en las que llevan cuenta:
            es lo que le da un pulso a la lista de un vistazo. En un sí/no marca 0 o
            100, y ahí el riel vacío ya dice «esto sigue pendiente». Solo se calla
            en un objetivo apagado, que no tiene nada que cumplir. */}
        {!paso.apagado && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round(paso.frac * 100)}%`,
                background: paso.hecho ? 'rgb(52 211 153)' : color,
              }}
            />
          </div>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {accion.tipo === 'objetivo' && accion.ajustable && (
          <input
            type="number"
            data-tut="hoy.objetivo"
            min={0}
            value={accion.objetivo}
            onChange={(e) =>
              void fijarObjetivoDiario(
                accion.plantillaId,
                Math.max(0, Number(e.target.value)),
                claveObjetivoDiario(accion.plantillaId, accion.clave),
              )
            }
            title={t('hoy.objetivo', 'Tu objetivo de cada día (0 lo apaga)')}
            className="w-12 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[10px] tabular-nums text-white/60 focus:outline-none"
          />
        )}
        {/* Fuera de la app no se registra: se va a donde se registra, y de eso ya
            se encarga el botón que ocupa el hueco de la palomita. */}
        {onIr ? null : (
          <>
            {!paso.hecho && !paso.apagado && registro && (
              <button
                type="button"
                data-tut="hoy.registrar"
                onClick={() => void registrar()}
                className="rounded-lg px-2 py-1 text-[11px] font-bold texto-cta transition hover:brightness-110"
                style={{ background: color }}
              >
                {t(registro.clave, registro.etiquetaEs)}
              </button>
            )}
            {paso.urgente && !registro && paso.seccion && (
              <button
                type="button"
                onClick={irARegistrar}
                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-white/70 transition hover:text-white"
              >
                {t('avisoAct.ir', 'Ir a registrar')}
              </button>
            )}
          </>
        )}
        {paso.urgente && onDescartar && (
          <button
            type="button"
            onClick={() => onDescartar(paso)}
            title={t('avisoAct.ahoraNo', 'Ahora no')}
            className="rounded-lg px-1.5 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        )}
        {paso.manual && accion.tipo === 'objetivo' && (
          <button
            type="button"
            onClick={() => void volverAutomatico(accion.plantillaId, fecha, accion.clave)}
            title={t('meta.auto', 'Volver a automático')}
            className="rounded-lg px-1.5 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="restaurar" />
          </button>
        )}
        {onAgendar && accion.tipo === 'objetivo' && (
          <button
            type="button"
            data-tut="hoy.agendar"
            onClick={() => onAgendar(paso)}
            title={t('meta.agendar', 'Agendar en el calendario')}
            className="rounded-lg px-1.5 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="calendario" />
          </button>
        )}
      </div>
    </div>
  )
}
