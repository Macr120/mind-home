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
}: {
  paso: PasoHoy
  plantillaId: string
  fecha: string
  color: string
  onAgendar?: (paso: PasoHoy) => void
  onDescartar?: (paso: PasoHoy) => void
}) {
  const t = useT()
  const { accion } = paso

  const alternar = async () => {
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

  const irARegistrar = () => lanzarIntencionApp({ appId: plantillaId, seccion: paso.seccion })

  return (
    <div
      data-tut={`hoy.fila.${paso.id}`}
      className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition ${
        paso.urgente ? 'ui-pop border border-amber-400/40 bg-amber-400/10' : 'hover:bg-white/5'
      }`}
    >
      {/* Apagado no se palomea: no hay nada que cumplir hasta que tenga cifra. */}
      <button
        type="button"
        onClick={() => void alternar()}
        disabled={paso.apagado}
        title={
          paso.hecho ? t('meta.desmarcar', 'Marcar como no cumplida') : t('meta.marcar', 'Marcar como cumplida')
        }
        className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] transition ${
          paso.hecho
            ? 'border-transparent bg-emerald-400/25 text-emerald-300'
            : 'border-white/25 text-transparent hover:border-white/50'
        } disabled:border-dashed disabled:hover:border-white/25`}
      >
        <Icono nombre="confirmar" />
      </button>

      {/* Tocar el paso lleva a donde se registra: la sección la puso quien lo creó. */}
      <button
        type="button"
        onClick={irARegistrar}
        disabled={!paso.seccion}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <p className={`truncate text-xs font-semibold ${paso.hecho ? 'text-white/40 line-through' : 'text-white/85'}`}>
          {paso.urgente && <Icono nombre="alarma" />} {paso.titulo}
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
        {/* Barra solo donde hay cuenta que llevar: en un sí/no no dice nada. */}
        {paso.origen === 'objetivo' && !paso.hecho && paso.detalle && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round(paso.frac * 100)}%`, background: color }}
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
