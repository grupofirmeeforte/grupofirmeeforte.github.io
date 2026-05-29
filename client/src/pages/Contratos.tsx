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
  AlertCircle, Clock, RefreshCw, TrendingUp, Users, Percent, ChevronLeft
} from "lucide-react";
import { useLocation } from "wouter";

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
  const [apenasElegiveis, setApenasElegiveis] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = trpc.contratos.listar.useQuery({
    nomeCliente: busca || undefined,
    apenasElegiveis,
    page,
    pageSize: 50,
  });

  const { data: stats } = trpc.contratos.estatisticas.useQuery();

  const uploadLoteMutation = trpc.contratos.uploadLote.useMutation();

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
        const res = await uploadLoteMutation.mutateAsync({ arquivos });
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
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-300 hover:text-white">
            <ChevronLeft className="w-4 h-4 mr-1" /> Início
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Contratos PDF — BB Consignado
            </h1>
            <p className="text-slate-400 text-sm">Upload, extração automática e CRM de refinanciamento</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
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
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome do cliente..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPage(1); }}
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <Button
                variant={apenasElegiveis ? 'default' : 'outline'}
                onClick={() => { setApenasElegiveis(!apenasElegiveis); setPage(1); }}
                className={apenasElegiveis ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-300'}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {apenasElegiveis ? 'Apenas elegíveis' : 'Todos os contratos'}
              </Button>
              <Button variant="outline" onClick={() => refetch()} className="border-slate-600 text-slate-300">
                <RefreshCw className="w-4 h-4" />
              </Button>
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
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 text-xs uppercase">
                      <th className="px-3 py-3 text-left">Proposta</th>
                      <th className="px-3 py-3 text-left">Empresa</th>
                      <th className="px-3 py-3 text-left">Cliente</th>
                      <th className="px-3 py-3 text-left">CPF</th>
                      <th className="px-3 py-3 text-left">Convênio</th>
                      <th className="px-3 py-3 text-left">Operador</th>
                      <th className="px-3 py-3 text-right">Taxa %</th>
                      <th className="px-3 py-3 text-right">Prazo</th>
                      <th className="px-3 py-3 text-right">Parcela</th>
                      <th className="px-3 py-3 text-left">1ª Parcela</th>
                      <th className="px-3 py-3 text-left">Cidade</th>
                      <th className="px-3 py-3 text-left">Telefones</th>
                      <th className="px-3 py-3 text-center">Refin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id} className={`border-t border-slate-700 hover:bg-slate-800/50 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                        <td className="px-3 py-2 font-mono text-blue-300">{r.numeroProposta ?? '—'}</td>
                        <td className="px-3 py-2 text-emerald-300 text-xs">{r.empresa ?? '—'}</td>
                        <td className="px-3 py-2 text-white font-medium">{r.nomeCliente ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-300 font-mono text-xs">{r.cpfCliente ? r.cpfCliente.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}</td>
                        <td className="px-3 py-2 text-slate-300 text-xs">{r.nomeConvenio ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-300 text-xs">{r.chaveJOperador ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-yellow-300 font-medium">
                          {r.taxaMensalJuros ? `${parseFloat(String(r.taxaMensalJuros)).toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300">{r.prazoMeses ? `${r.prazoMeses}m` : '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{formatarMoeda(r.valorParcela)}</td>
                        <td className="px-3 py-2 text-slate-300 text-xs">{r.dataPrimeiraParcela ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-300 text-xs">
                          {(r as any).cidade ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {(r as any).cidade}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {(r as any).telefones?.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {((r as any).telefones as string[]).slice(0, 2).map((t: string, ti: number) => (
                                <span key={ti} className="text-xs text-green-300 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />{t}
                                </span>
                              ))}
                              {(r as any).telefones.length > 2 && (
                                <span className="text-xs text-slate-400">+{(r as any).telefones.length - 2} mais</span>
                              )}
                            </div>
                          ) : <span className="text-slate-500 text-xs">Sem tel.</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {(r as any).elegivelRefin ? (
                            <Badge className="bg-emerald-600 text-white text-xs">✓ Elegível</Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-600 text-slate-500 text-xs">Aguardar</Badge>
                          )}
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
    </div>
  );
}
