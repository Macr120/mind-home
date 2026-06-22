import { useState, useEffect } from 'react'
import type { ObjetoCuarto } from '../../data/db'
import { getPlantilla } from '../../registry'
import { useCuartos, getCuarto } from '../../state/cuartosStore'
import { useAsignar } from '../../state/asignarStore'
import {
  useDiseño,
  objetosDeCuarto,
} from '../../state/disenoStore'
import { esMueblePrincipal } from '../../house/muebles'
import { MODELOS, recursosModelables } from '../../house/modelosRecursos'
import { RECURSOS, recursoIdEnTema } from '../../house/recursos'
import { CATALOGO } from '../../house/catalogo'
import { getTema } from '../../house/temas'
import { MiniaturaModelo } from '../../house/Miniatura'
import { PropiedadesObjeto } from './PropiedadesObjeto'
import { useT } from '../../i18n/useT'

const nombreRecurso = (id: number) =>
  RECURSOS.find((r) => r.id === id)?.nombre ?? `Recurso ${id}`

/** Nombre legible de un objeto colocado. */
function nombreObjeto(o: ObjetoCuarto): string {
  if (o.tipo.startsWith('recurso:')) {
    const id = Number(o.tipo.slice('recurso:'.length))
    return nombreRecurso(id)
  }
  const item = CATALOGO.find((i) => i.id === o.tipo)
  if (item) return item.nombre
  return 'Objeto'
}

export function ObjetosTab({
  roomId: roomIdProp,
  onRoomChange,
  embed,
}: {
  /** Si se pasa, el cuarto lo controla el padre (editor 3D). */
  roomId?: string
  onRoomChange?: (id: string) => void
  embed?: boolean
}) {
  const t = useT()
  const cuartos = useCuartos((s) => s.cuartos)
  const [roomIdLocal, setRoomIdLocal] = useState(cuartos[0]?.id ?? '')
  const roomId = roomIdProp ?? roomIdLocal
  const setRoomId = (id: string) => {
    if (onRoomChange) onRoomChange(id)
    else setRoomIdLocal(id)
  }
  const abrirAsignar = useAsignar((s) => s.abrir)
  const setObjetoPlantilla = useDiseño((s) => s.setObjetoPlantilla)
  const { objetos, addObjeto, removeObjeto, setObjetoPrincipal } = useDiseño()
  const seleccion = useDiseño((s) => s.seleccion)
  const toggleSeleccion = useDiseño((s) => s.toggleSeleccion)
  const clearSeleccion = useDiseño((s) => s.clearSeleccion)
  const agrupar = useDiseño((s) => s.agrupar)
  const desagrupar = useDiseño((s) => s.desagrupar)

  useEffect(() => { clearSeleccion() }, [roomId, clearSeleccion])

  const tema = getTema(useDiseño((s) => s.temaGlobal))
  const room = getCuarto(roomId)
  const colocados = objetosDeCuarto(objetos, roomId)
  const recursosRoom = recursosModelables(roomId).filter((id) =>
    recursoIdEnTema(id, tema?.id ?? null),
  )
  const nombreCorto = (room?.nombre ?? '').split(' · ')[0]

  return (
    <div className="space-y-5">
      {embed && (
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'editor.obj.desc',
            'Arrastra los objetos en la escena 3D. Marca con ★ el punto de entrada del cuarto.',
          )}
        </p>
      )}
      {!roomIdProp && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">
            {t('editor.obj.cuarto', 'Cuarto')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cuartos.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoomId(r.id)}
                className="rounded-lg px-2 py-1.5 text-sm transition"
                style={{
                  background: roomId === r.id ? `${r.color}33` : 'rgba(255,255,255,0.05)',
                  boxShadow: roomId === r.id ? `inset 0 0 0 1px ${r.color}` : 'none',
                }}
                title={r.nombre}
              >
                {r.icon}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-white/80">
            {room?.icon} {nombreCorto}
          </p>
        </div>
      )}

      {recursosRoom.length > 0 && (
        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="mb-3 text-sm font-semibold">
            {t('editor.obj.agregar', `Agregar a ${nombreCorto}`, { room: nombreCorto })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {recursosRoom.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => addObjeto(roomId, `recurso:${id}`, MODELOS[id].defaultColor)}
                className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-2.5 text-xs transition hover:bg-white/10"
                title={nombreRecurso(id)}
              >
                <MiniaturaModelo
                  tipo={`recurso:${id}`}
                  color={MODELOS[id].defaultColor}
                  tema={tema}
                  className="h-14 w-full object-contain"
                />
                <span className="line-clamp-2 text-center leading-tight text-white/70">
                  {nombreRecurso(id)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="mb-3 text-sm font-semibold">{t('editor.obj.deco', 'Decoración genérica')}</p>
        <div className="grid grid-cols-3 gap-2">
          {CATALOGO.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addObjeto(roomId, item.id, item.defaultColor)}
              className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-2.5 text-xs transition hover:bg-white/10"
            >
              <MiniaturaModelo
                tipo={item.id}
                color={item.defaultColor}
                tema={tema}
                className="h-14 w-full object-contain"
              />
              <span className="text-white/70">{item.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-white/40">
          {t('editor.obj.colocados', `Objetos del cuarto (${colocados.length})`, {
            n: String(colocados.length),
          })}
        </p>
        {colocados.length === 0 ? (
          <p className="text-xs text-white/35">
            {t('editor.obj.vacio', 'Sin objetos. Agrega uno arriba.')}
          </p>
        ) : (
          colocados.map((o) => {
            const enSel = o.id != null && seleccion.includes(o.id)
            const esPrincipal = esMueblePrincipal(o)
            const puedeBorrar = colocados.length > 1
            const plant = o.plantillaId ? getPlantilla(o.plantillaId) : undefined
            return (
              <div
                key={o.id}
                className={`rounded-xl bg-white/5 p-3 border transition-colors ${enSel ? 'border-emerald-400/50' : esPrincipal ? 'border-amber-400/30' : 'border-white/10'}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  {o.grupoId ? (
                    <button
                      onClick={() => desagrupar(o.grupoId!)}
                      className="flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-bold text-emerald-400/80 ring-1 ring-emerald-400/40 transition hover:bg-emerald-400/10"
                      title={t('editor.inv.desagrupar', 'Desagrupar')}
                    >
                      🔗
                    </button>
                  ) : (
                    <input
                      type="checkbox"
                      checked={enSel}
                      onChange={() => o.id != null && toggleSeleccion(o.id)}
                      className="flex-shrink-0 accent-emerald-400 cursor-pointer"
                    />
                  )}
                  <MiniaturaModelo
                    tipo={o.tipo}
                    color={o.color}
                    tema={tema}
                    className="h-10 w-10 shrink-0 rounded-lg bg-black/25 object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {nombreObjeto(o)}
                  </span>
                  <button
                    type="button"
                    onClick={() => o.id != null && setObjetoPrincipal(o.id)}
                    disabled={esPrincipal}
                    className={`flex-shrink-0 text-lg leading-none transition ${
                      esPrincipal
                        ? 'text-amber-300 cursor-default'
                        : 'text-white/25 hover:text-amber-300'
                    }`}
                    title={
                      esPrincipal
                        ? t('editor.obj.esPrincipal', 'Objeto principal (entrada al cuarto)')
                        : t('editor.obj.marcarPrincipal', 'Marcar como objeto principal')
                    }
                  >
                    {esPrincipal ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    onClick={() => o.id != null && removeObjeto(o.id)}
                    disabled={!puedeBorrar}
                    className={`flex-shrink-0 text-sm transition ${
                      puedeBorrar
                        ? 'text-white/30 hover:text-red-400'
                        : 'cursor-not-allowed text-white/15'
                    }`}
                    title={
                      puedeBorrar
                        ? t('editor.obj.quitar', 'Quitar')
                        : t('editor.obj.ultimoObjeto', 'Debe quedar al menos un objeto en el cuarto')
                    }
                  >
                    ✕
                  </button>
                </div>

                {/* App (plantilla) asignada al objeto */}
                <div className="mb-2 flex items-center gap-2">
                  {plant ? (
                    <>
                      <span
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold"
                        style={{ background: `${plant.color}22`, color: '#fff' }}
                      >
                        <span className="text-sm leading-none">{plant.icon}</span>
                        <span className="truncate">
                          {t(`room.${plant.id}.nombre`, plant.nombre).split(' · ')[0]}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => o.id != null && abrirAsignar(roomId, o.id)}
                        className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                      >
                        {t('editor.obj.cambiarApp', 'Cambiar')}
                      </button>
                      <button
                        type="button"
                        onClick={() => o.id != null && setObjetoPlantilla(o.id, null)}
                        title={t('editor.obj.quitarApp', 'Quitar app')}
                        className="shrink-0 rounded-md px-1.5 py-1 text-[11px] text-white/30 transition hover:text-red-400"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => o.id != null && abrirAsignar(roomId, o.id)}
                      className="w-full rounded-md border border-dashed border-white/20 py-1.5 text-[11px] font-semibold text-white/55 transition hover:border-white/40 hover:text-white/80"
                    >
                      {t('editor.obj.asignarApp', '+ Asignar app a este objeto')}
                    </button>
                  )}
                </div>

                <PropiedadesObjeto objeto={o} />
              </div>
            )
          })
        )}
        {seleccion.length >= 2 && (
          <button
            onClick={agrupar}
            className="w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-400/20"
          >
            {t('editor.obj.agrupar', `🔗 Agrupar seleccionados (${seleccion.length})`, {
              n: String(seleccion.length),
            })}
          </button>
        )}
      </div>
    </div>
  )
}
