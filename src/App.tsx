import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Empresas from "./pages/Empresas";
import Culturas from "./pages/Culturas";
import Safras from "./pages/Safras";
import Produtores from "./pages/Produtores";
import Lavouras from "./pages/Lavouras";
import Auth from "./pages/Auth";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresas"
              element={
                <ProtectedRoute>
                  <Empresas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/culturas"
              element={
                <ProtectedRoute>
                  <Culturas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safras"
              element={
                <ProtectedRoute>
                  <Safras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtores"
              element={
                <ProtectedRoute>
                  <Produtores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lavouras"
              element={
                <ProtectedRoute>
                  <Lavouras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute requireAdmin>
                  <Usuarios />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
