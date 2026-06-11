import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { ArrowLeft, BarChart2, TrendingUp, PieChart } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

// Paleta de cores para agentes
const CORES_AGENTES = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
  "#0891b2", "#be185d", "#65a30d", "#ea580c", "#0d9488",
  "#9333ea", "#c2410c", "#15803d", "#1d4ed8", "#b45309",
];

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

type Periodo = "bimestre" | "trimestre" | "semestre" | "ano";

// ─── TOOLTIP CUSTOMIZADO ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-700 rounded-lg shadow-lg p-3 text-xs max-w-[220px]">
      <p className="font-bold text-gray-800 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.color }} />
            <span className="text-gray-800 truncate max-w-[110px]">{p.name}</span>
          </span>
          <span className="font-semibold text-white">{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── GRÁFICO POR CHAVE J ─────────────────────────────────────────────────────
function GraficoPorChaveJ({ periodo, empresa }: { periodo: Periodo; empresa: string }) {
  const { data, isLoading } = trpc.febraban.graficoPorPeriodo.useQuery({ periodo, empresa: empresa !== "__all__" ? empresa : undefined });
  const series = data?.series ?? [];
  const labels = data?.labels ?? [];

  // Montar dados para Recharts: array de objetos { label, agente1: val, agente2: val, ... }
  const chartData = useMemo(() =>
    labels.map((label, i) => {
      const obj: Record<string, any> = { label };
      series.forEach(s => { obj[s.name] = s.data[i] ?? 0; });
      return obj;
    }),
    [labels, series]
  );

  // Top 10 agentes por total para não poluir o gráfico
  const top10 = useMemo(() => series.slice(0, 10), [series]);

  // Último período disponível (para exibir nos cards)
  const ultimoLabel = labels[labels.length - 1];

  if (isLoading) return <div className="flex items-center justify-center py-16 text-gray-800">Carregando...</div>;
  if (!labels.length) return <div className="flex items-center justify-center py-16 text-gray-800">Nenhum dado disponível para o período selecionado.</div>;

  return (
    <div>
      {/* Ranking de agentes — valor do último período */}
      <div className="mb-1 text-xs text-gray-800 text-right pr-1">Valores referentes a: <span className="font-semibold text-gray-800">{ultimoLabel}</span></div>
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {top10.map((s, i) => {
          const idxUltimo = labels.indexOf(ultimoLabel);
          const valorUltimoPeriodo = idxUltimo >= 0 ? (s.data[idxUltimo] ?? 0) : 0;
          return (
          <div key={s.name} className="rounded-lg border p-2 text-center" style={{ borderColor: CORES_AGENTES[i % CORES_AGENTES.length] + "44", background: CORES_AGENTES[i % CORES_AGENTES.length] + "0d" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: CORES_AGENTES[i % CORES_AGENTES.length] }}>{s.name}</p>
            <p className="text-sm font-bold text-white mt-0.5">{fmtK(valorUltimoPeriodo)}</p>
          </div>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={72} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {top10.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} stackId="a" fill={CORES_AGENTES[i % CORES_AGENTES.length]} radius={i === top10.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── GRÁFICO POR TIPO ────────────────────────────────────────────────────────
function GraficoPorTipo({ periodo, empresa }: { periodo: Periodo; empresa: string }) {
  const { data, isLoading } = trpc.febraban.graficoPorTipo.useQuery({ periodo, empresa: empresa !== "__all__" ? empresa : undefined });
  const chartData = data?.data ?? [];

  if (isLoading) return <div className="flex items-center justify-center py-16 text-gray-800">Carregando...</div>;
  if (!chartData.length) return <div className="flex items-center justify-center py-16 text-gray-800">Nenhum dado disponível para o período selecionado.</div>;

  // Totais por tipo
  const totalNovo = chartData.reduce((s, r) => s + r.novo, 0);
  const totalRefin = chartData.reduce((s, r) => s + r.refin, 0);
  const totalCancelado = chartData.reduce((s, r) => s + r.cancelado, 0);
  const totalGeral = totalNovo + totalRefin + totalCancelado;

  return (
    <div>
      {/* Cards de totais */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-blue-200 bg-blue-900/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Financ. Novo</p>
          <p className="text-lg font-bold text-blue-800">{fmtK(totalNovo)}</p>
          <p className="text-xs text-blue-500">{totalGeral > 0 ? ((totalNovo / totalGeral) * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">Troco/Refin</p>
          <p className="text-lg font-bold text-orange-800">{fmtK(totalRefin)}</p>
          <p className="text-xs text-orange-500">{totalGeral > 0 ? ((totalRefin / totalGeral) * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Cancelados</p>
          <p className="text-lg font-bold text-red-800">{fmtK(totalCancelado)}</p>
          <p className="text-xs text-red-500">{totalGeral > 0 ? ((totalCancelado / totalGeral) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={72} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="novo" name="Financ. Novo" stackId="a" fill="#2563eb" />
          <Bar dataKey="refin" name="Troco/Refin" stackId="a" fill="#f97316" />
          <Bar dataKey="cancelado" name="Cancelados" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Linha de evolução do total */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2">Evolução do Volume Total (Valor Líquido)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={72} />
            <Tooltip formatter={(v: any) => [fmt(v), "Total"]} labelStyle={{ fontWeight: "bold" }} />
            <Line
              type="monotone"
              dataKey={(d) => d.novo + d.refin}
              name="Total Contratado"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 4, fill: "#16a34a" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function GraficoProducaoBBPage() {
  useRegistrarModulo('Gráfico Produção BB');
  const [, navigate] = useLocation();
  const [empresa, setEmpresa] = useState("__all__");

  const { data: filtrosData } = trpc.febraban.filtros.useQuery();
  const empresas = filtrosData?.empresas ?? [];

  const PERIODOS: { value: Periodo; label: string }[] = [
    { value: "bimestre", label: "Bimestre" },
    { value: "trimestre", label: "Trimestre" },
    { value: "semestre", label: "Semestre" },
    { value: "ano", label: "Ano" },
  ];

  const [periodoChaveJ, setPeriodoChaveJ] = useState<Periodo>("trimestre");
  const [periodoTipo, setPeriodoTipo] = useState<Periodo>("trimestre");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader title="Gráfico Produção BB" actions={
        <div className="flex gap-1.5 items-center flex-wrap">
          <Button size="sm" onClick={() => navigate("/febraban")} className="gap-1 rounded-full font-semibold" style={{background:'linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)',color:'#fff',border:'1.5px solid #3b82f6',boxShadow:'0 2px 12px rgba(59,130,246,0.35)'}}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      } />

      <div className="p-6 space-y-6">

        {/* ─── SEÇÃO 1: POR CHAVE J ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Produção por ChaveJ — Valor Líquido (Contratadas)
              </CardTitle>
              <div className="flex gap-1">
                {PERIODOS.map(p => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={periodoChaveJ === p.value ? "default" : "outline"}
                    className={`text-xs h-7 px-3 ${periodoChaveJ === p.value ? "bg-blue-600 text-white" : ""}`}
                    onClick={() => setPeriodoChaveJ(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GraficoPorChaveJ periodo={periodoChaveJ} empresa={empresa} />
          </CardContent>
        </Card>

        {/* ─── SEÇÃO 2: POR TIPO ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-orange-600" />
                Produção por Tipo de Operação — Financ. Novo / Troco-Refin / Cancelados
              </CardTitle>
              <div className="flex gap-1">
                {PERIODOS.map(p => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={periodoTipo === p.value ? "default" : "outline"}
                    className={`text-xs h-7 px-3 ${periodoTipo === p.value ? "bg-orange-600 text-white" : ""}`}
                    onClick={() => setPeriodoTipo(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GraficoPorTipo periodo={periodoTipo} empresa={empresa} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
