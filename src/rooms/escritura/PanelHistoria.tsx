import { useState, type ReactNode } from 'react'
import type { Documento, RelacionLibro } from '../../core/data/db'
import { documentosRepo, historiasRepo, relacionesLibroRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { crearFicha, notaDeRelacion, CARPETAS, type CarpetaHistoria } from './fichas'
import { textoPlano } from './sanitizarHtml'

/**
 * Las carpetas del libro DENTRO del editor: un árbol plegable por sección, con
 * cada personaje como subcarpeta que guarda sus conexiones. La nota de una
 * conexión se lee en pequeño aquí mismo o en grande abriéndola en la hoja.
 * En pantallas chicas flota como overlay sobre el papel; en md+ es una columna.
 */
export function PanelHistoria({
  historiaId,
  docId,
  onIr,
  onCerrar,
  onRelaciones,
}: {
  historiaId: number
  /** El documento abierto en el editor (se resalta en la lista). */
  docId: number
  onIr: (id: number) => void
  onCerrar: () => void
  /** Abre el diagrama de relaciones entre personajes del libro. */
  onRelaciones?: () => void
}) {
  const t = useT()
  const historia = (historiasRepo.useAll() ?? VACIO).find((h) => h.id === historiaId)
  const documentos = (documentosRepo.useAll() ?? VACIO).filter((d) => d.historiaId === historiaId)
  const relaciones = (relacionesLibroRepo.useAll() ?? VACIO).filter((r) => r.historiaId === historiaId)

  // Plegado con el patrón del Archivador: `tocadas` INVIERTE el estado por
  // defecto (la carpeta que lleva a la ficha abierta), así los datos tardíos de
  // Dexie no dejan todo cerrado al montar.
  const [tocadas, setTocadas] = useState<Set<string>>(new Set())
  const [notaAbierta, setNotaAbierta] = useState<number | null>(null)

  const docActual = documentos.find((d) => d.id === docId)
  const porDefecto = new Set<string>()
  if (docActual?.seccion === 'trama') {
    porDefecto.add('acto')
    if (docActual.actoId != null) porDefecto.add(`a${docActual.actoId}`)
  } else if (docActual?.seccion === 'relacion') {
    porDefecto.add('personaje')
  } else if (docActual?.seccion) {
    porDefecto.add(docActual.seccion)
    if (docActual.seccion === 'personaje') porDefecto.add(`p${docActual.id}`)
  }
  const abierta = (k: string) => porDefecto.has(k) !== tocadas.has(k)
  const alternar = (k: string) =>
    setTocadas((prev) => {
      const sig = new Set(prev)
      if (sig.has(k)) sig.delete(k)
      else sig.add(k)
      return sig
    })

  const nombreDe = (id?: number) => documentos.find((d) => d.id === id)?.titulo ?? ''

  const crear = async (c: CarpetaHistoria, actoId?: number) => {
    const id =
      actoId != null
        ? await crearFicha(t, historiaId, 'trama', 'escritura.historias.nuevaTrama', 'Nueva trama', actoId)
        : await crearFicha(t, historiaId, c.seccion, c.claveNuevo, c.nuevoEs)
    if (id != null) onIr(id)
  }

  /** La nota de una conexión, en grande: se abre (o estrena) en la hoja. */
  const abrirNota = async (r: RelacionLibro) => {
    onIr(await notaDeRelacion(r, `${nombreDe(r.aId)} ↔ ${nombreDe(r.bId)}`))
  }

  const Fila = ({ d, sangrada }: { d: Documento; sangrada?: boolean }) => (
    <li className={sangrada ? 'ms-4' : ''}>
      <button
        type="button"
        onClick={() => d.id != null && onIr(d.id)}
        className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs transition hover:bg-white/10 ${
          d.id === docId ? 'bg-white/10 font-semibold text-white' : 'text-white/65'
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{d.titulo}</span>
      </button>
    </li>
  )

  /** Cabecera plegable de una carpeta de sección (chevron + icono + conteo). */
  const Plegable = ({
    k,
    icono,
    titulo,
    conteo,
    children,
  }: {
    k: string
    icono?: NombreIcono
    titulo: string
    conteo?: number
    children: ReactNode
  }) => (
    <div>
      <button
        type="button"
        onClick={() => alternar(k)}
        aria-expanded={abierta(k)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 transition hover:bg-white/10"
      >
        <span className="text-white/35">
          <Icono nombre={abierta(k) ? 'desplegado' : 'plegado'} />
        </span>
        {icono && <Icono nombre={icono} />}
        <span className="min-w-0 flex-1 truncate">{titulo}</span>
        {conteo != null && conteo > 0 && <span className="text-[10px] text-white/35">{conteo}</span>}
      </button>
      {abierta(k) && <div className="ms-3 space-y-0.5">{children}</div>}
    </div>
  )

  return (
    <div className="ui-panel absolute inset-y-0 left-0 z-10 flex w-64 flex-col rounded-xl border border-white/10 md:static md:w-56 md:shrink-0">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2.5">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-white/60">
          {historia?.titulo ?? t('escritura.historias.boton', 'Carpetas de la historia')}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={t('escritura.historias.cerrarPanel', 'Cerrar las carpetas')}
          title={t('escritura.historias.cerrarPanel', 'Cerrar las carpetas')}
          className="rounded-lg px-1.5 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      {onRelaciones && (
        <button
          type="button"
          onClick={onRelaciones}
          className="mx-2 mt-1 flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-start text-xs text-white/65 transition hover:bg-white/10 hover:text-white"
        >
          <Icono nombre="vinculo" /> {t('escritura.relaciones.boton', 'Relaciones entre personajes')}
        </button>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {CARPETAS.map((c) => {
          const propios = documentos.filter((d) => d.seccion === c.seccion)
          return (
            <Plegable key={c.seccion} k={c.seccion} icono={c.icono} titulo={t(c.clave, c.labelEs)} conteo={propios.length}>
              {c.seccion === 'personaje' ? (
                // Cada personaje es una subcarpeta con sus conexiones dentro.
                propios.map((p) => {
                  const suyas = relaciones.filter((r) => r.aId === p.id || r.bId === p.id)
                  return (
                    <div key={p.id} className="flex flex-col">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => alternar(`p${p.id}`)}
                          aria-expanded={abierta(`p${p.id}`)}
                          aria-label={t('escritura.relaciones.titulo', 'Relaciones')}
                          className="rounded-lg px-1 py-1 text-white/35 transition hover:bg-white/10"
                        >
                          <Icono nombre={abierta(`p${p.id}`) ? 'desplegado' : 'plegado'} />
                        </button>
                        <ul className="min-w-0 flex-1">
                          <Fila d={p} />
                        </ul>
                      </div>
                      {abierta(`p${p.id}`) && (
                        <ul className="ms-5 space-y-0.5">
                          {suyas.map((r) => {
                            const notaDoc = documentos.find((d) => d.id === r.docId)
                            const desplegada = notaAbierta === r.id
                            return (
                              <li key={r.id}>
                                <button
                                  type="button"
                                  onClick={() => r.id != null && setNotaAbierta(desplegada ? null : r.id)}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left text-[11px] text-white/55 transition hover:bg-white/10 hover:text-white/80"
                                >
                                  <Icono nombre="vinculo" />
                                  <span className="min-w-0 flex-1 truncate">
                                    {r.texto} · {nombreDe(r.aId === p.id ? r.bId : r.aId)}
                                  </span>
                                </button>
                                {desplegada && (
                                  <div className="ms-4 mt-0.5 space-y-1 rounded-lg bg-black/20 p-2">
                                    <p className="line-clamp-4 whitespace-pre-wrap text-[11px] text-white/60">
                                      {textoPlano(notaDoc?.contenido ?? '') ||
                                        t('escritura.relaciones.sinNota', 'Sin nota aún: ábrela en la hoja y escríbela.')}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => void abrirNota(r)}
                                      className="flex items-center gap-1 text-[11px] text-white/45 transition hover:text-white"
                                    >
                                      <Icono nombre="expandir" /> {t('escritura.relaciones.abrirHoja', 'Abrir en la hoja')}
                                    </button>
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })
              ) : c.seccion === 'acto' ? (
                // Cada acto es una subcarpeta con sus tramas dentro.
                propios.map((acto) => (
                  <div key={acto.id} className="flex flex-col">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => alternar(`a${acto.id}`)}
                        aria-expanded={abierta(`a${acto.id}`)}
                        aria-label={t('escritura.historias.tramas', 'Tramas')}
                        className="rounded-lg px-1 py-1 text-white/35 transition hover:bg-white/10"
                      >
                        <Icono nombre={abierta(`a${acto.id}`) ? 'desplegado' : 'plegado'} />
                      </button>
                      <ul className="min-w-0 flex-1">
                        <Fila d={acto} />
                      </ul>
                    </div>
                    {abierta(`a${acto.id}`) && (
                      <ul className="ms-5 space-y-0.5">
                        {documentos
                          .filter((d) => d.actoId === acto.id)
                          .map((tr) => (
                            <Fila key={tr.id} d={tr} />
                          ))}
                        <li>
                          <BotonNuevo
                            onClick={() => void crear(c, acto.id)}
                            texto={t('escritura.historias.nuevaTrama', 'Nueva trama')}
                          />
                        </li>
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <ul className="space-y-0.5">
                  {propios.map((d) => (
                    <Fila key={d.id} d={d} />
                  ))}
                </ul>
              )}
              <BotonNuevo onClick={() => void crear(c)} texto={t(c.claveNuevo, c.nuevoEs)} />
            </Plegable>
          )
        })}
      </div>
    </div>
  )
}

function BotonNuevo({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/75"
    >
      <Icono nombre="agregar" /> {texto}
    </button>
  )
}
