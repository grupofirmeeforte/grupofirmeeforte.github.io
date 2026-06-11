import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, Search, Phone, MapPin, FileText, CheckCircle,
  AlertCircle, Clock, RefreshCw, TrendingUp, Users, Percent, PhoneOff, Copy, Pencil, Check, X
} from "lucide-react";
import { useLocation } from "wouter";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

type Aba = 'upload' | 'relatorio' | 'crm';

export default function ContratosPage() {
  useRegistrarModulo('Contratos');
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [aba, setAba] = useState<Aba>('relatorio');
  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroAgente, setFiltroAgente] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroLinha, setFiltroLinha] = useState('');
  const [filtroAgencia, setFiltroAgencia] = useState('');
  const [showContatosDetalhe, setShowContatosDetalhe] = useState(false);
  const [apenasElegiveis, setApenasElegiveis] = useState(false);
  const [substituirDuplicatas, setSubstituirDuplicatas] = useState(true);
  const [page, setPage] = useState(1);

  // Buscar nomes de agências BB para exibir tooltip no filtro
  const { data: agenciasBbData } = trpc.agenciasBb.buscar.useQuery(
    { busca: filtroAgencia, limit: 1 },
    { enabled: filtroAgencia.length >= 3 }
  );
  // Mapa prefixo -> nome para lookup rápido nas células
  const { data: todasAgencias } = trpc.agenciasBb.buscar.useQuery(
    { busca: '', limit: 5000 },
    { staleTime: 3600000 }
  );
  const agenciaNomeMap = new Map<string, string>(
    (todasAgencias?.agencias ?? []).map((a: any) => [String(a.prefixo).padStart(4, '0'), a.nome])
  );

  const { data, isLoading, refetch } = trpc.contratos.listar.useQuery({
    nomeCliente: busca || undefined,
    nomeOperador: filtroAgente || undefined,
    cidade: filtroCidade || undefined,
    empresa: filtroEmpresa || undefined,
    linhaCredito: filtroLinha || undefined,
    apenasElegiveis,
    page,
    pageSize: 50,
  });

  // Filtro de agência aplicado no frontend (após cruzamento)
  const rowsFiltrados = filtroAgencia
    ? (data?.rows ?? []).filter((r: any) => {
        const ag = String(r.agencia ?? '').padStart(4, '0');
        return ag.includes(filtroAgencia.padStart(filtroAgencia.length, '0'));
      })
    : (data?.rows ?? []);

  const { data: stats } = trpc.contratos.estatisticas.useQuery();
  // Verificar telefones na lista Não Perturbe
  const todosTelefones = (data?.rows ?? []).flatMap((r: any) => r.telefones ?? []);
  const { data: naoPerturbeData } = trpc.naoPerturbe.verificar.useQuery(
    { telefones: todosTelefones },
    { enabled: todosTelefones.length > 0, staleTime: 60000 }
  );
  const telefonesNaoPerturbe = new Set(naoPerturbeData?.bloqueados ?? []);

  // Verificar CPFs na lista Não Pertube
  const cpfsDosContratos = useMemo(() => {
    return (data?.rows ?? []).map((r: any) => r.cpfCliente ?? '').filter(Boolean);
  }, [data?.rows]);
  const { data: naoPerturbeDataCpf } = trpc.naoPerturbe.verificarCpfs.useQuery(
    { cpfs: cpfsDosContratos },
    { enabled: cpfsDosContratos.length > 0, staleTime: 60000 }
  );
  const cpfsBloqueados = useMemo(() => {
    const map = new Map<string, string>();
    naoPerturbeDataCpf?.bloqueados.forEach((b: any) => {
      const norm = b.cpf.replace(/\D/g, '');
      map.set(norm, b.motivo ?? 'NÃO PERTUBE');
    });
    return map;
  }, [naoPerturbeDataCpf]);

  // Filtro Não Pertube
  const [filtroNaoPerturbe, setFiltroNaoPerturbe] = useState<'todos' | 'bloqueados' | 'liberados'>('todos');

  const uploadLoteMutation = trpc.contratos.uploadLote.useMutation();
  const atualizarMutation = trpc.contratos.atualizar.useMutation();
  const atualizarCrmMutation = trpc.contratos.atualizarCrm.useMutation();
  const deletarMutation = trpc.contratos.deletar.useMutation();
  const utils = trpc.useUtils();

  // Estado de edição CRM (anotação + data contato)
  const [editandoCrmId, setEditandoCrmId] = useState<number | null>(null);
  const [crmForm, setCrmForm] = useState({ anotacaoCrm: '', dataContatoCrm: '' });

  const abrirEdicaoCrm = (r: any) => {
    setEditandoCrmId(r.id);
    setCrmForm({
      anotacaoCrm: r.anotacaoCrm ?? '',
      dataContatoCrm: r.dataContatoCrm ?? '',
    });
  };

  const salvarCrm = async () => {
    if (editandoCrmId === null) return;
    try {
      await atualizarCrmMutation.mutateAsync({
        id: editandoCrmId,
        anotacaoCrm: crmForm.anotacaoCrm || null,
        dataContatoCrm: crmForm.dataContatoCrm || null,
      });
      utils.contratos.listar.invalidate();
      setEditandoCrmId(null);
      toast.success('Anotação salva!');
    } catch {
      toast.error('Erro ao salvar anotação.');
    }
  };

  // Estado de edição
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    empresa: string; nomeCliente: string; nomeConvenio: string;
    nomeOperador: string; chaveJOperador: string;
    dataPrimeiraParcela: string; dataUltimaParcela: string; telefoneManuais: string;
    situacao: string;
  }>({ empresa: '', nomeCliente: '', nomeConvenio: '', nomeOperador: '', chaveJOperador: '',
       dataPrimeiraParcela: '', dataUltimaParcela: '', telefoneManuais: '', situacao: '' });

  // Estado de exclusão com senha CEO
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [senhaCeo, setSenhaCeo] = useState('');

  // Estado de edição inline de telefone
  const [editTelId, setEditTelId] = useState<number | null>(null);
  const [editTelVal, setEditTelVal] = useState('');

  const abrirEditTel = (r: any) => {
    setEditTelId(r.id);
    setEditTelVal(r.telefoneManuais ?? '');
  };

  const salvarTelInline = async (id: number) => {
    try {
      await atualizarMutation.mutateAsync({ id, telefoneManuais: editTelVal });
      toast.success('Telefone salvo!');
      setEditTelId(null);
      utils.contratos.listar.invalidate();
    } catch {
      toast.error('Erro ao salvar telefone.');
    }
  };

  const abrirEdicao = (r: any) => {
    setEditandoId(r.id);
    setEditForm({
      empresa: r.empresa ?? '',
      nomeCliente: r.nomeCliente ?? '',
      nomeConvenio: r.nomeConvenio ?? '',
      nomeOperador: r.nomeOperador ?? '',
      chaveJOperador: r.chaveJOperador ?? '',
      dataPrimeiraParcela: r.dataPrimeiraParcela ?? '',
      dataUltimaParcela: r.dataUltimaParcela ?? '',
      telefoneManuais: r.telefoneManuais ?? '',
      situacao: (r as any).situacao ?? '',
    });
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    try {
      await atualizarMutation.mutateAsync({ id: editandoId, ...editForm });
      toast.success('Contrato atualizado!');
      setEditandoId(null);
      utils.contratos.listar.invalidate();
    } catch { toast.error('Erro ao salvar'); }
  };

  const confirmarExclusao = async () => {
    if (!deletandoId) return;
    try {
      await deletarMutation.mutateAsync({ id: deletandoId, senhaCeo });
      toast.success('Contrato excluído.');
      setDeletandoId(null);
      setSenhaCeo('');
      utils.contratos.listar.invalidate();
      utils.contratos.estatisticas.invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao excluir');
    }
  };

  const fileParaBase64 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let bin = '';
    for (let j = 0; j < bytes.byteLength; j++) bin += String.fromCharCode(bytes[j]);
    return btoa(bin);
  };

  const handleUpload = async (files: FileList) => {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      toast.error('Nenhum PDF selecionado');
      return;
    }

    setUploading(true);
    setProgresso({ atual: 0, total: pdfs.length });
    let ok = 0, erros = 0;

    // Processar em lotes de 20 em paralelo
    const LOTE = 20;
    for (let i = 0; i < pdfs.length; i += LOTE) {
      const lote = pdfs.slice(i, i + LOTE);
      try {
        const arquivos = await Promise.all(
          lote.map(async (f) => ({
            fileBase64: await fileParaBase64(f),
            nomeArquivo: f.name,
          }))
        );
        const res = await uploadLoteMutation.mutateAsync({ arquivos, substituirDuplicatas });
        ok += res.ok;
        erros += res.erros;
      } catch {
        erros += lote.length;
      }
      setProgresso({ atual: Math.min(i + LOTE, pdfs.length), total: pdfs.length });
    }

    setUploading(false);
    if (erros > 0) toast.error(`Upload: ${ok} OK, ${erros} com erro`);
    else toast.success(`Upload concluído: ${ok} contratos processados!`);
    refetch();
    if (ok > 0) setAba('relatorio');
  };

  const formatarMoeda = (v: string | number | null) => {
    if (v == null) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Aplicar filtro Não Pertube sobre rowsFiltrados
  const rowsComFiltroNP = useMemo(() => {
    if (filtroNaoPerturbe === 'todos') return rowsFiltrados;
    return rowsFiltrados.filter((r: any) => {
      const cpfNorm = (r.cpfCliente ?? '').replace(/\D/g, '');
      const bloqueado = cpfNorm.length === 11 && cpfsBloqueados.has(cpfNorm);
      if (filtroNaoPerturbe === 'bloqueados') return bloqueado;
      if (filtroNaoPerturbe === 'liberados') return !bloqueado;
      return true;
    });
  }, [rowsFiltrados, filtroNaoPerturbe, cpfsBloqueados]);

  const rows = rowsComFiltroNP;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <PageHeader title="Contratos" />

      <div className="w-[90%] mx-auto px-4 py-6">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-slate-800 text-xs">Total Contratos</p>
                <p className="text-2xl font-bold text-white">{stats?.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-slate-800 text-xs">Elegíveis Refin</p>
                <p className="text-2xl font-bold text-emerald-400">{stats?.elegiveis ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors" onClick={() => setShowContatosDetalhe(v => !v)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-1">
                <Phone className="w-8 h-8 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-slate-800 text-xs">Contatos Realizados</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats?.totalContatos ?? 0}</p>
                </div>
              </div>
              {showContatosDetalhe && stats?.contatosPorOperador && stats.contatosPorOperador.length > 0 && (
                <div className="mt-2 border-t border-slate-700 pt-2 space-y-1 max-h-40 overflow-y-auto">
                  {stats.contatosPorOperador.map((op: { nome: string; qtd: number }) => (
                    <div key={op.nome} className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 truncate max-w-[160px]" title={op.nome}>{op.nome}</span>
                      <span className="text-yellow-300 font-bold ml-2 shrink-0">{op.qtd}</span>
                    </div>
                  ))}
                </div>
              )}
              {showContatosDetalhe && (!stats?.contatosPorOperador || stats.contatosPorOperador.length === 0) && (
                <p className="text-slate-500 text-xs mt-2">Nenhum contato registrado ainda.</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-slate-800 text-xs">Com Erro</p>
                <p className="text-2xl font-bold text-red-400">{stats?.comErro ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-2">
          {(['upload', 'relatorio', 'crm'] as Aba[]).map(a => (
            <button
              key={a}
              onClick={() => { setAba(a); setApenasElegiveis(a === 'crm'); setPage(1); }}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                aba === a
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-800 hover:text-white'
              }`}
            >
              {a === 'upload' && '📤 Upload'}
              {a === 'relatorio' && '📋 Relatório'}
              {a === 'crm' && '📞 CRM Refinanciamento'}
            </button>
          ))}
        </div>

        {/* ABA UPLOAD */}
        {aba === 'upload' && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Upload de Contratos PDF</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
                onDragEnter={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    handleUpload(files);
                  } else {
                    // Tentar via items API
                    const items = e.dataTransfer.items;
                    if (items && items.length > 0) {
                      const dt = new DataTransfer();
                      for (let i = 0; i < items.length; i++) {
                        const file = items[i].getAsFile();
                        if (file) dt.items.add(file);
                      }
                      if (dt.files.length > 0) handleUpload(dt.files);
                      else toast.error('Nenhum PDF selecionado');
                    } else {
                      toast.error('Nenhum PDF selecionado');
                    }
                  }
                }}
              >
                <Upload className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-white font-medium text-lg mb-1">Arraste os PDFs aqui ou clique para selecionar</p>
                <p className="text-slate-800 text-sm">Suporta múltiplos arquivos — contratos BB Consignado</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && handleUpload(e.target.files)}
                />
              </div>



              {uploading && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-800 text-sm">Processando {progresso.atual} de {progresso.total}...</span>
                    <span className="text-emerald-400 text-sm">{Math.round((progresso.atual / progresso.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ABA RELATÓRIO */}
        {aba === 'relatorio' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
                <Input
                  placeholder="Nome do cliente..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPage(1); }}
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
                />
              </div>
              <Input
                placeholder="Nome do agente..."
                value={filtroAgente}
                onChange={e => { setFiltroAgente(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <Input
                placeholder="Cidade..."
                value={filtroCidade}
                onChange={e => { setFiltroCidade(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <Input
                placeholder="Empresa..."
                value={filtroEmpresa}
                onChange={e => { setFiltroEmpresa(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <Input
                placeholder="Linha de crédito..."
                value={filtroLinha}
                onChange={e => { setFiltroLinha(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <div className="relative">
                <Input
                  placeholder="Nº Agência BB..."
                  value={filtroAgencia}
                  onChange={e => { setFiltroAgencia(e.target.value.replace(/\D/g, '')); setPage(1); }}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800 font-mono"
                  maxLength={4}
                />
                {filtroAgencia && agenciasBbData?.agencias?.[0] && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-[10px] text-cyan-300 z-10 whitespace-nowrap">
                    {agenciasBbData.agencias[0].nome}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant={apenasElegiveis ? 'default' : 'outline'}
                  onClick={() => { setApenasElegiveis(!apenasElegiveis); setPage(1); }}
                  className={`flex-1 text-xs ${apenasElegiveis ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-800'}`}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {apenasElegiveis ? 'Elegíveis' : 'Todos'}
                </Button>
                <Button variant="outline" onClick={() => refetch()} className="border-slate-600 text-slate-800 px-3">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <Select value={filtroNaoPerturbe} onValueChange={v => { setFiltroNaoPerturbe(v as 'todos' | 'bloqueados' | 'liberados'); setPage(1); }}>
                <SelectTrigger className="bg-slate-800 border-red-800/50 text-white text-xs h-10">
                  <SelectValue placeholder="Não Pertube" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos (Não Pertube)</SelectItem>
                  <SelectItem value="bloqueados">⛔ Bloqueados</SelectItem>
                  <SelectItem value="liberados">✓ Liberados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-slate-800">Carregando contratos...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-slate-800">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum contrato encontrado.</p>
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setAba('upload')}>
                  <Upload className="w-4 h-4 mr-2" /> Fazer Upload
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-[9px] uppercase font-bold">
                      <th className="px-2 py-1 text-left text-blue-400 border-b border-blue-800/40">Proposta / Empresa</th>
                      <th className="px-2 py-1 text-left text-purple-400 border-b border-purple-800/40 border-l border-slate-700">Operador / Convênio / Linha</th>
                      <th className="px-2 py-1 text-left text-emerald-400 border-b border-emerald-800/40 border-l border-slate-700">Cliente / CPF / Nasc.</th>
                      <th className="px-2 py-1 text-left text-cyan-400 border-b border-cyan-800/40 border-l border-slate-700">Ag. / Conta</th>
                      <th className="px-2 py-1 text-left text-yellow-400 border-b border-yellow-800/40 border-l border-slate-700">Contrato</th>
                      <th className="px-2 py-1 text-left text-cyan-400 border-b border-cyan-800/40 border-l border-slate-700">Mailing</th>
                      <th className="px-2 py-1 text-center text-slate-800 border-b border-slate-700 border-l border-slate-700">&nbsp;</th>
                    </tr>
                    <tr className="bg-slate-900 text-slate-800 text-[10px] uppercase">
                      <th className="px-2 py-1.5 text-left w-[160px]">Nº / Empresa</th>
                      <th className="px-2 py-1.5 text-left w-[240px] border-l border-slate-700">Operador / Convênio</th>
                      <th className="px-2 py-1.5 text-left w-[180px] border-l border-slate-700">Nome / CPF / Nasc.</th>
                      <th className="px-2 py-1.5 text-left w-[100px] border-l border-slate-700">Agência / Conta</th>
                      <th className="px-2 py-1.5 text-left w-[160px] border-l border-slate-700">Taxa · Prazo · Parcela · 1ª Parc.</th>
                      <th className="px-2 py-1.5 text-left w-[130px] border-l border-slate-700">Cidade / Telefones</th>
                      <th className="px-2 py-1.5 text-center w-[80px] border-l border-slate-700">Refin / Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => {
                      const agNome = agenciaNomeMap.get(String((r as any).agencia ?? '').padStart(4, '0'));
                      const dtaNascFmt = (() => {
                        const d = (r as any).dtaNasc as string | null;
                        if (!d) return null;
                        if (d.includes('-')) { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
                        return d;
                      })();
                      return (
                      <tr key={r.id} className={`border-t border-slate-700 transition-colors hover:bg-blue-900/20 ${i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-900/60'}`}>
                        {/* Proposta + Empresa */}
                        <td className="px-2 py-1.5 border-r border-slate-700/50">
                          <div className="font-mono text-blue-300 text-[11px] truncate">{r.numeroProposta ?? '—'}</div>
                          <div className="text-emerald-300 text-[10px] truncate" title={r.empresa ?? ''}>{r.empresa ?? '—'}</div>
                        </td>
                        {/* Operador + Convênio + Linha */}
                        <td className="px-2 py-1.5 border-l border-slate-700 border-r border-slate-700/50">
                          <div className="text-purple-300 text-[11px] truncate" title={r.nomeOperador ?? ''}>{r.nomeOperador ?? r.chaveJOperador ?? '—'}</div>
                          <div className="text-slate-800 text-[10px] truncate" title={r.nomeConvenio ?? ''}>{r.nomeConvenio ?? '—'}</div>
                          <div className="text-purple-200 text-[9px] whitespace-normal break-words" title={r.linhaCredito ?? ''}>{r.linhaCredito ?? '—'}</div>
                        </td>
                        {/* Cliente + CPF + Nasc */}
                        <td className="px-2 py-1.5 border-l border-slate-700 border-r border-slate-700/50">
                          <div className="text-white font-medium text-[11px] truncate" title={r.nomeCliente ?? ''}>{r.nomeCliente ?? '—'}</div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-slate-800 font-mono text-[10px] truncate">{r.cpfCliente ?? '—'}</span>
                            {r.cpfCliente && (
                              <button
                                title="Copiar CPF"
                                className="shrink-0 text-slate-500 hover:text-cyan-400 transition-colors"
                                onClick={() => { navigator.clipboard.writeText(r.cpfCliente!); }}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                            {(() => {
                              const cpfNorm = (r.cpfCliente ?? '').replace(/\D/g, '');
                              const bloqueado = cpfNorm.length === 11 && cpfsBloqueados.has(cpfNorm);
                              return bloqueado
                                ? <span className="text-[9px] font-bold text-red-400 bg-red-900/40 px-1 py-0.5 rounded uppercase tracking-wide">NÃO PERTUBE</span>
                                : <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-900/30 px-1 py-0.5 rounded">OK</span>;
                            })()}
                          </div>
                          {dtaNascFmt && <div className="text-slate-500 text-[9px]">{dtaNascFmt}</div>}
                        </td>
                        {/* Agência + Conta */}
                        <td className="px-2 py-1.5 border-l border-slate-700 border-r border-slate-700/50">
                          <div className="text-cyan-300 font-mono text-[11px]" title={agNome ?? ''}>
                            {(r as any).agencia ? String((r as any).agencia).padStart(4, '0') : '—'}
                          </div>
                          {agNome && <div className="text-slate-500 text-[9px] truncate max-w-[90px]">{agNome.split(' ')[0]}</div>}
                          <div className="text-cyan-200 font-mono text-[10px]">{(r as any).conta ?? '—'}</div>
                        </td>
                        {/* Contrato: Taxa · Prazo · Parcela · 1ª Parc */}
                        <td className="px-2 py-1.5 border-l border-slate-700 border-r border-slate-700/50">
                          <div className="flex gap-2 items-baseline">
                            <span className="text-yellow-300 font-bold text-[12px]">{r.taxaMensalJuros ? `${parseFloat(String(r.taxaMensalJuros)).toFixed(2)}%` : '—'}</span>
                            <span className="text-slate-800 text-[10px]">{r.prazoMeses ? `${r.prazoMeses}m` : ''}</span>
                          </div>
                          <div className="text-slate-800 text-[10px]">{formatarMoeda(r.valorParcela)}</div>
                          <div className="text-slate-500 text-[9px]">{r.dataPrimeiraParcela ?? '—'}</div>
                        </td>
                        {/* Mailing: Cidade + Telefones (com edição inline) */}
                        <td className="px-2 py-1.5 border-l border-slate-700 border-r border-slate-700/50">
                          {(r as any).cidade && <div className="text-slate-800 text-[10px] truncate" title={(r as any).cidade}>{(r as any).cidade}</div>}
                          {editTelId === r.id ? (
                            <div className="flex flex-col gap-1 mt-0.5">
                              <Input
                                autoFocus
                                value={editTelVal}
                                onChange={e => setEditTelVal(e.target.value)}
                                placeholder="(DD) 9XXXX-XXXX, ..."
                                className="h-6 text-[10px] bg-slate-700 border-slate-500 text-white px-1.5 py-0"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') salvarTelInline(r.id);
                                  if (e.key === 'Escape') setEditTelId(null);
                                }}
                              />
                              <div className="flex gap-1">
                                <button onClick={() => salvarTelInline(r.id)} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setEditTelId(null)} className="text-slate-500 hover:text-slate-800"><X className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer group/tel"
                              onClick={() => abrirEditTel(r)}
                              title="Clique para adicionar/editar telefone"
                            >
                              {(r as any).telefones?.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  {((r as any).telefones as string[]).slice(0, 2).map((t: string, ti: number) => {
                                    const bloqueado = telefonesNaoPerturbe.has(t);
                                    return (
                                      <span key={ti} className={`flex items-center gap-1 truncate text-[10px] ${bloqueado ? 'text-red-400' : 'text-green-300'}`}>
                                        {bloqueado && <PhoneOff className="w-3 h-3 shrink-0" />}
                                        {t}
                                      </span>
                                    );
                                  })}
                                  {(r as any).telefones.length > 2 && <span className="text-slate-500 text-[9px]">+{(r as any).telefones.length - 2}</span>}
                                  <span className="text-slate-600 text-[9px] group-hover/tel:text-slate-800 flex items-center gap-0.5"><Pencil className="w-2.5 h-2.5" /> editar</span>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px] flex items-center gap-1 group-hover/tel:text-cyan-400">
                                  <Phone className="w-3 h-3" /> adicionar
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Refin + Ações */}
                        <td className="px-2 py-1.5 text-center border-l border-slate-700">
                          <div className="mb-1">{(r as any).elegivelRefin ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">—</span>}</div>
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px] border-blue-600 text-blue-400 hover:bg-blue-900/30" onClick={() => abrirEdicao(r)}>Editar</Button>
                            {user?.role === 'admin' && (
                              <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px] border-red-700 text-red-400 hover:bg-red-900/30" onClick={() => { setDeletandoId(r.id); setSenhaCeo(''); }}>Del</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {(data?.total ?? 0) >= 50 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-slate-600 text-slate-800">
                  Anterior
                </Button>
                <span className="px-4 py-2 text-slate-800 text-sm">Pág. {page}</span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} className="border-slate-600 text-slate-800">
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ABA CRM REFINANCIAMENTO */}
        {aba === 'crm' && (
          <div>
            {/* Filtros CRM — mesmos do Relatório */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
                <Input
                  placeholder="Nome do cliente..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPage(1); }}
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
                />
              </div>
              <Input
                placeholder="Nome do agente..."
                value={filtroAgente}
                onChange={e => { setFiltroAgente(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <Input
                placeholder="Cidade..."
                value={filtroCidade}
                onChange={e => { setFiltroCidade(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <Input
                placeholder="Empresa..."
                value={filtroEmpresa}
                onChange={e => { setFiltroEmpresa(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <Input
                placeholder="Linha de crédito..."
                value={filtroLinha}
                onChange={e => { setFiltroLinha(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-800"
              />
              <Button variant="outline" onClick={() => refetch()} className="border-slate-600 text-slate-800">
                <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
              </Button>
            </div>
            <div className="mb-4 p-4 bg-emerald-900/30 border border-emerald-700 rounded-xl">
              <p className="text-emerald-300 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Exibindo apenas contratos com <strong>mais de 1 ano</strong> desde a primeira parcela — elegíveis para oferta de refinanciamento.
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-slate-800">Carregando...</div>
            ) : (
              <div className="grid gap-4">
                {rows.length === 0 ? (
                  <div className="text-center py-12 text-slate-800">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum cliente elegível para refinanciamento ainda.</p>
                  </div>
                ) : (
                  rows.map((r: any) => (
                    <Card key={r.id} className="bg-slate-800 border-emerald-700/50">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-emerald-600 text-white text-xs">Elegível Refin</Badge>
                              <span className="text-slate-800 text-xs font-mono">#{r.numeroProposta}</span>
                            </div>
                            <h3 className="text-white font-bold text-lg">{r.nomeCliente ?? '—'}</h3>
                            <p className="text-slate-800 text-sm flex items-center gap-1.5">
                              CPF: {r.cpfCliente ? r.cpfCliente.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}
                              {r.cpfCliente && (
                                <button
                                  title="Copiar CPF"
                                  className="text-slate-500 hover:text-cyan-400 transition-colors"
                                  onClick={() => { navigator.clipboard.writeText(r.cpfCliente!); }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </p>
                            {r.cidade && (
                              <p className="text-slate-800 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {r.cidade}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-yellow-300 font-bold text-xl">
                              {r.taxaMensalJuros ? `${parseFloat(String(r.taxaMensalJuros)).toFixed(2)}% a.m.` : '—'}
                            </p>
                            <p className="text-slate-800 text-xs">Taxa contratada</p>
                            <p className="text-slate-800 text-sm mt-1">{r.prazoMeses}m · {formatarMoeda(r.valorParcela)}/mês</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-3 items-center">
                          <div>
                            <p className="text-slate-800 text-xs">Convênio</p>
                            <p className="text-slate-800 text-sm">{r.nomeConvenio ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-800 text-xs">Operador</p>
                            <p className="text-slate-800 text-sm">{r.nomeOperador ?? r.chaveJOperador ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-800 text-xs">1ª Parcela</p>
                            <p className="text-slate-800 text-sm">{r.dataPrimeiraParcela ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-800 text-xs">Últ. Parcela</p>
                            <p className="text-slate-800 text-sm">{r.dataUltimaParcela ?? '—'}</p>
                            <p className="text-amber-400 text-xs font-semibold mt-0.5">
                              {(() => {
                                if (!r.dataUltimaParcela) return '';
                                const [d, m, y] = r.dataUltimaParcela.split('/');
                                if (!d || !m || !y) return '';
                                const ultParcela = new Date(Number(y), Number(m) - 1, Number(d));
                                const hoje = new Date();
                                if (ultParcela <= hoje) return 'Contrato encerrado';
                                const diffMs = ultParcela.getTime() - hoje.getTime();
                                const meses = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44));
                                return `Falta ${meses} parcela${meses !== 1 ? 's' : ''}`;
                              })()}
                            </p>
                          </div>
                          <div className="ml-auto">
                            {r.telefones?.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {r.telefones.slice(0, 3).map((t: string, i: number) => (
                                  <a
                                    key={i}
                                    href={`tel:${t.replace(/\D/g, '')}`}
                                    className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                                  >
                                    <Phone className="w-3 h-3" /> {t}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Sem telefone no mailing
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Anotação CRM — clicando abre o mini-modal */}
                        <div
                          className="mt-3 pt-3 border-t border-slate-700/50 cursor-pointer group"
                          onClick={() => abrirEdicaoCrm(r)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-800 text-xs">Resultado do contato</span>
                            {r.dataContatoCrm && (
                              <span className="text-slate-500 text-xs">· {r.dataContatoCrm}</span>
                            )}
                            <span className="text-slate-600 text-xs group-hover:text-slate-800 transition-colors ml-auto">✏️ clique para anotar</span>
                          </div>
                          {r.anotacaoCrm ? (
                            <p className="text-emerald-300 text-sm">{r.anotacaoCrm}</p>
                          ) : (
                            <p className="text-slate-600 text-sm italic">Sem anotação ainda...</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL EDITAR CONTRATO */}
      {editandoId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-white font-bold text-lg mb-4">Editar Contrato</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['empresa', 'Empresa/Correspondente'],
                ['nomeCliente', 'Nome do Cliente'],
                ['nomeConvenio', 'Convênio'],
                ['nomeOperador', 'Nome do Operador'],
                ['chaveJOperador', 'ChaveJ do Operador'],
                ['dataPrimeiraParcela', '1ª Parcela'],
                ['dataUltimaParcela', 'Última Parcela'],
                ['telefoneManuais', 'Telefones (vírgula)'],
              ] as [keyof typeof editForm, string][]).map(([campo, label]) => (
                <div key={campo} className={campo === 'telefoneManuais' ? 'col-span-2' : ''}>
                  <label className="text-slate-800 text-xs mb-1 block">{label}</label>
                  <Input
                    value={editForm[campo]}
                    onChange={e => setEditForm(f => ({ ...f, [campo]: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white text-sm"
                    placeholder={label}
                  />
                </div>
              ))}
              {/* Campo Situação manual */}
              <div className="col-span-2">
                <label className="text-slate-800 text-xs mb-1 block">Situação Manual</label>
                <select
                  value={editForm.situacao}
                  onChange={e => setEditForm(f => ({ ...f, situacao: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Não definida --</option>
                  <option value="Contratada">Contratada</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Pendente">Pendente</option>
                </select>
                <p className="text-slate-500 text-[10px] mt-1">Usada na Perspectiva de Ganho quando não há correspondência na Febraban</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <Button variant="outline" className="border-slate-600 text-slate-800" onClick={() => setEditandoId(null)}>Cancelar</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={salvarEdicao} disabled={atualizarMutation.isPending}>
                {atualizarMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANOTAR CRM */}
      {editandoCrmId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-4">Resultado do Contato</h2>
            <div className="space-y-3">
              <div>
                <label className="text-slate-800 text-xs mb-1 block">Data do contato</label>
                <Input
                  type="date"
                  value={crmForm.dataContatoCrm}
                  onChange={e => setCrmForm(f => ({ ...f, dataContatoCrm: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-slate-800 text-xs mb-1 block">Anotação / Resultado</label>
                <textarea
                  value={crmForm.anotacaoCrm}
                  onChange={e => setCrmForm(f => ({ ...f, anotacaoCrm: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-md p-2 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Interessado, ligar novamente na sexta. Não atendeu. Recusou..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <Button variant="outline" className="border-slate-600 text-slate-800" onClick={() => setEditandoCrmId(null)}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={salvarCrm} disabled={atualizarCrmMutation.isPending}>
                {atualizarCrmMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL APAGAR COM SENHA CEO */}
      {deletandoId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-red-400 font-bold text-lg mb-2">Confirmar Exclusão</h2>
            <p className="text-slate-800 text-sm mb-4">Esta ação é irreversível. Digite sua senha para confirmar.</p>
            <label className="text-slate-800 text-xs mb-1 block">Senha CEO</label>
            <Input
              type="password"
              value={senhaCeo}
              onChange={e => setSenhaCeo(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mb-4"
              placeholder="Sua senha de acesso"
              onKeyDown={e => e.key === 'Enter' && confirmarExclusao()}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" className="border-slate-600 text-slate-800" onClick={() => { setDeletandoId(null); setSenhaCeo(''); }}>Cancelar</Button>
              <Button className="bg-red-700 hover:bg-red-800" onClick={confirmarExclusao} disabled={!senhaCeo || deletarMutation.isPending}>
                {deletarMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// build: 1780664259
