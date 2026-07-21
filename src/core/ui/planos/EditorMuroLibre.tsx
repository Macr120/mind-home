import { murosLibresRepo, setEstiloMuroLibre, eliminarMuroLibre } from '../../data/repository'
import { TIPOS_MURO, TIPOS_FORMA_MURO, TIPOS_VENTANA_FORMA, TIPOS_PUERTA, VANO_FORMA_ALTO_DEFAULT } from '../../house/murosPuertas'
import { FORMA_ALTO_TECHO } from '../../house/walls'
import { ColorPicker } from '../editor/ColorPicker'
import { usePlanos } from '../../state/planosStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/** Texturas de muro disponibles (la "ventana" es un modo aparte, no una textura). */
const TEXTURAS_MURO = TIPOS_MURO.filter((m) => m.id !== 'ventana')

/** Deslizador etiquetado (mismo estilo que el editor de paredes de cuartos). */
function Deslizador({
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  fmt: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[10px] text-white/45">
        <span>{label}</span>
        <span className="tabular-nums">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-400"
      />
    </label>
  )
}

/** Editor del muro libre seleccionado: textura, color y altura. */
export function EditorMuroLibre({ muroId }: { muroId: number }) {
  const t = useT()
  const muros = murosLibresRepo.useAll() ?? []
  const setMuroLibreSel = usePlanos((s) => s.setMuroLibreSel)
  const herramienta = usePlanos((s) => s.herramienta)
  const m = muros.find((x) => x.id === muroId)
  if (!m) return null

  // Modo Puertas/Ventanas: solo se editan esos elementos. Modo Muros: textura/forma/etc.
  const modoAbertura = herramienta === 'puerta' ? 'puerta' : herramienta === 'ventana' ? 'ventana' : null

  const tipo = m.tipo ?? 'solido'
  const color = m.color ?? '#8c8073'
  const alto = m.alto ?? 1
  const silueta = m.silueta ?? 'recta'
  const formaAlto = m.formaAlto ?? FORMA_ALTO_TECHO
  const formaAncho = m.formaAncho ?? 0.32
  const formaPosX = m.formaPosX ?? 0
  const formaDividir = m.formaDividir ?? false
  const formaColor = m.formaColor ?? color
  const etiqueta =
    m.clase === 'arista'
      ? t('constructor.muro.lado', 'lado')
      : m.forma === 'triangular'
        ? t('constructor.muro.triangulo', 'triángulo')
        : t('constructor.muro.circulo', 'círculo')

  const cerrar = (
    <button
      type="button"
      onClick={() => setMuroLibreSel(null)}
      className="text-[11px] text-white/40 transition hover:text-white/70"
    >
      ✕
    </button>
  )

  // Modo Puertas/Ventanas: editar la abertura del muro independiente (forma, tamaño, posición, color).
  if (modoAbertura) {
    const esPuerta = modoAbertura === 'puerta'
    const activo = esPuerta ? !!m.puerta : !!m.ventana
    const esCurvo = m.clase === 'forma' && m.forma === 'circular'
    const ancho = esPuerta ? (m.puertaAncho ?? 0.5) : (m.ventAncho ?? 0.55)
    const altoAb = esPuerta ? (m.puertaAlto ?? 0.85) : (m.ventAlto ?? 0.5)
    const colorAb = esPuerta ? (m.puertaColor ?? '#b9824f') : (m.ventColor ?? '#bcdcff')
    const forma = m.ventForma ?? 'cuadrado'
    const posX = m.ventPosX ?? 0
    const posY = m.ventPosY ?? 0.54
    const rot = m.ventRot ?? 0
    const mosaico = m.ventMosaico ?? false
    const multicolor = m.ventMulticolor ?? false
    const puertaTipo = m.puertaTipo ?? 'recta'
    const puertaForma = m.puertaForma ?? 'recta'
    const puertaFormaAlto = m.puertaFormaAlto ?? VANO_FORMA_ALTO_DEFAULT
    const puertaFormaAncho = m.puertaFormaAncho ?? 1
    const puertaFormaPosX = m.puertaFormaPosX ?? 0
    const set = (patch: Parameters<typeof setEstiloMuroLibre>[1]) => void setEstiloMuroLibre(muroId, patch)
    const toggle = () =>
      esPuerta ? set({ puerta: !activo, ventana: false }) : set({ ventana: !activo, puerta: false })
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-white/70">
            {esPuerta ? t('paredes.puerta', 'Puerta') : t('paredes.ventana', 'Ventana')}{' '}
            <span className="text-white/45">({etiqueta})</span>
          </p>
          {cerrar}
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`w-full rounded-lg border py-2 text-[11px] font-semibold transition ${
            activo
              ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
              : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          {activo
            ? esPuerta
              ? t('constructor.muro.quitarPuerta', '✓ Con puerta (quitar)')
              : t('constructor.muro.quitarVentana', '✓ Con ventana (quitar)')
            : esPuerta
              ? t('constructor.muro.ponerPuerta', '+ Poner puerta')
              : t('constructor.muro.ponerVentana', '+ Poner ventana')}
        </button>
        {activo &&
          (esPuerta ? (
            <>
              {/* Tipo de puerta (hoja sólida que se abre al acercarse el avatar) */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t('paredes.tipoPuerta', 'Tipo de puerta')}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {TIPOS_PUERTA.map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      title={tp.nombre}
                      onClick={() =>
                        set({
                          puertaTipo: tp.id,
                          puertaColor: tp.defaultColor,
                        })
                      }
                      className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${
                        puertaTipo === tp.id ? 'bg-white/10 ring-1 ring-emerald-400/70' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="h-7 w-full rounded-md border border-white/10" style={{ background: tp.preview }} />
                      <span className="line-clamp-1 text-center text-[8px] leading-tight text-white/60">
                        {t(`paredes.puerta.${tp.id}` as Parameters<typeof t>[0], tp.nombre)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <Deslizador
                label={t('paredes.anchoVano', 'Ancho')}
                value={ancho}
                min={0.2}
                max={1}
                step={0.05}
                fmt={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set({ puertaAncho: v })}
              />
              <Deslizador
                label={t('paredes.altoPuerta', 'Alto')}
                value={altoAb}
                min={0.3}
                max={1}
                step={0.05}
                fmt={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set({ puertaAlto: v })}
              />
              <Deslizador
                label={t('paredes.ventPosX', 'Posición horizontal')}
                value={posX}
                min={-1}
                max={1}
                step={0.05}
                fmt={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set({ ventPosX: v })}
              />
              {/* Remate del vano (recto/arco/pico), con los mismos paramétricos que los muros. */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t('paredes.formaVano', 'Forma del vano')}
                </p>
                <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                  {TIPOS_FORMA_MURO.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        set({
                          // Al elegir arco/pico baja la hoja (si está casi al tope) para dejarle sitio.
                          puertaForma: f.id,
                          ...(f.id !== 'recta' && altoAb > 0.85 ? { puertaAlto: 0.75 } : {}),
                        })
                      }
                      className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                        puertaForma === f.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
                      }`}
                    >
                      {t(`paredes.forma.${f.id}` as Parameters<typeof t>[0], f.nombre)}
                    </button>
                  ))}
                </div>
                {puertaForma !== 'recta' && (
                  <Deslizador
                    label={
                      puertaForma === 'arco'
                        ? t('paredes.formaAlto', 'Alto del arco')
                        : t('paredes.formaAltoPico', 'Alto del pico')
                    }
                    value={puertaFormaAlto}
                    min={0.05}
                    max={1.5}
                    step={0.05}
                    fmt={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => set({ puertaFormaAlto: v })}
                  />
                )}
                {puertaForma === 'triangulo' && (
                  <>
                    <Deslizador
                      label={t('paredes.formaAncho', 'Ancho')}
                      value={puertaFormaAncho}
                      min={0.1}
                      max={1}
                      step={0.02}
                      fmt={(v) => `${Math.round(v * 100)}%`}
                      onChange={(v) => set({ puertaFormaAncho: v })}
                    />
                    <Deslizador
                      label={t('paredes.formaPosX', 'Posición del pico')}
                      value={puertaFormaPosX}
                      min={-1}
                      max={1}
                      step={0.05}
                      fmt={(v) => `${Math.round(v * 100)}%`}
                      onChange={(v) => set({ puertaFormaPosX: v })}
                    />
                  </>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t('paredes.color', 'Color')}
                </p>
                <ColorPicker value={colorAb} onChange={(c) => set({ puertaColor: c })} />
              </div>
            </>
          ) : (
            <>
              {/* Forma del cristal */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t('paredes.formas', 'Forma')}
                </p>
                <div className="flex gap-1 rounded-lg bg-black/20 p-1">
                  {TIPOS_VENTANA_FORMA.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => set({ ventForma: f.id })}
                      className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                        forma === f.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
                      }`}
                    >
                      {t(`paredes.ventForma.${f.id}` as Parameters<typeof t>[0], f.nombre)}
                    </button>
                  ))}
                </div>
              </div>
              <Deslizador
                label={t('paredes.ventAncho', 'Ancho')}
                value={ancho}
                min={0.2}
                max={1}
                step={0.05}
                fmt={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set({ ventAncho: v })}
              />
              <Deslizador
                label={t('paredes.ventAlto', 'Alto')}
                value={altoAb}
                min={0.2}
                max={1}
                step={0.05}
                fmt={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set({ ventAlto: v })}
              />
              <Deslizador
                label={t('paredes.ventPosY', 'Posición vertical')}
                value={posY}
                min={0}
                max={1}
                step={0.02}
                fmt={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set({ ventPosY: v })}
              />
              <Deslizador
                label={t('paredes.ventPosX', 'Posición horizontal')}
                value={posX}
                min={-1}
                max={1}
                step={0.05}
                fmt={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => set({ ventPosX: v })}
              />
              {forma !== 'circulo' && !esCurvo && (
                <Deslizador
                  label={t('paredes.ventRot', forma === 'cuadrado' ? 'Rotación (rombo)' : 'Rotación')}
                  value={rot}
                  min={0}
                  max={forma === 'cuadrado' ? 90 : 180}
                  step={5}
                  fmt={(v) => `${Math.round(v)}°`}
                  onChange={(v) => set({ ventRot: v })}
                />
              )}
              {/* Cristal: mosaico, multicolor y color */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {t('paredes.cristal', 'Cristal')}
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => set({ ventMosaico: !mosaico })}
                    className={`flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition ${
                      mosaico
                        ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {t('paredes.mosaico', 'Mosaico')}
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ ventMulticolor: !multicolor })}
                    className={`flex-1 rounded-md border py-1.5 text-[10px] font-semibold transition ${
                      multicolor
                        ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <Icono nombre="multicolor" /> {t('paredes.multicolor', 'Multicolor')}
                  </button>
                </div>
                {!multicolor && (
                  <ColorPicker value={colorAb} onChange={(c) => set({ ventColor: c })} />
                )}
              </div>
            </>
          ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-white/70">
          {t('constructor.muro.editar', 'Muro seleccionado')}{' '}
          <span className="text-white/45">({etiqueta})</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void eliminarMuroLibre(muroId)
              setMuroLibreSel(null)
            }}
            title={t('constructor.muro.eliminar', 'Eliminar muro')}
            className="flex items-center gap-1 rounded-md border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-400/90 transition hover:bg-red-400/20"
          >
            <Icono nombre="basura" /> {t('constructor.muro.eliminarCorto', 'Eliminar')}
          </button>
          {cerrar}
        </div>
      </div>

      {/* Textura */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('paredes.textura', 'Textura')}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {TEXTURAS_MURO.map((tm) => (
            <button
              key={tm.id}
              type="button"
              title={tm.nombre}
              onClick={() => void setEstiloMuroLibre(muroId, { tipo: tm.id, color: tm.defaultColor })}
              className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${
                tipo === tm.id ? 'bg-white/10 ring-1 ring-amber-400/70' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <span
                className="h-7 w-full rounded-md border border-white/10"
                style={{ background: tm.preview }}
              />
              <span className="line-clamp-1 text-center text-[8px] leading-tight text-white/60">
                {t(`paredes.muro.${tm.id}` as Parameters<typeof t>[0], tm.nombre)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Forma (silueta superior): recta, arco o triángulo. */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('paredes.formas', 'Forma')}
        </p>
        <div className="flex gap-1 rounded-lg bg-black/20 p-1">
          {TIPOS_FORMA_MURO.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void setEstiloMuroLibre(muroId, { silueta: f.id as 'recta' | 'arco' | 'triangulo' })}
              className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                silueta === f.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/70'
              }`}
            >
              {t(`paredes.forma.${f.id}` as Parameters<typeof t>[0], f.nombre)}
            </button>
          ))}
        </div>

        {/* Parámetros de la silueta (arco/triángulo), como en los cuartos. */}
        {silueta !== 'recta' && (
          <div className="space-y-2 pt-1">
            <Deslizador
              label={
                silueta === 'arco'
                  ? t('paredes.formaAlto', 'Alto del arco')
                  : t('paredes.formaAltoPico', 'Alto del pico')
              }
              value={formaAlto}
              min={0.05}
              max={1.5}
              step={0.05}
              fmt={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => void setEstiloMuroLibre(muroId, { formaAlto: v })}
            />
            {silueta === 'triangulo' && (
              <>
                <Deslizador
                  label={t('paredes.formaAncho', 'Ancho del pico')}
                  value={formaAncho}
                  min={0.1}
                  max={1}
                  step={0.02}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => void setEstiloMuroLibre(muroId, { formaAncho: v })}
                />
                <Deslizador
                  label={t('paredes.formaPosX', 'Posición del pico')}
                  value={formaPosX}
                  min={-1}
                  max={1}
                  step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => void setEstiloMuroLibre(muroId, { formaPosX: v })}
                />
              </>
            )}
            <label className="flex items-center gap-1.5 text-[10px] text-white/55">
              <input
                type="checkbox"
                checked={formaDividir}
                onChange={(e) => void setEstiloMuroLibre(muroId, { formaDividir: e.target.checked })}
                className="accent-emerald-400"
              />
              {t('paredes.formaDividir', 'Color propio en la silueta')}
            </label>
            {formaDividir && (
              <ColorPicker
                value={formaColor}
                onChange={(c) => void setEstiloMuroLibre(muroId, { formaColor: c })}
              />
            )}
          </div>
        )}
      </div>

      {/* Orientación: giro del triángulo/círculo en su celda (antes iba en el clic). */}
      {m.clase === 'forma' && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('constructor.muro.orientacion', 'Orientación')}
          </p>
          <button
            type="button"
            onClick={() =>
              void setEstiloMuroLibre(muroId, {
                rotacion: (((m.rotacion ?? 0) + 90) % 360) as 0 | 90 | 180 | 270,
              })
            }
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
          >
            <Icono nombre="rotar-der" /> {t('constructor.muro.rotar', 'Rotar 90°')}
            <span className="text-white/40">({m.rotacion ?? 0}°)</span>
          </button>
        </div>
      )}

      {/* Color */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('paredes.color', 'Color')}
        </p>
        <ColorPicker value={color} onChange={(c) => void setEstiloMuroLibre(muroId, { color: c })} />
      </div>

      {/* Altura */}
      <label className="block space-y-1">
        <div className="flex justify-between text-[10px] text-white/45">
          <span>{t('paredes.alto', 'Altura')}</span>
          <span className="tabular-nums">{Math.round(alto * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.05}
          value={alto}
          onChange={(e) => void setEstiloMuroLibre(muroId, { alto: parseFloat(e.target.value) })}
          className="w-full accent-emerald-400"
        />
      </label>
    </div>
  )
}
