import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { iaActiva } from '../../core/chat/ia'
import { VACIO, borrarMapaIdeas, mapasIdeasRepo } from '../../core/data/repository'
import type { TipoMapa } from '../../core/data/db'
import { intencionApp } from '../../core/state/intencionApp'
import { COLOR } from './constantes'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { crearEjemplo, crearMapaIA, crearMapaVacio } from './crear'
import { ejemploDe } from './ejemplos'
import { MatrizDecision } from './MatrizDecision'
import { defTipo, tiposDe } from './tiposMapa'
import { EntradasQueUsan } from '../_shared/EntradasQueUsan'
import { LienzoMapa } from './LienzoMapa'
import { Creditos } from '../../core/ui/Creditos'
import { OP_MAPA } from './costosIA'

/** Mapa recién dibujado por el chat: la app se abre directamente en su lienzo. */
function mapaDeIntencion(): number | null {
  const dato = intencionApp('ideas')?.dato
  const id = dato ? Number(dato) : NaN
  return Number.isFinite(id) ? id : null
}

/**
 * Lista de mapas y lienzo del que esté abierto. La MISMA pestaña sirve a los
 * mapas conceptuales y a los diagramas de decisión: solo cambia la `familia`,
 * que filtra los formatos que se ofrecen y los mapas que se listan.
 */
export function MapasTab({ familia }: { familia: 'mapas' | 'diagramas' }) {
  const t = useT()
  const todos = mapasIdeasRepo.useAll() ?? VACIO
  const [abierto, setAbierto] = useState<number | null>(mapaDeIntencion)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoMapa>(tiposDe(familia)[0].id)
  const [editando, setEditando] = useState<number | null>(null)
  const [borrador, setBorrador] = useState('')
  const [borrando, setBorrando] = useState<number | null>(null)
  const [generando, setGenerando] = useState(false)
  const [errorIA, setErrorIA] = useState('')
  const [verGuia, setVerGuia] = useState(true)

  const tipos = tiposDe(familia)
  const mapas = todos.filter((m) => defTipo(m.tipo).familia === familia)
  // Buscar en los YA filtrados también sirve de guarda: el mapa que abrió el
  // chat solo se despliega en la pestaña que le toca.
  const mapaAbierto = mapas.find((m) => m.id === abierto) ?? null

  /** Texto propio de cada pestaña (mapa que se dibuja vs. decisión que se toma). */
  const tx = (clave: string, esMapas: string, esDiagramas: string) =>
    familia === 'mapas' ? t(`ideas.mapas.${clave}`, esMapas) : t(`ideas.diagramas.${clave}`, esDiagramas)

  /** Crea el mapa y sus raíces (1 nodo, o 2 conjuntos en los mapas por zonas). */
  const crear = async () => {
    const nom = nombre.trim()
    if (!nom) return
    const id = await crearMapaVacio(nom, tipo)
    setNombre('')
    setAbierto(id)
  }

  /**
   * Abre el ejemplo de fábrica de este formato. Se crea la primera vez y se
   * reutiliza después: si el usuario lo borra, el botón lo vuelve a traer.
   */
  const verEjemplo = async () => {
    const previo = mapas.find((m) => m.ejemplo && (m.tipo ?? 'mental') === tipo)
    setVerGuia(true)
    setAbierto(previo?.id ?? (await crearEjemplo(tipo)))
  }

  /** Genera el mapa completo con IA y lo materializa según su formato. */
  const generarConIA = async () => {
    const tema = nombre.trim()
    if (!tema || generando) return
    setGenerando(true)
    setErrorIA('')
    try {
      const { id } = await crearMapaIA(tema, tipo)
      setNombre('')
      setAbierto(id)
    } catch (e) {
      // El motivo REAL (clave inválida, red, cuota, formato…): sin esto todos
      // los fallos parecían el mismo y no había por dónde empezar.
      console.error('[ideas] fallo al generar el mapa con IA:', e)
      setErrorIA(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerando(false)
    }
  }

  if (mapaAbierto) {
    const d = defTipo(mapaAbierto.tipo)
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAbierto(null)}
            className="rounded-lg bg-white/5 p-1.5 hover:bg-white/10"
            title={tx('volver', 'Volver a los mapas', 'Volver a los diagramas')}
            aria-label={tx('volver', 'Volver a los mapas', 'Volver a los diagramas')}
          >
            <Icono nombre="atras" />
          </button>
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold">{mapaAbierto.nombre}</h3>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/55">
            <Icono nombre={d.icono} /> {t(`ideas.tipo.${d.id}`, d.nombreEs)}
          </span>
        </div>

        <EntradasQueUsan tipo="mapa" id={mapaAbierto.id} className="shrink-0" />

        {/* La guía viaja con el ejemplo: se explica el formato AL LADO del
            dibujo, que es donde de verdad se entiende. */}
        {mapaAbierto.ejemplo && (
          <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <button
              type="button"
              onClick={() => setVerGuia((v) => !v)}
              aria-expanded={verGuia}
              className="flex w-full items-center gap-1.5 text-start"
            >
              <Icono nombre="ayuda" />
              <span className="min-w-0 flex-1 text-xs font-semibold">
                {t('ideas.ejemplo.comoFunciona', '¿Cómo funciona este formato?')}
              </span>
              <Icono nombre={verGuia ? 'subir' : 'bajar'} />
            </button>
            {verGuia && (
              <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                {t(`ideas.guia.${d.id}`, ejemploDe(d.id).guiaEs)}
              </p>
            )}
          </div>
        )}

        {d.tabla ? (
          <MatrizDecision mapa={mapaAbierto} />
        ) : (
          <>
            <LienzoMapa mapa={mapaAbierto} />
            <p className="text-center text-[11px] text-white/35">
              {t('ideas.mapa.ayuda', 'Toca un nodo para elegirlo, tócalo otra vez para editarlo y arrástralo para acomodarlo. Pellizca para el zoom.')}
            </p>
          </>
        )}
      </div>
    )
  }

  // `w-full` es obligatorio junto a `mx-auto`: sin él los márgenes automáticos
  // anulan el estirado del flex y el panel se encoge al ancho de su contenido,
  // así que cada pestaña salía de un ancho distinto.
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-3" data-tut="ideas.mapas.alta">
        <div data-tut="ideas.mapas.tipos">
          <PestanasCarpeta
            items={tipos.map((d) => ({ id: d.id, icono: d.icono, labelEs: d.nombreEs }))}
            activo={tipo}
            onCambio={setTipo}
            prefijoClave="ideas.tipo"
            color={COLOR}
            variante="sub"
            flecha={false}
            rejilla
          />
        </div>
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/40">
            {t(`ideas.tipoDesc.${tipo}`, defTipo(tipo).descripcionEs)}
          </p>
          <button
            type="button"
            onClick={() => void verEjemplo()}
            className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
            data-tut="ideas.mapas.ejemplo"
          >
            <Icono nombre="ayuda" /> {t('ideas.ejemplo.ver', 'Ver un ejemplo')}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && crear()}
            placeholder={tx('placeholder', 'Tema del nuevo mapa…', 'Decisión o problema a analizar…')}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={crear}
            disabled={!nombre.trim() || generando}
            className="ui-accent-bg rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
          >
            <Icono nombre="agregar" /> {t('ideas.mapas.crear', 'Crear')}
          </button>
        </div>

        {/* Siempre visible aunque no haya IA (deshabilitado): oculto nadie lo descubre. */}
        <button
          type="button"
          onClick={() => void generarConIA()}
          disabled={!iaActiva() || !nombre.trim() || generando}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-40"
          data-tut="ideas.mapas.ia"
        >
          <Icono nombre="brillo" />
          {generando
            ? tx('generando', 'Dibujando el mapa…', 'Armando el diagrama…')
            : tx('generar', 'Generar el mapa con IA', 'Generar el diagrama con IA')}
          <Creditos op={OP_MAPA} />
        </button>
        {!iaActiva() && (
          <p className="text-[11px] text-white/40">
            {t('ideas.ia.sinClave', 'Configura la IA en el chat para generar mapas y diagramas.')}
          </p>
        )}
        {errorIA && (
          <p className="rounded-lg bg-red-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-300">
            {tx('errorIA', 'La IA no pudo generar el mapa:', 'La IA no pudo generar el diagrama:')} {errorIA}
          </p>
        )}
      </div>

      {mapas.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/40">
          {tx(
            'vacio',
            'Elige un formato y crea tu primer mapa con el tema que traigas en mente.',
            'Elige un formato y analiza esa decisión que traes dando vueltas.',
          )}
        </p>
      ) : (
        <div className="space-y-2">
          {mapas.map((m) => {
            const d = defTipo(m.tipo)
            return (
              <div
                key={m.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <span className="texto-vivo text-lg" style={vivo(m.color ?? COLOR)}>
                  <Icono nombre={d.icono} />
                </span>
                {editando === m.id ? (
                  <input
                    autoFocus
                    value={borrador}
                    onChange={(e) => setBorrador(e.target.value)}
                    onBlur={async () => {
                      setEditando(null)
                      const tx = borrador.trim()
                      if (tx && tx !== m.nombre && m.id != null) await mapasIdeasRepo.update(m.id, { nombre: tx })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setEditando(null)
                    }}
                    className="min-w-0 flex-1 rounded border border-white/20 bg-transparent px-1.5 py-0.5 text-sm outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    data-tut={`ideas.mapas.item.${m.id}`}
                    onClick={() => setAbierto(m.id ?? null)}
                    className="min-w-0 flex-1 text-start"
                  >
                    <span className="block truncate text-sm font-semibold">{m.nombre}</span>
                    <span className="text-[11px] text-white/40">
                      {t(`ideas.tipo.${d.id}`, d.nombreEs)} · {m.fecha}
                      {m.ejemplo && ` · ${t('ideas.ejemplo.chip', 'Ejemplo')}`}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditando(m.id ?? null)
                    setBorrador(m.nombre)
                  }}
                  className="text-white/30 transition hover:text-white/70"
                  title={t('ideas.editar', 'Editar')}
                  aria-label={t('ideas.editar', 'Editar')}
                >
                  <Icono nombre="editar" />
                </button>
                {borrando === m.id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setBorrando(null)
                      if (m.id != null) await borrarMapaIdeas(m.id)
                    }}
                    className="text-xs font-bold text-red-300"
                  >
                    {t('ideas.mapas.confirmarBorrar', '¿Borrar?')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBorrando(m.id ?? null)}
                    className="text-white/30 transition hover:text-red-400"
                    title={t('ideas.borrar', 'Borrar')}
                    aria-label={t('ideas.borrar', 'Borrar')}
                  >
                    <Icono nombre="basura" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
