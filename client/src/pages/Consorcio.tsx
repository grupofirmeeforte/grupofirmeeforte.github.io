import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Edit2, Trash2, Search, Settings, RefreshCw, Calculator } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// ─── Formatadores ────────────────────────────────────────────────
function fmtMoeda(v: string | number | null | undefined): string {
  if (v == null || v === "") return "-";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "-";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: string | number | null | undefined): string {
  if (v == null || v === "") return "-";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "-";
  // Converte 0.0076 → "0,76%"
  return (n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s+/g, "");
}

function toDate(v: any): string {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${String(v.getDate()).padStart(2,"0")}/${String(v.getMonth()+1).padStart(2,"0")}/${v.getFullYear()}`;
  }
  if (typeof v === "number" && Number.isInteger(v) && v >= 40000 && v <= 60000) {
    const d = new Date(new Date(1899,11,30).getTime() + v * 86400000);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  return s;
}

function toMesAno(v: any): string {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${String(v.getMonth()+1).padStart(2,"0")}/${v.getFullYear()}`;
  }
  const s = String(v).trim();
  if (/^\d{2}\/\d{4}$/.test(s)) return s;
  const n = parseInt(s, 10);
  if (!isNaN(n) && n > 0) {
    const str = String(n);
    return str.slice(0, str.length-2).padStart(2,"0") + "/20" + str.slice(-2);
  }
  return s;
}

function toNum(v: any): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",","."));
  return isNaN(n) ? 0 : n;
}

// ─── Componente principal ─────────────────────────────────────────
export default function Consorcio() {
  const [, navigate] = useLocation();

  // Filtros
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("__all__");
  const [mesAno, setMesAno] = useState("__all__");
  const [segmento, setSegmento] = useState("__all__");
  const [page, setPage] = useState(0);
  const LIMIT = 100;

  // Importação
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importModo, setImportModo] = useState<"inserir"|"subscrever">("subscrever");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Edição
  const [editModal, setEditModal] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);

  // Exclusão
  const [deleteId, setDeleteId] = useState<number|null>(null);

  // Configuração de comissões
  const [configAberta, setConfigAberta] = useState(false);
  // Padrão DEMAIS
  const [cfgPadraoDemais1, setCfgPadraoDemais1] = useState("");
  const [cfgPadraoDemaisParc1, setCfgPadraoDemaisParc1] = useState("");
  const [cfgPadraoDemais2, setCfgPadraoDemais2] = useState("");
  const [cfgPadraoDemaisParc2, setCfgPadraoDemaisParc2] = useState("");
  // Padrão IMÓVEL
  const [cfgPadraoImovel1, setCfgPadraoImovel1] = useState("");
  const [cfgPadraoImovelParc1, setCfgPadraoImovelParc1] = useState("");
  const [cfgPadraoImovel2, setCfgPadraoImovel2] = useState("");
  const [cfgPadraoImovelParc2, setCfgPadraoImovelParc2] = useState("");
  // Especial DEMAIS
  const [cfgEspecialDemais1, setCfgEspecialDemais1] = useState("");
  const [cfgEspecialDemaisParc1, setCfgEspecialDemaisParc1] = useState("");
  const [cfgEspecialDemais2, setCfgEspecialDemais2] = useState("");
  const [cfgEspecialDemaisParc2, setCfgEspecialDemaisParc2] = useState("");
  // Especial IMÓVEL
  const [cfgEspecialImovel1, setCfgEspecialImovel1] = useState("");
  const [cfgEspecialImovelParc1, setCfgEspecialImovelParc1] = useState("");
  const [cfgEspecialImovel2, setCfgEspecialImovel2] = useState("");
  const [cfgEspecialImovelParc2, setCfgEspecialImovelParc2] = useState("");
  const [cfgAgentesEspeciais, setCfgAgentesEspeciais] = useState("");

  const utils = trpc.useUtils();

  const { data: configData } = trpc.consorcio.getConfig.useQuery();

  // Preencher campos ao carregar config
  useEffect(() => {
    if (!configData) return;
    if (configData.pctPadraoDemais1) setCfgPadraoDemais1(configData.pctPadraoDemais1);
    if (configData.qtdPadraoDemaisParc1) setCfgPadraoDemaisParc1(configData.qtdPadraoDemaisParc1);
    if (configData.pctPadraoDemais2) setCfgPadraoDemais2(configData.pctPadraoDemais2);
    if (configData.qtdPadraoDemaisParc2) setCfgPadraoDemaisParc2(configData.qtdPadraoDemaisParc2);
    if (configData.pctPadraoImovel1) setCfgPadraoImovel1(configData.pctPadraoImovel1);
    if (configData.qtdPadraoImovelParc1) setCfgPadraoImovelParc1(configData.qtdPadraoImovelParc1);
    if (configData.pctPadraoImovel2) setCfgPadraoImovel2(configData.pctPadraoImovel2);
    if (configData.qtdPadraoImovelParc2) setCfgPadraoImovelParc2(configData.qtdPadraoImovelParc2);
    if (configData.pctEspecialDemais1) setCfgEspecialDemais1(configData.pctEspecialDemais1);
    if (configData.qtdEspecialDemaisParc1) setCfgEspecialDemaisParc1(configData.qtdEspecialDemaisParc1);
    if (configData.pctEspecialDemais2) setCfgEspecialDemais2(configData.pctEspecialDemais2);
    if (configData.qtdEspecialDemaisParc2) setCfgEspecialDemaisParc2(configData.qtdEspecialDemaisParc2);
    if (configData.pctEspecialImovel1) setCfgEspecialImovel1(configData.pctEspecialImovel1);
    if (configData.qtdEspecialImovelParc1) setCfgEspecialImovelParc1(configData.qtdEspecialImovelParc1);
    if (configData.pctEspecialImovel2) setCfgEspecialImovel2(configData.pctEspecialImovel2);
    if (configData.qtdEspecialImovelParc2) setCfgEspecialImovelParc2(configData.qtdEspecialImovelParc2);
    if (configData.agentesEspeciais) setCfgAgentesEspeciais(configData.agentesEspeciais);
  }, [configData]);
  const saveConfigMutation = trpc.consorcio.saveConfig.useMutation({
    onSuccess: () => { toast.success("Configurações salvas!"); utils.consorcio.getConfig.invalidate(); }
  });

  const { data: filtros } = trpc.consorcio.filtros.useQuery();
  const { data, isLoading } = trpc.consorcio.list.useQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    empresa: empresa !== "__all__" ? empresa : undefined,
    mesAno: mesAno !== "__all__" ? mesAno : undefined,
    segmento: segmento !== "__all__" ? segmento : undefined,
  });

  const importarMutation = trpc.consorcio.importar.useMutation({
    onSuccess: () => { utils.consorcio.list.invalidate(); utils.consorcio.filtros.invalidate(); },
  });
  const calcularMutation = trpc.consorcio.calcular.useMutation({
    onSuccess: (res) => {
      utils.consorcio.list.invalidate();
      toast.success(`Cálculo concluído! ${res.calculados} com comissão, ${res.zerados} zerados.`);
    },
    onError: () => toast.error("Erro ao calcular comissões"),
  });
  const recalcularMutation = trpc.consorcio.recalcularAgentes.useMutation({
    onSuccess: (res) => {
      utils.consorcio.list.invalidate();
      toast.success(`Agentes recalculados! ${res.total} registros atualizados.`);
    },
    onError: () => toast.error("Erro ao recalcular agentes"),
  });
  const atualizarMutation = trpc.consorcio.atualizar.useMutation({
    onSuccess: () => { utils.consorcio.list.invalidate(); setEditModal(false); },
  });
  const excluirMutation = trpc.consorcio.excluir.useMutation({
    onSuccess: () => { utils.consorcio.list.invalidate(); setDeleteId(null); },
  });

  // ── Parser Excel ──────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      // Encontrar linha de cabeçalho (contém "Empresa" ou "EMPRESA")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(raw.length, 10); i++) {
        if (raw[i]?.some((c: any) => c && norm(String(c)).includes("EMPRESA"))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) { toast.error("Cabeçalho não encontrado"); return; }

      const headers = raw[headerIdx].map((h: any) => norm(String(h ?? "")));
      const colIdx = (name: string) => headers.indexOf(norm(name));

      const iEmpresa    = colIdx("EMPRESA");
      const iMesAno     = colIdx("MESANO") !== -1 ? colIdx("MESANO") : colIdx("MESANO");
      const iProposta   = colIdx("PROPOSTA");
      const iData       = colIdx("DATA");
      const iSegmento   = colIdx("SEGMENTO");
      const iValorBem   = colIdx("VALORBEM");
      const iParcLib    = colIdx("PARCLIBERADA");
      const iPct1       = colIdx("COMISSAO1") !== -1 ? colIdx("COMISSAO1") : headers.findIndex((_:any,i:number) => headers[i].includes("COMISSAO") && i < 8);
      const iRbm        = colIdx("RBM");
      const iPct2       = headers.findIndex((_:any,i:number) => headers[i].includes("COMISSAO") && i > iPct1);
      const iComissao   = headers.findIndex((_:any,i:number) => headers[i] === "COMISSAO" && i > iPct2);
      const iChaveJ     = colIdx("CHAVEJ");
      const iAgente     = colIdx("AGENTE");

      // Fallback: buscar por posição se nome não encontrado
      const getCol = (idx: number, fallback: number) => idx !== -1 ? idx : fallback;

      const rows: any[] = [];
      for (let r = headerIdx + 1; r < raw.length; r++) {
        const row = raw[r];
        if (!row || !row.some((c: any) => c != null && c !== "")) continue;

        const empresaVal = String(row[getCol(iEmpresa,0)] ?? "").trim().toUpperCase();
        const propostaVal = String(row[getCol(iProposta,2)] ?? "").trim();
        if (!empresaVal || !propostaVal || propostaVal === "0") continue;

        rows.push({
          empresa: empresaVal,
          mesAno: toMesAno(row[getCol(iMesAno,1)]),
          proposta: propostaVal,
          data: toDate(row[getCol(iData,3)]),
          segmento: String(row[getCol(iSegmento,4)] ?? "").trim().toUpperCase() || undefined,
          valorBem: toNum(row[getCol(iValorBem,5)]) || undefined,
          parcLiberada: String(row[getCol(iParcLib,6)] ?? "").trim().toUpperCase() || undefined,
          pctComissao1: toNum(row[getCol(iPct1,7)]) || undefined,
          rbm: toNum(row[getCol(iRbm,8)]) || undefined,
          pctComissao2: toNum(row[getCol(iPct2,9)]) || undefined,
          comissao: toNum(row[getCol(iComissao,10)]) || undefined,
          chaveJ: String(row[getCol(iChaveJ,11)] ?? "").trim().toUpperCase() || undefined,
          nomeAgente: String(row[getCol(iAgente,12)] ?? "").trim() || undefined,
        });
      }
      setImportRows(rows);
      toast.success(`${rows.length} registros lidos do arquivo`);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    const BATCH = 200;
    let total = 0, inseridos = 0, atualizados = 0, erros = 0;

    for (let i = 0; i < importRows.length; i += BATCH) {
      const chunk = importRows.slice(i, i + BATCH);
      try {
        const res = await importarMutation.mutateAsync({ rows: chunk, modo: importModo });
        inseridos += res.inseridos;
        atualizados += res.atualizados;
        erros += res.erros;
        total += chunk.length;
      } catch {
        erros += chunk.length;
      }
      setImportProgress(Math.round(((i + BATCH) / importRows.length) * 100));
    }

    setImporting(false);
    setImportModal(false);
    setImportRows([]);
    setImportFileName("");
    toast.success(`Importação concluída: ${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros`);
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/producao")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Produção — Consórcio</h1>
          <p className="text-xs text-gray-500">{total.toLocaleString("pt-BR")} registros</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setConfigAberta(true)} className="gap-1">
            <Settings className="w-4 h-4" /> Comissões
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => calcularMutation.mutate({ mesAno: mesAno !== '__all__' ? mesAno : undefined })}
            disabled={calcularMutation.isPending}
            className="gap-1 border-green-500 text-green-700 hover:bg-green-50"
            title={mesAno !== '__all__' ? `Calcular comissões de ${mesAno}` : 'Calcular comissões de todos os meses'}
          >
            <Calculator className={`w-4 h-4 ${calcularMutation.isPending ? 'animate-pulse' : ''}`} />
            {calcularMutation.isPending ? 'Calculando...' : 'Calcular'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => recalcularMutation.mutate()} disabled={recalcularMutation.isPending} className="gap-1" title="Recalcular agentes: PARC1 busca no cadastro, PARC2+ copia da PARC1">
            <RefreshCw className={`w-4 h-4 ${recalcularMutation.isPending ? 'animate-spin' : ''}`} /> Recalcular Agentes
          </Button>
          <Button size="sm" onClick={() => setImportModal(true)} className="gap-1">
            <Upload className="w-4 h-4" /> Importar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b px-4 py-2 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-8 h-9 w-52 text-sm"
            placeholder="Proposta / ChaveJ / Agente"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        <Select value={empresa} onValueChange={v => { setEmpresa(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas empresas</SelectItem>
            {filtros?.empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={mesAno} onValueChange={v => { setMesAno(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Mês/Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos meses</SelectItem>
            {filtros?.mesanos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={segmento} onValueChange={v => { setSegmento(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos segmentos</SelectItem>
            {filtros?.segmentos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {(empresa !== "__all__" || mesAno !== "__all__" || segmento !== "__all__" || search) && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setEmpresa("__all__"); setMesAno("__all__"); setSegmento("__all__"); setSearch(""); setPage(0); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              {["Empresa","Mês/Ano","Proposta","Data","Segmento","Valor Bem","Parc. Lib.","% Com. 1","RBM","% Com. 2","Comissão","ChaveJ","Agente","Ações"].map(h => (
                <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-slate-700 last:border-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={14} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={14} className="text-center py-8 text-gray-400">Nenhum registro encontrado</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1.5 border-r border-gray-200 font-medium">{row.empresa ?? "-"}</td>
                <td className="px-2 py-1.5 border-r border-gray-200">{row.mesAno ?? "-"}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 font-mono">{row.proposta ?? "-"}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 whitespace-nowrap">{row.data ?? "-"}</td>
                <td className="px-2 py-1.5 border-r border-gray-200">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.segmento === "IMOVEL" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {row.segmento ?? "-"}
                  </span>
                </td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-right">{fmtMoeda(row.valorBem)}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-center">{row.parcLiberada ?? "-"}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-right">{fmtPct(row.pctComissao1)}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-right font-medium text-blue-700">{fmtMoeda(row.rbm)}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-right">{fmtPct(row.pctComissao2)}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-right font-medium text-green-700">{fmtMoeda(row.comissao)}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 font-mono text-xs">{row.chaveJ ?? "-"}</td>
                <td className="px-2 py-1.5 border-r border-gray-200 max-w-[160px] truncate">{row.nomeAgente ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditRow({ ...row }); setEditModal(true); }}
                      className="p-1 rounded hover:bg-blue-100 text-blue-600"
                      title="Editar"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeleteId(row.id)}
                      className="p-1 rounded hover:bg-red-100 text-red-500"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t text-sm">
          <span className="text-gray-500">
            Página {page + 1} de {totalPages} — {total.toLocaleString("pt-BR")} registros
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {/* Modal Importação */}
      <Dialog open={importModal} onOpenChange={setImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Consórcio — Excel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-200 text-xs text-blue-700">
              <strong>Colunas esperadas:</strong> Empresa, Mês/Ano, Proposta, Data, Segmento, Valor Bem, Parc Liberada, % Comissão, RBM, % Comissão2, Comissão, ChaveJ, Agente
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setImportModo("inserir")}
                className={`p-3 rounded border-2 text-left transition ${importModo === "inserir" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="font-semibold text-sm">Apenas Inserir</div>
                <div className="text-xs text-gray-500 mt-1">Adiciona somente registros novos. Ignora propostas já existentes.</div>
              </button>
              <button
                onClick={() => setImportModo("subscrever")}
                className={`p-3 rounded border-2 text-left transition ${importModo === "subscrever" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="font-semibold text-sm">Subscrever</div>
                <div className="text-xs text-gray-500 mt-1">Adiciona novos e atualiza os existentes pelo número da proposta.</div>
              </button>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Arquivo Excel (.xlsx)</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: "block", width: "100%", padding: "10px", border: "2px dashed #d1d5db", borderRadius: 8, cursor: "pointer", fontSize: 13, background: "#f9fafb" }}
              />
              {importFileName && (
                <p className="text-xs text-gray-500 mt-1">📄 {importFileName} — {importRows.length} registros lidos</p>
              )}
            </div>

            {importing && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Importando...</span><span>{importProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModal(false)} disabled={importing}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importRows.length === 0 || importing}>
              {importing ? "Importando..." : `Importar ${importRows.length} registros`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edição */}
      {editRow && (
        <Dialog open={editModal} onOpenChange={setEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Registro — Proposta {editRow.proposta}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Empresa", key: "empresa" },
                { label: "Mês/Ano", key: "mesAno" },
                { label: "Proposta", key: "proposta" },
                { label: "Data (DD/MM/AAAA)", key: "data" },
                { label: "Segmento", key: "segmento" },
                { label: "Parc. Liberada", key: "parcLiberada" },
                { label: "ChaveJ", key: "chaveJ" },
                { label: "Agente", key: "nomeAgente" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={editRow[key] ?? ""}
                    onChange={e => setEditRow((r: any) => ({ ...r, [key]: e.target.value }))}
                  />
                </div>
              ))}
              {[
                { label: "Valor Bem", key: "valorBem" },
                { label: "% Comissão 1", key: "pctComissao1" },
                { label: "RBM", key: "rbm" },
                { label: "% Comissão 2", key: "pctComissao2" },
                { label: "Comissão", key: "comissao" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={editRow[key] ?? ""}
                    onChange={e => setEditRow((r: any) => ({ ...r, [key]: parseFloat(e.target.value) || null }))}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModal(false)}>Cancelar</Button>
              <Button
                onClick={() => atualizarMutation.mutate({
                  id: editRow.id,
                  empresa: editRow.empresa,
                  mesAno: editRow.mesAno,
                  proposta: editRow.proposta,
                  data: editRow.data,
                  segmento: editRow.segmento,
                  valorBem: editRow.valorBem ? parseFloat(editRow.valorBem) : null,
                  parcLiberada: editRow.parcLiberada,
                  pctComissao1: editRow.pctComissao1 ? parseFloat(editRow.pctComissao1) : null,
                  rbm: editRow.rbm ? parseFloat(editRow.rbm) : null,
                  pctComissao2: editRow.pctComissao2 ? parseFloat(editRow.pctComissao2) : null,
                  comissao: editRow.comissao ? parseFloat(editRow.comissao) : null,
                  chaveJ: editRow.chaveJ,
                  nomeAgente: editRow.nomeAgente,
                })}
                disabled={atualizarMutation.isPending}
              >
                {atualizarMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Configuração de Comissões */}
      <Dialog open={configAberta} onOpenChange={setConfigAberta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configuração de Comissões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Comissão Padrão DEMAIS */}
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <h3 className="font-semibold text-sm text-green-800 mb-3">Comissão Padrão — DEMAIS</h3>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">% Demais</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 0,65" value={cfgPadraoDemais1} onChange={e => setCfgPadraoDemais1(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Demais</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300" value={cfgPadraoDemaisParc1} onChange={e => setCfgPadraoDemaisParc1(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">% Imóvel</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 0,50" value={cfgPadraoDemais2} onChange={e => setCfgPadraoDemais2(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Imóvel</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300" value={cfgPadraoDemaisParc2} onChange={e => setCfgPadraoDemaisParc2(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Comissão Padrão IMÓVEL */}
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <h3 className="font-semibold text-sm text-green-800 mb-3">Comissão Padrão — IMÓVEL</h3>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">% Demais</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 0,65" value={cfgPadraoImovel1} onChange={e => setCfgPadraoImovel1(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Demais</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300" value={cfgPadraoImovelParc1} onChange={e => setCfgPadraoImovelParc1(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">% Imóvel</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 0,50" value={cfgPadraoImovel2} onChange={e => setCfgPadraoImovel2(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Imóvel</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300" value={cfgPadraoImovelParc2} onChange={e => setCfgPadraoImovelParc2(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Comissão Especial DEMAIS */}
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-sm text-blue-800 mb-3">Comissão Especial — DEMAIS</h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div>
                  <Label className="text-xs text-gray-600">% Demais</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 1,00" value={cfgEspecialDemais1} onChange={e => setCfgEspecialDemais1(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Demais</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={cfgEspecialDemaisParc1} onChange={e => setCfgEspecialDemaisParc1(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">% Imóvel</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 0,75" value={cfgEspecialDemais2} onChange={e => setCfgEspecialDemais2(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Imóvel</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={cfgEspecialDemaisParc2} onChange={e => setCfgEspecialDemaisParc2(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Comissão Especial IMÓVEL */}
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-sm text-blue-800 mb-3">Comissão Especial — IMÓVEL</h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div>
                  <Label className="text-xs text-gray-600">% Demais</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 1,00" value={cfgEspecialImovel1} onChange={e => setCfgEspecialImovel1(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Demais</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={cfgEspecialImovelParc1} onChange={e => setCfgEspecialImovelParc1(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">% Imóvel</Label>
                  <div className="relative">
                    <Input className="pr-6" placeholder="ex: 0,75" value={cfgEspecialImovel2} onChange={e => setCfgEspecialImovel2(e.target.value)} />
                    <span className="absolute right-2 top-2.5 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Qtd. Imóvel</Label>
                  <select className="w-full h-10 border rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={cfgEspecialImovelParc2} onChange={e => setCfgEspecialImovelParc2(e.target.value)}>
                    <option value="">--</option>
                    {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Agentes com comissão especial (ChaveJ, um por linha)</Label>
                <textarea
                  className="w-full mt-1 p-2 border rounded text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={4}
                  placeholder="J9670438&#10;J1234567&#10;J9999999"
                  value={cfgAgentesEspeciais}
                  onChange={e => setCfgAgentesEspeciais(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Digite um ChaveJ por linha. Esses agentes usarão as taxas especiais no cálculo.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigAberta(false)}>Cancelar</Button>
            <Button
              onClick={() => saveConfigMutation.mutate({
                pctPadraoDemais1: cfgPadraoDemais1,
                qtdPadraoDemaisParc1: cfgPadraoDemaisParc1,
                pctPadraoDemais2: cfgPadraoDemais2,
                qtdPadraoDemaisParc2: cfgPadraoDemaisParc2,
                pctPadraoImovel1: cfgPadraoImovel1,
                qtdPadraoImovelParc1: cfgPadraoImovelParc1,
                pctPadraoImovel2: cfgPadraoImovel2,
                qtdPadraoImovelParc2: cfgPadraoImovelParc2,
                pctEspecialDemais1: cfgEspecialDemais1,
                qtdEspecialDemaisParc1: cfgEspecialDemaisParc1,
                pctEspecialDemais2: cfgEspecialDemais2,
                qtdEspecialDemaisParc2: cfgEspecialDemaisParc2,
                pctEspecialImovel1: cfgEspecialImovel1,
                qtdEspecialImovelParc1: cfgEspecialImovelParc1,
                pctEspecialImovel2: cfgEspecialImovel2,
                qtdEspecialImovelParc2: cfgEspecialImovelParc2,
                agentesEspeciais: cfgAgentesEspeciais,
              })}
              disabled={saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && excluirMutation.mutate({ id: deleteId })} disabled={excluirMutation.isPending}>
              {excluirMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
