import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full min-h-[400px] flex-col items-center justify-center p-6 text-center bg-gray-50">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-lg border border-red-100">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={28} />
            </div>
            <h2 className="mb-2 text-lg font-bold text-gray-800">Đã xảy ra lỗi hiển thị màn hình</h2>
            <p className="mb-4 text-xs text-gray-600">
              {this.state.error?.message || 'Có sự cố phát sinh trong quá trình kết xuất giao diện.'}
            </p>
            {this.state.error?.stack && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-[11px] font-semibold text-gray-500 hover:text-gray-700">
                  Xem chi tiết kỹ thuật
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-[10px] text-gray-700 font-mono">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={14} />
                <span>Tải lại trang</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/partner/vehicles';
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-0 bg-[#00A859] px-4 py-2.5 text-xs font-bold text-white hover:bg-green-700 shadow-sm"
              >
                <ArrowLeft size={14} />
                <span>Về danh sách xe</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
