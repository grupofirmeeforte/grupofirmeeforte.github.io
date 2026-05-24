import { useState, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Upload, Edit2, Trash2, ArrowLeft, Download, BarChart2, TrendingUp, PieChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";
import { formatMesAno } from "@/lib/mesano";
import PageHeader from "@/components/PageHeader";

// Alias para compatibilidade com código existente
const mesanoToStr = formatMesAno;

function formatCurrency(val: string | number | null | undefined): string {
  if (val == null || val === "") return "-";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "-";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tipoBadge(situacao: string | null | undefined, troco: string | number | null | undefined, financiado: string | number | null | undefined) {
  // Cancelado tem prioridade
  if (situacao && situacao.toLowerCase().includes("cancel")) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-300">CANCELADO</span>;
  }
  const toNum = (v: string | number | null | undefined) => {
    if (v == null || v === "") return 0;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? 0 : Math.round(n * 100); // centavos para evitar float imprecision
  };
  const t = toNum(troco);
  const f = toNum(financiado);
  // FINANC NOVO: troco igual ao financiado (mesmo valor — sem liberação extra)
  if (t === f) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">FINANC NOVO</span>;
  }
  // TROCO/REFIN: troco diferente do financiado
  return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">TROCO/REFIN</span>;
}

function situacaoBadge(s: string | null | undefined) {
  if (!s) return <span className="text-gray-400">-</span>;
  const colors: Record<string, string> = {
    "Contratada": "bg-green-100 text-green-800",
    "Cancelada": "bg-red-100 text-red-800",
    "Pendente": "bg-yellow-100 text-yellow-800",
  };
  const cls = colors[s] || "bg-gray-100 text-gray-700";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{s}</span>;
}

const LIMIT = 100;

type FebRow = {
  id: number;
  empresa: string | null;
  mesano: number | null;
  proposta: string;
  linha: number | null;
  situacao: string | null;
  operador: string | null;
  solicitacao: string | null;
  prazo: string | null;
  troco: string | null;
  financiado: string | null;
  situacao2: string | null;
  pago: number | null;
  pagoManual: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Paleta de cores para agentes ───────────────────────────────────────────
const CORES = ["#2563eb","#16a34a","#dc2626","#d97706","#7c3aed","#0891b2","#be185d","#65a30d","#ea580c","#0d9488"];
const fmtK = (v: number) => { if (Math.abs(v)>=1_000_000) return `R$ ${(v/1_000_000).toFixed(1)}M`; if (Math.abs(v)>=1_000) return `R$ ${(v/1_000).toFixed(0)}k`; return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0}); };
const fmtFull = (v: number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});

function GrafTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-[220px]">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.color }} />
            <span className="text-gray-600 truncate max-w-[110px]">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-800">{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

type Periodo = 'bimestre'|'trimestre'|'semestre'|'ano';
const PERIODOS: {value: Periodo; label: string}[] = [
  {value:'bimestre',label:'Bimestre'},
  {value:'trimestre',label:'Trimestre'},
  {value:'semestre',label:'Semestre'},
  {value:'ano',label:'Ano'},
];

function GraficosProducaoInline({ empresa, filtros }: { empresa: string; filtros: any }) {
  const [periodoChaveJ, setPeriodoChaveJ] = useState<Periodo>('trimestre');
  const [periodoTipo, setPeriodoTipo] = useState<Periodo>('trimestre');
  const empresaFiltro = empresa !== '__all__' ? empresa : undefined;

  const { data: dadosChaveJ, isLoading: loadChaveJ } = trpc.febraban.graficoPorPeriodo.useQuery({ periodo: periodoChaveJ, empresa: empresaFiltro });
  const { data: dadosTipo, isLoading: loadTipo } = trpc.febraban.graficoPorTipo.useQuery({ periodo: periodoTipo, empresa: empresaFiltro });

  const seriesChaveJ = dadosChaveJ?.series ?? [];
  const labelsChaveJ = dadosChaveJ?.labels ?? [];
  const top10 = useMemo(() => seriesChaveJ.slice(0, 10), [seriesChaveJ]);
  const chartDataChaveJ = useMemo(() =>
    labelsChaveJ.map((label, i) => {
      const obj: Record<string, any> = { label };
      top10.forEach(s => { obj[s.name] = s.data[i] ?? 0; });
      return obj;
    }), [labelsChaveJ, top10]);

  const chartDataTipo = dadosTipo?.data ?? [];
  const totalNovo = chartDataTipo.reduce((s, r) => s + r.novo, 0);
  const totalRefin = chartDataTipo.reduce((s, r) => s + r.refin, 0);
  const totalCancelado = chartDataTipo.reduce((s, r) => s + r.cancelado, 0);
  const totalGeral = totalNovo + totalRefin + totalCancelado;

  return (
    <div className="space-y-6">
      {/* Gráfico 1: Por ChaveJ */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Produção por ChaveJ — Valor Líquido (Contratadas)
            </CardTitle>
            <div className="flex gap-1">
              {PERIODOS.map(p => (
                <Button key={p.value} size="sm"
                  variant={periodoChaveJ === p.value ? 'default' : 'outline'}
                  className={`text-xs h-7 px-3 ${periodoChaveJ === p.value ? 'bg-blue-600 text-white' : ''}`}
                  onClick={() => setPeriodoChaveJ(p.value)}>{p.label}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loadChaveJ ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Carregando...</div>
          ) : !labelsChaveJ.length ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Nenhum dado disponível para 2026.</div>
          ) : (
            <div>
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {top10.map((s, i) => (
                  <div key={s.name} className="rounded-lg border p-2 text-center" style={{ borderColor: CORES[i%CORES.length]+'44', background: CORES[i%CORES.length]+'0d' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: CORES[i%CORES.length] }}>{s.name}</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{fmtK(s.total)}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartDataChaveJ} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={72} />
                  <RechartTooltip content={<GrafTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {top10.map((s, i) => (
                    <Bar key={s.name} dataKey={s.name} stackId="a" fill={CORES[i%CORES.length]}
                      radius={i === top10.length-1 ? [4,4,0,0] : [0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico 2: Por Tipo */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-orange-600" />
              Por Tipo — Financ. Novo / Troco-Refin / Cancelados
            </CardTitle>
            <div className="flex gap-1">
              {PERIODOS.map(p => (
                <Button key={p.value} size="sm"
                  variant={periodoTipo === p.value ? 'default' : 'outline'}
                  className={`text-xs h-7 px-3 ${periodoTipo === p.value ? 'bg-orange-600 text-white' : ''}`}
                  onClick={() => setPeriodoTipo(p.value)}>{p.label}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loadTipo ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Carregando...</div>
          ) : !chartDataTipo.length ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Nenhum dado disponível.</div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Financ. Novo</p>
                  <p className="text-lg font-bold text-blue-800">{fmtK(totalNovo)}</p>
                  <p className="text-xs text-blue-500">{totalGeral>0?((totalNovo/totalGeral)*100).toFixed(1):0}%</p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">Troco/Refin</p>
                  <p className="text-lg font-bold text-orange-800">{fmtK(totalRefin)}</p>
                  <p className="text-xs text-orange-500">{totalGeral>0?((totalRefin/totalGeral)*100).toFixed(1):0}%</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Cancelados</p>
                  <p className="text-lg font-bold text-red-800">{fmtK(totalCancelado)}</p>
                  <p className="text-xs text-red-500">{totalGeral>0?((totalCancelado/totalGeral)*100).toFixed(1):0}%</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataTipo} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={72} />
                  <RechartTooltip content={<GrafTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="novo" name="Financ. Novo" stackId="a" fill="#2563eb" />
                  <Bar dataKey="refin" name="Troco/Refin" stackId="a" fill="#f97316" />
                  <Bar dataKey="cancelado" name="Cancelados" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evolução do Volume Total Contratado</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartDataTipo} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={72} />
                    <RechartTooltip formatter={(v: any) => [fmtFull(v), 'Total']} labelStyle={{ fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey={(d) => d.novo + d.refin} name="Total Contratado"
                      stroke="#16a34a" strokeWidth={2} dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FebrabanPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("__all__");
  const [mesano, setMesano] = useState<number | undefined>();
  const [situacao, setSituacao] = useState("__all__");
  const [operador, setOperador] = useState("__all__");
  const [filtroPago, setFiltroPago] = useState<"todos" | "sim" | "nao" | "srcc">("todos");
  const [page, setPage] = useState(0);
  const [exportandoNaoPagos, setExportandoNaoPagos] = useState(false);
  const [exportandoContratadas, setExportandoContratadas] = useState(false);
  const [exportandoPendentes, setExportandoPendentes] = useState(false);

  // Import state
  const [importModal, setImportModal] = useState(false);
  const [importModo, setImportModo] = useState<"novo" | "subscrever">("novo");
  const [importData, setImportData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importResult, setImportResult] = useState<{ adicionados: number; atualizados: number; ignorados: number; total: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editModal, setEditModal] = useState(false);
  const [editRow, setEditRow] = useState<FebRow | null>(null);

  const queryParams = {
    page,
    limit: LIMIT,
    search: search || undefined,
    empresa: empresa !== "__all__" ? empresa : undefined,
    mesano: mesano,
    situacao: situacao !== "__all__" ? situacao : undefined,
    operador: operador !== "__all__" ? operador : undefined,
    pago: filtroPago,
  };

  const { data: rows, refetch } = trpc.febraban.list.useQuery(queryParams);
  const { data: total } = trpc.febraban.count.useQuery({
    search: search || undefined,
    empresa: empresa !== "__all__" ? empresa : undefined,
    mesano: mesano,
    situacao: situacao !== "__all__" ? situacao : undefined,
    operador: operador !== "__all__" ? operador : undefined,
    pago: filtroPago,
  });
  const { data: filtros } = trpc.febraban.filtros.useQuery();
  const { data: resumo } = trpc.febraban.resumo.useQuery({ mesano: mesano });
  const utils = trpc.useUtils();

  const importarMutation = trpc.febraban.importar.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      utils.febraban.list.invalidate();
      utils.febraban.count.invalidate();
      utils.febraban.filtros.invalidate();
    },
    onError: (err) => alert(`Erro ao importar: ${err.message}`),
  });

  const updateMutation = trpc.febraban.update.useMutation({
    onSuccess: () => {
      setEditModal(false);
      setEditRow(null);
      utils.febraban.list.invalidate();
      utils.febraban.resumo.invalidate();
    },
    onError: (err) => alert(`Erro ao salvar: ${err.message}`),
  });

  const togglePagoMutation = trpc.febraban.update.useMutation({
    onSuccess: () => {
      utils.febraban.list.invalidate();
      utils.febraban.resumo.invalidate();
    },
    onError: (err) => alert(`Erro ao alterar status: ${err.message}`),
  });

  function handleTogglePago(row: FebRow) {
    // Ciclo: 0 (Não) -> 1 (Sim) -> 2 (SRCC) -> 0 (Não)
    // Se pago automático (via consignados) e pagoManual=0, o pago exibido é 1, mas manual é 0
    // O toggle usa o valor manual atual para decidir o próximo estado
    const manualAtual = row.pagoManual ?? 0;
    const proximo = manualAtual === 0 ? 1 : manualAtual === 1 ? 2 : 0;
    togglePagoMutation.mutate({ id: row.id, pago: proximo });
  }

  const deleteMutation = trpc.febraban.delete.useMutation({
    onSuccess: () => {
      utils.febraban.list.invalidate();
      utils.febraban.count.invalidate();
    },
    onError: (err) => alert(`Erro ao excluir: ${err.message}`),
  });

  const totalPages = total ? Math.ceil(total / LIMIT) : 0;

  // Função auxiliar para gerar Excel agrupado por empresa
  function gerarExcelPorEmpresa(dados: any[], nomeArquivo: string, colunaResumo: string) {
    const porEmpresa: Record<string, typeof dados> = {};
    for (const row of dados) {
      const emp = row.empresa || "(Sem empresa)";
      if (!porEmpresa[emp]) porEmpresa[emp] = [];
      porEmpresa[emp].push(row);
    }
    const empresasOrdenadas = Object.keys(porEmpresa).sort();
    const wb = XLSX.utils.book_new();
    for (const emp of empresasOrdenadas) {
      const registros = porEmpresa[emp];
      const wsData: any[][] = [
        ["EMPRESA", "MÊS/ANO", "PROPOSTA", "LINHA", "SITUAÇÃO", "OPERADOR", "SOLICITAÇÃO", "PRAZO", "TROCO", "FINANCIADO"],
        ...registros.map(r => [
          r.empresa || "",
          mesanoToStr(r.mesano),
          r.proposta,
          r.linha ?? "",
          r.situacao || "",
          r.operador || "",
          r.solicitacao || "",
          r.prazo || "",
          r.troco != null ? parseFloat(String(r.troco)) : "",
          r.financiado != null ? parseFloat(String(r.financiado)) : "",
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 8 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 14 }, { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, emp.replace(/[\\\/\*\?\[\]:]/g, "").substring(0, 31));
    }
    const resumoData: any[][] = [
      ["EMPRESA", colunaResumo],
      ...empresasOrdenadas.map(emp => [emp, porEmpresa[emp].length]),
      ["TOTAL", dados.length],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo["!cols"] = [{ wch: 25 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, "RESUMO");
    XLSX.writeFile(wb, nomeArquivo);
  }

  // Exportar Não Pagos (Contratadas + Pendentes, sem Canceladas)
  async function handleExportarNaoPagos() {
    setExportandoNaoPagos(true);
    try {
      const todos = await utils.client.febraban.naoPagos.query({
        empresa: empresa !== "__all__" ? empresa : undefined,
        mesano: mesano,
      });
      // Apenas Contratadas não pagas
      const dados = todos.filter(r => r.situacao === 'Contratada');

      if (!dados || dados.length === 0) {
        alert("Nenhum registro não pago (sem canceladas) encontrado com os filtros atuais.");
        return;
      }

      const mesanoStr = mesano ? mesanoToStr(mesano).replace("/", "-") : "todos";
      const empStr = empresa !== "__all__" ? empresa.substring(0, 20) : "todas-empresas";
      gerarExcelPorEmpresa(dados, `nao-pagos_${empStr}_${mesanoStr}.xlsx`, "QTD NÃO PAGOS");
    } catch (err: any) {
      alert(`Erro ao exportar: ${err?.message || err}`);
    } finally {
      setExportandoNaoPagos(false);
    }
  }

  // Exportar apenas Contratadas não pagas
  async function handleExportarContratatasNaoPagas() {
    setExportandoContratadas(true);
    try {
      const todos = await utils.client.febraban.naoPagos.query({
        empresa: empresa !== "__all__" ? empresa : undefined,
        mesano: mesano,
      });
      const dados = todos.filter(r => r.situacao === 'Contratada');
      if (!dados || dados.length === 0) {
        alert("Nenhuma operação Contratada não paga encontrada.");
        return;
      }
      const mesanoStr = mesano ? mesanoToStr(mesano).replace("/", "-") : "todos";
      const empStr = empresa !== "__all__" ? empresa.substring(0, 20) : "todas-empresas";
      gerarExcelPorEmpresa(dados, `contratadas-nao-pagas_${empStr}_${mesanoStr}.xlsx`, "QTD CONTRATADAS NÃO PAGAS");
    } catch (err: any) {
      alert(`Erro ao exportar: ${err?.message || err}`);
    } finally {
      setExportandoContratadas(false);
    }
  }

  // Exportar apenas Pendentes não pagas
  async function handleExportarPendentes() {
    setExportandoPendentes(true);
    try {
      const todos = await utils.client.febraban.naoPagos.query({
        empresa: empresa !== "__all__" ? empresa : undefined,
        mesano: mesano,
      });
      const dados = todos.filter(r => r.situacao === 'Pendente');
      if (!dados || dados.length === 0) {
        alert("Nenhuma operação Pendente não paga encontrada.");
        return;
      }
      const mesanoStr = mesano ? mesanoToStr(mesano).replace("/", "-") : "todos";
      const empStr = empresa !== "__all__" ? empresa.substring(0, 20) : "todas-empresas";
      gerarExcelPorEmpresa(dados, `pendentes-nao-pagas_${empStr}_${mesanoStr}.xlsx`, "QTD PENDENTES NÃO PAGAS");
    } catch (err: any) {
      alert(`Erro ao exportar: ${err?.message || err}`);
    } finally {
      setExportandoPendentes(false);
    }
  }

  // Parse Excel file — parser definitivo
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);
    setImportData([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        // cellDates:true faz XLSX.js converter datas para objetos Date do JS
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // header:1 retorna array de arrays; raw:true preserva tipos nativos
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
        if (!json || json.length < 2) { alert("Arquivo vazio ou sem dados."); return; }

        // Normaliza header removendo acentos
        const norm = (h: any) => String(h ?? "").trim().toUpperCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const rawHeaders = json[0] || [];
        const colMap: Record<string, number> = {};
        rawHeaders.forEach((h: any, i: number) => { colMap[norm(h)] = i; });

        const col = (row: any[], name: string) => {
          const idx = colMap[norm(name)];
          return idx !== undefined ? row[idx] : undefined;
        };

        // Número: aceita number nativo ou string com vírgula/ponto
        const toNum = (v: any): number | undefined => {
          if (v === null || v === undefined || v === "") return undefined;
          if (typeof v === "number") return isNaN(v) ? undefined : v;
          const s = String(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
          const n = parseFloat(s);
          return isNaN(n) ? undefined : n;
        };

        // Data: cellDates:true entrega Date do JS → formata DD/MM/AAAA
        // Também trata número serial do Excel (ex: 46146 = 04/05/2026)
        const toDate = (v: any): string | undefined => {
          if (!v) return undefined;
          if (v instanceof Date && !isNaN(v.getTime())) {
            const d = String(v.getDate()).padStart(2, "0");
            const m = String(v.getMonth() + 1).padStart(2, "0");
            const y = v.getFullYear();
            return `${d}/${m}/${y}`;
          }
          // Número serial do Excel: inteiro >= 40000 (datas a partir de ~2009)
          if (typeof v === "number" && Number.isInteger(v) && v >= 40000 && v <= 60000) {
            // Excel serial: dias desde 01/01/1900 (com bug do ano 1900)
            const excelEpoch = new Date(1899, 11, 30); // 30/12/1899
            const date = new Date(excelEpoch.getTime() + v * 86400000);
            const d = String(date.getDate()).padStart(2, "0");
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const y = date.getFullYear();
            return `${d}/${m}/${y}`;
          }
          // string já formatada DD/MM/AAAA
          const s = String(v).trim();
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
          return s || undefined;
        };

            // Detectar formato: novo (Operação/Produto/ChaveJ/Data/Liquido/Bruto) ou antigo (PROPOSTA/LINHA/OPERADOR/SOLICITACAO/TROCO/FINANCIADO)
        const isNovoFormato = colMap[norm("OPERACAO")] !== undefined || colMap[norm("OPERAÇÃO")] !== undefined;

        // Converte Mês/Ano (Date ou número) para MESANO numérico (ex: 04/2026 → 426)
        const toMesano = (v: any): number | undefined => {
          if (!v) return undefined;
          if (v instanceof Date && !isNaN(v.getTime())) {
            const mes = v.getMonth() + 1;
            const ano = v.getFullYear() % 100; // últimos 2 dígitos
            return mes * 100 + ano; // ex: 4*100+26 = 426
          }
          // string MM/AAAA
          const s = String(v).trim();
          const m = s.match(/^(\d{1,2})[/\-](\d{2,4})$/);
          if (m) {
            const mes = parseInt(m[1]);
            const ano = parseInt(m[2]) % 100;
            return mes * 100 + ano;
          }
          // número direto (ex: 426)
          const n = parseInt(s);
          return isNaN(n) ? undefined : n;
        };

        const registros: any[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.every((c: any) => c === null || c === undefined || c === "")) continue;

          let propostaRaw: any;
          let financiado: number | undefined;
          let troco: number | undefined;
          let mesano: number | undefined;
          let empresa: string | undefined;
          let linha: number | undefined;
          let situacao: string | undefined;
          let operador: string | undefined;
          let solicitacao: string | undefined;
          let prazo: string | undefined;

          if (isNovoFormato) {
            // Novo formato: Empresa, Mês/Ano, Operação, Produto, Situação, ChaveJ, Data, Prazo, Liquido, Bruto
            propostaRaw = col(row, "OPERACAO") ?? col(row, "OPERAÇÃO");
            empresa   = col(row, "EMPRESA") ? String(col(row, "EMPRESA")).trim() : undefined;
            mesano    = toMesano(col(row, "MES/ANO") ?? col(row, "MÊS/ANO") ?? col(row, "MES/ANO"));
            linha     = col(row, "PRODUTO") ? (parseInt(String(col(row, "PRODUTO"))) || undefined) : undefined;
            situacao  = (() => { const v = col(row, "SITUACAO") ?? col(row, "SITUAÇÃO"); return v != null && v !== "" ? String(v).trim() : undefined; })();
            operador  = col(row, "CHAVEJ") ? String(col(row, "CHAVEJ")).trim() : undefined;
            solicitacao = toDate(col(row, "DATA"));
            prazo     = col(row, "PRAZO") ? String(col(row, "PRAZO")).trim() : undefined;
            financiado = toNum(col(row, "BRUTO"));
            const liquidoRaw = toNum(col(row, "LIQUIDO"));
            // Liquido=0 significa FINANC NOVO → troco = financiado (mesmo valor)
            troco = (!liquidoRaw || liquidoRaw === 0) ? financiado : liquidoRaw;
          } else {
            // Formato antigo: EMPRESA, MESANO, PROPOSTA, LINHA, SITUACAO, OPERADOR, SOLICITACAO, PRAZO, TROCO, FINANCIADO
            propostaRaw = col(row, "PROPOSTA");
            empresa   = col(row, "EMPRESA") ? String(col(row, "EMPRESA")).trim() : undefined;
            const mesanoRaw = col(row, "MESANO");
            mesano    = mesanoRaw !== undefined && mesanoRaw !== "" ? (parseInt(String(mesanoRaw)) || undefined) : undefined;
            linha     = col(row, "LINHA") ? (parseInt(String(col(row, "LINHA"))) || undefined) : undefined;
            situacao  = (() => { const v = col(row, "SITUACAO"); return v != null && v !== "" ? String(v).trim() : undefined; })();
            operador  = col(row, "OPERADOR") ? String(col(row, "OPERADOR")).trim() : undefined;
            solicitacao = toDate(col(row, "SOLICITACAO") ?? col(row, "SOLICITAÇÃO"));
            prazo     = col(row, "PRAZO") ? String(col(row, "PRAZO")).trim() : undefined;
            financiado = toNum(col(row, "FINANCIADO"));
            const trocoRaw = toNum(col(row, "TROCO"));
            troco = (!trocoRaw || trocoRaw === 0) ? financiado : trocoRaw;
          }

          if (propostaRaw === undefined || propostaRaw === null || propostaRaw === "") continue;
          const proposta = String(typeof propostaRaw === "number" ? Math.round(propostaRaw) : propostaRaw).trim();

          registros.push({ empresa, mesano, proposta, linha, situacao, operador, solicitacao, prazo, troco, financiado, situacao2: undefined });
        }

        setImportData(registros);
      } catch (err: any) {
        alert(`Erro ao ler arquivo: ${err?.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (importData.length === 0) {
      alert("Nenhum registro válido encontrado no arquivo.");
      return;
    }
    const BATCH = 200;
    const total = importData.length;
    let adicionados = 0;
    let atualizados = 0;
    let ignorados = 0;
    setImporting(true);
    setImportProgress({ current: 0, total });
    setImportResult(null);
    try {
      for (let i = 0; i < total; i += BATCH) {
        const lote = importData.slice(i, i + BATCH);
        const res = await utils.client.febraban.importar.mutate({ modo: importModo, offsetInicial: i, registros: lote });
        adicionados += res.adicionados;
        atualizados += res.atualizados;
        ignorados += res.ignorados;
        setImportProgress({ current: Math.min(i + BATCH, total), total });
      }
      setImportResult({ adicionados, atualizados, ignorados, total });
      utils.febraban.list.invalidate();
      utils.febraban.count.invalidate();
      utils.febraban.filtros.invalidate();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("UNAUTHORIZED") || msg.includes("UNAUTHED")) {
        alert("Sessão expirada. Por favor, faça login novamente e tente importar de novo.");
      } else {
        alert(`Erro ao importar: ${msg}`);
      }
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  function openEdit(row: FebRow) {
    setEditRow({ ...row });
    setEditModal(true);
  }

  function handleEditSave() {
    if (!editRow) return;
    updateMutation.mutate({
      id: editRow.id,
      empresa: editRow.empresa || undefined,
      mesano: editRow.mesano || undefined,
      proposta: editRow.proposta,
      linha: editRow.linha || undefined,
      situacao: editRow.situacao || undefined,
      operador: editRow.operador || undefined,
      solicitacao: editRow.solicitacao || undefined,
      prazo: editRow.prazo || undefined,
      troco: editRow.troco ? parseFloat(editRow.troco) : null,
      financiado: editRow.financiado ? parseFloat(editRow.financiado) : null,
      situacao2: editRow.situacao2 || undefined,
      pago: editRow.pago ?? 0,
    });
  }

  function handleDelete(id: number, proposta: string) {
    if (confirm(`Excluir o registro da proposta ${proposta}?`)) {
      deleteMutation.mutate({ id });
    }
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader />
      {/* Painel de Resumo por Empresa */}
      {resumo && resumo.empresas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          {resumo.empresas.map((emp) => (
            <div key={emp.empresa} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              {/* Cabeçalho da empresa */}
              <div className={`px-4 py-2 flex items-center gap-2 ${emp.empresa === 'BMF' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                <span className="text-white font-bold text-base tracking-wide">{emp.empresa}</span>
                <span className="text-white/70 text-xs ml-auto">{mesanoToStr(resumo.mesanoAtual ?? undefined)}</span>
              </div>
              {/* Cards de métricas */}
              <div className="grid grid-cols-6 divide-x">
                {/* Dia anterior */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-tight">Dia Anterior</div>
                  <div className="text-[10px] text-gray-400 mb-0.5">{emp.ontemStr}</div>
                  <div className="text-sm font-bold text-gray-800">
                    {emp.diaAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{emp.qtdDiaAnterior} op.</div>
                </div>
                {/* Dia atual */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-tight">Dia Atual</div>
                  <div className="text-[10px] text-gray-400 mb-0.5">{emp.hojeStr}</div>
                  <div className="text-sm font-bold text-blue-700">
                    {emp.diaAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{emp.qtdDiaAtual} op.</div>
                </div>
                {/* Líquido Contratado */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-tight">Contratado</div>
                  <div className="text-[10px] text-gray-400 mb-0.5">no mês</div>
                  <div className="text-sm font-bold text-green-700">
                    {emp.contratado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{emp.qtdContratado} op.</div>
                </div>
                {/* Líquido Pendente */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-tight">Pendente</div>
                  <div className="text-[10px] text-gray-400 mb-0.5">no mês</div>
                  <div className="text-sm font-bold text-orange-600">
                    {emp.pendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{emp.qtdPendente} op.</div>
                </div>
                {/* Líquido do Ano */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-tight">Ano {emp.anoFull}</div>
                  <div className="text-[10px] text-gray-400 mb-0.5">contratado</div>
                  <div className="text-sm font-bold text-purple-700">
                    {emp.ano.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{emp.qtdAno} op.</div>
                </div>
                {/* SRCC */}
                <div className="px-3 py-2 text-center bg-orange-50">
                  <div className="text-[10px] text-orange-600 font-medium uppercase tracking-wide leading-tight">SRCC</div>
                  <div className="text-[10px] text-orange-400 mb-0.5">no ano</div>
                  <div className="text-sm font-bold text-orange-700">
                    {((emp as any).srcc ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-orange-400 mt-0.5">{(emp as any).qtdSrcc ?? 0} op.</div>
                </div>
                {/* Canceladas no ano */}
                <div className="px-3 py-2 text-center bg-red-50">
                  <div className="text-[10px] text-red-600 font-medium uppercase tracking-wide leading-tight">Canceladas</div>
                  <div className="text-[10px] text-red-400 mb-0.5">no ano</div>
                  <div className="text-sm font-bold text-red-700">
                    {((emp as any).canceladas ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-red-400 mt-0.5">{(emp as any).qtdCanceladas ?? 0} op.</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Febraban — Produção BB</h1>
          <p className="text-gray-600 mt-1">
            {total != null ? `Total: ${total.toLocaleString("pt-BR")} registros` : "Carregando..."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          
          <Button
            className="gap-2 bg-purple-600 text-white hover:bg-purple-700"
            onClick={() => navigate("/febraban/acompanhamento-diario")}
          >
            <BarChart2 className="w-4 h-4" />
            Acomp. Diário
          </Button>

          <Button
            variant="outline"
            className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
            onClick={handleExportarNaoPagos}
            disabled={exportandoNaoPagos}
          >
            <Download className="w-4 h-4" />
            {exportandoNaoPagos ? "Exportando..." : "Exportar Não Pagos"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-orange-500 text-orange-700 hover:bg-orange-50"
            onClick={handleExportarContratatasNaoPagas}
            disabled={exportandoContratadas}
          >
            <Download className="w-4 h-4" />
            {exportandoContratadas ? "Exportando..." : "Exportar Contratadas"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
            onClick={handleExportarPendentes}
            disabled={exportandoPendentes}
          >
            <Download className="w-4 h-4" />
            {exportandoPendentes ? "Exportando..." : "Exportar Pendentes"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-blue-400 text-blue-700 hover:bg-blue-50"
            onClick={() => { setImportModal(true); setImportResult(null); setImportData([]); setImportFileName(""); }}
          >
            <Upload className="w-4 h-4" />
            Importar Excel
          </Button>

        </div>
      </div>

      {/* Abas: Produção / Gráficos */}
      <Tabs defaultValue="producao" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="producao" className="gap-2"><Search className="w-3.5 h-3.5" />Produção</TabsTrigger>
          <TabsTrigger value="graficos" className="gap-2"><BarChart2 className="w-3.5 h-3.5" />Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="producao">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Proposta ou Operador..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>

            <Select value={empresa} onValueChange={(v) => { setEmpresa(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas empresas</SelectItem>
                {filtros?.empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={mesano ? String(mesano) : "__all__"}
              onValueChange={(v) => { setMesano(v === "__all__" ? undefined : parseInt(v)); setPage(0); }}
            >
              <SelectTrigger><SelectValue placeholder="Mês/Ano" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos meses</SelectItem>
                {filtros?.mesanos.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={situacao} onValueChange={(v) => { setSituacao(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Situação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas situações</SelectItem>
                {filtros?.situacoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={operador} onValueChange={(v) => { setOperador(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Operador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos operadores</SelectItem>
                {filtros?.operadores.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Filtro Pago */}
            <div className="flex items-center gap-1 border rounded-md overflow-hidden h-10">
              {(["todos", "sim", "nao", "srcc"] as const).map((opt) => {
                const labels: Record<string, string> = { todos: "Todos", sim: "Pagos", nao: "Não Pagos", srcc: "SRCC" };
                const active = filtroPago === opt;
                const colors: Record<string, string> = {
                  todos: active ? "bg-gray-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
                  sim: active ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-green-50",
                  nao: active ? "bg-red-600 text-white" : "bg-white text-gray-600 hover:bg-red-50",
                  srcc: active ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-orange-50",
                };
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`flex-1 h-full text-xs font-medium px-2 transition-colors ${colors[opt]}`}
                    onClick={() => { setFiltroPago(opt); setPage(0); }}
                  >
                    {labels[opt]}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {/* Paginador no TOPO */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
              <span className="text-xs text-gray-500">
                Página {page + 1} de {totalPages} ({total?.toLocaleString("pt-BR")} registros)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(0)}>«</Button>
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">EMPRESA</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">MÊS/ANO</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">PROPOSTA</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">LINHA</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">SITUAÇÃO</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">OPERADOR</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">SOLICITAÇÃO</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">PRAZO</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">TROCO</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">FINANCIADO</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">TIPO</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">PAGO</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {!rows ? (
                  <tr><td colSpan={13} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className={`border-b transition-colors ${rows.indexOf(row) % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-blue-50/30 hover:bg-blue-100/40"}`}>
                      <td className="px-3 py-2 font-medium">{row.empresa || "-"}</td>
                      <td className="px-3 py-2">{mesanoToStr(row.mesano)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.proposta}</td>
                      <td className="px-3 py-2">{row.linha || "-"}</td>
                      <td className="px-3 py-2">{situacaoBadge(row.situacao)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.operador || "-"}</td>
                      <td className="px-3 py-2">{row.solicitacao || "-"}</td>
                      <td className="px-3 py-2">{row.prazo || "-"}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.troco)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.financiado)}</td>
                      <td className="px-3 py-2 text-center">{tipoBadge(row.situacao, row.troco, row.financiado)}</td>
                      <td className="px-3 py-2 text-center">
                        {row.situacao && row.situacao.toLowerCase().includes("cancel") ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">Cancelado</span>
                        ) : row.pago === 2 ? (
                          <button
                            onClick={() => handleTogglePago(row as FebRow)}
                            title="Clique para alterar: SRCC → Não"
                            className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-400 cursor-pointer hover:bg-orange-200 transition-colors"
                          >SRCC</button>
                        ) : row.pago === 1 ? (
                          <button
                            onClick={() => handleTogglePago(row as FebRow)}
                            title="Clique para alterar: Sim → SRCC"
                            className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300 cursor-pointer hover:bg-green-200 transition-colors"
                          >Sim</button>
                        ) : (
                          <button
                            onClick={() => handleTogglePago(row as FebRow)}
                            title="Clique para alterar: Não → Sim"
                            className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300 cursor-pointer hover:bg-red-200 transition-colors"
                          >Não</button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => openEdit(row as FebRow)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(row.id, row.proposta)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t">
              <span className="text-sm text-gray-500">
                Página {page + 1} de {totalPages} ({total?.toLocaleString("pt-BR")} registros)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(0)}>«</Button>
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        {/* ABA GRÁFICOS */}
        <TabsContent value="graficos">
          <GraficosProducaoInline empresa={empresa} filtros={filtros} />
        </TabsContent>

      </Tabs>

      {/* Painel de Importação — sem Dialog shadcn para evitar bloqueio do file picker */}
      {importModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setImportModal(false); } }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 480, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Importar Relatório BB (Excel)</h2>
              <button onClick={() => setImportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#666" }}>✕</button>
            </div>

            {/* Modo */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Modo de importação</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setImportModo("novo")}
                  style={{ padding: "10px 12px", borderRadius: 8, border: importModo === "novo" ? "2px solid #3b82f6" : "2px solid #e5e7eb", background: importModo === "novo" ? "#eff6ff" : "#fff", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Novo</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Adiciona apenas propostas novas. Ignora as que já existem.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportModo("subscrever")}
                  style={{ padding: "10px 12px", borderRadius: 8, border: importModo === "subscrever" ? "2px solid #f97316" : "2px solid #e5e7eb", background: importModo === "subscrever" ? "#fff7ed" : "#fff", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Subscrever</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Adiciona novos E atualiza os existentes pelo número da proposta.</div>
                </button>
              </div>
            </div>

            {/* Link para download do template */}
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0369a1" }}>Formato aceito</div>
                <div style={{ fontSize: 11, color: "#0284c7", marginTop: 2 }}>Colunas: Empresa, Mês/Ano, Operação, Produto, Situação, ChaveJ, Data, Prazo, Liquido, Bruto</div>
              </div>
              <a
                href="/manus-storage/template_febraban_bb_a26405ba.xlsx"
                download="template_febraban_bb.xlsx"
                style={{ fontSize: 12, fontWeight: 600, color: "#0369a1", textDecoration: "none", background: "#e0f2fe", padding: "6px 12px", borderRadius: 6, whiteSpace: "nowrap", border: "1px solid #7dd3fc" }}
              >
                ⬇ Baixar Template
              </a>
            </div>
            {/* File input nativo — sem nenhum wrapper que bloqueie */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Arquivo Excel (.xlsx)</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: "block", width: "100%", padding: "10px", border: "2px dashed #d1d5db", borderRadius: 8, cursor: "pointer", fontSize: 13, background: "#f9fafb" }}
              />
              {importFileName && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0fdf4", borderRadius: 6, fontSize: 13, color: "#15803d" }}>
                  <strong>{importFileName}</strong> — {importData.length} registros encontrados
                </div>
              )}
            </div>

            {/* Progresso */}
            {importProgress && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  <span>Importando em lotes...</span>
                  <span>{importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)</span>
                </div>
                <div style={{ background: "#e5e7eb", borderRadius: 4, height: 8 }}>
                  <div style={{ background: "#3b82f6", borderRadius: 4, height: 8, width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`, transition: "width 0.3s" }} />
                </div>
              </div>
            )}

            {/* Resultado */}
            {importResult && (
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13 }}>
                <p style={{ fontWeight: 700, color: "#15803d", marginBottom: 4 }}>Importação concluída!</p>
                <p style={{ color: "#166534" }}>Adicionados: <strong>{importResult.adicionados}</strong></p>
                <p style={{ color: "#166534" }}>Atualizados: <strong>{importResult.atualizados}</strong></p>
                <p style={{ color: "#166534" }}>Ignorados: <strong>{importResult.ignorados}</strong></p>
                <p style={{ color: "#166534" }}>Total: <strong>{importResult.total}</strong></p>
              </div>
            )}

            {/* Botões */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setImportModal(false)}
                style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importData.length === 0 || importing}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: importData.length === 0 || importing ? "#93c5fd" : "#2563eb", color: "#fff", cursor: importData.length === 0 || importing ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
              >
                {importing
                  ? `Importando... ${importProgress ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%`
                  : `Importar ${importData.length} registros`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edição */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Registro — Proposta {editRow?.proposta}</DialogTitle>
          </DialogHeader>

          {editRow && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Empresa</Label>
                <Input value={editRow.empresa || ""} onChange={e => setEditRow(r => r ? { ...r, empresa: e.target.value } : r)} />
              </div>
              <div>
                <Label className="text-xs">Mês/Ano (ex: 126)</Label>
                <Input
                  type="number"
                  value={editRow.mesano || ""}
                  onChange={e => setEditRow(r => r ? { ...r, mesano: parseInt(e.target.value) || null } : r)}
                />
              </div>
              <div>
                <Label className="text-xs">Proposta</Label>
                <Input value={editRow.proposta} onChange={e => setEditRow(r => r ? { ...r, proposta: e.target.value } : r)} />
              </div>
              <div>
                <Label className="text-xs">Linha</Label>
                <Input
                  type="number"
                  value={editRow.linha || ""}
                  onChange={e => setEditRow(r => r ? { ...r, linha: parseInt(e.target.value) || null } : r)}
                />
              </div>
              <div>
                <Label className="text-xs">Situação</Label>
                <Select value={editRow.situacao || ""} onValueChange={v => setEditRow(r => r ? { ...r, situacao: v } : r)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contratada">Contratada</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Operador</Label>
                <Input value={editRow.operador || ""} onChange={e => setEditRow(r => r ? { ...r, operador: e.target.value } : r)} />
              </div>
              <div>
                <Label className="text-xs">Solicitação</Label>
                <Input value={editRow.solicitacao || ""} onChange={e => setEditRow(r => r ? { ...r, solicitacao: e.target.value } : r)} />
              </div>
              <div>
                <Label className="text-xs">Prazo</Label>
                <Input value={editRow.prazo || ""} onChange={e => setEditRow(r => r ? { ...r, prazo: e.target.value } : r)} />
              </div>
              <div>
                <Label className="text-xs">Troco (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editRow.troco || ""}
                  onChange={e => setEditRow(r => r ? { ...r, troco: e.target.value } : r)}
                />
              </div>
              <div>
                <Label className="text-xs">Financiado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editRow.financiado || ""}
                  onChange={e => setEditRow(r => r ? { ...r, financiado: e.target.value } : r)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Situação 2</Label>
                <Input value={editRow.situacao2 || ""} onChange={e => setEditRow(r => r ? { ...r, situacao2: e.target.value } : r)} />
              </div>
              <div className="col-span-2 flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="edit-pago-check"
                  checked={!!editRow.pago}
                  onChange={e => setEditRow(r => r ? { ...r, pago: e.target.checked ? 1 : 0 } : r)}
                  className="w-4 h-4 accent-green-500"
                />
                <Label htmlFor="edit-pago-check" className="text-sm cursor-pointer">Pago</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
