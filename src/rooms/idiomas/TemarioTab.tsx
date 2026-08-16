import { useMemo, useState, type ReactNode } from 'react'
import type { PerfilIdioma, TarjetaIdioma } from '../../core/data/db'
import { VACIO, materialesIdiomaRepo, tarjetasIdiomaRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { CAJA_MAX, COLOR } from './constantes'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { esDominada } from './srs'
import {
  borrarNodo,
  crearNodo,
  renombrarNodo,
  reordenarHermanos,
  ruta,
  temasDe,
  tituloNodo,
  useTemario,
  type NodoTema,
} from './temarioVivo'
import type { AnclaTema } from './arbol'
import { GenerarPanel } from './GenerarPanel'
import { IlustrarTarjeta } from './IlustrarTarjeta'
import { MaterialPanel } from './MaterialPanel'
import { OpcionesTemas } from './OpcionesTemas'
import { TarjetaForm, type TarjetaFormInicial } from './TarjetaForm'
import { hablar, hayTTS } from './tts'
import { VistaBlob } from '../_shared/ImagenIA'

/** Icono y frase de arranque de la charla, por área DE FÁBRICA. */
const META_AREA: Record<string, { icono: NombreIcono; descEs: string; promptEs: string }> = {
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

const btnEdit =
  'shrink-0 rounded px-1.5 py-1 text-[11px] text-white/35 transition hover:bg-white/10 hover:text-white/80'
const btnFila = 'shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10'

/** Lo que necesita cada fila de tema, que se pinta recursivamente. */
interface CtxTemario {
  t: ReturnType<typeof useT>
  edicion: boolean
  conIA: boolean
  /** BCP-47 del idioma, para la voz de las tarjetas. */
  codigo: string
  porTema: Map<string, TarjetaIdioma[]>
  porMaterial: Map<string, number>
  abiertos: ReadonlySet<string>
  resaltado: string | null
  alternar: (id: string) => void
  conversar: (tema: NodoTema) => void
  material: (tema: NodoTema) => void
  practicar: (temaId: string) => void
  generar: (tema: NodoTema) => void
  nuevaTarjeta: (tema: NodoTema) => void
  editarTarjeta: (x: TarjetaIdioma) => void
  ilustrar: (tarjetaId: number) => void
  renombrar: (n: NodoTema) => void
  agregar: (padre: NodoTema) => void
  borrar: (n: NodoTema) => void
  mover: (hermanos: string[], id: string, delta: number) => void
}

/** Un tema del temario: sus tarjetas y, colgando, sus subtemas. */
function FilaTema({ tema, hermanos, ctx }: { tema: NodoTema; hermanos: string[]; ctx: CtxTemario }) {
  const { t } = ctx
  const mazo = ctx.porTema.get(tema.id) ?? []
  const nMaterial = ctx.porMaterial.get(tema.id) ?? 0
  const desplegado = ctx.abiertos.has(tema.id) || tema.id === ctx.resaltado
  const idsHijos = tema.hijos.map((x) => x.id)
  const nSubtemas = temasDe(tema).length - 1

  return (
    <div className={`rounded-lg bg-black/20 px-2.5 py-2 ${ctx.resaltado === tema.id ? 'ring-2 ring-white/60' : ''}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ctx.alternar(tema.id)}
          className="w-4 shrink-0 text-center text-xs text-white/40 transition hover:text-white/80"
          title={t('idiomas.tem.verTarjetasTip', 'Ver las tarjetas de este tema')}
          aria-label={t('idiomas.tem.verTarjetasTip', 'Ver las tarjetas de este tema')}
        >
          {desplegado ? '▾' : '▸'}
        </button>
        <button type="button" onClick={() => ctx.alternar(tema.id)} className="min-w-0 flex-1 text-start">
          <span className="block truncate text-sm text-white/85">
            {!tema.fabrica && <Icono nombre="brillo" />} {tema.titulo}
            {nSubtemas > 0 && (
              <span
                className="ms-1.5 text-[9px] text-white/40"
                title={t('idiomas.tem.nSubtemas', '{n} subtemas aquí dentro', { n: String(nSubtemas) })}
              >
                <Icono nombre="rama" /> {nSubtemas}
              </span>
            )}
          </span>
          {tema.descripcion && (
            <span className="block truncate text-[10px] text-white/35">{tema.descripcion}</span>
          )}
        </button>
        {mazo.length > 0 && (
          <span
            className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55"
            title={t('idiomas.tem.nTarjetas', '{n} tarjetas de este tema', { n: String(mazo.length) })}
          >
            <Icono nombre="registros" /> {mazo.length}
          </span>
        )}

        {ctx.edicion ? (
          <>
            {hermanos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => ctx.mover(hermanos, tema.id, -1)}
                  className={btnEdit}
                  title={t('idiomas.tem.subir', 'Subir')}
                  aria-label={t('idiomas.tem.subir', 'Subir')}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => ctx.mover(hermanos, tema.id, 1)}
                  className={btnEdit}
                  title={t('idiomas.tem.bajar', 'Bajar')}
                  aria-label={t('idiomas.tem.bajar', 'Bajar')}
                >
                  ▼
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => ctx.agregar(tema)}
              className={btnEdit}
              title={t('idiomas.tem.subtemaTip', 'Añadir un subtema dentro')}
              aria-label={t('idiomas.tem.subtemaTip', 'Añadir un subtema dentro')}
            >
              <Icono nombre="agregar" />
            </button>
            <button
              type="button"
              onClick={() => ctx.renombrar(tema)}
              className={btnEdit}
              title={t('idiomas.tem.renombrar', 'Renombrar')}
              aria-label={t('idiomas.tem.renombrar', 'Renombrar')}
            >
              <Icono nombre="editar" />
            </button>
            <button
              type="button"
              onClick={() => ctx.borrar(tema)}
              className={btnEdit}
              title={t('idiomas.tem.borrar', 'Borrar tema')}
              aria-label={t('idiomas.tem.borrar', 'Borrar tema')}
            >
              <Icono nombre="basura" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => ctx.conversar(tema)}
              disabled={!ctx.conIA}
              className={`${btnFila} disabled:opacity-35`}
              title={t('idiomas.tem.charlarTip', 'Practicar este tema con tu tutor')}
            >
              <Icono nombre="chat" />
            </button>
            <button
              type="button"
              onClick={() => ctx.material(tema)}
              className={btnFila}
              title={t('idiomas.tem.materialTip', 'Tus apuntes e imágenes de este tema')}
            >
              <Icono nombre="carpeta" />
              {nMaterial > 0 && <span className="ms-1 text-[10px] text-white/55">{nMaterial}</span>}
            </button>
            {mazo.length >= 4 && (
              <button
                type="button"
                onClick={() => ctx.practicar(tema.id)}
                className={btnFila}
                title={t('idiomas.tem.practicarTip', 'Ejercicios con las tarjetas de este tema')}
              >
                <Icono nombre="repetir" />
              </button>
            )}
            <button
              type="button"
              onClick={() => ctx.generar(tema)}
              disabled={!ctx.conIA}
              className={`${btnFila} disabled:opacity-35`}
              title={
                ctx.conIA
                  ? t('idiomas.tem.generarTip', 'Generar vocabulario de este tema con IA')
                  : t('idiomas.sinIA.corto', 'Configura tu IA en Ajustes')
              }
            >
              <Icono nombre="brillo" />
            </button>
          </>
        )}
      </div>

      {desplegado && (
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          {mazo.map((x) => (
            <FilaTarjeta
              key={x.id}
              tarjeta={x}
              codigo={ctx.codigo}
              onEditar={() => ctx.editarTarjeta(x)}
              onIlustrar={() => x.id != null && ctx.ilustrar(x.id)}
            />
          ))}
          {mazo.length === 0 && tema.hijos.length === 0 && (
            <p className="px-1 py-1 text-[11px] text-white/35">
              {t('idiomas.tem.sinTarjetas', 'Este tema aún no tiene tarjetas.')}
            </p>
          )}
          <button
            type="button"
            onClick={() => ctx.nuevaTarjeta(tema)}
            className="w-full rounded-lg bg-white/5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/10"
          >
            <Icono nombre="agregar" /> {t('idiomas.voc.nueva', 'Nueva tarjeta')}
          </button>

          {tema.hijos.length > 0 && (
            <div className="ms-2 space-y-1 border-s border-white/10 ps-2 pt-1">
              {tema.hijos.map((h) => (
                <FilaTema key={h.id} tema={h} hermanos={idsHijos} ctx={ctx} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * El temario del idioma como árbol completo: áreas › niveles › temas ›
 * subtemas y, DENTRO de cada tema, sus tarjetas (aquí vive todo el vocabulario;
 * la pestaña Vocabulario desapareció). Cada tema se pliega y despliega para ver
 * sus tarjetas, escucharlas, ilustrarlas o mandarlas a otro tema, y desde aquí
 * se practica.
 *
 * Con el modo ✏️ el temario ENTERO se hace tuyo, igual que la semilla de la
 * enciclopedia: no hay esqueleto intocable. Áreas, niveles, temas y subtemas se
 * añaden, renombran, ordenan y borran (ver `temarioVivo.ts`); borrar algo se
 * lleva lo que cuelga de ello, pero nunca las tarjetas, que caen a «Sin
 * clasificar».
 */
export function TemarioTab({ perfil, onConversar, onPracticar, enfocado, onEnfocadoUsado }: {
  perfil: PerfilIdioma
  onConversar: (ancla: AnclaTema, borrador: string) => void
  /** Ejercicios de ese tema (pestaña Repaso). */
  onPracticar: (temaId: string) => void
  /** Tema al que se llega desde el chat del tutor. */
  enfocado?: string | null
  onEnfocadoUsado?: () => void
}) {
  const t = useT()
  const tx = useTemario(perfil.id)
  const [areaSel, setAreaSel] = useState<string | null>(null)
  const [nivelSel, setNivelSel] = useState<string | null | undefined>(undefined)
  const [temasAbiertos, setTemasAbiertos] = useState<ReadonlySet<string>>(new Set())
  const [edicion, setEdicion] = useState(false)
  const [generar, setGenerar] = useState<{ id: string; titulo: string; nivel: string; area: string } | null>(null)
  const [material, setMaterial] = useState<{ id: string; titulo: string } | null>(null)
  const [form, setForm] = useState<{ inicial: TarjetaFormInicial; tarjetaId?: number } | null>(null)
  const [ilustrando, setIlustrando] = useState<number | null>(null)
  const [sinClasificarAbierto, setSinClasificarAbierto] = useState(false)

  const conIA = iaActiva()
  const tarjetas = (tarjetasIdiomaRepo.useAll() ?? VACIO).filter((x) => x.idiomaId === perfil.id)
  const materiales = (materialesIdiomaRepo.useAll() ?? VACIO).filter((m) => m.idiomaId === perfil.id)

  // Llegada desde el chat: el tema enfocado NO se copia a estado (encadenaría
  // renders), se DERIVA. Manda mientras el usuario no toque nada; en cuanto
  // navega, `onEnfocadoUsado` lo suelta y vuelve a mandar lo que él eligió.
  const nodoEnfocado = enfocado ? tx.porId.get(enfocado) : undefined
  const area =
    (areaSel ? tx.areas.find((a) => a.id === areaSel) : undefined) ??
    (nodoEnfocado ? tx.areas.find((a) => a.id === nodoEnfocado.areaId) : undefined) ??
    tx.areas[0]
  const nivelPorDefecto = area?.hijos.find((n) => n.nivel === perfil.nivel)?.id ?? null
  const abierto = nivelSel !== undefined ? nivelSel : (nodoEnfocado?.nivelId ?? nivelPorDefecto)
  const resaltado = nodoEnfocado?.id ?? null
  const soltarEnfoque = () => onEnfocadoUsado?.()

  const porTema = new Map<string, TarjetaIdioma[]>()
  for (const x of tarjetas) {
    if (!x.temaId) continue
    porTema.set(x.temaId, [...(porTema.get(x.temaId) ?? []), x])
  }
  const porMaterial = new Map<string, number>()
  for (const m of materiales) porMaterial.set(m.temaId, (porMaterial.get(m.temaId) ?? 0) + 1)

  // Sin tema, o con uno que ya no existe (se borró del temario): nunca se pierden.
  const sinClasificar = tarjetas.filter((x) => !x.temaId || !tx.porId.has(x.temaId))

  // Un subtema al que se llega desde el chat solo se ve si sus padres están
  // abiertos: la rama entera se despliega sola hasta él.
  const abiertos = useMemo(() => {
    if (!enfocado) return temasAbiertos
    const s = new Set(temasAbiertos)
    for (const n of ruta(tx, enfocado)) s.add(n.id)
    return s
  }, [temasAbiertos, enfocado, tx])

  const metaArea = area ? META_AREA[area.id] : undefined
  const enIlustracion = ilustrando != null ? tarjetas.find((x) => x.id === ilustrando) : undefined

  const alternarTema = (id: string) => {
    soltarEnfoque()
    setTemasAbiertos((prev) => {
      const s = new Set(abiertos.size > prev.size ? abiertos : prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const nuevaTarjeta = (tema: NodoTema) =>
    setForm({
      inicial: {
        termino: '',
        traduccion: '',
        tipo: 'palabra',
        nivel: tema.nivel,
        temaId: tema.id,
      },
    })

  const editarTarjeta = (x: TarjetaIdioma) =>
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

  const ctx: CtxTemario = {
    t,
    edicion,
    conIA,
    codigo: perfil.codigo,
    porTema,
    porMaterial,
    abiertos,
    resaltado,
    alternar: alternarTema,
    conversar: (tema) =>
      onConversar(
        { temaId: tema.id, titulo: tema.titulo },
        metaArea
          ? t(`idiomas.tem.prompt.${area!.id}`, metaArea.promptEs, { tema: tema.titulo })
          : t('idiomas.tem.prompt.propia', 'Quiero practicar «{tema}». Empecemos.', { tema: tema.titulo }),
      ),
    material: (tema) => setMaterial({ id: tema.id, titulo: tema.titulo }),
    practicar: onPracticar,
    generar: (tema) =>
      setGenerar({ id: tema.id, titulo: tema.titulo, nivel: tema.nivel, area: tema.areaId }),
    nuevaTarjeta,
    editarTarjeta,
    ilustrar: setIlustrando,
    renombrar: (n) => void renombrar(n),
    agregar: (padre) => void agregar(padre),
    borrar: (n) => void borrar(n),
    mover: (hermanos, id, delta) => void mover(hermanos, id, delta),
  }

  const idsAreas = tx.areas.map((a) => a.id)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <PestanasCarpeta
            items={tx.areas.map((a) => ({
              id: a.id,
              icono: META_AREA[a.id]?.icono,
              emoji: a.icono ?? '📁',
              label: tituloNodo(a, t),
            }))}
            activo={area?.id ?? ''}
            onCambio={(id) => {
              soltarEnfoque()
              setAreaSel(id)
              setNivelSel(undefined)
            }}
            color={COLOR}
            variante="sub"
            nivel={2}
            desplazable
          />
        </div>
        {edicion && (
          <button
            type="button"
            onClick={() => void agregarArea()}
            className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
            title={t('idiomas.tem.nuevaArea', 'Nueva área')}
            aria-label={t('idiomas.tem.nuevaArea', 'Nueva área')}
          >
            <Icono nombre="agregar" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 px-1 text-[10px] leading-relaxed text-white/40">
          {edicion
            ? t('idiomas.tem.edicionDesc', 'Haz tuyo el temario entero: áreas, niveles, temas y subtemas se añaden, se renombran, se ordenan y se borran.')
            : metaArea
              ? t(`idiomas.area.${area!.id}.desc`, metaArea.descEs)
              : (area?.descripcion ?? '')}
        </p>
        <button
          type="button"
          onClick={() => setEdicion((x) => !x)}
          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
            edicion ? 'text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          style={edicion ? { background: COLOR } : undefined}
          title={t('idiomas.tem.modoEdicion', 'Editar el temario')}
          aria-label={t('idiomas.tem.modoEdicion', 'Editar el temario')}
        >
          <Icono nombre="editar" />
        </button>
      </div>

      {/* El área activa se edita como cualquier otro nodo: es la raíz de su rama. */}
      {edicion && area && (
        <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[11px] text-white/50">
            {t('idiomas.tem.areaActiva', 'Área «{n}»', { n: tituloNodo(area, t) })}
          </span>
          {tx.areas.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => void mover(idsAreas, area.id, -1)}
                className={btnEdit}
                title={t('idiomas.tem.izquierda', 'Mover a la izquierda')}
                aria-label={t('idiomas.tem.izquierda', 'Mover a la izquierda')}
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => void mover(idsAreas, area.id, 1)}
                className={btnEdit}
                title={t('idiomas.tem.derecha', 'Mover a la derecha')}
                aria-label={t('idiomas.tem.derecha', 'Mover a la derecha')}
              >
                ▶
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void renombrar(area)}
            className={btnEdit}
            title={t('idiomas.tem.renombrar', 'Renombrar')}
            aria-label={t('idiomas.tem.renombrar', 'Renombrar')}
          >
            <Icono nombre="editar" />
          </button>
          <button
            type="button"
            onClick={() => void borrar(area)}
            className={btnEdit}
            title={t('idiomas.tem.borrarArea', 'Borrar el área')}
            aria-label={t('idiomas.tem.borrarArea', 'Borrar el área')}
          >
            <Icono nombre="basura" />
          </button>
        </div>
      )}

      {!area && (
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-xs text-white/35">
          {t('idiomas.tem.sinAreas', 'Tu temario está vacío. Enciende ✏️ y crea la primera área.')}
        </p>
      )}

      {area?.hijos.map((nivel) => {
        const temas = temasDe(nivel)
        const cubiertos = temas.filter((x) => (porTema.get(x.id)?.length ?? 0) > 0).length
        const esAbierto = abierto === nivel.id
        const esMiNivel = perfil.nivel === nivel.nivel
        const idsNiveles = area.hijos.map((x) => x.id)
        const idsRaiz = nivel.hijos.map((x) => x.id)
        const alternarNivel = () => {
          soltarEnfoque()
          setNivelSel(esAbierto ? null : nivel.id)
        }

        return (
          <div key={nivel.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <div className="flex w-full items-center gap-2 px-3 py-2.5 transition hover:bg-white/5">
              <button type="button" onClick={alternarNivel} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black text-black"
                  style={{ background: COLOR }}
                >
                  {nivel.nivel}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white/90">
                    {!nivel.fabrica && <Icono nombre="brillo" />} {tituloNodo(nivel, t)}
                    {esMiNivel && (
                      <span
                        className="ms-2 rounded-full px-2 py-0.5 text-[9px] font-semibold text-black"
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
              </button>

              {edicion && (
                <>
                  {area.hijos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => void mover(idsNiveles, nivel.id, -1)}
                        className={btnEdit}
                        title={t('idiomas.tem.subir', 'Subir')}
                        aria-label={t('idiomas.tem.subir', 'Subir')}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => void mover(idsNiveles, nivel.id, 1)}
                        className={btnEdit}
                        title={t('idiomas.tem.bajar', 'Bajar')}
                        aria-label={t('idiomas.tem.bajar', 'Bajar')}
                      >
                        ▼
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => void renombrar(nivel)}
                    className={btnEdit}
                    title={t('idiomas.tem.renombrar', 'Renombrar')}
                    aria-label={t('idiomas.tem.renombrar', 'Renombrar')}
                  >
                    <Icono nombre="editar" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void borrar(nivel)}
                    className={btnEdit}
                    title={t('idiomas.tem.borrarNivel', 'Borrar el nivel')}
                    aria-label={t('idiomas.tem.borrarNivel', 'Borrar el nivel')}
                  >
                    <Icono nombre="basura" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={alternarNivel}
                className="shrink-0 text-xs text-white/35 transition hover:text-white/80"
                aria-label={t('idiomas.tem.verNivel', 'Ver los temas del nivel')}
              >
                {esAbierto ? '▾' : '▸'}
              </button>
            </div>
            <div className="h-1 bg-black/30">
              <div
                className="h-full"
                style={{
                  width: `${temas.length ? (cubiertos / temas.length) * 100 : 0}%`,
                  background: COLOR,
                }}
              />
            </div>

            {esAbierto && (
              <div className="space-y-1.5 p-2">
                {nivel.hijos.map((tema) => (
                  <FilaTema key={tema.id} tema={tema} hermanos={idsRaiz} ctx={ctx} />
                ))}

                {edicion && (
                  <button
                    type="button"
                    onClick={() => void agregar(nivel)}
                    className="w-full rounded-lg bg-white/5 py-1.5 text-[11px] text-white/60 transition hover:bg-white/10"
                  >
                    <Icono nombre="agregar" />{' '}
                    {t('idiomas.tem.nuevoTema', 'Nuevo tema en {nivel}', { nivel: nivel.nivel })}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {area && area.hijos.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-xs text-white/35">
          {t('idiomas.tem.sinNiveles', 'Esta área aún no tiene niveles. Enciende ✏️ y crea el primero.')}
        </p>
      )}

      {edicion && area && (
        <button
          type="button"
          onClick={() => void agregarNivel(area)}
          className="w-full rounded-xl border border-dashed border-white/15 py-2 text-[11px] text-white/50 transition hover:bg-white/5"
        >
          <Icono nombre="agregar" />{' '}
          {t('idiomas.tem.nuevoNivel', 'Nuevo nivel en {area}', { area: tituloNodo(area, t) })}
        </button>
      )}

      {/* Lo que no cuadra en ningún tema: se ve y se clasifica desde aquí. */}
      {sinClasificar.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <button
            type="button"
            onClick={() => setSinClasificarAbierto((x) => !x)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-start transition hover:bg-white/5"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-sm">
              <Icono nombre="registros" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white/90">
                {t('idiomas.tem.sinClasificar', 'Sin clasificar')}
              </span>
              <span className="block text-[10px] text-white/40">
                {t('idiomas.tem.sinClasificarDesc', '{n} tarjetas que aún no están en ningún tema', {
                  n: String(sinClasificar.length),
                })}
              </span>
            </span>
            <span className="shrink-0 text-xs text-white/35">{sinClasificarAbierto ? '▾' : '▸'}</span>
          </button>

          {sinClasificarAbierto && (
            <div className="space-y-1 p-2">
              {sinClasificar.map((x) => (
                <FilaTarjeta
                  key={x.id}
                  tarjeta={x}
                  codigo={perfil.codigo}
                  onEditar={() => editarTarjeta(x)}
                  onIlustrar={() => setIlustrando(x.id ?? null)}
                  clasificar={
                    <select
                      value=""
                      onChange={(e) => {
                        if (x.id != null && e.target.value) {
                          void tarjetasIdiomaRepo.update(x.id, { temaId: e.target.value })
                        }
                      }}
                      className="w-24 shrink-0 rounded-lg border border-white/10 bg-black/30 px-1 py-1 text-[11px] outline-none"
                      title={t('idiomas.tem.clasificarTip', 'Mandarla a un tema del temario')}
                    >
                      <option value="">{t('idiomas.tem.clasificar', '— Tema —')}</option>
                      <OpcionesTemas tx={tx} />
                    </select>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {generar && <GenerarPanel perfil={perfil} temaFijo={generar} onCerrar={() => setGenerar(null)} />}
      {material && <MaterialPanel perfil={perfil} tema={material} onCerrar={() => setMaterial(null)} />}
      {form && (
        <TarjetaForm perfil={perfil} inicial={form.inicial} tarjetaId={form.tarjetaId} onCerrar={() => setForm(null)} />
      )}
      {enIlustracion && <IlustrarTarjeta tarjeta={enIlustracion} codigo={perfil.codigo} onCerrar={() => setIlustrando(null)} />}
    </div>
  )

  // ----- Edición del temario (mismas piezas que la semilla de la enciclopedia) -----

  async function renombrar(nodo: NodoTema) {
    if (perfil.id == null) return
    const titulo = await pedirTexto({
      titulo: t('idiomas.tem.renombrar', 'Renombrar'),
      valor: tituloNodo(nodo, t),
      textoOk: t('idiomas.form.guardar', 'Guardar'),
    })
    if (titulo?.trim()) await renombrarNodo(tx, perfil.id, nodo.id, { titulo: titulo.trim() })
  }

  /** Un tema dentro de un nivel, o un subtema dentro de otro tema. */
  async function agregar(padre: NodoTema) {
    if (perfil.id == null) return
    const esSubtema = padre.tipo === 'tema'
    const titulo = await pedirTexto({
      titulo: esSubtema
        ? t('idiomas.tem.nuevoSubtema', 'Nuevo subtema')
        : t('idiomas.tem.nuevoTemaTit', 'Nuevo tema'),
      mensaje: t('idiomas.tem.dentroDe', 'Dentro de «{padre}»', { padre: tituloNodo(padre, t) }),
      textoOk: t('idiomas.tem.crear', 'Crear'),
    })
    if (!titulo?.trim()) return
    await crearNodo({ idiomaId: perfil.id, tipo: 'tema', padre, titulo: titulo.trim() })
    if (esSubtema) setTemasAbiertos((prev) => new Set(prev).add(padre.id))
    else setNivelSel(padre.id)
  }

  async function agregarNivel(area: NodoTema) {
    if (perfil.id == null) return
    const titulo = await pedirTexto({
      titulo: t('idiomas.tem.nuevoNivelTit', 'Nuevo nivel'),
      mensaje: t('idiomas.tem.nuevoNivelMsg', 'Un nivel propio dentro de «{area}»; su insignia serán las tres primeras letras.', {
        area: tituloNodo(area, t),
      }),
      textoOk: t('idiomas.tem.crear', 'Crear'),
    })
    if (!titulo?.trim()) return
    const id = await crearNodo({ idiomaId: perfil.id, tipo: 'nivel', padre: area, titulo: titulo.trim() })
    setNivelSel(id)
  }

  async function agregarArea() {
    if (perfil.id == null) return
    const titulo = await pedirTexto({
      titulo: t('idiomas.tem.nuevaArea', 'Nueva área'),
      mensaje: t('idiomas.tem.nuevaAreaMsg', 'Un área propia del idioma, al lado de las de fábrica. Empieza vacía: dentro creas sus niveles.'),
      textoOk: t('idiomas.tem.crear', 'Crear'),
    })
    if (!titulo?.trim()) return
    const id = await crearNodo({ idiomaId: perfil.id, tipo: 'area', padre: null, titulo: titulo.trim() })
    setAreaSel(id)
    setNivelSel(undefined)
  }

  async function borrar(nodo: NodoTema) {
    if (perfil.id == null) return
    const nTarjetas = temasDe(nodo).reduce((s, x) => s + (porTema.get(x.id)?.length ?? 0), 0)
    const ok = await confirmar({
      titulo: t('idiomas.tem.borrarTit', '¿Borrar «{n}»?', { n: tituloNodo(nodo, t) }),
      mensaje: [
        nodo.hijos.length > 0
          ? t('idiomas.tem.borrarMsgHijos', 'Se va con todo lo que cuelga de él.')
          : t('idiomas.tem.borrarMsg', 'Desaparece del temario de este idioma.'),
        nTarjetas > 0
          ? t('idiomas.tem.borrarMsgTarjetas', 'Sus {n} tarjetas NO se borran: pasan a «Sin clasificar».', {
              n: String(nTarjetas),
            })
          : '',
      ]
        .filter(Boolean)
        .join(' '),
      textoOk: t('idiomas.voc.siBorrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    await borrarNodo(tx, perfil.id, nodo.id)
    if (nodo.tipo === 'area') setAreaSel(null)
    if (nodo.tipo === 'nivel') setNivelSel(null)
  }

  async function mover(hermanos: string[], id: string, delta: number) {
    if (perfil.id == null) return
    const i = hermanos.indexOf(id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= hermanos.length) return
    const orden = [...hermanos]
    ;[orden[i], orden[j]] = [orden[j], orden[i]]
    await reordenarHermanos(tx, perfil.id, orden)
  }
}

/** Una tarjeta dentro de su tema: escucharla, ilustrarla, editarla o tirarla. */
function FilaTarjeta({
  tarjeta,
  codigo,
  onEditar,
  onIlustrar,
  clasificar,
}: {
  tarjeta: TarjetaIdioma
  /** BCP-47 del idioma, para la voz. */
  codigo: string
  onEditar: () => void
  onIlustrar: () => void
  /** Selector de tema (solo en el bloque «Sin clasificar»). */
  clasificar?: ReactNode
}) {
  const t = useT()
  const [borrando, setBorrando] = useState(false)
  const conTTS = hayTTS()

  return (
    <div className="rounded-lg bg-black/20 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        {conTTS && (
          <button
            type="button"
            onClick={() => hablar(tarjeta.termino, codigo)}
            className="shrink-0 rounded px-1.5 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/90"
            title={t('idiomas.voc.escuchar', 'Escuchar')}
            aria-label={t('idiomas.voc.escuchar', 'Escuchar')}
          >
            <Icono nombre="bocina" />
          </button>
        )}
        <button
          type="button"
          onClick={onIlustrar}
          className="shrink-0"
          title={
            tarjeta.imagen
              ? t('idiomas.rep.cambiarIlustracion', 'Cambiar la ilustración')
              : t('idiomas.rep.ilustrar', 'Ilustrar esta tarjeta')
          }
          aria-label={t('idiomas.rep.ilustrar', 'Ilustrar esta tarjeta')}
        >
          {tarjeta.imagen ? (
            <VistaBlob blob={tarjeta.imagen} className="h-8 w-8 rounded-lg" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-dashed border-white/15 text-white/25 transition hover:text-white/60">
              <Icono nombre="foto" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white/90">{tarjeta.termino}</p>
          <p className="truncate text-[11px] text-white/45">{tarjeta.traduccion}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
            esDominada(tarjeta.caja) ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/50'
          }`}
          title={t('idiomas.voc.cajaTip', 'Caja de repaso: entre más alta, más se espacia')}
        >
          {tarjeta.caja}/{CAJA_MAX}
        </span>
        {clasificar}
        <button
          type="button"
          onClick={onEditar}
          className="shrink-0 rounded px-1 py-1 text-[11px] text-white/35 transition hover:bg-white/10 hover:text-white/80"
          title={t('idiomas.voc.editar', 'Editar tarjeta')}
          aria-label={t('idiomas.voc.editar', 'Editar tarjeta')}
        >
          <Icono nombre="editar" />
        </button>
        <button
          type="button"
          onClick={() => setBorrando((x) => !x)}
          className="shrink-0 rounded px-1 py-1 text-[11px] text-white/25 transition hover:bg-white/10 hover:text-white/70"
          title={t('idiomas.voc.borrar', 'Borrar tarjeta')}
          aria-label={t('idiomas.voc.borrar', 'Borrar tarjeta')}
        >
          <Icono nombre="basura" />
        </button>
      </div>
      {borrando && (
        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-[11px]">
          <span className="text-rose-200/90">{t('idiomas.voc.confirmarBorrar', '¿Borrar esta tarjeta?')}</span>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => tarjeta.id != null && void tarjetasIdiomaRepo.remove(tarjeta.id)}
              className="font-semibold text-rose-300 hover:text-rose-200"
            >
              {t('idiomas.voc.siBorrar', 'Borrar')}
            </button>
            <button type="button" onClick={() => setBorrando(false)} className="text-white/50 hover:text-white/80">
              {t('idiomas.form.cancelar', 'Cancelar')}
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
