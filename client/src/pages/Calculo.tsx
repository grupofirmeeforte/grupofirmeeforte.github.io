import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Pencil, Trash2, X, Check } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// Formatar moeda brasileira
const fmtMoeda = (valor: any) => {
  if (valor === null || valor === undefined || valor === "") return "-";
  const num = parseFloat(String(valor));
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

// Formatar percentual com 3 casas decimais
const fmtPerc = (valor: any) => {
  if (valor === null || valor === undefined || valor === "" || valor === "NULL") return "-";
  const num = parseFloat(String(valor));
  if (isNaN(num)) return "-";
  return (num * 100).toFixed(3).replace(".", ",") + "%";
};

// Formatar número inteiro
const fmtInt = (valor: any) => {
  if (valor === null || valor === undefined || valor === "") return "-";
  const num = parseInt(String(valor));
  if (isNaN(num)) return "-";
  return num.toString();
};

// Formatar texto simples
const fmtTexto = (valor: any) => {
  if (valor === null || valor === undefined || valor === "") return "-";
  return String(valor);
};

// Converter mesRef (ex: "426") para exibição (ex: "04/2026")
const fmtMesRef = (mesRef: string | null | undefined) => {
  if (!mesRef) return "-";
  const s = String(mesRef);
  if (s.length === 3) {
    const mes = s.slice(0, 1).padStart(2, "0");
    const ano = "20" + s.slice(1);
    return `${mes}/${ano}`;
  }
  if (s.length === 4) {
    const mes = s.slice(0, 2);
    const ano = "20" + s.slice(2);
    return `${mes}/${ano}`;
  }
  return s;
};

type CalculoRow = {
  id: number;
  tipoPagamento: string | null;
  mesRef: string | null;
  empresa: string | null;
  chaveJ: string | null;
  nomeAgente: string | null;
  cidade: string | null;
  situacao: string | null;
  percentual: string | null;
  comissaoTotal: string | null;
  rbmTotal: string | null;
  comissaoConsig: string | null;
  comissaoConsorcio: string | null;
  comissaoOurocap: string | null;
  comissaoCc: string | null;
  comissaoSeguros: string | null;
  ajudaCusto: string | null;
  creditosDebitos: string | null;
  adiantamento: string | null;
  reajuste: string | null;
  comissaoSupervisor: string | null;
  rbmCreditoC2: string | null;
  rbmContaCorrente: string | null;
  rbmConsorcioC2: string | null;
  rbmOurocap: string | null;
  rbmSeguros: string | null;
  qtdeContas: number | null;
  vrLiquidoC2: string | null;
  srccC2: string | null;
  vrLiquidoSrcc: string | null;
};

export default function Calculo() {
  const [, navigate] = useLocation();

  // Filtros
  const [mesRef, setMesRef] = useState("");
  const [empresa, setEmpresa] = useState("Todas");
  const [chaveJ, setChaveJ] = useState("");
  const [nomeAgente, setNomeAgente] = useState("");

  // Edição inline
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editDados, setEditDados] = useState<Partial<CalculoRow>>({});

  const utils = trpc.useUtils();

  // Queries
  const { data: meses = [] } = trpc.calculosImportados.mesesDisponiveis.useQuery();
  const { data: empresas = [] } = trpc.calculosImportados.empresasDisponiveis.useQuery();
  const { data: registros = [], isLoading } = trpc.calculosImportados.listar.useQuery({
    mesRef: mesRef || undefined,
    empresa: empresa !== "Todas" ? empresa : undefined,
    chaveJ: chaveJ || undefined,
    nomeAgente: nomeAgente || undefined,
  });

  // Mutations
  const editarMut = trpc.calculosImportados.editar.useMutation({
    onSuccess: () => {
      utils.calculosImportados.listar.invalidate();
      setEditandoId(null);
    },
  });
  const deletarMut = trpc.calculosImportados.deletar.useMutation({
    onSuccess: () => utils.calculosImportados.listar.invalidate(),
  });

  // Totais
  const totais = useMemo(() => {
    const soma = (campo: keyof CalculoRow) =>
      registros.reduce((acc, r) => acc + (parseFloat(String((r as any)[campo])) || 0), 0);
    return {
      comissaoTotal: soma("comissaoTotal"),
      rbmTotal: soma("rbmTotal"),
      comissaoConsig: soma("comissaoConsig"),
      comissaoConsorcio: soma("comissaoConsorcio"),
      comissaoOurocap: soma("comissaoOurocap"),
      comissaoCc: soma("comissaoCc"),
      comissaoSeguros: soma("comissaoSeguros"),
      ajudaCusto: soma("ajudaCusto"),
      creditosDebitos: soma("creditosDebitos"),
      adiantamento: soma("adiantamento"),
      reajuste: soma("reajuste"),
      comissaoSupervisor: soma("comissaoSupervisor"),
      rbmCreditoC2: soma("rbmCreditoC2"),
      rbmContaCorrente: soma("rbmContaCorrente"),
      rbmConsorcioC2: soma("rbmConsorcioC2"),
      rbmOurocap: soma("rbmOurocap"),
      rbmSeguros: soma("rbmSeguros"),
      qtdeContas: registros.reduce((acc, r) => acc + (parseInt(String(r.qtdeContas)) || 0), 0),
      vrLiquidoC2: soma("vrLiquidoC2"),
      srccC2: soma("srccC2"),
      vrLiquidoSrcc: soma("vrLiquidoSrcc"),
    };
  }, [registros]);

  // Exportar Excel
  const handleExportar = () => {
    import("xlsx").then((XLSX) => {
      const cabecalhos = [
        "Tipo Pagamento", "Mês Ref", "Empresa", "Chave J", "Nome Agente", "Cidade", "Situação",
        "Percentual", "Comissão Total", "RBM Total", "Comissão Consig", "Comissão Consórcio",
        "Comissão Ourocap", "Comissão C/C", "Comissão Seguros", "Ajuda de Custo",
        "Créditos/Débitos", "Adiantamento", "Reajuste", "Comissão Supervisor",
        "RBM Crédito C2", "RBM Conta Corrente", "RBM Consórcio C2", "RBM Ourocap", "RBM Seguros",
        "Qtde Contas", "Vr. Líquido C2", "SRCC C2", "Vr. Líquido-SRCC",
      ];
      const linhas = registros.map((r) => [
        r.tipoPagamento ?? "", fmtMesRef(r.mesRef), r.empresa ?? "", r.chaveJ ?? "",
        r.nomeAgente ?? "", r.cidade ?? "", r.situacao ?? "",
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
        r.comissaoSupervisor ? parseFloat(r.comissaoSupervisor) : "",
        r.rbmCreditoC2 ? parseFloat(r.rbmCreditoC2) : "",
        r.rbmContaCorrente ? parseFloat(r.rbmContaCorrente) : "",
        r.rbmConsorcioC2 ? parseFloat(r.rbmConsorcioC2) : "",
        r.rbmOurocap ? parseFloat(r.rbmOurocap) : "",
        r.rbmSeguros ? parseFloat(r.rbmSeguros) : "",
        r.qtdeContas ?? "",
        r.vrLiquidoC2 ? parseFloat(r.vrLiquidoC2) : "",
        r.srccC2 ? parseFloat(r.srccC2) : "",
        r.vrLiquidoSrcc ? parseFloat(r.vrLiquidoSrcc) : "",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([cabecalhos, ...linhas]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cálculo");
      XLSX.writeFile(wb, `calculo_${mesRef || "todos"}.xlsx`);
    });
  };

  const iniciarEdicao = (r: CalculoRow) => {
    setEditandoId(r.id);
    setEditDados({ ...r });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditDados({});
  };

  const salvarEdicao = () => {
    if (!editandoId) return;
    // Converter null para undefined para compatibilidade com o schema tRPC
    const dadosLimpos: Record<string, any> = { id: editandoId };
    for (const [k, v] of Object.entries(editDados)) {
      if (k !== 'id') dadosLimpos[k] = v === null ? undefined : v;
    }
    editarMut.mutate(dadosLimpos as any);
  };

  const confirmarDeletar = (id: number) => {
    if (confirm("Confirma a exclusão deste registro?")) {
      deletarMut.mutate({ id });
    }
  };

  // Colunas da tabela
  const colunas: { label: string; key: keyof CalculoRow; tipo: "texto" | "moeda" | "perc" | "int" | "mesRef" }[] = [
    { label: "Tipo Pgto", key: "tipoPagamento", tipo: "texto" },
    { label: "Mês Ref", key: "mesRef", tipo: "mesRef" },
    { label: "Empresa", key: "empresa", tipo: "texto" },
    { label: "Situação", key: "situacao", tipo: "texto" },
    { label: "Chave J", key: "chaveJ", tipo: "texto" },
    { label: "Nome Agente", key: "nomeAgente", tipo: "texto" },
    { label: "Cidade", key: "cidade", tipo: "texto" },
    { label: "Percentual", key: "percentual", tipo: "perc" },
    { label: "Comissão Total", key: "comissaoTotal", tipo: "moeda" },
    { label: "RBM Total", key: "rbmTotal", tipo: "moeda" },
    { label: "Comissão Consig", key: "comissaoConsig", tipo: "moeda" },
    { label: "Comissão Consórcio", key: "comissaoConsorcio", tipo: "moeda" },
    { label: "Comissão Ourocap", key: "comissaoOurocap", tipo: "moeda" },
    { label: "Comissão C/C", key: "comissaoCc", tipo: "moeda" },
    { label: "Comissão Seguros", key: "comissaoSeguros", tipo: "moeda" },
    { label: "Ajuda de Custo", key: "ajudaCusto", tipo: "moeda" },
    { label: "Créditos/Débitos", key: "creditosDebitos", tipo: "moeda" },
    { label: "Adiantamento", key: "adiantamento", tipo: "moeda" },
    { label: "Reajuste", key: "reajuste", tipo: "moeda" },
    { label: "Comissão Supervisor", key: "comissaoSupervisor", tipo: "moeda" },
    { label: "RBM Crédito C2", key: "rbmCreditoC2", tipo: "moeda" },
    { label: "RBM Conta Corrente", key: "rbmContaCorrente", tipo: "moeda" },
    { label: "RBM Consórcio C2", key: "rbmConsorcioC2", tipo: "moeda" },
    { label: "RBM Ourocap", key: "rbmOurocap", tipo: "moeda" },
    { label: "RBM Seguros", key: "rbmSeguros", tipo: "moeda" },
    { label: "Qtde Contas", key: "qtdeContas", tipo: "int" },
    { label: "Vr. Líquido C2", key: "vrLiquidoC2", tipo: "moeda" },
    { label: "SRCC C2", key: "srccC2", tipo: "moeda" },
    { label: "Vr. Líquido-SRCC", key: "vrLiquidoSrcc", tipo: "moeda" },
  ];

  const renderCelula = (r: CalculoRow, col: typeof colunas[0]) => {
    const val = (r as any)[col.key];
    if (col.tipo === "moeda") return fmtMoeda(val);
    if (col.tipo === "perc") return fmtPerc(val);
    if (col.tipo === "int") return fmtInt(val);
    if (col.tipo === "mesRef") return fmtMesRef(val);
    return fmtTexto(val);
  };

  const renderTotal = (col: typeof colunas[0]) => {
    if (col.tipo === "moeda") {
      const t = (totais as any)[col.key];
      return t !== undefined ? fmtMoeda(t) : "";
    }
    if (col.tipo === "int" && col.key === "qtdeContas") return fmtInt(totais.qtdeContas);
    return "";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Cálculo</h1>
            <p className="text-sm text-slate-500">Comissões e Pagamentos — {registros.length} registro(s)</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportar} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              <Download className="w-4 h-4" /> Exportar Excel
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-900"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Mês Ref</label>
              <select
                value={mesRef}
                onChange={(e) => setMesRef(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Todos os meses</option>
                {meses.map((m) => (
                  <option key={m} value={m ?? ""}>{fmtMesRef(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Empresa</label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="Todas">Todas</option>
                {empresas.map((e) => (
                  <option key={e} value={e ?? ""}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Chave J</label>
              <Input
                value={chaveJ}
                onChange={(e) => setChaveJ(e.target.value)}
                placeholder="Ex: J9660864"
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome Agente</label>
              <Input
                value={nomeAgente}
                onChange={(e) => setNomeAgente(e.target.value)}
                placeholder="Ex: João Silva"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum registro encontrado</div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-purple-600 to-pink-500">
                  {colunas.map((col) => (
                    <th
                      key={col.key}
                      className="px-2 py-2 text-left font-bold text-white whitespace-nowrap border-r border-purple-400/30 last:border-r-0"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-left font-bold text-white whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(registros as unknown as CalculoRow[]).map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 hover:bg-purple-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    {editandoId === r.id ? (
                      // Linha em edição
                      <>
                        {colunas.map((col) => (
                          <td key={col.key} className="px-1 py-1">
                            <input
                              className="w-full border border-blue-300 rounded px-1 py-0.5 text-xs min-w-[80px]"
                              value={String((editDados as any)[col.key] ?? "")}
                              onChange={(e) =>
                                setEditDados((prev) => ({ ...prev, [col.key]: e.target.value }))
                              }
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 whitespace-nowrap">
                          <button
                            onClick={salvarEdicao}
                            className="text-green-600 hover:text-green-800 mr-2"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelarEdicao}
                            className="text-slate-500 hover:text-slate-700"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </>
                    ) : (
                      // Linha normal
                      <>
                        {colunas.map((col) => (
                          <td
                            key={col.key}
                            className={`px-2 py-1.5 whitespace-nowrap ${col.tipo === "moeda" ? "text-right" : ""}`}
                          >
                            {renderCelula(r, col)}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <button
                            onClick={() => iniciarEdicao(r)}
                            className="text-blue-500 hover:text-blue-700 mr-2"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => confirmarDeletar(r.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Linha de totais */}
              <tfoot>
                <tr className="bg-gradient-to-r from-purple-700 to-pink-600 font-bold text-white">
                  {colunas.map((col, i) => (
                    <td
                      key={col.key}
                      className={`px-2 py-2 whitespace-nowrap ${col.tipo === "moeda" ? "text-right" : ""}`}
                    >
                      {i === 0 ? "TOTAL" : renderTotal(col)}
                    </td>
                  ))}
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
