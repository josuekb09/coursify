import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode; resetKey?: string }
type State = { failed: boolean }

/** Keeps a crash in one screen from blanking the whole app; switching screens resets it. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Coursify screen error", error, info.componentStack)
  }

  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto grid max-w-md flex-1 place-items-center px-6 py-24 text-center">
        <div>
          <p className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">Something went wrong on this page.</p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Your work is safe. Try again, or open another section from the menu.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
            className="mt-6 h-10 rounded-lg bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-hover"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
