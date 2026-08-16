import type { PerfilIdioma } from '../../core/data/db'
import { VACIO, conversacionesIdiomaRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { useAsistentes } from '../../core/state/asistentesStore'
import { asistenteDePlantilla, semillaAsistente } from '../../core/gamificacion/asistentesPlantilla'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { tituloTema as tituloDeTema, useTemario } from './temarioVivo'
import { ChatTutor } from './ChatTutor'
import type { AnclaTema } from './arbol'

/** Lista de charlas de práctica del idioma activo, o la charla abierta. */
export function CharlasTab({ perfil, abierta, onAbrir, onCerrar, borradorInicial, anclaInicial, sesion, onIrAlTemario }: {
  perfil: PerfilIdioma
  abierta: number | 'nueva' | null
  onAbrir: (id: number | 'nueva') => void
  onCerrar: () => void
  borradorInicial: string
  anclaInicial: AnclaTema | null
  /** Key de la charla: cambia con cada charla nueva para remontar limpio. */
  sesion: number
  /** Salta al temario (con un tema abierto, o al temario a secas). */
  onIrAlTemario: (temaId: string | null) => void
}) {
  const t = useT()
  const charlas = (conversacionesIdiomaRepo.useAll() ?? VACIO).filter((c) => c.idiomaId === perfil.id)
  const tx = useTemario(perfil.id)
  const lista = useAsistentes((s) => s.lista)
  const voz = asistenteDePlantilla(lista, 'idiomas') ?? semillaAsistente('idiomas')

  if (abierta !== null) {
    return (
      <ChatTutor
        key={sesion}
        perfil={perfil}
        conversacionId={abierta === 'nueva' ? null : abierta}
        borradorInicial={borradorInicial}
        anclaInicial={anclaInicial}
        onCreada={onAbrir}
        onSalir={onCerrar}
        onIrAlTemario={onIrAlTemario}
      />
    )
  }

  const conIA = iaActiva()
  const tituloTema = (id?: string) => tituloDeTema(tx, id)

  return (
    <div className="space-y-3">
      {!conIA && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
          {t('idiomas.sinIA', 'Configura tu IA (Ajustes → Inteligencia artificial) para charlar con tu tutor. Mientras, el vocabulario, el repaso y los ejercicios funcionan sin ella.')}
        </p>
      )}

      <button
        type="button"
        data-tut="idiomas.charlas.nueva"
        onClick={() => onAbrir('nueva')}
        disabled={!conIA}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
        style={{ background: COLOR }}
      >
        <Icono nombre="chat" /> {t('idiomas.charla.nuevaBtn', 'Nueva charla con {tutor}', { tutor: voz.nombre })}
      </button>

      {charlas.length === 0 && (
        <p className="px-4 py-10 text-center text-xs leading-relaxed text-white/35">
          {t('idiomas.charla.vacio', 'Aún no hay charlas de {idioma}. Tu tutor conversa a tu nivel, te corrige con suavidad y del chat salen tarjetas de vocabulario.', { idioma: perfil.nombre })}
        </p>
      )}

      <div data-tut="idiomas.charlas.lista" className="space-y-2">
        {charlas.map((c) => {
          const tema = tituloTema(c.temaId)
          return (
            <button
              key={c.id}
              type="button"
              data-tut={`idiomas.charlas.item.${c.id}`}
              onClick={() => c.id != null && onAbrir(c.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-start transition hover:bg-white/10"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/25 text-lg">
                <Icono emoji={perfil.bandera} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white/90">
                  {c.titulo || t('idiomas.charla.sinTitulo', 'Charla sin título')}
                </span>
                <span className="block truncate text-[10px] text-white/40">
                  {tema ?? t('idiomas.charla.libre', 'Práctica libre')}
                  {c.destiladaEn && ` · ${t('idiomas.charla.conVocab', 'vocabulario extraído')}`}
                </span>
              </span>
              <span className="shrink-0 text-[10px] text-white/35">
                {new Date(c.actualizadoEn).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
