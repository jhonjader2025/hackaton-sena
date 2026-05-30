import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="card p-8 text-center" role="alert">
          <svg className="mx-auto h-10 w-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-surface-700">Error al cargar este módulo</p>
          <p className="mt-1 text-xs text-surface-500">Intenta recargar la página o selecciona otro módulo</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="btn-secondary mt-4 text-xs">
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
