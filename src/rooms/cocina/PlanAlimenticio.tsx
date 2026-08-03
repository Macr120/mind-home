import { useState } from 'react'
import type { DietaGuardada, PerfilNutricion, Receta } from '../../core/data/db'
import { dietasGuardadasRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { imagenIaActiva } from '../../core/imagenIA'
import { Creditos } from '../../core/ui/Creditos'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { aplicarObjetivosDieta, generarDietaCompleta } from './generarDieta'
import { RECETAS_POR_DIETA, costoDieta } from './costosIA'
import { ChipsReparto } from './DietasTab'
import { Portada } from './Portada'
import { urlImagenDieta } from './imagenesPreset'

/**
 * El puente entre las metas y el recetario: recomienda un plan alimenticio.
 * Si ya hay dietas guardadas, propone usarlas como objetivos; si no (o si
 * ninguna convence), la IA genera una a la medida del perfil — con sus
 * recetas y fotos, directo al recetario.
 */
export function PlanAlimenticio({
  perfil,
  dietas,
  recetas,
  onIrARecetario,
}: {
  perfil: PerfilNutricion
  dietas: DietaGuardada[]
  recetas: Receta[]
  onIrARecetario: () => void
}) {
  const t = useT()
  const [restricciones, setRestricciones] = useState('')
  const [abiertoManual, setAbiertoManual] = useState(false)
  // Sin dietas que ofrecer, el generador es lo único que hay: siempre abierto.
  // Se deriva en render y no en un useState: las dietas llegan async y el
  // primer render siempre ve la lista vacía.
  const abierto = abiertoManual || dietas.length === 0
  const [fase, setFase] = useState<'' | 'plan' | 'fotos'>('')
  const [error, setError] = useState('')
  const [creadaId, setCreadaId] = useState<number | null>(null)
  const [aplicadaId, setAplicadaId] = useState<number | null>(null)
  const generando = fase !== ''

  const generar = async () => {
    if (generando || !iaActiva()) return
    setError('')
    try {
      const dieta = await generarDietaCompleta(peticionDesdePerfil(perfil, restricciones), setFase)
      const id = await dietasGuardadasRepo.add(dieta)
      setCreadaId(id)
      setRestricciones('')
      setAbiertoManual(false)
    } catch {
      setError(t('cocina.dieta.errorIA', 'No se pudo crear la dieta. Inténtalo otra vez.'))
    } finally {
      setFase('')
    }
  }

  const aplicar = async (d: DietaGuardada) => {
    await aplicarObjetivosDieta(d)
    setAplicadaId(d.id ?? null)
    setTimeout(() => setAplicadaId(null), 2500)
  }

  /** Las dietas no tienen emoji propio: el de su primera receta. */
  const emojiDe = (d: DietaGuardada) =>
    recetas.find((r) => r.id != null && d.recetaIds.includes(r.id))?.emoji ?? '🥗'

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <p className="text-sm font-semibold">
        <Icono nombre="chef" /> {t('cocina.planAlim.titulo', 'Plan alimenticio')}
      </p>
      <p className="text-xs text-white/40">
        {dietas.length > 0
          ? t('cocina.planAlim.ayuda', 'Elige una dieta como tu plan (pone sus macros como tus objetivos) o genera una nueva a tu medida.')
          : t('cocina.planAlim.vacio', 'Aún no hay dietas en el recetario. Genera un plan a tu medida: crea la dieta y sus recetas por ti.')}
      </p>

      {dietas.length > 0 && (
        <ul className="space-y-2">
          {dietas.map((d) => (
            <li
              key={d.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                d.id === creadaId ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <Portada
                foto={d.foto}
                url={urlImagenDieta(d.nombre)}
                emoji={emojiDe(d)}
                nombre={d.nombre}
                className="h-10 w-10 shrink-0 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white/90">{d.nombre}</p>
                {d.calorias != null && <p className="text-[10px] text-white/40">{d.calorias} kcal</p>}
                <ChipsReparto dieta={d} />
              </div>
              <button
                type="button"
                onClick={() => aplicar(d)}
                disabled={d.calorias == null && d.proteinas == null}
                className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-bold texto-cta hover:brightness-110 disabled:opacity-40"
              >
                {d.id === aplicadaId
                  ? t('cocina.planAlim.usada', '✓ Es tu plan')
                  : t('cocina.planAlim.usar', 'Usarla')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {creadaId !== null && (
        <button
          type="button"
          onClick={onIrARecetario}
          className="w-full rounded-lg bg-white/10 py-2 text-xs font-semibold hover:bg-white/15"
        >
          {t('cocina.planAlim.verRecetario', 'Ver la dieta y sus recetas en el recetario')}
        </button>
      )}

      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbiertoManual(true)}
          className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold hover:bg-white/15"
        >
          <Icono nombre="brillo" /> {t('cocina.planAlim.otra', 'Generar otro plan con IA')}
        </button>
      ) : (
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-[11px] text-white/60">
            {t('cocina.planAlim.desdePerfil', 'Se arma con tu información y tus metas de arriba.')}
          </p>
          <input
            value={restricciones}
            onChange={(e) => setRestricciones(e.target.value)}
            placeholder={t('cocina.planAlim.phRestricciones', 'Alergias, gustos, presupuesto… (opcional)')}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
          />
          <button
            type="button"
            onClick={generar}
            disabled={generando || !iaActiva()}
            className="w-full rounded-lg bg-amber-600 py-2 text-sm font-bold texto-cta hover:brightness-110 disabled:opacity-40"
          >
            {fase === 'plan'
              ? t('cocina.dieta.generando', 'Armando tu dieta y sus recetas…')
              : fase === 'fotos'
              ? t('cocina.dieta.generandoFotos', 'Pintando las fotos…')
              : t('cocina.planAlim.recomendar', 'Recomendar mi plan')}
          </button>
          <div className="flex items-center gap-2">
            <Creditos n={costoDieta(imagenIaActiva())} aprox />
            <span className="text-[10px] text-white/40">
              {imagenIaActiva()
                ? t('cocina.ia.costoDieta', `La dieta, hasta ${RECETAS_POR_DIETA} recetas y sus fotos`, {
                    n: String(RECETAS_POR_DIETA),
                  })
                : t('cocina.ia.costoDietaSinFoto', `La dieta y hasta ${RECETAS_POR_DIETA} recetas, sin fotos`, {
                    n: String(RECETAS_POR_DIETA),
                  })}
            </span>
          </div>
          {!iaActiva() && (
            <p className="text-[11px] text-white/40">
              {t('cocina.ia.sinClave', 'Configura la IA en el chat para crear recetas y dietas con imágenes.')}
            </p>
          )}
          {error && <p className="text-xs text-amber-300">{error}</p>}
        </div>
      )}
    </div>
  )
}

/** La petición del plan sale del perfil: objetivo, números y lo que el usuario añada. */
function peticionDesdePerfil(p: PerfilNutricion, extra: string): string {
  const objetivoTxt =
    p.objetivo === 'deficit'
      ? 'bajar de peso'
      : p.objetivo === 'superavit'
      ? 'subir de masa muscular'
      : 'mantener el peso'
  const partes = [
    `Dieta para ${objetivoTxt}: unas ${p.calorias} kcal al día`,
    `${p.proteinas} g de proteína, ${p.carbohidratos} g de carbohidratos y ${p.grasas} g de grasas`,
  ]
  if (p.pesoKg) partes.push(`peso actual ${p.pesoKg} kg`)
  if (p.pesoObjetivoKg) partes.push(`peso objetivo ${p.pesoObjetivoKg} kg`)
  const base = `${partes.join(', ')}.`
  return extra.trim() ? `${base} Además: ${extra.trim()}` : base
}
