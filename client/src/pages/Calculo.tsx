import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Send, Trash2, Pencil, Settings, Plus, X, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

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
  return String(v); // já está no formato MM/AAAA
};

export default function Calculo() {
  useRegistrarModulo('Cálculo');
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
  const recalcularMutation = trpc.calculosImportados.recalcularConsigECalculo.useMutation({
    onSuccess: (data) => {
      alert(`✅ Consignado: ${data.consigAtualizados} registro(s) recalculado(s).\nCálculo: ${data.calculosAtualizados} registro(s) atualizado(s).`);
      utils.calculosImportados.listar.invalidate();
    },
    onError: (err) => {
      alert(`Erro ao recalcular: ${err.message}`);
    },
  });
  const handleRecalcularTotais = () => {
    if (!mesRef) {
      alert("Selecione um mês específico para recalcular.");
      return;
    }
    if (!confirm(`Recalcular Consignado + Cálculo para ${mesRef}?\n\nEste processo vai:\n1. Recalcular percPago e comissão de cada operação de consignado com base nas tabelas atuais\n2. Atualizar comissaoConsig e comissaoTotal no Cálculo\n3. Atualizar o ativo atual do agente`)) return;
    recalcularMutation.mutate({ mesRef });
  };

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
  // calcular é uma query automática — recalcula quando mesRef muda
  const { data: calcSup = [], isFetching: calculando, refetch: refetchCalcSup } = trpc.supervisores.calcular.useQuery(
    { mesRef: mesRef || undefined },
    { enabled: true }
  );

  const criarSupMut = trpc.supervisores.criar.useMutation({ onSuccess: () => { refetchSup(); setModalSup(null); } });
  const editarSupMut = trpc.supervisores.editar.useMutation({ onSuccess: () => { refetchSup(); setModalSup(null); } });
  const excluirSupMut = trpc.supervisores.excluir.useMutation({ onSuccess: () => refetchSup() });
  const [dtPagtoSup, setDtPagtoSup] = useState('');
  const enviarSupPagtoMut = trpc.supervisores.enviarParaPagto.useMutation({
    onSuccess: (data) => {
      alert(`✅ ${data.inseridos} inserido(s), ${data.atualizados} atualizado(s) em Pagamentos.`);
    },
    onError: (err) => alert('Erro: ' + err.message),
  });
  const handleEnviarSupParaPagto = () => {
    if (!mesRef) { alert('Selecione um mês específico.'); return; }
    if (!dtPagtoSup) { alert('Informe a data de pagamento do supervisor.'); return; }
    const sups = calcSup.filter((s: any) => s.total > 0).map((s: any) => ({ chaveJ: s.chaveJ, nome: s.nome, total: s.total }));
    if (sups.length === 0) { alert('Nenhum supervisor com valor a pagar.'); return; }
    if (!confirm(`Enviar comissões de ${sups.length} supervisor(es) para Pagamentos?\nData: ${dtPagtoSup}`)) return;
    enviarSupPagtoMut.mutate({ mesRef, dtPagto: dtPagtoSup, supervisores: sups });
  };

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

  // Modal de adição manual de chave
  const [modalManual, setModalManual] = useState(false);
  const [formManual, setFormManual] = useState({
    chaveJ: "", nomeAgente: "", mesRef: "",
    comissaoConsig: "", comissaoConsorcio: "", comissaoOurocap: "",
    comissaoCc: "", comissaoSeguros: "", ajudaCusto: "",
    creditosDebitos: "", adiantamento: "", reajuste: "",
  });
  const [chaveJBuscaManual, setChaveJBuscaManual] = useState("");
  const { data: agenteManual } = trpc.agentes.getByChaveJ.useQuery(
    { chaveJ: chaveJBuscaManual },
    { enabled: chaveJBuscaManual.length >= 3 }
  );
  useEffect(() => {
    if (agenteManual?.nomeAgente && modalManual) {
      setFormManual(p => ({ ...p, nomeAgente: agenteManual.nomeAgente ?? p.nomeAgente }));
    }
  }, [agenteManual, modalManual]);

  const criarManualMut = trpc.calculosImportados.criar.useMutation({
    onSuccess: () => {
      utils.calculosImportados.listar.invalidate();
      utils.calculosImportados.contar.invalidate();
      setModalManual(false);
      setFormManual({ chaveJ: "", nomeAgente: "", mesRef: "", comissaoConsig: "", comissaoConsorcio: "", comissaoOurocap: "", comissaoCc: "", comissaoSeguros: "", ajudaCusto: "", creditosDebitos: "", adiantamento: "", reajuste: "" });
      setChaveJBuscaManual("");
    },
    onError: (err) => alert(`Erro: ${err.message}`),
  });

  const salvarManual = () => {
    if (!formManual.chaveJ) { alert("Informe a Chave J."); return; }
    if (!formManual.mesRef) { alert("Informe o Mês de Referência."); return; }
    const toNum = (v: string) => v === "" ? undefined : parseFloat(v.replace(",", "."));
    const consig = toNum(formManual.comissaoConsig) ?? 0;
    const consorcio = toNum(formManual.comissaoConsorcio) ?? 0;
    const ourocap = toNum(formManual.comissaoOurocap) ?? 0;
    const cc = toNum(formManual.comissaoCc) ?? 0;
    const seguros = toNum(formManual.comissaoSeguros) ?? 0;
    const ajuda = toNum(formManual.ajudaCusto) ?? 0;
    const cred = toNum(formManual.creditosDebitos) ?? 0;
    const adiant = toNum(formManual.adiantamento) ?? 0;
    const reaj = toNum(formManual.reajuste) ?? 0;
    const total = consig + consorcio + ourocap + cc + seguros + ajuda + cred - adiant + reaj;
    criarManualMut.mutate({
      chaveJ: formManual.chaveJ,
      nomeAgente: formManual.nomeAgente || undefined,
      mesRef: formManual.mesRef,
      comissaoConsig: consig,
      comissaoConsorcio: consorcio,
      comissaoOurocap: ourocap,
      comissaoCc: cc,
      comissaoSeguros: seguros,
      ajudaCusto: ajuda,
      creditosDebitos: cred,
      adiantamento: adiant,
      reajuste: reaj,
      comissaoTotal: total,
    });
  };

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
  const [dtPagtoMassa, setDtPagtoMassa] = useState("");
  const [aplicandoDtMassa, setAplicandoDtMassa] = useState(false);
  const dtPagtoInputRef = useRef<HTMLInputElement>(null);
  // Edição inline de Créditos/Débitos
  const [editandoCreditoDebito, setEditandoCreditoDebito] = useState<number | null>(null);
  const [valorCreditoDebito, setValorCreditoDebito] = useState("");
  const creditoDebitoInputRef = useRef<HTMLInputElement>(null);
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
  const iniciarEdicaoCreditoDebito = (r: any) => {
    setEditandoCreditoDebito(r.id);
    const val = r.creditosDebitos ? parseFloat(String(r.creditosDebitos)) : 0;
    setValorCreditoDebito(val !== 0 ? String(val) : "");
    setTimeout(() => creditoDebitoInputRef.current?.focus(), 50);
  };
  const salvarCreditoDebito = (id: number) => {
    const raw = valorCreditoDebito.trim().replace(",", ".");
    const num = raw === "" ? undefined : (parseFloat(raw) || 0);
    editarMutation.mutate(
      { id, creditosDebitos: num },
      { onSuccess: () => { utils.calculosImportados.listar.invalidate(); } }
    );
    setEditandoCreditoDebito(null);
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
      <PageHeader />
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
            onClick={handleRecalcularTotais}
            disabled={recalcularMutation.isPending}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 h-7 px-2 text-xs disabled:opacity-60"
          >
            <RefreshCw className="w-3 h-3" /> Recalcular Totais
          </Button>
          <Button
            onClick={handleEnviarParaPagto}
            disabled={enviarMutation.isPending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 h-7 px-2 text-xs disabled:opacity-60"
          >
            <Send className="w-3 h-3" /> Enviar Para Pagto
          </Button>
          <Button
            onClick={() => {
              setModalManual(true);
              setFormManual({ chaveJ: "", nomeAgente: "", mesRef: mesRef || "", comissaoConsig: "", comissaoConsorcio: "", comissaoOurocap: "", comissaoCc: "", comissaoSeguros: "", ajudaCusto: "", creditosDebitos: "", adiantamento: "", reajuste: "" });
              setChaveJBuscaManual("");
            }}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3" /> Adicionar Manual
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

          {/* Campo data em massa */}
          <div className="flex flex-col">
            <label className="block text-[10px] text-slate-500 mb-0.5">Dt Pagto em Massa</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                value={dtPagtoMassa}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
                  let masked = raw;
                  if (raw.length > 4) masked = raw.slice(0,2) + "/" + raw.slice(2,4) + "/" + raw.slice(4);
                  else if (raw.length > 2) masked = raw.slice(0,2) + "/" + raw.slice(2);
                  setDtPagtoMassa(masked);
                }}
                className="border border-slate-300 rounded px-1.5 py-1 text-xs h-7 w-28 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <Button
                size="sm"
                disabled={!dtPagtoMassa || selecionados.size === 0 || aplicandoDtMassa}
                onClick={() => {
                  if (!dtPagtoMassa) { alert("Digite a data primeiro."); return; }
                  if (selecionados.size === 0) { alert("Selecione ao menos um registro."); return; }
                  setAplicandoDtMassa(true);
                  Array.from(selecionados).forEach((rid) => {
                    editarMutation.mutate({ id: rid, dtPagto: dtPagtoMassa });
                  });
                  setTimeout(() => {
                    utils.calculosImportados.listar.invalidate();
                    setAplicandoDtMassa(false);
                  }, 400);
                }}
                className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                {aplicandoDtMassa ? "..." : `Aplicar${selecionados.size > 0 ? ` (${selecionados.size})` : ""}`}
              </Button>
            </div>
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => refetchCalcSup()}
                  disabled={calculando}
                  className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 disabled:opacity-60"
                >
                  {calculando ? (
                    <>⏳ Calculando...</>
                  ) : (
                    <>📊 Calcular</>
                  )}
                </Button>
                {/* Campo data de pagamento do supervisor */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-violet-700 font-medium">Dt Pagto:</span>
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={dtPagtoSup}
                    onChange={e => setDtPagtoSup(e.target.value)}
                    className="h-6 w-24 text-[10px] border border-violet-300 rounded px-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                    maxLength={10}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleEnviarSupParaPagto}
                  disabled={enviarSupPagtoMut.isPending || calcSup.length === 0}
                  className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 disabled:opacity-60"
                >
                  <Send className="w-3 h-3" />
                  {enviarSupPagtoMut.isPending ? 'Enviando...' : 'Enviar para Pagto'}
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
          <table className="w-full border-collapse" style={{ fontSize: "10px", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: "linear-gradient(90deg, #a855f7, #ec4899)" }}>
                {/* Coluna de checkbox */}
                <th className="px-1 py-1 text-center border-r border-white/20" style={{width:'3%'}}>
                  <input
                    type="checkbox"
                    checked={todosSelecionados}
                    ref={(el) => { if (el) el.indeterminate = algunsSelecionados; }}
                    onChange={toggleTodos}
                    className="w-3 h-3 cursor-pointer accent-white"
                    title="Selecionar todos"
                  />
                </th>
                {/* Coluna compacta Agente */}
                <th className="px-1.5 py-1 text-left font-bold text-white whitespace-nowrap border-r border-white/20" style={{width:'22%'}}>Agente</th>
                <th className="px-1.5 py-1 text-right font-bold text-white whitespace-nowrap border-r border-white/20" style={{width:'16%'}}>RBM</th>
                <th className="px-1.5 py-1 text-right font-bold text-white whitespace-nowrap border-r border-white/20" style={{width:'18%'}}>Comissões</th>
                <th className="px-1.5 py-1 text-right font-bold text-white whitespace-nowrap border-r border-white/20" style={{width:'22%'}}>Pagamento</th>
                <th className="px-1.5 py-1 text-right font-bold text-white whitespace-nowrap border-r border-white/20" style={{width:'15%'}}>Ajustes</th>
                <th className="px-1 py-1 text-center border-l border-white/20" style={{width:'4%'}}></th>
              </tr>
            </thead>
            <tbody>
              {(registros as any[]).map((r, idx) => (
                <tr
                  key={r.id}
                  className={
                    selecionados.has(r.id)
                      ? "bg-purple-100 hover:bg-purple-200"
                      : idx % 2 === 0
                      ? "bg-white hover:bg-purple-50"
                      : "bg-purple-50/60 hover:bg-purple-100"
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
                  {/* Célula compacta Agente */}
                  <td className="px-2 py-1 border-b border-slate-200 align-top overflow-hidden">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-purple-700 text-xs">{r.chaveJ || '-'}</span>
                      {r.situacao && (
                        <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full border ${
                          r.situacao === 'Ativo' ? 'bg-green-100 text-green-800 border-green-300'
                          : r.situacao === 'Inativo' ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                        }`}>{r.situacao}</span>
                      )}
                      {r.mesRef && <span className="text-[9px] text-purple-500 font-mono">{fmtMesRef(r.mesRef)}</span>}
                    </div>
                    <div className="text-xs font-medium text-slate-800 leading-tight mt-0.5">{r.nomeAgente || '-'}</div>
                    {(r as any).favorecido && (
                      <div className="text-[10px] text-blue-600 font-medium leading-tight">Fav: {(r as any).favorecido}</div>
                    )}
                    {(r as any).nivelAgente && (
                      <div className="text-[10px] text-orange-600 font-semibold leading-tight">{(r as any).nivelAgente}</div>
                    )}
                    <div className="text-[10px] text-slate-500">{r.empresa || ''}{r.cidade ? ` · ${r.cidade}` : ''}</div>
                    {r.tipoPagamento && <div className="text-[9px] text-slate-400 mt-0.5">{r.tipoPagamento}</div>}
                  </td>
                  {/* Célula compacta RBM */}
                  <td className="px-2 py-1 border-b border-slate-200 align-top text-right">
                    {/* RBM Total em destaque */}
                    <div className="font-bold text-purple-800 text-xs">{r.rbmTotal ? fmtMoeda(r.rbmTotal) : '-'}</div>
                    {/* Percentual pago sobre o RBM: usa campo salvo ou calcula dinamicamente */}
                    {(() => {
                      const rbm = parseFloat(String(r.rbmTotal ?? 0));
                      const com = parseFloat(String(r.comissaoTotal ?? 0));
                      const percSalvo = r.percentual ? parseFloat(String(r.percentual)) : 0;
                      const percCalc = rbm > 0 ? com / rbm : 0;
                      const perc = percSalvo !== 0 ? percSalvo : percCalc;
                      if (perc === 0) return null;
                      return (
                        <div className="text-[10px] font-semibold text-amber-600">
                          {(perc * 100).toFixed(2).replace('.', ',')}% s/ RBM
                        </div>
                      );
                    })()}
                    {/* Valor Líquido de Consignado do mês */}
                    {(r as any).vlConsig != null && (r as any).vlConsig > 0 && (
                      <div className="text-[10px] text-blue-600 font-medium mt-0.5">Consig: {fmtMoeda((r as any).vlConsig)}</div>
                    )}
                  </td>
                  {/* Célula compacta Comissões */}
                  <td className="px-2 py-1 border-b border-slate-200 align-top text-right">
                    {/* Comissão Total em destaque */}
                    <div className="font-bold text-pink-700 text-xs">{r.comissaoTotal ? fmtMoeda(r.comissaoTotal) : '-'}</div>
                    {r.percentual && parseFloat(String(r.percentual)) !== 0 && <div className="text-[10px] text-slate-400">{fmtPerc(r.percentual)}</div>}
                    {r.comissaoConsig && parseFloat(String(r.comissaoConsig)) !== 0 && <div className="text-[10px] text-slate-500">Consig: {fmtMoeda(r.comissaoConsig)}</div>}
                    {r.comissaoConsorcio && parseFloat(String(r.comissaoConsorcio)) !== 0 && <div className="text-[10px] text-slate-500">Consórc: {fmtMoeda(r.comissaoConsorcio)}</div>}
                    {r.comissaoOurocap && parseFloat(String(r.comissaoOurocap)) !== 0 && <div className="text-[10px] text-slate-500">Ouro: {fmtMoeda(r.comissaoOurocap)}</div>}
                    {r.comissaoCc && parseFloat(String(r.comissaoCc)) !== 0 && <div className="text-[10px] text-slate-500">C/C: {fmtMoeda(r.comissaoCc)}</div>}
                    {r.comissaoSeguros && parseFloat(String(r.comissaoSeguros)) !== 0 && <div className="text-[10px] text-slate-500">Seg: {fmtMoeda(r.comissaoSeguros)}</div>}
                  </td>
                  {/* Célula compacta Pagamento */}
                  <td className="px-2 py-1 border-b border-slate-200 align-top text-right">
                    {/* Vr. Líquido em destaque */}
                    <div className="font-bold text-emerald-700 text-xs">{r.vrLiquidoC2 ? fmtMoeda(r.vrLiquidoC2) : '-'}</div>
                    {r.srccC2 && parseFloat(String(r.srccC2)) !== 0 && (
                      <>
                        <div className="text-[10px] text-red-500">-SRCC: {fmtMoeda(r.srccC2)}</div>
                        {r.vrLiquidoSrcc && <div className="text-[10px] text-emerald-600 font-semibold">= {fmtMoeda(r.vrLiquidoSrcc)}</div>}
                      </>
                    )}
                    {r.qtdeContas && String(r.qtdeContas) !== '0' && <div className="text-[10px] text-slate-400">Contas: {r.qtdeContas}</div>}
                    {/* Dt Pagto editável */}
                    <div className="mt-0.5">
                      {editandoDtPagto === r.id ? (
                        <input
                          ref={dtPagtoInputRef}
                          type="text"
                          value={valorDtPagto}
                          onChange={(e) => {
                            // Máscara automática: somente números, formata DD/MM/AAAA
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
                            let masked = raw;
                            if (raw.length > 4) masked = raw.slice(0,2) + "/" + raw.slice(2,4) + "/" + raw.slice(4);
                            else if (raw.length > 2) masked = raw.slice(0,2) + "/" + raw.slice(2);
                            setValorDtPagto(masked);
                          }}
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
                          className="cursor-pointer hover:bg-purple-100 rounded px-1 py-0.5 min-w-[6rem] inline-block text-blue-600 font-medium border border-transparent hover:border-purple-300 text-[10px]"
                          title={selecionados.size > 1 && selecionados.has(r.id) ? `Clique para editar e aplicar em ${selecionados.size} linhas selecionadas` : "Clique para editar"}
                        >
                          {r.dtPagto || <span className="text-slate-300 italic">DD/MM/AAAA</span>}
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Célula compacta Ajustes */}
                  <td className="px-2 py-1 border-b border-slate-200 align-top text-right">
                    {/* Créditos/Débitos editável */}
                    <div className="text-[9px] text-slate-400 mb-0.5">Créd/Déb</div>
                    {editandoCreditoDebito === r.id ? (
                      <input
                        ref={creditoDebitoInputRef}
                        type="number"
                        step="0.01"
                        value={valorCreditoDebito}
                        onChange={(e) => setValorCreditoDebito(e.target.value)}
                        onBlur={() => salvarCreditoDebito(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") salvarCreditoDebito(r.id);
                          if (e.key === "Escape") setEditandoCreditoDebito(null);
                        }}
                        placeholder="0.00"
                        className="w-24 border border-pink-400 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500 bg-white text-right"
                      />
                    ) : (
                      <span
                        onClick={() => iniciarEdicaoCreditoDebito(r)}
                        className="cursor-pointer hover:bg-pink-100 rounded px-1 py-0.5 min-w-[5rem] inline-block text-right border border-transparent hover:border-pink-300 text-xs font-medium text-slate-700"
                        title="Clique para editar Créditos/Débitos"
                      >
                        {r.creditosDebitos && parseFloat(String(r.creditosDebitos)) !== 0
                          ? fmtMoeda(r.creditosDebitos)
                          : <span className="text-slate-300 italic text-[10px]">0,00</span>}
                      </span>
                    )}
                    {r.ajudaCusto && parseFloat(String(r.ajudaCusto)) !== 0 && <div className="text-[10px] text-slate-500">Aj.Custo: {fmtMoeda(r.ajudaCusto)}</div>}
                    {r.adiantamento && parseFloat(String(r.adiantamento)) !== 0 && <div className="text-[10px] text-slate-500">Adiant: {fmtMoeda(r.adiantamento)}</div>}
                    {r.reajuste && parseFloat(String(r.reajuste)) !== 0 && <div className="text-[10px] text-slate-500">Reajuste: {fmtMoeda(r.reajuste)}</div>}
                  </td>

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
                {/* Célula vazia para coluna compacta Agente */}
                <td className="px-1.5 py-1.5" />
                {/* Célula RBM Total no tfoot */}
                <td className="px-1.5 py-1.5 text-right font-bold text-white text-xs">{fmtMoeda((registros as any[]).reduce((a: number, r: any) => a + (parseFloat(String(r.rbmTotal)) || 0), 0))}</td>
                {/* Célula Comissão Total no tfoot */}
                <td className="px-1.5 py-1.5 text-right font-bold text-white text-xs">{fmtMoeda((registros as any[]).reduce((a: number, r: any) => a + (parseFloat(String(r.comissaoTotal)) || 0), 0))}</td>
                {/* Célula Vr. Líquido Total no tfoot */}
                <td className="px-1.5 py-1.5 text-right font-bold text-white text-xs">{fmtMoeda((registros as any[]).reduce((a: number, r: any) => a + (parseFloat(String(r.vrLiquidoC2)) || 0), 0))}</td>
                {/* Célula Ajustes (Créd/Déb) no tfoot */}
                <td className="px-1.5 py-1.5 text-right font-bold text-white text-xs">{fmtMoeda((registros as any[]).reduce((a: number, r: any) => a + (parseFloat(String(r.creditosDebitos)) || 0), 0))}</td>
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

    {/* Modal Adicionar Manual */}
    <Dialog open={modalManual} onOpenChange={(open) => !open && setModalManual(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Chave Manual ao Cálculo</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Chave J *</Label>
            <Input
              className="h-7 text-xs mt-1"
              placeholder="Ex: J1234567"
              value={formManual.chaveJ}
              onChange={e => {
                const v = e.target.value.toUpperCase();
                setFormManual(p => ({ ...p, chaveJ: v, nomeAgente: "" }));
                setChaveJBuscaManual(v);
              }}
            />
            {agenteManual?.nomeAgente && (
              <p className="text-[10px] text-green-600 mt-0.5">✓ {agenteManual.nomeAgente}</p>
            )}
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Nome do Agente</Label>
            <Input className="h-7 text-xs mt-1" value={formManual.nomeAgente} onChange={e => setFormManual(p => ({ ...p, nomeAgente: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Mês de Referência * (MM/AAAA)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="Ex: 05/2026" value={formManual.mesRef} onChange={e => setFormManual(p => ({ ...p, mesRef: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Comissão Consig (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.comissaoConsig} onChange={e => setFormManual(p => ({ ...p, comissaoConsig: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Comissão Consórcio (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.comissaoConsorcio} onChange={e => setFormManual(p => ({ ...p, comissaoConsorcio: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Comissão Ourocap (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.comissaoOurocap} onChange={e => setFormManual(p => ({ ...p, comissaoOurocap: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Comissão C/C (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.comissaoCc} onChange={e => setFormManual(p => ({ ...p, comissaoCc: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Comissão Seguros (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.comissaoSeguros} onChange={e => setFormManual(p => ({ ...p, comissaoSeguros: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Ajuda de Custo (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.ajudaCusto} onChange={e => setFormManual(p => ({ ...p, ajudaCusto: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Créditos/Débitos (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.creditosDebitos} onChange={e => setFormManual(p => ({ ...p, creditosDebitos: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Adiantamento (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.adiantamento} onChange={e => setFormManual(p => ({ ...p, adiantamento: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Reajuste (R$)</Label>
            <Input className="h-7 text-xs mt-1" placeholder="0,00" value={formManual.reajuste} onChange={e => setFormManual(p => ({ ...p, reajuste: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setModalManual(false)}>Cancelar</Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={salvarManual} disabled={criarManualMut.isPending}>
            {criarManualMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
