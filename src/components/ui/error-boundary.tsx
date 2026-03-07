import { Component, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });

    const isChunkError =
      error.message.includes('dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('is not a valid JavaScript MIME type');

    if (isChunkError) {
      const SW_RELOAD_KEY = 'sw-chunk-reload';
      const attempts = Number(sessionStorage.getItem(SW_RELOAD_KEY) ?? '0');
      if (attempts < 1) {
        sessionStorage.setItem(SW_RELOAD_KEY, String(attempts + 1));
        // Use href assignment to force a full navigation, bypassing iOS PWA bfcache.
        window.location.href = window.location.href;
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    // Use href assignment to force a full navigation, bypassing iOS PWA bfcache.
    window.location.href = window.location.href;
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallback
          error={error}
          onReset={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Default Error Fallback UI
// ============================================================================

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
  onReload: () => void;
}

const ErrorFallback = ({ error, onReset, onReload }: ErrorFallbackProps) => {
  const isChunkError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('is not a valid JavaScript MIME type');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isChunkError ? 'Update Available' : 'Something went wrong'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isChunkError
              ? 'A new version of the app is available. Please reload to continue.'
              : 'An unexpected error occurred. You can try again or reload the page.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!isChunkError && (
            <Button variant="outline" onClick={onReset}>
              Try Again
            </Button>
          )}
          <Button onClick={onReload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Page
          </Button>
        </div>

        {error && !isChunkError && (
          <details className="text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Technical details
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};
