import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Upload, Search, Phone, MapPin, FileText, CheckCircle,
  AlertCircle, Clock, RefreshCw, TrendingUp, Users, Percent
} from "lucide-react";
import { useLocation } from "wouter";
import PageHeader from "@/components/PageHeader";

type Aba = 'upload' | 'relatorio' | 'crm';

export default function ContratosPage() {
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
  const [apenasElegiveis, setApenasElegiveis] = useState(false);
  const [substituirDuplicatas, setSubstituirDuplicatas] = useState(false);
  const [page, setPage] = useState(1);

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

  const { data: stats } = trpc.contratos.estatisticas.useQuery();

  const uploadLoteMutation = trpc.contratos.uploadLote.useMutation();
  const atualizarMutation = trpc.contratos.atualizar.useMutation();
  const deletarMutation = trpc.contratos.deletar.useMutation();
  const utils = trpc.useUtils();

  // Estado de edição
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    empresa: string; nomeCliente: string; nomeConvenio: string;
    nomeOperador: string; chaveJOperador: string;
    dataPrimeiraParcela: string; dataUltimaParcela: string; telefoneManuais: string;
  }>({ empresa: '', nomeCliente: '', nomeConvenio: '', nomeOperador: '', chaveJOperador: '',
       dataPrimeiraParcela: '', dataUltimaParcela: '', telefoneManuais: '' });

  // Estado de exclusão com senha CEO
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [senhaCeo, setSenhaCeo] = useState('');

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

  const rows = data?.rows ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <PageHeader />

      <div className="w-[90%] mx-auto px-4 py-6">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-slate-400 text-xs">Total Contratos</p>
                <p className="text-2xl font-bold text-white">{stats?.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-slate-400 text-xs">Elegíveis Refin</p>
                <p className="text-2xl font-bold text-emerald-400">{stats?.elegiveis ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <Percent className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-slate-400 text-xs">Taxa Média</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {stats?.taxaMedia ? `${Number(stats.taxaMedia).toFixed(2)}%` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-slate-400 text-xs">Com Erro</p>
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
              onClick={() => setAba(a)}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                aba === a
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
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
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (e.dataTransfer.files) handleUpload(e.dataTransfer.files); }}
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-white font-medium text-lg mb-1">Arraste os PDFs aqui ou clique para selecionar</p>
                <p className="text-slate-400 text-sm">Suporta múltiplos arquivos — contratos BB Consignado</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && handleUpload(e.target.files)}
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={substituirDuplicatas}
                    onChange={e => setSubstituirDuplicatas(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-slate-300 text-sm">
                    Substituir contratos duplicados (mesmo CPF + mesma linha de crédito + mesma proposta)
                  </span>
                </label>
              </div>
              <p className="text-slate-500 text-xs mt-1 ml-6">
                Sem esta opção, contratos já existentes são ignorados automaticamente.
              </p>

              {uploading && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 text-sm">Processando {progresso.atual} de {progresso.total}...</span>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Nome do cliente..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPage(1); }}
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <Input
                placeholder="Nome do agente..."
                value={filtroAgente}
                onChange={e => { setFiltroAgente(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Input
                placeholder="Cidade..."
                value={filtroCidade}
                onChange={e => { setFiltroCidade(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Input
                placeholder="Empresa..."
                value={filtroEmpresa}
                onChange={e => { setFiltroEmpresa(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Input
                placeholder="Linha de crédito..."
                value={filtroLinha}
                onChange={e => { setFiltroLinha(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
              <div className="flex gap-2">
                <Button
                  variant={apenasElegiveis ? 'default' : 'outline'}
                  onClick={() => { setApenasElegiveis(!apenasElegiveis); setPage(1); }}
                  className={`flex-1 text-xs ${apenasElegiveis ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-300'}`}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {apenasElegiveis ? 'Elegíveis' : 'Todos'}
                </Button>
                <Button variant="outline" onClick={() => refetch()} className="border-slate-600 text-slate-300 px-3">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Carregando contratos...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
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
                    {/* Linha de grupos */}
                    <tr className="bg-slate-950 text-[9px] uppercase font-bold">
                      <th colSpan={2} className="px-2 py-1 text-left text-blue-400 border-b border-blue-800/40">Proposta</th>
                      <th colSpan={2} className="px-2 py-1 text-left text-purple-400 border-b border-purple-800/40 border-l border-slate-700">Operador</th>
                      <th colSpan={5} className="px-2 py-1 text-left text-emerald-400 border-b border-emerald-800/40 border-l border-slate-700">Cliente</th>
                      <th colSpan={4} className="px-2 py-1 text-left text-yellow-400 border-b border-yellow-800/40 border-l border-slate-700">Contrato</th>
                      <th colSpan={2} className="px-2 py-1 text-left text-cyan-400 border-b border-cyan-800/40 border-l border-slate-700">Mailing</th>
                      <th colSpan={2} className="px-2 py-1 text-center text-slate-400 border-b border-slate-700 border-l border-slate-700">&nbsp;</th>
                    </tr>
                    {/* Linha de colunas */}
                    <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                      {/* Proposta */}
                      <th className="px-2 py-1.5 text-left w-[90px]">Nº</th>
                      <th className="px-2 py-1.5 text-left w-[110px]">Empresa</th>
                      {/* Operador */}
                      <th className="px-2 py-1.5 text-left w-[110px] border-l border-slate-700">Operador</th>
                      <th className="px-2 py-1.5 text-left w-[80px]">Convênio</th>
                      {/* Cliente */}
                      <th className="px-2 py-1.5 text-left w-[130px] border-l border-slate-700">Nome</th>
                      <th className="px-2 py-1.5 text-left w-[95px]">CPF</th>
                      <th className="px-2 py-1.5 text-left w-[75px]">Nasc.</th>
                      <th className="px-2 py-1.5 text-left w-[60px]">Agência</th>
                      <th className="px-2 py-1.5 text-left w-[65px]">Conta</th>
                      {/* Contrato */}
                      <th className="px-2 py-1.5 text-right w-[50px] border-l border-slate-700">Taxa</th>
                      <th className="px-2 py-1.5 text-right w-[40px]">Prazo</th>
                      <th className="px-2 py-1.5 text-right w-[70px]">Parcela</th>
                      <th className="px-2 py-1.5 text-left w-[75px]">1ª Parc.</th>
                      {/* Mailing */}
                      <th className="px-2 py-1.5 text-left w-[80px] border-l border-slate-700">Cidade</th>
                      <th className="px-2 py-1.5 text-left w-[90px]">Telefones</th>
                      {/* Status / Ações */}
                      <th className="px-2 py-1.5 text-center w-[45px] border-l border-slate-700">Refin</th>
                      <th className="px-2 py-1.5 text-center w-[80px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id} className={`border-t border-slate-700 transition-colors hover:bg-blue-900/20 ${i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-900/60'}`}>
                        {/* Grupo: Proposta */}
                        <td className="px-2 py-1.5 font-mono text-blue-300 truncate">{r.numeroProposta ?? '—'}</td>
                        <td className="px-2 py-1.5 text-emerald-300 truncate" title={r.empresa ?? ''}>{r.empresa ?? '—'}</td>
                        {/* Grupo: Operador */}
                        <td className="px-2 py-1.5 text-purple-300 truncate border-l border-slate-700" title={`${r.nomeOperador ?? ''} (${r.chaveJOperador ?? ''})`.trim()}>{r.nomeOperador ?? r.chaveJOperador ?? '—'}</td>
                        <td className="px-2 py-1.5 text-slate-300 truncate" title={r.nomeConvenio ?? ''}>{r.nomeConvenio ?? '—'}</td>
                        {/* Grupo: Cliente */}
                        <td className="px-2 py-1.5 text-white font-medium truncate border-l border-slate-700" title={r.nomeCliente ?? ''}>{r.nomeCliente ?? '—'}</td>
                        <td className="px-2 py-1.5 text-slate-300 truncate font-mono text-[10px]" title={r.cpfCliente ?? ''}>{r.cpfCliente ?? '—'}</td>
                        <td className="px-2 py-1.5 text-slate-400 truncate text-[10px]" title={(r as any).dtaNasc ?? ''}>{(r as any).dtaNasc ?? '—'}</td>
                        <td className="px-2 py-1.5 text-cyan-300 truncate font-mono text-[10px]">{(r as any).agencia ?? '—'}</td>
                        <td className="px-2 py-1.5 text-cyan-300 truncate font-mono text-[10px]">{(r as any).conta ?? '—'}</td>
                        {/* Grupo: Contrato */}
                        <td className="px-2 py-1.5 text-right text-yellow-300 font-medium border-l border-slate-700">
                          {r.taxaMensalJuros ? `${parseFloat(String(r.taxaMensalJuros)).toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-300">{r.prazoMeses ? `${r.prazoMeses}m` : '—'}</td>
                        <td className="px-2 py-1.5 text-right text-slate-300">{formatarMoeda(r.valorParcela)}</td>
                        <td className="px-2 py-1.5 text-slate-300">{r.dataPrimeiraParcela ?? '—'}</td>
                        {/* Grupo: Mailing */}
                        <td className="px-2 py-1.5 text-slate-300 truncate border-l border-slate-700" title={(r as any).cidade ?? ''}>
                          {(r as any).cidade ?? '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          {(r as any).telefones?.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {((r as any).telefones as string[]).slice(0, 1).map((t: string, ti: number) => (
                                <span key={ti} className="text-green-300 truncate">{t}</span>
                              ))}
                              {(r as any).telefones.length > 1 && (
                                <span className="text-slate-400">+{(r as any).telefones.length - 1}</span>
                              )}
                            </div>
                          ) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {(r as any).elegivelRefin ? (
                            <span className="text-emerald-400 font-bold">✓</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px] border-blue-600 text-blue-400 hover:bg-blue-900/30" onClick={() => abrirEdicao(r)}>
                              Editar
                            </Button>
                            {user?.role === 'admin' && (
                              <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px] border-red-700 text-red-400 hover:bg-red-900/30" onClick={() => { setDeletandoId(r.id); setSenhaCeo(''); }}>
                                Del
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {(data?.total ?? 0) >= 50 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-slate-600 text-slate-300">
                  Anterior
                </Button>
                <span className="px-4 py-2 text-slate-400 text-sm">Pág. {page}</span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} className="border-slate-600 text-slate-300">
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ABA CRM REFINANCIAMENTO */}
        {aba === 'crm' && (
          <div>
            <div className="mb-4 p-4 bg-emerald-900/30 border border-emerald-700 rounded-xl">
              <p className="text-emerald-300 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Exibindo apenas contratos com <strong>mais de 1 ano</strong> desde a primeira parcela — elegíveis para oferta de refinanciamento.
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Carregando...</div>
            ) : (
              <div className="grid gap-4">
                {rows.filter((r: any) => r.elegivelRefin).length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum cliente elegível para refinanciamento ainda.</p>
                  </div>
                ) : (
                  rows.filter((r: any) => r.elegivelRefin).map((r: any) => (
                    <Card key={r.id} className="bg-slate-800 border-emerald-700/50">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-emerald-600 text-white text-xs">Elegível Refin</Badge>
                              <span className="text-slate-400 text-xs font-mono">#{r.numeroProposta}</span>
                            </div>
                            <h3 className="text-white font-bold text-lg">{r.nomeCliente ?? '—'}</h3>
                            <p className="text-slate-400 text-sm">
                              CPF: {r.cpfCliente ? r.cpfCliente.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}
                            </p>
                            {r.cidade && (
                              <p className="text-slate-400 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {r.cidade}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-yellow-300 font-bold text-xl">
                              {r.taxaMensalJuros ? `${parseFloat(String(r.taxaMensalJuros)).toFixed(2)}% a.m.` : '—'}
                            </p>
                            <p className="text-slate-400 text-xs">Taxa contratada</p>
                            <p className="text-slate-300 text-sm mt-1">{r.prazoMeses}m · {formatarMoeda(r.valorParcela)}/mês</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-3 items-center">
                          <div>
                            <p className="text-slate-400 text-xs">Convênio</p>
                            <p className="text-slate-200 text-sm">{r.nomeConvenio ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Operador</p>
                            <p className="text-slate-200 text-sm">{r.nomeOperador ?? r.chaveJOperador ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">1ª Parcela</p>
                            <p className="text-slate-200 text-sm">{r.dataPrimeiraParcela ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Últ. Parcela</p>
                            <p className="text-slate-200 text-sm">{r.dataUltimaParcela ?? '—'}</p>
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
                  <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                  <Input
                    value={editForm[campo]}
                    onChange={e => setEditForm(f => ({ ...f, [campo]: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white text-sm"
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setEditandoId(null)}>Cancelar</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={salvarEdicao} disabled={atualizarMutation.isPending}>
                {atualizarMutation.isPending ? 'Salvando...' : 'Salvar'}
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
            <p className="text-slate-400 text-sm mb-4">Esta ação é irreversível. Digite sua senha para confirmar.</p>
            <label className="text-slate-400 text-xs mb-1 block">Senha CEO</label>
            <Input
              type="password"
              value={senhaCeo}
              onChange={e => setSenhaCeo(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mb-4"
              placeholder="Sua senha de acesso"
              onKeyDown={e => e.key === 'Enter' && confirmarExclusao()}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => { setDeletandoId(null); setSenhaCeo(''); }}>Cancelar</Button>
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
