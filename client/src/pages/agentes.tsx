import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Search, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

// Função para formatar data YYYY-MM-DD para DD/MM/YYYY
const formatDateString = (dateStr: string): string => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function AgentesPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState<string>("");
  const [situacao, setSituacao] = useState<string>("");
  const [cidade, setCidade] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: agentes, isLoading } = trpc.agentes.list.useQuery({
    search,
    empresa: empresa && empresa !== "__all__" ? empresa : undefined,
    situacao: situacao && situacao !== "__all__" ? situacao : undefined,
    cidade: cidade && cidade !== "__all__" ? cidade : undefined,
    limit,
    offset: page * limit,
  });

  const { data: empresas } = trpc.agentes.getEmpresas.useQuery();
  const { data: cidades } = trpc.agentes.getCidades.useQuery();
  const { data: statusCerts } = trpc.agentes.statusCertificacoes.useQuery(undefined, {
    refetchInterval: 24 * 60 * 60 * 1000, // atualiza uma vez por dia
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: totalCount } = trpc.agentes.count.useQuery({
    search,
    empresa: empresa && empresa !== "__all__" ? empresa : undefined,
    situacao: situacao && situacao !== "__all__" ? situacao : undefined,
    cidade: cidade && cidade !== "__all__" ? cidade : undefined,
  });

  const deleteAgente = trpc.agentes.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este agente?")) {
      deleteAgente.mutate({ id });
    }
  };

  const totalPages = totalCount ? Math.ceil(totalCount / limit) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-bold">Agentes</h1>
          <p className="text-gray-600 mt-1">
            {totalCount ? `Total: ${totalCount} agentes` : "Carregando..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="gap-2"
          >
            ← Voltar
          </Button>
          <Button
            onClick={() => navigate("/agentes/novo")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Agente
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>

            <Select value={empresa} onValueChange={(value) => {
              setEmpresa(value);
              setPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {empresas?.map((emp) => (
                  <SelectItem key={emp} value={emp || "__empty__"}>
                    {emp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cidade} onValueChange={(value) => {
              setCidade(value);
              setPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {cidades?.map((cid) => (
                  <SelectItem key={cid} value={cid || "__empty__"}>
                    {cid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={situacao} onValueChange={(value) => {
              setSituacao(value);
              setPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>ChaveJ</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data Admissão</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Certificação</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Data Nascimento</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>PIX</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={23} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : agentes && agentes.length > 0 ? (
                  agentes.map((agente, index) => (
                    <TableRow key={agente.id} className={`${
                      index % 2 === 0 
                        ? 'bg-gradient-to-r from-blue-50 to-transparent' 
                        : 'bg-gradient-to-r from-blue-100 to-transparent'
                    } hover:from-blue-200 hover:to-blue-100 transition-colors`}>
                      <TableCell className="font-medium text-sm">
                        {agente.numCadastro}
                      </TableCell>
                      <TableCell>{agente.empresa}</TableCell>
                      <TableCell>{agente.chaveJ}</TableCell>
                      <TableCell>{'*'.repeat(6)}</TableCell>
                      <TableCell className="font-medium">
                        {agente.nomeAgente}
                      </TableCell>
                      <TableCell>{agente.dataAdmissao ? formatDateString(typeof agente.dataAdmissao === 'string' ? agente.dataAdmissao : '') : '-'}</TableCell>
                      <TableCell>{agente.cargo}</TableCell>
                      <TableCell>{agente.area}</TableCell>
                      <TableCell>{agente.vinculo}</TableCell>
                      <TableCell>
                        {(() => {
                          const key = agente.chaveJ?.trim().toUpperCase();
                          const cert = key && statusCerts ? statusCerts[key] : undefined;
                          if (!cert || cert.status === 'SEM_CERTIFICACAO') {
                            return <span className="text-xs text-slate-400 font-medium">Sem Certificação</span>;
                          }
                          if (cert.status === 'VENCIDO') {
                            return (
                              <Badge className="animate-pulse bg-red-600 text-white border-0 text-xs">
                                Vencido há {Math.abs(cert.diasMin ?? 0)} dias
                              </Badge>
                            );
                          }
                          if (cert.status === 'CRITICO') {
                            return (
                              <Badge className="animate-pulse bg-yellow-400 text-yellow-900 border-0 text-xs">
                                Vence em {cert.diasMin} dias
                              </Badge>
                            );
                          }
                          return (
                            <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                              A vencer em {cert.diasMin} dias
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            agente.situacao === "Ativo" || agente.situacao?.startsWith("Ativo")
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {agente.situacao}
                        </span>
                      </TableCell>
                      <TableCell>{agente.supervisor}</TableCell>
                      <TableCell>{agente.cidade}</TableCell>
                      <TableCell>{agente.uf}</TableCell>
                      <TableCell>{agente.cpfAgente}</TableCell>
                      <TableCell>{agente.dataNascimento ? formatDateString(typeof agente.dataNascimento === 'string' ? agente.dataNascimento : '') : '-'}</TableCell>
                      <TableCell>{agente.email}</TableCell>
                      <TableCell>{agente.celular}</TableCell>
                      <TableCell>{agente.banco}</TableCell>
                      <TableCell>{agente.agencia}</TableCell>
                      <TableCell>{agente.conta}</TableCell>
                      <TableCell>{agente.pix}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {agente.cpfAgente && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Consultar no CRCP"
                            onClick={() => {
                              const cpfLimpo = agente.cpfAgente!.replace(/\D/g, '');
                              window.open(`https://www.crcp.org.br/?cpf=${cpfLimpo}`, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/agentes/${agente.id}`)}
                        >
                          <Edit2 className="w-4 h-4" />

                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(agente.id)}
                          disabled={deleteAgente.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Nenhum agente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Página {page + 1} de {totalPages}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page === totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
