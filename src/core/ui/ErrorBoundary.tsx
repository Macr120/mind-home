import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  titulo?: string
  textoReintentar?: string
}

interface State {
  error: Error | null
}

/** Evita pantalla en blanco si un cuarto lanza un error al renderizar. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MPH]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
          <p className="text-lg font-bold text-red-400">
            {this.props.titulo ?? 'Algo falló al cargar'}
          </p>
          <p className="mt-2 text-sm text-white/60">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            {this.props.textoReintentar ?? 'Reintentar'}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
