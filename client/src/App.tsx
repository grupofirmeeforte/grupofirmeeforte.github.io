import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AgentesPage from "./pages/agentes";
import AgentesFormPage from "./pages/agentes-form";
import Login from "./pages/Login";
import AuditoriaPage from "./pages/auditoria";
import TabelaComissao from './pages/TabelaComissao';
import Consignado from './pages/Consignado';
import ContaCorrente from './pages/ContaCorrente';
import Febraban from './pages/Febraban';
// import ChangePasswordPage from "./pages/change-password";
import { useInactivityLogout } from "./hooks/useInactivityLogout";
import { useDisconnectNotification } from "./hooks/useDisconnectNotification";
import { LGPDModal } from "./components/LGPDModal";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { trpc } from "./lib/trpc";
// import { useCheckPasswordChange } from "./hooks/useCheckPasswordChange";

function RouterWithInactivity() {
  // Ativar desconexão por inatividade
  useInactivityLogout();
  
  // Ativar notificação de desconexão
  useDisconnectNotification();
  
  // Verificar se precisa trocar senha
  // useCheckPasswordChange();
  
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/agentes"} component={AgentesPage} />
      <Route path={"/agentes/novo"} component={AgentesFormPage} />
      <Route path={"/agentes/:id"} component={AgentesFormPage} />
      <Route path={"/auditoria"} component={AuditoriaPage} />
      <Route path={"/tabela-comissao"} component={TabelaComissao} />
      <Route path={"/consignado"} component={Consignado} />
      <Route path={"/conta-corrente"} component={ContaCorrente} />
      <Route path={"/febraban"} component={Febraban} />
      {/* <Route path={"/change-password"} component={ChangePasswordPage} /> */}
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function LGPDGate() {
  const { user, isAuthenticated } = useAuth();
  const [showLGPD, setShowLGPD] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const acceptLGPDMutation = trpc.auth.acceptLGPD.useMutation();

  useEffect(() => {
    if (isAuthenticated && user && !user.lgpdAceito) {
      setShowLGPD(true);
    }
  }, [isAuthenticated, user]);

  const handleAcceptLGPD = async () => {
    setIsAccepting(true);
    try {
      await acceptLGPDMutation.mutateAsync();
      setShowLGPD(false);
    } catch (error) {
      console.error('Erro ao aceitar LGPD:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <>
      {showLGPD && <LGPDModal onAccept={handleAcceptLGPD} isLoading={isAccepting} />}
      <RouterWithInactivity />
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <LGPDGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
