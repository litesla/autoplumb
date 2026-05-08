import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Щось пішло не так. Будь ласка, спробуйте пізніше.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            isFirestoreError = true;
            if (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions')) {
              errorMessage = `У вас недостатньо прав для виконання цієї операції (${parsed.operationType} на ${parsed.path}).`;
            } else {
              errorMessage = `Помилка бази даних: ${parsed.error}`;
            }
          }
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-xl border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">Упс! Сталася помилка</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center space-x-2 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <RefreshCw size={20} />
              <span>Оновити сторінку</span>
            </button>
            {isFirestoreError && (
              <p className="mt-4 text-[10px] text-gray-400 font-mono break-all">
                {this.state.error?.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
