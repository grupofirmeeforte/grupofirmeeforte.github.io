import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocation } from "wouter";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number) {
  return v.toFixed(2).replace(".", ",") + "%";
}

export default function RelatorioRBMDespesas() {
  const [, navigate] = useLocation();
  const [ano, setAno] = useState("2026");
  const [empresa, setEmpresa] = useState("Todas");
  const [mes, setMes] = useState(""); // "" = todos os meses

  // Anos dinâmicos do banco
  const { data: anosDisponiveis = ["2026"] } = trpc.calculosImportados.anosDisponiveis.useQuery();

  const { data = [], isLoading } = trpc.calculosImportados.relatorioRbmDespesas.useQuery(
    { ano, empresa: empresa === "Todas" ? undefined : empresa, mes: mes || undefined },
    { enabled: !!ano }
  );

  // Totais gerais
  const totais = useMemo(() => {
    return data.reduce((acc, r) => ({
      rbmTotal: acc.rbmTotal + r.rbmTotal,
      rbmConsig: acc.rbmConsig + r.rbmConsig,
      rbmCC: acc.rbmCC + r.rbmCC,
      rbmConsorcio: acc.rbmConsorcio + r.rbmConsorcio,
      rbmOurocap: acc.rbmOurocap + r.rbmOurocap,
      rbmSeguros: acc.rbmSeguros + r.rbmSeguros,
      comissaoTotal: acc.comissaoTotal + r.comissaoTotal,
      totalDesp: acc.totalDesp + r.totalDesp,
      totalDespFixas: acc.totalDespFixas + r.totalDespFixas,
      totalDespAvulsas: acc.totalDespAvulsas + r.totalDespAvulsas,
      saldo: acc.saldo + r.saldo,
    }), {
      rbmTotal: 0, rbmConsig: 0, rbmCC: 0, rbmConsorcio: 0,
      rbmOurocap: 0, rbmSeguros: 0, comissaoTotal: 0,
      totalDesp: 0, totalDespFixas: 0, totalDespAvulsas: 0, saldo: 0,
    });
  }, [data]);

  function exportarCSV() {
    const header = [
      "Agente","ChaveJ","Cidade","Empresa","Meses",
      "RBM Total","RBM Consig","RBM C/C","RBM Consórcio","RBM Ourocap","RBM Seguros",
      "Comissão Total","Desp. Fixas","Desp. Avulsas","Total Despesas","Saldo","% Consumido RBM"
    ].join(";");
    const rows = data.map(r => [
      r.nomeAgente, r.chaveJ, r.cidade, r.empresa, r.meses,
      r.rbmTotal.toFixed(2), r.rbmConsig.toFixed(2), r.rbmCC.toFixed(2),
      r.rbmConsorcio.toFixed(2), r.rbmOurocap.toFixed(2), r.rbmSeguros.toFixed(2),
      r.comissaoTotal.toFixed(2), r.totalDespFixas.toFixed(2), r.totalDespAvulsas.toFixed(2),
      r.totalDesp.toFixed(2), r.saldo.toFixed(2), r.pctConsumido.toFixed(2),
    ].join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + header + "\n" + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-rbm-despesas-${ano}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Relatório RBM × Despesas</h1>
          <p className="text-xs text-gray-500">Produção vs. custos por agente — acumulado anual</p>
        </div>
        <Button onClick={exportarCSV} variant="outline" size="sm" className="gap-1 text-xs">
          <Download className="w-3.5 h-3.5" /> CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Ano</label>
          <select value={ano} onChange={e => setAno(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            {anosDisponiveis.map(a => <option key={a} value={a!}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Mês</label>
          <select value={mes} onChange={e => setMes(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
              <option key={m} value={m}>
                {new Date(2000, parseInt(m)-1, 1).toLocaleString('pt-BR', { month: 'long' }).replace(/^./, c => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Empresa</label>
          <select value={empresa} onChange={e => setEmpresa(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="Todas">Todas</option>
            <option value="BMF">BMF</option>
            <option value="FLEX">FLEX</option>
          </select>
        </div>
        {data.length > 0 && (
          <span className="text-xs text-gray-400 ml-auto">{data.length} agente(s)</span>
        )}
      </div>

      {/* Tabela */}
      <div className="px-2 py-3 overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Nenhum dado encontrado para {ano}.</div>
        ) : (
          <table className="w-full text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap sticky left-0 bg-gray-800 z-10">Agente</th>
                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Empresa</th>
                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Cidade</th>
                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Meses</th>
                {/* RBM */}
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-blue-800">RBM Total</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-blue-700 text-blue-100">Consig</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-blue-700 text-blue-100">C/C</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-blue-700 text-blue-100">Consórc</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-blue-700 text-blue-100">Ouro</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-blue-700 text-blue-100">Seg</th>
                {/* Comissão */}
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-green-800">Comissão</th>
                {/* Despesas */}
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-orange-700">Desp. Fixas</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-orange-700">Desp. Avuls.</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-orange-800">Total Desp.</th>
                {/* Saldo */}
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-purple-800">Saldo</th>
                {/* % consumido */}
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-red-800">% RBM</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                const lucro = r.saldo >= 0;
                const pctAlto = r.pctConsumido >= 100;
                const pctMedio = r.pctConsumido >= 70 && r.pctConsumido < 100;
                return (
                  <tr key={`${r.chaveJ}-${r.empresa}`}
                    className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                    <td className={`px-2 py-1.5 font-medium whitespace-nowrap sticky left-0 z-10 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <div className="font-semibold text-gray-800">{r.nomeAgente || r.chaveJ}</div>
                      <div className="text-[10px] text-gray-400">{r.chaveJ}</div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.empresa === 'BMF' ? 'bg-green-100 text-green-800' : r.empresa === 'FLEX' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                        {r.empresa}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-600 whitespace-nowrap">
                      {r.cidade || "-"}
                      {r.nAgentesNaCidade > 1 && (
                        <span className="ml-1 text-[10px] text-orange-500">÷{r.nAgentesNaCidade}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{r.meses}</td>
                    {/* RBM */}
                    <td className="px-2 py-1.5 text-right font-semibold text-blue-800">{fmtR(r.rbmTotal)}</td>
                    <td className="px-2 py-1.5 text-right text-blue-600">{r.rbmConsig > 0 ? fmtR(r.rbmConsig) : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1.5 text-right text-blue-600">{r.rbmCC > 0 ? fmtR(r.rbmCC) : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1.5 text-right text-blue-600">{r.rbmConsorcio > 0 ? fmtR(r.rbmConsorcio) : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1.5 text-right text-blue-600">{r.rbmOurocap > 0 ? fmtR(r.rbmOurocap) : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1.5 text-right text-blue-600">{r.rbmSeguros > 0 ? fmtR(r.rbmSeguros) : <span className="text-gray-300">-</span>}</td>
                    {/* Comissão */}
                    <td className="px-2 py-1.5 text-right font-semibold text-green-700">{fmtR(r.comissaoTotal)}</td>
                    {/* Despesas */}
                    <td className="px-2 py-1.5 text-right text-orange-600">{r.totalDespFixas > 0 ? fmtR(r.totalDespFixas) : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1.5 text-right text-orange-600">{r.totalDespAvulsas > 0 ? fmtR(r.totalDespAvulsas) : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-orange-700">{fmtR(r.totalDesp)}</td>
                    {/* Saldo */}
                    <td className={`px-2 py-1.5 text-right font-bold ${lucro ? "text-green-700" : "text-red-600"}`}>
                      <div className="flex items-center justify-end gap-0.5">
                        {lucro ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {fmtR(r.saldo)}
                      </div>
                    </td>
                    {/* % consumido */}
                    <td className={`px-2 py-1.5 text-right font-bold ${pctAlto ? "text-red-600" : pctMedio ? "text-orange-500" : "text-gray-600"}`}>
                      {fmtPct(r.pctConsumido)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totais */}
            <tfoot>
              <tr className="bg-gray-800 text-white font-bold border-t-2 border-gray-600">
                <td className="px-2 py-2 sticky left-0 bg-gray-800 z-10">TOTAL</td>
                <td colSpan={3}></td>
                <td className="px-2 py-2 text-right">{fmtR(totais.rbmTotal)}</td>
                <td className="px-2 py-2 text-right text-blue-300">{fmtR(totais.rbmConsig)}</td>
                <td className="px-2 py-2 text-right text-blue-300">{fmtR(totais.rbmCC)}</td>
                <td className="px-2 py-2 text-right text-blue-300">{fmtR(totais.rbmConsorcio)}</td>
                <td className="px-2 py-2 text-right text-blue-300">{fmtR(totais.rbmOurocap)}</td>
                <td className="px-2 py-2 text-right text-blue-300">{fmtR(totais.rbmSeguros)}</td>
                <td className="px-2 py-2 text-right text-green-300">{fmtR(totais.comissaoTotal)}</td>
                <td className="px-2 py-2 text-right text-orange-300">{fmtR(totais.totalDespFixas)}</td>
                <td className="px-2 py-2 text-right text-orange-300">{fmtR(totais.totalDespAvulsas)}</td>
                <td className="px-2 py-2 text-right text-orange-200">{fmtR(totais.totalDesp)}</td>
                <td className={`px-2 py-2 text-right ${totais.saldo >= 0 ? "text-green-300" : "text-red-300"}`}>{fmtR(totais.saldo)}</td>
                <td className="px-2 py-2 text-right text-gray-300">
                  {totais.rbmTotal > 0 ? fmtPct(((totais.comissaoTotal + totais.totalDesp) / totais.rbmTotal) * 100) : "-"}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Legenda */}
      {data.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-600" /> Saldo positivo (lucro)</span>
          <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Saldo negativo (prejuízo)</span>
          <span className="text-orange-500 font-medium">÷N = despesas divididas por N agentes da cidade</span>
          <span className="text-red-600 font-medium">% RBM ≥ 100% = consumiu mais do que produziu</span>
          <span className="text-orange-500 font-medium">% RBM 70–99% = atenção</span>
        </div>
      )}
    </div>
  );
}
