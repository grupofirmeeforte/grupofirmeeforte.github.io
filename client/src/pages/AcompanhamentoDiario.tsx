import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Trophy, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function fmt(v: number) {
  if (!v) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v: number) {
  return (v * 100).toFixed(0) + "%";
}

function getDayOfWeek(ano: number, mes: number, dia: number) {
  const d = new Date(ano, mes - 1, dia);
  return ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d.getDay()];
}
function isWeekend(ano: number, mes: number, dia: number) {
  const dow = new Date(ano, mes - 1, dia).getDay();
  return dow === 0 || dow === 6;
}

type Empresa = "BMF" | "FLEX" | "TODAS";

function hasAcompanhamentoAccess(user: any): boolean {
  if (!user) return false;
  // Admin do sistema sempre tem acesso
  if (user.role === 'admin') return true;
  // Cargo admin/CEO/ADM
  const cargo = (user.cargo ?? '').toUpperCase();
  if (['CEO', 'ADM', 'ADMIN'].includes(cargo)) return true;
  // permissoes = admin
  if ((user.permissoes ?? '') === 'admin') return true;
  // permissoesModulos: febraban.acompanhamento-diario >= leitura
  if (user.permissoesModulos) {
    try {
      const mods = typeof user.permissoesModulos === 'string'
        ? JSON.parse(user.permissoesModulos)
        : user.permissoesModulos;
      const nivel = mods?.febraban?.['acompanhamento-diario'];
      if (nivel && nivel !== 'sem_acesso') return true;
    } catch {}
  }
  return false;
}

export default function AcompanhamentoDiario() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [empresa, setEmpresa] = useState<Empresa>("BMF");

  const temAcesso = hasAcompanhamentoAccess(user);

  const { data, isLoading } = trpc.febraban.acompanhamentoDiario.useQuery(
    { empresa, mes, ano }
  );

  const agentes = [...(data?.agentes ?? [])].sort((a, b) => b.total - a.total);
  const dias = data?.dias ?? [];
  const totalPorDia: Record<number, number> = (data?.totalPorDia ?? {}) as Record<number, number>;
  const diasUteisTotal = data?.diasUteisTotal ?? 0;
  const feriadosNome: Record<number, string> = (data?.feriadosNome ?? {}) as Record<number, string>;

  // Ranking: agentes com aproveitamento >= 50%, ordenados por total
  const ranking = useMemo(() =>
    [...agentes].filter(a => a.aproveitamento >= 0.5).sort((a, b) => b.total - a.total),
    [agentes]
  );

  function prevMes() {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }
  function nextMes() {
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }

  const totalGeral = agentes.reduce((s, a) => s + a.total, 0);

  // Tela de carregamento
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <PageHeader />
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  // Sem acesso
  if (!temAcesso) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 flex flex-col items-center gap-4 max-w-sm text-center">
          <Lock className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-white">Acesso Restrito</h2>
          <p className="text-gray-400 text-sm">Você não tem permissão para acessar o Acompanhamento Diário.<br/>Solicite ao administrador.</p>
          <Button size="sm" onClick={() => navigate("/")} className="gap-1 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader />
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Acompanhamento Diário</h1>
            <p className="text-xs text-gray-400">Produção por agente — Febraban BB</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor de mês */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={prevMes} className="text-gray-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[120px]">
                <div className="font-bold text-lg">{MESES[mes - 1]}</div>
                <div className="text-xs text-gray-400">{ano}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={nextMes} className="text-gray-400 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Seletor de ano */}
            <div className="flex gap-1">
              {[2025, 2026].map(a => (
                <button
                  key={a}
                  onClick={() => setAno(a)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    ano === a
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            {/* Abas BMF / FLEX / TODAS */}
            <div className="flex gap-2">
              {(["BMF","FLEX","TODAS"] as Empresa[]).map(e => (
                <button key={e} onClick={() => setEmpresa(e)}
                  className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                    empresa === e
                      ? e === "BMF"
                        ? "bg-blue-600 text-white shadow-lg"
                        : e === "FLEX"
                        ? "bg-green-600 text-white shadow-lg"
                        : "bg-purple-600 text-white shadow-lg"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                  {e}
                </button>
              ))}
            </div>


          </div>
        </div>
      </div>

      {/* Resumo rápido */}
      <div className="px-6 py-3 bg-gray-900/50 border-b border-gray-800 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-400">Total do mês: </span>
          <span className="font-bold text-green-400">{fmt(totalGeral)}</span>
        </div>
        <div>
          <span className="text-gray-400">Agentes: </span>
          <span className="font-bold">{agentes.length}</span>
        </div>
        <div>
          <span className="text-gray-400">Dias úteis: </span>
          <span className="font-bold">{diasUteisTotal}</span>
        </div>
        <div>
          <span className="text-gray-400">Ranking ≥50%: </span>
          <span className="font-bold text-yellow-400">{ranking.length}</span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          Carregando...
        </div>
      )}

      {!isLoading && agentes.length === 0 && (
        <div className="flex items-center justify-center py-20 text-gray-500">
          Nenhum dado encontrado para {MESES[mes-1]}/{ano} — {empresa === 'TODAS' ? 'BMF + FLEX' : empresa}
        </div>
      )}

      {!isLoading && agentes.length > 0 && (
        <div className="px-4 py-4 space-y-6">
          {/* Ranking */}
          {ranking.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-yellow-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-400 text-sm uppercase tracking-wide">Ranking 50%+</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ranking.map((a, i) => (
                  <div key={a.chaveJ} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                    <span className={`text-xs font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-400"}`}>
                      #{i+1}
                    </span>
                    <span className="text-xs text-gray-300">{a.nome}</span>
                    <Badge className="text-[10px] bg-green-900 text-green-300 border-0">{pct(a.aproveitamento)}</Badge>
                    <span className="text-xs text-green-400 font-bold">{fmt(a.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela principal */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  {/* Linha de dias da semana */}
                  <tr className="border-b border-gray-700">
                    <th className="sticky left-0 bg-gray-900 z-10 px-3 py-2 text-left text-gray-400 font-medium min-w-[140px]">Agente</th>
                    <th className="px-2 py-2 text-gray-400 font-medium min-w-[60px]">Situação</th>
                    <th className="px-2 py-2 text-gray-400 font-medium min-w-[50px]">Dias C/</th>
                    <th className="px-2 py-2 text-gray-400 font-medium min-w-[50px]">Dias S/</th>
                    <th className="px-2 py-2 text-gray-400 font-medium min-w-[55px]">Aprov.</th>
                    <th className="px-2 py-2 text-gray-400 font-medium min-w-[55px]">Média/DU</th>
                    <th className="px-2 py-2 text-green-400 font-bold min-w-[80px]">Total</th>
                    {dias.map((d, colIdx) => {
                      const dow = new Date(ano, mes - 1, d).getDay();
                      const isSab = dow === 6;
                      const isDom = dow === 0;
                      const isWkd = isSab || isDom;
                      const zebraUtil = !isWkd ? (colIdx % 2 === 0 ? "bg-blue-950/40" : "bg-gray-900") : "";
                      return (
                        <th key={d} className={`px-1 py-1 text-center min-w-[52px] ${isWkd ? "bg-red-950/40" : zebraUtil}`}>
                          {isSab ? (
                            <>
                              <div className="text-red-400 font-bold text-[9px] leading-tight">{d}</div>
                              <div className="text-red-400 font-bold text-[9px] leading-tight">Sábado</div>
                            </>
                          ) : isDom ? (
                            <>
                              <div className="text-red-400 font-bold text-[9px] leading-tight">{d}</div>
                              <div className="text-red-400 font-bold text-[9px] leading-tight">Domingo</div>
                            </>
                          ) : (
                            <>
                              <div className="text-gray-400">{d}</div>
                              <div className="text-[9px] text-gray-400">{getDayOfWeek(ano, mes, d)}</div>
                            </>
                          )}
                        </th>
                      );
                    })}

                  </tr>
                </thead>
                <tbody>
                  {agentes.map((a, idx) => (
                    <tr key={a.chaveJ} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-900/30"}`}>
                      <td className="sticky left-0 bg-gray-900 z-10 px-3 py-2">
                        <div className="font-mono text-blue-300 text-[10px]">{a.chaveJ}</div>
                        <div className="text-gray-300 truncate max-w-[130px]" title={a.nome}>{a.nome}</div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge className={`text-[9px] border-0 ${a.situacao === "Ativo" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                          {a.situacao}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-center text-gray-300">{a.diasComProducao}</td>
                      <td className="px-2 py-2 text-center text-gray-500">{a.diasSemProducao}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`font-bold ${a.aproveitamento >= 0.5 ? "text-green-400" : "text-red-400"}`}>
                          {pct(a.aproveitamento)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center text-gray-300">{fmt(a.mediaPorDiaUtil)}</td>
                      <td className="px-2 py-2 text-center font-bold text-green-400">{fmt(a.total)}</td>
                      {dias.map((d, colIdx) => {
                        const val = a.producaoPorDia[d] ?? 0;
                        const dow = new Date(ano, mes - 1, d).getDay();
                        const isSab = dow === 6;
                        const isDom = dow === 0;
                        const isWkd = isSab || isDom;
                        const label = isSab ? "Sábado" : isDom ? "Domingo" : null;
                        const zebraUtil = !isWkd ? (colIdx % 2 === 0 ? "bg-blue-950/20" : "") : "";
                        return (
                          <td key={d} className={`px-1 py-2 text-center ${isWkd ? "bg-red-950/20" : zebraUtil} ${!isWkd && val > 0 ? "text-white" : !isWkd ? "text-gray-700" : ""}`}>
                            {val > 0 ? (
                              <span className={isWkd ? "text-red-300" : "text-white"}>{fmt(val)}</span>
                            ) : label ? (
                              <span className="text-red-500 font-bold text-[8px] leading-tight block">{label}</span>
                            ) : "·"}
                          </td>
                        );
                      })}

                    </tr>
                  ))}
                  {/* Linha de totais por dia */}
                  <tr className="border-t-2 border-gray-600 bg-gray-800/50 font-bold">
                    <td className="sticky left-0 bg-gray-800 z-10 px-3 py-2 text-gray-300">TOTAL DIA</td>
                    <td colSpan={5} />
                    <td className="px-2 py-2 text-center text-green-400">{fmt(totalGeral)}</td>
                    {dias.map((d, colIdx) => {
                      const val = totalPorDia[d] ?? 0;
                      const dow = new Date(ano, mes - 1, d).getDay();
                      const isSab = dow === 6;
                      const isDom = dow === 0;
                      const isWkd = isSab || isDom;
                      const label = isSab ? "Sábado" : isDom ? "Domingo" : null;
                      const zebraUtil = !isWkd ? (colIdx % 2 === 0 ? "bg-blue-950/30" : "") : "";
                      return (
                        <td key={d} className={`px-1 py-2 text-center text-[10px] ${isWkd ? "bg-red-950/20" : zebraUtil} ${!isWkd && val > 0 ? "text-green-300" : !isWkd ? "text-gray-700" : ""}`}>
                          {val > 0 ? (
                            <span className={isWkd ? "text-red-300" : "text-green-300"}>{fmt(val)}</span>
                          ) : label ? (
                            <span className="text-red-500 font-bold text-[8px]">{label}</span>
                          ) : "·"}
                        </td>
                      );
                    })}

                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pb-4">
            <span><span className="text-green-400 font-bold">Verde</span> = aproveitamento ≥ 50%</span>
            <span><span className="text-red-400 font-bold">Vermelho</span> = aproveitamento &lt; 50%</span>
            <span><span className="text-gray-600">—</span> = fim de semana</span>
            <span><span className="text-gray-700">·</span> = sem produção</span>
            <span>Dias C/ = dias úteis com produção | Dias S/ = dias úteis sem produção</span>
          </div>
        </div>
      )}
    </div>
  );
}

