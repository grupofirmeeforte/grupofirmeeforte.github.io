import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

function fmtBRL(v: number) {
  if (v === 0) return "-";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number) {
  return v.toFixed(2).replace(".", ",") + "%";
}

export default function RelatorioRBMDespesas() {
  useRegistrarModulo('Relatório RBM Despesas');
  const [ano, setAno] = useState("2026");
  const [empresa, setEmpresa] = useState("Todas");
  const [mes, setMes] = useState("");

  const { data: anosDisponiveis = ["2026"] } = trpc.calculosImportados.anosDisponiveis.useQuery();
  const { data = [], isLoading } = trpc.calculosImportados.relatorioRbmDespesas.useQuery(
    { ano, empresa: empresa === "Todas" ? undefined : empresa, mes: mes || undefined },
    { enabled: !!ano }
  );

  const totais = useMemo(() => data.reduce((acc, r) => ({
    rbmTotal: acc.rbmTotal + r.rbmTotal,
    rbmConsig: acc.rbmConsig + r.rbmConsig,
    rbmCC: acc.rbmCC + r.rbmCC,
    rbmConsorcio: acc.rbmConsorcio + r.rbmConsorcio,
    rbmOurocap: acc.rbmOurocap + r.rbmOurocap,
    rbmSeguros: acc.rbmSeguros + r.rbmSeguros,
    comissaoTotal: acc.comissaoTotal + r.comissaoTotal,
    totalDespFixas: acc.totalDespFixas + r.totalDespFixas,
    totalDespAvulsas: acc.totalDespAvulsas + r.totalDespAvulsas,
    totalDesp: acc.totalDesp + r.totalDesp,
    saldo: acc.saldo + r.saldo,
  }), { rbmTotal:0, rbmConsig:0, rbmCC:0, rbmConsorcio:0, rbmOurocap:0, rbmSeguros:0, comissaoTotal:0, totalDespFixas:0, totalDespAvulsas:0, totalDesp:0, saldo:0 }), [data]);

  function exportarCSV() {
    const header = ["Agente","ChaveJ","Cidade","Empresa","Meses","RBM Total","RBM Consig","RBM C/C","RBM Consórcio","RBM Ourocap","RBM Seguros","Comissão Total","Desp. Fixas","Desp. Avulsas","Total Despesas","Saldo","% Consumido RBM"].join(";");
    const rows = data.map(r => [r.nomeAgente,r.chaveJ,r.cidade,r.empresa,r.meses,r.rbmTotal.toFixed(2),r.rbmConsig.toFixed(2),r.rbmCC.toFixed(2),r.rbmConsorcio.toFixed(2),r.rbmOurocap.toFixed(2),r.rbmSeguros.toFixed(2),r.comissaoTotal.toFixed(2),r.totalDespFixas.toFixed(2),r.totalDespAvulsas.toFixed(2),r.totalDesp.toFixed(2),r.saldo.toFixed(2),r.pctConsumido.toFixed(2)].join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+header+"\n"+rows], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`relatorio-rbm-despesas-${ano}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader title="Relatório RBM Despesas" actions={
        <div className="flex gap-1.5 items-center flex-wrap">
          <Button onClick={exportarCSV} variant="outline" size="sm" className="gap-1 text-[10px] h-6">
            <Download className="w-3 h-3"/> CSV
          </Button>
        </div>
      } />

      {/* Conteúdo */}
      <div className="px-3 py-3">
        {isLoading && <div className="text-center py-16 text-gray-900">Carregando...</div>}
        {!isLoading && data.length === 0 && <div className="text-center py-16 text-gray-900">Nenhum dado encontrado para {ano}.</div>}

        {!isLoading && data.length > 0 && (
          <>
            {/* Cards de agentes */}
            <div className="space-y-2">
              {data.map((r) => {
                const lucro = r.saldo >= 0;
                const pctAlto = r.pctConsumido >= 100;
                const pctMedio = r.pctConsumido >= 70 && r.pctConsumido < 100;
                return (
                  <div key={`${r.chaveJ}-${r.empresa}`} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    {/* Cabeçalho do card */}
                    <div className="flex items-start justify-between px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${r.empresa==='BMF'?'bg-green-100 text-green-800':r.empresa==='FLEX'?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-900'}`}>
                          {r.empresa}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{r.nomeAgente || r.chaveJ}</div>
                          <div className="text-xs text-gray-900">{r.chaveJ} · {r.cidade || "-"}{r.nAgentesNaCidade > 1 && <span className="text-orange-500"> ÷{r.nAgentesNaCidade}</span>} · {r.meses} {r.meses === 1 ? "mês" : "meses"}</div>
                        </div>
                      </div>
                      {/* Saldo destaque */}
                      <div className={`shrink-0 flex items-center gap-1 font-bold text-sm ${lucro ? "text-green-600" : "text-red-600"}`}>
                        {lucro ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                        {fmtBRL(r.saldo)}
                      </div>
                    </div>

                    {/* Corpo do card: 3 colunas */}
                    <div className="grid grid-cols-3 divide-x divide-gray-100 text-xs">
                      {/* RBM */}
                      <div className="px-3 py-2">
                        <div className="text-[10px] text-gray-900 font-medium mb-1 uppercase tracking-wide">RBM</div>
                        <div className="font-bold text-blue-800 text-sm">{fmtBRL(r.rbmTotal)}</div>
                        {r.rbmConsig > 0 && <div className="text-gray-900 mt-0.5">Consig: <span className="text-blue-600">{fmtBRL(r.rbmConsig)}</span></div>}
                        {r.rbmCC > 0 && <div className="text-gray-900">C/C: <span className="text-blue-600">{fmtBRL(r.rbmCC)}</span></div>}
                        {r.rbmConsorcio > 0 && <div className="text-gray-900">Consórc: <span className="text-blue-600">{fmtBRL(r.rbmConsorcio)}</span></div>}
                        {r.rbmOurocap > 0 && <div className="text-gray-900">Ouro: <span className="text-blue-600">{fmtBRL(r.rbmOurocap)}</span></div>}
                        {r.rbmSeguros > 0 && <div className="text-gray-900">Seg: <span className="text-blue-600">{fmtBRL(r.rbmSeguros)}</span></div>}
                      </div>

                      {/* Comissões */}
                      <div className="px-3 py-2">
                        <div className="text-[10px] text-gray-900 font-medium mb-1 uppercase tracking-wide">Comissões</div>
                        <div className="font-bold text-green-700 text-sm">{fmtBRL(r.comissaoTotal)}</div>
                      </div>

                      {/* Despesas + % */}
                      <div className="px-3 py-2">
                        <div className="text-[10px] text-gray-900 font-medium mb-1 uppercase tracking-wide">Despesas</div>
                        <div className={`font-bold text-sm ${r.totalDesp > 0 ? "text-orange-700" : "text-gray-900"}`}>{fmtBRL(r.totalDesp)}</div>
                        {r.totalDespFixas > 0 && <div className="text-gray-900 mt-0.5">Fixas: <span className="text-orange-600">{fmtBRL(r.totalDespFixas)}</span></div>}
                        {r.totalDespAvulsas > 0 && <div className="text-gray-900">Avulsas: <span className="text-orange-600">{fmtBRL(r.totalDespAvulsas)}</span></div>}
                        <div className={`mt-1 text-xs font-semibold ${pctAlto ? "text-red-600" : pctMedio ? "text-orange-500" : "text-gray-900"}`}>
                          {fmtPct(r.pctConsumido)} consumido
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totalizador */}
            <div className="mt-4 bg-gray-800 text-white rounded-lg p-3">
              <div className="text-xs font-bold mb-2 uppercase tracking-wide text-gray-300">Totais Gerais — {data.length} agentes</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-gray-900 uppercase">RBM Total</div>
                  <div className="font-bold text-blue-300">{fmtBRL(totais.rbmTotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-900 uppercase">Comissões</div>
                  <div className="font-bold text-green-300">{fmtBRL(totais.comissaoTotal)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-900 uppercase">Despesas</div>
                  <div className="font-bold text-orange-300">{fmtBRL(totais.totalDesp)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-900 uppercase">Saldo</div>
                  <div className={`font-bold ${totais.saldo >= 0 ? "text-green-300" : "text-red-300"}`}>{fmtBRL(totais.saldo)}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
