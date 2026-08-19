import { useState } from 'react'
import type { ComponentType } from 'react'
import { COLOR } from './constantes'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { FAMILIAS, JUEGOS_REALES, type IdJuegoReal, type JuegoReal } from './juegos/catalogo'
import { Ahorcado } from './juegos/Ahorcado'
import { Ajedrez } from './juegos/Ajedrez'
import { Billar } from './juegos/Billar'
import { Blackjack } from './juegos/Blackjack'
import { Buscaminas } from './juegos/Buscaminas'
import { CartasConocerse, CartasDebates } from './juegos/CartasPreguntas'
import { CuatroEnLinea } from './juegos/CuatroEnLinea'
import { Damas } from './juegos/Damas'
import { DinoRunner } from './juegos/DinoRunner'
import { Domino } from './juegos/Domino'
import { Hockey } from './juegos/Hockey'
import { Juego2048 } from './juegos/Juego2048'
import { Memorama } from './juegos/Memorama'
import { Pong } from './juegos/Pong'
import { Ruleta } from './juegos/Ruleta'
import { SimonDice } from './juegos/SimonDice'
import { Solitario } from './juegos/Solitario'
import { SpaceDefender } from './juegos/SpaceDefender'
import { Sudoku } from './juegos/Sudoku'
import { Tetris } from './juegos/Tetris'
import { Viborita } from './juegos/Viborita'
import {
  DIFICULTADES,
  ETIQUETAS_DIFICULTAD,
  useDificultad,
  type Dificultad,
  type PropsDificultad,
} from './juegos/dificultad'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'

type Seccion = '12' | '3mas'

const COMPONENTES: Record<IdJuegoReal, ComponentType<PropsDificultad>> = {
  sudoku: Sudoku,
  solitario: Solitario,
  j2048: Juego2048,
  damas: Damas,
  ajedrez: Ajedrez,
  blackjack: Blackjack,
  ruleta: Ruleta,
  buscaminas: Buscaminas,
  domino: Domino,
  viborita: Viborita,
  space: SpaceDefender,
  tetris: Tetris,
  dino: DinoRunner,
  pong: Pong,
  hockey: Hockey,
  billar: Billar,
  memorama: Memorama,
  cuatroenlinea: CuatroEnLinea,
  simon: SimonDice,
  ahorcado: Ahorcado,
  conocerse: CartasConocerse,
  debates: CartasDebates,
}

function SelectorDificultad({ valor, alCambiar }: { valor: Dificultad; alCambiar: (d: Dificultad) => void }) {
  return (
    <PestanasCarpeta
      items={DIFICULTADES.map((d) => ({ id: d, labelEs: ETIQUETAS_DIFICULTAD[d] }))}
      activo={valor}
      onCambio={alCambiar}
      prefijoClave="entre.j.dif"
      color={COLOR}
      variante="sub"
      flecha={false}
    />
  )
}

/**
 * Juego en pantalla completa. La dificultad va en la barra superior y se pasa
 * como prop: al cambiarla, la `key` remonta el juego para empezar de cero.
 */
function JuegoAbierto({ juego, alVolver }: { juego: JuegoReal; alVolver: () => void }) {
  const t = useT()
  const [dif, setDif] = useDificultad(juego.id)
  const ComponenteJuego = COMPONENTES[juego.id]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={alVolver}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
        >
          ← {t('entre.j.volver', 'Volver')}
        </button>
        <h3 className="text-lg font-bold">
          <Icono emoji={juego.icono} /> {t(`entre.j.${juego.id}.nombre`, juego.nombre)}
        </h3>
        {juego.dificultad && (
          <div className="ms-auto flex items-center gap-2">
            <span className="text-xs text-white/45">{t('entre.j.dificultad', 'Dificultad')}</span>
            <SelectorDificultad valor={dif} alCambiar={setDif} />
          </div>
        )}
      </div>
      <ComponenteJuego key={dif} dificultad={dif} />
    </div>
  )
}

export function JuegosMesaTab({ juegoInicial }: { juegoInicial?: IdJuegoReal }) {
  const t = useT()
  const [seccion, setSeccion] = useState<Seccion>('12')
  // Arranca con el juego pedido por chat («quiero jugar la viborita»), si lo hay.
  const [juegoActivo, setJuegoActivo] = useState<JuegoReal | null>(
    () => JUEGOS_REALES.find((j) => j.id === juegoInicial) ?? null,
  )

  // Los juegos '2+' sirven igual en pareja que en grupo: salen en ambas secciones
  const juegosDigitales = JUEGOS_REALES.filter((j) => (seccion === '12' ? true : j.jugadores === '2+'))

  if (juegoActivo) {
    return <JuegoAbierto key={juegoActivo.id} juego={juegoActivo} alVolver={() => setJuegoActivo(null)} />
  }

  return (
    <div className="space-y-4">
      <div data-tut="entretenimiento.juegos.secciones">
        <PestanasCarpeta
          items={[
            { id: '12', icono: 'perfil', labelEs: '1–2 jugadores' },
            { id: '3mas', icono: 'companeros', labelEs: '3+ jugadores' },
          ]}
          activo={seccion}
          onCambio={setSeccion}
          prefijoClave="entre.j.seccion"
          color={COLOR}
          variante="sub"
        />
      </div>

      {FAMILIAS.map((familia) => {
        const juegos = juegosDigitales.filter((j) => j.familia === familia.id)
        if (!juegos.length) return null
        return (
          <section key={familia.id} data-tut={`entretenimiento.juegos.familia.${familia.id}`} className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold texto-vivo" style={vivo(familia.tono)}>
              <span className="h-2 w-2 rounded-full" style={{ background: familia.tono }} />
              {t(`entre.j.fam.${familia.id}`, familia.labelEs)}
              <span className="text-xs font-normal text-white/35">{juegos.length}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {juegos.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  data-tut={`entretenimiento.juegos.item.${j.id}`}
                  onClick={() => setJuegoActivo(j)}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-start transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                      style={{ background: `${familia.tono}26`, boxShadow: `inset 0 0 0 1px ${familia.tono}59` }}
                    >
                      <Icono emoji={j.icono} />
                    </span>
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55">
                      <Icono nombre="perfil" /> {j.jugadores}
                    </span>
                  </div>
                  <p className="mt-2 font-bold leading-tight">{t(`entre.j.${j.id}.nombre`, j.nombre)}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/50">{t(`entre.j.${j.id}.desc`, j.descripcion)}</p>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
