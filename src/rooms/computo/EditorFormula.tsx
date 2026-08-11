import { useMemo, useRef, useState } from 'react'
import type { CarpetaFormula, Formula, VariableFormula } from '../../core/data/db'
import { formulasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonIA } from './BotonIA'
import { OP_FORMULA } from './costosIA'
import { crearFormula, filasArbol, formulasDe, validarSimbolo } from './formulas'
import { formulaDesdeTexto } from './ia'
import type { Motor } from './motor'
import { TecladoMath } from './TecladoMath'
import { useInsercion } from './useInsercion'
import { Tex } from './Tex'

/**
 * Alta y edición de una fórmula propia. La expresión manda: al escribirla se
 * detectan sus símbolos y la tabla de variables se rellena sola, conservando lo
 * que el usuario ya hubiera puesto en las que siguen estando.
 */
export function EditorFormula({
  motor,
  carpetaId,
  carpetas,
  hermanas,
  edita,
  onCerrar,
}: {
  motor: Motor | null
  carpetaId: string
  /** Todas las carpetas: al crear se elige aquí en cuál va la fórmula. */
  carpetas: CarpetaFormula[]
  hermanas: Formula[]
  /** Fórmula existente a editar, o null para crear una nueva. */
  edita: Formula | null
  onCerrar: () => void
}) {
  const t = useT()
  const [destino, setDestino] = useState(carpetaId)
  const [nombre, setNombre] = useState(edita?.nombre ?? '')
  const [expresion, setExpresion] = useState(edita?.expresion ?? '')
  const [resultado, setResultado] = useState(edita?.resultado ?? 'y')
  const [descripcion, setDescripcion] = useState(edita?.descripcion ?? '')
  /**
   * Lo que el usuario ha escrito de cada variable, POR SÍMBOLO. La lista real se
   * deriva de la expresión en cada render (ver `variables`): así aparecen las
   * nuevas y se van las que dejó de usar sin un efecto que sincronice nada.
   */
  const [porSimbolo, setPorSimbolo] = useState<Record<string, VariableFormula>>(() =>
    Object.fromEntries((edita?.variables ?? []).map((v) => [v.simbolo, v])),
  )
  const [guardando, setGuardando] = useState(false)
  const campoExpresion = useRef<HTMLInputElement>(null)
  /** La paleta de notaciones escribe donde esté el cursor de la expresión. */
  const insertar = useInsercion(expresion, setExpresion, campoExpresion)
  const [peticion, setPeticion] = useState('')
  const [pensando, setPensando] = useState(false)
  const [errorIA, setErrorIA] = useState('')

  /**
   * La IA rellena el formulario; no guarda nada. Lo que propone se queda en los
   * campos para revisarlo y corregirlo antes de pulsar Guardar.
   */
  const escribirConIA = async () => {
    if (!motor || !peticion.trim()) return
    setErrorIA('')
    setPensando(true)
    try {
      const p = await formulaDesdeTexto(peticion.trim(), motor)
      setNombre(p.nombre)
      setResultado(p.resultado)
      setExpresion(p.expresion)
      if (p.descripcion) setDescripcion(p.descripcion)
      setPorSimbolo(Object.fromEntries(p.variables.map((v) => [v.simbolo, v])))
    } catch (e) {
      setErrorIA(e instanceof Error ? e.message : t('computo.ia.falloFormula', 'No se pudo escribir la fórmula.'))
    } finally {
      setPensando(false)
    }
  }

  /** Los símbolos que la expresión pide ahora mismo (null = no se puede leer). */
  const detectados = useMemo(() => {
    if (!motor || !expresion.trim()) return []
    try {
      return motor.simbolos(expresion)
    } catch {
      return null
    }
  }, [motor, expresion])

  // La tabla de variables SIGUE a la expresión: es un derivado, no un estado.
  const variables = useMemo<VariableFormula[]>(
    () => (detectados ?? []).map((s) => porSimbolo[s] ?? { simbolo: s, nombre: s }),
    [detectados, porSimbolo],
  )

  const texVista = motor && expresion.trim() ? `${resultado} = ${motor.aTex(expresion)}` : ''

  /**
   * mathjs no multiplica símbolos pegados: `mgh` es UNA variable llamada «mgh».
   * Es el error número uno de quien escribe física, así que se avisa en cuanto
   * aparece un símbolo de más de una letra.
   */
  const sospechosos = (detectados ?? []).filter((s) => s.length > 1 && /^[a-z]+$/.test(s))

  const problema = (() => {
    if (!nombre.trim()) return t('computo.editor.faltaNombre', 'Ponle un nombre')
    if (!expresion.trim()) return t('computo.editor.faltaExpresion', 'Escribe la expresión')
    if (detectados == null) return t('computo.error.sintaxis', 'La expresión no se entiende')
    const malo = validarSimbolo(resultado)
    if (malo === 'reservado') return t('computo.editor.resultadoReservado', 'Ese símbolo es de mathjs; usa otro')
    if (malo) return t('computo.editor.resultadoInvalido', 'El símbolo del resultado no vale')
    return null
  })()

  const guardar = async () => {
    if (problema || guardando) return
    setGuardando(true)
    const limpias = variables.map((v) => ({ ...v, nombre: v.nombre.trim() || v.simbolo }))
    if (edita?.id != null) {
      await formulasRepo.update(edita.id, {
        // La fecha se refresca a propósito: tocar una fórmula que venía puesta
        // cuenta como actividad de HOY, no del día en que se sembró.
        fecha: fechaLocalISO(),
        nombre: nombre.trim(),
        expresion: expresion.trim(),
        resultado: resultado.trim(),
        descripcion: descripcion.trim() || undefined,
        variables: limpias,
        // Al editarla deja de ser una copia intacta del catálogo: se le quita el
        // LaTeX de fábrica para que se derive de la expresión nueva.
        tex: expresion.trim() === edita.expresion ? edita.tex : undefined,
      })
    } else {
      await crearFormula(formulasDe(hermanas, destino), {
        carpetaId: destino,
        nombre: nombre.trim(),
        expresion: expresion.trim(),
        resultado: resultado.trim(),
        descripcion: descripcion.trim() || undefined,
        variables: limpias,
      })
    }
    onCerrar()
  }

  const cambiar = (v: VariableFormula, cambios: Partial<VariableFormula>) =>
    setPorSimbolo((s) => ({ ...s, [v.simbolo]: { ...v, ...cambios } }))

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {edita
            ? t('computo.editor.titulo.editar', 'Editar fórmula')
            : t('computo.editor.titulo.nueva', 'Fórmula nueva')}
        </h3>
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 text-white/40 transition hover:text-white/80"
          title={t('computo.editor.cerrar', 'Cerrar')}
          aria-label={t('computo.editor.cerrar', 'Cerrar')}
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      {/* Dictarla en vez de escribirla: la IA rellena los campos de abajo. */}
      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
        <input
          value={peticion}
          onChange={(e) => setPeticion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void escribirConIA()
          }}
          placeholder={t('computo.ia.formulaPlaceholder', 'Descríbela: «área de un cono truncado»')}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
        <BotonIA
          op={OP_FORMULA}
          etiqueta={t('computo.ia.escribirFormula', 'Escribirla con IA')}
          generando={pensando}
          deshabilitado={!peticion.trim() || !motor}
          error={errorIA}
          onClick={() => void escribirConIA()}
        />
      </div>

      {/* Al crear se elige la carpeta; al editar se mueve arrastrando en el árbol. */}
      {!edita && (
        <label className="flex items-center gap-2 text-xs text-white/50">
          <Icono nombre="carpeta" />
          <span className="shrink-0">{t('computo.editor.carpeta', 'Guardar en')}</span>
          <select
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
          >
            {filasArbol(carpetas, new Set()).map(({ carpeta, profundidad }) => (
              <option key={carpeta.carpetaId} value={carpeta.carpetaId}>
                {'— '.repeat(profundidad)}
                {carpeta.emoji ?? '📁'} {carpeta.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={t('computo.editor.nombre', 'Nombre («Energía cinética»)')}
        className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <div className="flex items-center gap-2">
        <input
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
          className="w-16 shrink-0 rounded-xl border border-white/15 bg-black/30 px-2 py-2 text-center font-mono text-sm outline-none focus:border-accent"
          aria-label={t('computo.editor.resultado', 'Símbolo del resultado')}
        />
        <span className="shrink-0 font-mono text-white/40">=</span>
        <input
          ref={campoExpresion}
          value={expresion}
          onChange={(e) => setExpresion(e.target.value)}
          placeholder="m * v^2 / 2"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
      </div>

      <TecladoMath motor={motor} onInsertar={insertar} />

      {texVista && (
        <div className="overflow-x-auto rounded-xl bg-black/25 px-3 py-3 text-center">
          <Tex tex={texVista} motor={motor} bloque crudo={`${resultado} = ${expresion}`} />
        </div>
      )}

      {detectados == null && expresion.trim() !== '' && (
        <p className="text-xs text-rose-300">
          {t('computo.editor.noSeEntiende', 'Falta cerrar algo o sobra un símbolo.')}
        </p>
      )}

      {sospechosos.length > 0 && (
        <p className="text-xs text-amber-300">
          {t(
            'computo.editor.implicita',
            '«{simbolos}» se lee como una sola variable. Si querías multiplicar, escribe los asteriscos: m * g * h.',
            { simbolos: sospechosos.join('», «') },
          )}
        </p>
      )}

      {variables.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            {t('computo.editor.variables', 'Variables')}
          </p>
          {variables.map((v) => (
            <div key={v.simbolo} className="flex items-center gap-1.5">
              <span className="w-12 shrink-0 truncate rounded-lg bg-black/30 px-2 py-1.5 text-center font-mono text-xs">
                {v.simbolo}
              </span>
              <input
                value={v.nombre}
                onChange={(e) => cambiar(v,{ nombre: e.target.value })}
                placeholder={t('computo.editor.varNombre', 'nombre')}
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-accent"
              />
              <input
                value={v.unidad ?? ''}
                onChange={(e) => cambiar(v,{ unidad: e.target.value || undefined })}
                placeholder={t('computo.editor.varUnidad', 'unidad')}
                className="w-16 shrink-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-accent"
              />
              <input
                inputMode="decimal"
                value={v.valor != null ? String(v.valor) : ''}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(',', '.'))
                  cambiar(v, { valor: e.target.value === '' || !Number.isFinite(n) ? undefined : n })
                }}
                placeholder={t('computo.editor.varValor', 'valor')}
                className="w-16 shrink-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-center font-mono text-xs outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => cambiar(v, { constante: !v.constante })}
                title={t('computo.editor.constante', 'Constante: no se pide, se usa su valor')}
                aria-label={t('computo.editor.constante', 'Constante: no se pide, se usa su valor')}
                className={`shrink-0 rounded-lg px-2 py-1.5 text-xs transition ${
                  v.constante ? 'ui-accent-bg' : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                <Icono nombre="candado" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder={t('computo.editor.descripcion', 'Nota (cuándo se usa, de dónde salió)')}
        className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs outline-none focus:border-accent"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={!!problema || guardando}
          className="ui-accent-bg flex-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {t('computo.editor.guardar', 'Guardar')}
        </button>
        {problema && <span className="min-w-0 flex-1 truncate text-xs text-white/45">{problema}</span>}
      </div>
    </div>
  )
}
