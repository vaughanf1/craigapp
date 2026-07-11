import { Component, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-fog px-6 text-center">
        <p className="text-5xl">🧘</p>
        <h1 className="display-tight mt-4 text-2xl font-semibold">Take a breath.</h1>
        <p className="mt-2 max-w-sm text-ink-secondary">
          Something went wrong, but your progress is safe. Reload to carry on where you left off.
        </p>
        <button
          onClick={() => location.reload()}
          className="mt-6 rounded-full bg-accent px-7 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Reload
        </button>
      </div>
    )
  }
}
