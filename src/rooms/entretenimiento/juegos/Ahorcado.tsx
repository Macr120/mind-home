import { useEffect, useState } from 'react'
import { Icono } from '../../../core/ui/iconos/Icono'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { guardarRecord, leerNumero } from './almacen'
import { claveDificultad, type Dificultad, type PropsDificultad } from './dificultad'
import { enIdioma } from '../../../core/i18n/porIdioma'
import { idiomaActual } from '../../../core/i18n/useT'
import { BANCOS_AHORCADO } from './ahorcado.palabras'

/**
 * El banco (alfabeto + 100 palabras) vive en `ahorcado.palabras.ts`, por
 * idioma: las palabras se SUSTITUYEN por palabras nativas, no se traducen, y
 * los idiomas sin escritura alfabética caen al inglés. Se lee al montar: la
 * partida en curso no cambia de idioma a medias.
 */
const banco = () => enIdioma(BANCOS_AHORCADO, idiomaActual())

// Fallos permitidos y longitud de las palabras del sorteo
const AJUSTE: Record<Dificultad, { fallos: number; max: number; min: number }> = {
  facil: { fallos: 8, min: 0, max: 7 },
  medio: { fallos: 6, min: 0, max: 99 },
  dificil: { fallos: 4, min: 8, max: 99 },
}

/**
 * Pliega a su tecla los diacríticos que NO son letra propia del alfabeto del
 * banco (Á→A en español) y conserva las que sí lo son (Ñ, las umlauts…).
 */
const normalizarCon = (letras: string) => (s: string) =>
  s
    .toUpperCase()
    .split('')
    .map((c) => (letras.includes(c) ? c : c.normalize('NFD').replace(/[̀-ͯ]/g, '')))
    .join('')

function palabraAleatoria(dif: Dificultad): string {
  const { min, max } = AJUSTE[dif]
  const pozo = banco().palabras.filter((p) => p.length >= min && p.length <= max)
  return pozo[Math.floor(Math.random() * pozo.length)]
}

export function Ahorcado({ dificultad = 'medio' }: PropsDificultad) {
  const t = useT()
  const maxFallos = AJUSTE[dificultad].fallos
  const clave = claveDificultad('ahorcado-racha', dificultad)
  // El alfabeto del idioma se fija al montar (la palabra sorteada es de ese banco).
  const [letras] = useState(() => banco().letras.split(''))
  const normalizar = normalizarCon(letras.join(''))
  const [palabra, setPalabra] = useState(() => palabraAleatoria(dificultad))
  const [usadas, setUsadas] = useState<Set<string>>(new Set())
  const [racha, setRacha] = useState(0)
  const [record, setRecord] = useState(() => leerNumero(clave, 0))

  const letrasPalabra = new Set(normalizar(palabra).split('').filter((c) => letras.includes(c)))
  const fallos = [...usadas].filter((l) => !letrasPalabra.has(l)).length
  const ganado = [...letrasPalabra].every((l) => usadas.has(l))
  const perdido = fallos >= maxFallos
  const terminado = ganado || perdido
  // El muñeco se reparte entre los fallos permitidos: siempre se completa al perder
  const partes = Math.floor((fallos * 6) / maxFallos)

  const probar = (letra: string) => {
    if (terminado || usadas.has(letra)) return
    const nuevas = new Set(usadas).add(letra)
    setUsadas(nuevas)
    if ([...letrasPalabra].every((l) => nuevas.has(l))) {
      const nueva = racha + 1
      setRacha(nueva)
      setRecord(guardarRecord(clave, nueva))
    } else if ([...nuevas].filter((l) => !letrasPalabra.has(l)).length >= maxFallos) {
      setRacha(0)
    }
  }

  const siguiente = () => {
    setPalabra(palabraAleatoria(dificultad))
    setUsadas(new Set())
  }

  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const letra = normalizar(e.key)
      if (letra.length === 1 && letras.includes(letra)) probar(letra)
    }
    window.addEventListener('keydown', manejar)
    return () => window.removeEventListener('keydown', manejar)
  })

  return (
    <div className="mx-auto max-w-[420px] space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t('entre.j.ahorcado.racha', 'Racha')}: {racha}
          <span className="ms-2 text-white/45">
            {t('entre.j.mejor', 'Mejor')}: {record}
          </span>
        </span>
        <button type="button" onClick={siguiente} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20">
          <Icono nombre="sincronizar" /> {t('entre.j.ahorcado.otra', 'Otra palabra')}
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 rounded-xl bg-white/5 p-3">
        <svg viewBox="0 0 120 140" className="h-36 w-28 shrink-0 stroke-white/70" fill="none" strokeWidth="4" strokeLinecap="round">
          {/* Horca */}
          <path d="M10 130 H70 M30 130 V15 M30 15 H85 M85 15 V32" className="stroke-white/35" />
          {/* Muñeco: se va dibujando conforme se gastan los fallos */}
          {partes >= 1 && <circle cx="85" cy="45" r="13" />}
          {partes >= 2 && <path d="M85 58 V95" />}
          {partes >= 3 && <path d="M85 66 L65 82" />}
          {partes >= 4 && <path d="M85 66 L105 82" />}
          {partes >= 5 && <path d="M85 95 L68 118" />}
          {partes >= 6 && <path d="M85 95 L102 118" />}
        </svg>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-white/45">
            {t('entre.j.ahorcado.fallos', 'Fallos')}: {fallos} / {maxFallos}
          </p>
          <p className="flex flex-wrap gap-1.5 text-xl font-black tracking-wide">
            {palabra.split('').map((c, i) => {
              const visible = terminado || usadas.has(normalizar(c))
              return (
                <span key={i} className={`border-b-2 px-0.5 ${visible ? 'border-transparent' : 'border-white/40'}`}>
                  <span className={visible ? (perdido && !usadas.has(normalizar(c)) ? 'text-red-400' : '') : 'invisible'}>{c}</span>
                </span>
              )
            })}
          </p>
          {ganado && (
            <p className="text-sm font-bold" style={{ color: COLOR }}>
              {t('entre.j.ganaste', '¡Ganaste! 🎉')}
            </p>
          )}
          {perdido && <p className="text-sm font-bold text-red-400">{t('entre.j.ahorcado.perdiste', 'Perdiste esta ronda')}</p>}
          {terminado && (
            <button type="button" onClick={siguiente} className="rounded-lg px-3 py-1.5 text-sm font-bold text-black" style={{ background: COLOR }}>
              {t('entre.j.ahorcado.siguiente', 'Siguiente palabra')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-9 gap-1">
        {letras.map((l) => {
          const usada = usadas.has(l)
          const acierto = usada && letrasPalabra.has(l)
          return (
            <button
              key={l}
              type="button"
              onClick={() => probar(l)}
              disabled={usada || terminado}
              className={`rounded-md py-1.5 text-sm font-bold disabled:opacity-90 ${
                !usada ? 'bg-white/10 hover:bg-white/20 disabled:opacity-35' : acierto ? 'bg-emerald-500/40' : 'bg-red-500/30 text-white/40'
              }`}
            >
              {l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
