"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ClientErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("JoJo Tennis client error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-pine">頁面載入發生錯誤</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            {this.state.error.message || "未知錯誤"}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-clay px-6 py-3 text-sm font-bold text-white"
          >
            重新整理
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
