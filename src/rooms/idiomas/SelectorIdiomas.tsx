import { useState } from 'react'
import type { PerfilIdioma } from '../../core/data/db'
import { VACIO,
  conversacionesIdiomaRepo,
  eliminarIdiomaCascada,
  idiomasRepo,
  rutinasRepo,
  tarjetasIdiomaRepo,
} from '../../core/data/repository'
import { borrarMetasDeAmbito } from '../../core/metas'
import { actividadId, buscarAgenda } from '../../core/rutinas'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { CATALOGO_IDIOMAS, COLOR, NIVELES } from './constantes'
import { TEMARIO } from './temario'

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')
const slug = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(DIACRITICOS, '').replace(/\s+/g, '-')

const labelCampo = 'text-[10px] uppercase tracking-wide text-white/40'
const inputBase =
  'w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm outline-none focus:border-white/30'

/** Select de nivel MCER con el nombre del tramo (A1 · Principiante…). */
function SelectNivel({ valor, onCambiar }: { valor: string; onCambiar: (n: string) => void }) {
  return (
    <select value={valor} onChange={(e) => onCambiar(e.target.value)} className={inputBase}>
      {NIVELES.map((n) => (
        <option key={n} value={n}>
          {n} · {TEMARIO.find((x) => x.nivel === n)?.titulo ?? n}
        </option>
      ))}
    </select>
  )
}

/**
 * Contenido del alta de un idioma: catálogo curado + "otro" + nivel MCER.
 * Se usa inline en el onboarding y dentro del modal ＋ del selector.
 */
export function AltaIdioma({ existentes, onCreado }: {
  existentes: PerfilIdioma[]
  onCreado: (id: number) => void
}) {
  const t = useT()
  const [sel, setSel] = useState<string | null>(null) // código del catálogo o 'otro'
  const [nivel, setNivel] = useState('A1')
  const [nombreOtro, setNombreOtro] = useState('')
  const [codigoOtro, setCodigoOtro] = useState('')
  const [error, setError] = useState(false)

  const usados = new Set(existentes.map((i) => i.codigo))
  const disponibles = CATALOGO_IDIOMAS.filter((c) => !usados.has(c.codigo))
  const puedeCrear = sel === 'otro' ? nombreOtro.trim() !== '' : sel != null

  const crear = async () => {
    const cat = disponibles.find((c) => c.codigo === sel)
    const datos =
      sel === 'otro'
        ? {
            codigo: codigoOtro.trim() || `x-${slug(nombreOtro)}`,
            nombre: nombreOtro.trim(),
            bandera: '🏳️',
          }
        : cat
          ? { codigo: cat.codigo, nombre: cat.nombre, bandera: cat.bandera }
          : null
    if (!datos || !datos.nombre) return
    setError(false)
    try {
      const id = await idiomasRepo.add({ ...datos, nivel, creadoEn: new Date().toISOString() })
      onCreado(id)
    } catch {
      setError(true) // código duplicado (índice único &codigo)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {disponibles.map((c) => {
          const activo = sel === c.codigo
          return (
            <button
              key={c.codigo}
              type="button"
              onClick={() => setSel(c.codigo)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-start text-xs transition ${
                activo ? 'font-semibold text-black' : 'bg-white/5 text-white/80 hover:bg-white/10'
              }`}
              style={activo ? { background: COLOR } : undefined}
            >
              <Icono emoji={c.bandera} /> <span className="truncate">{c.nombre}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setSel('otro')}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-start text-xs transition ${
            sel === 'otro' ? 'font-semibold text-black' : 'bg-white/5 text-white/80 hover:bg-white/10'
          }`}
          style={sel === 'otro' ? { background: COLOR } : undefined}
        >
          <Icono nombre="editar" /> {t('idiomas.sel.otro', 'Otro…')}
        </button>
      </div>

      {sel === 'otro' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className={labelCampo}>{t('idiomas.sel.nombreOtro', 'Nombre del idioma')}</p>
            <input
              value={nombreOtro}
              onChange={(e) => setNombreOtro(e.target.value)}
              placeholder="Náhuatl"
              className={inputBase}
            />
          </div>
          <div className="space-y-1">
            <p className={labelCampo}>{t('idiomas.sel.codigoOtro', 'Código de voz (opcional)')}</p>
            <input
              value={codigoOtro}
              onChange={(e) => setCodigoOtro(e.target.value)}
              placeholder="pt-PT"
              className={inputBase}
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p className={labelCampo}>{t('idiomas.sel.nivel', 'Tu nivel actual')}</p>
        <SelectNivel valor={nivel} onCambiar={setNivel} />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200/90">
          {t('idiomas.sel.duplicado', 'Ya tienes un idioma con ese código.')}
        </p>
      )}

      <button
        type="button"
        onClick={() => void crear()}
        disabled={!puedeCrear}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
        style={{ background: COLOR }}
      >
        {t('idiomas.sel.empezar', 'Empezar a aprender')}
      </button>
    </div>
  )
}

/** Modal de configuración del idioma activo: cambiar nivel y borrado en cascada. */
function ConfigIdioma({ idioma, onCerrar }: { idioma: PerfilIdioma; onCerrar: () => void }) {
  const t = useT()
  const [borrando, setBorrando] = useState(false)
  const nTarjetas = (tarjetasIdiomaRepo.useAll() ?? VACIO).filter((x) => x.idiomaId === idioma.id).length
  const nCharlas = (conversacionesIdiomaRepo.useAll() ?? VACIO).filter((x) => x.idiomaId === idioma.id).length

  const borrar = async () => {
    if (idioma.id == null) return
    // Su rastro en el calendario también: metas del plan de estudio (ámbito
    // `idioma:<id>`) y el bloque de horario que agenda RepasoTab.
    await borrarMetasDeAmbito(actividadId('idioma', idioma.id))
    const agenda = buscarAgenda(await rutinasRepo.list(), actividadId('idioma', idioma.id))
    if (agenda?.id != null) await rutinasRepo.remove(agenda.id)
    await eliminarIdiomaCascada(idioma.id)
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel w-full max-w-sm space-y-3 rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            <Icono emoji={idioma.bandera} /> {idioma.nombre}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        <div className="space-y-1">
          <p className={labelCampo}>{t('idiomas.sel.nivel', 'Tu nivel actual')}</p>
          <SelectNivel
            valor={idioma.nivel}
            onCambiar={(n) => idioma.id != null && void idiomasRepo.update(idioma.id, { nivel: n })}
          />
          <p className="text-[10px] leading-snug text-white/35">
            {t('idiomas.sel.nivelTip', 'El tutor y las tarjetas generadas se adaptan a este nivel.')}
          </p>
        </div>

        {borrando ? (
          <div className="space-y-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs">
            <p className="text-rose-200/90">
              {t('idiomas.sel.confirmarBorrar', 'Se borrarán {tarjetas} tarjetas y {charlas} charlas de {idioma}. No hay vuelta atrás.', {
                tarjetas: String(nTarjetas),
                charlas: String(nCharlas),
                idioma: idioma.nombre,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setBorrando(false)} className="text-white/50 hover:text-white/80">
                {t('idiomas.form.cancelar', 'Cancelar')}
              </button>
              <button type="button" onClick={() => void borrar()} className="font-semibold text-rose-300 hover:text-rose-200">
                {t('idiomas.sel.siBorrar', 'Borrar todo')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setBorrando(true)}
            className="w-full rounded-xl border border-rose-400/30 bg-rose-400/10 py-2 text-xs font-semibold text-rose-200/90 transition hover:bg-rose-400/20"
          >
            <Icono nombre="basura" /> {t('idiomas.sel.borrar', 'Dejar este idioma')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Fila de pills de idiomas: cambiar de idioma, configurar el activo y agregar otro. */
export function SelectorIdiomas({ idiomas, activoId, onElegir }: {
  idiomas: PerfilIdioma[]
  activoId: number | null
  onElegir: (id: number) => void
}) {
  const t = useT()
  const [alta, setAlta] = useState(false)
  const [config, setConfig] = useState<PerfilIdioma | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {idiomas.map((i) => {
        const activo = i.id === activoId
        return (
          <button
            key={i.id}
            type="button"
            onClick={() => {
              if (i.id == null) return
              if (activo) setConfig(i)
              else onElegir(i.id)
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activo ? 'text-black' : 'bg-white/5 text-white/75 hover:bg-white/10'
            }`}
            style={activo ? { background: COLOR } : undefined}
            title={
              activo
                ? t('idiomas.sel.configTip', 'Nivel {nivel} · tocar para configurar', { nivel: i.nivel })
                : t('idiomas.sel.cambiarTip', 'Cambiar a {idioma}', { idioma: i.nombre })
            }
          >
            <Icono emoji={i.bandera} /> {i.nombre}
            {activo && <Icono nombre="ajustes" />}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => setAlta(true)}
        className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10"
        title={t('idiomas.sel.agregarTip', 'Aprender otro idioma')}
      >
        <Icono nombre="agregar" /> {t('idiomas.sel.agregar', 'Idioma')}
      </button>

      {alta && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setAlta(false)}>
          <div
            className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t('idiomas.sel.nuevoTitulo', 'Nuevo idioma')}</p>
              <button
                type="button"
                onClick={() => setAlta(false)}
                className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
            <AltaIdioma
              existentes={idiomas}
              onCreado={(id) => {
                setAlta(false)
                onElegir(id)
              }}
            />
          </div>
        </div>
      )}

      {config && <ConfigIdioma idioma={config} onCerrar={() => setConfig(null)} />}
    </div>
  )
}
