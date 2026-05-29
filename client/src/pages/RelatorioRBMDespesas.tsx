import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import PageHeader from "@/components/PageHeader";

function fmtPct(v: number) {
  return v.toFixed(2).replace(".", ",") + "%";
}
function fmtNum(v: number) {
  if (v === 0) return <span className="text-gray-300">-</span>;
  return <span>{v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}
function fmtTot(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RelatorioRBMDespesas() {
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

  const filtros = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 font-medium">Ano</label>
        <select value={ano} onChange={e=>setAno(e.target.value)} className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
          {anosDisponiveis.map(a=><option key={a} value={a!}>{a}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 font-medium">Mês</label>
        <select value={mes} onChange={e=>setMes(e.target.value)} className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todos</option>
          {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m=>(
            <option key={m} value={m}>{new Date(2000,parseInt(m)-1,1).toLocaleString('pt-BR',{month:'short'}).replace(/^./,c=>c.toUpperCase()).replace('.','')}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 font-medium">Empresa</label>
        <select value={empresa} onChange={e=>setEmpresa(e.target.value)} className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="Todas">Todas</option>
          <option value="BMF">BMF</option>
          <option value="FLEX">FLEX</option>
        </select>
      </div>
      {data.length>0 && <span className="text-[10px] text-gray-400">{data.length} ag.</span>}
      <Button onClick={exportarCSV} variant="outline" size="sm" className="gap-1 text-[10px] h-6 px-2 py-0">
        <Download className="w-3 h-3"/> CSV
      </Button>
    </div>
  );

  const loading = <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>;
  const empty = <div className="text-center py-16 text-gray-400 text-sm">Nenhum dado encontrado para {ano}.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />

      <div className="bg-white border-b border-gray-200 px-3 py-2 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-800 leading-tight">Relatório RBM × Despesas</h1>
          <p className="text-[10px] text-gray-400">Produção vs. custos por agente — acumulado anual</p>
        </div>
        {filtros}
      </div>

      <div className="px-1 py-2">
        {isLoading ? loading : data.length===0 ? empty : (
          <>
            {/* ── DESKTOP: 16 colunas ── */}
            <div className="hidden lg:block">
              <table className="w-full text-[10px] border-collapse" style={{tableLayout:'fixed'}}>
                <colgroup>
                  <col style={{width:'13%'}}/>
                  <col style={{width:'4%'}}/>
                  <col style={{width:'8%'}}/>
                  <col style={{width:'3%'}}/>
                  <col style={{width:'7%'}}/>
                  <col style={{width:'6%'}}/>
                  <col style={{width:'5%'}}/>
                  <col style={{width:'5%'}}/>
                  <col style={{width:'4%'}}/>
                  <col style={{width:'4%'}}/>
                  <col style={{width:'7%'}}/>
                  <col style={{width:'6%'}}/>
                  <col style={{width:'6%'}}/>
                  <col style={{width:'6%'}}/>
                  <col style={{width:'8%'}}/>
                  <col style={{width:'4%'}}/>
                </colgroup>
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-1 py-1.5 text-left font-semibold">Agente</th>
                    <th className="px-1 py-1.5 text-center font-semibold">Emp.</th>
                    <th className="px-1 py-1.5 text-center font-semibold">Cidade</th>
                    <th className="px-1 py-1.5 text-center font-semibold">Mes</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-800">RBM Tot</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-700 text-blue-100">Consig</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-700 text-blue-100">C/C</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-700 text-blue-100">Cons.</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-700 text-blue-100">Ouro</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-700 text-blue-100">Seg</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-green-800">Comis.</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-orange-700">D.Fix</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-orange-700">D.Avul</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-orange-800">Tot.D.</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-purple-800">Saldo</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-red-800">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r,i)=>{
                    const lucro=r.saldo>=0;
                    const pctAlto=r.pctConsumido>=100;
                    const pctMedio=r.pctConsumido>=70&&r.pctConsumido<100;
                    return (
                      <tr key={`${r.chaveJ}-${r.empresa}`} className={`border-b border-gray-200 ${i%2===0?"bg-white":"bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                        <td className="px-1 py-1 overflow-hidden">
                          <div className="font-semibold text-gray-800 truncate text-[10px]">{r.nomeAgente||r.chaveJ}</div>
                          <div className="text-[9px] text-gray-400 truncate">{r.chaveJ}</div>
                        </td>
                        <td className="px-1 py-1 text-center">
                          <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${r.empresa==='BMF'?'bg-green-100 text-green-800':r.empresa==='FLEX'?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-700'}`}>{r.empresa}</span>
                        </td>
                        <td className="px-1 py-1 text-center text-gray-600 truncate text-[9px]">
                          {r.cidade||"-"}{r.nAgentesNaCidade>1&&<span className="ml-0.5 text-[9px] text-orange-500">÷{r.nAgentesNaCidade}</span>}
                        </td>
                        <td className="px-1 py-1 text-center text-gray-500">{r.meses}</td>
                        <td className="px-1 py-1 text-right font-semibold text-blue-800">{fmtNum(r.rbmTotal)}</td>
                        <td className="px-1 py-1 text-right text-blue-600">{fmtNum(r.rbmConsig)}</td>
                        <td className="px-1 py-1 text-right text-blue-600">{fmtNum(r.rbmCC)}</td>
                        <td className="px-1 py-1 text-right text-blue-600">{fmtNum(r.rbmConsorcio)}</td>
                        <td className="px-1 py-1 text-right text-blue-600">{fmtNum(r.rbmOurocap)}</td>
                        <td className="px-1 py-1 text-right text-blue-600">{fmtNum(r.rbmSeguros)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-green-700">{fmtNum(r.comissaoTotal)}</td>
                        <td className="px-1 py-1 text-right text-orange-600">{fmtNum(r.totalDespFixas)}</td>
                        <td className="px-1 py-1 text-right text-orange-600">{fmtNum(r.totalDespAvulsas)}</td>
                        <td className="px-1 py-1 text-right font-semibold text-orange-700">{fmtNum(r.totalDesp)}</td>
                        <td className={`px-1 py-1 text-right font-bold text-[10px] ${lucro?"text-green-700":"text-red-600"}`}>
                          <div className="flex items-center justify-end gap-0.5">
                            {lucro?<TrendingUp className="w-2.5 h-2.5 flex-shrink-0"/>:<TrendingDown className="w-2.5 h-2.5 flex-shrink-0"/>}
                            <span className="truncate">{r.saldo.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                          </div>
                        </td>
                        <td className={`px-1 py-1 text-right font-bold ${pctAlto?"text-red-600":pctMedio?"text-orange-500":"text-gray-600"}`}>{fmtPct(r.pctConsumido)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800 text-white font-bold border-t-2 border-gray-600 text-[10px]">
                    <td className="px-1 py-1.5">TOTAL</td>
                    <td colSpan={3}></td>
                    <td className="px-1 py-1.5 text-right">{fmtTot(totais.rbmTotal)}</td>
                    <td className="px-1 py-1.5 text-right text-blue-300">{fmtTot(totais.rbmConsig)}</td>
                    <td className="px-1 py-1.5 text-right text-blue-300">{fmtTot(totais.rbmCC)}</td>
                    <td className="px-1 py-1.5 text-right text-blue-300">{fmtTot(totais.rbmConsorcio)}</td>
                    <td className="px-1 py-1.5 text-right text-blue-300">{fmtTot(totais.rbmOurocap)}</td>
                    <td className="px-1 py-1.5 text-right text-blue-300">{fmtTot(totais.rbmSeguros)}</td>
                    <td className="px-1 py-1.5 text-right text-green-300">{fmtTot(totais.comissaoTotal)}</td>
                    <td className="px-1 py-1.5 text-right text-orange-300">{fmtTot(totais.totalDespFixas)}</td>
                    <td className="px-1 py-1.5 text-right text-orange-300">{fmtTot(totais.totalDespAvulsas)}</td>
                    <td className="px-1 py-1.5 text-right text-orange-200">{fmtTot(totais.totalDesp)}</td>
                    <td className={`px-1 py-1.5 text-right ${totais.saldo>=0?"text-green-300":"text-red-300"}`}>{fmtTot(totais.saldo)}</td>
                    <td className="px-1 py-1.5 text-right text-gray-300">{totais.rbmTotal>0?fmtPct(((totais.comissaoTotal+totais.totalDesp)/totais.rbmTotal)*100):"-"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── MOBILE: 10 colunas agrupadas ── */}
            <div className="block lg:hidden overflow-x-auto">
              <table className="w-full text-[9px] border-collapse min-w-[360px]">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-1 py-1.5 text-left font-semibold">Agente</th>
                    <th className="px-1 py-1.5 text-center font-semibold">Emp.</th>
                    <th className="px-1 py-1.5 text-center font-semibold">Cidade</th>
                    <th className="px-1 py-1.5 text-center font-semibold">Mes</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-800">RBM</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-blue-700 text-blue-100" title="Consig+C/C+Cons+Ouro+Seg">Prod.</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-green-800">Comis.</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-orange-700" title="Fixas+Avulsas">Desp.</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-purple-800">Saldo</th>
                    <th className="px-1 py-1.5 text-right font-semibold bg-red-800">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r,i)=>{
                    const lucro=r.saldo>=0;
                    const pctAlto=r.pctConsumido>=100;
                    const pctMedio=r.pctConsumido>=70&&r.pctConsumido<100;
                    const prodBB=r.rbmConsig+r.rbmCC+r.rbmConsorcio+r.rbmOurocap+r.rbmSeguros;
                    return (
                      <tr key={`m-${r.chaveJ}-${r.empresa}`} className={`border-b border-gray-200 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                        <td className="px-1 py-0.5 overflow-hidden max-w-[80px]">
                          <div className="font-semibold text-gray-800 truncate text-[9px]">{r.nomeAgente||r.chaveJ}</div>
                          <div className="text-[8px] text-gray-400 truncate">{r.chaveJ}</div>
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <span className={`px-0.5 rounded text-[8px] font-bold ${r.empresa==='BMF'?'bg-green-100 text-green-800':r.empresa==='FLEX'?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-700'}`}>{r.empresa}</span>
                        </td>
                        <td className="px-1 py-0.5 text-center text-gray-600 truncate text-[8px] max-w-[50px]">{r.cidade||"-"}</td>
                        <td className="px-1 py-0.5 text-center text-gray-500">{r.meses}</td>
                        <td className="px-1 py-0.5 text-right font-semibold text-blue-800">{fmtNum(r.rbmTotal)}</td>
                        <td className="px-1 py-0.5 text-right text-blue-600">{fmtNum(prodBB)}</td>
                        <td className="px-1 py-0.5 text-right font-semibold text-green-700">{fmtNum(r.comissaoTotal)}</td>
                        <td className="px-1 py-0.5 text-right text-orange-600">{fmtNum(r.totalDesp)}</td>
                        <td className={`px-1 py-0.5 text-right font-bold ${lucro?"text-green-700":"text-red-600"}`}>
                          <div className="flex items-center justify-end gap-0.5">
                            {lucro?<TrendingUp className="w-2 h-2 flex-shrink-0"/>:<TrendingDown className="w-2 h-2 flex-shrink-0"/>}
                            <span>{r.saldo.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                          </div>
                        </td>
                        <td className={`px-1 py-0.5 text-right font-bold ${pctAlto?"text-red-600":pctMedio?"text-orange-500":"text-gray-600"}`}>{fmtPct(r.pctConsumido)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800 text-white font-bold border-t-2 border-gray-600 text-[9px]">
                    <td className="px-1 py-1">TOTAL</td>
                    <td colSpan={3}></td>
                    <td className="px-1 py-1 text-right">{fmtTot(totais.rbmTotal)}</td>
                    <td className="px-1 py-1 text-right text-blue-300">{fmtTot(totais.rbmConsig+totais.rbmCC+totais.rbmConsorcio+totais.rbmOurocap+totais.rbmSeguros)}</td>
                    <td className="px-1 py-1 text-right text-green-300">{fmtTot(totais.comissaoTotal)}</td>
                    <td className="px-1 py-1 text-right text-orange-300">{fmtTot(totais.totalDesp)}</td>
                    <td className={`px-1 py-1 text-right ${totais.saldo>=0?"text-green-300":"text-red-300"}`}>{fmtTot(totais.saldo)}</td>
                    <td className="px-1 py-1 text-right text-gray-300">{totais.rbmTotal>0?fmtPct(((totais.comissaoTotal+totais.totalDesp)/totais.rbmTotal)*100):"-"}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="mt-1 px-1 text-[8px] text-gray-400">
                <span className="font-semibold text-blue-500">Prod.</span> = Consig+C/C+Consórc+Ouro+Seg &nbsp;|&nbsp; <span className="font-semibold text-orange-500">Desp.</span> = Fixas+Avulsas
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
