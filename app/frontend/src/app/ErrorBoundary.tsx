import { Component, type ReactNode } from 'react'

type Props = {
  title: string
  message: string
  retryLabel: string
  children: ReactNode
}

export class AppErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="centered">
        <div className="card">
          <h2>⚠️ {this.props.title}</h2>
          <p className="error">{this.props.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {this.props.retryLabel}
          </button>
        </div>
      </main>
    )
  }
}
