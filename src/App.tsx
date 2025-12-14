import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Granjas from "./pages/Granjas";
import Culturas from "./pages/Culturas";
import Safras from "./pages/Safras";
import Produtores from "./pages/Produtores";
import Lavouras from "./pages/Lavouras";
import ControleLavoura from "./pages/ControleLavoura";
import Auth from "./pages/Auth";
import Usuarios from "./pages/Usuarios";
import Tenants from "./pages/Tenants";
import ClientesFornecedores from "./pages/ClientesFornecedores";
import Produtos from "./pages/Produtos";
import UnidadesMedida from "./pages/UnidadesMedida";
import Silos from "./pages/Silos";
import Placas from "./pages/Placas";
import TabelaUmidades from "./pages/TabelaUmidades";
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
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/granjas" element={<ProtectedRoute><Granjas /></ProtectedRoute>} />
            <Route path="/culturas" element={<ProtectedRoute><Culturas /></ProtectedRoute>} />
            <Route path="/safras" element={<ProtectedRoute><Safras /></ProtectedRoute>} />
            <Route path="/produtores" element={<ProtectedRoute><Produtores /></ProtectedRoute>} />
            <Route path="/lavouras" element={<ProtectedRoute><Lavouras /></ProtectedRoute>} />
            <Route path="/controle-lavoura" element={<ProtectedRoute><ControleLavoura /></ProtectedRoute>} />
            <Route path="/clientes-fornecedores" element={<ProtectedRoute><ClientesFornecedores /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/unidades-medida" element={<ProtectedRoute><UnidadesMedida /></ProtectedRoute>} />
            <Route path="/silos" element={<ProtectedRoute><Silos /></ProtectedRoute>} />
            <Route path="/placas" element={<ProtectedRoute><Placas /></ProtectedRoute>} />
            <Route path="/tabela-umidades" element={<ProtectedRoute><TabelaUmidades /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute requireAdmin><Usuarios /></ProtectedRoute>} />
            <Route path="/tenants" element={<ProtectedRoute requireSuperAdmin><Tenants /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
