import { useState } from 'react'
import type { PerfilIdioma } from '../../core/data/db'
import { VACIO, materialesIdiomaRepo, tarjetasIdiomaRepo, temasIdiomaRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { COLOR } from './constantes'
import { AREAS, catalogoArea, type AreaTemario } from './temario'
import type { AnclaTema } from './arbol'
import { GenerarPanel } from './GenerarPanel'
import { MaterialPanel } from './MaterialPanel'

/** Icono y frase de arranque de la charla, por área del temario. */
const META_AREA: Record<AreaTemario, { icono: NombreIcono; descEs: string; promptEs: string }> = {
  temas: {
    icono: 'chat',
    descEs: 'De qué hablar: el vocabulario y las situaciones de cada nivel.',
    promptEs: 'Quiero practicar «{tema}». Empecemos.',
  },
  pronunciacion: {
    icono: 'microfono',
    descEs: 'Cómo suena el idioma: sonidos, acento, ritmo y entonación.',
    promptEs: 'Quiero trabajar mi pronunciación: «{tema}». Explícame y ponme ejemplos para repetir.',
  },
  gramatica: {
    icono: 'regla',
    descEs: 'Las reglas del idioma: estructuras y tiempos verbales por nivel.',
    promptEs: 'Explícame la gramática de «{tema}» con ejemplos y luego ponme ejercicios.',
  },
}

/**
 * Temario por niveles MCER en tres áreas (temas, pronunciación y gramática):
 * acordeón con los temas estáticos + los nodos desbloqueados por charlas. Cada
 * tema enlaza charlar (💬), ver sus tarjetas (🃏), generar vocabulario con IA
 * (✨) y guardar material propio (📁).
 */
export function TemarioTab({ perfil, onConversar, onVerTarjetas }: {
  perfil: PerfilIdioma
  onConversar: (ancla: AnclaTema, borrador: string) => void
  onVerTarjetas: (temaId: string) => void
}) {
  const t = useT()
  const [area, setArea] = useState<AreaTemario>('temas')
  const [abierto, setAbierto] = useState<string | null>(perfil.nivel)
  const [generar, setGenerar] = useState<{ id: string; titulo: string; nivel: string; area: AreaTemario } | null>(null)
  const [material, setMaterial] = useState<{ id: string; titulo: string } | null>(null)

  const conIA = iaActiva()
  const tarjetas = (tarjetasIdiomaRepo.useAll() ?? VACIO).filter((x) => x.idiomaId === perfil.id)
  const nodos = (temasIdiomaRepo.useAll() ?? VACIO).filter((n) => n.idiomaId === perfil.id)
  const materiales = (materialesIdiomaRepo.useAll() ?? VACIO).filter((m) => m.idiomaId === perfil.id)

  const porTema = new Map<string, number>()
  for (const x of tarjetas) if (x.temaId) porTema.set(x.temaId, (porTema.get(x.temaId) ?? 0) + 1)
  const porMaterial = new Map<string, number>()
  for (const m of materiales) porMaterial.set(m.temaId, (porMaterial.get(m.temaId) ?? 0) + 1)

  const metaArea = META_AREA[area]

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setArea(a.id)}
            className={`flex-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
              area === a.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={area === a.id ? { background: COLOR } : undefined}
          >
            <Icono nombre={META_AREA[a.id].icono} /> {t(`idiomas.area.${a.id}`, a.labelEs)}
          </button>
        ))}
      </div>
      <p className="px-1 pb-1 text-[10px] leading-relaxed text-white/40">
        {t(`idiomas.area.${area}.desc`, metaArea.descEs)}
      </p>

      {catalogoArea(area).map((nivel) => {
        const dinamicos = area === 'temas' ? nodos.filter((n) => n.nivel === nivel.nivel) : []
        const temas = [
          ...nivel.temas.map((x) => ({ id: x.id, titulo: x.titulo, descripcion: x.descripcion, dinamico: false })),
          ...dinamicos.map((n) => ({ id: n.temaId, titulo: n.titulo, descripcion: n.descripcion, dinamico: true })),
        ]
        const cubiertos = temas.filter((x) => (porTema.get(x.id) ?? 0) > 0).length
        const esAbierto = abierto === nivel.nivel
        const esMiNivel = perfil.nivel === nivel.nivel

        return (
          <div key={nivel.nivel} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => setAbierto(esAbierto ? null : nivel.nivel)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/5"
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black text-black"
                style={{ background: COLOR }}
              >
                {nivel.nivel}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white/90">
                  {t(`idiomas.nivel.${nivel.nivel}`, nivel.titulo)}
                  {esMiNivel && (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-semibold text-black"
                      style={{ background: COLOR }}
                    >
                      {t('idiomas.tem.tuNivel', 'tu nivel')}
                    </span>
                  )}
                </span>
                <span className="block text-[10px] text-white/40">
                  {t('idiomas.tem.cobertura', '{c}/{total} temas con vocabulario', {
                    c: String(cubiertos),
                    total: String(temas.length),
                  })}
                </span>
              </span>
              <span className="shrink-0 text-xs text-white/35">{esAbierto ? '▾' : '▸'}</span>
            </button>
            <div className="h-1 bg-black/30">
              <div
                className="h-full"
                style={{ width: `${temas.length ? (cubiertos / temas.length) * 100 : 0}%`, background: COLOR }}
              />
            </div>

            {esAbierto && (
              <div className="space-y-1.5 p-2">
                {temas.map((tema) => {
                  const n = porTema.get(tema.id) ?? 0
                  const nMaterial = porMaterial.get(tema.id) ?? 0
                  return (
                    <div
                      key={tema.id}
                      className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white/85">
                          {tema.dinamico && <Icono nombre="brillo" />} {tema.titulo}
                        </span>
                        {tema.descripcion && (
                          <span className="block truncate text-[10px] text-white/35">{tema.descripcion}</span>
                        )}
                      </span>
                      {n > 0 && (
                        <span
                          className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55"
                          title={t('idiomas.tem.nTarjetas', '{n} tarjetas de este tema', { n: String(n) })}
                        >
                          <Icono nombre="registros" /> {n}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onConversar(
                            { temaId: tema.id, titulo: tema.titulo },
                            t(`idiomas.tem.prompt.${area}`, metaArea.promptEs, { tema: tema.titulo }),
                          )
                        }
                        disabled={!conIA}
                        className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-35"
                        title={t('idiomas.tem.charlarTip', 'Practicar este tema con tu tutor')}
                      >
                        <Icono nombre="chat" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterial({ id: tema.id, titulo: tema.titulo })}
                        className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
                        title={t('idiomas.tem.materialTip', 'Tus apuntes e imágenes de este tema')}
                      >
                        <Icono nombre="carpeta" />
                        {nMaterial > 0 && <span className="ml-1 text-[10px] text-white/55">{nMaterial}</span>}
                      </button>
                      {n > 0 && (
                        <button
                          type="button"
                          onClick={() => onVerTarjetas(tema.id)}
                          className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
                          title={t('idiomas.tem.verTarjetasTip', 'Ver las tarjetas de este tema')}
                        >
                          <Icono nombre="registros" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setGenerar({ id: tema.id, titulo: tema.titulo, nivel: nivel.nivel, area })}
                        disabled={!conIA}
                        className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-35"
                        title={
                          conIA
                            ? t('idiomas.tem.generarTip', 'Generar vocabulario de este tema con IA')
                            : t('idiomas.sinIA.corto', 'Configura tu IA en Ajustes')
                        }
                      >
                        <Icono nombre="brillo" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {generar && <GenerarPanel perfil={perfil} temaFijo={generar} onCerrar={() => setGenerar(null)} />}
      {material && (
        <MaterialPanel perfil={perfil} tema={material} onCerrar={() => setMaterial(null)} />
      )}
    </div>
  )
}
