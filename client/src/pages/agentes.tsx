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
import { Plus, Edit2, Trash2, Search, ExternalLink, GitMerge, ArrowLeft } from "lucide-react";
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
  const [showDuplicatas, setShowDuplicatas] = useState(false);
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

  const { data: duplicatas, refetch: refetchDuplicatas } = trpc.agentes.listarDuplicatas.useQuery(
    undefined,
    { enabled: showDuplicatas }
  );

  const utils = trpc.useUtils();
  const sincronizarMutation = trpc.agentes.sincronizarDuplicatas.useMutation({
    onSuccess: (result) => {
      const msg = result.atualizados.length > 0
        ? `Sincronização concluída!\nRegistros atualizados: ${result.atualizados.join(', ')}.`
        : `Registros já estão sincronizados (nenhum campo vazio encontrado).`;
      alert(msg);
      refetchDuplicatas();
      utils.agentes.list.invalidate();
    },
    onError: (err) => {
      alert(`Erro ao sincronizar: ${err.message}`);
    },
  });

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
            className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-900 border-gray-800"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDuplicatas(!showDuplicatas)}
            className="gap-2 border-orange-400 text-orange-700 hover:bg-orange-50"
          >
            <GitMerge className="w-4 h-4" />
            Duplicatas
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

      {/* Painel de duplicatas */}
      {showDuplicatas && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
              <CardTitle className="text-orange-800 flex items-center gap-2">
              <GitMerge className="w-5 h-5" />
              Cadastros com Mesmo Nome
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!duplicatas ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : duplicatas.length === 0 ? (
              <p className="text-sm text-green-700 font-medium">✅ Nenhum cadastro duplicado encontrado!</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-orange-700">
                  {duplicatas.length} grupo(s) encontrado(s). Clique em "Sincronizar" para copiar campos pessoais vazios
                  (CPF, email, celular, banco, etc.) entre os cadastros do mesmo agente.
                </p>
                {duplicatas.map((grupo, gi) => (
                  <div key={gi} className="bg-white border border-orange-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{grupo[0]?.nomeAgente} &mdash; CPF: {grupo[0]?.cpfAgente}</p>
                        <div className="mt-2 space-y-1">
                          {grupo.map((ag) => (
                            <div key={ag.id} className="text-xs text-gray-600 flex gap-4">
                              <span className="font-mono">#{ag.id}</span>
                              <span>{ag.empresa}</span>
                              <span>{ag.chaveJ}</span>
                              <span>{ag.numCadastro}</span>
                              <span className={ag.situacao?.startsWith('Ativo') ? 'text-green-700' : 'text-red-600'}>{ag.situacao}</span>
                              <span className="text-gray-400">
                                {[ag.cargo, ag.area, ag.cidade, ag.email, ag.celular].filter(Boolean).length} campos preenchidos
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-500 text-orange-700 hover:bg-orange-100 ml-4"
                        disabled={sincronizarMutation.isPending}
                        onClick={() => {
                          if (confirm(`Sincronizar campos pessoais entre os ${grupo.length} cadastros de "${grupo[0]?.nomeAgente}"?\nCampos vazios serão preenchidos com dados do outro cadastro. Nenhum registro será excluído.`)) {
                            sincronizarMutation.mutate({ ids: grupo.map(a => a.id) });
                          }
                        }}
                      >
                        <GitMerge className="w-4 h-4 mr-1" />
                        Sincronizar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                  <TableHead>Certif. CONSIG</TableHead>
                  <TableHead>Certif. LGPD</TableHead>
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
                    <TableCell colSpan={24} className="text-center py-8">
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
                      {/* Certif. CONSIG */}
                      <TableCell>
                        {(() => {
                          const key = agente.chaveJ?.trim().toUpperCase();
                          const c = key && statusCerts ? statusCerts[key]?.consig : undefined;
                          if (!c || c.status === 'SEM_CERTIFICACAO') return <span className="text-xs text-slate-400">-</span>;
                          if (c.status === 'VENCIDO') return <Badge className="animate-pulse bg-red-600 text-white border-0 text-xs">{(c.dias ?? 0) === 0 ? 'Vencido hoje' : `Vencido há ${Math.abs(c.dias ?? 0)}d`}</Badge>;
                           if (c.status === 'CRITICO') return <Badge className="animate-pulse bg-yellow-400 text-yellow-900 border-0 text-xs">Vence em {c.dias}d</Badge>;
                           return <Badge className="bg-green-100 text-green-800 border-0 text-xs">A vencer {c.dias}d</Badge>;
                         })()}
                      </TableCell>
                      {/* Certif. LGPD */}
                      <TableCell>

                        {(() => {
                          const key = agente.chaveJ?.trim().toUpperCase();
                          const c = key && statusCerts ? statusCerts[key]?.lgpd : undefined;
                          if (!c || c.status === 'SEM_CERTIFICACAO') return <span className="text-xs text-slate-400">-</span>;
                          if (c.status === 'VENCIDO') return <Badge className="animate-pulse bg-red-600 text-white border-0 text-xs">{(c.dias ?? 0) === 0 ? 'Vencido hoje' : `Vencido há ${Math.abs(c.dias ?? 0)}d`}</Badge>;
                           if (c.status === 'CRITICO') return <Badge className="animate-pulse bg-yellow-400 text-yellow-900 border-0 text-xs">Vence em {c.dias}d</Badge>;
                           return <Badge className="bg-green-100 text-green-800 border-0 text-xs">A vencer {c.dias}d</Badge>;
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
