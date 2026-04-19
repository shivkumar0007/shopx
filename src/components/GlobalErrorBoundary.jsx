import { AlertTriangle } from "lucide-react";
import { Component } from "react";

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-8 py-8">
          <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
            <div className="mb-4 inline-flex rounded-full border border-border p-3">
              <AlertTriangle size={20} className="text-accent" />
            </div>
            <h1 className="mb-2 text-2xl font-medium text-text">Something went wrong</h1>
            <p className="mb-6 text-sm font-normal text-text/70">
              Please refresh the page. If the issue continues, try again later.
            </p>
            <button
              type="button"
              className="pill-button bg-accent text-white"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default GlobalErrorBoundary;
