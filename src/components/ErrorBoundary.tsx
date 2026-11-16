"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught component error]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 font-sans shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {this.props.fallbackMessage || "घटक लोड करने में त्रुटि (Component Render Error)"}
              </h3>
              <p className="text-xs text-red-700">
                यह सेक्शन लोड नहीं हो सका। विवरण नीचे देखें।
              </p>
            </div>
          </div>

          <div className="bg-white/80 border border-red-200 rounded-lg p-3 text-xs font-mono text-red-800 break-words mb-4">
            {this.state.error?.message || "Unknown rendering exception"}
          </div>

          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>पुनः लोड करें (Try Again)</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
