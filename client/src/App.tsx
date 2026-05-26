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
import Calculo from './pages/Calculo';
import Relatorios from './pages/Relatorios';
import Certificacoes from './pages/Certificacoes';
import FebrabanPage from './pages/Febraban';
import PagamentosPage from './pages/Pagamentos';
import ExtratosPage from './pages/Extratos';
import ProRataPage from './pages/ProRata';
import DespesasFixasPage from './pages/DespesasFixas';
import ContasLojasPage from './pages/ContasLojas';
import CRMPage from './pages/CRM';
import AcompanhamentoDiario from './pages/AcompanhamentoDiario';
import GraficoProducaoBBPage from './pages/GraficoProducaoBB';
import Consorcio from './pages/Consorcio';
import OurocapPage from './pages/Ourocap';
import SegurosPage from './pages/Seguros';
import BBDentalPage from './pages/BBDental';
import MensagemVersiculos from './pages/MensagemVersiculos';
import MensagemSalmos from './pages/MensagemSalmos';
import MensagemMinutosSabedoria from './pages/MensagemMinutosSabedoria';
import MensagemHoroscopo from './pages/MensagemHoroscopo';
import DocumentacaoAgentes from './pages/DocumentacaoAgentes';
import AtivoImobilizado from "@/pages/AtivoImobilizado";
import PainelAgente from "@/pages/PainelAgente";
import UniformesCrachas from './pages/UniformesCrachas';
import MensagemMotivacional from './pages/MensagemMotivacional';
import MensagemDoDiaHub from './pages/MensagemDoDiaHub';
import MailingCrmPage from './pages/MailingCrm';
import RelatorioChaveJ from './pages/RelatorioChaveJ';
import MeuPin from './pages/MeuPin';

// import ChangePasswordPage from "./pages/change-password";
import { useInactivityLogout } from "./hooks/useInactivityLogout";
import { useDisconnectNotification } from "./hooks/useDisconnectNotification";
import { LGPDModal } from "./components/LGPDModal";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { trpc } from "./lib/trpc";
import { useGeolocalizacao } from "./hooks/useGeolocalizacao";
import BloqueioGeolocalizacao from "./components/BloqueioGeolocalizacao";
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
      <Route path={"/meu-pin"} component={MeuPin} />
      <Route path={"/"} component={Home} />
      <Route path={"/agentes"} component={AgentesPage} />
      <Route path={"/agentes/novo"} component={AgentesFormPage} />
      <Route path={"/agentes/:id"} component={AgentesFormPage} />
      <Route path={"/auditoria"} component={AuditoriaPage} />
      <Route path={"/tabela-comissao"} component={TabelaComissao} />
      <Route path={"/consignado"} component={Consignado} />
      <Route path={"/conta-corrente"} component={ContaCorrente} />
      <Route path={"/calculo"} component={Calculo} />
      <Route path={"/relatorios"} component={Relatorios} />
      <Route path={"/certificacoes"} component={Certificacoes} />
      <Route path={"/febraban"} component={FebrabanPage} />
      <Route path={"/febraban/acompanhamento-diario"} component={AcompanhamentoDiario} />
      <Route path={"/febraban/graficos"} component={GraficoProducaoBBPage} />
      <Route path={"/pagamentos"} component={PagamentosPage} />
      <Route path={"/fornecedores"} component={DespesasFixasPage} />
      <Route path={"/contas-lojas"} component={ContasLojasPage} />
      <Route path={"/crm"} component={CRMPage} />
      <Route path={"/mailing-crm"} component={MailingCrmPage} />
      <Route path={"/febraban/relatorio-chavej"} component={RelatorioChaveJ} />
      <Route path={"/extratos"} component={ExtratosPage} />
      <Route path={"/pro-rata"} component={ProRataPage} />
      <Route path={"/producao/consorcio"} component={Consorcio} />
      <Route path={"/producao/ourocap"} component={OurocapPage} />
      <Route path={"/producao/seguros"} component={SegurosPage} />
      <Route path={"/producao/bbdental"} component={BBDentalPage} />
      <Route path={"/mensagem-do-dia/versiculos"} component={MensagemVersiculos} />
      <Route path={"/mensagem-do-dia/salmos"} component={MensagemSalmos} />
      <Route path={"/mensagem-do-dia/minutos-sabedoria"} component={MensagemMinutosSabedoria} />
      <Route path={"/mensagem-do-dia/horoscopo"} component={MensagemHoroscopo} />
      <Route path={"/cadastro/documentacao-agentes"} component={DocumentacaoAgentes} />
      <Route path={"/relatorios/ativo-imobilizado"} component={AtivoImobilizado} />
      <Route path={"/painel-agente"} component={PainelAgente} />
      <Route path={"/relatorios/uniformes-crachas"} component={UniformesCrachas} />
      <Route path={"/mensagem-do-dia/motivacional"} component={MensagemMotivacional} />
      <Route path={"/mensagem-do-dia"} component={MensagemDoDiaHub} />

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

function GeoGate() {
  // Geolocalização desativada provisoriamente (problemas no Windows)
  // const geo = useGeolocalizacao();
  // if (geo.status !== 'autorizado') {
  //   return (
  //     <BloqueioGeolocalizacao
  //       status={geo.status}
  //       mensagem={geo.mensagem}
  //       tentarNovamente={geo.tentarNovamente}
  //     />
  //   );
  // }
  return <LGPDGate />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <GeoGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
