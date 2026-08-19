import { useEffect, useState } from 'react'
import {
  capacidadesOllama,
  getIaKey,
  getModelo,
  getProveedor,
  hayProveedorMedia,
  listarModelosOllama,
  localHaceImagen,
  PROVEEDORES,
  proveedorVoz,
  recordarImagenLocal,
  setBase,
  setIaKey,
  setModelo,
  setProveedor,
  setProvVoz,
  type ProveedorId,
  type ProveedorMediaId,
} from '../chat/ia'
import { proveedorImagen, setProvImagen, type ProveedorImagenId } from '../imagenIA'
import { useAsistentes } from '../state/asistentesStore'
import { getTransporte, setTransporte } from '../cuenta/api'
import { hayBackend } from '../cuenta/supabase'
import { haySesionProbable } from '../cuenta/sesionStore'
import { GastoByok } from './GastoByok'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Panel único de configuración de la IA, compartido por el botón del chat y por
 * Configuraciones › IA. Dos transportes —Créditos (vía cuenta) y BYOK (claves
 * propias)— y, dentro de BYOK, una TABLA proveedor × modalidad: la columna
 * Cerebro elige quién piensa el texto, y Voz/Imagen quién sirve cada media
 * (solo OpenAI y Gemini pueden). El estado vive en localStorage (getIaKey y
 * compañía); aquí solo hay espejos de edición. Dos paneles montados a la vez no
 * se sincronizan en vivo (limitación aceptada, igual que antes de extraerlo).
 */

const esMedia = (id: ProveedorId): id is ProveedorMediaId => id === 'chatgpt' || id === 'gemini'

export function PanelIA({ variante, onCambio }: { variante: 'chat' | 'editor'; onCambio?: () => void }) {
  const t = useT()
  const [, setTick] = useState(0)
  const [claveDraft, setClaveDraft] = useState(() => getIaKey(getProveedor().id))
  const [modeloDraft, setModeloDraft] = useState(() => getModelo(getProveedor()))
  const [modelosOllama, setModelosOllama] = useState<string[]>([])
  const [baseDraft, setBaseDraft] = useState(() => localStorage.getItem('mh.iaBase.local') ?? '')

  const refrescar = () => {
    setTick((n) => n + 1)
    onCambio?.()
  }

  const proveedor = getProveedor()
  // `haySesionProbable` y no `haySesion`: mientras la sesión hidrata, la
  // segunda dice que no hay cuenta y el panel pintaba «Mis claves (BYOK)» como
  // activo sin que el usuario tocara nada (parecía que se cambiaba solo).
  const hayCuenta = hayBackend() && haySesionProbable()
  // Sin cuenta el toggle no aplica: lo efectivo siempre es BYOK.
  const enCreditos = hayCuenta && getTransporte() === 'creditos'
  const provVoz = proveedorVoz()
  const provImagen = proveedorImagen()

  /**
   * Pregunta al modelo local si genera imágenes (capacidad `image`) y lo apunta:
   * de ahí sale que la columna Imagen se habilite para Ollama.
   */
  const revisarImagenLocal = async (modelo: string) => {
    if (!modelo.trim()) return
    const caps = await capacidadesOllama(modelo)
    recordarImagenLocal(caps.includes('image') ? modelo : null)
    refrescar()
  }

  // Modelos instalados en Ollama: se piden UNA vez al montar (fallo silencioso).
  // Si el cerebro guardado ya no está instalado se autocorrige al primero —
  // solo aquí, nunca por keystroke, para no pisar lo que el usuario teclea.
  useEffect(() => {
    let vivo = true
    void listarModelosOllama().then(async (tags) => {
      if (!vivo || !tags.length) return
      setModelosOllama(tags)
      const local = PROVEEDORES.find((p) => p.id === 'local')
      if (!local) return
      if (!tags.includes(getModelo(local))) {
        setModelo('local', tags[0])
        if (getProveedor().id === 'local') setModeloDraft(tags[0])
      }
      await revisarImagenLocal(getModelo(local))
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sondeo de arranque: no debe repetirse al re-renderizar
  }, [])

  const elegir = (id: ProveedorId) => {
    setProveedor(id)
    setClaveDraft(getIaKey(id))
    setModeloDraft(getModelo(PROVEEDORES.find((p) => p.id === id) ?? PROVEEDORES[0]))
    refrescar()
  }

  /**
   * Elegir la voz también ENCIENDE la voz con IA de los asistentes: si solo
   * fijara el proveedor, nada sonaría distinto y habría que ir a buscar el
   * interruptor a la ficha de cada asistente.
   */
  const elegirVoz = (id: ProveedorMediaId) => {
    setProvVoz(id)
    const { lista, guardar } = useAsistentes.getState()
    for (const a of lista) if (!a.vozIA) void guardar({ ...a, vozIA: true })
  }

  /** Radio de una celda de la tabla: ● elegido, ○ elegible, atenuado sin clave. */
  const radio = (activo: boolean, deshabilitado: boolean, alElegir: () => void, titulo?: string) => (
    <button
      type="button"
      disabled={deshabilitado}
      title={titulo}
      onClick={() => {
        alElegir()
        refrescar()
      }}
      className={`h-6 w-6 rounded-md text-[11px] transition disabled:opacity-25 ${
        activo ? 'ui-accent-bg' : 'text-white/50 hover:bg-white/10'
      }`}
    >
      {activo ? '●' : '○'}
    </button>
  )

  return (
    <div className="space-y-2">
      {/* Transporte: créditos de la cuenta o claves propias. */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={!hayCuenta}
          title={hayCuenta ? undefined : t('ia.transporte.sinCuenta', 'Inicia sesión para usar créditos.')}
          onClick={() => {
            setTransporte('creditos')
            refrescar()
          }}
          className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
            enCreditos ? 'ui-accent-bg border-transparent' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          {t('ia.transporte.creditos', 'Créditos')}
        </button>
        <button
          type="button"
          onClick={() => {
            setTransporte('byok')
            refrescar()
          }}
          className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
            !enCreditos ? 'ui-accent-bg border-transparent' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          {t('ia.transporte.byok', 'Mis claves (BYOK)')}
        </button>
      </div>

      {enCreditos ? (
        <p className="text-[10px] leading-relaxed text-white/35">
          {t(
            'ia.transporte.creditosDesc',
            'Sale por tu cuenta: el servidor pone las claves y cada petición gasta créditos del plan.',
          )}
        </p>
      ) : (
        <>
          {/* La matriz proveedor × modalidad. */}
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                <th className="pb-1 text-start font-bold">{t('ia.panel.proveedor', 'Proveedor')}</th>
                <th className="pb-1 text-center font-bold">{t('ia.panel.cerebro', 'Cerebro')}</th>
                <th className="pb-1 text-center font-bold">{t('ia.panel.voz', 'Voz')}</th>
                <th className="pb-1 text-center font-bold">{t('ia.panel.imagen', 'Imagen')}</th>
              </tr>
            </thead>
            <tbody>
              {PROVEEDORES.map((p) => {
                const conClave = getIaKey(p.id).length > 0
                const listo = p.sinClave || conClave
                return (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="py-0.5">
                      <button
                        type="button"
                        onClick={() => elegir(p.id)}
                        className={`flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold transition hover:bg-white/10 ${
                          p.id === proveedor.id ? 'text-white/90' : 'text-white/60'
                        }`}
                      >
                        <Icono emoji={p.emoji} />
                        <span className="min-w-0 flex-1 truncate text-start">{p.nombre}</span>
                        {listo && <span className="shrink-0 text-[9px] text-accent">●</span>}
                      </button>
                    </td>
                    <td className="py-0.5 text-center">{radio(proveedor.id === p.id, false, () => elegir(p.id))}</td>
                    <td className="py-0.5 text-center">
                      {esMedia(p.id)
                        ? radio(
                            provVoz === p.id,
                            !conClave,
                            () => elegirVoz(p.id as ProveedorMediaId),
                            t('ia.panel.vozAyuda', 'Enciende la voz con IA de los asistentes con este proveedor'),
                          )
                        : <span className="text-[11px] text-white/20">—</span>}
                    </td>
                    <td className="py-0.5 text-center">
                      {/* Ollama entra aquí solo si su modelo declara la capacidad `image`. */}
                      {esMedia(p.id) || (p.id === 'local' && localHaceImagen())
                        ? radio(
                            provImagen === p.id,
                            p.id === 'local' ? false : !conClave,
                            () => setProvImagen(p.id as ProveedorImagenId),
                          )
                        : <span className="text-[11px] text-white/20">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Clave del proveedor. En Ollama es OPCIONAL: solo la piden su nube y
              los servidores propios con autenticación (el de casa no). */}
          <div className="space-y-1">
            <input
              type="password"
              value={claveDraft}
              onChange={(e) => {
                setClaveDraft(e.target.value)
                setIaKey(proveedor.id, e.target.value)
                refrescar()
              }}
              placeholder={
                proveedor.sinClave
                  ? t('ia.panel.claveOllama', 'Clave de Ollama (solo para la nube o un servidor con clave)')
                  : t('chat.modelo.clave', 'Clave API de {prov}', { prov: proveedor.nombre })
              }
              autoComplete="off"
              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
            />
            {proveedor.sinClave ? (
              <input
                value={baseDraft}
                onChange={(e) => {
                  setBaseDraft(e.target.value)
                  setBase('local', e.target.value)
                }}
                onBlur={() => void revisarImagenLocal(getModelo(proveedor))}
                placeholder={proveedor.base}
                autoComplete="off"
                className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
              />
            ) : (
              <p className="text-[10px] leading-relaxed text-white/35">
                {variante === 'chat'
                  ? t('chat.modelo.priv', 'Se guarda solo en este dispositivo. Sin clave: modo local por palabras clave.')
                  : t('ia.activar.priv', 'Se guarda solo en este dispositivo y nunca sale de él salvo hacia {prov}.', {
                      prov: proveedor.nombre,
                    })}
              </p>
            )}
          </div>

          {/* Cerebro: el modelo de texto del proveedor elegido, editable en todos. */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/35">
                {t('ia.panel.cerebro', 'Cerebro')}
              </span>
              <input
                value={modeloDraft}
                onChange={(e) => {
                  setModeloDraft(e.target.value)
                  setModelo(proveedor.id, e.target.value)
                }}
                // Al terminar de elegir modelo local se le pregunta si hace imágenes.
                onBlur={() => proveedor.sinClave && void revisarImagenLocal(modeloDraft)}
                placeholder={proveedor.modelo}
                list={proveedor.sinClave ? 'mh-modelos-ollama' : undefined}
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
              />
              {proveedor.sinClave && (
                <datalist id="mh-modelos-ollama">
                  {modelosOllama.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              )}
            </div>
            {proveedor.sinClave && (
              <p className="text-[10px] leading-relaxed text-white/35">
                {t('chat.modelo.local', 'Requiere Ollama corriendo en tu equipo (puerto 11434). Gratis y privado.')}
                {localHaceImagen() && ` ${t('ia.panel.localImagen', 'Este modelo genera imágenes.')}`}
              </p>
            )}
          </div>

          {/* Sin ninguna clave de OpenAI/Gemini no hay quien sirva voz ni imagen. */}
          {!hayProveedorMedia() && (
            <p className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1.5 text-[10px] leading-snug text-amber-100">
              {t('ia.media.sinClave', 'Para generar imágenes y usar la voz con IA añade una clave de OpenAI o Gemini.')}
            </p>
          )}

          {variante === 'chat' && <GastoByok compacto />}
        </>
      )}
    </div>
  )
}
