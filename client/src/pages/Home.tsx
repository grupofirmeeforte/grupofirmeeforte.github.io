import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, Building2, Briefcase, DollarSign, LogOut } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { UsuariosConectados } from "@/components/UsuariosConectados";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

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
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Grupo Firme e Forte</h1>
          <p className="text-gray-300 mb-8">Sistema de Gestão Integrado</p>
          <Button 
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  const modules = [
    {
      title: "Agentes",
      description: "Gerenciar agentes, dados pessoais e profissionais",
      icon: Users,
      color: "bg-blue-500",
      path: "/agentes",
    },
    {
      title: "Certificações",
      description: "Controlar certificações e alertas de vencimento",
      icon: FileCheck,
      color: "bg-green-500",
      path: "/certificacoes",
    },
    {
      title: "Fornecedores",
      description: "Cadastro e gestão de fornecedores",
      icon: Building2,
      color: "bg-purple-500",
      path: "/fornecedores",
    },
    {
      title: "Operações",
      description: "Consórcios, Seguros, Consignados e Extratos",
      icon: Briefcase,
      color: "bg-orange-500",
      path: "/operacoes",
    },
    {
      title: "Financeiro",
      description: "Comissões, Pagamentos e Relatórios",
      icon: DollarSign,
      color: "bg-red-500",
      path: "/financeiro",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Grupo Firme e Forte</h1>
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
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Card 
                    key={module.path}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(module.path)}
                  >
                    <CardHeader>
                      <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {module.description}
                      </CardDescription>
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
    </div>
  );
}
