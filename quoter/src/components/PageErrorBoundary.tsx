import { Component, type ErrorInfo, type ReactNode } from 'react'

export default class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Do not log document contents or component state. */ }
  render() {
    if (this.state.failed) return <section className="panel" role="alert"><h1>No se pudo mostrar esta página</h1><p>Recarga la página para intentarlo nuevamente. Los cambios sin guardar podrían perderse.</p><button type="button" onClick={() => window.location.reload()}>Recargar página</button></section>
    return this.props.children
  }
}
