import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Send } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const fmtMoeda = (v: any) => {
  if (v === null || v === undefined || v === "" || v === "NULL") return "-";
  const n = parseFloat(String(v));
  if (isNaN(n)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};

const fmtPerc = (v: any) => {
  if (v === null || v === undefined || v === "" || v === "NULL") return "-";
  const n = parseFloat(String(v));
  if (isNaN(n)) return "-";
  return (n * 100).toFixed(3).replace(".", ",") + "%";
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

  const { data: meses = [] } = trpc.calculosImportados.mesesDisponiveis.useQuery();
  const { data: registros = [], isLoading } = trpc.calculosImportados.listar.useQuery({
    mesRef: mesRef || undefined,
    chaveJ: chaveJ || undefined,
    nomeAgente: nomeAgente || undefined,
  });

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

  // Edição inline de Dt Pagto
  const [editandoDtPagto, setEditandoDtPagto] = useState<number | null>(null);
  const [valorDtPagto, setValorDtPagto] = useState("");
  const dtPagtoInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const editarMutation = trpc.calculosImportados.editar.useMutation();

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
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-800">Cálculo</h1>
          <p className="text-[10px] text-slate-500">
            {registros.length} registro(s)
            {selecionados.size > 0 && (
              <span className="ml-2 text-purple-600 font-medium">· {selecionados.size} selecionado(s)</span>
            )}
          </p>
        </div>
        <div className="flex gap-1.5">
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
          <Button onClick={() => navigate("/")} size="sm" className="bg-gray-800 hover:bg-gray-900 text-white flex items-center gap-1 h-7 px-2 text-xs">
            <ArrowLeft className="w-3 h-3" /> Voltar
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
              onChange={(e) => setMesRef(e.target.value)}
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
              onChange={(e) => setChaveJ(e.target.value)}
              placeholder="Ex: J9660864"
              className="text-xs h-7 py-1"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Nome Agente</label>
            <Input
              value={nomeAgente}
              onChange={(e) => setNomeAgente(e.target.value)}
              placeholder="Ex: João Silva"
              className="text-xs h-7 py-1"
            />
          </div>
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
    </div>
  );
}
