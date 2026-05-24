import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Upload, Trash2, Search, FileSpreadsheet,
  AlertTriangle, CheckCircle2, TrendingDown, History, RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import PageHeader from "@/components/PageHeader";

const PAGE_SIZE = 100;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(v: string | number | null | undefined): string {
  if (v == null) return '—';
  const n = parseFloat(String(v));
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(v: string | number | null | undefined): string {
  if (v == null) return '—';
  const n = parseFloat(String(v));
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function normalize(s: string) {
  return s.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  if (d instanceof Date) {
    return d.toLocaleDateString('pt-BR');
  }
  return String(d);
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ProRataPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const cargo = (user as any)?.cargo ?? '';
  const isCEO = cargo === 'CEO';

  // Redirecionar para home se não for CEO
  useEffect(() => {
    if (!authLoading && !isCEO) {
      navigate('/');
    }
  }, [authLoading, isCEO, navigate]);

  const [aba, setAba] = useState<'operacoes' | 'encerradas'>('operacoes');
  const [search, setSearch] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState<string>(''); // '' = Todas, 'FLEX', 'BMF'
  const [page, setPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<'novo' | 'subscrever'>('subscrever');
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [importacaoSelecionada, setImportacaoSelecionada] = useState<string | undefined>(undefined);
  const [searchEnc, setSearchEnc] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // ─── QUERIES ──────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading } = trpc.proRata.list.useQuery({
    search: search || undefined,
    empresa: empresaFiltro || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: countData } = trpc.proRata.count.useQuery({ search: search || undefined, empresa: empresaFiltro || undefined });
  const total = countData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: totaisData } = trpc.proRata.totais.useQuery({ search: search || undefined, empresa: empresaFiltro || undefined });

  const { data: historicoData = [] } = trpc.proRata.historicoImportacoes.useQuery();

  const { data: encerradasRows = [], isLoading: encLoading } = trpc.proRata.encerradas.useQuery({
    importacaoId: importacaoSelecionada,
    search: searchEnc || undefined,
    limit: PAGE_SIZE,
    offset: 0,
  });

  const { data: encTotais } = trpc.proRata.encerradasTotais.useQuery({
    importacaoId: importacaoSelecionada,
    search: searchEnc || undefined,
  });

  // ─── MUTATIONS ────────────────────────────────────────────────────────────
  const importarMutation = trpc.proRata.importar.useMutation({
    onSuccess: (res) => {
      const msg = res.encerradas > 0
        ? `Importação concluída: ${res.inseridos} registros. ⚠️ ${res.encerradas} operações encerradas detectadas!`
        : `Importação concluída: ${res.inseridos} registros inseridos.`;
      toast.success(msg, { duration: 6000 });
      utils.proRata.list.invalidate();
      utils.proRata.count.invalidate();
      utils.proRata.totais.invalidate();
      utils.proRata.historicoImportacoes.invalidate();
      utils.proRata.encerradas.invalidate();
      utils.proRata.encerradasTotais.invalidate();
      setShowImport(false);
      setImportData([]);
      // Se detectou encerradas, vai para a aba de relatório
      if (res.encerradas > 0) {
        setImportacaoSelecionada(res.importacaoId);
        setAba('encerradas');
      }
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const deletarTodosMutation = trpc.proRata.deletarTodos.useMutation({
    onSuccess: () => {
      toast.success('Todos os registros foram removidos.');
      utils.proRata.list.invalidate();
      utils.proRata.count.invalidate();
      utils.proRata.totais.invalidate();
      setShowDeleteAll(false);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  // ─── LEITURA DO EXCEL ─────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array', cellDates: false });
        // Usar a primeira aba (P1-Promotiva ou qualquer nome)
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Linha 1 é resumo, linha 2 é cabeçalho, dados a partir da linha 3
        // raw: true para preservar números reais (datas como serial, comissão como float)
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
        if (json.length < 3) { toast.error('Arquivo vazio ou sem dados.'); return; }

        // Cabeçalho na linha 2 (índice 1)
        const headerRow = json[1] as any[];
        const headers: string[] = headerRow.map(h => normalize(String(h ?? '')));

        const col = (row: any[], key: string) => {
          const idx = headers.indexOf(normalize(key));
          return idx >= 0 ? row[idx] : undefined;
        };

        const toNum = (v: any): number | undefined => {
          if (v == null || v === '') return undefined;
          // Número puro (raw:true retorna assim)
          if (typeof v === 'number') return v;
          // Remover símbolo de moeda e espaços
          const s = String(v).replace(/R\$\s*/g, '').replace(/\s/g, '').trim();
          if (!s) return undefined;
          // Formato BR com ponto de milhar e vírgula decimal: "1.234,56" ou "1.234.567,89"
          if (s.includes(',')) {
            // Tem vírgula = decimal BR
            const clean = s.replace(/\./g, '').replace(',', '.');
            const n = parseFloat(clean);
            return isNaN(n) ? undefined : n;
          }
          // Formato com ponto: pode ser decimal (9.99) ou milhar (1.234)
          // Se o ponto está a menos de 3 casas do fim, é decimal: "9.99", "130,000.00"
          if (s.includes('.')) {
            const parts = s.split('.');
            const lastPart = parts[parts.length - 1];
            if (lastPart.length <= 2) {
              // Última parte tem 1-2 dígitos: é decimal (ex: "9.99", "1,513,967.00")
              // Remover vírgulas de milhar (formato en-US) e tratar ponto como decimal
              const clean = s.replace(/,/g, '');
              const n = parseFloat(clean);
              return isNaN(n) ? undefined : n;
            } else {
              // Última parte tem 3+ dígitos: ponto é separador de milhar BR
              const clean = s.replace(/\./g, '');
              const n = parseFloat(clean);
              return isNaN(n) ? undefined : n;
            }
          }
          // Sem ponto nem vírgula: número inteiro
          const n = parseFloat(s);
          return isNaN(n) ? undefined : n;
        };

        const toDate = (v: any): string | undefined => {
          if (v == null || v === '') return undefined;
          // Se for número: serial do Excel (ex: 46143 = uma data)
          if (typeof v === 'number') {
            // Excel serial: dias desde 30/12/1899
            const date = new Date(Math.round((v - 25569) * 86400 * 1000));
            const dd = String(date.getUTCDate()).padStart(2, '0');
            const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
            const yyyy = date.getUTCFullYear();
            return `${dd}/${mm}/${yyyy}`;
          }
          const s = String(v).trim();
          // Formato DD/MM/AAAA
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
          // Formato AAAA-MM-DD (ISO)
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            const [y, m, d] = s.split('T')[0].split('-');
            return `${d}/${m}/${y}`;
          }
          // String numérica (serial como texto)
          if (/^\d{4,5}$/.test(s)) {
            const serial = parseInt(s, 10);
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            const dd = String(date.getUTCDate()).padStart(2, '0');
            const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
            const yyyy = date.getUTCFullYear();
            return `${dd}/${mm}/${yyyy}`;
          }
          return s || undefined;
        };

        const registros: any[] = [];
        // Dados a partir da linha 3 (índice 2)
        for (let i = 2; i < json.length; i++) {
          const row = json[i];
          if (!row || row.every((c: any) => c === null || c === undefined || c === '')) continue;

          // Nº Operação: coluna "NRO OPERACAO" ou "NRO OPERAÇÃO"
          const nrOperacaoRaw =
            col(row, 'NRO OPERACAO') ??
            col(row, 'NRO OPERAÇÃO') ??
            col(row, 'NROOPERACAO') ??
            col(row, 'OPERACAO');
          if (nrOperacaoRaw == null || String(nrOperacaoRaw).trim() === '') continue;

          const qtdPagas = toNum(col(row, 'QTD PARCELAS PGS') ?? col(row, 'QTDPARCELASPGS'));
          const qtdTotal = toNum(col(row, 'QTD PARCELAS TOTAL') ?? col(row, 'QTDPARCELASTOTAL'));
          const comissaoRaw = col(row, 'COMISSAO') ?? col(row, 'COMISSÃO');
          const empresaRaw = col(row, 'EMPRESA') ?? col(row, 'Empresa');
          const codEstRaw = col(row, 'COD EST') ?? col(row, 'CODEST');

          const comissaoVal = toNum(comissaoRaw);
          const vlrFinVal = toNum(col(row, 'VALORFINANCIADO'));

          registros.push({
            agenciaBB: col(row, 'AGENCIA BB') != null ? String(col(row, 'AGENCIA BB')).trim() : undefined,
            nrOperacao: String(nrOperacaoRaw).trim().replace(/\.0$/, ''),
            chaveJ: col(row, 'CHAVEJ') != null ? String(col(row, 'CHAVEJ')).trim() : undefined,
            valorFinanciado: vlrFinVal != null ? String(vlrFinVal) : undefined,
            comissao: comissaoVal != null ? String(comissaoVal) : undefined,
            dataFinal: toDate(col(row, 'DATA FINAL') ?? col(row, 'DATAFINAL')),
            qtdParcelasPagas: qtdPagas != null ? Math.round(qtdPagas) : undefined,
            qtdParcelasTotal: qtdTotal != null ? Math.round(qtdTotal) : undefined,
            codEst: codEstRaw != null ? String(codEstRaw).trim() : undefined,
            empresa: empresaRaw != null ? String(empresaRaw).trim() : undefined,
          });
        }

        if (registros.length === 0) { toast.error('Nenhum registro válido encontrado.'); return; }
        setImportData(registros);
        toast.success(`${registros.length} registros prontos para importar.`);
      } catch (err: any) {
        toast.error(`Erro ao ler arquivo: ${err?.message ?? err}`);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleImport() {
    if (importData.length === 0) { toast.error('Nenhum dado para importar.'); return; }
    setImporting(true);
    try {
      const LOTE = 500;
      for (let i = 0; i < importData.length; i += LOTE) {
        const lote = importData.slice(i, i + LOTE);
        const modo = i === 0 ? importMode : 'novo';
        await importarMutation.mutateAsync({ modo, registros: lote });
      }
    } finally {
      setImporting(false);
    }
  }

  // ─── PAGINADOR ────────────────────────────────────────────────────────────
  const Paginador = () => (
    <div className="flex items-center justify-between py-2 px-1">
      <span className="text-sm text-gray-500">{total} registro(s) — Página {page + 1} de {totalPages}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => setPage(0)} disabled={page === 0}>«</Button>
        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</Button>
        <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</Button>
        <Button size="sm" variant="outline" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</Button>
      </div>
    </div>
  );
  // ─── RENDER ─────────────────────────────────────────────────────────────────────────────────
  // Enquanto autenticação carrega, exibir spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            <p className="text-gray-500">Verificando acesso...</p>
          </div>
        </div>
      </div>
    );
  }
  // Se não for CEO, não renderizar nada (o useEffect já redireciona)
  if (!isCEO) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho padrão com logo e botão Voltar */}
      <PageHeader />

      {/* Abas */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setAba('operacoes')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              aba === 'operacoes'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Operações
            {total > 0 && (
              <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {total.toLocaleString('pt-BR')}
              </span>
            )}
          </button>
          <button
            onClick={() => setAba('encerradas')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              aba === 'encerradas'
                ? 'border-red-600 text-red-700 bg-red-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Relatório — Encerradas
            {(encTotais?.total ?? 0) > 0 && (
              <span className="ml-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {(encTotais?.total ?? 0).toLocaleString('pt-BR')}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">

        {/* ══════════════════ ABA OPERAÇÕES ══════════════════ */}
        {aba === 'operacoes' && (
          <>
            {/* Barra de ações */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por Nº Operação, ChaveJ ou Empresa..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
              <Button onClick={() => setShowImport(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Upload className="w-4 h-4 mr-2" />
                Importar Excel
              </Button>
               <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setShowDeleteAll(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>
            {/* Filtro por empresa */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">Empresa:</span>
              {(['', 'FLEX', 'BMF'] as const).map(emp => (
                <button
                  key={emp}
                  onClick={() => { setEmpresaFiltro(emp); setPage(0); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                    empresaFiltro === emp
                      ? emp === 'FLEX'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : emp === 'BMF'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-gray-800 border-gray-800 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {emp === '' ? 'Todas' : emp}
                </button>
              ))}
            </div>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-indigo-100 bg-indigo-50">
                <CardContent className="py-4">
                  <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide">Total Registros</p>
                  <p className="text-2xl font-bold text-indigo-900">{(totaisData?.total ?? total).toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
              <Card className="border-blue-100 bg-blue-50">
                <CardContent className="py-4">
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Total Financiado</p>
                  <p className="text-xl font-bold text-blue-900">{fmt(totaisData?.totalFinanciado)}</p>
                </CardContent>
              </Card>
              <Card className="border-amber-100 bg-amber-50">
                <CardContent className="py-4">
                  <p className="text-xs text-amber-500 font-medium uppercase tracking-wide">Total a Receber (VLR)</p>
                  <p className="text-xl font-bold text-amber-900">{fmt(totaisData?.totalVlr)}</p>
                  <p className="text-xs text-amber-400 mt-1">Comissão × Falta</p>
                </CardContent>
              </Card>
              <Card className="border-purple-100 bg-purple-50">
                <CardContent className="py-4">
                  <p className="text-xs text-purple-500 font-medium uppercase tracking-wide">A Receber — Mês Anterior</p>
                  <p className="text-xl font-bold text-purple-900">{fmt(totaisData?.totalMesAnterior ?? 0)}</p>
                  <p className="text-xs text-purple-400 mt-1">
                    {totaisData?.countMesAnterior ?? 0} operações ativas
                  </p>
                </CardContent>
              </Card>
              <Card className="border-green-100 bg-green-50">
                <CardContent className="py-4">
                  <p className="text-xs text-green-500 font-medium uppercase tracking-wide">Total Parcelas Faltando</p>
                  <p className="text-2xl font-bold text-green-900">{(totaisData?.totalFalta ?? 0).toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Paginador topo */}
            <Paginador />

            {/* Tabela */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="text-center py-16 text-gray-400">Carregando...</div>
                ) : (rows as any[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <FileSpreadsheet className="w-12 h-12 text-gray-300" />
                    <p className="text-gray-500 font-medium">Nenhum registro encontrado</p>
                    <p className="text-gray-400 text-sm">Importe um arquivo Excel (.xlsm / .xlsx) para começar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">Agência BB</TableHead>
                          <TableHead className="font-semibold text-gray-700">Nº Operação</TableHead>
                          <TableHead className="font-semibold text-gray-700">ChaveJ</TableHead>
                          <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-right">Vr. Financiado</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                          <TableHead className="font-semibold text-gray-700">Data Final</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">Parc. Pagas</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">Parc. Total</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center bg-amber-50">Falta</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-right bg-green-50">VLR (A Receber)</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">Cod Est</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(rows as any[]).map((row: any, rowIdx: number) => {
                          const falta = row.qtdFaltaReceber ?? ((row.qtdParcelasTotal ?? 0) - (row.qtdParcelasPagas ?? 0));
                          return (
                            <TableRow key={row.id} className={rowIdx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-blue-50/30 hover:bg-blue-100/40"}>
                              <TableCell className="text-gray-700 font-mono text-sm">{row.agenciaBB || '—'}</TableCell>
                              <TableCell className="text-gray-700 font-mono text-sm font-medium">{row.nrOperacao}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-mono">{row.chaveJ || '—'}</Badge>
                              </TableCell>
                              <TableCell className="text-gray-700 text-sm">{row.empresa || '—'}</TableCell>
                              <TableCell className="text-right font-semibold text-blue-700">{fmt(row.valorFinanciado)}</TableCell>
                              <TableCell className="text-right text-gray-700 text-sm">{fmt(row.comissao)}</TableCell>
                              <TableCell className="text-gray-700 text-sm">{row.dataFinal || '—'}</TableCell>
                              <TableCell className="text-center text-gray-700">{row.qtdParcelasPagas ?? '—'}</TableCell>
                              <TableCell className="text-center text-gray-700">{row.qtdParcelasTotal ?? '—'}</TableCell>
                              <TableCell className="text-center bg-amber-50">
                                <Badge className={`text-xs font-bold ${falta > 0 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                  {falta}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-700 bg-green-50">{fmt(row.vlr)}</TableCell>
                              <TableCell className="text-center text-gray-500 text-sm">{row.codEst || '—'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Paginador rodapé */}
            <Paginador />
          </>
        )}

        {/* ══════════════════ ABA ENCERRADAS ══════════════════ */}
        {aba === 'encerradas' && (
          <>
            {/* Seletor de importação */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por Nº Operação, ChaveJ ou Empresa..."
                  value={searchEnc}
                  onChange={e => setSearchEnc(e.target.value)}
                />
              </div>
              <select
                className="border rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                value={importacaoSelecionada ?? ''}
                onChange={e => setImportacaoSelecionada(e.target.value || undefined)}
              >
                <option value="">Todas as importações</option>
                {historicoData.map((h: any) => (
                  <option key={h.importacaoId} value={h.importacaoId}>
                    {new Date(h.importacaoData).toLocaleString('pt-BR')} — {h.total} encerradas — {fmt(h.totalVlrPerdido)} perdido
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-50"
                onClick={() => {
                  const rows = encerradasRows as any[];
                  if (!rows.length) return;
                  const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
                    'Data Importação': new Date(r.importacaoData).toLocaleString('pt-BR'),
                    'Nº Operação': r.nrOperacao,
                    'ChaveJ': r.chaveJ || '',
                    'Empresa': r.empresa || '',
                    'Agência BB': r.agenciaBB || '',
                    'Vr. Financiado': parseFloat(r.valorFinanciado) || 0,
                    'Comissão': parseFloat(r.comissao) || 0,
                    'Data Final': r.dataFinal || '',
                    'Pagas': r.qtdParcelasPagas ?? 0,
                    'Total': r.qtdParcelasTotal ?? 0,
                    'VLR Perdido': parseFloat(r.vlrPerdido) || 0,
                    'Motivo': r.motivo === 'removida' ? 'Removida' : 'Encerrada',
                  })));
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Encerradas');
                  XLSX.writeFile(wb, `encerradas_${new Date().toISOString().slice(0,10)}.xlsx`);
                }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </Button>
            </div>

            {/* Cards de resumo encerradas */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-red-100 bg-red-50">
                <CardContent className="py-4">
                  <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Total Encerradas</p>
                  <p className="text-2xl font-bold text-red-900">{(encTotais?.total ?? 0).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-red-400 mt-1">Operações que pararam de gerar ganho</p>
                </CardContent>
              </Card>
              <Card className="border-orange-100 bg-orange-50">
                <CardContent className="py-4">
                  <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">Total VLR Perdido</p>
                  <p className="text-xl font-bold text-orange-900">{fmt(encTotais?.totalVlrPerdido)}</p>
                  <p className="text-xs text-orange-400 mt-1">Comissão que deixou de ser recebida</p>
                </CardContent>
              </Card>
              <Card className="border-gray-100 bg-gray-50">
                <CardContent className="py-4">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Financiado Encerrado</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(encTotais?.totalFinanciado)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela encerradas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <TrendingDown className="w-4 h-4" />
                  Operações que pararam de gerar ganho financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {encLoading ? (
                  <div className="text-center py-16 text-gray-400">Carregando...</div>
                ) : (encerradasRows as any[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <CheckCircle2 className="w-12 h-12 text-green-300" />
                    <p className="text-gray-500 font-medium">Nenhuma operação encerrada registrada</p>
                    <p className="text-gray-400 text-sm">As operações encerradas aparecem aqui ao importar uma nova planilha no modo Subscrever.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-50">
                          <TableHead className="font-semibold text-gray-700">Data Importação</TableHead>
                          <TableHead className="font-semibold text-gray-700">Nº Operação</TableHead>
                          <TableHead className="font-semibold text-gray-700">ChaveJ</TableHead>
                          <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                          <TableHead className="font-semibold text-gray-700">Agência BB</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-right">Vr. Financiado</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                          <TableHead className="font-semibold text-gray-700">Data Final</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">Pagas</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">Total</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-right bg-red-50">VLR Perdido</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(encerradasRows as any[]).map((row: any) => (
                          <TableRow key={row.id} className="hover:bg-red-50/50">
                            <TableCell className="text-gray-500 text-xs">
                              {new Date(row.importacaoData).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium text-gray-800">{row.nrOperacao}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-mono">{row.chaveJ || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-gray-700 text-sm">{row.empresa || '—'}</TableCell>
                            <TableCell className="text-gray-700 font-mono text-sm">{row.agenciaBB || '—'}</TableCell>
                            <TableCell className="text-right text-blue-700 font-semibold">{fmt(row.valorFinanciado)}</TableCell>
                            <TableCell className="text-right text-gray-700 text-sm">{fmt(row.comissao)}</TableCell>
                            <TableCell className="text-gray-700 text-sm">{row.dataFinal || '—'}</TableCell>
                            <TableCell className="text-center text-gray-700">{row.qtdParcelasPagas ?? '—'}</TableCell>
                            <TableCell className="text-center text-gray-700">{row.qtdParcelasTotal ?? '—'}</TableCell>
                            <TableCell className="text-right font-bold text-red-700 bg-red-50">{fmt(row.vlrPerdido)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.motivo === 'removida'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {row.motivo === 'removida' ? 'Removida' : 'Encerrada'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ─── MODAL IMPORTAÇÃO ─────────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Importar Pró Rata — Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Modo de importação */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Modo de importação:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setImportMode('novo')}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    importMode === 'novo'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  Novo — Apenas adiciona
                </button>
                <button
                  onClick={() => setImportMode('subscrever')}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    importMode === 'subscrever'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 inline mr-1" />
                  Subscrever — Atualiza base
                </button>
              </div>
              {importMode === 'subscrever' && (
                <p className="text-xs text-orange-600 mt-2 bg-orange-50 border border-orange-200 rounded p-2">
                  ⚠️ A base atual será substituída. O sistema detectará automaticamente quais operações pararam de gerar ganho e registrará no relatório de Encerradas.
                </p>
              )}
            </div>

            {/* Seleção de arquivo */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Arquivo Excel (.xlsm / .xlsx / .xls):</p>
              <p className="text-xs text-gray-500 mb-2">
                Colunas esperadas (linha 2 do arquivo): <strong>AGENCIA BB, NRO OPERACAO, CHAVEJ, VALORFINANCIADO, COMISSÃO, DATA FINAL, QTD PARCELAS PGS, QTD PARCELAS TOTAL, COD EST, Empresa</strong>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={handleFile}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            {/* Preview */}
            {importData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">
                  ✓ {importData.length} registros prontos para importar
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Exemplo: Op. {importData[0]?.nrOperacao} — ChaveJ {importData[0]?.chaveJ || '—'} — Empresa {importData[0]?.empresa || '—'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setImportData([]); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importData.length === 0 || importing}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {importing ? 'Importando...' : `Importar ${importData.length > 0 ? importData.length : ''} registros`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL CONFIRMAR LIMPAR TUDO ──────────────────────────────────── */}
      <Dialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirmar exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Tem certeza que deseja remover <strong>todos os {total} registros</strong> da base de Pró Rata? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAll(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletarTodosMutation.mutate()}
              disabled={deletarTodosMutation.isPending}
            >
              {deletarTodosMutation.isPending ? 'Removendo...' : 'Sim, remover tudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
