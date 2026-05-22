import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, Building2, Briefcase, DollarSign, LogOut, TableProperties, BookUser, ChevronRight, X, Factory, Landmark, ShieldCheck, UserRound, FileText, Mail, ClipboardList, TrendingUp, Phone, CheckSquare, BarChart2, Coins, Stethoscope, ShieldPlus, Gem, BookOpen, BookMarked, Sparkles, FolderOpen, Star, Package, Shirt, Zap, LayoutDashboard } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { UsuariosConectados } from "@/components/UsuariosConectados";
import { ChatWidget } from "@/components/ChatWidget";
import { useState } from "react";
import { usePermissao } from "@/hooks/usePermissao";

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
            <img src="/manus-storage/logo-firme-forte-v2_9bc70f75.png" alt="Grupo Firme & Forte" className="w-40 h-40 object-contain drop-shadow-xl" />
          </div>
          <div className="mb-2">
            <span className="text-yellow-400 text-xs font-semibold tracking-widest uppercase">Sistema de Gestão</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">Grupo Firme & Forte</h1>
          <p className="text-slate-300 mb-8 text-sm">Coban — Banco do Brasil</p>
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
        { title: 'Mensagem do Dia', description: 'Versículos, Salmos, Motivacional e Horóscopo', icon: Mail, color: 'bg-rose-600', path: '/mensagem-do-dia/motivacional', subKey: 'mensagem-do-dia' },
        { title: 'Minutos de Sabedoria', description: 'Reflexões diárias de sabedoria', icon: Sparkles, color: 'bg-purple-600', path: '/mensagem-do-dia/minutos-sabedoria', subKey: 'minutos-sabedoria' },
        { title: 'Salmos', description: 'Salmos do dia', icon: BookOpen, color: 'bg-amber-600', path: '/mensagem-do-dia/salmos', subKey: 'salmos' },
        { title: 'Versículos', description: 'Versículos motivacionais do dia', icon: BookMarked, color: 'bg-rose-600', path: '/mensagem-do-dia/versiculos', subKey: 'versiculos' },
        { title: 'Horóscopo', description: 'Horóscopo diário por signo', icon: Star, color: 'bg-indigo-600', path: '/mensagem-do-dia/horoscopo', subKey: 'horoscopo' },
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
        { title: 'Pró Rata', description: 'Operações com controle de parcelas pagas e a receber', icon: DollarSign, color: 'bg-indigo-600', path: '/pro-rata', subKey: 'pro-rata', ceoOnly: true },
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
  ];
  const grupoAtual = grupos.find(g => g.key === grupoAberto);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663564665591/SMgJn6AGQCNfDq7mPzPqc9/home-bg-EBTQH2Xfk3kEiR2R9PayJu.webp')`,
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
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 border-yellow-400 text-yellow-300 hover:bg-yellow-400/20 bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Módulos do Sistema</h2>
          <p className="text-slate-600">Selecione um módulo para começar</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="flex flex-col gap-4">
              {grupos.map((grupo) => {
                const Icon = grupo.icon;
                const visibleSubs = (isAdminOuCeo
                  ? grupo.subModules
                  : grupo.subModules.filter(m => !m.subKey || podeVer(grupo.key, m.subKey)))
                  .filter(m => !m.ceoOnly || isCEO)
                  .slice()
                  .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
                return (
                  <div
                    key={grupo.key}
                    className={`flex items-stretch rounded-xl border-2 ${grupo.borderColor} bg-gradient-to-br ${grupo.bgColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                  >
                    {/* Bloco esquerdo: ícone + nome do módulo */}
                    <div className="flex flex-col items-center justify-center gap-2 px-5 py-4 min-w-[110px] max-w-[130px] border-r border-slate-200/60">
                      <div className={`${grupo.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-bold text-slate-800 text-center leading-tight">{grupo.title}</span>
                    </div>

                    {/* Sub-abas à direita em ordem alfabética */}
                    <div className="flex flex-wrap gap-2 items-center px-4 py-3 flex-1">
                      {visibleSubs.length > 0 ? (
                        visibleSubs.map(sub => {
                          const SubIcon = sub.icon;
                          return (
                            <button
                              key={sub.path}
                              onClick={() => navigate(sub.path)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                              <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />
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

          {/* Widget de Usuários Conectados */}
          <div className="lg:col-span-1">
            <UsuariosConectados />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Agentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">--</div>
              <p className="text-xs text-slate-500 mt-1">Carregando...</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Certificações Vencendo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">--</div>
              <p className="text-xs text-slate-500 mt-1">Próximos 30 dias</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Produção Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">R$ --</div>
              <p className="text-xs text-slate-500 mt-1">Mês atual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Comissões Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">R$ --</div>
              <p className="text-xs text-slate-500 mt-1">A pagar</p>
            </CardContent>
          </Card>
        </div>
      </main>

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

            {grupoAtual.subModules.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-lg font-medium">Em breve</p>
                <p className="text-sm mt-1">Este módulo está em desenvolvimento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(isAdminOuCeo
                  ? grupoAtual.subModules
                  : grupoAtual.subModules.filter(m => !m.subKey || podeVer(grupoAtual.key, m.subKey)))
                  .filter(m => !m.ceoOnly || isCEO)
                  .map((sub) => {
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
            )}
          </div>
        </div>
      )}

      <ChatWidget />
    </div>
  );
}
