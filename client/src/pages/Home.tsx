import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, Building2, Briefcase, DollarSign, LogOut, TableProperties, BookUser, ChevronRight, X, Factory, Landmark } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { UsuariosConectados } from "@/components/UsuariosConectados";
import { ChatWidget } from "@/components/ChatWidget";
import { useState } from "react";

type SubModule = {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path: string;
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Grupo Firme & Forte</h1>
          <p className="text-slate-300 mb-8">Sistema de Gestão</p>
          <Button onClick={() => window.location.href = getLoginUrl()} className="bg-blue-600 hover:bg-blue-700">
            Entrar no Sistema
          </Button>
        </div>
      </div>
    );
  }

  const grupos: GroupModule[] = [
    {
      type: 'group',
      key: 'cadastros',
      title: 'Cadastros',
      description: 'Agentes, Certificações, Fornecedores e Tabela Comissão',
      icon: BookUser,
      color: 'bg-blue-600',
      borderColor: 'border-blue-200',
      bgColor: 'from-blue-50 to-indigo-50',
      subModules: [
        { title: 'Agentes', description: 'Gerenciar agentes, dados pessoais e profissionais', icon: Users, color: 'bg-blue-500', path: '/agentes' },
        { title: 'Certificações', description: 'Controlar certificações e alertas de vencimento', icon: FileCheck, color: 'bg-green-500', path: '/certificacoes' },
        { title: 'Fornecedores', description: 'Cadastro e gestão de fornecedores', icon: Building2, color: 'bg-purple-500', path: '/fornecedores' },
        { title: 'Tabela Comissão', description: 'Faixas e percentuais de comissão por convênio', icon: TableProperties, color: 'bg-indigo-500', path: '/tabela-comissao' },
      ],
    },
    {
      type: 'group',
      key: 'febraban',
      title: 'Febraban',
      description: 'Regulamentações e conformidade Febraban',
      icon: Landmark,
      color: 'bg-amber-600',
      borderColor: 'border-amber-200',
      bgColor: 'from-amber-50 to-yellow-50',
      subModules: [
        { title: 'Relatório BB', description: 'Importar e visualizar relatório de produção BB', icon: Factory, color: 'bg-amber-500', path: '/febraban' },
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
        { title: 'Cálculo', description: 'Calcule comissões, RBM e outras métricas', icon: DollarSign, color: 'bg-red-500', path: '/calculo' },
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
        { title: 'Consignado', description: 'Operações de crédito consignado', icon: Briefcase, color: 'bg-teal-600', path: '/consignado' },
        { title: 'Conta Corrente', description: 'Operações de conta corrente', icon: DollarSign, color: 'bg-teal-500', path: '/conta-corrente' },
      ],
    },
  ];

  const grupoAtual = grupos.find(g => g.key === grupoAberto);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Grupo Firme & Forte</h1>
            <p className="text-sm text-slate-600 mt-1">Bem-vindo, {user?.name || "Usuário"}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {grupos.map((grupo) => {
                const Icon = grupo.icon;
                return (
                  <Card
                    key={grupo.key}
                    className={`hover:shadow-lg transition-shadow cursor-pointer border-2 ${grupo.borderColor} bg-gradient-to-br ${grupo.bgColor}`}
                    onClick={() => setGrupoAberto(grupo.key)}
                  >
                    <CardHeader>
                      <div className={`${grupo.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-lg flex items-center justify-between">
                        {grupo.title}
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">{grupo.description}</CardDescription>
                      {grupo.subModules.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {grupo.subModules.map(m => (
                            <span key={m.path} className="text-xs bg-white/70 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{m.title}</span>
                          ))}
                        </div>
                      )}
                      {grupo.subModules.length === 0 && (
                        <p className="text-xs text-slate-400 mt-2 italic">Abas em breve...</p>
                      )}
                    </CardContent>
                  </Card>
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
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg font-medium">Em breve</p>
                <p className="text-sm mt-1">As abas deste módulo serão adicionadas em breve.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {grupoAtual.subModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.path}
                      className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                      onClick={() => { setGrupoAberto(null); navigate(module.path); }}
                    >
                      <div className={`${module.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-blue-700">{module.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
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
