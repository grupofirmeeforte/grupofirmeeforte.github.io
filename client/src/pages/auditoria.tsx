import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Download, Search, ArrowLeft, CalendarDays, ClipboardList, Plus, Pencil, Trash2, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, BarChart2, Shield } from 'lucide-react';
import AuditoriaPermissoes from './auditoria-permissoes';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import PageHeader from "@/components/PageHeader";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Feriado = {
  id: number;
  data: string;
  nome: string;
  tipo: string;
  estado: string | null;
  cidade: string | null;
  ano: number;
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function AuditoriaPage() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const abaParam = searchParams.get('aba');
  const [aba, setAba] = useState<'logs' | 'feriados' | 'credito-despesas' | 'permissoes'>(
    abaParam === 'feriados' ? 'feriados' : abaParam === 'credito-despesas' ? 'credito-despesas' : abaParam === 'permissoes' ? 'permissoes' : 'logs'
  );

  // Atualiza aba quando o parâmetro de URL muda
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('aba');
    if (p === 'feriados') setAba('feriados');
    else if (p === 'credito-despesas') setAba('credito-despesas');
    else if (p === 'permissoes') setAba('permissoes');
    else setAba('logs');
  }, [window.location.search]);

  // ── CRÉDITO x DESPESAS ──
  const [cdMesAno, setCdMesAno] = useState('');
  const [cdChaveJ, setCdChaveJ] = useState('');
  const { data: cdMeses } = trpc.auditoria.creditoDespesasMeses.useQuery();
  const { data: cdDados, isLoading: cdLoading } = trpc.auditoria.creditoDespesas.useQuery({
    mesAno: cdMesAno || undefined,
    chaveJ: cdChaveJ || undefined,
  });

  const fmtCD = (v: number | undefined) =>
    v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── LOGS ──
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: logs, isLoading: loadingLogs } = trpc.auditoria.list.useQuery({
    chaveJ: filtroChaveJ || undefined,
    modulo: filtroModulo && filtroModulo !== 'todos' ? filtroModulo : undefined,
    limit,
    offset: page * limit,
  });

  const { data: totalCount } = trpc.auditoria.count.useQuery({
    chaveJ: filtroChaveJ || undefined,
    modulo: filtroModulo && filtroModulo !== 'todos' ? filtroModulo : undefined,
  });

  const totalPages = totalCount ? Math.ceil(totalCount / limit) : 0;

  // ── FERIADOS ──
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear());
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroMes, setFiltroMes] = useState<number>(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [feriadoEditando, setFeriadoEditando] = useState<Feriado | null>(null);
  const [form, setForm] = useState({ data: '', nome: '', tipo: 'nacional', estado: '', cidade: '', ano: new Date().getFullYear() });

  const utils = trpc.useUtils();

  const { data: anos } = trpc.feriados.anos.useQuery();
  const [cidadeInput, setCidadeInput] = useState('');
  const { data: feriadosList, isLoading: loadingFeriados } = trpc.feriados.list.useQuery({
    ano: filtroAno,
    tipo: filtroTipo !== 'todos' ? filtroTipo : undefined,
    cidade: filtroCidade || undefined,
    mes: filtroMes > 0 ? filtroMes : undefined,
  });

  const criarFeriado = trpc.feriados.create.useMutation({
    onSuccess: () => { utils.feriados.list.invalidate(); utils.feriados.anos.invalidate(); setModalAberto(false); toast.success('Feriado criado!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
  const atualizarFeriado = trpc.feriados.update.useMutation({
    onSuccess: () => { utils.feriados.list.invalidate(); setModalAberto(false); toast.success('Feriado atualizado!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
  const deletarFeriado = trpc.feriados.delete.useMutation({
    onSuccess: () => { utils.feriados.list.invalidate(); utils.feriados.anos.invalidate(); toast.success('Feriado removido!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const abrirCriar = () => {
    setFeriadoEditando(null);
    setForm({ data: '', nome: '', tipo: 'nacional', estado: '', cidade: '', ano: filtroAno });
    setModalAberto(true);
  };

  const abrirEditar = (f: Feriado) => {
    setFeriadoEditando(f);
    setForm({ data: f.data, nome: f.nome, tipo: f.tipo, estado: f.estado ?? '', cidade: f.cidade ?? '', ano: f.ano });
    setModalAberto(true);
  };

  const salvarFeriado = () => {
    const payload = {
      data: form.data,
      nome: form.nome,
      tipo: form.tipo as 'nacional' | 'estadual' | 'municipal',
      estado: form.estado || null,
      cidade: form.cidade || null,
      ano: form.ano,
    };
    if (feriadoEditando) {
      atualizarFeriado.mutate({ id: feriadoEditando.id, ...payload });
    } else {
      criarFeriado.mutate(payload);
    }
  };

  // ── EXPORT LOGS ──
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;
    const headers = ['Número Entrada', 'Nome Agente', 'ChaveJ', 'Módulo', 'Ação', 'Horário Entrada', 'Horário Saída', 'Descrição'];
    const rows = logs.map((log: any) => [
      log.numeroEntrada, log.nomeAgente, log.chaveJ, log.modulo || '-', log.acao || '-',
      new Date(log.horarioEntrada).toLocaleString('pt-BR'),
      log.horarioSaida ? new Date(log.horarioSaida).toLocaleString('pt-BR') : '-',
      log.descricao || '-',
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const tipoBadge = (tipo: string) => {
    if (tipo === 'nacional') return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (tipo === 'estadual') return 'bg-green-100 text-green-800 border border-green-200';
    return 'bg-purple-100 text-purple-800 border border-purple-200';
  };

  const tipoLabel = (tipo: string) => {
    if (tipo === 'nacional') return 'Nacional';
    if (tipo === 'estadual') return 'Estadual BA';
    return 'Municipal';
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditoria</h1>
          <p className="text-gray-500 mt-1 text-sm">Logs de acesso e feriados do sistema</p>
        </div>
        
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setAba('logs')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${aba === 'logs' ? 'bg-white border border-b-white border-gray-200 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ClipboardList className="w-4 h-4" /> Logs de Acesso
        </button>
        <button
          onClick={() => setAba('feriados')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${aba === 'feriados' ? 'bg-white border border-b-white border-gray-200 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CalendarDays className="w-4 h-4" /> Feriados
        </button>
        <button
          onClick={() => setAba('credito-despesas')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${aba === 'credito-despesas' ? 'bg-white border border-b-white border-gray-200 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BarChart2 className="w-4 h-4" /> Crédito x Despesas
        </button>
        <button
          onClick={() => setAba('permissoes')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${aba === 'permissoes' ? 'bg-white border border-b-white border-gray-200 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Shield className="w-4 h-4" /> Permissões
        </button>
      </div>

      {/* ── ABA LOGS ─────────────────────────────────────────────────────── */}
      {aba === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{totalCount ? `Total: ${totalCount} registros` : 'Carregando...'}</p>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline" className="gap-2 text-sm">
                <Download className="w-4 h-4" /> Exportar CSV
              </Button>
            </div>
          </div>
          {/* Paginação topo logs */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Página {page + 1} de {Math.max(1, totalPages)}</p>
            <div className="flex gap-1">
              <Button onClick={() => setPage(0)} disabled={page === 0} variant="outline" size="sm"><ChevronFirst className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="outline" size="sm"><ChevronLeft className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} variant="outline" size="sm"><ChevronRight className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} variant="outline" size="sm"><ChevronLast className="w-4 h-4" /></Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input placeholder="Buscar por ChaveJ..." value={filtroChaveJ}
                    onChange={(e) => { setFiltroChaveJ(e.target.value); setPage(0); }} className="pl-10" />
                </div>
                <Select value={filtroModulo} onValueChange={(v) => { setFiltroModulo(v); setPage(0); }}>
                  <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os módulos</SelectItem>
                    <SelectItem value="Agentes">Agentes</SelectItem>
                    <SelectItem value="Certificações">Certificações</SelectItem>
                    <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                    <SelectItem value="Operações">Operações</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Febraban">Febraban</SelectItem>
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
                    <TableRow className="bg-gray-50">
                      <TableHead>Nº Entrada</TableHead>
                      <TableHead>Nome Agente</TableHead>
                      <TableHead>ChaveJ</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Horário Entrada</TableHead>
                      <TableHead>Horário Saída</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">Carregando...</TableCell></TableRow>
                    ) : logs && logs.length > 0 ? (
                      logs.map((log: any, idx: number) => (
                        <TableRow key={log.id} className={idx % 2 === 0 ? 'bg-green-50/40' : ''}>
                          <TableCell className="font-mono text-xs">{log.numeroEntrada}</TableCell>
                          <TableCell className="font-medium">{log.nomeAgente}</TableCell>
                          <TableCell className="text-blue-700 font-medium">{log.chaveJ}</TableCell>
                          <TableCell>{log.modulo || '-'}</TableCell>
                          <TableCell>{log.acao || '-'}</TableCell>
                          <TableCell className="text-sm">{new Date(log.horarioEntrada).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-sm">{log.horarioSaida ? new Date(log.horarioSaida).toLocaleString('pt-BR') : '-'}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">{log.descricao || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">Nenhum registro encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Paginação logs */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Página {page + 1} de {Math.max(1, totalPages)}</p>
            <div className="flex gap-1">
              <Button onClick={() => setPage(0)} disabled={page === 0} variant="outline" size="sm"><ChevronFirst className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="outline" size="sm"><ChevronLeft className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} variant="outline" size="sm"><ChevronRight className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} variant="outline" size="sm"><ChevronLast className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA FERIADOS ─────────────────────────────────────────────────── */}
      {aba === 'feriados' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{feriadosList ? `${feriadosList.length} feriados em ${filtroAno}` : 'Carregando...'}</p>
            <Button onClick={abrirCriar} className="gap-2 bg-blue-700 hover:bg-blue-800 text-white">
              <Plus className="w-4 h-4" /> Novo Feriado
            </Button>
          </div>
          {/* Paginação topo feriados (navegação por ano) */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Ano: {filtroAno}</p>
            <div className="flex gap-1">
              <Button onClick={() => setFiltroAno(a => a - 1)} variant="outline" size="sm"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="px-3 py-1 text-sm font-semibold border rounded-md bg-white">{filtroAno}</span>
              <Button onClick={() => setFiltroAno(a => a + 1)} variant="outline" size="sm"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={String(filtroAno)} onValueChange={(v) => setFiltroAno(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                  <SelectContent>
                    {(anos ?? [new Date().getFullYear()]).map((a: number) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="estadual">Estadual BA</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                  </SelectContent>
                </Select>
                {/* Filtro por mês */}
                <Select value={String(filtroMes)} onValueChange={v => setFiltroMes(Number(v))}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todos os meses</SelectItem>
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                      <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Filtro por cidade */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar cidade..."
                    value={cidadeInput}
                    onChange={e => setCidadeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setFiltroCidade(cidadeInput)}
                    className="w-44"
                  />
                  <Button size="sm" variant="outline" onClick={() => setFiltroCidade(cidadeInput)}>Buscar</Button>
                  {filtroCidade && <Button size="sm" variant="ghost" onClick={() => { setFiltroCidade(''); setCidadeInput(''); }}>Limpar</Button>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paginação rodapé feriados */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Ano: {filtroAno}</p>
            <div className="flex gap-1">
              <Button onClick={() => setFiltroAno(a => a - 1)} variant="outline" size="sm"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="px-3 py-1 text-sm font-semibold border rounded-md bg-white">{filtroAno}</span>
              <Button onClick={() => setFiltroAno(a => a + 1)} variant="outline" size="sm"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Data</TableHead>
                      <TableHead>Nome do Feriado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingFeriados ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Carregando...</TableCell></TableRow>
                    ) : feriadosList && feriadosList.length > 0 ? (
                      feriadosList.map((f: Feriado, idx: number) => (
                        <TableRow key={f.id} className={idx % 2 === 0 ? 'bg-blue-50/30' : ''}>
                          <TableCell className="font-mono font-semibold">{f.data}</TableCell>
                          <TableCell className="font-medium">{f.nome}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tipoBadge(f.tipo)}`}>
                              {tipoLabel(f.tipo)}
                            </span>
                          </TableCell>
                          <TableCell>{f.estado ?? '—'}</TableCell>
                          <TableCell className="text-sm text-gray-600">{f.cidade ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => abrirEditar(f)} className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deletarFeriado.mutate({ id: f.id })} className="h-7 w-7 p-0 text-red-500 hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Nenhum feriado encontrado para {filtroAno}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── MODAL FERIADO ─────────────────────────────────────────────────── */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{feriadoEditando ? 'Editar Feriado' : 'Novo Feriado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Data (DD/MM/AAAA)</Label>
              <Input placeholder="ex: 25/12/2026" value={form.data} onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nome do Feriado</Label>
              <Input placeholder="ex: Natal" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="estadual">Estadual BA</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo !== 'nacional' && (
              <div className="space-y-1">
                <Label>Estado (sigla)</Label>
                <Input placeholder="ex: BA" maxLength={2} value={form.estado} onChange={(e) => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} />
              </div>
            )}
            {form.tipo === 'municipal' && (
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input placeholder="ex: SALVADOR" value={form.cidade} onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value.toUpperCase() }))} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Ano</Label>
              <Input type="number" value={form.ano} onChange={(e) => setForm(f => ({ ...f, ano: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvarFeriado} disabled={criarFeriado.isPending || atualizarFeriado.isPending} className="bg-blue-700 hover:bg-blue-800 text-white">
              {criarFeriado.isPending || atualizarFeriado.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── ABA CRÉDITO x DESPESAS ───────────────────────────────────── */}
      {aba === 'credito-despesas' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Mês/Ano</label>
              <Select value={cdMesAno || 'todos'} onValueChange={v => setCdMesAno(v === 'todos' ? '' : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(cdMeses || []).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Chave J</label>
              <Input
                placeholder="Filtrar por Chave J"
                value={cdChaveJ}
                onChange={e => setCdChaveJ(e.target.value)}
                className="w-44"
              />
            </div>
            <p className="text-sm text-gray-500 ml-auto">{cdDados ? `${cdDados.length} registro(s)` : ''}</p>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-max text-xs border-collapse">
              <thead>
                <tr className="bg-blue-700 text-white">
                  {/* Identificação */}
                  <th className="px-2 py-2 text-left whitespace-nowrap border-r border-blue-600">Mês/Ano</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap border-r border-blue-600">Chave J</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap border-r border-blue-600">Empresa</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap border-r border-blue-600">Agente</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap border-r border-blue-600">Cidade</th>
                  {/* RBM */}
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-blue-800">RBM Total</th>
                  {/* Créditos */}
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-green-700">Comissão</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-green-700">Ajuda Custo</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-green-700">Créditos</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-green-800 font-bold">Total Créditos</th>
                  {/* Despesas */}
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Aluguel</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Internet</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Energia</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Água</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Propaganda</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Despesas Loja</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Reembolso</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Reajuste</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Desp. Bancária</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-700">Outros</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-red-800 font-bold">Total Despesas</th>
                  {/* Saldo */}
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-yellow-700 font-bold">Saldo</th>
                  {/* RBM por produto */}
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-purple-700">RBM Total 2</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-purple-700">RBM Crédito</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-purple-700">RBM C/C</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-purple-700">RBM Consórcio</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap border-r border-blue-600 bg-purple-700">RBM OuroCap</th>
                  <th className="px-2 py-2 text-right whitespace-nowrap bg-purple-700">RBM Seguros</th>
                </tr>
              </thead>
              <tbody>
                {cdLoading ? (
                  <tr><td colSpan={28} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                ) : !cdDados || cdDados.length === 0 ? (
                  <tr><td colSpan={28} className="text-center py-8 text-gray-400">Nenhum registro encontrado</td></tr>
                ) : (
                  cdDados.map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-200 font-medium">{row.mesAno}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-200">{row.chaveJ}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-200">{row.empresa}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-200 max-w-[180px] truncate">{row.agente}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-200">{row.cidade}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 font-medium text-blue-800">{fmtCD(row.rbmTotal)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-green-700">{fmtCD(row.comissao)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-green-700">{fmtCD(row.ajudaCusto)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-green-700">{fmtCD(row.creditos)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 font-bold text-green-800">{fmtCD(row.totalCreditos)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.aluguel)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.internet)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.energia)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.agua)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.propaganda)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.despesasLoja)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.reembolso)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.reajuste)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.despesaBancaria)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-red-600">{fmtCD(row.outros)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 font-bold text-red-800">{fmtCD(row.totalDespesas)}</td>
                      <td className={`px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 font-bold ${row.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtCD(row.saldo)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-purple-700">{fmtCD(row.rbmTotal2)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-purple-700">{fmtCD(row.rbmCredito)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-purple-700">{fmtCD(row.rbmCC)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-purple-700">{fmtCD(row.rbmConsorcio)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap border-r border-gray-200 text-purple-700">{fmtCD(row.rbmOurocap)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap text-purple-700">{fmtCD(row.rbmSeguros)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA PERMISSÕES ──────────────────────────────────────────────── */}
      {aba === 'permissoes' && (
        <div className="mt-4">
          <AuditoriaPermissoes />
        </div>
      )}
    </div>
  );
}
