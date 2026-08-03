import { useState } from 'react'
import type { PerfilIdioma } from '../../core/data/db'
import { tarjetasIdiomaRepo, temasIdiomaRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { CAJA_MAX, COLOR, NIVELES } from './constantes'
import { esDominada } from './srs'
import { getTema } from './temario'
import { TarjetaForm, type TarjetaFormInicial } from './TarjetaForm'
import { GenerarPanel } from './GenerarPanel'
import { hablar, hayTTS } from './tts'
import { VistaBlob } from '../_shared/ImagenIA'

/** Lista del vocabulario del idioma: buscar, filtrar, crear, editar y escuchar. */
export function VocabularioTab({ perfil, temaInicial, onTemaAplicado }: {
  perfil: PerfilIdioma
  /** Tema preseleccionado al saltar desde el temario (🃏). */
  temaInicial: string | null
  /** Avisa que el usuario cambió el filtro a mano (el padre olvida el salto). */
  onTemaAplicado: () => void
}) {
  const t = useT()
  const nodos = (temasIdiomaRepo.useAll() ?? []).filter((n) => n.idiomaId === perfil.id)
  const tarjetas = (tarjetasIdiomaRepo.useAll() ?? []).filter((x) => x.idiomaId === perfil.id)

  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('todos')
  const [filtroTema, setFiltroTema] = useState(temaInicial ?? 'todos')
  const [form, setForm] = useState<{ inicial: TarjetaFormInicial; tarjetaId?: number } | null>(null)
  const [generar, setGenerar] = useState(false)
  const [borrandoId, setBorrandoId] = useState<number | null>(null)

  const conIA = iaActiva()
  const conTTS = hayTTS()
  const clave = busqueda.trim().toLowerCase()
  const filtradas = tarjetas.filter(
    (x) =>
      (filtroNivel === 'todos' || x.nivel === filtroNivel) &&
      (filtroTema === 'todos' || x.temaId === filtroTema) &&
      (!clave || x.termino.toLowerCase().includes(clave) || x.traduccion.toLowerCase().includes(clave)),
  )
  const dominadas = tarjetas.filter((x) => esDominada(x.caja)).length

  const temasConTarjetas = [...new Set(tarjetas.map((x) => x.temaId).filter((x): x is string => !!x))]
  const tituloTema = (id: string) => getTema(id)?.titulo ?? nodos.find((n) => n.temaId === id)?.titulo ?? id

  const inputBase =
    'rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm outline-none focus:border-white/30'

  return (
    <div className="space-y-3" data-tut="idiomas.vocabulario.lista">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            setForm({
              inicial: {
                termino: '',
                traduccion: '',
                tipo: 'palabra',
                nivel: perfil.nivel,
                temaId: filtroTema !== 'todos' ? filtroTema : undefined,
              },
            })
          }
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-black transition"
          style={{ background: COLOR }}
        >
          ＋ {t('idiomas.voc.nueva', 'Nueva tarjeta')}
        </button>
        <button
          type="button"
          onClick={() => setGenerar(true)}
          disabled={!conIA}
          className="rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
          title={
            conIA
              ? t('idiomas.voc.generarTip', 'La IA genera tarjetas de un tema del temario')
              : t('idiomas.sinIA.corto', 'Configura tu IA en Ajustes')
          }
        >
          <Icono nombre="brillo" /> {t('idiomas.voc.generar', 'Generar')}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t('idiomas.voc.buscar', 'Buscar término o traducción…')}
          className={`${inputBase} min-w-0 flex-1`}
        />
        <select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)} className={inputBase}>
          <option value="todos">{t('idiomas.voc.nivelTodos', 'Nivel')}</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {temasConTarjetas.length > 0 && (
          <select
            value={filtroTema}
            onChange={(e) => {
              setFiltroTema(e.target.value)
              onTemaAplicado()
            }}
            className={`${inputBase} max-w-[9rem]`}
          >
            <option value="todos">{t('idiomas.voc.temaTodos', 'Tema')}</option>
            {temasConTarjetas.map((id) => (
              <option key={id} value={id}>
                {tituloTema(id)}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-[10px] text-white/40">
        {t('idiomas.voc.conteo', '{n} tarjetas · {d} dominadas', {
          n: String(tarjetas.length),
          d: String(dominadas),
        })}
      </p>

      {filtradas.length === 0 && (
        <p className="px-4 py-8 text-center text-xs leading-relaxed text-white/35">
          {tarjetas.length === 0
            ? t('idiomas.voc.vacio', 'Aún no hay tarjetas de {idioma}. Crea la primera, charla con tu tutor o genera un tema con la IA.', { idioma: perfil.nombre })
            : t('idiomas.voc.sinResultados', 'Ninguna tarjeta coincide con el filtro.')}
        </p>
      )}

      <div className="space-y-2">
        {filtradas.map((x) => (
          <div key={x.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              {conTTS && (
                <button
                  type="button"
                  onClick={() => hablar(x.termino, perfil.codigo)}
                  className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
                  title={t('idiomas.voc.escuchar', 'Escuchar')}
                >
                  <Icono nombre="bocina" />
                </button>
              )}
              {x.imagen && <VistaBlob blob={x.imagen} className="h-9 w-9 shrink-0 rounded-lg" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">{x.termino}</p>
                <p className="truncate text-xs text-white/45">
                  {x.traduccion}
                  {x.temaId && <span className="text-white/30"> · {tituloTema(x.temaId)}</span>}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  esDominada(x.caja) ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/50'
                }`}
                title={t('idiomas.voc.cajaTip', 'Caja de repaso: entre más alta, más se espacia')}
              >
                {x.caja}/{CAJA_MAX}
              </span>
              <span className="shrink-0 text-[9px] uppercase text-white/30">{x.nivel}</span>
              <button
                type="button"
                onClick={() =>
                  x.id != null &&
                  setForm({
                    inicial: {
                      termino: x.termino,
                      traduccion: x.traduccion,
                      ejemplo: x.ejemplo,
                      tipo: x.tipo,
                      nivel: x.nivel,
                      temaId: x.temaId,
                      imagen: x.imagen,
                    },
                    tarjetaId: x.id,
                  })
                }
                className="shrink-0 rounded px-1.5 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
                title={t('idiomas.voc.editar', 'Editar tarjeta')}
              >
                <Icono nombre="editar" />
              </button>
              <button
                type="button"
                onClick={() => setBorrandoId(borrandoId === x.id ? null : (x.id ?? null))}
                className="shrink-0 rounded px-1.5 py-1 text-xs text-white/25 transition hover:bg-white/10 hover:text-white/70"
                title={t('idiomas.voc.borrar', 'Borrar tarjeta')}
              >
                <Icono nombre="basura" />
              </button>
            </div>
            {borrandoId === x.id && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs">
                <span className="text-rose-200/90">{t('idiomas.voc.confirmarBorrar', '¿Borrar esta tarjeta?')}</span>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => x.id != null && void tarjetasIdiomaRepo.remove(x.id)}
                    className="font-semibold text-rose-300 hover:text-rose-200"
                  >
                    {t('idiomas.voc.siBorrar', 'Borrar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorrandoId(null)}
                    className="text-white/50 hover:text-white/80"
                  >
                    {t('idiomas.form.cancelar', 'Cancelar')}
                  </button>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {form && (
        <TarjetaForm perfil={perfil} inicial={form.inicial} tarjetaId={form.tarjetaId} onCerrar={() => setForm(null)} />
      )}
      {generar && <GenerarPanel perfil={perfil} onCerrar={() => setGenerar(false)} />}
    </div>
  )
}
