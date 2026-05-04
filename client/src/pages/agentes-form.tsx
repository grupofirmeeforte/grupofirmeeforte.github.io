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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function AgentesFormPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/agentes/:id");
  const agenteId = params?.id ? parseInt(params.id) : null;

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
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Aplicar formatação de nome para campos de nome (MAIUSCULO)
    const isNameField = ['nomeAgente', 'chaveJ', 'empresa', 'favorecido', 'supervisor', 'cargo', 'area', 'vinculo', 'banco', 'cidade'].includes(name);
    const formattedValue = isNameField ? formatNameUppercase(value) : value;
    
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
      const normalizedData = {
        ...formData,
        email: formData.email || undefined,
        cpfAgente: formData.cpfAgente || undefined,
        celular: formData.celular || undefined,
        dataNascimento: formData.dataNascimento || undefined,
      };

      if (agenteId) {
        await updateAgente.mutateAsync({
          id: agenteId,
          data: normalizedData,
        });
        toast.success("Agente atualizado com sucesso!");
      } else {
        await createAgente.mutateAsync(normalizedData);
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
        dataAdmissao: agente.dataAdmissao ? new Date(agente.dataAdmissao).toISOString().split('T')[0] : "",
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
        dataNascimento: agente.dataNascimento ? new Date(agente.dataNascimento).toISOString().split('T')[0] : "",
        celular: agente.celular || "",
      });
    }
  }, [agente]);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/agentes")}
        >
          <ArrowLeft className="w-4 h-4" />
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
                <Input
                  id="cargo"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="area">Área</Label>
                <Input
                  id="area"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="vinculo">Vínculo</Label>
                <Input
                  id="vinculo"
                  name="vinculo"
                  value={formData.vinculo}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="situacao">Situação</Label>
                <Select value={formData.situacao} onValueChange={(value) => handleSelectChange("situacao", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                    <SelectItem value="Licença">Licença</SelectItem>
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
