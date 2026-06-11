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
import { Plus, Edit2, Trash2, Search, ExternalLink, GitMerge, Copy, Check, FileText } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useLocation } from "wouter";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

// Função para formatar data YYYY-MM-DD para DD/MM/YYYY
const formatDateString = (dateStr: string): string => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function AgentesPage() {
  useRegistrarModulo('Agentes');
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState<string>("");
  const [situacao, setSituacao] = useState<string>("");
  const [cidade, setCidade] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");
  const [page, setPage] = useState(0);
  const [showDuplicatas, setShowDuplicatas] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 50;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const { data: agentes, isLoading } = trpc.agentes.list.useQuery({
    search,
    empresa: empresa && empresa !== "__all__" ? empresa : undefined,
    situacao: situacao && situacao !== "__all__" ? situacao : undefined,
    cidade: cidade && cidade !== "__all__" ? cidade : undefined,
    cargo: cargo && cargo !== "__all__" ? cargo : undefined,
    limit,
    offset: page * limit,
  });

  const { data: empresas } = trpc.agentes.getEmpresas.useQuery();
  const { data: cidades } = trpc.agentes.getCidades.useQuery();
  const { data: cargos } = trpc.agentes.getCargos.useQuery();
  const { data: statusCerts } = trpc.agentes.statusCertificacoes.useQuery(undefined, {
    refetchInterval: 24 * 60 * 60 * 1000, // atualiza uma vez por dia
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: totalCount } = trpc.agentes.count.useQuery({
    search,
    empresa: empresa && empresa !== "__all__" ? empresa : undefined,
    situacao: situacao && situacao !== "__all__" ? situacao : undefined,
    cidade: cidade && cidade !== "__all__" ? cidade : undefined,
    cargo: cargo && cargo !== "__all__" ? cargo : undefined,
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
    <div className="min-h-screen bg-gray-950 text-white space-y-4 pb-6">
      <PageHeader title="Agentes" onBack={() => navigate("/")} actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDuplicatas(!showDuplicatas)}
            className="gap-1 border-orange-400 text-orange-300 hover:bg-orange-400/20 bg-transparent text-xs"
          >
            <GitMerge className="w-3 h-3" />
            Duplicatas
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/agentes/novo")}
            className="gap-1 bg-blue-700 hover:bg-blue-600 text-white text-xs"
          >
            <Plus className="w-3 h-3" />
            Novo Agente
          </Button>
        </div>
      } />
      <div className="px-6 text-sm text-gray-400">
        {totalCount ? `Total: ${totalCount} agentes` : "Carregando..."}
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
              <p className="text-sm text-gray-400">Carregando...</p>
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
                            <div key={ag.id} className="text-xs text-gray-100 flex gap-4">
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

            <Select value={cargo} onValueChange={(value) => {
              setCargo(value);
              setPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {cargos?.map((c) => (
                  <SelectItem key={c} value={c || "__empty__"}>
                    {c}
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
                <SelectItem value="Ativo11">Ativo11</SelectItem>
                <SelectItem value="Ativo12">Ativo12</SelectItem>
                <SelectItem value="Ativo13">Ativo13</SelectItem>
                <SelectItem value="Ativo14">Ativo14</SelectItem>
                <SelectItem value="Ativo15">Ativo15</SelectItem>
                <SelectItem value="Ativo16">Ativo16</SelectItem>
                <SelectItem value="Ativo17">Ativo17</SelectItem>
                <SelectItem value="Ativo18">Ativo18</SelectItem>
                <SelectItem value="Ativo19">Ativo19</SelectItem>
                <SelectItem value="Ativo20">Ativo20</SelectItem>
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
                  <TableHead className="min-w-[260px]">Agente</TableHead>
                  <TableHead className="min-w-[200px]">Função / Certificações</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>CPF / Celular</TableHead>
                  <TableHead>Dados Bancários</TableHead>
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
                      agente.situacao === 'Cancelado'
                        ? 'bg-red-50 border-l-4 border-l-red-500 opacity-80'
                        : index % 2 === 0 
                        ? 'bg-gradient-to-r from-blue-50 to-transparent' 
                        : 'bg-gradient-to-r from-blue-100 to-transparent'
                    } hover:from-blue-200 hover:to-blue-100 transition-colors`}>
                      {/* Coluna compacta: ChaveJ + Situação + Nome + Empresa·Cidade */}
                      <TableCell className="min-w-[260px]">
                        {/* Linha 1: ChaveJ + botão copiar + Senha + botão copiar + badge Situação */}
                        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                          <span className="font-bold text-blue-700 text-sm">{agente.chaveJ}</span>
                          <button
                            title="Copiar Chave J"
                            onClick={() => copyToClipboard(agente.chaveJ || '', `chave-${agente.id}`)}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-0.5 rounded"
                          >
                            {copiedId === `chave-${agente.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <span className="text-xs text-gray-400 font-mono ml-1">{'*'.repeat(6)}</span>
                          <button
                            title="Copiar Senha"
                            onClick={() => copyToClipboard(agente.senha || '', `senha-${agente.id}`)}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-0.5 rounded"
                          >
                            {copiedId === `senha-${agente.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ml-1 ${
                            agente.situacao === 'Ativo'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : agente.situacao === 'Ativo01'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : agente.situacao === 'Ativo02'
                              ? 'bg-teal-100 text-teal-800 border-teal-300'
                              : agente.situacao === 'Ativo03'
                              ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                              : agente.situacao === 'Ativo04'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : agente.situacao === 'Ativo05'
                              ? 'bg-violet-100 text-violet-800 border-violet-300'
                              : agente.situacao === 'Ativo06'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : agente.situacao === 'Ativo07'
                              ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
                              : agente.situacao === 'Ativo08'
                              ? 'bg-pink-100 text-pink-800 border-pink-300'
                              : agente.situacao === 'Ativo09'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : agente.situacao === 'Ativo10'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : agente.situacao === 'Ativo11'
                              ? 'bg-lime-100 text-lime-800 border-lime-300'
                              : agente.situacao === 'Ativo12'
                              ? 'bg-green-200 text-green-900 border-green-400'
                              : agente.situacao === 'Ativo13'
                              ? 'bg-teal-200 text-teal-900 border-teal-400'
                              : agente.situacao === 'Ativo14'
                              ? 'bg-sky-200 text-sky-900 border-sky-400'
                              : agente.situacao === 'Ativo15'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                              : agente.situacao === 'Ativo16'
                              ? 'bg-violet-200 text-violet-900 border-violet-400'
                              : agente.situacao === 'Ativo17'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : agente.situacao === 'Ativo18'
                              ? 'bg-red-200 text-red-900 border-red-400'
                              : agente.situacao === 'Ativo19'
                              ? 'bg-orange-200 text-orange-900 border-orange-400'
                              : agente.situacao === 'Ativo20'
                              ? 'bg-yellow-200 text-yellow-900 border-yellow-400'
                              : agente.situacao === 'Inativo'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : agente.situacao === 'Afastado'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : 'bg-gray-100 text-gray-100 border-gray-300'
                          }`}>{agente.situacao || '-'}</span>
                        </div>
                        {/* Linha 3: Nome + Data Nascimento */}
                        <div className="font-medium text-sm text-gray-900 leading-tight mt-0.5">
                          {agente.nomeAgente}{agente.dataNascimento ? <span className="font-normal text-gray-400 text-xs ml-1">· {formatDateString(typeof agente.dataNascimento === 'string' ? agente.dataNascimento : '')}</span> : ''}
                        </div>
                        {/* Linha 4: Empresa + Email + CEP */}
                        <div className="text-xs text-gray-400 mt-0.5">{agente.empresa || '-'}{agente.email ? <span className="text-blue-500 ml-1">{agente.email}</span> : ''}{(agente as any).cep ? <span className="text-gray-400 ml-1">· CEP {(agente as any).cep}</span> : ''}</div>
                        {/* Linha 5: Endereço + Cidade/UF */}
                        <div className="text-xs text-gray-400">{(agente as any).endereco ? `${(agente as any).endereco}${(agente as any).numero ? `, ${(agente as any).numero}` : ''}${(agente as any).bairro ? ` - ${(agente as any).bairro}` : ''} · ` : ''}{agente.cidade ? `${agente.cidade}${agente.uf ? `/${agente.uf}` : ''}` : (agente.uf || '')}</div>
                      </TableCell>
                      {/* Função / Certificações unificadas */}
                      <TableCell className="min-w-[200px]">
                        {/* Admissão */}
                        {agente.dataAdmissao && (
                          <div className="text-xs text-gray-400 mb-0.5">Adm: {formatDateString(typeof agente.dataAdmissao === 'string' ? agente.dataAdmissao : '')}</div>
                        )}
                        {/* Cargo · Área · Vínculo */}
                        <div className="font-medium text-sm text-gray-900">
                          {agente.cargo || '-'}{agente.area ? ` · ${agente.area}` : ''}{agente.vinculo ? ` · ${agente.vinculo}` : ''}
                        </div>
                        {/* Certificações */}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(() => {
                            const key = agente.chaveJ?.trim().toUpperCase();
                            const c = key && statusCerts ? statusCerts[key]?.consig : undefined;
                            if (!c || c.status === 'SEM_CERTIFICACAO') return <span className="text-xs text-slate-400">CONSIG: -</span>;
                            if (c.status === 'VENCIDO') return <Badge className="animate-pulse bg-red-600 text-white border-0 text-xs">CONSIG: {(c.dias ?? 0) === 0 ? 'Vencido' : `Venc. há ${Math.abs(c.dias ?? 0)}d`}</Badge>;
                            if (c.status === 'CRITICO') return <Badge className="animate-pulse bg-yellow-400 text-yellow-900 border-0 text-xs">CONSIG: {c.dias}d</Badge>;
                            return <Badge className="bg-green-100 text-green-800 border-0 text-xs">CONSIG: {c.dias}d</Badge>;
                          })()}
                          {(() => {
                            const key = agente.chaveJ?.trim().toUpperCase();
                            const c = key && statusCerts ? statusCerts[key]?.lgpd : undefined;
                            if (!c || c.status === 'SEM_CERTIFICACAO') return <span className="text-xs text-slate-400">PLDFT: -</span>;
                            if (c.status === 'VENCIDO') return <Badge className="animate-pulse bg-red-600 text-white border-0 text-xs">PLDFT: {(c.dias ?? 0) === 0 ? 'Vencido' : `Venc. há ${Math.abs(c.dias ?? 0)}d`}</Badge>;
                            if (c.status === 'CRITICO') return <Badge className="animate-pulse bg-yellow-400 text-yellow-900 border-0 text-xs">PLDFT: {c.dias}d</Badge>;
                            return <Badge className="bg-green-100 text-green-800 border-0 text-xs">PLDFT: {c.dias}d</Badge>;
                          })()}
                        </div>
                      </TableCell>

                      <TableCell>{agente.supervisor}</TableCell>
                      <TableCell className="min-w-[150px]">
                        {agente.cpfAgente
                          ? <div className="text-sm font-mono text-white">{agente.cpfAgente}</div>
                          : <span className="text-xs text-slate-400">-</span>}
                        {agente.celular && (
                          <div className="text-xs text-gray-400 mt-0.5">{agente.celular}</div>
                        )}
                      </TableCell>
                      {/* Dados bancários compactos */}
                      <TableCell className="min-w-[180px]">
                        {(agente.banco || agente.agencia || agente.conta) ? (
                          <div className="font-medium text-sm text-gray-900">
                            {agente.banco}{agente.agencia ? ` · Ag ${agente.agencia}` : ''}{agente.conta ? ` · ${agente.tipo === 'Conta Poupança' ? 'Cp' : 'Cc'} ${agente.conta}` : ''}
                          </div>
                        ) : <span className="text-xs text-slate-400">-</span>}
                        {/* Favorecido */}
                        {((agente as any).favProprio || agente.favorecido) && (
                          <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                            <span className="font-medium">Fav:</span>
                            {(agente as any).favProprio
                              ? <span className="text-emerald-700 font-medium">{agente.nomeAgente} <span className="text-[9px] bg-emerald-100 text-emerald-700 rounded px-1 font-semibold">próprio</span></span>
                              : <span className="text-orange-600 font-semibold">{agente.favorecido} <span className="text-[9px] bg-orange-100 text-orange-700 rounded px-1">favorecido</span></span>
                            }
                          </div>
                        )}
                        {agente.pix && (
                          <div className="text-xs text-blue-600 mt-0.5">PIX: {agente.pix}</div>
                        )}
                      </TableCell>
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
                          title="Gerar Contrato PDF"
                          onClick={() => navigate(`/agentes/${agente.id}/contrato`)}
                        >
                          <FileText className="w-4 h-4 text-orange-600" />
                        </Button>
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
          <div className="text-sm text-gray-100">
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
