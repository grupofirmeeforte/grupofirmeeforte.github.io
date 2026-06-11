import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Send, Trash2, X, RefreshCw, Search, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";

function getMesAtual(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${mm}/${now.getFullYear()}`;
}

function getMesAnterior(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${mm}/${d.getFullYear()}`;
}

function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "R$ 0,00";
  const n = parseFloat(String(v));
  if (isNaN(n)) return "R$ 0,00";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReajustePage() {
  const [, navigate] = useLocation();
  const [aba, setAba] = useState<"automatico" | "manual">("automatico");

  // ── Aba Automático ──────────────────────────────────────────────────────────
  const [filtroMesAuto, setFiltroMesAuto] = useState(getMesAnterior());
  const [filtroEmpresaAuto, setFiltroEmpresaAuto] = useState("");
  const [buscarAtivado, setBuscarAtivado] = useState(false);
  const [selecionadosAuto, setSelecionadosAuto] = useState<string[]>([]); // chaveJ|empresa
  const [mesEnvioAuto, setMesEnvioAuto] = useState(getMesAtual());
  const [showEnviarAutoDialog, setShowEnviarAutoDialog] = useState(false);
  // Edição de linha na aba automática
  const [editandoKey, setEditandoKey] = useState<string | null>(null);
  const [editNovoValor, setEditNovoValor] = useState("");

  const { data: diferencas = [], isLoading: loadingAuto, refetch: refetchAuto } = trpc.reajustes.buscarDiferencas.useQuery(
    { mesRef: filtroMesAuto, empresa: filtroEmpresaAuto || undefined },
    { enabled: buscarAtivado && !!filtroMesAuto }
  );

  // ── Aba Manual ──────────────────────────────────────────────────────────────
  const [filtroMes, setFiltroMes] = useState(getMesAnterior());
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendente" | "enviado" | "cancelado">("pendente");
  const [filtroChaveJ, setFiltroChaveJ] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [mesEnvio, setMesEnvio] = useState(getMesAtual());
  const [showNovoDialog, setShowNovoDialog] = useState(false);
  const [showEnviarDialog, setShowEnviarDialog] = useState(false);

  const [novoForm, setNovoForm] = useState({
    mesRef: getMesAnterior(),
    empresa: "",
    chaveJ: "",
    nomeAgente: "",
    nrOperacao: "",
    tipoProduto: "Consignado",
    convenio: "",
    valorPagoAnterior: "",
    novoValor: "",
    observacao: "",
  });

  const utils = trpc.useUtils();

  const { data: reajustes = [], isLoading } = trpc.reajustes.list.useQuery({
    mesRef: filtroMes || undefined,
    status: filtroStatus,
    chaveJ: filtroChaveJ || undefined,
  });

  const createMutation = trpc.reajustes.create.useMutation({
    onSuccess: () => {
      toast.success("Reajuste criado com sucesso!");
      utils.reajustes.list.invalidate();
      setShowNovoDialog(false);
      setNovoForm({ mesRef: getMesAnterior(), empresa: "", chaveJ: "", nomeAgente: "", nrOperacao: "", tipoProduto: "Consignado", convenio: "", valorPagoAnterior: "", novoValor: "", observacao: "" });
    },
    onError: (e) => toast.error(`Erro ao criar reajuste: ${e.message}`),
  });

  const enviarMutation = trpc.reajustes.enviarParaPagamento.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.enviados} reajuste(s) enviado(s) para pagamento!`);
      utils.reajustes.list.invalidate();
      setSelecionados([]);
      setShowEnviarDialog(false);
    },
    onError: (e) => toast.error(`Erro ao enviar: ${e.message}`),
  });

  // Enviar diferenças automáticas como reajustes
  const criarEmLoteMutation = trpc.reajustes.criarEmLote.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.criados} reajuste(s) criado(s) e enviado(s) para pagamento!`);
      setSelecionadosAuto([]);
      setShowEnviarAutoDialog(false);
      setBuscarAtivado(false);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const cancelarMutation = trpc.reajustes.cancelar.useMutation({
    onSuccess: () => { toast.success("Reajuste cancelado"); utils.reajustes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.reajustes.delete.useMutation({
    onSuccess: () => { toast.success("Reajuste excluído"); utils.reajustes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const totalSelecionado = useMemo(() => {
    return reajustes
      .filter((r) => selecionados.includes(r.id))
      .reduce((acc, r) => acc + parseFloat(String(r.diferenca) || "0"), 0);
  }, [reajustes, selecionados]);

  const totalAutoSelecionado = useMemo(() => {
    return diferencas
      .filter((d) => selecionadosAuto.includes(`${d.chaveJ}|${d.empresa ?? ''}`))
      .reduce((acc, d) => acc + d.diferenca, 0);
  }, [diferencas, selecionadosAuto]);

  const totalPositivo = useMemo(() => diferencas.filter(d => d.diferenca > 0).reduce((a, d) => a + d.diferenca, 0), [diferencas]);
  const totalNegativo = useMemo(() => diferencas.filter(d => d.diferenca < 0).reduce((a, d) => a + d.diferenca, 0), [diferencas]);
  const qtdPositivo = useMemo(() => diferencas.filter(d => d.diferenca > 0).length, [diferencas]);
  const qtdNegativo = useMemo(() => diferencas.filter(d => d.diferenca < 0).length, [diferencas]);

  // Estado local das diferenças para permitir edição
  const [diferencasEditadas, setDiferencasEditadas] = useState<Record<string, number>>({});

  const getDiferenca = (d: typeof diferencas[0]) => {
    const key = `${d.chaveJ}|${d.empresa ?? ''}`;
    return diferencasEditadas[key] !== undefined ? diferencasEditadas[key] : d.diferenca;
  };
  const getNovoValor = (d: typeof diferencas[0]) => {
    const key = `${d.chaveJ}|${d.empresa ?? ''}`;
    return diferencasEditadas[key] !== undefined ? d.valorPago + diferencasEditadas[key] : d.novoValor;
  };

  const pendentes = reajustes.filter((r) => r.status === "pendente");

  function toggleSelecionado(id: number) {
    setSelecionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleTodos() {
    const ids = pendentes.map((r) => r.id);
    setSelecionados(selecionados.length === ids.length ? [] : ids);
  }

  function toggleAutoSelecionado(key: string) {
    setSelecionadosAuto((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  }

  function toggleTodosAuto() {
    const keys = diferencas.filter(d => d.diferenca > 0).map((d) => `${d.chaveJ}|${d.empresa ?? ''}`);
    setSelecionadosAuto(selecionadosAuto.length === keys.length ? [] : keys);
  }

  function handleCriar() {
    const valorAnterior = parseFloat(novoForm.valorPagoAnterior.replace(",", ".")) || 0;
    const novoValor = parseFloat(novoForm.novoValor.replace(",", "."));
    if (!novoForm.chaveJ || !novoForm.mesRef || isNaN(novoValor)) {
      toast.error("Preencha ChaveJ, Mês Ref e Novo Valor");
      return;
    }
    createMutation.mutate({
      mesRef: novoForm.mesRef,
      empresa: novoForm.empresa || undefined,
      chaveJ: novoForm.chaveJ,
      nomeAgente: novoForm.nomeAgente || undefined,
      nrOperacao: novoForm.nrOperacao || undefined,
      tipoProduto: novoForm.tipoProduto || undefined,
      convenio: novoForm.convenio || undefined,
      valorPagoAnterior: valorAnterior,
      novoValor,
      observacao: novoForm.observacao || undefined,
    });
  }

  function handleEnviarAuto() {
    const itens = diferencas
      .filter((d) => selecionadosAuto.includes(`${d.chaveJ}|${d.empresa ?? ''}`))
      .map((d) => ({
        mesRef: d.mesRef ?? filtroMesAuto,
        empresa: d.empresa ?? undefined,
        chaveJ: d.chaveJ,
        nomeAgente: d.nomeAgente ?? undefined,
        valorPagoAnterior: d.valorPago,
        novoValor: getNovoValor(d),
      }));
    criarEmLoteMutation.mutate({ itens, mesAno: mesEnvioAuto });
  }

  function handleSalvarEdicao(key: string, d: typeof diferencas[0]) {
    const novoV = parseFloat(editNovoValor.replace(',', '.'));
    if (!isNaN(novoV)) {
      const novaDif = parseFloat((novoV - d.valorPago).toFixed(2));
      setDiferencasEditadas(prev => ({ ...prev, [key]: novaDif }));
    }
    setEditandoKey(null);
  }

  function handleRemoverLinha(key: string) {
    setDiferencasEditadas(prev => ({ ...prev, [key]: 0 }));
    setSelecionadosAuto(prev => prev.filter(k => k !== key));
  }

  const statusColor: Record<string, string> = {
    pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    enviado: "bg-green-500/20 text-green-300 border-green-500/30",
    cancelado: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">Grupo Firme &amp; Forte</p>
            <p className="text-xs text-blue-400">COBAN — BANCO DO BRASIL</p>
          </div>
          <div className="h-8 w-px bg-gray-600" />
          <h1 className="text-xl font-bold text-white">Reajuste de Comissão</h1>
        </div>
        <Button onClick={() => navigate("/")} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1">
          <ArrowLeft className="w-3 h-3 mr-1" /> Voltar
        </Button>
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4 border-b border-gray-700">
        <button
          onClick={() => setAba("automatico")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${aba === "automatico" ? "border-yellow-400 text-yellow-300" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          <RefreshCw className="w-3 h-3 inline mr-1" /> Diferenças Automáticas
        </button>
        <button
          onClick={() => setAba("manual")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${aba === "manual" ? "border-blue-400 text-blue-300" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          <Plus className="w-3 h-3 inline mr-1" /> Reajustes Manuais
        </button>
      </div>

      {/* ── ABA AUTOMÁTICO ── */}
      {aba === "automatico" && (
        <div>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-4 bg-[#111827] p-3 rounded-lg border border-gray-700 items-end">
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Mês Ref (MM/AAAA)</Label>
              <Input
                value={filtroMesAuto}
                onChange={(e) => { setFiltroMesAuto(e.target.value); setBuscarAtivado(false); }}
                placeholder="MM/AAAA"
                className="bg-[#1a2235] border-gray-600 text-white text-xs w-32 h-8"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Empresa</Label>
              <Input
                value={filtroEmpresaAuto}
                onChange={(e) => { setFiltroEmpresaAuto(e.target.value); setBuscarAtivado(false); }}
                placeholder="BMF, FLEX..."
                className="bg-[#1a2235] border-gray-600 text-white text-xs w-28 h-8"
              />
            </div>
            <Button
              onClick={() => { setBuscarAtivado(true); refetchAuto(); }}
              className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs h-8 px-4"
            >
              <Search className="w-3 h-3 mr-1" /> Buscar Diferenças
            </Button>
            {selecionadosAuto.length > 0 && (
              <Button
                onClick={() => setShowEnviarAutoDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-4"
              >
                <Send className="w-3 h-3 mr-1" /> Enviar Selecionados ({selecionadosAuto.length}) — {fmt(totalAutoSelecionado)}
              </Button>
            )}
          </div>

          {/* Cards de totais */}
          {buscarAtivado && diferencas.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">A Pagar (Positivo)</p>
                  <p className="text-lg font-bold text-green-300">{fmt(totalPositivo)}</p>
                  <p className="text-xs text-gray-500">{qtdPositivo} agente(s)</p>
                </div>
              </div>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">A Descontar (Negativo)</p>
                  <p className="text-lg font-bold text-red-300">{fmt(totalNegativo)}</p>
                  <p className="text-xs text-gray-500">{qtdNegativo} agente(s)</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabela diferenças */}
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a2235] border-b border-gray-700">
                  <th className="p-2 text-left w-8">
                    {diferencas.filter(d => d.diferenca > 0).length > 0 && (
                      <Checkbox
                        checked={selecionadosAuto.length === diferencas.filter(d => d.diferenca > 0).length && diferencas.filter(d => d.diferenca > 0).length > 0}
                        onCheckedChange={toggleTodosAuto}
                        className="border-gray-500"
                      />
                    )}
                  </th>
                  <th className="p-2 text-left text-gray-400">Agente / Empresa</th>
                  <th className="p-2 text-right text-gray-400">Pago / Novo / Dif.</th>
                  <th className="p-2 text-center text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingAuto ? (
                  <tr><td colSpan={8} className="text-center p-8 text-gray-400">Buscando diferenças...</td></tr>
                ) : !buscarAtivado ? (
                  <tr><td colSpan={8} className="text-center p-8 text-gray-500">Selecione o mês e clique em "Buscar Diferenças"</td></tr>
                ) : diferencas.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-green-400">✓ Nenhuma diferença encontrada — todos os valores estão corretos!</td></tr>
                ) : (
                  diferencas.filter(d => getDiferenca(d) !== 0).map((d, i) => {
                    const key = `${d.chaveJ}|${d.empresa ?? ''}`;
                    const isPositivo = getDiferenca(d) > 0;
                    const isEditando = editandoKey === key;
                    return (
                      <tr key={key} className={`border-b border-gray-800 hover:bg-[#1a2235]/50 ${i % 2 === 0 ? "bg-[#0d1526]" : "bg-[#0a0f1e]"}`}>
                        <td className="p-2">
                          {isPositivo && (
                            <Checkbox
                              checked={selecionadosAuto.includes(key)}
                              onCheckedChange={() => toggleAutoSelecionado(key)}
                              className="border-gray-500"
                            />
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-300 font-mono text-[10px]">{d.chaveJ}</span>
                            <span className="text-blue-300 text-[10px]">·{d.mesRef}</span>
                          </div>
                          <div className="text-gray-300 text-[10px]">{d.nomeAgente}</div>
                          <div className="text-gray-500 text-[10px]">{d.empresa || "-"}</div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="text-gray-400 text-[10px]">Pago: {fmt(d.valorPago)}</div>
                          <div className="text-[10px]">
                            Novo:&nbsp;
                            {isEditando ? (
                              <span className="inline-flex items-center gap-1">
                                <Input
                                  autoFocus
                                  value={editNovoValor}
                                  onChange={(e) => setEditNovoValor(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSalvarEdicao(key, d); if (e.key === 'Escape') setEditandoKey(null); }}
                                  className="bg-[#0a0f1e] border-yellow-500 text-white text-xs w-20 h-5 text-right"
                                />
                                <button onClick={() => handleSalvarEdicao(key, d)} className="text-green-400 text-[10px]">OK</button>
                              </span>
                            ) : (
                              <span className="text-green-300">{fmt(getNovoValor(d))}</span>
                            )}
                          </div>
                          <div className={`font-bold text-xs ${getDiferenca(d) > 0 ? "text-yellow-300" : "text-red-400"}`}>
                            Dif: {getDiferenca(d) > 0 ? "+" : ""}{fmt(getDiferenca(d))}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => { setEditandoKey(key); setEditNovoValor(String(getNovoValor(d).toFixed(2)).replace('.', ',')); }}
                              className="text-blue-400 hover:text-blue-300 p-1" title="Editar valor"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRemoverLinha(key)}
                              className="text-red-400 hover:text-red-300 p-1" title="Remover da lista"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA MANUAL ── */}
      {aba === "manual" && (
        <div>
          {/* Filtros + Botão Novo */}
          <div className="flex flex-wrap gap-3 mb-4 bg-[#111827] p-3 rounded-lg border border-gray-700 items-end">
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Mês Ref</Label>
              <Input value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} placeholder="MM/AAAA" className="bg-[#1a2235] border-gray-600 text-white text-xs w-32 h-8" />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Status</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                <SelectTrigger className="bg-[#1a2235] border-gray-600 text-white text-xs w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2235] border-gray-600 text-white">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">ChaveJ</Label>
              <Input value={filtroChaveJ} onChange={(e) => setFiltroChaveJ(e.target.value)} placeholder="Ex: JJ204048" className="bg-[#1a2235] border-gray-600 text-white text-xs w-32 h-8" />
            </div>
            <Button onClick={() => setShowNovoDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3">
              <Plus className="w-3 h-3 mr-1" /> Novo
            </Button>
            {selecionados.length > 0 && (
              <Button onClick={() => setShowEnviarDialog(true)} className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3">
                <Send className="w-3 h-3 mr-1" /> Enviar ({selecionados.length}) — {fmt(totalSelecionado)}
              </Button>
            )}
          </div>

          {/* Tabela manual */}
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a2235] border-b border-gray-700">
                  <th className="p-2 text-left w-8">
                    {(filtroStatus === "pendente" || filtroStatus === "todos") && (
                      <Checkbox checked={selecionados.length === pendentes.length && pendentes.length > 0} onCheckedChange={toggleTodos} className="border-gray-500" />
                    )}
                  </th>
                  <th className="p-2 text-left text-gray-400">Mês Ref</th>
                  <th className="p-2 text-left text-gray-400">ChaveJ / Agente</th>
                  <th className="p-2 text-left text-gray-400">Empresa</th>
                  <th className="p-2 text-left text-gray-400">Produto</th>
                  <th className="p-2 text-right text-gray-400">Valor Pago Ant.</th>
                  <th className="p-2 text-right text-gray-400">Novo Valor</th>
                  <th className="p-2 text-right text-yellow-400">Diferença</th>
                  <th className="p-2 text-left text-gray-400">Status</th>
                  <th className="p-2 text-center text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="text-center p-8 text-gray-400">Carregando...</td></tr>
                ) : reajustes.length === 0 ? (
                  <tr><td colSpan={10} className="text-center p-8 text-gray-400">Nenhum reajuste encontrado.</td></tr>
                ) : (
                  reajustes.map((r, i) => (
                    <tr key={r.id} className={`border-b border-gray-800 hover:bg-[#1a2235]/50 ${i % 2 === 0 ? "bg-[#0d1526]" : "bg-[#0a0f1e]"}`}>
                      <td className="p-2">
                        {r.status === "pendente" && (
                          <Checkbox checked={selecionados.includes(r.id)} onCheckedChange={() => toggleSelecionado(r.id)} className="border-gray-500" />
                        )}
                      </td>
                      <td className="p-2 text-blue-300">{r.mesRef}</td>
                      <td className="p-2">
                        <div className="text-yellow-300 font-mono">{r.chaveJ}</div>
                        <div className="text-gray-400 text-[10px]">{r.nomeAgente}</div>
                      </td>
                      <td className="p-2 text-gray-300">{r.empresa || "-"}</td>
                      <td className="p-2 text-gray-300">{r.tipoProduto || "-"}</td>
                      <td className="p-2 text-right text-gray-400">{fmt(r.valorPagoAnterior)}</td>
                      <td className="p-2 text-right text-green-300">{fmt(r.novoValor)}</td>
                      <td className="p-2 text-right text-yellow-300 font-bold">{fmt(r.diferenca)}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${statusColor[r.status ?? "pendente"] ?? ""}`}>
                          {r.status}
                        </span>
                        {r.status === "enviado" && r.dataEnvio && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{r.dataEnvio}</div>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          {r.status === "pendente" && (
                            <button onClick={() => cancelarMutation.mutate({ id: r.id })} className="text-yellow-400 hover:text-yellow-300 p-1" title="Cancelar">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => { if (confirm("Excluir este reajuste?")) deleteMutation.mutate({ id: r.id }); }} className="text-red-400 hover:text-red-300 p-1" title="Excluir">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog Novo Reajuste Manual */}
      <Dialog open={showNovoDialog} onOpenChange={setShowNovoDialog}>
        <DialogContent className="bg-[#111827] border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Reajuste de Comissão</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-gray-400 mb-1 block">Mês Ref *</Label>
              <Input value={novoForm.mesRef} onChange={(e) => setNovoForm({ ...novoForm, mesRef: e.target.value })} placeholder="MM/AAAA" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-gray-400 mb-1 block">Empresa</Label>
              <Input value={novoForm.empresa} onChange={(e) => setNovoForm({ ...novoForm, empresa: e.target.value })} placeholder="BMF, FLEX..." className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-gray-400 mb-1 block">ChaveJ *</Label>
              <Input value={novoForm.chaveJ} onChange={(e) => setNovoForm({ ...novoForm, chaveJ: e.target.value.toUpperCase() })} placeholder="Ex: JJ204048" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-gray-400 mb-1 block">Nome do Agente</Label>
              <Input value={novoForm.nomeAgente} onChange={(e) => setNovoForm({ ...novoForm, nomeAgente: e.target.value })} placeholder="Deixe vazio para buscar auto" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-gray-400 mb-1 block">Produto</Label>
              <Select value={novoForm.tipoProduto} onValueChange={(v) => setNovoForm({ ...novoForm, tipoProduto: v })}>
                <SelectTrigger className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2235] border-gray-600 text-white">
                  <SelectItem value="Consignado">Consignado</SelectItem>
                  <SelectItem value="Consórcio">Consórcio</SelectItem>
                  <SelectItem value="C/C">C/C</SelectItem>
                  <SelectItem value="Ourocap">Ourocap</SelectItem>
                  <SelectItem value="Seguros">Seguros</SelectItem>
                  <SelectItem value="BB Dental">BB Dental</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400 mb-1 block">Nº Operação</Label>
              <Input value={novoForm.nrOperacao} onChange={(e) => setNovoForm({ ...novoForm, nrOperacao: e.target.value })} placeholder="Nº do contrato" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-gray-400 mb-1 block">Valor Pago Anterior (R$)</Label>
              <Input value={novoForm.valorPagoAnterior} onChange={(e) => setNovoForm({ ...novoForm, valorPagoAnterior: e.target.value })} placeholder="0,00" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-gray-400 mb-1 block">Novo Valor Correto (R$) *</Label>
              <Input value={novoForm.novoValor} onChange={(e) => setNovoForm({ ...novoForm, novoValor: e.target.value })} placeholder="0,00" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            {novoForm.novoValor && (
              <div className="col-span-2 bg-yellow-900/20 border border-yellow-500/30 rounded p-2 text-center">
                <span className="text-yellow-300 text-xs">
                  Diferença a pagar: {fmt(parseFloat(novoForm.novoValor.replace(",", ".") || "0") - parseFloat(novoForm.valorPagoAnterior.replace(",", ".") || "0"))}
                </span>
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-gray-400 mb-1 block">Observação</Label>
              <Textarea value={novoForm.observacao} onChange={(e) => setNovoForm({ ...novoForm, observacao: e.target.value })} placeholder="Motivo do reajuste..." className="bg-[#1a2235] border-gray-600 text-white text-xs h-16 resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setShowNovoDialog(false)} variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs">Cancelar</Button>
            <Button onClick={handleCriar} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Enviar Manual */}
      <Dialog open={showEnviarDialog} onOpenChange={setShowEnviarDialog}>
        <DialogContent className="bg-[#111827] border-gray-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Enviar para Pagamento</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-300 space-y-3">
            <p>{selecionados.length} reajuste(s) selecionado(s)</p>
            <p className="text-yellow-300 font-bold">Total: {fmt(totalSelecionado)}</p>
            <div>
              <Label className="text-gray-400 mb-1 block text-xs">Mês de Pagamento (MM/AAAA)</Label>
              <Input value={mesEnvio} onChange={(e) => setMesEnvio(e.target.value)} placeholder="MM/AAAA" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <p className="text-xs text-gray-400">Os reajustes serão lançados como pagamentos do tipo "Reajuste".</p>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setShowEnviarDialog(false)} variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs">Cancelar</Button>
            <Button onClick={() => enviarMutation.mutate({ ids: selecionados, mesAno: mesEnvio })} disabled={enviarMutation.isPending || !mesEnvio} className="bg-green-600 hover:bg-green-700 text-white text-xs">
              {enviarMutation.isPending ? "Enviando..." : "Confirmar Envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Enviar Automático */}
      <Dialog open={showEnviarAutoDialog} onOpenChange={setShowEnviarAutoDialog}>
        <DialogContent className="bg-[#111827] border-gray-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Enviar Reajustes para Pagamento</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-300 space-y-3">
            <p>{selecionadosAuto.length} agente(s) selecionado(s)</p>
            <p className="text-yellow-300 font-bold">Total a pagar: {fmt(totalAutoSelecionado)}</p>
            <div>
              <Label className="text-gray-400 mb-1 block text-xs">Mês de Pagamento (MM/AAAA)</Label>
              <Input value={mesEnvioAuto} onChange={(e) => setMesEnvioAuto(e.target.value)} placeholder="MM/AAAA" className="bg-[#1a2235] border-gray-600 text-white h-8 text-xs" />
            </div>
            <p className="text-xs text-gray-400">Os reajustes serão criados e lançados como pagamentos do tipo "Reajuste".</p>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setShowEnviarAutoDialog(false)} variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs">Cancelar</Button>
            <Button onClick={handleEnviarAuto} disabled={criarEmLoteMutation.isPending || !mesEnvioAuto} className="bg-green-600 hover:bg-green-700 text-white text-xs">
              {criarEmLoteMutation.isPending ? "Enviando..." : "Confirmar Envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
