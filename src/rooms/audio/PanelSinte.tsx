import { useState } from 'react'
import type {
  AjustesVivo,
  EfectosPista,
  InstrumentoAudio,
  NotaAudio,
  PatronArp,
  PistaAudio,
  SintePista,
  TipoAcorde,
  TipoEscala,
} from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { Modal } from '../_shared/ui'
import {
  CARPETAS_INSTRUMENTOS,
  COLOR,
  FX_DEFAULT,
  PASOS_POR_COMPAS,
  RANGO_SINTE,
  TONOS_BATERIA,
  esInstrumentoBateria,
  familiaDe,
} from './constantes'
import { sinteBase } from './instrumentos'
import { Knob } from './Knob'
import * as motor from './motor'
import { nombreClase, nombreNota } from './musica'

/** Símbolo corto de cada patrón de arpegio (glifos, no emojis). */
const GLIFO_ARP: Record<PatronArp, string> = { sube: '↑', baja: '↓', subeBaja: '↑↓', azar: '?' }

/** Ritmos de fábrica de UN compás: [paso, tono, velocidad] (se repiten al aplicar). */
const PATRONES_BATERIA: { clave: string; golpes: [number, number, number][] }[] = [
  {
    clave: 'rock',
    golpes: [
      [0, 36, 110], [8, 36, 110], [4, 38, 105], [12, 38, 105],
      [0, 42, 70], [2, 42, 70], [4, 42, 70], [6, 42, 70],
      [8, 42, 70], [10, 42, 70], [12, 42, 70], [14, 42, 70],
    ],
  },
  {
    clave: 'house',
    golpes: [
      [0, 36, 110], [4, 36, 110], [8, 36, 110], [12, 36, 110],
      [2, 46, 80], [6, 46, 80], [10, 46, 80], [14, 46, 80],
      [4, 39, 95], [12, 39, 95],
    ],
  },
  {
    clave: 'trap',
    golpes: [
      [0, 36, 110], [7, 36, 105], [10, 36, 110], [8, 38, 105],
      ...Array.from({ length: 16 }, (_, p) => [p, 42, 65] as [number, number, number]),
    ],
  },
  {
    clave: 'dembow',
    golpes: [
      [0, 36, 110], [4, 36, 110], [8, 36, 110], [12, 36, 110],
      [3, 38, 100], [6, 38, 100], [11, 38, 100], [14, 38, 100],
    ],
  },
]

/**
 * Panel del sintetizador: modos en vivo (arpegio, acordes, escala, octava) y
 * los encoders de efectos y sonido de la PISTA ACTIVA. Girar un knob suena al
 * instante por el motor (imperativo) y se confirma al soltar (mutar+guardar).
 */
export function PanelSinte({
  pista,
  vivo,
  octava,
  compases,
  fuerza,
  swing,
  volumenMaestro,
  onFx,
  onSinte,
  onVivo,
  onOctava,
  onFuerza,
  onSwing,
  onNotas,
  onInstrumento,
  onMaestro,
}: {
  pista: PistaAudio
  vivo: AjustesVivo | undefined
  octava: number
  compases: number
  /** Velocidad de lo que se toca/pinta en la batería (60 | 100 | 127). */
  fuerza: number
  /** % de swing del proyecto (0..60). */
  swing: number
  volumenMaestro: number
  onFx: (fx: EfectosPista) => void
  onSinte: (s: SintePista) => void
  onVivo: (v: AjustesVivo) => void
  onOctava: (v: number) => void
  onFuerza: (v: number) => void
  onSwing: (v: number) => void
  /** Relleno/patrones de la batería escriben las notas de la pista activa. */
  onNotas: (notas: NotaAudio[]) => void
  /** Cambia la VARIANTE dentro de la familia elegida en la pista. */
  onInstrumento: (i: InstrumentoAudio) => void
  onMaestro: (v: number) => void
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(true)
  // Plegado, el panel entero queda en una barrita (más espacio; el teclado sigue).
  const [plegado, setPlegado] = useState(false)
  const [pestana, setPestana] = useState<'fx' | 'sonido'>('fx')
  const [modal, setModal] = useState<'arp' | 'acorde' | 'escala' | 'relleno' | 'patrones' | null>(null)
  const [golpeSel, setGolpeSel] = useState<number>(42) // hi-hat: el relleno más común

  const esBateria = esInstrumentoBateria(pista.instrumento)
  const fx = pista.efectos ?? FX_DEFAULT
  const base = sinteBase(pista.instrumento)

  const NOMBRE_ACORDE: Record<TipoAcorde, string> = {
    mayor: t('audio.acorde.mayor', 'Mayor'),
    menor: t('audio.acorde.menor', 'Menor'),
    septima: t('audio.acorde.septima', 'Séptima'),
    diatonico: t('audio.acorde.diatonico', 'Diatónico'),
  }
  const NOMBRE_ESCALA: Record<TipoEscala, string> = {
    mayor: t('audio.escala.mayor', 'Mayor'),
    menor: t('audio.escala.menor', 'Menor'),
    pentaMayor: t('audio.escala.pentaMayor', 'Penta mayor'),
    pentaMenor: t('audio.escala.pentaMenor', 'Penta menor'),
    blues: t('audio.escala.blues', 'Blues'),
  }
  const nombreInstr: Record<InstrumentoAudio, string> = {
    piano: t('audio.instr.piano', 'Piano eléctrico'),
    organo: t('audio.instr.organo', 'Órgano'),
    campanas: t('audio.instr.campanas', 'Campanas'),
    pad: t('audio.instr.pad', 'Pad'),
    lead: t('audio.instr.lead', 'Lead chiptune'),
    guitarra: t('audio.instr.guitarra', 'Guitarra'),
    bajo: t('audio.instr.bajo', 'Bajo'),
    arpa: t('audio.instr.arpa', 'Arpa'),
    violines: t('audio.instr.violines', 'Violines'),
    pluck: t('audio.instr.pluck', 'Cuerda pulsada'),
    flauta: t('audio.instr.flauta', 'Flauta'),
    trompeta: t('audio.instr.trompeta', 'Trompeta'),
    sax: t('audio.instr.sax', 'Sax'),
    bateria: t('audio.instr.bateria', 'Batería'),
    bateria808: t('audio.instr.bateria808', 'Batería electrónica'),
    voz: t('audio.instr.voz', 'Voz solista'),
    coro: t('audio.instr.coro', 'Coro'),
  }
  const variantes =
    CARPETAS_INSTRUMENTOS.find((c) => c.clave === familiaDe(pista.instrumento))?.instrumentos ?? []
  const NOMBRE_GOLPE: Record<number, string> = {
    36: t('audio.teclado.bombo', 'Bombo'),
    38: t('audio.teclado.caja', 'Caja'),
    42: t('audio.teclado.hat', 'Hi-hat'),
    46: t('audio.teclado.hatAbierto', 'Hat abierto'),
    39: t('audio.teclado.palmada', 'Palmada'),
    41: t('audio.teclado.tomGrave', 'Tom grave'),
    48: t('audio.teclado.tomAgudo', 'Tom agudo'),
    49: t('audio.teclado.platillo', 'Platillo'),
  }
  const NOMBRE_PATRON: Record<string, string> = {
    rock: t('audio.bateria.rock', 'Rock'),
    house: t('audio.bateria.house', 'House'),
    trap: t('audio.bateria.trap', 'Trap'),
    dembow: t('audio.bateria.dembow', 'Reggaetón'),
  }
  const etiquetaFuerza =
    fuerza <= 60
      ? t('audio.bateria.suave', 'Suave')
      : fuerza >= 127
        ? t('audio.bateria.fuerte', 'Fuerte')
        : t('audio.bateria.media', 'Media')

  const ordenar = (notas: NotaAudio[]) => notas.sort((a, b) => a[0] - b[0] || a[2] - b[2])
  /** Rellena la fila del golpe elegido cada `cada` pasos (sustituye esa fila). */
  const rellenar = (cada: number) => {
    const resto = pista.notas.filter((n) => n[2] !== golpeSel)
    const nuevas: NotaAudio[] = []
    for (let p = 0; p < compases * PASOS_POR_COMPAS; p += cada) nuevas.push([p, 1, golpeSel, fuerza])
    onNotas(ordenar([...resto, ...nuevas]))
  }
  const aplicarPatron = async (golpes: [number, number, number][]) => {
    if (pista.notas.length > 0) {
      const si = await confirmar({
        titulo: t('audio.bateria.reemplazar', 'Sustituir los golpes'),
        mensaje: t('audio.bateria.reemplazarMsg', 'El patrón reemplaza lo que hay en la pista.'),
        peligro: true,
      })
      if (!si) return
    }
    const notas: NotaAudio[] = []
    for (let c = 0; c < compases; c++) for (const [paso, tono, vel] of golpes) notas.push([c * PASOS_POR_COMPAS + paso, 1, tono, vel])
    onNotas(ordenar(notas))
    setModal(null)
  }
  const duplicarCompas = () => {
    const base = pista.notas.filter((n) => n[0] < PASOS_POR_COMPAS)
    if (base.length === 0) return
    const notas: NotaAudio[] = []
    for (let c = 0; c < compases; c++) for (const n of base) notas.push([c * PASOS_POR_COMPAS + n[0], n[1], n[2], n[3]])
    onNotas(ordenar(notas))
    setModal(null)
  }

  const ms = (v: number) => (v >= 1 ? `${v.toFixed(1)} s` : `${Math.round(v * 1000)} ms`)
  const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`)

  const knobFx = (clave: keyof EfectosPista, etiqueta: string) => (
    <Knob
      valor={fx[clave]}
      def={0}
      etiqueta={etiqueta}
      onCambio={(v) => motor.ajustarFxEnVivo(pista.pistaId, { ...fx, [clave]: v })}
      onCommit={(v) => onFx({ ...fx, [clave]: v })}
    />
  )
  const knobSinte = (clave: keyof SintePista, etiqueta: string, formato?: (v: number) => string) => (
    <Knob
      valor={pista.sinte?.[clave] ?? base[clave]}
      min={RANGO_SINTE[clave].min}
      max={RANGO_SINTE[clave].max}
      def={base[clave]}
      etiqueta={etiqueta}
      formato={formato}
      onCambio={(v) => motor.ajustarSinteEnVivo(pista.pistaId, { ...pista.sinte, [clave]: v })}
      onCommit={(v) => onSinte({ ...pista.sinte, [clave]: v })}
    />
  )

  const chipModo = (abre: 'arp' | 'acorde' | 'escala' | 'relleno' | 'patrones', texto: string, valorTxt: string | null) => (
    <button
      type="button"
      onClick={() => setModal(abre)}
      aria-pressed={valorTxt != null}
      className={`ui-presion flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
        valorTxt != null ? 'bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
      }`}
      style={valorTxt != null ? { borderColor: COLOR } : undefined}
    >
      {texto}
      {valorTxt != null && (
        <span className="font-semibold" style={{ color: COLOR }}>
          {valorTxt}
        </span>
      )}
    </button>
  )

  const opcion = (activa: boolean, onClick: () => void, texto: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`ui-presion rounded-full border px-3 py-1.5 text-xs transition ${
        activa ? 'border-transparent font-semibold text-black' : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/15'
      }`}
      style={activa ? { background: COLOR } : undefined}
    >
      {texto}
    </button>
  )

  const pestanaBtn = (clave: 'fx' | 'sonido', texto: string) => (
    <button
      type="button"
      onClick={() => setPestana(clave)}
      aria-pressed={pestana === clave}
      className={`rounded-lg px-2 py-1 text-start text-[11px] transition ${
        pestana === clave ? 'bg-white/15 font-semibold text-white' : 'text-white/50 hover:bg-white/10'
      }`}
    >
      {texto}
    </button>
  )

  const arp = vivo?.arp ?? null
  const escala = vivo?.escala ?? null

  if (plegado) {
    return (
      <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-2 py-0.5">
        <button
          type="button"
          onClick={() => setPlegado(false)}
          aria-label={t('audio.sinte.mostrar', 'Mostrar los ajustes')}
          title={t('audio.sinte.mostrar', 'Mostrar los ajustes')}
          className="flex w-full items-center justify-center gap-1 py-0.5 text-white/40 transition hover:text-white/80"
        >
          <Icono nombre="plegado" />
        </button>
      </div>
    )
  }

  return (
    <div className="shrink-0 space-y-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-label={t('audio.sinte.titulo', 'Sintetizador')}
          title={t('audio.sinte.titulo', 'Sintetizador')}
          className={`ui-presion grid h-8 w-8 place-items-center rounded-lg border transition ${
            abierto ? 'border-white/40 bg-white/15' : 'border-white/10 bg-white/10 hover:bg-white/20'
          }`}
        >
          <Icono nombre="sintetizador" />
        </button>
        {/* La variante de la familia elegida en la pista se escoge AQUÍ. */}
        <select
          value={pista.instrumento}
          aria-label={t('audio.sinte.variante', 'Variante del instrumento')}
          title={t('audio.sinte.variante', 'Variante del instrumento')}
          onChange={(e) => onInstrumento(e.target.value as InstrumentoAudio)}
          className="max-w-36 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1.5 text-xs outline-none"
        >
          {variantes.map((i) => (
            <option key={i} value={i}>
              {nombreInstr[i]}
            </option>
          ))}
        </select>
        {esBateria ? (
          <>
            {/* La batería no arpegia ni acorda: sus controles son de caja de ritmos. */}
            <button
              type="button"
              onClick={() => onFuerza(fuerza === 100 ? 127 : fuerza === 127 ? 60 : 100)}
              title={t('audio.bateria.fuerzaLargo', 'Fuerza de los golpes que tocas o pintas')}
              className="ui-presion flex items-center gap-1 rounded-full border bg-white/15 px-2.5 py-1 text-xs text-white transition"
              style={{ borderColor: COLOR }}
            >
              {t('audio.bateria.fuerza', 'Fuerza')}
              <span className="font-semibold" style={{ color: COLOR }}>
                {etiquetaFuerza}
              </span>
            </button>
            {chipModo('relleno', t('audio.bateria.relleno', 'Relleno'), null)}
            {chipModo('patrones', t('audio.bateria.patrones', 'Patrones'), null)}
            <div className="ms-auto flex items-center gap-1.5 text-xs text-white/50">
              {t('audio.bateria.swing', 'Swing')}
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={swing}
                aria-label={t('audio.bateria.swingLargo', 'Swing: retrasa las semicorcheas débiles')}
                title={t('audio.bateria.swingLargo', 'Swing: retrasa las semicorcheas débiles')}
                onChange={(e) => onSwing(Number(e.target.value))}
                className="w-20"
                style={{ accentColor: COLOR }}
              />
              <span className="w-8 text-end tabular-nums text-white/70">{swing}%</span>
            </div>
          </>
        ) : (
          <>
            {chipModo('arp', t('audio.arp.boton', 'Arpegio'), arp ? `${GLIFO_ARP[arp.patron]} 1/${arp.velocidad === 1 ? 16 : 8}` : null)}
            {chipModo('acorde', t('audio.acorde.boton', 'Acordes'), vivo?.acorde ? NOMBRE_ACORDE[vivo.acorde] : null)}
            {chipModo(
              'escala',
              t('audio.escala.boton', 'Escala'),
              escala ? `${nombreClase(escala.tonica)} ${NOMBRE_ESCALA[escala.tipo]}` : null,
            )}
            <div className="ms-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOctava(Math.max(24, octava - 12))}
                aria-label={t('audio.teclado.octavaMenos', 'Octava abajo')}
                title={t('audio.teclado.octavaMenos', 'Octava abajo')}
                className="ui-presion grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20"
              >
                <Icono nombre="quitar" />
              </button>
              <span
                className="w-9 text-center font-mono text-xs font-semibold text-white/80"
                title={t('audio.sinte.octava', 'Octava del teclado')}
              >
                {nombreNota(octava)}
              </span>
              <button
                type="button"
                onClick={() => onOctava(Math.min(84, octava + 12))}
                aria-label={t('audio.teclado.octavaMas', 'Octava arriba')}
                title={t('audio.teclado.octavaMas', 'Octava arriba')}
                className="ui-presion grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20"
              >
                <Icono nombre="agregar" />
              </button>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => setPlegado(true)}
          aria-label={t('audio.sinte.plegar', 'Plegar los ajustes')}
          title={t('audio.sinte.plegar', 'Plegar los ajustes')}
          className="grid h-8 w-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="desplegado" />
        </button>
      </div>

      {abierto && (
        <div className="flex items-center gap-2">
          {!esBateria && (
            <div className="flex shrink-0 flex-col gap-0.5">
              {pestanaBtn('fx', t('audio.sinte.efectos', 'Efectos'))}
              {pestanaBtn('sonido', t('audio.sinte.sonido', 'Sonido'))}
            </div>
          )}
          <div className="flex min-w-0 flex-1 items-start gap-1 overflow-x-auto pb-1">
            {(esBateria || pestana === 'fx') && (
              <>
                {knobFx('reverb', t('audio.fx.reverb', 'Reverb'))}
                {knobFx('delay', t('audio.fx.delay', 'Delay'))}
                {knobFx('chorus', t('audio.fx.chorus', 'Chorus'))}
                {knobFx('dist', t('audio.fx.dist', 'Distorsión'))}
                <span className="mx-1 h-12 w-px shrink-0 self-center bg-white/10" />
                <Knob
                  valor={volumenMaestro}
                  def={0.9}
                  etiqueta={t('audio.fx.maestro', 'Maestro')}
                  onCambio={(v) => motor.ajustarMaestroEnVivo(v)}
                  onCommit={onMaestro}
                />
              </>
            )}
            {!esBateria && pestana === 'sonido' && (
              <>
                {knobSinte('ataque', t('audio.sinte.ataque', 'Ataque'), ms)}
                {knobSinte('liberacion', t('audio.sinte.liberacion', 'Liberación'), ms)}
                {knobSinte('filtroHz', t('audio.sinte.corte', 'Corte'), hz)}
                {knobSinte('resonancia', t('audio.sinte.resonancia', 'Resonancia'), (v) => v.toFixed(1))}
                {knobSinte('glide', t('audio.sinte.glide', 'Glide'), ms)}
                {knobSinte('vibrato', t('audio.sinte.vibrato', 'Vibrato'))}
              </>
            )}
          </div>
        </div>
      )}

      {modal === 'arp' && (
        <Modal titulo={t('audio.arp.titulo', 'Arpegiador')} onCerrar={() => setModal(null)}>
          <p className="text-xs text-white/50">{t('audio.arp.patron', 'Patrón')}</p>
          <div className="flex flex-wrap gap-1.5">
            {opcion(!arp, () => onVivo({ ...vivo, arp: null }), t('audio.arp.apagado', 'Apagado'))}
            {(['sube', 'baja', 'subeBaja', 'azar'] as const).map((p) => (
              <span key={p}>
                {opcion(
                  arp?.patron === p,
                  () => onVivo({ ...vivo, arp: { patron: p, velocidad: arp?.velocidad ?? 1 } }),
                  `${GLIFO_ARP[p]} ${
                    p === 'sube'
                      ? t('audio.arp.sube', 'Arriba')
                      : p === 'baja'
                        ? t('audio.arp.baja', 'Abajo')
                        : p === 'subeBaja'
                          ? t('audio.arp.subeBaja', 'Ida y vuelta')
                          : t('audio.arp.azar', 'Al azar')
                  }`,
                )}
              </span>
            ))}
          </div>
          {arp && (
            <>
              <p className="text-xs text-white/50">{t('audio.arp.vel', 'Velocidad')}</p>
              <div className="flex gap-1.5">
                {([1, 2] as const).map((v) => (
                  <span key={v}>{opcion(arp.velocidad === v, () => onVivo({ ...vivo, arp: { ...arp, velocidad: v } }), v === 1 ? '1/16' : '1/8')}</span>
                ))}
              </div>
            </>
          )}
          <p className="text-xs text-white/40">
            {t('audio.arp.nota', 'Mantén una o varias teclas y el arpegio las recorre al ritmo del BPM; al grabar, las notas entran ya arpegiadas.')}
          </p>
        </Modal>
      )}

      {modal === 'acorde' && (
        <Modal titulo={t('audio.acorde.titulo', 'Modo de acordes')} onCerrar={() => setModal(null)}>
          <div className="flex flex-wrap gap-1.5">
            {opcion(!vivo?.acorde, () => onVivo({ ...vivo, acorde: null }), t('audio.acorde.apagado', 'Apagado'))}
            {(['mayor', 'menor', 'septima', ...(escala ? (['diatonico'] as const) : [])] as TipoAcorde[]).map((a) => (
              <span key={a}>{opcion(vivo?.acorde === a, () => onVivo({ ...vivo, acorde: a }), NOMBRE_ACORDE[a])}</span>
            ))}
          </div>
          <p className="text-xs text-white/40">
            {escala
              ? t('audio.acorde.notaDiatonico', 'Cada tecla suena como acorde; el diatónico apila terceras de la escala elegida.')
              : t('audio.acorde.nota', 'Cada tecla suena como un acorde completo. Con una escala activa se desbloquea el modo diatónico.')}
          </p>
        </Modal>
      )}

      {modal === 'relleno' && (
        <Modal titulo={t('audio.bateria.relleno', 'Relleno')} onCerrar={() => setModal(null)}>
          <p className="text-xs text-white/50">{t('audio.bateria.golpe', 'Golpe')}</p>
          <div className="flex flex-wrap gap-1.5">
            {TONOS_BATERIA.map((tono) => (
              <span key={tono}>{opcion(golpeSel === tono, () => setGolpeSel(tono), NOMBRE_GOLPE[tono])}</span>
            ))}
          </div>
          <p className="text-xs text-white/50">{t('audio.bateria.cada', 'Pintar la fila cada…')}</p>
          <div className="flex gap-1.5">
            {(
              [
                [4, '1/4'],
                [2, '1/8'],
                [1, '1/16'],
              ] as const
            ).map(([cada, txt]) => (
              <span key={txt}>{opcion(false, () => rellenar(cada), txt)}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {opcion(false, () => onNotas(pista.notas.filter((n) => n[2] !== golpeSel)), t('audio.bateria.limpiarFila', 'Limpiar la fila'))}
            <button
              type="button"
              onClick={() =>
                void confirmar({
                  titulo: t('audio.bateria.limpiarTodo', 'Vaciar la pista'),
                  mensaje: t('audio.bateria.limpiarTodoMsg', 'Se borran todos los golpes.'),
                  peligro: true,
                }).then((si) => {
                  if (si) onNotas([])
                })
              }
              className="ui-presion rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-400/20"
            >
              {t('audio.bateria.limpiarTodo', 'Vaciar la pista')}
            </button>
          </div>
          <p className="text-xs text-white/40">
            {t('audio.bateria.rellenoNota', 'El relleno usa la Fuerza actual y sustituye solo la fila de ese golpe.')}
          </p>
        </Modal>
      )}

      {modal === 'patrones' && (
        <Modal titulo={t('audio.bateria.patrones', 'Patrones')} onCerrar={() => setModal(null)}>
          <div className="flex flex-wrap gap-1.5">
            {PATRONES_BATERIA.map((p) => (
              <span key={p.clave}>{opcion(false, () => void aplicarPatron(p.golpes), NOMBRE_PATRON[p.clave])}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {opcion(false, duplicarCompas, t('audio.bateria.duplicar', 'Duplicar el compás 1 al resto'))}
          </div>
          <p className="text-xs text-white/40">
            {t('audio.bateria.patronesNota', 'El patrón llena todos los compases; luego edítalo golpe a golpe en el secuenciador.')}
          </p>
        </Modal>
      )}

      {modal === 'escala' && (
        <Modal titulo={t('audio.escala.titulo', 'Escala')} onCerrar={() => setModal(null)}>
          <div className="flex flex-wrap gap-1.5">
            {opcion(!escala, () => onVivo({ ...vivo, escala: null }), t('audio.escala.apagado', 'Apagada'))}
          </div>
          <p className="text-xs text-white/50">{t('audio.escala.tonica', 'Tónica')}</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }, (_, c) => (
              <span key={c}>
                {opcion(
                  escala?.tonica === c,
                  () => onVivo({ ...vivo, escala: { tonica: c, tipo: escala?.tipo ?? 'mayor' } }),
                  nombreClase(c),
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/50">{t('audio.escala.tipo', 'Tipo')}</p>
          <div className="flex flex-wrap gap-1.5">
            {(['mayor', 'menor', 'pentaMayor', 'pentaMenor', 'blues'] as const).map((tp) => (
              <span key={tp}>
                {opcion(
                  escala?.tipo === tp,
                  () => onVivo({ ...vivo, escala: { tonica: escala?.tonica ?? 0, tipo: tp } }),
                  NOMBRE_ESCALA[tp],
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/40">
            {t('audio.escala.nota', 'Las teclas fuera de la escala se atenúan en el teclado (siguen sonando).')}
          </p>
        </Modal>
      )}
    </div>
  )
}
