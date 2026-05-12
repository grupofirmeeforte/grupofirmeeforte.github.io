import { useState, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
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
import { ArrowLeft, Upload, Trash2, Search, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const PAGE_SIZE = 100;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(v: string | number | null | undefined): string {
  if (v == null) return '—';
  const n = parseFloat(String(v));
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalize(s: string) {
  return s.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ProRataPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<'novo' | 'subscrever'>('novo');
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: rows = [], isLoading } = trpc.proRata.list.useQuery({
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: countData } = trpc.proRata.count.useQuery({
    search: search || undefined,
  });
  const total = countData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const importarMutation = trpc.proRata.importar.useMutation({
    onSuccess: (res) => {
      toast.success(`Importação concluída: ${res.inseridos} registros inseridos.`);
      utils.proRata.list.invalidate();
      utils.proRata.count.invalidate();
      setShowImport(false);
      setImportData([]);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const deletarTodosMutation = trpc.proRata.deletarTodos.useMutation({
    onSuccess: () => {
      toast.success('Todos os registros foram removidos.');
      utils.proRata.list.invalidate();
      utils.proRata.count.invalidate();
      setShowDeleteAll(false);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  // ─── LEITURA DO EXCEL ───────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        if (json.length < 2) { toast.error('Arquivo vazio ou sem dados.'); return; }

        // Mapear cabeçalhos
        const headers: string[] = (json[0] as any[]).map(h => normalize(String(h ?? '')));
        const col = (row: any[], key: string) => {
          const idx = headers.indexOf(normalize(key));
          return idx >= 0 ? row[idx] : undefined;
        };

        const toNum = (v: any): number | undefined => {
          if (v == null || v === '') return undefined;
          if (typeof v === 'number') return v;
          const s = String(v).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
          const n = parseFloat(s);
          return isNaN(n) ? undefined : n;
        };

        const toDate = (v: any): string | undefined => {
          if (!v) return undefined;
          if (v instanceof Date && !isNaN(v.getTime())) {
            const d = v.getDate().toString().padStart(2, '0');
            const m = (v.getMonth() + 1).toString().padStart(2, '0');
            const y = v.getFullYear();
            return `${d}/${m}/${y}`;
          }
          const s = String(v).trim();
          // Já no formato DD/MM/AAAA
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
          return s || undefined;
        };

        const registros: any[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.every((c: any) => c === null || c === undefined || c === '')) continue;

          const nrOperacao =
            col(row, 'NRO OPERACAO') ?? col(row, 'NRO OPERAÇÃO') ??
            col(row, 'NROPERACAO') ?? col(row, 'OPERACAO') ?? col(row, 'OPERAÇÃO');
          if (nrOperacao == null || String(nrOperacao).trim() === '') continue;

          const qtdPagas = toNum(col(row, 'QTD PARCELAS PGS') ?? col(row, 'QTDPARCELASPGS') ?? col(row, 'PARCELAS PGS'));
          const qtdTotal = toNum(col(row, 'QTD PARCELAS TOTAL') ?? col(row, 'QTDPARCELASTOTAL') ?? col(row, 'PARCELAS TOTAL'));

          registros.push({
            agenciaBB: col(row, 'AGENCIA BB') != null ? String(col(row, 'AGENCIA BB')).trim() : undefined,
            nrOperacao: String(typeof nrOperacao === 'number' ? Math.round(nrOperacao) : nrOperacao).trim(),
            chaveJ: col(row, 'CHAVE J') != null ? String(col(row, 'CHAVE J')).trim() : undefined,
            valorFinanciado: col(row, 'VALOR FINANCIADO') != null ? String(toNum(col(row, 'VALOR FINANCIADO')) ?? '') : undefined,
            comissao: col(row, 'COMISSAO') != null || col(row, 'COMISSÃO') != null
              ? String(toNum(col(row, 'COMISSAO') ?? col(row, 'COMISSÃO')) ?? '') : undefined,
            dataFinal: toDate(col(row, 'DATA FINAL') ?? col(row, 'DATAFINAL')),
            qtdParcelasPagas: qtdPagas != null ? Math.round(qtdPagas) : undefined,
            qtdParcelasTotal: qtdTotal != null ? Math.round(qtdTotal) : undefined,
            codOps: col(row, 'COD OPS') != null ? String(col(row, 'COD OPS')).trim() : undefined,
            codEst: col(row, 'COD EST') != null ? String(col(row, 'COD EST')).trim() : undefined,
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
        // Modo subscrever só na primeira chamada (limpa tudo); depois usa 'novo'
        const modo = i === 0 ? importMode : 'novo';
        await importarMutation.mutateAsync({ modo, registros: lote });
      }
    } finally {
      setImporting(false);
    }
  }

  // ─── TOTAIS ───────────────────────────────────────────────────────────────
  const totalFinanciado = useMemo(
    () => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.valorFinanciado ?? 0)), 0),
    [rows]
  );
  const totalComissao = useMemo(
    () => (rows as any[]).reduce((acc: number, r: any) => acc + parseFloat(String(r.comissao ?? 0)), 0),
    [rows]
  );

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

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pró Rata</h1>
          <p className="text-sm text-gray-500 mt-0.5">Operações com controle de parcelas pagas e a receber</p>
        </div>
        <Button variant="default" className="bg-gray-900 hover:bg-gray-800" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por Nº Operação ou ChaveJ..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Button onClick={() => setShowImport(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Importar Excel
          </Button>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setShowDeleteAll(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>

        {/* Cards de totais */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="py-4">
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Total Registros</p>
              <p className="text-2xl font-bold text-blue-900">{total.toLocaleString('pt-BR')}</p>
            </CardContent>
          </Card>
          <Card className="border-green-100 bg-green-50">
            <CardContent className="py-4">
              <p className="text-xs text-green-500 font-medium uppercase tracking-wide">Total Financiado (página)</p>
              <p className="text-2xl font-bold text-green-900">{fmt(totalFinanciado)}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-orange-50">
            <CardContent className="py-4">
              <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">Total Comissão (página)</p>
              <p className="text-2xl font-bold text-orange-900">{fmt(totalComissao)}</p>
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
                <p className="text-gray-400 text-sm">Importe um arquivo Excel para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Agência BB</TableHead>
                      <TableHead className="font-semibold text-gray-700">Nº Operação</TableHead>
                      <TableHead className="font-semibold text-gray-700">ChaveJ</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Vr. Financiado</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Comissão</TableHead>
                      <TableHead className="font-semibold text-gray-700">Data Final</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Parc. Pagas</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Parc. Total</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center bg-amber-50">Falta Receber</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Cod Ops</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Cod Est</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows as any[]).map((row: any) => {
                      const falta = row.qtdFaltaReceber ?? ((row.qtdParcelasTotal ?? 0) - (row.qtdParcelasPagas ?? 0));
                      return (
                        <TableRow key={row.id} className="hover:bg-gray-50">
                          <TableCell className="text-gray-700 font-mono text-sm">{row.agenciaBB || '—'}</TableCell>
                          <TableCell className="text-gray-700 font-mono text-sm font-medium">{row.nrOperacao}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-mono">{row.chaveJ || '—'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-700">{fmt(row.valorFinanciado)}</TableCell>
                          <TableCell className="text-right text-green-700">{fmt(row.comissao)}</TableCell>
                          <TableCell className="text-gray-700 text-sm">{row.dataFinal || '—'}</TableCell>
                          <TableCell className="text-center text-gray-700">{row.qtdParcelasPagas ?? '—'}</TableCell>
                          <TableCell className="text-center text-gray-700">{row.qtdParcelasTotal ?? '—'}</TableCell>
                          <TableCell className="text-center bg-amber-50">
                            <Badge className={`text-xs font-bold ${falta > 0 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                              {falta}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-gray-500 text-sm">{row.codOps || '—'}</TableCell>
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
      </div>

      {/* ─── MODAL IMPORTAÇÃO ─────────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
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
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Subscrever — Limpa e reimporta
                </button>
              </div>
              {importMode === 'subscrever' && (
                <p className="text-xs text-orange-600 mt-1">⚠️ Todos os registros existentes serão apagados antes da importação.</p>
              )}
            </div>

            {/* Seleção de arquivo */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Arquivo Excel (.xlsx / .xls):</p>
              <p className="text-xs text-gray-500 mb-2">
                Colunas esperadas: <strong>AGENCIA BB, NRO OPERACAO, CHAVE J, VALOR FINANCIADO, COMISSÃO, DATA FINAL, QTD PARCELAS PGS, QTD PARCELAS TOTAL, COD OPS, COD EST</strong>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {/* Preview */}
            {importData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">
                  ✓ {importData.length} registros prontos para importar
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Exemplo: Op. {importData[0]?.nrOperacao} — ChaveJ {importData[0]?.chaveJ || '—'}
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
              className="bg-blue-600 hover:bg-blue-700"
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
            Tem certeza que deseja remover <strong>todos os {total} registros</strong> do Pró Rata? Esta ação não pode ser desfeita.
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
