import { useState, useEffect } from "react";
import { useRoute, useRouter } from "wouter";
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
  const [, navigate] = useRouter() as any;
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

  // Carregar dados do agente se for edição
  const { data: agente } = trpc.agentes.getById.useQuery(
    { id: agenteId! },
    { enabled: !!agenteId }
  );

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

  // Mutations
  const createAgente = trpc.agentes.create.useMutation();
  const updateAgente = trpc.agentes.update.useMutation();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
    setIsLoading(true);

    try {
      if (agenteId) {
        await updateAgente.mutateAsync({
          id: agenteId,
          data: formData,
        });
        toast.success("Agente atualizado com sucesso!");
      } else {
        await createAgente.mutateAsync(formData);
        toast.success("Agente criado com sucesso!");
      }
      navigate("/agentes");
    } catch (error) {
      toast.error("Erro ao salvar agente");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
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
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção: Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="cpfAgente">CPF</Label>
                <Input
                  id="cpfAgente"
                  name="cpfAgente"
                  value={formData.cpfAgente}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
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
                  value={formData.celular}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção: Dados Profissionais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Profissionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chaveJ">Chave J</Label>
                <Input
                  id="chaveJ"
                  name="chaveJ"
                  value={formData.chaveJ}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="numCadastro">Número de Cadastro</Label>
                <Input
                  id="numCadastro"
                  name="numCadastro"
                  value={formData.numCadastro}
                  onChange={handleInputChange}
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
                <Label htmlFor="supervisor">Supervisor</Label>
                <Input
                  id="supervisor"
                  name="supervisor"
                  value={formData.supervisor}
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
              <div>
                <Label htmlFor="situacao">Situação</Label>
                <Select
                  value={formData.situacao}
                  onValueChange={(value) =>
                    handleSelectChange("situacao", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção: Dados Bancários */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Bancários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Input
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="pix">Chave PIX</Label>
                <Input
                  id="pix"
                  name="pix"
                  value={formData.pix}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="favorecido">Favorecido</Label>
                <Input
                  id="favorecido"
                  name="favorecido"
                  value={formData.favorecido}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção: Localização */}
        <Card>
          <CardHeader>
            <CardTitle>Localização</CardTitle>
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
                  maxLength={2}
                />
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
            </div>
          </CardContent>
        </Card>

        {/* Seção: Outros */}
        <Card>
          <CardHeader>
            <CardTitle>Outros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  value={formData.senha}
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
            onClick={() => navigate("/agentes")}          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
