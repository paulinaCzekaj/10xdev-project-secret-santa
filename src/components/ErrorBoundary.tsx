import React, { Component } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <h3 className="text-red-800 font-semibold">Coś poszło nie tak</h3>
          <p className="text-red-600 text-sm mt-1">Wystąpił błąd podczas ładowania komponentu.</p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-700 text-sm">Szczegóły błędu (tylko w development)</summary>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">{this.state.error.message}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
