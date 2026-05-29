import { useState, useEffect, useRef } from 'react';
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
import { Download, Search, CalendarDays, ClipboardList, Plus, Pencil, Trash2, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, BarChart2, Shield, Activity, Users, Clock, Filter, X, LogOut, RefreshCw, Wallet, Lock, Eye, EyeOff, AlertTriangle, DatabaseBackup, Mail, CheckCircle2, Unlock, UserX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
  const [aba, setAba] = useState<'logs' | 'feriados' | 'credito-despesas' | 'permissoes' | 'despesas-internas' | 'backup' | 'bloqueios'>(
    abaParam === 'feriados' ? 'feriados' : abaParam === 'credito-despesas' ? 'credito-despesas' : abaParam === 'permissoes' ? 'permissoes' : abaParam === 'despesas-internas' ? 'despesas-internas' : abaParam === 'backup' ? 'backup' : abaParam === 'bloqueios' ? 'bloqueios' : 'logs'
  );

  // Atualiza aba quando o parâmetro de URL muda
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('aba');
    if (p === 'feriados') setAba('feriados');
    else if (p === 'credito-despesas') setAba('credito-despesas');
    else if (p === 'permissoes') setAba('permissoes');
    else if (p === 'despesas-internas') setAba('despesas-internas');
    else if (p === 'backup') setAba('backup');
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
  const { user } = useAuth();
  const isCeo = user && (['admin', 'CEO', 'ADM'].includes((user as any).cargo?.toUpperCase?.() ?? '') || (user as any).role === 'admin');
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: modulosDisponiveis } = trpc.auditoria.modulos.useQuery();
  const { data: stats } = trpc.auditoria.stats.useQuery(undefined, { refetchInterval: 30000 });
  const { data: sessoesAtivas, refetch: refetchSessoes } = trpc.auditoria.sessoesAtivas.useQuery(undefined, { refetchInterval: 15000 });
  const desconectarSessao = trpc.auditoria.desconectarSessao.useMutation({
    onSuccess: () => { toast.success('Sessão encerrada!'); refetchSessoes(); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const queryParams = {
    chaveJ: filtroChaveJ || undefined,
    nomeAgente: filtroNome || undefined,
    modulo: filtroModulo && filtroModulo !== 'todos' ? filtroModulo : undefined,
    acao: filtroAcao || undefined,
    dataInicio: filtroDataInicio || undefined,
    dataFim: filtroDataFim || undefined,
  };

  const { data: logs, isLoading: loadingLogs } = trpc.auditoria.list.useQuery({
    ...queryParams,
    limit,
    offset: page * limit,
  });

  const { data: totalCount } = trpc.auditoria.count.useQuery(queryParams);

  const totalPages = totalCount ? Math.ceil(totalCount / limit) : 0;

  const limparFiltros = () => {
    setFiltroChaveJ('');
    setFiltroNome('');
    setFiltroModulo('');
    setFiltroAcao('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setPage(0);
  };

  const temFiltroAtivo = filtroChaveJ || filtroNome || (filtroModulo && filtroModulo !== 'todos') || filtroAcao || filtroDataInicio || filtroDataFim;

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

  // ── HELPERS LOGS ──
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

  const moduloBadge = (modulo: string | null | undefined) => {
    const m = modulo || '-';
    const map: Record<string, string> = {
      'Agentes': 'bg-blue-100 text-blue-800',
      'Certificações': 'bg-purple-100 text-purple-800',
      'Fornecedores': 'bg-yellow-100 text-yellow-800',
      'Operações': 'bg-green-100 text-green-800',
      'Financeiro': 'bg-emerald-100 text-emerald-800',
      'Febraban': 'bg-indigo-100 text-indigo-800',
      'Auditoria': 'bg-gray-100 text-gray-800',
      'Login': 'bg-orange-100 text-orange-800',
      'dashboard': 'bg-slate-100 text-slate-700',
    };
    return map[m] ?? 'bg-gray-100 text-gray-600';
  };

  const acaoBadge = (acao: string | null | undefined) => {
    const a = (acao || '').toLowerCase();
    if (a.includes('login') || a.includes('entrou')) return 'bg-green-100 text-green-800';
    if (a.includes('logout') || a.includes('saiu')) return 'bg-red-100 text-red-800';
    if (a.includes('edit') || a.includes('atualiz')) return 'bg-yellow-100 text-yellow-800';
    if (a.includes('cri') || a.includes('adicion') || a.includes('insert')) return 'bg-blue-100 text-blue-800';
    if (a.includes('delet') || a.includes('remov') || a.includes('exclu')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-600';
  };

  const fmtDuracao = (entrada: any, saida: any) => {
    if (!saida) return null;
    const diff = new Date(saida).getTime() - new Date(entrada).getTime();
    const min = Math.floor(diff / 60000);
    const seg = Math.floor((diff % 60000) / 1000);
    if (min >= 60) return `${Math.floor(min/60)}h${min%60}m`;
    if (min > 0) return `${min}m${seg}s`;
    return `${seg}s`;
  };

  const tempoOnline = (ultimoAcesso: any) => {
    const diff = Date.now() - new Date(ultimoAcesso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min}min`;
    return `há ${Math.floor(min/60)}h${min%60}m`;
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
        {/* Aba Despesas Internas — só aparece para Sidnei e Thiago */}
        <DespesasInternasAbaBtn aba={aba} setAba={setAba} />
        {/* Aba Bloqueios — só aparece para admin/CEO */}
        <BloqueiosAbaBtn aba={aba} setAba={setAba} />
        {/* Aba Backup — só aparece para admin/CEO */}
        <BackupAbaBtn aba={aba} setAba={setAba} />
      </div>

      {/* ── ABA LOGS ─────────────────────────────────────────────────────────────────── */}
      {aba === 'logs' && (
        <div className="space-y-4">

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <div className="text-xs text-blue-600 font-medium">Hoje</div>
                <div className="text-xl font-bold text-blue-800">{stats?.totalHoje ?? '-'}</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <div className="text-xs text-green-600 font-medium">7 dias</div>
                <div className="text-xl font-bold text-green-800">{stats?.totalSemana ?? '-'}</div>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-purple-500 shrink-0" />
              <div>
                <div className="text-xs text-purple-600 font-medium">Mês atual</div>
                <div className="text-xl font-bold text-purple-800">{stats?.totalMes ?? '-'}</div>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs text-emerald-600 font-medium">Online agora</div>
                <div className="text-xl font-bold text-emerald-800">{sessoesAtivas?.length ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Painel de sessões ativas */}
          {sessoesAtivas && sessoesAtivas.length > 0 && (
            <div className="bg-white border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="font-semibold text-sm text-emerald-800">Sessões Ativas ({sessoesAtivas.length})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchSessoes()} className="h-7 gap-1 text-xs text-gray-500">
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sessoesAtivas.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                    <span className="font-mono text-[11px] text-blue-700 font-semibold">{s.chaveJ}</span>
                    <span className="text-[11px] text-gray-700">{s.nomeAgente}</span>
                    {s.modulo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{s.modulo}</span>}
                    <span className="text-[10px] text-gray-400">{tempoOnline(s.ultimoAcesso)}</span>
                    {isCeo && (
                      <button
                        onClick={() => desconectarSessao.mutate({ sessaoId: s.id })}
                        className="text-red-400 hover:text-red-600 transition-colors ml-1"
                        title="Desconectar"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros avançados */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtros</span>
                {temFiltroAtivo && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">ativos</span>}
              </div>
              {temFiltroAtivo && (
                <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-7 gap-1 text-xs text-red-500 hover:text-red-700">
                  <X className="w-3 h-3" /> Limpar filtros
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <Input
                placeholder="ChaveJ..."
                value={filtroChaveJ}
                onChange={e => { setFiltroChaveJ(e.target.value); setPage(0); }}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Nome agente..."
                value={filtroNome}
                onChange={e => { setFiltroNome(e.target.value); setPage(0); }}
                className="h-8 text-sm"
              />
              <Select value={filtroModulo || 'todos'} onValueChange={v => { setFiltroModulo(v === 'todos' ? '' : v); setPage(0); }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Módulo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os módulos</SelectItem>
                  {(modulosDisponiveis ?? []).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Ação..."
                value={filtroAcao}
                onChange={e => { setFiltroAcao(e.target.value); setPage(0); }}
                className="h-8 text-sm"
              />
              <Input
                placeholder="De: DD/MM/AAAA"
                value={filtroDataInicio}
                onChange={e => { setFiltroDataInicio(e.target.value); setPage(0); }}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Até: DD/MM/AAAA"
                value={filtroDataFim}
                onChange={e => { setFiltroDataFim(e.target.value); setPage(0); }}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Barra de ações e paginação topo */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {totalCount != null ? <><strong>{totalCount}</strong> registro{totalCount !== 1 ? 's' : ''}</> : 'Carregando...'}
              {temFiltroAtivo && <span className="text-blue-600 ml-1">(filtrado)</span>}
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1 text-xs h-8">
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <div className="flex gap-1">
                <Button onClick={() => setPage(0)} disabled={page === 0} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronFirst className="w-4 h-4" /></Button>
                <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
                <span className="px-2 py-1 text-xs border rounded bg-white">{page + 1}/{Math.max(1, totalPages)}</span>
                <Button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
                <Button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLast className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          {/* Tabela de logs */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Agente</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Módulo / Ação</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Horário</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Duração</th>
                  <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                ) : logs && logs.length > 0 ? (
                  logs.map((log: any, idx: number) => (
                    <tr key={log.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-blue-50/30 hover:bg-blue-100/40'}>
                      {/* Coluna Agente */}
                      <td className="px-3 py-1.5">
                        <div className="font-mono text-[11px] text-blue-700 font-semibold">{log.chaveJ}</div>
                        <div className="text-[11px] text-gray-700">{log.nomeAgente}</div>
                        {log.ipAddress && <div className="text-[10px] text-gray-400">{log.ipAddress}</div>}
                      </td>
                      {/* Coluna Módulo/Ação */}
                      <td className="px-3 py-1.5">
                        {log.modulo && (
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium mb-0.5 ${moduloBadge(log.modulo)}`}>
                            {log.modulo}
                          </span>
                        )}
                        {log.acao && (
                          <div>
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${acaoBadge(log.acao)}`}>
                              {log.acao}
                            </span>
                          </div>
                        )}
                      </td>
                      {/* Coluna Horário */}
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="text-[11px] text-gray-800">{new Date(log.horarioEntrada).toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] text-gray-500">{new Date(log.horarioEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      </td>
                      {/* Coluna Duração */}
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {fmtDuracao(log.horarioEntrada, log.horarioSaida)
                          ? <span className="text-[11px] text-emerald-700 font-medium">{fmtDuracao(log.horarioEntrada, log.horarioSaida)}</span>
                          : <span className="text-[10px] text-gray-400">em andamento</span>
                        }
                      </td>
                      {/* Coluna Descrição */}
                      <td className="px-3 py-1.5 max-w-xs">
                        <div className="text-[11px] text-gray-600 truncate" title={log.descricao || ''}>{log.descricao || '-'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{log.numeroEntrada}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum registro encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação rodapé */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Página {page + 1} de {Math.max(1, totalPages)}</p>
            <div className="flex gap-1">
              <Button onClick={() => setPage(0)} disabled={page === 0} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronFirst className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
              <Button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLast className="w-4 h-4" /></Button>
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

      {/* ── ABA DESPESAS INTERNAS ──────────────────────────────────────── */}
      {aba === 'despesas-internas' && <DespesasInternasAba />}
      {/* ── ABA BLOQUEIOS ──────────────────────────────────────────────────────────── */}
      {aba === 'bloqueios' && <BloqueiosAba />}
      {/* ── ABA BACKUP ─────────────────────────────────────────────────────────────── */}
      {aba === 'backup' && <BackupAba />}
    </div>
  );
}

// ─── BOTÃO DA ABA DESPESAS INTERNAS (só renderiza se tiver acesso) ────────────
function DespesasInternasAbaBtn({ aba, setAba }: { aba: string; setAba: (v: any) => void }) {
  const { user } = useAuth();
  // Consulta o servidor para verificar se o agente tem cargo CEO ou permissoes admin
  const { data: acesso, isLoading } = trpc.despesasInternas.verificarAcesso.useQuery(
    undefined,
    { enabled: !!user, retry: false }
  );
  // Enquanto carrega ou sem acesso, não renderiza o botão
  if (isLoading || !acesso?.temAcesso) return null;
  return (
    <button
      onClick={() => setAba('despesas-internas')}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
        aba === 'despesas-internas' ? 'bg-white border border-b-white border-gray-200 text-red-700' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Wallet className="w-4 h-4" /> Despesas Internas
    </button>
  );
}

// ─── ABA DESPESAS INTERNAS ────────────────────────────────────────────────────
const CATEGORIAS_DESPESAS = [
  'Pro-labore',
  'Cartão de Crédito',
  'Veículos',
  'Imóvel',
  'Colégio',
  'Seguros',
  'Outros',
];

type DespesaInterna = {
  id: number;
  mesAno: string;
  categoria: string;
  descricao: string | null;
  valor: string;
  dataLancamento: string | null;
  lancadoPor: string | null;
  observacao: string | null;
  createdAt: Date;
};

function DespesasInternasAba() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  // A proteção é feita pela senha CEO — qualquer um vê a tela de senha, mas só CEO desbloqueia
  // Segunda senha CEO
  const [senhaDesbloqueada, setSenhaDesbloqueada] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const validarSenha = trpc.despesasInternas.validarSenhaCeo.useMutation({
    onSuccess: () => { setSenhaDesbloqueada(true); setErroSenha(''); toast.success('Acesso liberado!'); },
    onError: (e) => setErroSenha(e.message),
  });
  // Filtro de mês
  const [filtroMes, setFiltroMes] = useState('');
  const { data: despesas, isLoading } = trpc.despesasInternas.listar.useQuery(
    { mesAno: filtroMes || undefined },
    { enabled: senhaDesbloqueada }
  );
  // Modal novo/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<DespesaInterna | null>(null);
  const [form, setForm] = useState({ mesAno: '', categoria: '', descricao: '', valor: '', dataLancamento: '', observacao: '' });
  const criarMutation = trpc.despesasInternas.criar.useMutation({
    onSuccess: () => { utils.despesasInternas.listar.invalidate(); setModalAberto(false); toast.success('Despesa lançada!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
  const editarMutation = trpc.despesasInternas.editar.useMutation({
    onSuccess: () => { utils.despesasInternas.listar.invalidate(); setModalAberto(false); toast.success('Despesa atualizada!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
  const excluirMutation = trpc.despesasInternas.excluir.useMutation({
    onSuccess: () => { utils.despesasInternas.listar.invalidate(); toast.success('Despesa excluída!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
  const fmt = (v: string | number) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  };
  const totalMes = (despesas ?? []).reduce((acc: number, d: DespesaInterna) => acc + parseFloat(d.valor ?? '0'), 0);
  const abrirNovo = () => {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    setEditando(null);
    setForm({ mesAno: `${mes}/${agora.getFullYear()}`, categoria: '', descricao: '', valor: '', dataLancamento: '', observacao: '' });
    setModalAberto(true);
  };
  const abrirEditar = (d: DespesaInterna) => {
    setEditando(d);
    setForm({ mesAno: d.mesAno, categoria: d.categoria, descricao: d.descricao ?? '', valor: d.valor, dataLancamento: d.dataLancamento ?? '', observacao: d.observacao ?? '' });
    setModalAberto(true);
  };
  const salvar = () => {
    const payload = {
      mesAno: form.mesAno,
      categoria: form.categoria,
      descricao: form.descricao || undefined,
      valor: parseFloat(form.valor.replace(',', '.')),
      dataLancamento: form.dataLancamento || undefined,
      observacao: form.observacao || undefined,
    };
    if (editando) editarMutation.mutate({ id: editando.id, ...payload });
    else criarMutation.mutate(payload);
  };

  if (!senhaDesbloqueada) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-5">
          <div className="bg-red-100 rounded-full p-4">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Área Restrita</h2>
            <p className="text-gray-500 text-sm mt-1">Informe a senha CEO para acessar as Despesas Internas</p>
          </div>
          <div className="w-full space-y-2">
            <Label className="text-sm font-medium">Senha CEO</Label>
            <div className="relative">
              <Input
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Digite a senha CEO"
                value={senhaInput}
                onChange={e => setSenhaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && validarSenha.mutate({ senha: senhaInput })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {erroSenha && <p className="text-red-500 text-xs">{erroSenha}</p>}
          </div>
          <Button
            onClick={() => validarSenha.mutate({ senha: senhaInput })}
            disabled={!senhaInput || validarSenha.isPending}
            className="w-full bg-red-700 hover:bg-red-800 text-white"
          >
            {validarSenha.isPending ? 'Verificando...' : 'Desbloquear'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 rounded-lg p-2">
            <Wallet className="w-6 h-6 text-red-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Despesas Internas</h2>
            <p className="text-xs text-gray-500">Acesso restrito — Diretoria</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Filtrar por Mês</label>
            <Input
              placeholder="MM/AAAA"
              value={filtroMes}
              onChange={e => setFiltroMes(e.target.value)}
              className="w-36 text-sm"
            />
          </div>
          <Button onClick={abrirNovo} className="gap-2 bg-red-700 hover:bg-red-800 text-white mt-4">
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIAS_DESPESAS.slice(0, 4).map(cat => {
          const total = (despesas ?? []).filter((d: DespesaInterna) => d.categoria === cat).reduce((acc: number, d: DespesaInterna) => acc + parseFloat(d.valor ?? '0'), 0);
          return (
            <div key={cat} className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium truncate">{cat}</p>
              <p className="text-lg font-bold text-red-800">{fmt(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-700 text-white">
                    <TableHead className="text-white font-semibold">Mês/Ano</TableHead>
                    <TableHead className="text-white font-semibold">Categoria</TableHead>
                    <TableHead className="text-white font-semibold">Descrição</TableHead>
                    <TableHead className="text-white font-semibold">Data</TableHead>
                    <TableHead className="text-white font-semibold">Lançado por</TableHead>
                    <TableHead className="text-white font-semibold text-right">Valor</TableHead>
                    <TableHead className="text-white font-semibold">Obs.</TableHead>
                    <TableHead className="text-white font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(despesas ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Nenhuma despesa lançada</TableCell></TableRow>
                  ) : (
                    (despesas ?? []).map((d: DespesaInterna) => (
                      <TableRow key={d.id} className="hover:bg-red-50">
                        <TableCell className="font-mono font-semibold">{d.mesAno}</TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">{d.categoria}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 max-w-[180px] truncate">{d.descricao ?? '—'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{d.dataLancamento ?? '—'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{d.lancadoPor ?? '—'}</TableCell>
                        <TableCell className="text-right font-bold text-red-700">{fmt(d.valor)}</TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[120px] truncate">{d.observacao ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => abrirEditar(d)} className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => excluirMutation.mutate({ id: d.id })} className="h-7 w-7 p-0 text-red-500 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t bg-red-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">{(despesas ?? []).length} registro(s)</span>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total do Período</p>
                <p className="font-bold text-red-700 text-lg">{fmt(totalMes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Novo/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-red-700" />
              {editando ? 'Editar Despesa Interna' : 'Nova Despesa Interna'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mês/Ano</Label>
                <Input placeholder="MM/AAAA" value={form.mesAno} onChange={e => setForm(f => ({ ...f, mesAno: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data Lançamento</Label>
                <Input placeholder="DD/MM/AAAA" value={form.dataLancamento} onChange={e => setForm(f => ({ ...f, dataLancamento: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESAS.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input placeholder="Descrição da despesa" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Input placeholder="Observação adicional" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button
              onClick={salvar}
              disabled={!form.mesAno || !form.categoria || !form.valor || criarMutation.isPending || editarMutation.isPending}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              {criarMutation.isPending || editarMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ─── BOTÃO DA ABA BLOQUEIOS (só aparece para admin/CEO) ──────────────────────
function BloqueiosAbaBtn({ aba, setAba }: { aba: string; setAba: (v: any) => void }) {
  const { user } = useAuth();
  const cargo = ((user as any)?.cargo ?? '').toUpperCase();
  const permissoes = (user as any)?.permissoes ?? '';
  const role = (user as any)?.role ?? '';
  const temAcesso = role === 'admin' || ['CEO', 'ADM', 'ADMIN'].includes(cargo) || permissoes === 'admin';
  if (!temAcesso) return null;
  return (
    <button
      onClick={() => setAba('bloqueios')}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
        aba === 'bloqueios' ? 'bg-white border border-b-white border-gray-200 text-red-700' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Lock className="w-4 h-4" /> Bloqueios
    </button>
  );
}
// ─── ABA BLOQUEIOS ────────────────────────────────────────────────────────────
function BloqueiosAba() {
  const utils = trpc.useUtils();
  const { data: bloqueados = [], isLoading, refetch } = trpc.admin.getBlockedAgents.useQuery();
  const unlockMutation = trpc.admin.unlockAgent.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.admin.getBlockedAgents.invalidate();
    },
    onError: () => toast.error('Erro ao desbloquear agente'),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800 text-base">Agentes Bloqueados por Tentativas de Login</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
          </Button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Agentes são bloqueados automaticamente após 3 tentativas de login com senha incorreta. Clique em <strong>Desbloquear</strong> para liberar o acesso.
        </p>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Carregando...</div>
        ) : (bloqueados as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
            <p className="text-sm font-medium text-green-600">Nenhum agente bloqueado no momento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="text-left px-4 py-2 font-semibold rounded-tl-lg">Chave J</th>
                  <th className="text-left px-4 py-2 font-semibold">Tentativas</th>
                  <th className="text-left px-4 py-2 font-semibold">Bloqueado em</th>
                  <th className="text-left px-4 py-2 font-semibold">Bloqueado até</th>
                  <th className="text-right px-4 py-2 font-semibold rounded-tr-lg">Ação</th>
                </tr>
              </thead>
              <tbody>
                {(bloqueados as any[]).map((b: any) => (
                  <tr key={b.chaveJ} className="border-b hover:bg-red-50/30">
                    <td className="px-4 py-3 font-mono font-semibold text-red-700">{b.chaveJ}</td>
                    <td className="px-4 py-3">
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {b.attempts} tentativas
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {b.updatedAt ? new Date(b.updatedAt).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {b.blockedUntil ? new Date(b.blockedUntil).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => unlockMutation.mutate({ chaveJ: b.chaveJ })}
                        disabled={unlockMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Unlock className="w-3 h-3 mr-1" /> Desbloquear
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-800">
          <strong>Dica:</strong> Ao desbloquear um agente, o contador de tentativas é zerado. Se o agente continuar errando a senha, será bloqueado novamente após 3 novas tentativas.
        </p>
      </div>
    </div>
  );
}
// ─── BOTÃO DA ABA BACKUP (só aparece para admin/CEO) ─────────────────────────
function BackupAbaBtn({ aba, setAba }: { aba: string; setAba: (v: any) => void }) {
  const { user } = useAuth();
  const cargo = ((user as any)?.cargo ?? '').toUpperCase();
  const permissoes = (user as any)?.permissoes ?? '';
  const role = (user as any)?.role ?? '';
  const temAcesso = role === 'admin' || ['CEO', 'ADM', 'ADMIN'].includes(cargo) || permissoes === 'admin';
  if (!temAcesso) return null;
  return (
    <button
      onClick={() => setAba('backup')}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
        aba === 'backup' ? 'bg-white border border-b-white border-gray-200 text-emerald-700' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <DatabaseBackup className="w-4 h-4" /> Backup
    </button>
  );
}

// ─── ABA BACKUP ───────────────────────────────────────────────────────────────
function BackupAba() {
  const gerarMutation = trpc.backup.gerar.useMutation();
  const emailMutation = trpc.backup.enviarEmail.useMutation();
  const [ultimoBackup, setUltimoBackup] = useState<{ tabelas: number; tamanhoKB: number; dataHora: string } | null>(null);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const handleDownload = async () => {
    try {
      const result = await gerarMutation.mutateAsync();
      const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      setUltimoBackup({ tabelas: result.tabelas, tamanhoKB: result.tamanhoKB, dataHora });

      // Converter base64 para blob e fazer download
      const byteChars = atob(result.base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-gff-${dataHora.replace(/[/:]/g, '-').replace(/ /g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup gerado com sucesso! ${result.tabelas} tabelas, ${result.tamanhoKB} KB`);
    } catch (e: any) {
      toast.error('Erro ao gerar backup: ' + (e?.message ?? 'Erro desconhecido'));
    }
  };

  const handleEmail = async () => {
    try {
      const result = await emailMutation.mutateAsync();
      setEmailEnviado(true);
      toast.success(`Backup enviado para ${result.email}`);
    } catch (e: any) {
      toast.error('Erro ao enviar e-mail: ' + (e?.message ?? 'Erro desconhecido'));
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <DatabaseBackup className="w-7 h-7 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Backup do Sistema</h2>
            <p className="text-sm text-gray-500">Exportação completa de todas as tabelas do banco de dados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card Download */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-emerald-700" />
              <h3 className="font-semibold text-emerald-800">Download Manual</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Gera um arquivo ZIP com todas as tabelas em formato Excel (.xlsx). Faça o download agora e guarde em local seguro.
            </p>
            <div className="text-xs text-gray-500 mb-4 space-y-1">
              <p>• Agentes • Febraban • Consignados • Contas Correntes</p>
              <p>• Consórcios • OuroCap • Seguros • BB Dental</p>
              <p>• Despesas Fixas • Despesas Internas • Certificações</p>
              <p>• Feriados • Pagamentos • Auditoria</p>
            </div>
            <Button
              onClick={handleDownload}
              disabled={gerarMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {gerarMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Gerando backup...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Baixar Backup Agora</>
              )}
            </Button>
          </div>

          {/* Card E-mail */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-blue-700" />
              <h3 className="font-semibold text-blue-800">Enviar por E-mail</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Envia o backup completo para o e-mail cadastrado do sistema.
            </p>
            <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 mb-4 text-sm font-mono text-blue-800">
              ultramare@gmail.com
            </div>
            <p className="text-xs text-gray-500 mb-4">
              O arquivo ZIP será enviado como anexo. Certifique-se de que as configurações de SMTP estão ativas no sistema.
            </p>
            <Button
              onClick={handleEmail}
              disabled={emailMutation.isPending}
              variant="outline"
              className="w-full border-blue-400 text-blue-700 hover:bg-blue-50 font-semibold"
            >
              {emailMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : emailEnviado ? (
                <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> E-mail Enviado!</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Enviar por E-mail</>
              )}
            </Button>
          </div>
        </div>

        {/* Último backup */}
        {ultimoBackup && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Último backup gerado:</span>{' '}
              <span className="text-gray-600">{ultimoBackup.dataHora}</span>
              <span className="text-gray-400 ml-2">• {ultimoBackup.tabelas} tabelas • {ultimoBackup.tamanhoKB} KB</span>
            </div>
          </div>
        )}

        {/* Aviso */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-800">
            <strong>Recomendação:</strong> Faça backup pelo menos uma vez por semana e guarde os arquivos em local seguro (Google Drive, HD externo, etc.). O banco de dados do sistema não possui recuperação automática em caso de perda acidental de dados.
          </p>
        </div>
      </div>
    </div>
  );
}
