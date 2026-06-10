import { useState, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Pencil, Trash2, Camera, X, Eye, Package, Copy } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

const formatarMoeda = (v: any) => {
  if (!v && v !== 0) return "-";
  const n = parseFloat(v);
  if (isNaN(n)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};

const CATEGORIAS = ["Móvel", "Equipamento", "Veículo", "Imóvel", "Eletrônico", "Outros"];
const SITUACOES = ["Ativo", "Em Manutenção", "Baixado", "Extraviado"];

type Ativo = {
  id: number;
  descricao: string;
  categoria?: string | null;
  numeroPatrimonio?: string | null;
  valorAquisicao?: string | null;
  dataAquisicao?: string | null;
  vidaUtilAnos?: number | null;
  taxaDepreciacao?: string | null;
  valorResidual?: string | null;
  localizacao?: string | null;
  responsavel?: string | null;
  situacao?: string | null;
  observacoes?: string | null;
  fotoUrl?: string | null;
  fotoKey?: string | null;
};

const emptyForm = {
  descricao: "",
  categoria: "",
  numeroPatrimonio: "",
  valorAquisicao: "",
  dataAquisicao: "",
  vidaUtilAnos: "",
  taxaDepreciacao: "",
  valorResidual: "",
  localizacao: "",
  responsavel: "",
  situacao: "Ativo",
  observacoes: "",
};

// Componente de tooltip de foto com URL assinada do S3
function FotoTooltip({ fotoUrl, fotoKey }: { fotoUrl: string; fotoKey?: string | null }) {
  const [hover, setHover] = useState(false);
  const { data: signedData } = trpc.ativoImobilizado.getSignedFotoUrl.useQuery(
    { fotoKey: fotoKey ?? '' },
    { enabled: hover && !!fotoKey, staleTime: 5 * 60 * 1000 }
  );
  const imgSrc = signedData?.url ?? fotoUrl;

  return (
    <div
      className="relative w-10 h-10"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Miniatura */}
      <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-amber-300 hover:border-amber-500 transition-colors cursor-zoom-in">
        <img src={fotoUrl} alt="foto" className="w-full h-full object-cover" />
      </div>

      {/* Painel expandido — aparece ao hover */}
      {hover && (
        <div
          className="absolute left-0 top-12 z-50 flex flex-col gap-1"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl border-2 border-amber-300 overflow-hidden">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt="foto ampliada"
                className="w-64 h-64 object-contain"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
            )}
          </div>
          <button
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-lg transition-colors"
            onClick={e => {
              e.stopPropagation();
              const url = imgSrc ?? fotoUrl;
              navigator.clipboard.writeText(url);
              toast.success('URL da foto copiada!');
            }}
          >
            <Copy className="w-3 h-3" /> Copiar URL
          </button>
        </div>
      )}
    </div>
  );
}

export default function AtivoImobilizado() {
  useRegistrarModulo('Ativo Imobilizado');
  const [, navigate] = useLocation();
  const [filtros, setFiltros] = useState({ descricao: "", categoria: "", situacao: "", responsavel: "" });
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Ativo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoVisualizando, setFotoVisualizando] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: ativos = [], isLoading } = trpc.ativoImobilizado.listar.useQuery(
    { descricao: filtros.descricao || undefined, categoria: filtros.categoria || undefined, situacao: filtros.situacao || undefined, responsavel: filtros.responsavel || undefined },
    { refetchOnWindowFocus: true }
  );

  const criarMut = trpc.ativoImobilizado.criar.useMutation({
    onSuccess: () => { utils.ativoImobilizado.listar.invalidate(); toast.success("Ativo cadastrado!"); fecharForm(); },
    onError: (e) => toast.error(e.message),
  });
  const editarMut = trpc.ativoImobilizado.editar.useMutation({
    onSuccess: () => { utils.ativoImobilizado.listar.invalidate(); toast.success("Ativo atualizado!"); fecharForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deletarMut = trpc.ativoImobilizado.deletar.useMutation({
    onSuccess: () => { utils.ativoImobilizado.listar.invalidate(); toast.success("Ativo excluído!"); },
    onError: (e) => toast.error(e.message),
  });
  const uploadFotoMut = trpc.ativoImobilizado.uploadFoto.useMutation({
    onSuccess: () => { utils.ativoImobilizado.listar.invalidate(); toast.success("Foto enviada!"); setUploadingId(null); },
    onError: (e) => { toast.error(e.message); setUploadingId(null); },
  });

  const fecharForm = () => { setShowForm(false); setEditando(null); setForm(emptyForm); setFotoPreview(null); };

  const abrirEditar = (a: Ativo) => {
    setEditando(a);
    setForm({
      descricao: a.descricao ?? "",
      categoria: a.categoria ?? "",
      numeroPatrimonio: a.numeroPatrimonio ?? "",
      valorAquisicao: a.valorAquisicao ?? "",
      dataAquisicao: a.dataAquisicao ?? "",
      vidaUtilAnos: a.vidaUtilAnos?.toString() ?? "",
      taxaDepreciacao: a.taxaDepreciacao ?? "",
      valorResidual: a.valorResidual ?? "",
      localizacao: a.localizacao ?? "",
      responsavel: a.responsavel ?? "",
      situacao: a.situacao ?? "Ativo",
      observacoes: a.observacoes ?? "",
    });
    setFotoPreview(a.fotoUrl ?? null);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.descricao.trim()) { toast.error("Descrição é obrigatória"); return; }
    const data = {
      descricao: form.descricao,
      categoria: form.categoria || undefined,
      numeroPatrimonio: form.numeroPatrimonio || undefined,
      valorAquisicao: form.valorAquisicao || undefined,
      dataAquisicao: form.dataAquisicao || undefined,
      vidaUtilAnos: form.vidaUtilAnos ? parseInt(form.vidaUtilAnos) : undefined,
      taxaDepreciacao: form.taxaDepreciacao || undefined,
      valorResidual: form.valorResidual || undefined,
      localizacao: form.localizacao || undefined,
      responsavel: form.responsavel || undefined,
      situacao: form.situacao || undefined,
      observacoes: form.observacoes || undefined,
    };
    if (editando) editarMut.mutate({ id: editando.id, ...data });
    else criarMut.mutate(data);
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>, ativoId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto deve ter no máximo 5MB"); return; }
    setUploadingId(ativoId);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadFotoMut.mutate({ id: ativoId, arquivoNome: file.name, arquivoTipo: file.type, arquivoBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleFotoFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const situacaoBadge = (s?: string | null) => {
    const cores: Record<string, string> = {
      "Ativo": "bg-green-100 text-green-800",
      "Em Manutenção": "bg-yellow-100 text-yellow-800",
      "Baixado": "bg-gray-100 text-gray-600",
      "Extraviado": "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cores[s ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{s ?? "-"}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <PageHeader title="Ativo Imobilizado" />
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 w-10 h-10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Controle de Ativo Imobilizado</h1>
              <p className="text-sm text-slate-500">Gestão de bens patrimoniais</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setShowForm(true); setEditando(null); setForm(emptyForm); setFotoPreview(null); }} className="bg-green-600 hover:bg-green-700 text-white gap-1">
              <Plus className="w-4 h-4" /> Novo Ativo
            </Button>
            
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Descrição..." value={filtros.descricao} onChange={e => setFiltros(f => ({ ...f, descricao: e.target.value }))} />
            <select className="border rounded-md px-3 py-2 text-sm" value={filtros.categoria} onChange={e => setFiltros(f => ({ ...f, categoria: e.target.value }))}>
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="border rounded-md px-3 py-2 text-sm" value={filtros.situacao} onChange={e => setFiltros(f => ({ ...f, situacao: e.target.value }))}>
              <option value="">Todas as situações</option>
              {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input placeholder="Responsável..." value={filtros.responsavel} onChange={e => setFiltros(f => ({ ...f, responsavel: e.target.value }))} />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Carregando...</div>
          ) : ativos.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhum ativo cadastrado</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-yellow-500">
                  {["Foto", "Nº Patrimônio", "Descrição", "Categoria", "Valor Aquisição", "Data Aquisição", "Vida Útil", "Localização", "Responsável", "Situação", "Ações"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ativos.map((a, i) => (
                  <tr key={a.id} className={`border-b border-slate-100 hover:bg-amber-50 ${i % 2 === 0 ? "bg-white" : "bg-amber-50/30"}`}>
                    <td className="px-3 py-2">
                      {a.fotoUrl ? (
                        <FotoTooltip fotoUrl={a.fotoUrl} fotoKey={a.fotoKey} />
                      ) : (
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFotoChange(e, a.id)} />
                          <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 flex items-center justify-center transition-colors">
                            {uploadingId === a.id ? (
                              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </label>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono">{a.numeroPatrimonio || "-"}</td>
                    <td className="px-3 py-2 text-sm font-medium">{a.descricao}</td>
                    <td className="px-3 py-2 text-sm">{a.categoria || "-"}</td>
                    <td className="px-3 py-2 text-sm">{formatarMoeda(a.valorAquisicao)}</td>
                    <td className="px-3 py-2 text-sm">{a.dataAquisicao || "-"}</td>
                    <td className="px-3 py-2 text-sm">{a.vidaUtilAnos ? `${a.vidaUtilAnos} anos` : "-"}</td>
                    <td className="px-3 py-2 text-sm">{a.localizacao || "-"}</td>
                    <td className="px-3 py-2 text-sm">{a.responsavel || "-"}</td>
                    <td className="px-3 py-2">{situacaoBadge(a.situacao)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {a.fotoUrl && (
                          <button onClick={() => setFotoVisualizando(a.fotoUrl!)} className="p-1 rounded hover:bg-blue-100 text-blue-600" title="Ver foto">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <label className="cursor-pointer p-1 rounded hover:bg-green-100 text-green-600" title="Enviar foto">
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFotoChange(e, a.id)} />
                          <Camera className="w-4 h-4" />
                        </label>
                        <button onClick={() => abrirEditar(a)} className="p-1 rounded hover:bg-amber-100 text-amber-600" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm("Excluir este ativo?")) deletarMut.mutate({ id: a.id }); }} className="p-1 rounded hover:bg-red-100 text-red-600" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-2 text-sm text-slate-500">{ativos.length} ativo(s) encontrado(s)</div>
      </div>

      {/* Modal Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fecharForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editando ? "Editar Ativo" : "Novo Ativo Imobilizado"}</h2>
              <button onClick={fecharForm} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>

            {/* Foto no formulário */}
            <div className="mb-4 flex flex-col items-center gap-2">
              {fotoPreview ? (
                <div className="relative">
                  <img src={fotoPreview} alt="preview" className="w-32 h-32 object-cover rounded-xl border-2 border-amber-300" />
                  <button onClick={() => setFotoPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ) : (
                <label className="cursor-pointer w-32 h-32 border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-amber-500 transition-colors bg-amber-50">
                  <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoFormChange} />
                  <Camera className="w-8 h-8 text-amber-400" />
                  <span className="text-xs text-amber-600 font-medium">Adicionar foto</span>
                </label>
              )}
              <p className="text-xs text-slate-400">Foto do bem (máx. 5MB)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Mesa de escritório" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nº Patrimônio</label>
                <Input value={form.numeroPatrimonio} onChange={e => setForm(f => ({ ...f, numeroPatrimonio: e.target.value }))} placeholder="Ex: PAT-001" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor de Aquisição (R$)</label>
                <Input value={form.valorAquisicao} onChange={e => setForm(f => ({ ...f, valorAquisicao: e.target.value }))} placeholder="Ex: 1500.00" type="number" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data de Aquisição</label>
                <Input value={form.dataAquisicao} onChange={e => setForm(f => ({ ...f, dataAquisicao: e.target.value }))} placeholder="DD/MM/AAAA" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vida Útil (anos)</label>
                <Input value={form.vidaUtilAnos} onChange={e => setForm(f => ({ ...f, vidaUtilAnos: e.target.value }))} placeholder="Ex: 5" type="number" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Taxa de Depreciação (%)</label>
                <Input value={form.taxaDepreciacao} onChange={e => setForm(f => ({ ...f, taxaDepreciacao: e.target.value }))} placeholder="Ex: 20" type="number" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor Residual (R$)</label>
                <Input value={form.valorResidual} onChange={e => setForm(f => ({ ...f, valorResidual: e.target.value }))} placeholder="Ex: 100.00" type="number" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Localização</label>
                <Input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} placeholder="Ex: Sala 01 - Sede" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
                <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Situação</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value }))}>
                  {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm resize-none" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações adicionais..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={fecharForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={criarMut.isPending || editarMut.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                {criarMut.isPending || editarMut.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Cadastrar Ativo"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Foto */}
      {fotoVisualizando && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoVisualizando(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFotoVisualizando(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            <img
              src={fotoVisualizando.startsWith('http') ? fotoVisualizando : `${window.location.origin}${fotoVisualizando}`}
              alt="foto do ativo"
              className="w-full rounded-xl shadow-2xl"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <a
              href={fotoVisualizando.startsWith('http') ? fotoVisualizando : `${window.location.origin}${fotoVisualizando}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-center text-white/70 text-xs underline hover:text-white"
            >
              Abrir em nova aba
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
