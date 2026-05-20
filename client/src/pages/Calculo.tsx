import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Send, Trash2, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const fmtMoeda = (v: any) => {
  if (v === null || v === undefined || v === "" || v === "NULL") return "-";
  const n = parseFloat(String(v));
  if (isNaN(n)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const fmtPerc = (v: any) => {
  if (v === null || v === undefined || v === "" || v === "NULL") return "-";
  const n = parseFloat(String(v));
  if (isNaN(n)) return "-";
  // Formato 00,00% (2 casas decimais)
  return (n * 100).toFixed(2).replace(".", ",") + "%";
};

const fmtTexto = (v: any) => {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
};

const fmtMesRef = (v: string | null | undefined) => {
  if (!v) return "-";
  const s = String(v);
  if (s.length === 3) return s.slice(0, 1).padStart(2, "0") + "/20" + s.slice(1);
  if (s.length === 4) return s.slice(0, 2) + "/20" + s.slice(2);
  return s;
};

export default function Calculo() {
  const [, navigate] = useLocation();
  const [mesRef, setMesRef] = useState("");
  const [chaveJ, setChaveJ] = useState("");
  const [nomeAgente, setNomeAgente] = useState("");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const LIMIT = 100;

  const { data: meses = [] } = trpc.calculosImportados.mesesDisponiveis.useQuery();
  const { data: registros = [], isLoading } = trpc.calculosImportados.listar.useQuery({
    mesRef: mesRef || undefined,
    chaveJ: chaveJ || undefined,
    nomeAgente: nomeAgente || undefined,
    page,
    limit: LIMIT,
  });
  const { data: total = 0 } = trpc.calculosImportados.contar.useQuery({
    mesRef: mesRef || undefined,
    chaveJ: chaveJ || undefined,
    nomeAgente: nomeAgente || undefined,
  });
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Reset página ao mudar filtros
  const handleFiltroChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  // Mês anterior dinâmico
  const getMesAnterior = () => {
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = String(hoje.getFullYear()).slice(-2);
    if (mes === 1) return `12${String(parseInt(ano) - 1).padStart(2, "0")}`;
    return `${mes - 1}${ano}`;
  };

  const toggleSelecionado = (id: number) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === registros.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set((registros as any[]).map((r) => r.id)));
    }
  };

  const handleExportar = () => {
    import("xlsx").then((XLSX) => {
      const cab = [
        "TipoPagamento", "Empresa", "Situação", "Mês Ref", "Chave J", "Nome Agente", "Cidade",
        "Percentual", "Comissão Total", "RBM Total", "Comissão Consig", "Comissão Consórcio",
        "ComissãoOurocap", "Comissão C/C", "Seguros", "Ajuda de Custo", "Créditos/Débitos",
        "Adiantamento", "Reajuste", "RbmcreditoC2", "RBMContaCorrente", "RbmConsorcioC2",
        "RBMOurocap", "RBM Seguros", "Qtde Contas", "Vr. Liquido", "SRCC", "VrLiquido-Srcc", "Dt Pagto",
      ];
      const linhas = (registros as any[]).map((r) => [
        r.tipoPagamento ?? "", r.empresa ?? "", r.situacao ?? "", fmtMesRef(r.mesRef),
        r.chaveJ ?? "", r.nomeAgente ?? "", r.cidade ?? "",
        r.percentual ? parseFloat(r.percentual) * 100 : "",
        r.comissaoTotal ? parseFloat(r.comissaoTotal) : "",
        r.rbmTotal ? parseFloat(r.rbmTotal) : "",
        r.comissaoConsig ? parseFloat(r.comissaoConsig) : "",
        r.comissaoConsorcio ? parseFloat(r.comissaoConsorcio) : "",
        r.comissaoOurocap ? parseFloat(r.comissaoOurocap) : "",
        r.comissaoCc ? parseFloat(r.comissaoCc) : "",
        r.comissaoSeguros ? parseFloat(r.comissaoSeguros) : "",
        r.ajudaCusto ? parseFloat(r.ajudaCusto) : "",
        r.creditosDebitos ? parseFloat(r.creditosDebitos) : "",
        r.adiantamento ? parseFloat(r.adiantamento) : "",
        r.reajuste ? parseFloat(r.reajuste) : "",
        r.rbmCreditoC2 ? parseFloat(r.rbmCreditoC2) : "",
        r.rbmContaCorrente ? parseFloat(r.rbmContaCorrente) : "",
        r.rbmConsorcioC2 ? parseFloat(r.rbmConsorcioC2) : "",
        r.rbmOurocap ? parseFloat(r.rbmOurocap) : "",
        r.rbmSeguros ? parseFloat(r.rbmSeguros) : "",
        r.qtdeContas ?? "",
        r.vrLiquidoC2 ? parseFloat(r.vrLiquidoC2) : "",
        r.srccC2 ? parseFloat(r.srccC2) : "",
        r.vrLiquidoSrcc ? parseFloat(r.vrLiquidoSrcc) : "",
        r.dtPagto ?? "",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Calculo-C2");
      XLSX.writeFile(wb, `calculo_${mesRef || "todos"}.xlsx`);
    });
  };

  // Colunas na ordem EXATA da planilha Calculo-C2
  const colunas = [
    { label: "TipoPagamento",      key: "tipoPagamento",    tipo: "texto" },
    { label: "Empresa",            key: "empresa",          tipo: "texto" },
    { label: "Situação",           key: "situacao",         tipo: "texto" },
    { label: "Mês Ref",            key: "mesRef",           tipo: "mesRef" },
    { label: "Chave J",            key: "chaveJ",           tipo: "texto" },
    { label: "Nome Agente",        key: "nomeAgente",       tipo: "texto" },
    { label: "Cidade",             key: "cidade",           tipo: "texto" },
    { label: "Percentual",         key: "percentual",       tipo: "perc" },
    { label: "Comissão Total",     key: "comissaoTotal",    tipo: "moeda" },
    { label: "RBM Total",          key: "rbmTotal",         tipo: "moeda" },
    { label: "Comissão Consig",    key: "comissaoConsig",   tipo: "moeda" },
    { label: "Comissão Consórcio", key: "comissaoConsorcio",tipo: "moeda" },
    { label: "ComissãoOurocap",    key: "comissaoOurocap",  tipo: "moeda" },
    { label: "Comissão C/C",       key: "comissaoCc",       tipo: "moeda" },
    { label: "Seguros",            key: "comissaoSeguros",  tipo: "moeda" },
    { label: "Ajuda de Custo",     key: "ajudaCusto",       tipo: "moeda" },
    { label: "Créditos/Débitos",   key: "creditosDebitos",  tipo: "moeda" },
    { label: "Adiantamento",       key: "adiantamento",     tipo: "moeda" },
    { label: "Reajuste",           key: "reajuste",         tipo: "moeda" },
    { label: "RbmcreditoC2",       key: "rbmCreditoC2",     tipo: "moeda" },
    { label: "RBMContaCorrente",   key: "rbmContaCorrente", tipo: "moeda" },
    { label: "RbmConsorcioC2",     key: "rbmConsorcioC2",   tipo: "moeda" },
    { label: "RBMOurocap",         key: "rbmOurocap",       tipo: "moeda" },
    { label: "RBM Seguros",        key: "rbmSeguros",       tipo: "moeda" },
    { label: "Qtde Contas",        key: "qtdeContas",       tipo: "texto" },
    { label: "Vr. Liquido",        key: "vrLiquidoC2",      tipo: "moeda" },
    { label: "SRCC",               key: "srccC2",           tipo: "moeda" },
    { label: "VrLiquido-Srcc",     key: "vrLiquidoSrcc",    tipo: "moeda" },
    { label: "Dt Pagto",           key: "dtPagto",          tipo: "texto" },
  ] as const;

  const renderVal = (r: any, col: typeof colunas[number]) => {
    const v = r[col.key];
    if (col.tipo === "moeda") return fmtMoeda(v);
    if (col.tipo === "perc")  return fmtPerc(v);
    if (col.tipo === "mesRef") return fmtMesRef(v);
    return fmtTexto(v);
  };

  // Totais das colunas monetárias
  const soma = (key: string) =>
    (registros as any[]).reduce((acc, r) => acc + (parseFloat(String(r[key])) || 0), 0);

  const enviarMutation = trpc.calculosImportados.enviarParaPagto.useMutation({
    onSuccess: (data) => {
      const msg = `✅ ${data.enviados} registro(s) enviado(s) para Pagamentos com sucesso!${
        data.duplicados > 0 ? `\n⚠️ ${data.duplicados} já existiam e foram ignorados.` : ""
      }`;
      alert(msg);
      setSelecionados(new Set());
    },
    onError: (err) => {
      alert(`Erro ao enviar: ${err.message}`);
    },
  });

  const handleEnviarParaPagto = () => {
    if (selecionados.size === 0) {
      alert("Selecione ao menos uma linha para enviar para pagamento.");
      return;
    }
    if (!confirm(`Deseja enviar ${selecionados.size} registro(s) para Financeiro → Pagamentos?`)) return;
    enviarMutation.mutate({ ids: Array.from(selecionados) });
  };

  const todosSelecionados = registros.length > 0 && selecionados.size === registros.length;
  const algunsSelecionados = selecionados.size > 0 && selecionados.size < registros.length;

  // Modal de edição completa
  const [modalEditar, setModalEditar] = useState<any | null>(null);
  const [formEditar, setFormEditar] = useState<Record<string, string>>({});

  const abrirEditar = (r: any) => {
    setModalEditar(r);
    setFormEditar({
      tipoPagamento: r.tipoPagamento ?? "",
      empresa: r.empresa ?? "",
      situacao: r.situacao ?? "",
      mesRef: r.mesRef ?? "",
      chaveJ: r.chaveJ ?? "",
      nomeAgente: r.nomeAgente ?? "",
      cidade: r.cidade ?? "",
      percentual: r.percentual != null ? (parseFloat(String(r.percentual)) * 100).toFixed(2) : "",
      comissaoTotal: r.comissaoTotal ?? "",
      rbmTotal: r.rbmTotal ?? "",
      comissaoConsig: r.comissaoConsig ?? "",
      comissaoConsorcio: r.comissaoConsorcio ?? "",
      comissaoOurocap: r.comissaoOurocap ?? "",
      comissaoCc: r.comissaoCc ?? "",
      comissaoSeguros: r.comissaoSeguros ?? "",
      ajudaCusto: r.ajudaCusto ?? "",
      creditosDebitos: r.creditosDebitos ?? "",
      adiantamento: r.adiantamento ?? "",
      reajuste: r.reajuste ?? "",
      rbmCreditoC2: r.rbmCreditoC2 ?? "",
      rbmContaCorrente: r.rbmContaCorrente ?? "",
      rbmConsorcioC2: r.rbmConsorcioC2 ?? "",
      rbmOurocap: r.rbmOurocap ?? "",
      rbmSeguros: r.rbmSeguros ?? "",
      qtdeContas: r.qtdeContas != null ? String(r.qtdeContas) : "",
      vrLiquidoC2: r.vrLiquidoC2 ?? "",
      srccC2: r.srccC2 ?? "",
      vrLiquidoSrcc: r.vrLiquidoSrcc ?? "",
      dtPagto: r.dtPagto ?? "",
    });
  };

  const salvarEdicao = () => {
    if (!modalEditar) return;
    const toNum = (v: string) => v === "" ? undefined : parseFloat(v.replace(",", "."));
    editarMutation.mutate({
      id: modalEditar.id,
      tipoPagamento: formEditar.tipoPagamento || undefined,
      empresa: formEditar.empresa || undefined,
      situacao: formEditar.situacao || undefined,
      mesRef: formEditar.mesRef || undefined,
      chaveJ: formEditar.chaveJ || undefined,
      nomeAgente: formEditar.nomeAgente || undefined,
      cidade: formEditar.cidade || undefined,
      percentual: formEditar.percentual !== "" ? (parseFloat(formEditar.percentual.replace(",", ".")) / 100) : undefined,
      comissaoTotal: toNum(formEditar.comissaoTotal),
      rbmTotal: toNum(formEditar.rbmTotal),
      comissaoConsig: toNum(formEditar.comissaoConsig),
      comissaoConsorcio: toNum(formEditar.comissaoConsorcio),
      comissaoOurocap: toNum(formEditar.comissaoOurocap),
      comissaoCc: toNum(formEditar.comissaoCc),
      comissaoSeguros: toNum(formEditar.comissaoSeguros),
      ajudaCusto: toNum(formEditar.ajudaCusto),
      creditosDebitos: toNum(formEditar.creditosDebitos),
      adiantamento: toNum(formEditar.adiantamento),
      reajuste: toNum(formEditar.reajuste),
      rbmCreditoC2: toNum(formEditar.rbmCreditoC2),
      rbmContaCorrente: toNum(formEditar.rbmContaCorrente),
      rbmConsorcioC2: toNum(formEditar.rbmConsorcioC2),
      rbmOurocap: toNum(formEditar.rbmOurocap),
      rbmSeguros: toNum(formEditar.rbmSeguros),
      qtdeContas: formEditar.qtdeContas !== "" ? parseInt(formEditar.qtdeContas) : undefined,
      vrLiquidoC2: toNum(formEditar.vrLiquidoC2),
      srccC2: toNum(formEditar.srccC2),
      vrLiquidoSrcc: toNum(formEditar.vrLiquidoSrcc),
      dtPagto: formEditar.dtPagto || undefined,
    }, {
      onSuccess: () => {
        utils.calculosImportados.listar.invalidate();
        setModalEditar(null);
      },
      onError: (err) => alert("Erro ao salvar: " + err.message),
    });
  };

  // Edição inline de Dt Pagto
  const [editandoDtPagto, setEditandoDtPagto] = useState<number | null>(null);
  const [valorDtPagto, setValorDtPagto] = useState("");
  const dtPagtoInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const editarMutation = trpc.calculosImportados.editar.useMutation();
  const deletarMutation = trpc.calculosImportados.deletar.useMutation({
    onSuccess: () => {
      utils.calculosImportados.listar.invalidate();
      utils.calculosImportados.contar.invalidate();
    },
  });

  const iniciarEdicaoDt = (r: any) => {
    setEditandoDtPagto(r.id);
    setValorDtPagto(r.dtPagto ?? "");
    setTimeout(() => dtPagtoInputRef.current?.focus(), 50);
  };

  const salvarDtPagto = (id: number) => {
    // Se há linhas selecionadas E a linha editada está entre elas, aplica em todas
    const idsParaSalvar =
      selecionados.size > 1 && selecionados.has(id)
        ? Array.from(selecionados)
        : [id];

    idsParaSalvar.forEach((rid) => {
      editarMutation.mutate({ id: rid, dtPagto: valorDtPagto || undefined });
    });

    // Invalida a lista uma única vez após todas as mutações
    setTimeout(() => {
      utils.calculosImportados.listar.invalidate();
      setEditandoDtPagto(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-800">Cálculo</h1>
          <p className="text-[10px] text-slate-500">
            {registros.length} registro(s)
            {selecionados.size > 0 && (
              <span className="ml-2 text-purple-600 font-medium">· {selecionados.size} selecionado(s)</span>
            )}
          </p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <Button onClick={handleExportar} size="sm" className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 h-7 px-2 text-xs">
            <Download className="w-3 h-3" /> Excel
          </Button>
          <Button
            onClick={handleEnviarParaPagto}
            disabled={enviarMutation.isPending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 h-7 px-2 text-xs disabled:opacity-60"
          >
            <Send className="w-3 h-3" /> Enviar Para Pagto
          </Button>
          <Button size="sm" onClick={() => navigate("/")} className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b border-slate-200 px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Mês/Ano</label>
            <select
              value={mesRef}
              onChange={(e) => handleFiltroChange(setMesRef)(e.target.value)}
              className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white"
            >
              <option value=""></option>
              {meses.map((m) => (
                <option key={m} value={m ?? ""}>{fmtMesRef(m)}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-0.5">Mês ant.: {getMesAnterior()}</p>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Chave J</label>
            <Input
              value={chaveJ}
              onChange={(e) => handleFiltroChange(setChaveJ)(e.target.value)}
              placeholder="Ex: J9660864"
              className="text-xs h-7 py-1"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Nome Agente</label>
            <Input
              value={nomeAgente}
              onChange={(e) => handleFiltroChange(setNomeAgente)(e.target.value)}
              placeholder="Ex: João Silva"
              className="text-xs h-7 py-1"
            />
          </div>
        </div>
      </div>

      {/* Paginador TOPO */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200">
        <span className="text-[11px] text-slate-500">{total} registros · Pág. {page}/{totalPages}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      </div>
      {/* Tabela */}
      <div className="bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum registro encontrado</div>
        ) : (
          <table className="w-full border-collapse" style={{ fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "linear-gradient(90deg, #a855f7, #ec4899)" }}>
                {/* Coluna de checkbox */}
                <th className="px-1.5 py-1.5 text-center border-r border-white/20 w-6">
                  <input
                    type="checkbox"
                    checked={todosSelecionados}
                    ref={(el) => { if (el) el.indeterminate = algunsSelecionados; }}
                    onChange={toggleTodos}
                    className="w-3 h-3 cursor-pointer accent-white"
                    title="Selecionar todos"
                  />
                </th>
                {colunas.map((col) => (
                  <th
                    key={col.key}
                    className="px-1.5 py-1.5 text-left font-bold text-white whitespace-nowrap border-r border-white/20 last:border-r-0"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-1.5 py-1.5 text-center border-l border-white/20 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {(registros as any[]).map((r, idx) => (
                <tr
                  key={r.id}
                  className={
                    selecionados.has(r.id)
                      ? "bg-purple-100 hover:bg-purple-150"
                      : idx % 2 === 0
                      ? "bg-white hover:bg-purple-50"
                      : "bg-slate-50 hover:bg-purple-50"
                  }
                >
                  {/* Checkbox da linha */}
                  <td className="px-1.5 py-1 text-center border-b border-slate-100 w-6">
                    <input
                      type="checkbox"
                      checked={selecionados.has(r.id)}
                      onChange={() => toggleSelecionado(r.id)}
                      className="w-3 h-3 cursor-pointer accent-purple-600"
                    />
                  </td>
                  {colunas.map((col) => (
                    <td
                      key={col.key}
                      className={`px-1.5 py-1 whitespace-nowrap border-b border-slate-100 ${col.tipo === "moeda" ? "text-right" : ""}`}
                    >
                      {col.key === "dtPagto" ? (
                        editandoDtPagto === r.id ? (
                          <input
                            ref={dtPagtoInputRef}
                            type="text"
                            value={valorDtPagto}
                            onChange={(e) => setValorDtPagto(e.target.value)}
                            onBlur={() => salvarDtPagto(r.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") salvarDtPagto(r.id);
                              if (e.key === "Escape") setEditandoDtPagto(null);
                            }}
                            placeholder="DD/MM/AAAA"
                            maxLength={10}
                            className="w-28 border border-purple-400 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                          />
                        ) : (
                          <span
                            onClick={() => iniciarEdicaoDt(r)}
                            className="cursor-pointer hover:bg-purple-100 rounded px-1 py-0.5 min-w-[6rem] inline-block text-slate-700 border border-transparent hover:border-purple-300"
                            title={selecionados.size > 1 && selecionados.has(r.id) ? `Clique para editar e aplicar em ${selecionados.size} linhas selecionadas` : "Clique para editar"}
                          >
                            {r.dtPagto || <span className="text-slate-300 italic">DD/MM/AAAA</span>}
                          </span>
                        )
                      ) : (
                        renderVal(r, col)
                      )}
                    </td>
                  ))}
                  {/* Botões de ação: editar + deletar */}
                  <td className="px-1.5 py-1 text-center border-b border-slate-100 border-l border-l-slate-200">
                    <div className="flex items-center gap-1 justify-center">
                      <button
                        onClick={() => abrirEditar(r)}
                        className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
                        title="Editar registro"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir registro de ${r.nomeAgente ?? r.chaveJ}?`)) {
                            deletarMutation.mutate({ id: r.id });
                          }
                        }}
                        className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "linear-gradient(90deg, #7e22ce, #be185d)" }} className="font-bold text-white">
                {/* Célula vazia para coluna de checkbox */}
                <td className="px-1.5 py-1.5" />
                {colunas.map((col, i) => (
                  <td
                    key={col.key}
                    className={`px-1.5 py-1.5 whitespace-nowrap ${col.tipo === "moeda" ? "text-right" : ""}`}
                  >
                    {i === 0
                      ? "TOTAL"
                      : col.tipo === "moeda"
                      ? fmtMoeda(soma(col.key))
                      : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      {/* Paginador RODAPÉ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-t border-slate-200">
          <span className="text-[11px] text-slate-500">{total} registros · Pág. {page}/{totalPages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    {/* Modal de edição completa */}
    <Dialog open={!!modalEditar} onOpenChange={(open) => !open && setModalEditar(null)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Registro — {modalEditar?.nomeAgente ?? modalEditar?.chaveJ}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {([
            { label: "Tipo Pagamento", key: "tipoPagamento" },
            { label: "Empresa", key: "empresa" },
            { label: "Situação", key: "situacao" },
            { label: "Mês Ref (MMAA)", key: "mesRef" },
            { label: "Chave J", key: "chaveJ" },
            { label: "Nome Agente", key: "nomeAgente" },
            { label: "Cidade", key: "cidade" },
            { label: "Percentual (%)", key: "percentual" },
            { label: "Comissão Total", key: "comissaoTotal" },
            { label: "RBM Total", key: "rbmTotal" },
            { label: "Comissão Consig", key: "comissaoConsig" },
            { label: "Comissão Consórcio", key: "comissaoConsorcio" },
            { label: "Comissão Ourocap", key: "comissaoOurocap" },
            { label: "Comissão C/C", key: "comissaoCc" },
            { label: "Seguros", key: "comissaoSeguros" },
            { label: "Ajuda de Custo", key: "ajudaCusto" },
            { label: "Créditos/Débitos", key: "creditosDebitos" },
            { label: "Adiantamento", key: "adiantamento" },
            { label: "Reajuste", key: "reajuste" },
            { label: "RBM Crédito C2", key: "rbmCreditoC2" },
            { label: "RBM Conta Corrente", key: "rbmContaCorrente" },
            { label: "RBM Consórcio C2", key: "rbmConsorcioC2" },
            { label: "RBM Ourocap", key: "rbmOurocap" },
            { label: "RBM Seguros", key: "rbmSeguros" },
            { label: "Qtde Contas", key: "qtdeContas" },
            { label: "Vr. Líquido C2", key: "vrLiquidoC2" },
            { label: "SRCC", key: "srccC2" },
            { label: "VrLiquido-Srcc", key: "vrLiquidoSrcc" },
            { label: "Dt Pagto (DD/MM/AAAA)", key: "dtPagto" },
          ] as { label: string; key: string }[]).map(({ label, key }) => (
            <div key={key} className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-slate-600">{label}</Label>
              <Input
                value={formEditar[key] ?? ""}
                onChange={(e) => setFormEditar(prev => ({ ...prev, [key]: e.target.value }))}
                className="h-7 text-xs"
                placeholder={label}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setModalEditar(null)}>Cancelar</Button>
          <Button size="sm" onClick={salvarEdicao} disabled={editarMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white">
            {editarMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
