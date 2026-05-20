import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Send, Trash2, Pencil, Settings, Plus, X } from "lucide-react";
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
        "ComissãoOurocap", "Comissão C/C", "Comissão Seguro", "Ajuda de Custo", "Créditos/Débitos",
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
    { label: "Comissão Seguro",    key: "comissaoSeguros",  tipo: "moeda" },
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

  // Modal de confirmação de envio para Pagto
  const [modalEnviarPagto, setModalEnviarPagto] = useState(false);
  const [mesFiltroEnvio, setMesFiltroEnvio] = useState("");
  const [selecionadosEnvio, setSelecionadosEnvio] = useState<Set<number>>(new Set());

  const enviarMutation = trpc.calculosImportados.enviarParaPagto.useMutation({
    onSuccess: (data) => {
      const msg = `✅ ${data.enviados} registro(s) enviado(s) para Pagamentos com sucesso!${
        data.duplicados > 0 ? `\n⚠️ ${data.duplicados} já existiam e foram ignorados.` : ""
      }`;
      alert(msg);
      setSelecionados(new Set());
      setSelecionadosEnvio(new Set());
      setModalEnviarPagto(false);
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
    // Abre o modal de confirmação com os registros selecionados
    setSelecionadosEnvio(new Set(selecionados));
    setMesFiltroEnvio("");
    setModalEnviarPagto(true);
  };

  // Registros filtrados no modal de envio
  const registrosParaEnvio = (registros as any[]).filter(r => selecionadosEnvio.has(r.id));
  const registrosFiltradosEnvio = mesFiltroEnvio
    ? registrosParaEnvio.filter(r => String(r.mesRef) === mesFiltroEnvio)
    : registrosParaEnvio;
  const mesesEnvio = Array.from(new Set(registrosParaEnvio.map((r: any) => String(r.mesRef)).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  const confirmarEnvio = () => {
    // Enviar apenas os que estão marcados E visíveis (filtro por mês aplicado)
    const ids = registrosFiltradosEnvio
      .filter((r: any) => selecionadosEnvio.has(r.id))
      .map((r: any) => r.id);
    if (ids.length === 0) {
      alert("Nenhum registro selecionado para enviar.");
      return;
    }
    enviarMutation.mutate({ ids });
  };

  const todosSelecionados = registros.length > 0 && selecionados.size === registros.length;
  const algunsSelecionados = selecionados.size > 0 && selecionados.size < registros.length;

  // Modal de edição completa
  // Painel Supervisores
  const [showSupervisores, setShowSupervisores] = useState(false);
  const [modalSup, setModalSup] = useState<any | null>(null);
  const [formSup, setFormSup] = useState({ chaveJ: "", nome: "", pctConsig: "", pctConsorcio: "", pctCc: "", pctOurocap: "", pctSeguro: "", pctDental: "" });
  // Auto-preenchimento do nome ao digitar ChaveJ no modal de supervisor
  const [chaveJBuscaSup, setChaveJBuscaSup] = useState("");
  const { data: agenteSup } = trpc.agentes.getByChaveJ.useQuery(
    { chaveJ: chaveJBuscaSup },
    { enabled: chaveJBuscaSup.length >= 3 }
  );
  useEffect(() => {
    if (agenteSup && agenteSup.nomeAgente && modalSup?.novo) {
      setFormSup(p => ({ ...p, nome: agenteSup.nomeAgente ?? p.nome }));
    }
  }, [agenteSup, modalSup?.novo]);

  const { data: supervisores = [], refetch: refetchSup } = trpc.supervisores.listar.useQuery();
  const [calcSup, setCalcSup] = useState<any[]>([]); // preenchido pelo botão Calcular
  const [calculando, setCalculando] = useState(false);

  const calcularSupMut = trpc.supervisores.calcular.useMutation({
    onSuccess: (data) => {
      setCalcSup(data);
      setCalculando(false);
    },
    onError: () => setCalculando(false),
  });

  const handleCalcularSup = () => {
    setCalculando(true);
    calcularSupMut.mutate({ mesRef: mesRef || undefined });
  };

  const criarSupMut = trpc.supervisores.criar.useMutation({ onSuccess: () => { refetchSup(); setModalSup(null); } });
  const editarSupMut = trpc.supervisores.editar.useMutation({ onSuccess: () => { refetchSup(); setModalSup(null); } });
  const excluirSupMut = trpc.supervisores.excluir.useMutation({ onSuccess: () => refetchSup() });

  const abrirNovoSup = () => {
    setModalSup({ novo: true });
    setFormSup({ chaveJ: "", nome: "", pctConsig: "", pctConsorcio: "", pctCc: "", pctOurocap: "", pctSeguro: "", pctDental: "" });
    setChaveJBuscaSup("");
  };

  const abrirEditarSup = (s: any) => {
    setModalSup(s);
    setFormSup({
      chaveJ: s.chaveJ ?? "",
      nome: s.nome ?? "",
      pctConsig: s.pctConsig != null ? String(s.pctConsig) : "",
      pctConsorcio: s.pctConsorcio != null ? String(s.pctConsorcio) : "",
      pctCc: s.pctCc != null ? String(s.pctCc) : "",
      pctOurocap: s.pctOurocap != null ? String(s.pctOurocap) : "",
      pctSeguro: s.pctSeguro != null ? String(s.pctSeguro) : "",
      pctDental: s.pctDental != null ? String(s.pctDental) : "",
    });
  };

  const salvarSup = () => {
    const toNum = (v: string) => parseFloat(v.replace(",", ".")) || 0;
    const payload = {
      chaveJ: formSup.chaveJ,
      nome: formSup.nome,
      pctConsig: toNum(formSup.pctConsig),
      pctConsorcio: toNum(formSup.pctConsorcio),
      pctCc: toNum(formSup.pctCc),
      pctOurocap: toNum(formSup.pctOurocap),
      pctSeguro: toNum(formSup.pctSeguro),
      pctDental: toNum(formSup.pctDental),
    };
    if (modalSup?.novo) criarSupMut.mutate(payload);
    else editarSupMut.mutate({ id: modalSup.id, ...payload });
  };

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
    <>
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

      {/* Filtros + Painel Supervisores */}
      <div className="bg-white border-b border-slate-200 px-3 py-2">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col">
            <label className="block text-[10px] text-slate-500 mb-0.5">Mês/Ano</label>
            <div className="flex items-center gap-2">
              <select
                value={mesRef}
                onChange={(e) => handleFiltroChange(setMesRef)(e.target.value)}
                className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white h-7"
              >
                <option value="">-- Todos --</option>
                {meses.map((m) => (
                  <option key={m} value={m ?? ""}>{fmtMesRef(m)}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">Mês ant.: <strong className="text-slate-600">{getMesAnterior()}</strong></span>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="block text-[10px] text-slate-500 mb-0.5">Chave J</label>
            <Input
              value={chaveJ}
              onChange={(e) => handleFiltroChange(setChaveJ)(e.target.value)}
              placeholder="Ex: J9660864"
              className="text-xs h-7 py-1 w-32"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-[10px] text-slate-500 mb-0.5">Nome Agente</label>
            <Input
              value={nomeAgente}
              onChange={(e) => handleFiltroChange(setNomeAgente)(e.target.value)}
              placeholder="Ex: João Silva"
              className="text-xs h-7 py-1 w-44"
            />
          </div>

          {/* Botão Comissão Supervisor */}
          <div className="flex flex-col">
            <label className="block text-[10px] text-slate-500 mb-0.5">&nbsp;</label>
            <Button
              size="sm"
              onClick={() => setShowSupervisores(v => !v)}
              className="h-7 px-2 text-xs bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1"
            >
              <Settings className="w-3 h-3" /> Comissão Supervisor
            </Button>
          </div>

          <div className="ml-auto flex items-end gap-3 pb-0.5">
            <span className="text-[11px] text-slate-500">{total} registro(s)</span>
            {selecionados.size > 0 && (
              <span className="text-[11px] text-purple-600 font-medium">{selecionados.size} selecionado(s)</span>
            )}
          </div>
        </div>

        {/* Painel expandível de Comissão Supervisor */}
        {showSupervisores && (
          <div className="mt-3 border border-violet-200 rounded-lg bg-violet-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-violet-800">Comissão Supervisor {mesRef ? `— ${fmtMesRef(mesRef)}` : "— Todos os meses"}</span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={handleCalcularSup}
                  disabled={calculando}
                  className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 disabled:opacity-60"
                >
                  {calculando ? (
                    <>⏳ Calculando...</>
                  ) : (
                    <>📊 Calcular</>
                  )}
                </Button>
                <Button size="sm" onClick={abrirNovoSup} className="h-6 px-2 text-[10px] bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Novo Supervisor
                </Button>
              </div>
            </div>
            {/* Lista de supervisores cadastrados — sempre visível com botões editar/excluir */}
            {supervisores.length === 0 ? (
              <p className="text-[11px] text-slate-500">Nenhum supervisor cadastrado. Clique em "Novo Supervisor" para adicionar.</p>
            ) : (
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-violet-500 text-white">
                      <th className="px-2 py-1 text-left">Chave J</th>
                      <th className="px-2 py-1 text-left">Nome</th>
                      <th className="px-2 py-1 text-right">% Consig</th>
                      <th className="px-2 py-1 text-right">% Consórcio</th>
                      <th className="px-2 py-1 text-right">% C/C</th>
                      <th className="px-2 py-1 text-right">% Ourocap</th>
                      <th className="px-2 py-1 text-right">% Seguro</th>
                      <th className="px-2 py-1 text-right">% Dental</th>
                      <th className="px-2 py-1 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisores.map((s: any) => (
                      <tr key={s.id} className="border-b border-violet-100 hover:bg-violet-100">
                        <td className="px-2 py-1 font-mono">{s.chaveJ}</td>
                        <td className="px-2 py-1 font-medium">{s.nome}</td>
                        <td className="px-2 py-1 text-right">{s.pctConsig > 0 ? s.pctConsig.toFixed(2).replace(".",",") + "%" : "-"}</td>
                        <td className="px-2 py-1 text-right">{s.pctConsorcio > 0 ? s.pctConsorcio.toFixed(2).replace(".",",") + "%" : "-"}</td>
                        <td className="px-2 py-1 text-right">{s.pctCc > 0 ? s.pctCc.toFixed(2).replace(".",",") + "%" : "-"}</td>
                        <td className="px-2 py-1 text-right">{s.pctOurocap > 0 ? s.pctOurocap.toFixed(2).replace(".",",") + "%" : "-"}</td>
                        <td className="px-2 py-1 text-right">{s.pctSeguro > 0 ? s.pctSeguro.toFixed(2).replace(".",",") + "%" : "-"}</td>
                        <td className="px-2 py-1 text-right">{s.pctDental > 0 ? s.pctDental.toFixed(2).replace(".",",") + "%" : "-"}</td>
                        <td className="px-2 py-1">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => abrirEditarSup(s)}
                              title="Editar percentuais"
                              className="flex items-center gap-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-medium px-1.5 py-0.5 rounded"
                            >
                              <Pencil className="w-2.5 h-2.5" /> Editar
                            </button>
                            <button
                              onClick={() => { if(confirm(`Excluir ${s.nome}?`)) excluirSupMut.mutate({ id: s.id }); }}
                              title="Excluir supervisor"
                              className="flex items-center gap-0.5 bg-red-500 hover:bg-red-600 text-white text-[9px] font-medium px-1.5 py-0.5 rounded"
                            >
                              <X className="w-2.5 h-2.5" /> Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabela de resultados do cálculo — aparece após clicar em Calcular */}
            {calcSup.length > 0 && (
              <div className="overflow-x-auto border-t border-violet-200 pt-2">
                <p className="text-[10px] font-semibold text-violet-700 mb-1">Resultado do Cálculo:</p>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-violet-700 text-white">
                      <th className="px-2 py-1 text-left">Chave J</th>
                      <th className="px-2 py-1 text-left">Nome</th>
                      <th className="px-2 py-1 text-right">Comis. Consig</th>
                      <th className="px-2 py-1 text-right">Comis. Consórcio</th>
                      <th className="px-2 py-1 text-right">Comis. C/C</th>
                      <th className="px-2 py-1 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcSup.map((s: any) => (
                      <tr key={s.id} className="border-b border-violet-100 hover:bg-violet-100">
                        <td className="px-2 py-1 font-mono">{s.chaveJ}</td>
                        <td className="px-2 py-1">{s.nome}</td>
                        <td className="px-2 py-1 text-right">{s.comissaoConsig > 0 ? fmtMoeda(s.comissaoConsig) : "-"}</td>
                        <td className="px-2 py-1 text-right">{s.comissaoConsorcio > 0 ? fmtMoeda(s.comissaoConsorcio) : "-"}</td>
                        <td className="px-2 py-1 text-right">{s.comissaoCc > 0 ? fmtMoeda(s.comissaoCc) : "-"}</td>
                        <td className="px-2 py-1 text-right font-bold text-violet-800">{fmtMoeda(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-violet-200 font-bold">
                      <td colSpan={2} className="px-2 py-1 text-violet-800">TOTAL GERAL</td>
                      <td className="px-2 py-1 text-right">{fmtMoeda(calcSup.reduce((a:number,s:any)=>a+s.comissaoConsig,0))}</td>
                      <td className="px-2 py-1 text-right">{fmtMoeda(calcSup.reduce((a:number,s:any)=>a+s.comissaoConsorcio,0))}</td>
                      <td className="px-2 py-1 text-right">{fmtMoeda(calcSup.reduce((a:number,s:any)=>a+s.comissaoCc,0))}</td>
                      <td className="px-2 py-1 text-right text-violet-900">{fmtMoeda(calcSup.reduce((a:number,s:any)=>a+s.total,0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
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
            { label: "Comissão Seguro", key: "comissaoSeguros" },
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

    {/* Modal Confirmar Envio para Pagto */}
    <Dialog open={modalEnviarPagto} onOpenChange={(open) => !open && setModalEnviarPagto(false)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar para Pagamentos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Filtro por mês */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Filtrar por Mês:</label>
            <select
              value={mesFiltroEnvio}
              onChange={e => setMesFiltroEnvio(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white h-7"
            >
              <option value="">-- Todos os meses selecionados --</option>
              {mesesEnvio.map(m => (
                <option key={m} value={m}>{fmtMesRef(m)}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {registrosFiltradosEnvio.length} registro(s) a enviar
            </span>
          </div>

          {/* Tabela de registros a enviar */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-2 py-1 text-left">
                    <input
                      type="checkbox"
                      checked={selecionadosEnvio.size > 0 && registrosFiltradosEnvio.every((r: any) => selecionadosEnvio.has(r.id))}
                      onChange={e => {
                        const novo = new Set(selecionadosEnvio);
                        registrosFiltradosEnvio.forEach((r: any) => {
                          if (e.target.checked) novo.add(r.id);
                          else novo.delete(r.id);
                        });
                        setSelecionadosEnvio(novo);
                      }}
                      className="w-3 h-3 cursor-pointer accent-white"
                    />
                  </th>
                  <th className="px-2 py-1 text-left">Mês Ref</th>
                  <th className="px-2 py-1 text-left">Chave J</th>
                  <th className="px-2 py-1 text-left">Nome Agente</th>
                  <th className="px-2 py-1 text-left">Empresa</th>
                  <th className="px-2 py-1 text-right">Comissão Total</th>
                  <th className="px-2 py-1 text-left">Tipo Pagto</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltradosEnvio.length === 0 ? (
                  <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-400">Nenhum registro com os filtros atuais</td></tr>
                ) : (
                  registrosFiltradosEnvio.map((r: any, idx: number) => (
                    <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={selecionadosEnvio.has(r.id)}
                          onChange={() => {
                            const novo = new Set(selecionadosEnvio);
                            if (novo.has(r.id)) novo.delete(r.id);
                            else novo.add(r.id);
                            setSelecionadosEnvio(novo);
                          }}
                          className="w-3 h-3 cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="px-2 py-1 font-mono">{fmtMesRef(r.mesRef)}</td>
                      <td className="px-2 py-1 font-mono">{r.chaveJ ?? "-"}</td>
                      <td className="px-2 py-1">{r.nomeAgente ?? "-"}</td>
                      <td className="px-2 py-1">{r.empresa ?? "-"}</td>
                      <td className="px-2 py-1 text-right">{fmtMoeda(r.comissaoTotal)}</td>
                      <td className="px-2 py-1">{r.tipoPagamento ?? "Comissão"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Resumo */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2">
            <span className="text-xs text-blue-700">
              <strong>{selecionadosEnvio.size > 0 ? registrosFiltradosEnvio.filter((r: any) => selecionadosEnvio.has(r.id)).length : 0}</strong> registro(s) serão enviados para Financeiro → Pagamentos
            </span>
            <span className="text-xs font-bold text-blue-800">
              Total: {fmtMoeda(registrosFiltradosEnvio.filter((r: any) => selecionadosEnvio.has(r.id)).reduce((a: number, r: any) => a + (parseFloat(String(r.comissaoTotal)) || 0), 0))}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setModalEnviarPagto(false)}>Cancelar</Button>
          <Button
            size="sm"
            onClick={confirmarEnvio}
            disabled={enviarMutation.isPending || selecionadosEnvio.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {enviarMutation.isPending ? "Enviando..." : `Enviar ${registrosFiltradosEnvio.filter((r: any) => selecionadosEnvio.has(r.id)).length} registro(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal Novo/Editar Supervisor */}
    <Dialog open={!!modalSup} onOpenChange={(open) => !open && setModalSup(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalSup?.novo ? "Novo Supervisor" : `Editar — ${modalSup?.nome}`}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="flex flex-col gap-1 col-span-2">
            <Label className="text-xs font-medium text-slate-600">Chave J</Label>
            <Input
              value={formSup.chaveJ}
              onChange={e => {
                const v = e.target.value;
                setFormSup(p => ({...p, chaveJ: v}));
                if (modalSup?.novo) setChaveJBuscaSup(v.trim());
              }}
              placeholder="Ex: J9660864"
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <Label className="text-xs font-medium text-slate-600">Nome</Label>
            <Input value={formSup.nome} onChange={e => setFormSup(p => ({...p, nome: e.target.value}))} placeholder="Nome completo" className="h-7 text-xs" />
          </div>
          {([
            { label: "% Consignado", key: "pctConsig" },
            { label: "% Consórcio", key: "pctConsorcio" },
            { label: "% Conta Corrente", key: "pctCc" },
            { label: "% Ourocap", key: "pctOurocap" },
            { label: "% Seguro", key: "pctSeguro" },
            { label: "% Dental", key: "pctDental" },
          ] as { label: string; key: keyof typeof formSup }[]).map(({ label, key }) => (
            <div key={key} className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-slate-600">{label}</Label>
              <Input
                value={formSup[key]}
                onChange={e => setFormSup(p => ({...p, [key]: e.target.value}))}
                placeholder="0,00"
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setModalSup(null)}>Cancelar</Button>
          <Button
            size="sm"
            onClick={salvarSup}
            disabled={criarSupMut.isPending || editarSupMut.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {criarSupMut.isPending || editarSupMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
