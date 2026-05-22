import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";

const TIPOS_COMUNS = ["Água", "Energia", "Aluguel", "Internet", "Telefone", "IPTU", "Condomínio", "Gás", "Outros"];

function maskData(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function maskMesAno(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 6);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function maskValor(v: string) {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const n = parseInt(d, 10) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyForm = {
  loja: "",
  tipo: "",
  tipoCustom: "",
  mesAno: "",
  valor: "",
  vencimento: "",
  observacao: "",
};

export default function ContasLojas() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [filtroLoja, setFiltroLoja] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroMesAno, setFiltroMesAno] = useState("");
  const [filtroPago, setFiltroPago] = useState<"todos" | "pago" | "nao_pago">("todos");

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [arquivoAtual, setArquivoAtual] = useState<{ url: string; nome: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [marcandoPagoId, setMarcandoPagoId] = useState<number | null>(null);
  const [dataPagtoInput, setDataPagtoInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: contas = [], isLoading } = trpc.contasLojas.listar.useQuery({
    loja: filtroLoja || undefined,
    tipo: filtroTipo || undefined,
    mesAno: filtroMesAno || undefined,
    pago: filtroPago,
  });

  const { data: lojas = [] } = trpc.contasLojas.listarLojas.useQuery();

  const criarMutation = trpc.contasLojas.criar.useMutation({
    onSuccess: () => { toast.success("Conta adicionada!"); setShowModal(false); utils.contasLojas.listar.invalidate(); utils.contasLojas.listarLojas.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const editarMutation = trpc.contasLojas.editar.useMutation({
    onSuccess: () => { toast.success("Conta atualizada!"); setShowModal(false); utils.contasLojas.listar.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deletarMutation = trpc.contasLojas.deletar.useMutation({
    onSuccess: () => { toast.success("Conta excluída!"); setDeletandoId(null); utils.contasLojas.listar.invalidate(); utils.contasLojas.listarLojas.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const marcarPagoMutation = trpc.contasLojas.marcarPago.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); setMarcandoPagoId(null); setDataPagtoInput(""); utils.contasLojas.listar.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.contasLojas.uploadArquivo.useMutation({
    onError: (e) => toast.error("Erro no upload: " + e.message),
  });

  function abrirNovo() {
    setEditando(null);
    setForm({ ...emptyForm });
    setArquivoSelecionado(null);
    setArquivoAtual(null);
    setShowModal(true);
  }

  function abrirEditar(conta: any) {
    setEditando(conta.id);
    setForm({
      loja: conta.loja ?? "",
      tipo: TIPOS_COMUNS.includes(conta.tipo) ? conta.tipo : "Outros",
      tipoCustom: TIPOS_COMUNS.includes(conta.tipo) ? "" : conta.tipo,
      mesAno: conta.mesAno ?? "",
      valor: conta.valor ?? "",
      vencimento: conta.vencimento ?? "",
      observacao: conta.observacao ?? "",
    });
    setArquivoSelecionado(null);
    setArquivoAtual(conta.arquivoUrl ? { url: conta.arquivoUrl, nome: conta.arquivoNome ?? "arquivo" } : null);
    setShowModal(true);
  }

  async function salvar() {
    const tipoFinal = form.tipo === "Outros" && form.tipoCustom ? form.tipoCustom : form.tipo;
    if (!form.loja || !tipoFinal) { toast.error("Preencha Loja e Tipo"); return; }

    setUploading(true);
    let arquivoUrl = arquivoAtual?.url;
    let arquivoKey: string | undefined;
    let arquivoNome = arquivoAtual?.nome;

    if (arquivoSelecionado) {
      try {
        const base64 = await fileToBase64(arquivoSelecionado);
        const result = await uploadMutation.mutateAsync({
          fileName: arquivoSelecionado.name,
          fileBase64: base64,
          mimeType: arquivoSelecionado.type,
        });
        arquivoUrl = result.url;
        arquivoKey = result.key;
        arquivoNome = result.fileName;
      } catch {
        setUploading(false);
        return;
      }
    }
    setUploading(false);

    const payload = {
      loja: form.loja,
      tipo: tipoFinal,
      mesAno: form.mesAno || undefined,
      valor: form.valor || undefined,
      vencimento: form.vencimento || undefined,
      observacao: form.observacao || undefined,
      arquivoUrl: arquivoUrl || undefined,
      arquivoKey: arquivoKey || undefined,
      arquivoNome: arquivoNome || undefined,
    };

    if (editando) {
      editarMutation.mutate({ id: editando, ...payload });
    } else {
      criarMutation.mutate(payload);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function confirmarPago(conta: any) {
    setMarcandoPagoId(conta.id);
    setDataPagtoInput(conta.dataPagto ?? "");
  }

  const pendentes = contas.filter(c => !c.pago);
  const pagas = contas.filter(c => c.pago);

  const statusBadge = (conta: any) => {
    if (conta.pago) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-900/60 text-green-300 border border-green-700">✓ Pago</span>;
    if (conta.vencimento) {
      const [d, m, a] = (conta.vencimento as string).split("/");
      const dt = new Date(Number(a), Number(m) - 1, Number(d));
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      if (dt < hoje) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/60 text-red-300 border border-red-700">⚠ Atrasado</span>;
      if (dt.getTime() === hoje.getTime()) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/60 text-yellow-300 border border-yellow-700">🔔 Vence Hoje</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-900/60 text-orange-300 border border-orange-700">Pendente</span>;
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-950 text-white">
      <PageHeader />
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Contas das Lojas</h1>
          <p className="text-gray-400 text-sm mt-0.5">{contas.length} registro(s) — {pendentes.length} pendente(s)</p>
        </div>
        <Button onClick={abrirNovo} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold">
          + Nova Conta
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-900/60 rounded-xl border border-gray-800">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Loja</label>
          <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white min-w-[140px]">
            <option value="">Todas</option>
            {lojas.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tipo</label>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white min-w-[130px]">
            <option value="">Todos</option>
            {TIPOS_COMUNS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Mês/Ano</label>
          <Input value={filtroMesAno} onChange={e => setFiltroMesAno(maskMesAno(e.target.value))}
            placeholder="MM/AAAA" maxLength={7}
            className="bg-gray-800 border-gray-700 text-white w-28 h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Status</label>
          <div className="flex gap-1">
            {(["todos", "nao_pago", "pago"] as const).map(v => (
              <button key={v} onClick={() => setFiltroPago(v)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filtroPago === v ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {v === "todos" ? "Todos" : v === "pago" ? "Pago" : "Pendente"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Carregando...</div>
      ) : contas.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📄</div>
          <p>Nenhuma conta encontrada. Clique em "+ Nova Conta" para começar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900/40 text-blue-200 text-xs uppercase">
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Loja</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Mês/Ano</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="px-3 py-2 text-left">Dt. Pagto</th>
                <th className="px-3 py-2 text-left">Pago por</th>
                <th className="px-3 py-2 text-left">Arquivo</th>
                <th className="px-3 py-2 text-left">Obs.</th>
                <th className="px-3 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((conta, i) => (
                <tr key={conta.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${conta.pago ? "opacity-70" : ""} ${i % 2 === 0 ? "bg-gray-900/60" : "bg-gray-900/30"}`}>
                  <td className="px-3 py-2">{statusBadge(conta)}</td>
                  <td className="px-3 py-2 font-medium">{conta.loja}</td>
                  <td className="px-3 py-2">{conta.tipo}</td>
                  <td className="px-3 py-2">{conta.mesAno || "-"}</td>
                  <td className="px-3 py-2 text-right font-medium text-green-400">
                    {conta.valor ? `R$ ${conta.valor}` : "-"}
                  </td>
                  <td className="px-3 py-2">{conta.vencimento || "-"}</td>
                  <td className="px-3 py-2">{conta.dataPagto || "-"}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{conta.pagoPor || "-"}</td>
                  <td className="px-3 py-2">
                    {conta.arquivoUrl ? (
                      <a href={conta.arquivoUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {conta.arquivoNome ? conta.arquivoNome.slice(0, 20) + (conta.arquivoNome.length > 20 ? "…" : "") : "Ver arquivo"}
                      </a>
                    ) : <span className="text-gray-600 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs max-w-[120px] truncate" title={conta.observacao ?? ""}>
                    {conta.observacao || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {!conta.pago ? (
                        <Button size="sm" variant="outline"
                          onClick={() => confirmarPago(conta)}
                          className="h-6 px-2 text-xs bg-green-900/40 border-green-700 text-green-300 hover:bg-green-800">
                          Marcar Pago
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline"
                          onClick={() => marcarPagoMutation.mutate({ id: conta.id, pago: false, dataPagto: undefined })}
                          className="h-6 px-2 text-xs bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                          Desmarcar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => abrirEditar(conta)}
                        className="h-6 px-2 text-xs bg-blue-900/40 border-blue-700 text-blue-300 hover:bg-blue-800">✏</Button>
                      <Button size="sm" variant="outline" onClick={() => setDeletandoId(conta.id)}
                        className="h-6 px-2 text-xs bg-red-900/40 border-red-700 text-red-300 hover:bg-red-800">🗑</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Marcar Pago */}
      {marcandoPagoId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Confirmar Pagamento</h2>
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Data do Pagamento</label>
              <Input value={dataPagtoInput} onChange={e => setDataPagtoInput(maskData(e.target.value))}
                placeholder="DD/MM/AAAA" maxLength={10}
                className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMarcandoPagoId(null)}
                className="border-gray-600 text-gray-300">Cancelar</Button>
              <Button onClick={() => marcarPagoMutation.mutate({ id: marcandoPagoId, pago: true, dataPagto: dataPagtoInput || undefined })}
                className="bg-green-600 hover:bg-green-500 text-white">
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Conta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-5">{editando ? "Editar Conta" : "Nova Conta"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Loja *</label>
                <Input value={form.loja} onChange={e => setForm(p => ({ ...p, loja: e.target.value }))}
                  placeholder="Nome da loja" className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Tipo de Despesa *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TIPOS_COMUNS.map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(p => ({ ...p, tipo: t, tipoCustom: "" }))}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${form.tipo === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {form.tipo === "Outros" && (
                  <Input value={form.tipoCustom} onChange={e => setForm(p => ({ ...p, tipoCustom: e.target.value }))}
                    placeholder="Especifique o tipo..." className="bg-gray-800 border-gray-700 text-white mt-1" />
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Mês/Ano</label>
                <Input value={form.mesAno} onChange={e => setForm(p => ({ ...p, mesAno: maskMesAno(e.target.value) }))}
                  placeholder="MM/AAAA" maxLength={7} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Valor</label>
                <Input value={form.valor} onChange={e => setForm(p => ({ ...p, valor: maskValor(e.target.value) }))}
                  placeholder="0,00" className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Vencimento</label>
                <Input value={form.vencimento} onChange={e => setForm(p => ({ ...p, vencimento: maskData(e.target.value) }))}
                  placeholder="DD/MM/AAAA" maxLength={10} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Observação</label>
                <Input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                  placeholder="Observação opcional" className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Arquivo (PDF, imagem)</label>
                {arquivoAtual && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-gray-800 rounded border border-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <a href={arquivoAtual.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline flex-1 truncate">{arquivoAtual.nome}</a>
                    <button onClick={() => setArquivoAtual(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                  </div>
                )}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-600 transition-colors">
                  {arquivoSelecionado ? (
                    <p className="text-blue-400 text-sm">{arquivoSelecionado.name}</p>
                  ) : (
                    <p className="text-gray-500 text-sm">Clique para selecionar ou arraste o arquivo aqui<br/><span className="text-xs">PDF, JPG, PNG — máx. 16MB</span></p>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 16 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 16MB)"); return; }
                      setArquivoSelecionado(f);
                    }
                  }} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}
                className="border-gray-600 text-gray-300">Cancelar</Button>
              <Button onClick={salvar} disabled={uploading || criarMutation.isPending || editarMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white">
                {uploading ? "Enviando arquivo..." : (criarMutation.isPending || editarMutation.isPending) ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {deletandoId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h2>
            <p className="text-gray-400 text-sm mb-5">Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeletandoId(null)} className="border-gray-600 text-gray-300">Cancelar</Button>
              <Button onClick={() => deletarMutation.mutate({ id: deletandoId! })}
                className="bg-red-600 hover:bg-red-500 text-white">Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
