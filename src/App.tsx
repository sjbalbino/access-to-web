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
import GruposProdutos from "./pages/GruposProdutos";
import UnidadesMedida from "./pages/UnidadesMedida";
import Silos from "./pages/Silos";
import Placas from "./pages/Placas";
import TabelaUmidades from "./pages/TabelaUmidades";
import Ncm from "./pages/Ncm";
import Cfops from "./pages/Cfops";
import EmitentesNfe from "./pages/EmitentesNfe";
import NotasFiscais from "./pages/NotasFiscais";
import NotaFiscalForm from "./pages/NotaFiscalForm";
import Transportadoras from "./pages/Transportadoras";
import VendasProducao from "./pages/VendasProducao";
import VendaProducaoForm from "./pages/VendaProducaoForm";
import RemessasVendaForm from "./pages/RemessasVendaForm";
import Transferencias from "./pages/Transferencias";
import NotasDeposito from "./pages/NotasDeposito";
import LocaisEntrega from "./pages/LocaisEntrega";
import EntradaColheita from "./pages/EntradaColheita";
import DevolucaoDeposito from "./pages/DevolucaoDeposito";
import CompraCereais from "./pages/CompraCereais";
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
            <Route path="/entrada-colheita" element={<ProtectedRoute><EntradaColheita /></ProtectedRoute>} />
            <Route path="/clientes-fornecedores" element={<ProtectedRoute><ClientesFornecedores /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/grupos-produtos" element={<ProtectedRoute><GruposProdutos /></ProtectedRoute>} />
            <Route path="/unidades-medida" element={<ProtectedRoute><UnidadesMedida /></ProtectedRoute>} />
            <Route path="/silos" element={<ProtectedRoute><Silos /></ProtectedRoute>} />
            <Route path="/placas" element={<ProtectedRoute><Placas /></ProtectedRoute>} />
            <Route path="/tabela-umidades" element={<ProtectedRoute><TabelaUmidades /></ProtectedRoute>} />
            <Route path="/ncm" element={<ProtectedRoute><Ncm /></ProtectedRoute>} />
            <Route path="/cfops" element={<ProtectedRoute><Cfops /></ProtectedRoute>} />
            <Route path="/emitentes-nfe" element={<ProtectedRoute><EmitentesNfe /></ProtectedRoute>} />
            <Route path="/notas-fiscais" element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />
            <Route path="/notas-fiscais/nova" element={<ProtectedRoute><NotaFiscalForm /></ProtectedRoute>} />
            <Route path="/notas-fiscais/:id" element={<ProtectedRoute><NotaFiscalForm /></ProtectedRoute>} />
            <Route path="/transportadoras" element={<ProtectedRoute><Transportadoras /></ProtectedRoute>} />
            <Route path="/vendas-producao" element={<ProtectedRoute><VendasProducao /></ProtectedRoute>} />
            <Route path="/vendas-producao/nova" element={<ProtectedRoute><VendaProducaoForm /></ProtectedRoute>} />
            <Route path="/vendas-producao/:id" element={<ProtectedRoute><VendaProducaoForm /></ProtectedRoute>} />
            <Route path="/vendas-producao/:id/remessas" element={<ProtectedRoute><RemessasVendaForm /></ProtectedRoute>} />
            <Route path="/transferencias" element={<ProtectedRoute><Transferencias /></ProtectedRoute>} />
            <Route path="/notas-deposito" element={<ProtectedRoute><NotasDeposito /></ProtectedRoute>} />
            <Route path="/devolucao-deposito" element={<ProtectedRoute><DevolucaoDeposito /></ProtectedRoute>} />
            <Route path="/compra-cereais" element={<ProtectedRoute><CompraCereais /></ProtectedRoute>} />
            <Route path="/locais-entrega" element={<ProtectedRoute><LocaisEntrega /></ProtectedRoute>} />
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
