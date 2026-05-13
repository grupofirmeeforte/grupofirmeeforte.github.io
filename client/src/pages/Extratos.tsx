import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, CreditCard, Users, Star, Shield, Smile, User, Key, Calendar, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';

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

// ─── EXTRATO CONSIGNADO ───────────────────────────────────────────────────────
function ExtratoConsignado() {
  const { data, isLoading } = trpc.extratoConsignado.listar.useQuery({});

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

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtPct = (v: string | number | null) =>
    v != null ? `${parseFloat(String(v)).toFixed(2)}%` : '—';

  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />

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
                  {(rows as any[]).map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-gray-50">
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

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Mapeamento de código de linha para nome de produto
  const nomeProduto = (linha: number | null) => {
    if (!linha) return '—';
    return String(linha);
  };

  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJReal} nomeAgente={nomeAgente} mesRef={mesAtualStr} />
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
                  (rows as any[]).map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-gray-50">
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
  const { data, isLoading } = trpc.extratoCC.listar.useQuery({});
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
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
  const { data, isLoading } = trpc.extratoConsorcio.listar.useQuery({});
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNum = (v: any) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
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
                  <TableHead className="font-semibold text-gray-700">Nº Operação</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">Parcela</TableHead>
                  <TableHead className="font-semibold text-gray-700">Segmento</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Valor Bem</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-700">{row.nrOperacao || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{row.parcelas ?? '—'}</Badge>
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
  const { data, isLoading } = trpc.extratoOurocap.listar.useQuery({});
  const rows = data?.rows ?? [];
  const mesRef = data?.mesRef ?? '';
  const chaveJ = data?.chaveJ ?? '';
  const { data: agenteData } = trpc.agentes.getByChaveJ.useQuery({ chaveJ }, { enabled: !!chaveJ });
  const nomeAgente = (agenteData as any)?.nomeAgente ?? '';
  const totalLiquido = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.valorLiquido ?? 0)), 0), [rows]);
  const totalComissao = useMemo(() => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0), [rows]);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesRef} />
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
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  // Formata decimal (ex: 0.0195) como percentual legível (ex: 1,950%)
  const fmtPct = (v: string | null | undefined) => {
    if (!v) return '—';
    const normalized = String(v).replace(',', '.');
    const n = parseFloat(normalized);
    if (isNaN(n)) return String(v);
    const pctVal = n > 1 ? n : n * 100;
    return pctVal.toFixed(3).replace('.', ',') + '%';
  };
  // Colunas de ativo que têm pelo menos um valor preenchido na tabela
  const ativoKeys = ['ativo01','ativo02','ativo03','ativo04','ativo05','ativo06','ativo07','ativo08','ativo09','ativo10'];
  const colunasComValor = ativoKeys.filter(k => tabela.some(r => r[k] != null && r[k] !== ''));
  // Exibe apenas a coluna do nível ativo atingido; se não atingiu nenhum, não exibe coluna de ativo
  const colunaExibida = nivelAtivo && colunasComValor.includes(nivelAtivo) ? nivelAtivo : null;
  const labelAtivo = (k: string) => `Ativo ${parseInt(k.replace('ativo', ''), 10).toString().padStart(2, '0')}`;
  return (
    <div>
      <PainelIdentificacao chaveJ={chaveJ} nomeAgente={nomeAgente} mesRef={mesAtualStr} />
      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-6">
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Produção Líq. sem SRCC ({mesAtualStr})</p>
          <p className="text-xl font-bold text-blue-800">{fmt(totalLiquido)}</p>
        </div>
        {nivelAtivo && (
          <div>
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Nível atingido</p>
            <p className="text-xl font-bold text-green-700">{labelAtivo(nivelAtivo)}</p>
          </div>
        )}
        {!nivelAtivo && !isLoading && (
          <p className="text-sm text-gray-400">Nenhuma faixa de meta atingida ainda neste mês.</p>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>
          ) : tabela.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Nenhum registro encontrado para sua empresa.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-800">
                    <TableHead className="text-white font-semibold text-xs uppercase">Convênio</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase">Tx Juros De</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase">Tx Juros Até</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase">Valor Mín.</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase">Meses De</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase text-blue-300">Meses Até</TableHead>
                    {colunaExibida && (
                      <TableHead className="text-amber-300 font-bold text-xs uppercase bg-amber-900">{labelAtivo(colunaExibida)}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabela.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-sm">{row.convenio ?? '—'}</TableCell>
                      <TableCell className="text-sm">{row.txJurosDe ? fmtPct(row.txJurosDe) : '—'}</TableCell>
                      <TableCell className="text-sm">{row.txJurosAte === 'acima' ? 'acima' : (row.txJurosAte ? fmtPct(row.txJurosAte) : '—')}</TableCell>
                      <TableCell className="text-sm">{row.valorMinimo ?? '—'}</TableCell>
                      <TableCell className="text-sm">{row.mesesDe ?? '—'}</TableCell>
                      <TableCell className="text-blue-700 font-semibold text-sm">{row.mesesAte ?? '—'}</TableCell>
                      {colunaExibida && (
                        <TableCell className="font-bold text-amber-700 bg-amber-50 text-sm">
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
      {/* Cabeçalho */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extratos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subtituloPagina}</p>
        </div>
        <Button variant="default" className="bg-gray-900 hover:bg-gray-800" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
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
        {aba === 'perspectiva' && <PerspectivadeGanho />}
        {aba === 'minha-tabela' && <MinhaTabela />}
        {aba !== 'consignado' && aba !== 'cc' && aba !== 'consorcio' && aba !== 'ourocap' && aba !== 'perspectiva' && aba !== 'minha-tabela' && <ConteudoAbaPlaceholder aba={aba} />}
      </div>
    </div>
  );
}
