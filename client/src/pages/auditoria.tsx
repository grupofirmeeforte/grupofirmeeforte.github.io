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
import { Download, Search, ArrowLeft, CalendarDays, ClipboardList, Plus, Pencil, Trash2, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

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
  const [aba, setAba] = useState<'logs' | 'feriados'>(abaParam === 'feriados' ? 'feriados' : 'logs');

  // Atualiza aba quando o parâmetro de URL muda
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('aba');
    if (p === 'feriados') setAba('feriados');
    else setAba('logs');
  }, [window.location.search]);

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditoria</h1>
          <p className="text-gray-500 mt-1 text-sm">Logs de acesso e feriados do sistema</p>
        </div>
        <Button onClick={() => navigate('/')} className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-900">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
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
    </div>
  );
}
