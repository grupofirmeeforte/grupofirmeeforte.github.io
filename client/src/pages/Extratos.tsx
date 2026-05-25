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
  // Mês atual
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();
  const mesAtualStr = `${String(mesAtual).padStart(2, '0')}/${anoAtual}`;

  const { data: meData } = trpc.auth.me.useQuery();
  const chaveJReal = (meData as any)?.chaveJ ?? '';
  const nomeAgente = (meData as any)?.nomeAgente ?? '';

  const { data, isLoading } = trpc.febraban.perspectiva.useQuery(
    { chaveJ: chaveJReal || undefined, mes: mesAtual, ano: anoAtual },
    { enabled: !!chaveJReal }
  );

  const rows = data?.rows ?? [];
  const percentualAgente = data?.percentualAgente ?? null;

  // Totais para o demonstrativo
  const totalLiquido = useMemo(
    () => rows.reduce((acc, r: any) => acc + parseFloat(String(r.troco ?? 0)), 0),
    [rows]
  );
  const totalBruto = useMemo(
    () => rows.reduce((acc, r: any) => acc + parseFloat(String(r.financiado ?? 0)), 0),
    [rows]
  );
  const totalPerspectiva = useMemo(
    () => rows.reduce((acc, r: any) => acc + (r.perspectivaComissao ?? 0), 0),
    [rows]
  );

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Mapeamento de código de linha para nome de produto
  const nomeProduto = (linha: number | null) => {
    if (!linha) return '—';
    return String(linha);
  };

  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJReal} nomeAgente={nomeAgente} mesRef={mesAtualStr} />

      {/* ─── BANNER EM CONSTRUÇÃO ─────────────────────────────────── */}
      <div className="mb-6 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 py-10">
        <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
          <Construction className="w-9 h-9 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-amber-700 tracking-wide">Em Construção</h3>
        <p className="text-sm text-amber-500">Este módulo estará disponível em breve.</p>
      </div>

      {/* ─── TABELA DETALHADA──────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Proposta</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Linha</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Situação</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Operador</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Solicitação</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Prazo</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide text-right">Troco</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide text-right">Financiado</TableHead>
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Tipo</TableHead>
                  <TableHead className="font-semibold text-amber-600 uppercase text-xs tracking-wide text-right bg-amber-50">Comissão</TableHead>
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
                      Nenhuma operação encontrada para {mesAtualStr}
                    </TableCell>
                  </TableRow>
                ) : (
                  (rows as any[]).map((row: any, rowIdx: number) => (
                    <TableRow key={row.id} className={rowIdx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-blue-50/30 hover:bg-blue-100/40"}>
                      <TableCell className="font-mono text-sm font-medium text-gray-800">{row.proposta}</TableCell>
                      <TableCell className="text-gray-700 text-sm">{row.linha ?? '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.situacao === 'Contratada' ? 'bg-green-100 text-green-700' :
                          row.situacao === 'Pendente'   ? 'bg-yellow-100 text-yellow-700' :
                          row.situacao === 'Cancelada'  ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{row.situacao || '—'}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-700">{row.operador || '—'}</TableCell>
                      <TableCell className="text-gray-700 text-sm">{row.solicitacao || '—'}</TableCell>
                      <TableCell className="text-gray-700 text-sm">{row.prazo || '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">
                        {fmt(parseFloat(String(row.troco ?? 0)))}
                      </TableCell>
                      <TableCell className="text-right text-green-700">
                        {fmt(parseFloat(String(row.financiado ?? 0)))}
                      </TableCell>
                      <TableCell className="text-gray-700 text-sm">{row.empresa || '—'}</TableCell>
                      <TableCell className="text-right font-bold text-amber-700 bg-amber-50">
                        {row.perspectivaComissao != null ? fmt(row.perspectivaComissao) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Rodapé com totais */}
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{rows.length} operação(ões) — {mesAtualStr}</span>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Troco</p>
                <p className="font-bold text-blue-700">{fmt(totalLiquido)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Financiado</p>
                <p className="font-bold text-green-700">{fmt(totalBruto)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Comissão</p>
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
  const nivelAtivo = data?.nivelAtivo ?? null;
  const tabela = (data?.tabela ?? []) as any[];
  const totalLiquido = data?.totalLiquidoSemSRCC ?? 0;
  const metas = (data?.metas ?? {}) as Record<string, number>;
  const metasDe = (data?.metasDe ?? {}) as Record<string, number>;
  const metasAte = (data?.metasAte ?? {}) as Record<string, number>;
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
  const colunasComValor = ativoKeys.filter(k => tabela.some(r => r[k] != null && r[k] !== ''));
  const colunaExibida = nivelAtivo && colunasComValor.includes(nivelAtivo) ? nivelAtivo : null;
  const labelAtivo = (k: string) => `Ativo ${parseInt(k.replace('ativo', ''), 10).toString().padStart(2, '0')}`;
  // Níveis que têm faixa configurada (De ou Ate preenchido)
  const niveisConfigurados = ativoKeys.filter(k => (metasDe[k] ?? 0) > 0 || (metasAte[k] ?? 0) > 0 || (metas[k] ?? 0) > 0).slice(0, 4);
  // Índice do nível atual
  const idxAtual = nivelAtivo ? niveisConfigurados.indexOf(nivelAtivo) : -1;
  // Próximo nível
  const proximoNivel = idxAtual >= 0 && idxAtual < niveisConfigurados.length - 1 ? niveisConfigurados[idxAtual + 1] : null;
  const metaProximo = proximoNivel ? (metasDe[proximoNivel] ?? metas[proximoNivel] ?? 0) : 0;
  const faltaProximo = metaProximo > 0 ? Math.max(0, metaProximo - totalLiquido) : 0;
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesAtualStr} />

      {/* Card de Produção + Nível Atingido */}
      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Produção Líquida ({mesAtualStr})</p>
          <p className="text-xl font-bold text-blue-800">{fmt(totalLiquido)}</p>
        </div>
        {nivelAtivo ? (
          <div>
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Nível atingido</p>
            <p className="text-xl font-bold text-green-700">{labelAtivo(nivelAtivo)}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma faixa de meta atingida ainda neste mês.</p>
        )}
        {proximoNivel && faltaProximo > 0 && (
          <div className="ml-auto text-right">
            <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Falta para {labelAtivo(proximoNivel)}</p>
            <p className="text-lg font-bold text-orange-600">{fmt(faltaProximo)}</p>
          </div>
        )}
      </div>

      {/* Régua de Níveis */}
      {niveisConfigurados.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Faixas de Nível — Produza mais para ganhar mais!</p>
          <div className="grid gap-2" style={{gridTemplateColumns: `repeat(${niveisConfigurados.length}, 1fr)`}}>
            {niveisConfigurados.map((k, idx) => {
              const isAtual = k === nivelAtivo;
              const isAlcancado = idxAtual >= 0 && idx <= idxAtual;
              const de = metasDe[k] ?? 0;
              const ate = metasAte[k] ?? 0;
              return (
                <div
                  key={k}
                  className={`rounded-lg border-2 px-3 py-2.5 text-center transition-all ${
                    isAtual
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : isAlcancado
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`text-xs font-bold uppercase mb-1 ${
                    isAtual ? 'text-green-700' : isAlcancado ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {isAtual ? '✓ ' : ''}{labelAtivo(k)}
                  </div>
                  <div className={`text-[11px] font-medium ${
                    isAtual ? 'text-green-800' : isAlcancado ? 'text-blue-700' : 'text-gray-500'
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
                    {colunaExibida && (
                      <TableHead className="text-amber-300 font-bold text-xs uppercase bg-amber-900 py-2 px-3 text-center min-w-[80px]">{labelAtivo(colunaExibida)}</TableHead>
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
                      {colunaExibida && (
                        <TableCell className="font-bold text-amber-700 bg-amber-50 text-xs py-1 px-3 text-center whitespace-nowrap">
                          {fmtPct(row[colunaExibida])}
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
