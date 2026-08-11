import { useState } from 'react'
import {
  getIaKey,
  getModeloLocal,
  getProveedor,
  iaActiva,
  PROVEEDORES,
  setIaKey,
  setModeloLocal,
  setProveedor,
  type ProveedorId,
} from '../../chat/ia'
import { usarViaCuenta } from '../../cuenta/api'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Activar la IA.
 *
 * Esto ya existía, pero escondido dentro del panel del chat: quien abría
 * Configuraciones buscando cómo encender la IA encontraba una tabla de precios y
 * se quedaba ahí. Es el mismo estado de siempre (`localStorage`, vía
 * `getIaKey`/`setIaKey`), enseñado donde se busca.
 *
 * Hay dos caminos y ninguno excluye al otro: la CUENTA (créditos, sin pegar
 * claves) o una CLAVE PROPIA del proveedor que ya uses, que se queda en este
 * dispositivo y se cobra directo a tu cuenta con él.
 */
export function ActivarIASection() {
  const t = useT()
  const [provId, setProvId] = useState<ProveedorId>(() => getProveedor().id)
  const [clave, setClave] = useState(() => getIaKey(getProveedor().id))
  const [modeloLocal, setModeloLocalDraft] = useState(getModeloLocal)

  const proveedor = PROVEEDORES.find((p) => p.id === provId) ?? PROVEEDORES[0]
  const porCuenta = usarViaCuenta()
  const activa = iaActiva()

  const elegir = (id: ProveedorId) => {
    setProveedor(id)
    setProvId(id)
    setClave(getIaKey(id))
  }

  return (
    <div data-tut="ia.activar" className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
        {t('ia.activar.titulo', 'Activar la IA')}
      </p>

      <p
        className={`rounded-md border px-2 py-1.5 text-[11px] leading-snug ${
          activa ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/25 bg-amber-400/10 text-amber-100'
        }`}
      >
        {porCuenta
          ? t('ia.activar.porCuenta', 'Activa con tu cuenta: cada cosa que pidas gasta créditos.')
          : activa
            ? t('ia.activar.porClave', 'Activa con tu clave de {prov}. No gasta créditos: te lo cobra {prov}.', {
                prov: proveedor.nombre,
              })
            : t(
                'ia.activar.sinActivar',
                'La IA está apagada. Inicia sesión para usar créditos, o pega abajo la clave de un proveedor.',
              )}
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {PROVEEDORES.map((p) => {
          const listo = p.sinClave || getIaKey(p.id).length > 0
          const activo = p.id === provId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => elegir(p.id)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                activo ? 'ui-accent-bg border-transparent' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Icono emoji={p.emoji} />
              <span className="min-w-0 flex-1 truncate text-left">{p.nombre}</span>
              {listo && <span className="shrink-0 text-[10px]">●</span>}
            </button>
          )
        })}
      </div>

      {proveedor.sinClave ? (
        <div className="space-y-1">
          <input
            value={modeloLocal}
            onChange={(e) => {
              setModeloLocalDraft(e.target.value)
              setModeloLocal(e.target.value)
            }}
            placeholder="gemma4"
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
          />
          <p className="text-[10px] leading-relaxed text-white/35">
            {t('chat.modelo.local', 'Requiere Ollama corriendo en tu equipo (puerto 11434). Gratis y privado.')}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <input
            type="password"
            value={clave}
            onChange={(e) => {
              setClave(e.target.value)
              setIaKey(provId, e.target.value)
            }}
            placeholder={t('chat.modelo.clave', 'Clave API de {prov}', { prov: proveedor.nombre })}
            autoComplete="off"
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none"
          />
          <p className="text-[10px] leading-relaxed text-white/35">
            {t('ia.activar.priv', 'Se guarda solo en este dispositivo y nunca sale de él salvo hacia {prov}.', {
              prov: proveedor.nombre,
            })}
          </p>
        </div>
      )}
    </div>
  )
}
