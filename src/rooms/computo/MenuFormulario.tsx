import { useMemo, useState } from 'react'
import type { CarpetaFormula, Formula } from '../../core/data/db'
import { VACIO, borrarCarpetaFormula, carpetasFormulaRepo, formulasRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { carpetasSembradas } from './siembra'
import { EditorCarpeta } from './EditorCarpeta'
import { EditorFormula } from './EditorFormula'
import { BotonFicha, FichaFormula, type FormulaVista } from './FichaFormula'
import {
  crearCarpeta,
  filasArbol,
  formulasDe,
  moverFormula,
  puedeSoltarEn,
  soltarCarpeta,
  totalFormulas,
} from './formulas'
import type { ObjetivoFormula } from './curvas'
import type { Motor } from './motor'
import { Tex } from './Tex'
import { useArrastreArbol, type Destino, type EnMano } from './useArrastreArbol'

/**
 * El formulario: un libro de fórmulas.
 *
 * UN SOLO ÁRBOL. Matemáticas, Física y Química vienen puestas de fábrica
 * (`siembra.ts`), pero son filas normales: se editan, se mueven y se borran como
 * las que escribas tú. No hay sección «de fábrica» ni «copiar a mis fórmulas».
 *
 * Vive dentro del menú plegable de la calculadora, así que no pone marco ni
 * scroll propio: los pondría DENTRO del que ya tiene la pestaña. Desde la ficha
 * de una fórmula, «Graficar» salta al modo Gráfica con ella puesta.
 */
export function MenuFormulario({
  motor,
  onGraficar,
}: {
  motor: Motor | null
  /** Manda la fórmula abierta al modo Gráfica, con sus valores de ahora. */
  onGraficar: (o: ObjetivoFormula) => void
}) {
  const t = useT()
  const carpetas = carpetasFormulaRepo.useAll() ?? VACIO
  const formulas = formulasRepo.useAll() ?? VACIO

  // Las áreas sembradas nacen plegadas: 54 fórmulas desplegadas de golpe no se
  // leen. Inicializador perezoso, no un efecto (lint `set-state-in-effect`).
  const [plegadas, setPlegadas] = useState<Set<string>>(() => new Set(carpetasSembradas()))
  const [sel, setSel] = useState<number | null>(null)
  const [editando, setEditando] = useState<{ carpetaId: string; formula: Formula | null } | null>(null)
  const [editandoCarpeta, setEditandoCarpeta] = useState<CarpetaFormula | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const filas = useMemo(() => filasArbol(carpetas, plegadas), [carpetas, plegadas])
  /** Dónde nace una fórmula creada desde la barra: la primera carpeta del árbol. */
  const carpetaPorDefecto = useMemo(
    () => filasArbol(carpetas, new Set())[0]?.carpeta.carpetaId ?? null,
    [carpetas],
  )

  const plegar = (id: string) =>
    setPlegadas((s) => {
      const n = new Set(s)
      if (!n.delete(id)) n.add(id)
      return n
    })

  /** Fórmulas que coinciden con la búsqueda, con su carpeta. null = no se busca. */
  const encontradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return null
    const nombreDe = new Map(carpetas.map((c) => [c.carpetaId, c.nombre]))
    return formulas
      .filter((f) => {
        const carpeta = (nombreDe.get(f.carpetaId) ?? '').toLowerCase()
        return f.nombre.toLowerCase().includes(q) || carpeta.includes(q)
      })
      .map((f) => ({ formula: f, carpeta: nombreDe.get(f.carpetaId) ?? '' }))
  }, [carpetas, formulas, busca])

  /** Imprime una fórmula suelta o una carpeta entera (PDF por el navegador). */
  const imprimir = async (titulo: string, cuales: FormulaVista[]) => {
    const { imprimirFormulas, puedeImprimir } = await import('./exportar')
    if (!puedeImprimir()) {
      await confirmar({
        titulo: t('computo.export.sinImprimir', 'Imprimir solo funciona en la web'),
        mensaje: t(
          'computo.export.sinImprimirMsg',
          'En la app de Android no hay diálogo de impresión. Ábrelo desde el navegador para guardarlo en PDF.',
        ),
      })
      return
    }
    await imprimirFormulas(titulo, cuales, motor)
  }

  const nuevaCarpeta = async (padreId: string | null) => {
    const nombre = await pedirTexto({
      titulo: t('computo.form.nuevaCarpeta', 'Carpeta nueva'),
      mensaje: t('computo.form.nuevaCarpetaMsg', '¿Cómo se llama?'),
    })
    if (nombre?.trim()) await crearCarpeta(carpetas, nombre.trim(), padreId)
  }

  const borrarCarpeta = async (c: CarpetaFormula) => {
    const dentro = formulas.filter((f) => f.carpetaId === c.carpetaId).length
    const ok = await confirmar({
      titulo: t('computo.form.borrarCarpeta', 'Borrar «{nombre}»', { nombre: c.nombre }),
      mensaje:
        dentro > 0
          ? t('computo.form.borrarCarpetaMsg', 'Se van también sus {n} fórmulas y sus subcarpetas.', { n: dentro })
          : t('computo.form.borrarCarpetaVacia', 'La carpeta se va con sus subcarpetas.'),
      peligro: true,
    })
    if (ok) await borrarCarpetaFormula(c.carpetaId)
  }

  const borrarFormula = async (f: Formula) => {
    const ok = await confirmar({
      titulo: t('computo.form.borrarFormula', 'Borrar «{nombre}»', { nombre: f.nombre }),
      peligro: true,
    })
    if (ok && f.id != null) {
      await formulasRepo.remove(f.id)
      setSel(null)
    }
  }

  /** Suelta lo que se arrastraba: carpeta bajo carpeta, o fórmula en su sitio. */
  const soltar = async (mano: EnMano, destino: Destino) => {
    if (mano.tipo === 'carpeta') {
      const mueve = carpetas.find((c) => c.carpetaId === mano.id)
      if (!mueve) return
      // Sobre una fórmula, la referencia es su carpeta.
      const ref =
        destino.tipo === 'carpeta'
          ? carpetas.find((c) => c.carpetaId === destino.id)
          : carpetas.find((c) => c.carpetaId === formulas.find((f) => String(f.id) === destino.id)?.carpetaId)
      if (!ref) return
      if (destino.dentro || destino.tipo === 'formula') {
        await soltarCarpeta(carpetas, mueve, ref.carpetaId)
      } else {
        await soltarCarpeta(carpetas, mueve, ref.padreId ?? null, ref)
      }
      return
    }

    const mueve = formulas.find((f) => String(f.id) === mano.id)
    if (!mueve) return
    if (destino.tipo === 'carpeta') {
      await moverFormula(formulas, mueve, destino.id)
    } else {
      const antes = formulas.find((f) => String(f.id) === destino.id)
      if (antes) await moverFormula(formulas, mueve, antes.carpetaId, antes)
    }
  }

  const arrastre = useArrastreArbol(
    (mano, destino) => void soltar(mano, destino),
    (mano, destino) => {
      if (mano.tipo !== 'carpeta') return true
      // La madre destino depende de si se suelta dentro o antes.
      const ref =
        destino.tipo === 'carpeta'
          ? carpetas.find((c) => c.carpetaId === destino.id)
          : carpetas.find((c) => c.carpetaId === formulas.find((f) => String(f.id) === destino.id)?.carpetaId)
      if (!ref) return false
      const madre = destino.dentro || destino.tipo === 'formula' ? ref.carpetaId : (ref.padreId ?? null)
      return puedeSoltarEn(carpetas, mano.id, madre)
    },
  )

  const abierta = sel != null ? (formulas.find((f) => f.id === sel) ?? null) : null

  return (
    <div className="space-y-3">
      {abierta && (
        <FichaFormula
          key={abierta.id}
          formula={abierta}
          motor={motor}
          onGraficar={(d) =>
            onGraficar({
              clave: String(abierta.id),
              nombre: abierta.nombre,
              expresion: abierta.expresion,
              resultado: abierta.resultado,
              variables: abierta.variables,
              ...d,
            })
          }
          acciones={
            <div className="flex shrink-0 gap-1">
              <BotonFicha
                icono="editar"
                etiqueta={t('computo.form.editar', 'Editar')}
                onClick={() => setEditando({ carpetaId: abierta.carpetaId, formula: abierta })}
              />
              <BotonFicha
                icono="basura"
                etiqueta={t('computo.form.borrar', 'Borrar')}
                onClick={() => void borrarFormula(abierta)}
              />
              <BotonFicha
                icono="imprimir"
                etiqueta={t('computo.form.imprimir', 'Imprimir o guardar en PDF')}
                onClick={() => void imprimir(abierta.nombre, [abierta])}
              />
              <BotonFicha icono="cerrar" etiqueta={t('computo.form.cerrarFicha', 'Cerrar')} onClick={() => setSel(null)} />
            </div>
          }
        />
      )}

      {editando && (
        <EditorFormula
          motor={motor}
          carpetaId={editando.carpetaId}
          carpetas={carpetas}
          hermanas={formulas}
          edita={editando.formula}
          onCerrar={() => setEditando(null)}
        />
      )}

      {editandoCarpeta && (
        <EditorCarpeta
          carpeta={editandoCarpeta}
          onCerrar={() => setEditandoCarpeta(null)}
          onBorrar={() => {
            const c = editandoCarpeta
            setEditandoCarpeta(null)
            void borrarCarpeta(c)
          }}
        />
      )}

      <section className="space-y-2" data-tut="computo.form.arbol">
        <div className="flex items-center gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t('computo.form.buscar', 'Buscar fórmula…')}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          {/* Crear una fórmula se pide desde aquí, no desde cada carpeta: la
              carpeta destino se elige dentro del editor. */}
          <button
            type="button"
            onClick={() => setEditando({ carpetaId: carpetaPorDefecto!, formula: null })}
            disabled={!carpetaPorDefecto}
            className="ui-accent-bg shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            <Icono nombre="agregar" /> {t('computo.form.formulaNueva', 'Fórmula')}
          </button>
          <button
            type="button"
            onClick={() => void nuevaCarpeta(null)}
            className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
          >
            <Icono nombre="carpeta" /> {t('computo.form.carpetaNueva', 'Carpeta')}
          </button>
        </div>

        {encontradas ? (
          <div className="space-y-1">
            {encontradas.length === 0 && (
              <p className="px-1 text-xs text-white/40">{t('computo.form.sinResultados', 'Nada con ese nombre.')}</p>
            )}
            {encontradas.map(({ formula, carpeta }) => (
              <button
                key={formula.id}
                type="button"
                onClick={() => setSel(formula.id ?? null)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition hover:bg-white/5"
              >
                <span className="min-w-0 flex-[2] truncate text-xs">
                  {formula.nombre}
                  {carpeta && <span className="text-white/35"> · {carpeta}</span>}
                </span>
                <span className="sin-deslizador hidden min-w-0 flex-[3] overflow-x-auto text-center text-[11px] opacity-70 sm:block">
                  <Tex tex={formula.tex ?? `${formula.resultado} = …`} motor={motor} crudo={formula.resultado} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            {filas.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
                {t('computo.form.vacio', 'Todavía no hay fórmulas. Crea una carpeta y escribe la tuya.')}
              </p>
            )}

            {filas.map(({ carpeta, profundidad, hijas, color }) => {
              const suyas = formulasDe(formulas, carpeta.carpetaId)
              const plegada = plegadas.has(carpeta.carpetaId)
              // Plegada se cuenta todo lo de dentro; abierta, solo lo suyo (lo
              // demás ya se ve en las subcarpetas de abajo).
              const cuenta = plegada ? totalFormulas(carpetas, formulas, carpeta.carpetaId) : suyas.length
              return (
                <div
                  key={carpeta.carpetaId}
                  style={{ paddingLeft: profundidad * 14, borderLeft: color ? `2px solid ${color}` : undefined }}
                >
                  <div
                    data-nodo={`carpeta:${carpeta.carpetaId}`}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-white/5 ${arrastre.resalte('carpeta', carpeta.carpetaId)}`}
                  >
                    <span
                      {...arrastre.asa('carpeta', carpeta.carpetaId)}
                      className="shrink-0 cursor-grab touch-none px-0.5 text-white/20 transition hover:text-white/50 active:cursor-grabbing"
                      title={t('computo.form.arrastrar', 'Arrastrar para mover')}
                      aria-label={t('computo.form.arrastrar', 'Arrastrar para mover')}
                    >
                      <Icono nombre="mover" />
                    </span>
                    <button
                      type="button"
                      onClick={() => plegar(carpeta.carpetaId)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    >
                      {hijas > 0 && (
                        <span className="shrink-0 text-white/30">
                          <Icono nombre={plegada ? 'siguiente' : 'abajo'} />
                        </span>
                      )}
                      <span className={color ? 'texto-vivo' : ''} style={color ? vivo(color) : undefined}>
                        <Icono emoji={carpeta.emoji ?? '📁'} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{carpeta.nombre}</span>
                      <span className="shrink-0 text-[11px] text-white/35">{cuenta}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenu(menu === carpeta.carpetaId ? null : carpeta.carpetaId)}
                      title={t('computo.form.masAcciones', 'Más acciones')}
                      aria-label={t('computo.form.masAcciones', 'Más acciones')}
                      className={`shrink-0 rounded px-1.5 py-1 leading-none transition hover:bg-white/10 hover:text-white ${
                        menu === carpeta.carpetaId ? 'bg-white/10 text-white' : 'text-white/40'
                      }`}
                    >
                      ⋯
                    </button>
                  </div>

                  {menu === carpeta.carpetaId && (
                    <div className="ms-4 flex flex-wrap gap-1 pb-1">
                      <AccionCarpeta
                        icono="carpeta"
                        texto={t('computo.form.subcarpeta', 'Subcarpeta')}
                        onClick={() => {
                          setMenu(null)
                          void nuevaCarpeta(carpeta.carpetaId)
                        }}
                      />
                      <AccionCarpeta
                        icono="editar"
                        texto={t('computo.form.editarCarpeta', 'Editar carpeta')}
                        onClick={() => {
                          setMenu(null)
                          setEditandoCarpeta(carpeta)
                        }}
                      />
                      <AccionCarpeta
                        icono="imprimir"
                        texto={t('computo.form.imprimirCarpeta', 'Imprimir la carpeta')}
                        onClick={() => {
                          setMenu(null)
                          void imprimir(carpeta.nombre, suyas)
                        }}
                        deshabilitado={suyas.length === 0}
                      />
                      <AccionCarpeta
                        icono="basura"
                        texto={t('computo.form.borrar', 'Borrar')}
                        onClick={() => {
                          setMenu(null)
                          void borrarCarpeta(carpeta)
                        }}
                      />
                    </div>
                  )}

                  {!plegada &&
                    suyas.map((f) => (
                      <div
                        key={f.id}
                        data-nodo={`formula:${f.id}`}
                        className={`ms-4 flex items-center gap-1 rounded-lg border-s border-white/10 px-2 py-1.5 ps-2 transition hover:bg-white/5 ${
                          sel === f.id ? 'bg-white/10' : ''
                        } ${arrastre.resalte('formula', String(f.id))}`}
                      >
                        <span
                          {...arrastre.asa('formula', String(f.id))}
                          className="shrink-0 cursor-grab touch-none px-0.5 text-white/15 transition hover:text-white/45 active:cursor-grabbing"
                          title={t('computo.form.arrastrar', 'Arrastrar para mover')}
                          aria-label={t('computo.form.arrastrar', 'Arrastrar para mover')}
                        >
                          <Icono nombre="mover" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setSel(f.id ?? null)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-start"
                        >
                          {/* El nombre y la fórmula se reparten la fila: con el
                              LaTeX pegado a la derecha, los largos se salían. */}
                          <span className="min-w-0 flex-[2] truncate text-xs">{f.nombre}</span>
                          <span className="sin-deslizador min-w-0 flex-[3] overflow-x-auto text-center text-[11px] opacity-70">
                            <Tex tex={f.tex ?? `${f.resultado} = …`} motor={motor} crudo={f.resultado} />
                          </span>
                        </button>
                      </div>
                    ))}
                </div>
              )
            })}
          </>
        )}
      </section>
    </div>
  )
}

/** Un botón del menú ⋯ de una carpeta. */
function AccionCarpeta({
  icono,
  texto,
  onClick,
  deshabilitado = false,
}: {
  icono: Parameters<typeof Icono>[0]['nombre']
  texto: string
  onClick: () => void
  deshabilitado?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className="rounded-lg bg-white/5 px-2 py-1 text-[11px] transition hover:bg-white/10 disabled:opacity-30"
    >
      <Icono nombre={icono} /> {texto}
    </button>
  )
}
