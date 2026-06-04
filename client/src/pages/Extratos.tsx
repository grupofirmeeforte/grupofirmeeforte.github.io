import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, FileText, CreditCard, Users, Star, Shield, Smile, User, Key, Calendar, TrendingUp, Construction, CheckCircle2, Clock, AlertTriangle, Search, Filter } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import PageHeader from "@/components/PageHeader";

// ─── TIPOS DE SUBABAS ────────────────────────────────────────────────────────
type Aba = 'consignado' | 'cc' | 'consorcio' | 'ourocap' | 'seguros' | 'bbdental' | 'perspectiva' | 'minha-tabela';

const ABAS: { id: Aba; label: string; icon: React.ElementType; cor: string }[] = [
  { id: 'consignado',   label: 'Extrato Consignado',    icon: FileText,    cor: 'bg-blue-600'    },
  { id: 'cc',           label: 'Extrato C/C',            icon: CreditCard,  cor: 'bg-green-600'   },
  { id: 'consorcio',    label: 'Extrato Consórcio',      icon: Users,       cor: 'bg-purple-600'  },
  { id: 'ourocap',      label: 'Extrato Ourocap',         icon: Star,        cor: 'bg-yellow-600'  },
  { id: 'seguros',      label: 'Extrato Seguros',         icon: Shield,      cor: 'bg-red-600'     },
  { id: 'bbdental',     label: 'Extrato BB Dental',       icon: Smile,       cor: 'bg-teal-600'    },
  { id: 'perspectiva',  label: 'Perspectiva de Ganho',   icon: TrendingUp,  cor: 'bg-indigo-600'  },
  { id: 'minha-tabela', label: 'Minha Tabela',            icon: FileText,    cor: 'bg-orange-600'  },
];

// ─── PAINEL DE IDENTIFICAÇÃO (topo de todas as abas) ─────────────────────────
function PainelIdentificacao({ chaveJ, nomeAgente, mesRef }: {
  chaveJ: string;
  nomeAgente: string;
  mesRef: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">ChaveJ</p>
            <p className="text-lg font-bold text-blue-900">{chaveJ || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-100 bg-green-50">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-green-500 font-medium uppercase tracking-wide">Nome</p>
            <p className="text-lg font-bold text-green-900 truncate max-w-[180px]">{nomeAgente || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-100 bg-orange-50">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">Mês de Referência</p>
            <p className="text-lg font-bold text-orange-900">{mesRef || '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── PAINEL DE FILTROS PARA ADMIN/SUPORTE ────────────────────────────────────
function PainelFiltros({ filtroChaveJ, setFiltroChaveJ, filtroNome, setFiltroNome, filtroMes, setFiltroMes, onBuscar }: {
  filtroChaveJ: string; setFiltroChaveJ: (v: string) => void;
  filtroNome: string; setFiltroNome: (v: string) => void;
  filtroMes: string; setFiltroMes: (v: string) => void;
  onBuscar: () => void;
}) {
  const [showSugestoes, setShowSugestoes] = React.useState(false);
  const { data: sugestoes } = trpc.agentes.autocomplete.useQuery(
    { query: filtroNome },
    { enabled: filtroNome.length >= 2 }
  );
  const handleSelecionarAgente = (nome: string, chaveJ: string) => {
    setFiltroNome(nome);
    setFiltroChaveJ(chaveJ ?? '');
    setShowSugestoes(false);
  };
  return (
    <div className="mb-5 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-semibold text-indigo-700">Filtrar por agente</span>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-indigo-600 font-medium">ChaveJ</label>
          <Input value={filtroChaveJ} onChange={e => setFiltroChaveJ(e.target.value)} placeholder="Ex: J1234567" className="w-36 h-8 text-sm" />
        </div>
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs text-indigo-600 font-medium">Nome do Agente</label>
          <Input
            value={filtroNome}
            onChange={e => { setFiltroNome(e.target.value); setShowSugestoes(true); }}
            onFocus={() => setShowSugestoes(true)}
            onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
            placeholder="Digite o nome..."
            className="w-56 h-8 text-sm"
            autoComplete="off"
          />
          {showSugestoes && sugestoes && sugestoes.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-72 bg-white border border-indigo-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {sugestoes.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelecionarAgente(s.nomeAgente ?? '', s.chaveJ ?? '')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm border-b last:border-b-0"
                >
                  <span className="font-medium text-gray-800">{s.nomeAgente}</span>
                  <span className="ml-2 text-xs text-indigo-500 font-mono">{s.chaveJ}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-indigo-600 font-medium">Mês (MM/AAAA)</label>
          <Input value={filtroMes} onChange={e => setFiltroMes(e.target.value)} placeholder="Ex: 04/2026" className="w-32 h-8 text-sm" />
        </div>
        <Button size="sm" onClick={onBuscar} className="h-8 gap-1 bg-indigo-600 hover:bg-indigo-700">
          <Search className="w-3 h-3" /> Buscar
        </Button>
      </div>
    </div>
  );
}

// ─── EXTRATO CONSIGNADO ───────────────────────────────────────────────────────
function ExtratoConsignado() {
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [queryInput, setQueryInput] = useState<{ chaveJ?: string; nomeAgente?: string; mesAno?: string }>({});

  const { data, isLoading } = trpc.extratoConsignado.listar.useQuery(queryInput);
  const isAdminOuSuporte = (data as any)?.isAdminOuSuporte ?? false;

  const chaveJ = data?.chaveJ ?? '';
  const mesRef = data?.mesRef ?? '';

  // Busca nome do agente pelo chaveJ
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery(
    { chaveJ },
    { enabled: !!chaveJ }
  );
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';

  const rows = data?.rows ?? [];

  const totalLiquido = useMemo(
    () => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.valorLiquido ?? 0)), 0),
    [rows]
  );
  const totalComissao = useMemo(
    () => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0),
    [rows]
  );

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v: string | number | null) =>
    v != null ? `${parseFloat(String(v)).toFixed(2)}%` : '—';

  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
      {isAdminOuSuporte && (
        <PainelFiltros
          filtroChaveJ={filtroChaveJ} setFiltroChaveJ={setFiltroChaveJ}
          filtroNome={filtroNome} setFiltroNome={setFiltroNome}
          filtroMes={filtroMes} setFiltroMes={setFiltroMes}
          onBuscar={() => setQueryInput({ chaveJ: filtroChaveJ || undefined, nomeAgente: filtroNome || undefined, mesAno: filtroMes || undefined })}
        />
      )}

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 font-medium">Nenhuma operação encontrada para {mesRef}</p>
            <p className="text-gray-400 text-sm">Verifique se há produção importada para o mês de referência.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-700">Nº Operação</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Parcelas</TableHead>
                    <TableHead className="font-semibold text-gray-700">Convênio</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Juros</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Valor Líquido</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Percentual</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as any[]).map((row: any, rowIdx: number) => (
                    <TableRow key={row.id} className={rowIdx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-blue-50/30 hover:bg-blue-100/40"}>
                      <TableCell className="font-medium text-gray-900">{row.nomeAgente || '—'}</TableCell>
                      <TableCell className="text-gray-700 font-mono text-sm">{row.nrOperacao || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {row.parcelas ?? '—'}x
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 text-sm">{row.convenio || '—'}</TableCell>
                      <TableCell className="text-right text-gray-700">{fmtPct(row.juros)}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">{fmt(parseFloat(String(row.valorLiquido ?? 0)))}</TableCell>
                      <TableCell className="text-right text-gray-700">{fmtPct(row.percentual)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-700">{fmt(parseFloat(String(row.comissao ?? 0)))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Rodapé com totais */}
            <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">{rows.length} operação(ões)</span>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Valor Líquido</p>
                  <p className="font-bold text-blue-700">{fmt(totalLiquido)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Comissão</p>
                  <p className="font-bold text-green-700">{fmt(totalComissao)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── PERSPECTIVA DE GANHO ────────────────────────────────────────────────────
function PerspectivadeGanho() {
  const { data: meData } = trpc.auth.me.useQuery();
  const chaveJReal = (meData as any)?.chaveJ ?? '';
  const nomeAgente = (meData as any)?.nomeAgente ?? '';
  const cargo = (meData as any)?.cargo ?? '';
  const permissoes = (meData as any)?.permissoes ?? '';
  const isCeoOuAdmin = cargo === 'CEO' || permissoes === 'admin';

  // Campo ChaveJ para CEO/Admin pesquisar qualquer agente
  const [chaveJBusca, setChaveJBusca] = useState('');
  const [chaveJQuery, setChaveJQuery] = useState('');

  // ChaveJ efetiva para a query (sem mes/ano — o backend calcula o período vigente automaticamente)
  const chaveJEfetiva = isCeoOuAdmin && chaveJQuery ? chaveJQuery.toUpperCase().trim() : (chaveJReal || undefined);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.febraban.perspectiva.useQuery(
    { chaveJ: chaveJEfetiva },
    { enabled: isCeoOuAdmin ? true : !!chaveJReal }
  );

  // Mutation para salvar situação manual no contrato
  const atualizarMutation = trpc.contratos.atualizar.useMutation({
    onSuccess: () => utils.febraban.perspectiva.invalidate(),
  });

  // Mutation para salvar telefone
  const salvarTelefoneMutation = trpc.contratos.salvarTelefone.useMutation({
    onSuccess: () => { setEditandoTelefoneId(null); utils.febraban.perspectiva.invalidate(); },
    onError: (err) => alert(err.message),
  });

  // Estado de edição inline de situação
  const [editandoSituacaoId, setEditandoSituacaoId] = useState<number | null>(null);
  const [situacaoEditando, setSituacaoEditando] = useState('');

  // Estado de edição inline de telefone
  const [editandoTelefoneId, setEditandoTelefoneId] = useState<number | null>(null);
  const [telefoneEditando, setTelefoneEditando] = useState('');

  const salvarSituacao = async (id: number) => {
    await atualizarMutation.mutateAsync({ id, situacao: situacaoEditando });
    setEditandoSituacaoId(null);
  };

  const salvarTelefone = async (id: number) => {
    if (!telefoneEditando.trim()) return;
    await salvarTelefoneMutation.mutateAsync({ contratoId: id, telefone: telefoneEditando.trim() });
  };

  const rows = data?.rows ?? [];
  const ativoCol = data?.ativoCol ?? null;
  const periodoInicio = (data as any)?.periodoInicio ?? '';
  const periodoFim = (data as any)?.periodoFim ?? '';
  const chaveJExibida = isCeoOuAdmin && chaveJQuery ? chaveJQuery.toUpperCase().trim() : chaveJReal;
  const mesRef = (data as any)?.mesRef;
  const anoRef = (data as any)?.anoRef;
  const mesAtualStr = mesRef && anoRef ? `${String(mesRef).padStart(2,'0')}/${anoRef}` : '';

  // Totais
  const totalValorSolicitado = useMemo(
    () => (rows as any[]).reduce((acc, r: any) => acc + (r.valorSolicitado ?? 0), 0),
    [rows]
  );
  const totalPerspectiva = useMemo(
    () => (rows as any[]).reduce((acc, r: any) => acc + (r.perspectivaComissao ?? 0), 0),
    [rows]
  );
  const totalContratadas = useMemo(
    () => (rows as any[]).filter((r: any) => (r.situacao ?? '').toLowerCase() === 'contratada').length,
    [rows]
  );

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v: number) => `${v.toFixed(3).replace('.', ',')}%`;

  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJExibida} nomeAgente={nomeAgente} mesRef={mesAtualStr} />

      {/* Período vigente */}
      {periodoInicio && periodoFim && (
        <div className="mb-3 flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs text-indigo-700 font-medium">
            Período vigente: <strong>{periodoInicio}</strong> a <strong>{periodoFim}</strong>
          </span>
          <span className="text-xs text-indigo-400 ml-1">(do último dia útil do mês anterior ao penúltimo dia útil do mês atual)</span>
        </div>
      )}

      {/* Campo de busca por ChaveJ — apenas CEO/Admin */}
      {isCeoOuAdmin && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Search className="w-4 h-4 text-blue-500 shrink-0" />
          <Input
            placeholder="Digite a ChaveJ do agente (ex: J1234567)"
            value={chaveJBusca}
            onChange={e => setChaveJBusca(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') setChaveJQuery(chaveJBusca); }}
            className="max-w-xs h-8 text-sm bg-white"
          />
          <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => setChaveJQuery(chaveJBusca)}>Buscar</Button>
          {chaveJQuery && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setChaveJBusca(''); setChaveJQuery(''); }}>Limpar</Button>
          )}
          <span className="text-xs text-blue-500 ml-1">CEO/Admin: consulte qualquer agente</span>
        </div>
      )}

      {/* Nota de edição */}
      <div className="mb-3 text-xs text-gray-500 flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
        Clique no badge de situação de qualquer contrato para alterar manualmente.
      </div>

      {/* ─── TABELA DETALHADA ──────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Proposta</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Cliente / CPF</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Situação</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Produto</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide text-right">Taxa</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide text-right">Prazo</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide text-right">Valor</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide text-center">Fontes</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Telefone</TableHead>
                  <TableHead className="font-semibold text-amber-600 uppercase text-xs tracking-wide text-right bg-amber-50">% / Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-gray-400">Carregando...</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-gray-400">
                      {periodoInicio && periodoFim
                        ? `Nenhum contrato PDF no período vigente (${periodoInicio} a ${periodoFim})`
                        : 'Nenhum contrato PDF encontrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  (rows as any[]).map((row: any, rowIdx: number) => (
                    <TableRow key={row.id} className={rowIdx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-blue-50/30 hover:bg-blue-100/40'}>
                      <TableCell className="font-mono text-sm font-medium text-gray-800">{row.proposta || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-gray-800">{row.nomeCliente || '—'}</div>
                        {row.cpfCliente && <div className="text-xs text-gray-500 font-mono">{row.cpfCliente}</div>}
                      </TableCell>
                      <TableCell>
                        {/* Edição inline de situação */}
                        {editandoSituacaoId === row.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              autoFocus
                              value={situacaoEditando}
                              onChange={e => setSituacaoEditando(e.target.value)}
                              className="text-xs border border-blue-400 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">-- Selecione --</option>
                              <option value="Contratada">Contratada</option>
                              <option value="Cancelada">Cancelada</option>
                              <option value="Pendente">Pendente</option>
                            </select>
                            <button
                              onClick={() => salvarSituacao(row.id)}
                              disabled={atualizarMutation.isPending}
                              className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded hover:bg-green-700 disabled:opacity-50"
                            >OK</button>
                            <button
                              onClick={() => setEditandoSituacaoId(null)}
                              className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded hover:bg-gray-500"
                            >X</button>
                          </div>
                        ) : (
                          <button
                            title="Clique para editar a situação"
                            onClick={() => {
                              setEditandoSituacaoId(row.id);
                              setSituacaoEditando(row.situacao || '');
                            }}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity border border-transparent hover:border-current ${
                              (row.situacao ?? '').toLowerCase() === 'contratada' ? 'bg-green-100 text-green-700' :
                              (row.situacao ?? '').toLowerCase() === 'cancelada'  ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {row.situacao || 'Pendente'}
                            <span className="ml-1 text-[9px] opacity-60">✎</span>
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-[130px] truncate" title={row.produtoConsig ?? row.linha ?? ''}>
                        <span className="text-blue-600 font-medium">{row.produtoConsig || row.linha || '—'}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700">
                        {row.taxaJuros > 0 ? fmtPct(row.taxaJuros) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700">
                        {row.prazoMeses > 0 ? `${row.prazoMeses}x` : (row.prazo || '—')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">
                        {row.valorSolicitado > 0 ? fmt(row.valorSolicitado) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700" title="Contrato PDF enviado">PDF</span>
                          {row.temFebraban && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700" title="Encontrado na Febraban">FEB</span>
                          )}
                        </div>
                      </TableCell>
                      {/* Célula de Telefone editável inline */}
                      <TableCell>
                        {editandoTelefoneId === row.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="tel"
                              value={telefoneEditando}
                              onChange={e => setTelefoneEditando(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') salvarTelefone(row.id); if (e.key === 'Escape') setEditandoTelefoneId(null); }}
                              placeholder="(99) 99999-9999"
                              className="text-xs border border-blue-400 rounded px-1.5 py-0.5 w-32 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => salvarTelefone(row.id)}
                              disabled={salvarTelefoneMutation.isPending}
                              className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded hover:bg-green-700 disabled:opacity-50"
                            >OK</button>
                            <button
                              onClick={() => setEditandoTelefoneId(null)}
                              className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded hover:bg-gray-500"
                            >X</button>
                          </div>
                        ) : (
                          <button
                            title="Clique para adicionar telefone"
                            onClick={() => { setEditandoTelefoneId(row.id); setTelefoneEditando(''); }}
                            className="text-xs text-left hover:opacity-80 transition-opacity"
                          >
                            {row.telefoneManuais ? (
                              <span className="text-green-700 font-medium">{row.telefoneManuais.split(',')[0]}</span>
                            ) : (
                              <span className="text-gray-400 italic">+ telefone</span>
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-700 bg-amber-50">
                        {row.perspectivaComissao != null ? (
                          <div>
                            <div>{fmt(row.perspectivaComissao)}</div>
                            {row.percentualUsado != null && (
                              <div className="text-xs text-gray-400 font-normal">{fmtPct(row.percentualUsado)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            {(row.situacao ?? '').toLowerCase() === 'contratada'
                              ? (row.telefoneManuais ? 'sem tabela' : 'aguard. telefone')
                              : '—'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Rodapé com totais */}
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{rows.length} contrato(s)</span>
              {periodoInicio && <span className="text-xs text-indigo-600">{periodoInicio} → {periodoFim}</span>}
              <span className="text-xs text-green-600 font-medium">{totalContratadas} contratada(s)</span>
              {ativoCol && <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">{ativoCol.replace('ativo', 'Ativo ')}</span>}
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Valor Solicitado</p>
                <p className="font-bold text-blue-700">{fmt(totalValorSolicitado)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Comissão Perspectiva</p>
                <p className="font-bold text-amber-700">{fmt(totalPerspectiva)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// ─── EXTRATO C/C ────────────────────────────────────────────────────────────
function ExtratoCC() {
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [queryInput, setQueryInput] = useState<{ chaveJ?: string; nomeAgente?: string; mesAno?: string }>({});
  const { data, isLoading } = trpc.extratoCC.listar.useQuery(queryInput);
  const isAdminOuSuporte = (data as any)?.isAdminOuSuporte ?? false;
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
      {isAdminOuSuporte && (
        <PainelFiltros
          filtroChaveJ={filtroChaveJ} setFiltroChaveJ={setFiltroChaveJ}
          filtroNome={filtroNome} setFiltroNome={setFiltroNome}
          filtroMes={filtroMes} setFiltroMes={setFiltroMes}
          onBuscar={() => setQueryInput({ chaveJ: filtroChaveJ || undefined, nomeAgente: filtroNome || undefined, mesAno: filtroMes || undefined })}
        />
      )}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <CreditCard className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhuma operação encontrada para {mesRef}</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Agência</TableHead>
                  <TableHead className="font-semibold text-gray-700">Chave J</TableHead>
                  <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="text-gray-700">{row.agencia || '—'}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-700">{row.chaveJ || '—'}</TableCell>
                    <TableCell className="font-medium text-gray-900">{row.nome || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">{fmt(parseFloat(String(row.comissao ?? 0)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{rows.length} registro(s)</span>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Comissão</p>
              <p className="font-bold text-green-700">{fmt(totalComissao)}</p>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─── EXTRATO CONSÓRCIO ───────────────────────────────────────────────────────
function ExtratoConsorcio() {
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [queryInput, setQueryInput] = useState<{ chaveJ?: string; nomeAgente?: string; mesAno?: string }>({});
  const { data, isLoading } = trpc.extratoConsorcio.listar.useQuery(queryInput);
  const isAdminOuSuporte = (data as any)?.isAdminOuSuporte ?? false;
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNum = (v: any) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
      {isAdminOuSuporte && (
        <PainelFiltros
          filtroChaveJ={filtroChaveJ} setFiltroChaveJ={setFiltroChaveJ}
          filtroNome={filtroNome} setFiltroNome={setFiltroNome}
          filtroMes={filtroMes} setFiltroMes={setFiltroMes}
          onBuscar={() => setQueryInput({ chaveJ: filtroChaveJ || undefined, nomeAgente: filtroNome || undefined, mesAno: filtroMes || undefined })}
        />
      )}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Users className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhuma operação encontrada para {mesRef}</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {isAdminOuSuporte && <TableHead className="font-semibold text-gray-700">Agente</TableHead>}
                  <TableHead className="font-semibold text-gray-700">Proposta</TableHead>
                  <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">Parc. Liberada</TableHead>
                  <TableHead className="font-semibold text-gray-700">Segmento</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Valor Bem</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {isAdminOuSuporte && <TableCell className="text-sm font-medium text-gray-800">{row.nomeAgente || '—'}</TableCell>}
                    <TableCell className="font-mono text-sm text-gray-700">{row.proposta || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{row.empresa || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{row.parcLiberada ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-700 text-sm">{row.segmento || '—'}</TableCell>
                    <TableCell className="text-right text-blue-700 font-semibold">{fmtNum(row.valorBem)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">{fmt(parseFloat(String(row.comissao ?? 0)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{rows.length} operação(ões)</span>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Comissão</p>
              <p className="font-bold text-green-700">{fmt(totalComissao)}</p>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─── EXTRATO OUROCAP ─────────────────────────────────────────────────────────
function ExtratoOurocap() {
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [queryInput, setQueryInput] = useState<{ chaveJ?: string; nomeAgente?: string; mesAno?: string }>({});
  const { data, isLoading } = trpc.extratoOurocap.listar.useQuery(queryInput);
  const isAdminOuSuporte = (data as any)?.isAdminOuSuporte ?? false;
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalLiquido = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.valorLiquido ?? 0)), 0), [rows]);
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
      {isAdminOuSuporte && (
        <PainelFiltros
          filtroChaveJ={filtroChaveJ} setFiltroChaveJ={setFiltroChaveJ}
          filtroNome={filtroNome} setFiltroNome={setFiltroNome}
          filtroMes={filtroMes} setFiltroMes={setFiltroMes}
          onBuscar={() => setQueryInput({ chaveJ: filtroChaveJ || undefined, nomeAgente: filtroNome || undefined, mesAno: filtroMes || undefined })}
        />
      )}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Star className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhuma operação encontrada para {mesRef}</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Nº Operação</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Valor Líquido</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-700">{row.nrOperacao || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-700">{fmt(parseFloat(String(row.valorLiquido ?? 0)))}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">{fmt(parseFloat(String(row.comissao ?? 0)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{rows.length} operação(ões)</span>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Valor Líquido</p>
                <p className="font-bold text-blue-700">{fmt(totalLiquido)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Comissão</p>
                <p className="font-bold text-green-700">{fmt(totalComissao)}</p>
              </div>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─── EXTRATO SEGUROS ─────────────────────────────────────────────────────────
function ExtratoSeguros() {
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [queryInput, setQueryInput] = useState<{ chaveJ?: string; nomeAgente?: string; mesAno?: string }>({});
  const { data, isLoading } = trpc.extratoSeguros.listar.useQuery(queryInput);
  const isAdminOuSuporte = (data as any)?.isAdminOuSuporte ?? false;
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissaoAgente ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
      {isAdminOuSuporte && (
        <PainelFiltros
          filtroChaveJ={filtroChaveJ} setFiltroChaveJ={setFiltroChaveJ}
          filtroNome={filtroNome} setFiltroNome={setFiltroNome}
          filtroMes={filtroMes} setFiltroMes={setFiltroMes}
          onBuscar={() => setQueryInput({ chaveJ: filtroChaveJ || undefined, nomeAgente: filtroNome || undefined, mesAno: filtroMes || undefined })}
        />
      )}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Shield className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhuma operação encontrada para {mesRef}</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                  <TableHead className="font-semibold text-gray-700">Contrato</TableHead>
                  <TableHead className="font-semibold text-gray-700">Banco</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Valor Empréstimo</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{row.nomeAgente || '—'}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-700">{row.nrContrato || '—'}</TableCell>
                    <TableCell className="text-gray-700 text-sm">{row.banco || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-700">{fmt(parseFloat(String(row.vrEmprestimo ?? 0)))}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">{fmt(parseFloat(String(row.comissaoAgente ?? 0)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{rows.length} registro(s)</span>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Comissão</p>
              <p className="font-bold text-green-700">{fmt(totalComissao)}</p>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─── EXTRATO BB DENTAL ───────────────────────────────────────────────────────
function ExtratoBBDental() {
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [queryInput, setQueryInput] = useState<{ chaveJ?: string; nomeAgente?: string; mesAno?: string }>({});
  const { data, isLoading } = trpc.extratoBBDental.listar.useQuery(queryInput);
  const isAdminOuSuporte = (data as any)?.isAdminOuSuporte ?? false;
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
      {isAdminOuSuporte && (
        <PainelFiltros
          filtroChaveJ={filtroChaveJ} setFiltroChaveJ={setFiltroChaveJ}
          filtroNome={filtroNome} setFiltroNome={setFiltroNome}
          filtroMes={filtroMes} setFiltroMes={setFiltroMes}
          onBuscar={() => setQueryInput({ chaveJ: filtroChaveJ || undefined, nomeAgente: filtroNome || undefined, mesAno: filtroMes || undefined })}
        />
      )}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <Smile className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhuma operação encontrada para {mesRef}</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                  <TableHead className="font-semibold text-gray-700">Proposta</TableHead>
                  <TableHead className="font-semibold text-gray-700">Produto</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Valor Produto</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{row.nomeAgente || '—'}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-700">{row.proposta || '—'}</TableCell>
                    <TableCell className="text-gray-700 text-sm">{row.produto || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-700">{fmt(parseFloat(String(row.vrProduto ?? 0)))}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">{fmt(parseFloat(String(row.comissao ?? 0)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{rows.length} registro(s)</span>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Comissão</p>
              <p className="font-bold text-green-700">{fmt(totalComissao)}</p>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─── PLACEHOLDER PARA ABAS EM DESENVOLVIMENTO ────────────────────────────────
function ConteudoAbaPlaceholder({ aba }: { aba: Aba }) {
  const info = ABAS.find(a => a.id === aba)!;
  const Icon = info.icon;

  // Mês de referência: mês anterior
  const agora = new Date();
  const mesAnterior = agora.getMonth() === 0 ? 12 : agora.getMonth();
  const anoRef = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
  const mesRef = `${String(mesAnterior).padStart(2, '0')}/${anoRef}`;

  const { data: meData } = trpc.auth.me.useQuery();
  const chaveJ = (meData as any)?.chaveJ ?? '';
  const nomeAgente = (meData as any)?.nomeAgente ?? '';

  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className={`w-16 h-16 rounded-2xl ${info.cor} flex items-center justify-center`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700">{info.label}</h2>
          <p className="text-gray-400 text-sm">Módulo em desenvolvimento. Em breve disponível.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MINHA TABELA ───────────────────────────────────────────────────────────
function MinhaTabela() {
  const { data: meData } = trpc.auth.me.useQuery();
  const chaveJ = (meData as any)?.chaveJ ?? '';
  const nomeAgente = (meData as any)?.nomeAgente ?? '';
  const agora = new Date();
  const mesAtualStr = `${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`;
  const { data, isLoading } = trpc.minhaTabela.obter.useQuery();

  const tabela = (data?.tabela ?? []) as any[];
  const metas = (data?.metas ?? {}) as Record<string, number>;
  const metasDe = (data?.metasDe ?? {}) as Record<string, number>;
  const metasAte = (data?.metasAte ?? {}) as Record<string, number>;

  // Mês vigente
  const nivelVigente = data?.nivelAtivo ?? null;
  const totalVigente = data?.totalLiquidoSemSRCC ?? 0;
  const mesVigenteRef = data?.mesRef ?? mesAtualStr;
  const proximoNivelVigente = data?.proximoNivel ?? null;
  const faltaProximoVigente = data?.faltaProximo ?? 0;

  // Mês anterior
  const nivelAnterior = data?.nivelAnterior ?? null;
  const totalAnterior = data?.totalAnterior ?? 0;
  const mesAntRef = data?.mesAntRef ?? '';

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v: string | null | undefined) => {
    if (!v) return '—';
    const normalized = String(v).replace(',', '.');
    const n = parseFloat(normalized);
    if (isNaN(n)) return String(v);
    const pctVal = n > 1 ? n : n * 100;
    return pctVal.toFixed(2).replace('.', ',') + '%';
  };
  const ativoKeys = ['ativo01','ativo02','ativo03','ativo04','ativo05','ativo06','ativo07','ativo08','ativo09','ativo10'];
  const labelAtivo = (k: string) => `Ativo ${parseInt(k.replace('ativo', ''), 10).toString().padStart(2, '0')}`;
  const niveisConfigurados = ativoKeys.filter(k => (metasDe[k] ?? 0) > 0 || (metasAte[k] ?? 0) > 0 || (metas[k] ?? 0) > 0).slice(0, 4);

  // Coluna da tabela de comissão a destacar
  const colunasComValor = ativoKeys.filter(k => tabela.some(r => r[k] != null && r[k] !== ''));
  const colunaAnterior = nivelAnterior && colunasComValor.includes(nivelAnterior) ? nivelAnterior : null;
  const colunaVigente = nivelVigente && colunasComValor.includes(nivelVigente) ? nivelVigente : null;

  // Índices para a régua
  const idxVigente = nivelVigente ? niveisConfigurados.indexOf(nivelVigente) : -1;
  const idxAnterior = nivelAnterior ? niveisConfigurados.indexOf(nivelAnterior) : -1;

  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesAtualStr} />

      {/* Dois blocos lado a lado: Mês Anterior e Mês Vigente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* Bloco 1: Tabela conquistada no mês anterior */}
        <div className="px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
          <p className="text-xs text-amber-700 font-bold uppercase tracking-wide mb-1">
            Tabela conquistada no mês anterior ({mesAntRef})
          </p>
          <p className="text-[11px] text-amber-600 mb-2">Este é o nível que vale para sua comissão no mês atual</p>
          {isLoading ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : nivelAnterior ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-amber-700">{labelAtivo(nivelAnterior)}</span>
              <span className="text-sm text-amber-600">{fmt(totalAnterior)} produzidos</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhuma faixa atingida no mês anterior.</p>
          )}
        </div>

        {/* Bloco 2: Tabela sendo construída no mês vigente */}
        <div className="px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <p className="text-xs text-blue-700 font-bold uppercase tracking-wide mb-1">
            Tabela sendo construída em {mesVigenteRef}
          </p>
          <p className="text-[11px] text-blue-600 mb-2">Produza mais para conquistar um nível maior no próximo mês</p>
          {isLoading ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {nivelVigente ? (
                <span className="text-2xl font-extrabold text-blue-700">{labelAtivo(nivelVigente)}</span>
              ) : (
                <span className="text-sm text-gray-400">Nenhuma faixa atingida ainda</span>
              )}
              <span className="text-sm text-blue-600">{fmt(totalVigente)} produzidos</span>
              {proximoNivelVigente && faltaProximoVigente > 0 && (
                <span className="ml-auto text-right">
                  <span className="text-xs text-orange-500 font-semibold block">Falta para {labelAtivo(proximoNivelVigente)}</span>
                  <span className="text-base font-bold text-orange-600">{fmt(faltaProximoVigente)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Régua de Níveis */}
      {niveisConfigurados.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Faixas de Nível — Produza mais para ganhar mais!</p>
          <div className="grid gap-2" style={{gridTemplateColumns: `repeat(${niveisConfigurados.length}, 1fr)`}}>
            {niveisConfigurados.map((k, idx) => {
              const isAtualVig = k === nivelVigente;
              const isAtualAnt = k === nivelAnterior;
              const isAlcancadoVig = idxVigente >= 0 && idx <= idxVigente;
              const de = metasDe[k] ?? 0;
              const ate = metasAte[k] ?? 0;
              return (
                <div
                  key={k}
                  className={`rounded-lg border-2 px-3 py-2.5 text-center transition-all ${
                    isAtualAnt
                      ? 'border-amber-500 bg-amber-50 shadow-md'
                      : isAtualVig
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : isAlcancadoVig
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`text-xs font-bold uppercase mb-0.5 ${
                    isAtualAnt ? 'text-amber-700' : isAtualVig ? 'text-green-700' : isAlcancadoVig ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {isAtualAnt ? '★ ' : isAtualVig ? '✓ ' : ''}{labelAtivo(k)}
                  </div>
                  {isAtualAnt && <div className="text-[9px] text-amber-600 font-semibold mb-0.5">tabela atual</div>}
                  {isAtualVig && !isAtualAnt && <div className="text-[9px] text-green-600 font-semibold mb-0.5">mês vigente</div>}
                  <div className={`text-[11px] font-medium ${
                    isAtualAnt ? 'text-amber-800' : isAtualVig ? 'text-green-800' : isAlcancadoVig ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {de > 0 ? fmt(de) : '—'}
                    {ate > 0 ? <><br/><span className="text-[10px] text-gray-400">até</span><br/>{fmt(ate)}</> : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de comissões: coluna do nível anterior (que vale agora) e vigente */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>
          ) : tabela.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Nenhum registro encontrado para sua empresa.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-800">
                    <TableHead className="text-white font-semibold text-xs uppercase py-2 px-3 min-w-[140px]">Convênio</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase py-2 px-3 text-center min-w-[130px]">Tx Juros (De → Até)</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase py-2 px-3 text-center min-w-[110px]">Meses (De → Até)</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase py-2 px-3 text-center min-w-[90px]">Valor Mín.</TableHead>
                    {colunaAnterior && (
                      <TableHead className="text-amber-300 font-bold text-xs uppercase bg-amber-900 py-2 px-3 text-center min-w-[100px]">
                        {labelAtivo(colunaAnterior)}<br/><span className="text-[9px] font-normal text-amber-200">tabela atual</span>
                      </TableHead>
                    )}
                    {colunaVigente && colunaVigente !== colunaAnterior && (
                      <TableHead className="text-green-300 font-bold text-xs uppercase bg-green-900 py-2 px-3 text-center min-w-[100px]">
                        {labelAtivo(colunaVigente)}<br/><span className="text-[9px] font-normal text-green-200">mês vigente</span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabela.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-xs py-1 px-3 whitespace-nowrap">{row.convenio ?? '—'}</TableCell>
                      <TableCell className="text-xs py-1 px-3 text-center whitespace-nowrap">
                        <span className="text-gray-500">{row.txJurosDe ? fmtPct(row.txJurosDe) : '—'}</span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="font-semibold text-gray-800">{row.txJurosAte === 'acima' ? 'acima' : (row.txJurosAte ? fmtPct(row.txJurosAte) : '—')}</span>
                      </TableCell>
                      <TableCell className="text-xs py-1 px-3 text-center whitespace-nowrap">
                        <span className="text-gray-500">{row.mesesDe ?? '—'}</span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="font-semibold text-blue-700">{row.mesesAte ?? '—'}</span>
                      </TableCell>
                      <TableCell className="text-xs py-1 px-3 text-center whitespace-nowrap">{row.valorMinimo ?? '—'}</TableCell>
                      {colunaAnterior && (
                        <TableCell className="font-bold text-amber-700 bg-amber-50 text-xs py-1 px-3 text-center whitespace-nowrap">
                          {fmtPct(row[colunaAnterior])}
                        </TableCell>
                      )}
                      {colunaVigente && colunaVigente !== colunaAnterior && (
                        <TableCell className="font-bold text-green-700 bg-green-50 text-xs py-1 px-3 text-center whitespace-nowrap">
                          {fmtPct(row[colunaVigente])}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ExtratosPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const abaParam = params.get('aba') as Aba | null;
  const abaInicial: Aba = ABAS.find(a => a.id === abaParam) ? abaParam! : 'consignado';
  const [aba, setAba] = useState<Aba>(abaInicial);

  // Título dinâmico: principal sempre "Extratos", subtítulo mostra a subaba ativa
  const abaInfo = ABAS.find(a => a.id === aba);
  const subtituloPagina = abaInfo ? abaInfo.label : 'Extratos bancários e financeiros';

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />
      {/* Cabeçalho */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extratos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subtituloPagina}</p>
        </div>
        
      </div>

      {/* Navegação por abas */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          {ABAS.map(a => {
            const Icon = a.icon;
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  ativa
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da aba selecionada */}
      <div className="p-6">
        {aba === 'consignado'  && <ExtratoConsignado />}
        {aba === 'cc'          && <ExtratoCC />}
        {aba === 'consorcio'   && <ExtratoConsorcio />}
        {aba === 'ourocap'     && <ExtratoOurocap />}
        {aba === 'seguros'     && <ExtratoSeguros />}
        {aba === 'bbdental'    && <ExtratoBBDental />}
        {aba === 'perspectiva' && <PerspectivadeGanho />}
        {aba === 'minha-tabela' && <MinhaTabela />}
      </div>
    </div>
  );
}
