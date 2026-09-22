import { useCallback, useEffect, useState } from 'react'
import { BotonPeligro, BotonSecundario, Modal } from '../../../rooms/_shared/ui'
import { useContactosAceptados } from '../../buzon/cache'
import { enviar as enviarPorBuzon } from '../../buzon/motor'
import { compartirTexto } from '../../compartir'
import { Retrato } from '../../buzon/ui/Retrato'
import { useT } from '../../i18n/useT'
import { confirmar, pedirTexto } from '../../state/confirmarStore'
import { EMOJIS } from '../../ui/iconos/catalogo'
import { Icono } from '../../ui/iconos/Icono'
import * as api from '../api'
import { refrescarEspacios } from '../conectar'
import { enlaceEspacio } from '../enlaces'
import { useEspaciosStore } from '../espaciosStore'
import { espacioAbierto } from '../motor'
import { ICONO_TIPO, type Espacio, type MiembroEspacio, type RolEspacio } from '../tipos'

/**
 * Quién tiene acceso a un espacio y por dónde: miembros con su papel, los dos
 * enlaces (ver / editar) y las acciones que solo puede hacer su dueño.
 *
 * El estado se pide al servidor al abrir el panel, no a la caché: los TOKENS no
 * se guardan nunca en el dispositivo.
 */
export function PanelCompartir({ espacioId, onCerrar }: { espacioId: string; onCerrar: () => void }) {
  const t = useT()
  const [esp, setEsp] = useState<Espacio | null>(null)
  const [miembros, setMiembros] = useState<MiembroEspacio[]>([])
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState<'ver' | 'editar' | null>(null)
  /** Enlace a la vista cuando ni compartir ni el portapapeles funcionaron. */
  const [enlaceManual, setEnlaceManual] = useState<string | null>(null)
  const [invitando, setInvitando] = useState(false)
  const contactos = useContactosAceptados()
  const vivo = useEspaciosStore((s) => s.vivos[espacioId])
  const presentes = vivo?.presentes ?? []

  const recargar = useCallback(async () => {
    try {
      const r = await api.estado(espacioId)
      setEsp(r.espacio)
      setMiembros(r.miembros)
      setError('')
    } catch (e) {
      setError(api.mensajeErrorEspacio(e, t))
    }
  }, [espacioId, t])

  // La carga inicial va inline y no por `recargar`: dentro de un efecto el
  // `setState` tiene que colgar de la promesa, no correr en su cuerpo.
  useEffect(() => {
    let montado = true
    void api
      .estado(espacioId)
      .then((r) => {
        if (!montado) return
        setEsp(r.espacio)
        setMiembros(r.miembros)
      })
      .catch((e: unknown) => {
        if (montado) setError(api.mensajeErrorEspacio(e, t))
      })
    return () => {
      montado = false
    }
  }, [espacioId, t])

  // Si el espacio está abierto, el panel sigue sus cambios en vivo.
  useEffect(() => {
    const abierto = espacioAbierto(espacioId)
    if (!abierto) return
    const bajas = [
      abierto.on('miembros', () => void recargar()),
      abierto.on('meta', () => void recargar()),
    ]
    return () => {
      for (const baja of bajas) baja()
    }
  }, [espacioId, recargar])

  const soyDueno = esp?.rol === 'dueno'

  /** Envuelve una acción: un solo sitio para el «ocupado» y el error traducido. */
  const accion = async (fn: () => Promise<void>) => {
    setOcupado(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(api.mensajeErrorEspacio(e, t))
    } finally {
      setOcupado(false)
    }
  }

  const renombrar = () =>
    accion(async () => {
      if (!esp) return
      const nuevo = await pedirTexto({
        titulo: t('esp.panel.renombrar', 'Nombre'),
        valor: esp.titulo,
        textoOk: t('esp.panel.guardar', 'Guardar'),
      })
      if (nuevo == null) return
      await api.editar(espacioId, nuevo.slice(0, 80), esp.meta)
      await recargar()
      await refrescarEspacios()
    })

  const cambiarRol = (m: MiembroEspacio, rol: RolEspacio) =>
    accion(async () => {
      await api.fijarRol(espacioId, m.miembroId, rol)
      await recargar()
    })

  const quitar = (m: MiembroEspacio) =>
    accion(async () => {
      const si = await confirmar({
        titulo: t('esp.panel.quitar', 'Quitar'),
        mensaje: t('esp.panel.quitar.pregunta', '¿Quitar a {n}? Dejará de ver esto.', {
          n: m.alias ? `@${m.alias}` : m.nombre,
        }),
        textoOk: t('esp.panel.quitar', 'Quitar'),
        peligro: true,
      })
      if (!si) return
      await api.expulsar(espacioId, m.miembroId)
      await recargar()
    })

  const salir = () =>
    accion(async () => {
      const si = await confirmar({
        titulo: t('esp.panel.salir', 'Salir'),
        mensaje: t('esp.panel.salir.pregunta', 'Dejarás de ver esto. ¿Salir?'),
        textoOk: t('esp.panel.salir', 'Salir'),
        peligro: true,
      })
      if (!si) return
      await api.salir(espacioId)
      await refrescarEspacios()
      onCerrar()
    })

  const borrar = () =>
    accion(async () => {
      const si = await confirmar({
        titulo: t('esp.panel.borrar', 'Dejar de compartir'),
        mensaje: t('esp.panel.borrar.pregunta', 'Se borra para todos y no se puede deshacer. ¿Seguir?'),
        textoOk: t('esp.panel.borrar', 'Dejar de compartir'),
        peligro: true,
      })
      if (!si) return
      // Los archivos ANTES: al caer la fila, la policy de Storage ya no
      // reconoce al usuario como miembro y denegaría el borrado.
      await api.borrarCarpetaEspacio(espacioId)
      await api.borrar(espacioId)
      await refrescarEspacios()
      onCerrar()
    })

  const invitar = (contactoId: string, hiloId: string | null, rol: RolEspacio) =>
    accion(async () => {
      if (!esp) return
      await api.invitar(espacioId, contactoId, rol)
      if (hiloId) {
        // Además del timbre del servidor, la tarjeta queda en su chat.
        await enviarPorBuzon(hiloId, {
          texto: '',
          paquete: {
            app: 'espacio',
            tipo: esp.tipo,
            version: 1,
            nombre: esp.titulo,
            emoji: EMOJIS[ICONO_TIPO[esp.tipo]],
            datos: { espacioId, tipo: esp.tipo, titulo: esp.titulo, rol },
          },
        })
      }
      setInvitando(false)
      await recargar()
    })

  // Hoja de compartir del sistema en el móvil, portapapeles en el escritorio y,
  // si ninguno está disponible (foco fuera, permiso denegado), el enlace a la
  // vista para copiarlo a mano.
  const copiar = (cual: 'ver' | 'editar', token: string) =>
    accion(async () => {
      const enlace = enlaceEspacio(token)
      const r = await compartirTexto(esp?.titulo ?? '', enlace)
      if (r.tipo === 'copiado') {
        setCopiado(cual)
        setTimeout(() => setCopiado(null), 2000)
      }
      setEnlaceManual(r.tipo === 'manual' ? enlace : null)
    })

  const alternar = (cual: 'ver' | 'editar', activo: boolean) =>
    accion(async () => {
      const r = await api.rotarEnlace(espacioId, cual, activo)
      setEsp((e) =>
        e
          ? {
              ...e,
              tokens: {
                ver: r.tokenVer,
                editar: r.tokenEditar,
                enlaceVer: r.enlaceVer,
                enlaceEditar: r.enlaceEditar,
              },
            }
          : e,
      )
    })

  const regenerar = (cual: 'ver' | 'editar') =>
    accion(async () => {
      const si = await confirmar({
        titulo: t('esp.panel.regenerar', 'Cambiar el enlace'),
        mensaje: t('esp.panel.regenerar.pregunta', 'El enlace anterior dejará de funcionar. ¿Cambiarlo?'),
        textoOk: t('esp.panel.regenerar', 'Cambiar el enlace'),
      })
      if (!si) return
      await alternar(cual, true)
    })

  const titulo = esp?.titulo || t('esp.sinTitulo', 'Sin título')
  const yaMiembros = new Set(miembros.map((m) => m.alias))
  const invitables = (contactos ?? []).filter((c) => !yaMiembros.has(c.alias))

  return (
    <Modal titulo={t('esp.panel.titulo', 'Compartir')} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">
            <Icono nombre={esp ? ICONO_TIPO[esp.tipo] : 'compartir'} />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{titulo}</p>
          {soyDueno && (
            <button
              type="button"
              onClick={() => void renombrar()}
              disabled={ocupado}
              title={t('esp.panel.renombrar', 'Nombre')}
              className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
            >
              <Icono nombre="editar" />
            </button>
          )}
        </div>

        {/* — Miembros — */}
        <div className="space-y-1">
          {miembros.map((m) => (
            <div
              key={m.miembroId}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5"
            >
              <Retrato retrato={m.retrato} emoji={m.emoji} className="h-8 w-8" textoClase="text-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {m.yo ? t('esp.panel.tu', 'Tú') : m.nombre || (m.alias ? `@${m.alias}` : m.miembroId)}
                </span>
                <span className="block truncate text-[10px] text-white/45">
                  {etiquetaRol(m.rol, t)}
                  {presentes.includes(m.miembroId) ? ` · ${t('esp.panel.enLinea', 'aquí ahora')}` : ''}
                  {m.estado === 'fuera' ? ` · ${t('esp.panel.fuera', 'se fue')}` : ''}
                </span>
              </span>
              {soyDueno && !m.yo && m.rol !== 'dueno' && (
                <>
                  <select
                    value={m.rol}
                    onChange={(e) => void cambiarRol(m, e.target.value as RolEspacio)}
                    disabled={ocupado}
                    aria-label={t('esp.panel.rol', 'Permiso')}
                    className="rounded-lg border border-white/10 bg-black/30 px-1.5 py-1 text-[11px] outline-none"
                  >
                    <option value="editor">{t('esp.rol.editor', 'Puede editar')}</option>
                    <option value="lector">{t('esp.rol.lector', 'Solo ver')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void quitar(m)}
                    disabled={ocupado}
                    title={t('esp.panel.quitar', 'Quitar')}
                    className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
                  >
                    <Icono nombre="quitar" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* — Invitar contactos — */}
        {soyDueno && (
          <div className="space-y-1">
            {!invitando ? (
              <BotonSecundario pequeno onClick={() => setInvitando(true)} disabled={ocupado}>
                <Icono nombre="companeros" /> {t('esp.panel.invitar', 'Invitar a un contacto')}
              </BotonSecundario>
            ) : invitables.length === 0 ? (
              <p className="text-[11px] text-white/40">
                {t('esp.panel.sinContactos', 'No te queda ningún contacto al que invitar')}
              </p>
            ) : (
              invitables.map((c) => (
                <div
                  key={c.contactoId}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5"
                >
                  <Retrato retrato={c.retrato} emoji={c.emoji} className="h-7 w-7" textoClase="text-base" />
                  <span className="min-w-0 flex-1 truncate text-xs">{c.nombre || `@${c.alias}`}</span>
                  <BotonSecundario
                    pequeno
                    onClick={() => void invitar(c.contactoId, c.hiloId, 'editor')}
                    disabled={ocupado}
                  >
                    {t('esp.rol.editor', 'Puede editar')}
                  </BotonSecundario>
                  <BotonSecundario
                    pequeno
                    onClick={() => void invitar(c.contactoId, c.hiloId, 'lector')}
                    disabled={ocupado}
                  >
                    {t('esp.rol.lector', 'Solo ver')}
                  </BotonSecundario>
                </div>
              ))
            )}
          </div>
        )}

        {/* — Enlaces (solo el dueño los ve) — */}
        {soyDueno && esp?.tokens && (
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-[11px] font-semibold text-white/70">
              <Icono nombre="vincular" /> {t('esp.panel.enlaces', 'Enlaces')}
            </p>
            {(['editar', 'ver'] as const).map((cual) => {
              const token = cual === 'ver' ? esp.tokens!.ver : esp.tokens!.editar
              const activo = cual === 'ver' ? esp.tokens!.enlaceVer : esp.tokens!.enlaceEditar
              return (
                <div key={cual} className="flex items-center gap-1.5">
                  <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-white/60">
                    <input
                      type="checkbox"
                      checked={activo}
                      disabled={ocupado}
                      onChange={(e) => void alternar(cual, e.target.checked)}
                    />
                    <span className="truncate">
                      {cual === 'ver'
                        ? t('esp.panel.enlace.ver', 'Cualquiera con el enlace puede ver')
                        : t('esp.panel.enlace.editar', 'Cualquiera con el enlace puede editar')}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => token && void copiar(cual, token)}
                    disabled={ocupado || !activo || !token}
                    title={t('esp.panel.copiar', 'Copiar')}
                    className="rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                  >
                    <Icono nombre={copiado === cual ? 'confirmar' : 'adjuntar'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void regenerar(cual)}
                    disabled={ocupado}
                    title={t('esp.panel.regenerar', 'Cambiar el enlace')}
                    className="rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                  >
                    <Icono nombre="sincronizar" />
                  </button>
                </div>
              )
            })}
            {enlaceManual && (
              <p className="select-all break-all rounded-lg bg-black/20 px-2 py-1 text-[10px] text-white/70">
                {enlaceManual}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}

        <div className="flex justify-end gap-2">
          {soyDueno ? (
            <BotonPeligro pequeno onClick={() => void borrar()} disabled={ocupado}>
              {t('esp.panel.borrar', 'Dejar de compartir')}
            </BotonPeligro>
          ) : (
            <BotonSecundario pequeno onClick={() => void salir()} disabled={ocupado}>
              {t('esp.panel.salir', 'Salir')}
            </BotonSecundario>
          )}
        </div>
      </div>
    </Modal>
  )
}

/** El papel de un miembro, en palabras (lo reusa `PanelCalendarios`). */
export function etiquetaRol(rol: RolEspacio, t: ReturnType<typeof useT>): string {
  if (rol === 'dueno') return t('esp.rol.dueno', 'Lo compartió')
  if (rol === 'editor') return t('esp.rol.editor', 'Puede editar')
  return t('esp.rol.lector', 'Solo ver')
}
