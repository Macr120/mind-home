import { Icono } from '../../core/ui/iconos/Icono'
import { useState } from 'react'
import type { Efemeride } from '../../core/data/db'
import { abrirApp } from '../../core/abrirApp'
import { useT } from '../../core/i18n/useT'
// Se reutiliza la charla del Sabio de la biblioteca: la conversación queda
// guardada ahí y el usuario puede seguir profundizando desde ese cuarto.
import { ChatCharla } from '../biblioteca/ChatCharla'
import type { AnclaTema } from '../biblioteca/arbol'

/** Pregunta semilla para abrir la charla según el tipo de efeméride. */
function promptProfundizar(e: Efemeride): string {
  const titulo = e.titulo.replace(/^«|»$/g, '')
  switch (e.tipo) {
    case 'historia':
      return `Cuéntame más sobre este hecho histórico${e.anio ? ` de ${e.anio}` : ''}: ${titulo}. ¿Qué ocurrió, por qué fue importante y qué consecuencias tuvo?`
    case 'arte':
      return `Háblame de la obra «${titulo}»${e.subtitulo ? ` de ${e.subtitulo}` : ''}. ¿Qué representa, cómo se creó y por qué es importante en la historia del arte?`
    case 'libro':
      return `Háblame del libro «${titulo}»${e.subtitulo ? ` de ${e.subtitulo}` : ''}. ¿De qué trata, cuál es su estilo y por qué es una obra relevante?`
    case 'personalidad':
      return `¿Quién fue ${titulo}? Cuéntame su vida, su obra y por qué es una figura importante.`
    case 'especie':
      return `Háblame del ${titulo}${e.subtitulo ? ` (${e.subtitulo})` : ''}. ¿Cómo vive, de qué se alimenta, qué lo hace especial y cómo está su conservación?`
    case 'palabra':
      return `Profundiza en la palabra «${titulo}»: su origen o etimología, sus significados y cómo usarla bien.`
    case 'frase':
      return `Explícame esta frase${e.subtitulo ? ` de ${e.subtitulo}` : ''}: ${titulo}. ¿Qué significa, en qué contexto surge y qué enseña?`
  }
}

interface Estado {
  id: number | null
  borrador: string
  ancla: AnclaTema | null
  /** Cambia para remontar la charla al encadenar (ramificar). */
  key: number
}

/** Charla con el Sabio sobre una efeméride, sin salir del diario. */
export function ProfundizarModal({
  efemeride,
  onCerrar,
}: {
  efemeride: Efemeride
  onCerrar: () => void
}) {
  const t = useT()
  const [estado, setEstado] = useState<Estado>(() => ({
    id: null,
    borrador: promptProfundizar(efemeride),
    ancla: null,
    key: 0,
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      onClick={onCerrar}
    >
      <div
        className="ui-panel w-full max-w-lg rounded-2xl p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-1 pb-1.5 pt-0.5 text-xs font-semibold text-white/55">
          <Icono nombre="cuarto-biblioteca" /> {t('diario.ef.profundizarTitulo', 'Profundizar con el Sabio de la biblioteca')}
        </p>
        <ChatCharla
          key={estado.key}
          conversacionId={estado.id}
          borradorInicial={estado.borrador}
          anclaInicial={estado.ancla}
          onCreada={(id) => setEstado((s) => ({ ...s, id }))}
          onSalir={onCerrar}
          // El árbol y las entradas viven en la biblioteca: el enlace se sigue
          // allá, que es donde están la enciclopedia y sus herramientas.
          onIrANodo={(nodoId) => {
            onCerrar()
            abrirApp('biblioteca', 'enciclopedia', `nodo:${nodoId}`)
          }}
          onVerEntrada={(entradaId) => {
            onCerrar()
            abrirApp('biblioteca', 'enciclopedia', `entrada:${entradaId}`)
          }}
        />
      </div>
    </div>
  )
}
