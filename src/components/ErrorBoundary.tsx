import { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log completo no console para diagnóstico
    console.error("[ErrorBoundary] Render crash:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-2xl w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Ocorreu um erro inesperado na tela</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p className="font-mono text-xs whitespace-pre-wrap break-words">
                  {this.state.error?.message || "Erro desconhecido"}
                </p>
                {this.state.error?.stack && (
                  <details className="text-xs opacity-70">
                    <summary className="cursor-pointer">Detalhes técnicos</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline">
                Tentar novamente
              </Button>
              <Button onClick={() => (window.location.href = "/")}>
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
