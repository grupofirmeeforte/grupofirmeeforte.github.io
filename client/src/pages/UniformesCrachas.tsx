import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Pencil, Trash2, Camera, X, Eye, Shirt } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

const TIPOS_ITEM = ["Boné", "Crachá", "Calça", "Camisa", "Colete", "Uniforme", "Outros"];
const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG", "Único"];
const SITUACOES_ITEM = ["Devolvido", "Entregue", "Extraviado", "Pendente"];

type ItemUniforme = {
  id: number;
  chaveJ?: string | null;
  nomeAgente?: string | null;
  tipoItem: string;
  tamanho?: string | null;
  quantidade?: number | null;
  dataEntrega?: string | null;
  situacao?: string | null;
  observacoes?: string | null;
  fotoUrl?: string | null;
  fotoKey?: string | null;
};

const emptyForm = {
  chaveJ: "",
  nomeAgente: "",
  tipoItem: "",
  tamanho: "",
  quantidade: "1",
  dataEntrega: "",
  situacao: "Entregue",
  observacoes: "",
};

export default function UniformesCrachas() {
  useRegistrarModulo('Uniformes e Crachás');
  const [, navigate] = useLocation();
  const [filtros, setFiltros] = useState({ chaveJ: "", nomeAgente: "", tipoItem: "", situacao: "" });
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<ItemUniforme | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoVisualizando, setFotoVisualizando] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [buscandoAgente, setBuscandoAgente] = useState(false);

  const utils = trpc.useUtils();
  const { data: itens = [], isLoading } = trpc.uniformesCrachas.listar.useQuery(
    { chaveJ: filtros.chaveJ || undefined, nomeAgente: filtros.nomeAgente || undefined, tipoItem: filtros.tipoItem || undefined, situacao: filtros.situacao || undefined },
    { refetchOnWindowFocus: true }
  );

  const criarMut = trpc.uniformesCrachas.criar.useMutation({
    onSuccess: () => { utils.uniformesCrachas.listar.invalidate(); toast.success("Registro cadastrado!"); fecharForm(); },
    onError: (e) => toast.error(e.message),
  });
  const editarMut = trpc.uniformesCrachas.editar.useMutation({
    onSuccess: () => { utils.uniformesCrachas.listar.invalidate(); toast.success("Registro atualizado!"); fecharForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deletarMut = trpc.uniformesCrachas.deletar.useMutation({
    onSuccess: () => { utils.uniformesCrachas.listar.invalidate(); toast.success("Registro excluído!"); },
    onError: (e) => toast.error(e.message),
  });
  const uploadFotoMut = trpc.uniformesCrachas.uploadFoto.useMutation({
    onSuccess: () => { utils.uniformesCrachas.listar.invalidate(); toast.success("Foto enviada!"); setUploadingId(null); },
    onError: (e) => { toast.error(e.message); setUploadingId(null); },
  });

  const fecharForm = () => { setShowForm(false); setEditando(null); setForm(emptyForm); setFotoPreview(null); };

  const abrirEditar = (item: ItemUniforme) => {
    setEditando(item);
    setForm({
      chaveJ: item.chaveJ ?? "",
      nomeAgente: item.nomeAgente ?? "",
      tipoItem: item.tipoItem ?? "",
      tamanho: item.tamanho ?? "",
      quantidade: item.quantidade?.toString() ?? "1",
      dataEntrega: item.dataEntrega ?? "",
      situacao: item.situacao ?? "Entregue",
      observacoes: item.observacoes ?? "",
    });
    setFotoPreview(item.fotoUrl ?? null);
    setShowForm(true);
  };

  // Buscar nome do agente ao digitar chaveJ
  const handleChaveJBlur = async () => {
    if (!form.chaveJ.trim() || form.nomeAgente) return;
    setBuscandoAgente(true);
    try {
      const result = await utils.uniformesCrachas.buscarAgente.fetch({ chaveJ: form.chaveJ });
      if (result?.nomeAgente) setForm(f => ({ ...f, nomeAgente: result.nomeAgente! }));
    } catch {}
    setBuscandoAgente(false);
  };

  const handleSubmit = () => {
    if (!form.tipoItem.trim()) { toast.error("Tipo de item é obrigatório"); return; }
    const data = {
      chaveJ: form.chaveJ || undefined,
      nomeAgente: form.nomeAgente || undefined,
      tipoItem: form.tipoItem,
      tamanho: form.tamanho || undefined,
      quantidade: form.quantidade ? parseInt(form.quantidade) : undefined,
      dataEntrega: form.dataEntrega || undefined,
      situacao: form.situacao || undefined,
      observacoes: form.observacoes || undefined,
    };
    if (editando) editarMut.mutate({ id: editando.id, ...data });
    else criarMut.mutate(data);
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>, itemId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto deve ter no máximo 5MB"); return; }
    setUploadingId(itemId);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadFotoMut.mutate({ id: itemId, arquivoNome: file.name, arquivoTipo: file.type, arquivoBase64: base64 });
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
      "Entregue": "bg-green-100 text-green-800",
      "Pendente": "bg-yellow-100 text-yellow-800",
      "Devolvido": "bg-blue-100 text-blue-800",
      "Extraviado": "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cores[s ?? ""] ?? "bg-gray-100 text-gray-800"}`}>{s ?? "-"}</span>;
  };

  // Resumo por tipo
  const resumo = TIPOS_ITEM.map(tipo => ({
    tipo,
    total: itens.filter(i => i.tipoItem === tipo).reduce((s, i) => s + (i.quantidade ?? 1), 0),
  })).filter(r => r.total > 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <PageHeader title="Uniformes e Crachás" />
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
              <Shirt className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setShowForm(true); setEditando(null); setForm(emptyForm); setFotoPreview(null); }} className="bg-green-600 hover:bg-green-700 text-white gap-1">
              <Plus className="w-4 h-4" /> Novo Registro
            </Button>
            
          </div>
        </div>

        {/* Resumo rápido */}
        {resumo.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {resumo.map(r => (
              <div key={r.tipo} className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-sm">
                <span className="font-semibold text-indigo-700">{r.tipo}:</span>
                <span className="ml-1 text-indigo-600">{r.total} un.</span>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Chave J..." value={filtros.chaveJ} onChange={e => setFiltros(f => ({ ...f, chaveJ: e.target.value }))} />
            <Input placeholder="Nome do agente..." value={filtros.nomeAgente} onChange={e => setFiltros(f => ({ ...f, nomeAgente: e.target.value }))} />
            <select className="border rounded-md px-3 py-2 text-sm" value={filtros.tipoItem} onChange={e => setFiltros(f => ({ ...f, tipoItem: e.target.value }))}>
              <option value="">Todos os tipos</option>
              {TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="border rounded-md px-3 py-2 text-sm" value={filtros.situacao} onChange={e => setFiltros(f => ({ ...f, situacao: e.target.value }))}>
              <option value="">Todas as situações</option>
              {SITUACOES_ITEM.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-800">Carregando...</div>
          ) : itens.length === 0 ? (
            <div className="p-8 text-center text-slate-800">Nenhum registro encontrado</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-500 to-purple-500">
                  {["Foto", "Chave J", "Nome Agente", "Tipo Item", "Tamanho", "Qtd", "Data Entrega", "Situação", "Observações", "Ações"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => (
                  <tr key={item.id} className={`border-b border-slate-100 hover:bg-indigo-50 ${i % 2 === 0 ? "bg-white" : "bg-indigo-50/20"}`}>
                    <td className="px-3 py-2">
                      {item.fotoUrl ? (
                        <button onClick={() => setFotoVisualizando(item.fotoUrl!)} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-indigo-300 hover:border-indigo-500 transition-colors">
                          <img src={item.fotoUrl} alt="foto" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFotoChange(e, item.id)} />
                          <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 flex items-center justify-center transition-colors">
                            {uploadingId === item.id ? (
                              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4 text-slate-800" />
                            )}
                          </div>
                        </label>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono">{item.chaveJ || "-"}</td>
                    <td className="px-3 py-2 text-sm font-medium">{item.nomeAgente || "-"}</td>
                    <td className="px-3 py-2 text-sm">{item.tipoItem}</td>
                    <td className="px-3 py-2 text-sm">{item.tamanho || "-"}</td>
                    <td className="px-3 py-2 text-sm text-center font-semibold">{item.quantidade ?? 1}</td>
                    <td className="px-3 py-2 text-sm">{item.dataEntrega || "-"}</td>
                    <td className="px-3 py-2">{situacaoBadge(item.situacao)}</td>
                    <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate">{item.observacoes || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {item.fotoUrl && (
                          <button onClick={() => setFotoVisualizando(item.fotoUrl!)} className="p-1 rounded hover:bg-blue-100 text-blue-600" title="Ver foto">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <label className="cursor-pointer p-1 rounded hover:bg-green-100 text-green-600" title="Enviar foto">
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleFotoChange(e, item.id)} />
                          <Camera className="w-4 h-4" />
                        </label>
                        <button onClick={() => abrirEditar(item)} className="p-1 rounded hover:bg-indigo-100 text-indigo-600" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm("Excluir este registro?")) deletarMut.mutate({ id: item.id }); }} className="p-1 rounded hover:bg-red-100 text-red-600" title="Excluir">
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
        <div className="mt-2 text-sm text-slate-500">{itens.length} registro(s) encontrado(s)</div>
      </div>

      {/* Modal Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fecharForm}>
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editando ? "Editar Registro" : "Novo Uniforme / Crachá"}</h2>
              <button onClick={fecharForm} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>

            {/* Foto no formulário */}
            <div className="mb-4 flex flex-col items-center gap-2">
              {fotoPreview ? (
                <div className="relative">
                  <img src={fotoPreview} alt="preview" className="w-32 h-32 object-cover rounded-xl border-2 border-indigo-300" />
                  <button onClick={() => setFotoPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ) : (
                <label className="cursor-pointer w-32 h-32 border-2 border-dashed border-indigo-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-indigo-500 transition-colors bg-indigo-50">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFotoFormChange} />
                  <Camera className="w-8 h-8 text-indigo-400" />
                  <span className="text-xs text-indigo-600 font-medium">Adicionar foto</span>
                </label>
              )}
              <p className="text-xs text-slate-800">Foto do item (máx. 5MB)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Chave J</label>
                <Input value={form.chaveJ} onChange={e => setForm(f => ({ ...f, chaveJ: e.target.value }))} onBlur={handleChaveJBlur} placeholder="Ex: J9660864" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Agente</label>
                <Input value={form.nomeAgente} onChange={e => setForm(f => ({ ...f, nomeAgente: e.target.value }))} placeholder={buscandoAgente ? "Buscando..." : "Nome do agente"} disabled={buscandoAgente} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Item *</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.tipoItem} onChange={e => setForm(f => ({ ...f, tipoItem: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tamanho</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.tamanho} onChange={e => setForm(f => ({ ...f, tamanho: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {TAMANHOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
                <Input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} type="number" min="1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data de Entrega</label>
                <Input value={form.dataEntrega} onChange={e => setForm(f => ({ ...f, dataEntrega: e.target.value }))} placeholder="DD/MM/AAAA" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Situação</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value }))}>
                  {SITUACOES_ITEM.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm resize-none" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações adicionais..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={fecharForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={criarMut.isPending || editarMut.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {criarMut.isPending || editarMut.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Foto */}
      {fotoVisualizando && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoVisualizando(null)}>
          <div className="relative max-w-2xl w-full">
            <button onClick={() => setFotoVisualizando(null)} className="absolute -top-10 right-0 text-white hover:text-gray-800">
              <X className="w-8 h-8" />
            </button>
            <img src={fotoVisualizando} alt="foto do item" className="w-full rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
