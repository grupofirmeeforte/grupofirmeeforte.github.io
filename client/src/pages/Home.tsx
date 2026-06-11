import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, Building2, Briefcase, DollarSign, LogOut, TableProperties, BookUser, ChevronRight, X, Factory, Landmark, ShieldCheck, UserRound, FileText, Mail, ClipboardList, TrendingUp, Phone, CheckSquare, BarChart2, Coins, Stethoscope, ShieldPlus, Gem, BookOpen, BookMarked, Sparkles, FolderOpen, Star, Package, Shirt, Zap, LayoutDashboard, Shield, DatabaseBackup, MessageSquare, PhoneOff } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { UsuariosConectados } from "@/components/UsuariosConectados";
import { useState, useMemo } from "react";
import { usePermissao } from "@/hooks/usePermissao";
import { trpc } from "@/lib/trpc";
import { BoasVindasEstacao } from "@/components/BoasVindasEstacao";

type SubModule = {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path: string;
  subKey?: string;
  ceoOnly?: boolean;
};

type GroupModule = {
  type: 'group';
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgColor: string;
  key: string;
  subModules: SubModule[];
};

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);
  const { podeVer, isAdminOuCeo, cargo } = usePermissao();
  const isCEO = cargo === 'CEO';
  // Botão de teste de estações — visível apenas para CEO
  const [testeEstacaoAberto, setTesteEstacaoAberto] = useState(false);
  const [testeEstacaoForcar, setTesteEstacaoForcar] = useState<'primavera'|'verao'|'outono'|'inverno'|null>(null);

  // ─── Quick Stats: dados reais do backend ─────────────────────────────────────
  const { data: totalAgentesData } = trpc.agentes.count.useQuery({}, { enabled: isAdminOuCeo });
  const { data: certData } = trpc.agentes.statusCertificacoes.useQuery(undefined, { enabled: isAdminOuCeo });
  const { data: febData } = trpc.febraban.resumo.useQuery({}, { enabled: isAdminOuCeo });
  const { data: pagPendData } = trpc.pagamentos.list.useQuery({ pago: 'nao', limit: 1000 }, { enabled: isAdminOuCeo });

  const totalAgentes = totalAgentesData ?? null;
  const certVencendo = useMemo(() => {
    if (!certData) return null;
    let cnt = 0;
    for (const v of Object.values(certData as Record<string, any>)) {
      const d1 = (v as any)?.consig?.dias;
      const d2 = (v as any)?.lgpd?.dias;
      if ((d1 !== null && d1 !== undefined && d1 >= 0 && d1 <= 30) ||
          (d2 !== null && d2 !== undefined && d2 >= 0 && d2 <= 30)) cnt++;
    }
    return cnt;
  }, [certData]);

  // Listas de agentes com certif vencida e prestes a vencer
  const certListas = useMemo(() => {
    if (!certData) return { vencidas: [], aVencer: [] };
    const vencidas: { nome: string; tipo: string }[] = [];
    const aVencer: { nome: string; tipo: string; dias: number }[] = [];
    for (const v of Object.values(certData as Record<string, any>)) {
      const nome = (v as any)?.nome || (v as any)?.nomeAgente || '?';
      const d1 = (v as any)?.consig?.dias;
      const d2 = (v as any)?.lgpd?.dias;
      if (d1 !== null && d1 !== undefined) {
        if (d1 < 0) vencidas.push({ nome, tipo: 'Consig' });
        else if (d1 <= 30) aVencer.push({ nome, tipo: 'Consig', dias: d1 });
      }
      if (d2 !== null && d2 !== undefined) {
        if (d2 < 0) vencidas.push({ nome, tipo: 'PLDFT' });
        else if (d2 <= 30) aVencer.push({ nome, tipo: 'PLDFT', dias: d2 });
      }
    }
    aVencer.sort((a, b) => a.dias - b.dias);
    return { vencidas, aVencer };
  }, [certData]);
  const producaoMes = useMemo(() => {
    if (!(febData as any)?.empresas) return null;
    return ((febData as any).empresas as any[]).reduce((acc: number, e: any) => acc + (e.contratado ?? 0), 0);
  }, [febData]);
  const comissoesPendentes = useMemo(() => {
    if (!pagPendData) return null;
    return (pagPendData as any[]).reduce((acc: number, p: any) => acc + parseFloat(String(p.valor ?? 0)), 0);
  }, [pagPendData]);
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663564665591/SMgJn6AGQCNfDq7mPzPqc9/coban-bg-972o7wqxPoimymB3vuTFrF.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay escuro para garantir legibilidade */}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white px-8 py-12 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-4">
            <img src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png" alt="Grupo Firme & Forte" className="w-40 h-40 object-contain drop-shadow-xl" />
          </div>
          <div className="mb-2">
            <span className="text-yellow-400 text-xs font-semibold tracking-widest uppercase">Sistema de Gestão</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">Grupo Firme & Forte</h1>
          <p className="text-slate-100 mb-8 text-sm">Coban — Banco do Brasil</p>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-8 py-3 text-base shadow-lg"
          >
            Entrar no Sistema
          </Button>
        </div>
      </div>
    );
  }

  // Grupos na ordem definida pelo usuário
  const grupos: GroupModule[] = [
    {
      type: 'group',
      key: 'painel',
      title: 'Meu Painel',
      description: 'Produção, ranking, metas e conquistas',
      icon: LayoutDashboard,
      color: 'bg-indigo-700',
      borderColor: 'border-indigo-200',
      bgColor: 'from-indigo-50 to-purple-50',
      subModules: [
        { title: 'Meu Painel', description: 'Produção, ranking, metas, streak e conquistas', icon: LayoutDashboard, color: 'bg-indigo-700', path: '/painel-agente', subKey: 'painel-agente' },
        { title: 'Mensagem do Dia', description: 'Motivacional, Minutos de Sabedoria, Salmos, Versículos e Horóscopo', icon: Mail, color: 'bg-rose-600', path: '/mensagem-do-dia', subKey: 'mensagem-do-dia' },
        { title: 'Caixa de Recados', description: 'Envie recados para CEO, Administração, Supervisor ou Suporte', icon: MessageSquare, color: 'bg-amber-600', path: '/caixa-recados', subKey: 'caixa-recados' },
      ],
    },
    {
      type: 'group',
      key: 'cadastros',
      title: 'Cadastros',
      description: 'Agentes, Certificações e Tabela Comissão',
      icon: BookUser,
      color: 'bg-blue-600',
      borderColor: 'border-blue-200',
      bgColor: 'from-blue-50 to-indigo-50',
      subModules: [
        { title: 'Agentes', description: 'Gerenciar agentes, dados pessoais e profissionais', icon: Users, color: 'bg-blue-500', path: '/agentes', subKey: 'agentes' },
        { title: 'Certificações', description: 'Controlar certificações e alertas de vencimento', icon: FileCheck, color: 'bg-green-500', path: '/certificacoes', subKey: 'certificacoes' },
        { title: 'Tabela Comissão', description: 'Faixas e percentuais de comissão por convênio', icon: TableProperties, color: 'bg-indigo-500', path: '/tabela-comissao', subKey: 'tabela-comissao' },
        { title: 'Documentação Agentes', description: 'Cópias de documentos: Contrato, RG, CPF, CNH e mais', icon: FolderOpen, color: 'bg-amber-600', path: '/cadastro/documentacao-agentes', subKey: 'documentacao-agentes' },
        { title: 'Agências BB', description: 'Consulta de agências do Banco do Brasil por prefixo ou nome', icon: Building2, color: 'bg-yellow-600', path: '/agencias-bb', subKey: 'agencias-bb' },
      ],
    },

    {
      type: 'group',
      key: 'financeiro',
      title: 'Financeiro',
      description: 'Comissões, Pagamentos e Relatórios',
      icon: DollarSign,
      color: 'bg-red-600',
      borderColor: 'border-red-200',
      bgColor: 'from-red-50 to-orange-50',
      subModules: [
        { title: 'Cálculo', description: 'Cálculo de comissões e RBM em moeda', icon: DollarSign, color: 'bg-amber-500', path: '/calculo', subKey: 'calculo' },
        { title: 'Despesas Fixas', description: 'Controle de despesas fixas', icon: Building2, color: 'bg-purple-500', path: '/fornecedores', subKey: 'despesas' },
        { title: 'Pagamentos', description: 'Lançamento e controle de pagamentos', icon: DollarSign, color: 'bg-green-600', path: '/pagamentos', subKey: 'pagamentos' },
        { title: 'Contas das Lojas', description: 'Comprovantes e controle de pagamento de contas por loja', icon: FileText, color: 'bg-teal-600', path: '/contas-lojas', subKey: 'contas-lojas' },
        { title: 'Extratos Bancários', description: 'Lançamentos e movimentações das contas bancárias', icon: Landmark, color: 'bg-cyan-700', path: '/extratos-bancarios', subKey: 'extratos-bancarios', ceoOnly: true },
      ],
    },

    {
      type: 'group',
      key: 'producao',
      title: 'Produção',
      description: 'Consignado e demais operações de produção',
      icon: Factory,
      color: 'bg-teal-600',
      borderColor: 'border-teal-200',
      bgColor: 'from-teal-50 to-cyan-50',
      subModules: [
        { title: 'BB Dental', description: 'Planos odontológicos BB Dental', icon: Stethoscope, color: 'bg-cyan-600', path: '/producao/bbdental', subKey: 'bbdental' },
        { title: 'Consignado', description: 'Operações de crédito consignado', icon: Briefcase, color: 'bg-teal-600', path: '/consignado', subKey: 'consignado-prod' },
        { title: 'Consórcio', description: 'Operações de consórcio', icon: Coins, color: 'bg-orange-600', path: '/producao/consorcio', subKey: 'consorcio-prod' },
        { title: 'Conta Corrente', description: 'Operações de conta corrente', icon: DollarSign, color: 'bg-teal-500', path: '/conta-corrente', subKey: 'conta-corrente' },
        { title: 'OuroCap', description: 'Títulos de capitalização OuroCap', icon: Gem, color: 'bg-yellow-600', path: '/producao/ourocap', subKey: 'ourocap-prod' },
        { title: 'Seguros', description: 'Seguros e apólices', icon: ShieldPlus, color: 'bg-indigo-600', path: '/producao/seguros', subKey: 'seguros-prod' },
      ],
    },

    {
      type: 'group',
      key: 'febraban',
      title: 'Febraban',
      description: 'Relatório de Produção BB — importação e gestão de propostas',
      icon: ShieldCheck,
      color: 'bg-violet-600',
      borderColor: 'border-violet-200',
      bgColor: 'from-violet-50 to-purple-50',
      subModules: [
        { title: 'Produção BB', description: 'Relatório de produção Febraban', icon: ShieldCheck, color: 'bg-violet-500', path: '/febraban', subKey: 'producao-bb' },
        { title: 'Acompanhamento Diário', description: 'Produção diária por agente (BMF e FLEX)', icon: ShieldCheck, color: 'bg-violet-700', path: '/febraban/acompanhamento-diario', subKey: 'acompanhamento-diario' },
        { title: 'Gráficos de Produção', description: 'Gráficos por ChaveJ e por tipo de operação', icon: BarChart2, color: 'bg-violet-900', path: '/febraban?aba=graficos', subKey: 'graficos-producao' },
        { title: 'Relatório por Chave J', description: 'Trimestre, Semestre e Ano — Valores e Operações por Chave J', icon: BarChart2, color: 'bg-indigo-700', path: '/febraban/relatorio-chavej', subKey: 'relatorio-chavej' },
        { title: 'Retorno Documentos', description: 'Controle de documentos Febraban (BMF e Flex)', icon: ShieldCheck, color: 'bg-purple-700', path: '/febraban/retorno-documentos', subKey: 'retorno-documentos' },
      ],
    },

    {
      type: 'group',
      key: 'extratos',
      title: 'Extratos',
      description: 'Extratos bancários e financeiros',
      icon: FileText,
      color: 'bg-emerald-600',
      borderColor: 'border-emerald-200',
      bgColor: 'from-emerald-50 to-green-50',
      subModules: [
        { title: 'Extrato Consignado', description: 'Extrato de operações consignadas', icon: FileText, color: 'bg-blue-600', path: '/extratos?aba=consignado', subKey: 'consignado' },
        { title: 'Extrato C/C', description: 'Extrato de conta corrente', icon: FileText, color: 'bg-green-600', path: '/extratos?aba=cc', subKey: 'cc' },
        { title: 'Extrato Consórcio', description: 'Extrato de consórcio', icon: FileText, color: 'bg-purple-600', path: '/extratos?aba=consorcio', subKey: 'consorcio' },
        { title: 'Extrato Ourocap', description: 'Extrato de Ourocap', icon: FileText, color: 'bg-yellow-600', path: '/extratos?aba=ourocap', subKey: 'ourocap' },
        { title: 'Extrato Seguros', description: 'Extrato de seguros', icon: FileText, color: 'bg-red-600', path: '/extratos?aba=seguros', subKey: 'seguros' },
        { title: 'Extrato BB Dental', description: 'Extrato BB Dental', icon: FileText, color: 'bg-teal-600', path: '/extratos?aba=bbdental', subKey: 'bbdental' },
        { title: 'Perspectiva de Ganho', description: 'Perspectiva de comissão do mês atual', icon: TrendingUp, color: 'bg-indigo-600', path: '/extratos?aba=perspectiva', subKey: 'perspectiva' },
        { title: 'Minha Tabela', description: 'Tabela personalizada de comissões', icon: TableProperties, color: 'bg-orange-500', path: '/extratos?aba=minha-tabela', subKey: 'minha-tabela' },
      ],
    },



    {
      type: 'group',
      key: 'crm',
      title: 'CRM',
      description: 'Gestão de relacionamento com clientes',
      icon: UserRound,
      color: 'bg-sky-600',
      borderColor: 'border-sky-200',
      bgColor: 'from-sky-50 to-cyan-50',
      subModules: [
        { title: 'Clientes', description: 'Cadastro e gestão de clientes', icon: Users, color: 'bg-sky-600', path: '/crm?aba=clientes', subKey: 'clientes' },
        { title: 'Oportunidades', description: 'Pipeline de negócios', icon: TrendingUp, color: 'bg-blue-600', path: '/crm?aba=oportunidades', subKey: 'oportunidades' },
        { title: 'Atendimentos', description: 'Histórico de contatos', icon: Phone, color: 'bg-indigo-600', path: '/crm?aba=atendimentos', subKey: 'atendimentos' },
        { title: 'Tarefas / Follow-up', description: 'Lembretes e tarefas', icon: CheckSquare, color: 'bg-violet-600', path: '/crm?aba=tarefas', subKey: 'tarefas' },
        { title: 'Relatórios CRM', description: 'Funil e produtividade', icon: BarChart2, color: 'bg-teal-600', path: '/crm?aba=relatorios', subKey: 'relatorios' },
        { title: 'Mailing / Leads', description: 'Gestão de mailing e leads do banco', icon: Users, color: 'bg-cyan-600', path: '/mailing-crm', subKey: 'mailing-crm' },
        { title: 'Contratos PDF', description: 'Upload e análise de contratos BB Consignado + CRM Refinanciamento', icon: FileText, color: 'bg-emerald-600', path: '/contratos', subKey: 'contratos' },
        { title: 'Não Perturbe', description: 'Lista de telefones bloqueados para contato', icon: PhoneOff, color: 'bg-red-700', path: '/nao-perturbe', subKey: 'nao-perturbe' },
      ],
    },

    {
      type: 'group',
      key: 'relatorios',
      title: 'Controle Ativos',
      description: 'Controle de ativos e patrimônio',
      icon: Landmark,
      color: 'bg-amber-600',
      borderColor: 'border-amber-200',
      bgColor: 'from-amber-50 to-yellow-50',
      subModules: [
        { title: 'Ativo Imobilizado', description: 'Controle de bens patrimoniais', icon: Package, color: 'bg-amber-600', path: '/relatorios/ativo-imobilizado', subKey: 'ativo-imobilizado' },
        { title: 'Uniformes e Crachás', description: 'Controle de entrega por agente', icon: Shirt, color: 'bg-indigo-600', path: '/relatorios/uniformes-crachas', subKey: 'uniformes-crachas' },
      ],
    },
    {
      type: 'group',
      key: 'auditoria',
      title: 'Auditoria',
      description: 'Logs de acesso, feriados e permissões',
      icon: Shield,
      color: 'bg-slate-700',
      borderColor: 'border-slate-200',
      bgColor: 'from-slate-50 to-gray-50',
      subModules: [
        { title: 'Backup', description: 'Exportação completa dos dados do sistema', icon: DatabaseBackup, color: 'bg-emerald-700', path: '/auditoria?aba=backup', subKey: 'backup', ceoOnly: true },
        { title: 'Pró Rata', description: 'Operações com controle de parcelas pagas e a receber', icon: DollarSign, color: 'bg-indigo-600', path: '/pro-rata', subKey: 'pro-rata', ceoOnly: true },
        { title: 'RBM × Despesas', description: 'Relatório anual: produção vs. custos por agente', icon: BarChart2, color: 'bg-rose-700', path: '/relatorio-rbm-despesas', subKey: 'relatorio-rbm-despesas-audit', ceoOnly: true },
        { title: 'Feriados', description: 'Calendário de feriados nacionais, estaduais e municipais', icon: BarChart2, color: 'bg-slate-500', path: '/auditoria?aba=feriados', subKey: 'feriados' },
        { title: 'Logs de Acesso', description: 'Histórico de entradas e saídas no sistema', icon: ClipboardList, color: 'bg-slate-600', path: '/auditoria', subKey: 'logs' },
        { title: 'Permissões', description: 'Controle de acesso por módulo e cargo', icon: Shield, color: 'bg-slate-800', path: '/auditoria?aba=permissoes', subKey: 'logs' },
      ],
    },
  ];
  // Grupos permitidos para promotores (cargo 'Promotor')
  const isPromotor = cargo === 'Promotor';
  const GRUPOS_PROMOTOR = ['painel', 'crm', 'extratos'];
  const gruposVisiveis = isPromotor
    ? grupos.filter(g => GRUPOS_PROMOTOR.includes(g.key))
    : grupos;

  const grupoAtual = gruposVisiveis.find(g => g.key === grupoAberto);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663564665591/SMgJn6AGQCNfDq7mPzPqc9/coban-bg-972o7wqxPoimymB3vuTFrF.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header com gradiente azul escuro + dourado */}
      <header
        className="shadow-lg"
        style={{ background: 'linear-gradient(135deg, #002776 0%, #003d99 60%, #c8960c 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Grupo Firme &amp; Forte</h1>
            <p className="text-xs text-yellow-300 mt-0.5 font-medium tracking-widest uppercase">Coban — Banco do Brasil &nbsp;|&nbsp; Bem-vindo, {user?.name || "Usuário"}</p>
          </div>
          <div className="hidden md:flex flex-col items-center">
            <span className="text-lg font-bold text-white tracking-wide">Módulo do Sistema</span>
            <span className="text-xs text-yellow-300 mt-0.5 font-medium">Selecione um módulo para começar</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2 border-yellow-400 text-yellow-300 hover:bg-yellow-400/20 bg-transparent"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
            <img src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-lg" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="flex flex-col gap-2">
              {gruposVisiveis.map((grupo) => {
                const Icon = grupo.icon;
                const visibleSubs = (isAdminOuCeo
                  ? grupo.subModules
                  : (isPromotor && GRUPOS_PROMOTOR.includes(grupo.key))
                    ? grupo.subModules  // Promotores sempre veem todos os módulos permitidos completos
                    : grupo.subModules.filter(m => !m.subKey || podeVer(grupo.key, m.subKey)))
                  .filter(m => !m.ceoOnly || isCEO)
                  .slice()
                  .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
                // Ocultar grupo inteiro se não há sub-módulos visíveis
                if (visibleSubs.length === 0) return null;
                return (
                  <div
                    key={grupo.key}
                    className="flex items-stretch rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md hover:bg-black/50 transition-all"
                  >
                    {/* Bloco esquerdo: ícone + nome do módulo — compacto */}
                    <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[90px] max-w-[100px] border-r border-white/10">
                      <div className={`${grupo.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-bold text-white text-center leading-tight">{grupo.title}</span>
                    </div>

                    {/* Sub-abas compactas */}
                    <div className="flex flex-wrap gap-1.5 items-center px-3 py-2 flex-1">
                      {visibleSubs.length > 0 ? (
                        visibleSubs.map((sub) => {
                          const SubIcon = sub.icon;
                          const c = { bg: '#1d4ed8', text: '#ffffff', border: '#1e40af', hover: '#1e40af' };
                          return (
                            <button
                              key={sub.path}
                              onClick={() => navigate(sub.path)}
                              style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = c.hover)}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = c.bg)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md border font-semibold text-xs shadow-sm hover:shadow-md transition-all"
                            >
                              <SubIcon className="w-3 h-3 flex-shrink-0" />
                              {sub.title}
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 italic">Em breve...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna direita: cards de resumo + usuários conectados */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            {isAdminOuCeo && (
              <>
                <Card>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-slate-600">Total de Agentes</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="text-xl font-bold text-slate-900">
                      {totalAgentes === null ? '--' : totalAgentes}
                    </div>
                    <p className="text-xs text-slate-500">Cadastrados no sistema</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-slate-600">Certificações Vencendo</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${certVencendo !== null && certVencendo > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {certVencendo === null ? '--' : certVencendo}
                      </span>
                      <span className="text-xs text-slate-500">próx. 30 dias</span>
                    </div>
                    {certListas.vencidas.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 mb-0.5">🔴 Vencidas ({certListas.vencidas.length})</p>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {certListas.vencidas.map((a, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-700 truncate max-w-[100px]">{a.nome}</span>
                              <span className="text-red-500 font-medium ml-1 shrink-0">{a.tipo}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {certListas.aVencer.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 mb-0.5">🟡 A vencer ({certListas.aVencer.length})</p>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {certListas.aVencer.map((a, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-700 truncate max-w-[90px]">{a.nome}</span>
                              <span className="text-amber-600 font-medium ml-1 shrink-0">{a.tipo}·{a.dias}d</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {certVencendo === 0 && (
                      <p className="text-xs text-green-600 font-medium">✅ Todas em dia</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-slate-600">Produção Mês</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="text-xl font-bold text-green-700">
                      {producaoMes === null ? 'R$ --' : fmtBRL(producaoMes)}
                    </div>
                    <p className="text-xs text-slate-500">Mês atual (contratado)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <CardTitle className="text-xs font-medium text-slate-600">Comissões Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className={`text-xl font-bold ${comissoesPendentes !== null && comissoesPendentes > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {comissoesPendentes === null ? 'R$ --' : fmtBRL(comissoesPendentes)}
                    </div>
                    <p className="text-xs text-slate-500">A pagar</p>
                  </CardContent>
                </Card>
              </>
            )}
            <UsuariosConectados />
          </div>
        </div>
      </main>

      {/* Rodapé de licenciamento */}
      <footer className="text-center py-4 mt-2">
        <p className="text-xs text-white/40">
          🔒 Este sistema é licenciado para <span className="font-semibold text-white/60">Grupo Firme &amp; Forte</span>
        </p>
      </footer>

      {/* Modal de grupo */}
      {grupoAberto && grupoAtual && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setGrupoAberto(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`${grupoAtual.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                  {(() => { const Icon = grupoAtual.icon; return <Icon className="w-5 h-5 text-white" />; })()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{grupoAtual.title}</h2>
                  <p className="text-sm text-slate-500">{grupoAtual.description}</p>
                </div>
              </div>
              <button
                onClick={() => setGrupoAberto(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const subsVisiveis = (isAdminOuCeo
                ? grupoAtual.subModules
                : (isPromotor && GRUPOS_PROMOTOR.includes(grupoAtual.key))
                  ? grupoAtual.subModules  // Promotores sempre veem todos os módulos permitidos completos
                  : grupoAtual.subModules.filter(m => !m.subKey || podeVer(grupoAtual.key, m.subKey)))
                .filter(m => !m.ceoOnly || isCEO);
              if (subsVisiveis.length === 0) return (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-lg font-medium">Em breve</p>
                  <p className="text-sm mt-1">Este módulo está em desenvolvimento.</p>
                </div>
              );
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subsVisiveis.map((sub) => {
                    const SubIcon = sub.icon;
                    return (
                      <button
                        key={sub.path}
                        onClick={() => { setGrupoAberto(null); navigate(sub.path); }}
                        className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
                      >
                        <div className={`${sub.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <SubIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{sub.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{sub.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Botão de teste de estações — visível apenas para CEO */}
      {isCEO && (
        <>
          {!testeEstacaoAberto ? (
            <button
              onClick={() => setTesteEstacaoAberto(true)}
              title="Testar animações de estações"
              className="fixed bottom-24 left-4 z-40 flex items-center justify-center w-10 h-10 rounded-full bg-purple-700/80 hover:bg-purple-600 text-white shadow-lg transition-all hover:scale-110 active:scale-95 print:hidden opacity-60 hover:opacity-100"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          ) : (
            <div className="fixed bottom-24 left-4 z-50 bg-gray-900 border border-purple-500/40 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 print:hidden">
              <p className="text-xs text-purple-300 font-semibold text-center mb-1">Testar Estações</p>
              {(['primavera','verao','outono','inverno'] as const).map(e => (
                <button key={e} onClick={() => { setTesteEstacaoForcar(e); setTesteEstacaoAberto(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-800/60 hover:bg-purple-700 text-white capitalize transition-colors">
                  {e === 'primavera' ? '🌸 Primavera' : e === 'verao' ? '☀️ Verão' : e === 'outono' ? '🍂 Outono' : '❄️ Inverno'}
                </button>
              ))}
              <button onClick={() => setTesteEstacaoAberto(false)} className="text-xs text-gray-500 hover:text-gray-100 mt-1">Fechar</button>
            </div>
          )}
          {testeEstacaoForcar && (
            <BoasVindasEstacao forcarEstacao={testeEstacaoForcar} onClose={() => setTesteEstacaoForcar(null)} />
          )}
        </>
      )}
    </div>
  );
}
