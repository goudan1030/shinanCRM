'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error | null; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 过滤掉浏览器扩展导致的错误
    if (error.message?.includes('autoinsert') || 
        error.message?.includes('isDragging') ||
        error.stack?.includes('autoinsert.js')) {
      console.warn('检测到浏览器扩展错误，已忽略:', error.message);
      this.setState({ hasError: false, error: null });
      return;
    }
    
    console.error('ErrorBoundary捕获到错误:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 如果是浏览器扩展错误，忽略它
      if (this.state.error.message?.includes('autoinsert') || 
          this.state.error.message?.includes('isDragging') ||
          this.state.error.stack?.includes('autoinsert.js')) {
        return this.props.children;
      }

      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} reset={this.reset} />;
      }

      return (
        <div className="flex h-screen w-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">页面出现错误</h2>
            <p className="text-gray-600 mb-6">
              {this.state.error.message || '发生了一些错误，请重试'}
            </p>
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

