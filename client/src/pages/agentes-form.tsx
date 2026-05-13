import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// Definição dos módulos e sub-abas para permissões
const MODULOS_PERMISSOES = [
  { modulo: 'cadastros', label: 'Cadastros', subabas: [
    { key: 'agentes', label: 'Agentes' },
    { key: 'certificacoes', label: 'Certificações' },
    { key: 'tabela-comissao', label: 'Tabela Comissão' },
  ]},
  { modulo: 'extratos', label: 'Extratos', subabas: [
    { key: 'consignado', label: 'Extrato Consignado' },
    { key: 'cc', label: 'Extrato C/C' },
    { key: 'consorcio', label: 'Extrato Consórcio' },
    { key: 'ourocap', label: 'Extrato Ourocap' },
    { key: 'seguros', label: 'Extrato Seguros' },
    { key: 'bbdental', label: 'Extrato BB Dental' },
    { key: 'perspectiva', label: 'Perspectiva de Ganho' },
    { key: 'minha-tabela', label: 'Minha Tabela' },
  ]},
  { modulo: 'financeiro', label: 'Financeiro', subabas: [
    { key: 'calculo', label: 'Cálculo' },
    { key: 'pagamentos', label: 'Pagamentos' },
    { key: 'despesas', label: 'Despesas Fixas' },
    { key: 'pro-rata', label: 'Pró Rata' },
  ]},
  { modulo: 'producao', label: 'Produção', subabas: [
    { key: 'consignado-prod', label: 'Consignado' },
    { key: 'conta-corrente', label: 'Conta Corrente' },
  ]},
  { modulo: 'febraban', label: 'Febraban', subabas: [
    { key: 'producao-bb', label: 'Produção BB' },
  ]},
  { modulo: 'relatorios', label: 'Relatórios', subabas: [
    { key: 'relatorios', label: 'Relatórios' },
  ]},
  { modulo: 'auditoria', label: 'Auditoria', subabas: [
    { key: 'logs', label: 'Logs de Acesso' },
    { key: 'feriados', label: 'Feriados' },
  ]},
];

type NivelPermissao = 'sem_acesso' | 'leitura' | 'editar' | 'admin';
type PermissoesMap = Record<string, Record<string, NivelPermissao>>;

const NIVEIS: { value: NivelPermissao; label: string; color: string }[] = [
  { value: 'sem_acesso', label: 'Sem Acesso', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'leitura', label: 'Leitura', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'editar', label: 'Editar', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'admin', label: 'Admin', color: 'bg-green-100 text-green-700 border-green-300' },
];

export default function AgentesFormPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/agentes/:id");
  const agenteId = params?.id ? parseInt(params.id) : null;
  const { user: currentUser } = useAuth();
  const isAdmin = (currentUser as any)?.permissoes === 'admin' || (currentUser as any)?.cargo === 'CEO' || (currentUser as any)?.cargo === 'ADM' || (currentUser as any)?.cargo === 'Admin';

  const [formData, setFormData] = useState({
    numCadastro: "",
    empresa: "",
    chaveJ: "",
    senha: "",
    nomeAgente: "",
    dataAdmissao: "",
    cargo: "",
    area: "",
    vinculo: "",
    situacao: "Ativo",
    nrAgencia: "",
    cidade: "",
    uf: "",
    supervisor: "",
    email: "",
    favorecido: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo: "",
    cpfAgente: "",
    pix: "",
    dataNascimento: "",
    celular: "",
    permissoes: "leitor",
  });

  const [permissoesModulos, setPermissoesModulos] = useState<PermissoesMap>({});
  const [isLoading, setIsLoading] = useState(false);

  const { data: agente } = trpc.agentes.getById.useQuery(
    { id: agenteId! },
    { enabled: !!agenteId }
  );

  const createAgente = trpc.agentes.create.useMutation();
  const updateAgente = trpc.agentes.update.useMutation();

  // Função para formatar nomes em MAIUSCULO
  const formatNameUppercase = (text: string): string => {
    if (!text) return text;
    return text.toUpperCase();
  };

  // Função para formatar CPF (000.000.000-00)
  const formatCPF = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  // Função para formatar Celular ((00) 00000-0000)
  const formatCelular = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Aplicar formatação de nome para campos de nome (MAIUSCULO)
    const isNameField = ['nomeAgente', 'chaveJ', 'empresa', 'favorecido', 'supervisor', 'cargo', 'area', 'vinculo', 'banco', 'cidade'].includes(name);
    let formattedValue = isNameField ? formatNameUppercase(value) : value;
    
    // Aplicar formatação de CPF
    if (name === 'cpfAgente') {
      formattedValue = formatCPF(value);
    }
    
    // Aplicar formatação de Celular
    if (name === 'celular') {
      formattedValue = formatCelular(value);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.chaveJ || !formData.nomeAgente) {
      toast.error("ChaveJ e Nome do Agente são obrigatórios!");
      return;
    }

    setIsLoading(true);

    try {
      // Normalizar campos vazios para undefined
      const normalizedData: Record<string, any> = {};
      
      // Apenas incluir campos que têm valor (não vazios)
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value !== '') {
          // Para datas, manter apenas YYYY-MM-DD sem conversão de fuso
          if (key === 'dataNascimento' || key === 'dataAdmissao') {
            normalizedData[key] = value; // Já está em formato YYYY-MM-DD
          } else {
            normalizedData[key] = value;
          }
        }
      });
      
      // Garantir que campos obrigatórios estejam presentes
      normalizedData.chaveJ = formData.chaveJ;
      normalizedData.nomeAgente = formData.nomeAgente;
      // Incluir permissoesModulos como JSON string (apenas admin pode alterar)
      if (isAdmin) {
        normalizedData.permissoesModulos = JSON.stringify(permissoesModulos);
        normalizedData.permissoes = formData.permissoes;
      }

      if (agenteId) {
        await updateAgente.mutateAsync({
          id: agenteId,
          data: normalizedData as any,
        });
        toast.success("Agente atualizado com sucesso!");
      } else {
        await createAgente.mutateAsync(normalizedData as any);
        toast.success("Agente criado com sucesso!");
      }
      navigate("/agentes");
    } catch (error: any) {
      console.error("Erro ao salvar agente:", error);
      toast.error(error?.message || "Erro ao salvar agente");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agente) {
      setFormData({
        numCadastro: agente.numCadastro || "",
        empresa: agente.empresa || "",
        chaveJ: agente.chaveJ || "",
        senha: agente.senha || "",
        nomeAgente: agente.nomeAgente || "",
        dataAdmissao: agente.dataAdmissao || "", // Manter como string YYYY-MM-DD
        cargo: agente.cargo || "",
        area: agente.area || "",
        vinculo: agente.vinculo || "",
        situacao: agente.situacao || "Ativo",
        nrAgencia: agente.nrAgencia || "",
        cidade: agente.cidade || "",
        uf: agente.uf || "",
        supervisor: agente.supervisor || "",
        email: agente.email || "",
        favorecido: agente.favorecido || "",
        banco: agente.banco || "",
        agencia: agente.agencia || "",
        conta: agente.conta || "",
        tipo: agente.tipo || "",
        cpfAgente: agente.cpfAgente || "",
        pix: agente.pix || "",
        dataNascimento: agente.dataNascimento || "", // Manter como string YYYY-MM-DD
        celular: agente.celular || "",
        permissoes: agente.permissoes || "leitor",
      });
      // Carregar permissoesModulos do JSON
      if ((agente as any).permissoesModulos) {
        try {
          setPermissoesModulos(JSON.parse((agente as any).permissoesModulos));
        } catch {}
      }
    }
  }, [agente]);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-900 border-gray-800"
          onClick={() => navigate("/agentes")}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {agenteId ? "Editar Agente" : "Novo Agente"}
          </h1>
          <p className="text-gray-600 text-sm mt-1">Preencha os campos obrigatórios (*)</p>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEÇÃO 1: CADASTRO BÁSICO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Cadastro Básico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numCadastro">Número de Cadastro</Label>
                <Input
                  id="numCadastro"
                  name="numCadastro"
                  value={formData.numCadastro}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="chaveJ">Chave J *</Label>
                <Input
                  id="chaveJ"
                  name="chaveJ"
                  value={formData.chaveJ}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nomeAgente">Nome do Agente *</Label>
                <Input
                  id="nomeAgente"
                  name="nomeAgente"
                  value={formData.nomeAgente}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  value={formData.senha}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="dataAdmissao">Data de Admissão</Label>
                <Input
                  id="dataAdmissao"
                  name="dataAdmissao"
                  type="date"
                  value={formData.dataAdmissao}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 2: DADOS PROFISSIONAIS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Dados Profissionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cargo">Cargo</Label>
                <Select value={formData.cargo} onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, cargo: value }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="CEO">CEO</SelectItem>
                    <SelectItem value="Gerente">Gerente</SelectItem>
                    <SelectItem value="Promotor">Promotor</SelectItem>
                    <SelectItem value="Suporte">Suporte</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="area">Área</Label>
                <Select value={formData.area} onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, area: value }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Promotor">Promotor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vinculo">Vínculo</Label>
                <Select value={formData.vinculo} onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, vinculo: value }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="Prestador">Prestador</SelectItem>
                    <SelectItem value="Sócio">Sócio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="situacao">Situação</Label>
                <Select value={formData.situacao} onValueChange={(value) => handleSelectChange("situacao", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Ativo01">Ativo01</SelectItem>
                    <SelectItem value="Ativo02">Ativo02</SelectItem>
                    <SelectItem value="Ativo03">Ativo03</SelectItem>
                    <SelectItem value="Ativo04">Ativo04</SelectItem>
                    <SelectItem value="Ativo05">Ativo05</SelectItem>
                    <SelectItem value="Ativo06">Ativo06</SelectItem>
                    <SelectItem value="Ativo07">Ativo07</SelectItem>
                    <SelectItem value="Ativo08">Ativo08</SelectItem>
                    <SelectItem value="Ativo09">Ativo09</SelectItem>
                    <SelectItem value="Ativo10">Ativo10</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                    <SelectItem value="Licença">Licença</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nrAgencia">Número da Agência</Label>
                <Input
                  id="nrAgencia"
                  name="nrAgencia"
                  value={formData.nrAgencia}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="supervisor">Supervisor</Label>
                <Input
                  id="supervisor"
                  name="supervisor"
                  value={formData.supervisor}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 3: LOCALIZAÇÃO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Localização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  name="uf"
                  value={formData.uf}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 4: DADOS PESSOAIS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cpfAgente">CPF</Label>
                <Input
                  id="cpfAgente"
                  name="cpfAgente"
                  placeholder="000.000.000-00"
                  value={formData.cpfAgente}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  name="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  name="celular"
                  placeholder="(00) 00000-0000"
                  value={formData.celular}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 5: DADOS BANCÁRIOS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5. Dados Bancários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="favorecido">Favorecido</Label>
                <Input
                  id="favorecido"
                  name="favorecido"
                  value={formData.favorecido}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="banco">Banco</Label>
                <Input
                  id="banco"
                  name="banco"
                  value={formData.banco}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  name="agencia"
                  value={formData.agencia}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="conta">Conta</Label>
                <Input
                  id="conta"
                  name="conta"
                  value={formData.conta}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Conta</Label>
                <Select value={formData.tipo} onValueChange={(value) => handleSelectChange("tipo", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                    <SelectItem value="Conta Poupança">Conta Poupança</SelectItem>
                    <SelectItem value="Conta Empresa">Conta Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pix">PIX</Label>
                <Input
                  id="pix"
                  name="pix"
                  placeholder="Email, CPF ou Chave Aleatória"
                  value={formData.pix}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Permissões — visível apenas para admin */}
        {isAdmin && (
          <Card className="border-2 border-indigo-200 bg-indigo-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-800">
                <Shield className="w-5 h-5" />
                Permissões de Acesso
              </CardTitle>
              <p className="text-sm text-slate-500">Defina o que este agente pode acessar em cada módulo do sistema.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nível geral */}
              <div className="flex items-center gap-4 pb-4 border-b border-indigo-200">
                <Label className="w-40 font-semibold text-slate-700">Nível Geral</Label>
                <Select value={formData.permissoes} onValueChange={(v) => setFormData(prev => ({ ...prev, permissoes: v }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem_acesso">Sem Acesso</SelectItem>
                    <SelectItem value="leitor">Leitor</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-400">Usado como padrão quando não há permissão específica por sub-aba</span>
              </div>

              {/* Permissões por módulo e sub-aba */}
              {MODULOS_PERMISSOES.map(({ modulo, label, subabas }) => (
                <div key={modulo} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700 text-sm">{label}</div>
                  <div className="divide-y divide-slate-100">
                    {subabas.map(({ key, label: subLabel }) => {
                      const nivel = (permissoesModulos[modulo]?.[key] ?? 'leitura') as NivelPermissao;
                      return (
                        <div key={key} className="flex items-center gap-3 px-4 py-2">
                          <span className="w-48 text-sm text-slate-600">{subLabel}</span>
                          <div className="flex gap-2">
                            {NIVEIS.map(n => (
                              <button
                                key={n.value}
                                type="button"
                                onClick={() => setPermissoesModulos(prev => ({
                                  ...prev,
                                  [modulo]: { ...prev[modulo], [key]: n.value }
                                }))}
                                className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                                  nivel === n.value
                                    ? n.color + ' ring-2 ring-offset-1 ring-current'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {n.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Botões */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/agentes")}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading ? "Salvando..." : "Salvar Agente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
