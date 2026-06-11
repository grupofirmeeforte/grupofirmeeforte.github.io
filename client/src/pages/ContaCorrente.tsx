import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Edit2, Trash2, Search, Calculator, Send, Settings } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

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
  // Se <= 1, é decimal (0.68 → 68,00%)
  if (n <= 1) return (n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s+/g, "");
}

function toDate(v: any): string {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${String(v.getDate()).padStart(2, "0")}/${String(v.getMonth() + 1).padStart(2, "0")}/${v.getFullYear()}`;
  }
  if (typeof v === "number" && Number.isInteger(v) && v >= 40000 && v <= 60000) {
    const d = new Date(new Date(1899, 11, 30).getTime() + v * 86400000);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // Tenta converter "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

function excelSerialToDate(serial: number): Date {
  // Base do Excel: 1899-12-30
  return new Date(new Date(1899, 11, 30).getTime() + serial * 86400000);
}

function toMesAno(v: any): string {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${String(v.getMonth() + 1).padStart(2, "0")}/${v.getFullYear()}`;
  }
  const s = String(v).trim();
  // Já está no formato MM/AAAA
  if (/^\d{1,2}\/\d{4}$/.test(s)) return s.replace(/^(\d)\//, "0$1/");
  // Já está no formato MM/AA
  if (/^\d{1,2}\/\d{2}$/.test(s)) {
    const [mm, aa] = s.split("/");
    return mm.padStart(2, "0") + "/20" + aa;
  }
  const n = parseInt(s, 10);
  if (!isNaN(n) && n > 0) {
    // Serial do Excel (tipicamente entre 40000 e 60000 para datas 2009-2064)
    if (n >= 40000 && n <= 60000) {
      const d = excelSerialToDate(n);
      return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    // Formato legado MMAA (ex: 526 = maio/2026)
    const str = String(n);
    if (str.length <= 4) {
      const mm = str.slice(0, str.length - 2).padStart(2, "0");
      return mm + "/20" + str.slice(-2);
    }
  }
  return s;
}

function toNum(v: any): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

// ─── Componente principal ─────────────────────────────────────────
export default function ContaCorrente() {
  useRegistrarModulo('Conta Corrente');
  const [, navigate] = useLocation();

  // Filtros
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("__all__");
  const [mesAno, setMesAno] = useState("__all__");
  const [page, setPage] = useState(0);
  const LIMIT = 100;

  // Importação
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importModo, setImportModo] = useState<"inserir" | "subscrever">("inserir");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Edição
  const [editModal, setEditModal] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);

  // Exclusão
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Seleção de linhas para envio
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map((r: any) => r.id)));
  };

  // Configuração de Comissão
  const [showConfig, setShowConfig] = useState(false);
  const [cfgPadrao, setCfgPadrao] = useState("");
  const [cfgEspecial, setCfgEspecial] = useState("");
  const [cfgAgentesEspeciais, setCfgAgentesEspeciais] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: filtros } = trpc.contaCorrenteProd.filtros.useQuery();
  const { data, isLoading } = trpc.contaCorrenteProd.list.useQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    empresa: empresa !== "__all__" ? empresa : undefined,
    mesAno: mesAno !== "__all__" ? mesAno : undefined,
  });

  const { data: configData } = trpc.contaCorrenteProd.getConfig.useQuery();
  useEffect(() => {
    if (configData) {
      setCfgPadrao((configData as any).pctPadrao ?? "");
      setCfgEspecial((configData as any).pctEspecial ?? "");
      setCfgAgentesEspeciais((configData as any).agentesEspeciais ?? "");
    }
  }, [configData]);

  const saveConfigMutation = trpc.contaCorrenteProd.saveConfig.useMutation({
    onSuccess: () => {
      utils.contaCorrenteProd.getConfig.invalidate();
      toast.success("Configuração salva!");
      setShowConfig(false);
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  const importarMutation = trpc.contaCorrenteProd.importar.useMutation({
    onSuccess: () => {
      utils.contaCorrenteProd.list.invalidate();
      utils.contaCorrenteProd.filtros.invalidate();
    },
  });

  const calcularMutation = trpc.contaCorrenteProd.calcular.useMutation({
    onSuccess: (res) => {
      utils.contaCorrenteProd.list.invalidate();
      toast.success(`Cálculo concluído! ${res.calculados} com comissão, ${res.zerados} zerados.`);
    },
    onError: () => toast.error("Erro ao calcular comissões"),
  });

  const atualizarMutation = trpc.contaCorrenteProd.atualizar.useMutation({
    onSuccess: () => {
      utils.contaCorrenteProd.list.invalidate();
      setEditModal(false);
      toast.success("Registro atualizado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const excluirMutation = trpc.contaCorrenteProd.excluir.useMutation({
    onSuccess: () => {
      utils.contaCorrenteProd.list.invalidate();
      setDeleteId(null);
      toast.success("Registro excluído!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const enviarCalculoMutation = trpc.contaCorrenteProd.enviarParaCalculo.useMutation({
    onSuccess: (res) => {
      setSelectedIds(new Set());
      toast.success(`Enviado para Cálculo! ${res.inseridos} novo(s) inserido(s), ${res.atualizados} atualizado(s).`);
    },
    onError: (err) => toast.error(`Erro ao enviar: ${err.message}`),
  });

  // ── Parser Excel ──────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      // Encontrar linha de cabeçalho (contém "Empresa" ou "Chave J" ou "ChaveJ")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(raw.length, 15); i++) {
        const rowStr = raw[i]?.map((c: any) => norm(String(c ?? ""))).join(" ") ?? "";
        if (rowStr.includes("EMPRESA") || rowStr.includes("CHAVEJ") || rowStr.includes("CHAVE")) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) { toast.error("Cabeçalho não encontrado. Verifique se a planilha tem as colunas: Empresa, Mês Ano, Chave J, Agente, RBM, Comissão"); return; }

      const headers = raw[headerIdx].map((h: any) => norm(String(h ?? "")));
      const colIdx = (name: string) => headers.indexOf(norm(name));
      const colFind = (terms: string[]) => {
        for (const t of terms) {
          const idx = headers.findIndex((h: string) => h.includes(norm(t)));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      // Mapeamento de colunas da planilha COntaCORRENTE.xlsx
      // Linha 5: Empresa | Mês Ano | Agencia | Conta Corrente | Chave J | Agente | Tipo Serv | Data | Produto | Modalidade | Age Relaciomam | Rbm | Comissão | Supervisor
      const iEmpresa        = colFind(["EMPRESA"]);
      const iMesAno         = colFind(["MESANO", "MES ANO", "MESANO"]);
      const iAgencia        = colFind(["AGENCIA"]);
      const iContaCorrente  = colFind(["CONTACORRENTE", "CONTA CORRENTE", "CONTA"]);
      const iChaveJ         = colFind(["CHAVEJ", "CHAVE J", "CHAVE"]);
      const iAgente         = colFind(["AGENTE"]);
      const iTipoServ       = colFind(["TIPOSERV", "TIPO SERV", "TIPO"]);
      const iData           = colFind(["DATA"]);
      const iProduto        = colFind(["PRODUTO"]);
      const iModalidade     = colFind(["MODALIDADE"]);
      const iAgRel          = colFind(["AGERELACIOMAM", "AGERELACIONAM", "RELACIONAM"]);
      const iRbm            = colFind(["RBM"]);
      const iComissao       = colFind(["COMISSAO", "COMISSÃO"]);
      const iSupervisor     = colFind(["SUPERVISOR"]);

      const rows: any[] = [];
      for (let r = headerIdx + 1; r < raw.length; r++) {
        const row = raw[r];
        if (!row || !row.some((c: any) => c != null && c !== "")) continue;

        // Precisa ter pelo menos ChaveJ ou Conta Corrente
        const chaveJVal = iChaveJ !== -1 ? String(row[iChaveJ] ?? "").trim().toUpperCase() : "";
        const contaVal = iContaCorrente !== -1 ? String(row[iContaCorrente] ?? "").trim() : "";
        if (!chaveJVal && !contaVal) continue;

        // Empresa: se 0 ou vazio, usar "NÃO INFORMADO"
        let empresaVal = iEmpresa !== -1 ? String(row[iEmpresa] ?? "").trim().toUpperCase() : "";
        if (!empresaVal || empresaVal === "0") empresaVal = "NÃO INFORMADO";

        // Data da operação para calcular mesAno automaticamente
        const dataVal2 = toDate(iData !== -1 ? row[iData] : null);
        // Calcular mesAno automaticamente pela data da operação usando regra do período vigente
        let mesAnoVal = toMesAno(iMesAno !== -1 ? row[iMesAno] : null);
        if (dataVal2 && dataVal2.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [dd, mm, yyyy] = dataVal2.split("/").map(Number);
          // Simplificado: dia >= 27 → próximo mês (penúltimo dia útil)
          let mesRef = mm;
          let anoRef = yyyy;
          if (dd >= 27) {
            mesRef = mm === 12 ? 1 : mm + 1;
            anoRef = mm === 12 ? yyyy + 1 : yyyy;
          }
          mesAnoVal = String(mesRef).padStart(2, "0") + "/" + anoRef;
        }
        const dataVal = dataVal2 || toDate(iData !== -1 ? row[iData] : null);

        rows.push({
          empresa: empresaVal,
          mesAno: mesAnoVal || undefined,
          chaveJ: chaveJVal || undefined,
          agente: iAgente !== -1 ? String(row[iAgente] ?? "").trim() || undefined : undefined,
          agencia: iAgencia !== -1 ? String(row[iAgencia] ?? "").trim() || undefined : undefined,
          contaCorrente: contaVal || undefined,
          tipoServ: iTipoServ !== -1 ? String(row[iTipoServ] ?? "").trim() || undefined : undefined,
          dataOperacao: dataVal || undefined,
          produto: iProduto !== -1 ? String(row[iProduto] ?? "").trim() || undefined : undefined,
          modalidade: iModalidade !== -1 ? String(row[iModalidade] ?? "").trim() || undefined : undefined,
          agRelacionamento: iAgRel !== -1 ? String(row[iAgRel] ?? "").trim() || undefined : undefined,
          rbm: iRbm !== -1 ? toNum(row[iRbm]) || undefined : undefined,
          percComissao: undefined, // calculado pelo sistema
          comissao: iComissao !== -1 ? toNum(row[iComissao]) || undefined : undefined,
          supervisor: iSupervisor !== -1 ? String(row[iSupervisor] ?? "").trim() || undefined : undefined,
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
    let totalInseridos = 0;
    let totalErros = 0;

    for (let i = 0; i < importRows.length; i += BATCH) {
      const chunk = importRows.slice(i, i + BATCH);
      try {
        const res = await importarMutation.mutateAsync({ rows: chunk, modo: importModo });
        totalInseridos += res.inseridos;
        totalErros += res.erros;
      } catch {
        totalErros += chunk.length;
      }
      setImportProgress(Math.round(((i + BATCH) / importRows.length) * 100));
    }

    setImporting(false);
    setImportModal(false);
    setImportRows([]);
    setImportFileName("");
    toast.success(`Importação concluída: ${totalInseridos} inseridos, ${totalErros} erros`);
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader title="Conta Corrente" />
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => calcularMutation.mutate({
              mesAno: mesAno !== "__all__" ? mesAno : undefined,
              empresa: empresa !== "__all__" ? empresa : undefined,
            })}
            disabled={calcularMutation.isPending}
            className="gap-1 border-green-500 text-green-700 hover:bg-green-50"
            title="Calcular comissão com base na Tabela de Comissão (convênio Conta Corrente)"
          >
            <Calculator className={`w-4 h-4 ${calcularMutation.isPending ? "animate-pulse" : ""}`} />
            {calcularMutation.isPending ? "Calculando..." : "Calcular"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([
              ["Agência", "Conta Corrente", "Chave J", "Tipo Serv", "Data", "Produto", "Modalidade", "Ag Relacionamento", "RBM", "Comissão", "Supervisor"],
              ["1091", "47707", "J9661460", "109", "15.06.2026", "1900", "1", "231", "25", "", "LUANA"],
            ]);
            XLSX.utils.book_append_sheet(wb, ws, "Conta Corrente");
            XLSX.writeFile(wb, "MODELO_IMPORTACAO_CONTA_CORRENTE.xlsx");
          }} className="gap-1 border-gray-400">
            <Upload className="w-4 h-4" /> Baixar Template
          </Button>
          <Button size="sm" onClick={() => setImportModal(true)} className="gap-1">
            <Upload className="w-4 h-4" /> Importar Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (selectedIds.size === 0) {
                toast.error("Selecione ao menos um registro antes de enviar para Cálculo");
                return;
              }
              enviarCalculoMutation.mutate({ ids: Array.from(selectedIds) });
            }}
            disabled={enviarCalculoMutation.isPending}
            className={`gap-1 text-white ${selectedIds.size > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"}`}
            title={selectedIds.size > 0 ? `Enviar ${selectedIds.size} registro(s) para Cálculo` : "Selecione registros para enviar"}
          >
            <Send className={`w-4 h-4 ${enviarCalculoMutation.isPending ? "animate-pulse" : ""}`} />
            {enviarCalculoMutation.isPending ? "Enviando..." : `Enviar para Cálculo${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConfig(v => !v)}
            className={`gap-1 border-gray-400 ${showConfig ? "bg-gray-100" : ""}`}
            title="Configuração de Comissão"
          >
            <Settings className="w-4 h-4" /> Configuração
          </Button>
          
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
          <Input
            className="pl-8 h-8 w-48 text-sm"
            placeholder="Buscar ChaveJ, Agente..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Select value={empresa} onValueChange={v => { setEmpresa(v); setPage(0); }}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas Empresas</SelectItem>
            {filtros?.empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mesAno} onValueChange={v => { setMesAno(v); setPage(0); }}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Mês/Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os Meses</SelectItem>
            {filtros?.mesanos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <span className="text-xs text-blue-600 font-medium">
            {selectedIds.size} selecionado(s)
          </span>
        )}
      </div>

      {/* Layout com painel lateral de configuração */}
      <div className="flex gap-0">

      {/* Painel de Configuração de Comissão */}
      {showConfig && (
        <div className="w-72 min-w-[18rem] bg-white border-r shadow-sm flex-shrink-0 p-4 space-y-4">
          <h3 className="text-sm font-bold text-gray-700">Configuração de Comissão</h3>

          {/* Comissão Padrão */}
          <div className="border border-green-200 rounded-lg p-3 bg-green-50">
            <h4 className="text-xs font-semibold text-green-800 mb-2">Comissão Padrão</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-300">Padrão (R$)</label>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-700 font-medium">R$</span>
                  <Input
                    className="h-7 text-sm w-full"
                    placeholder="0,00"
                    value={cfgPadrao}
                    onChange={e => setCfgPadrao(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Comissão Especial */}
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-900/20">
            <h4 className="text-xs font-semibold text-blue-800 mb-2">Comissão Especial</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-300">Especial (R$)</label>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-700 font-medium">R$</span>
                  <Input
                    className="h-7 text-sm w-full"
                    placeholder="0,00"
                    value={cfgEspecial}
                    onChange={e => setCfgEspecial(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-300">Agentes com comissão especial</label>
                <textarea
                  className="mt-1 w-full border rounded p-1.5 text-xs font-mono resize-none h-24 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Um ChaveJ por linha\nEx: J12345\nJ67890"
                  value={cfgAgentesEspeciais}
                  onChange={e => setCfgAgentesEspeciais(e.target.value)}
                />
                <p className="text-xs text-gray-700 mt-1">Digite um ChaveJ por linha para cálculo.</p>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => saveConfigMutation.mutate({
              pctPadrao: cfgPadrao,
              pctEspecial: cfgEspecial,
              agentesEspeciais: cfgAgentesEspeciais,
            })}
            disabled={saveConfigMutation.isPending}
          >
            {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      )}

      {/* Tabela */}
      <div className="p-4 overflow-x-auto flex-1">
        {isLoading ? (
          <div className="text-center py-12 text-gray-700">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-700">
            <p className="text-lg font-medium">Nenhum registro encontrado</p>
            <p className="text-sm mt-1">Importe uma planilha Excel para começar</p>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse bg-gray-900 rounded-lg border border-gray-700-sm overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white">
                <th className="px-2 py-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-2 py-2 text-left">Agente</th>
                <th className="px-2 py-2 text-left">Conta</th>
                <th className="px-2 py-2 text-right">Valores</th>
                <th className="px-2 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => {
                const isSelected = selectedIds.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`border-b cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-900/20 border-blue-200"
                        : idx % 2 === 0
                        ? "bg-white hover:bg-gray-800"
                        : "bg-gray-800 hover:bg-gray-100"
                    }`}
                    onClick={() => toggleSelect(r.id)}
                  >
                    <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(r.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {/* Coluna Agente */}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[11px] text-blue-700 font-semibold">{r.chaveJ || "-"}</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">{r.empresa || ""}</span>
                        <span className="text-[9px] text-gray-700">{r.mesAno || ""}</span>
                      </div>
                      <div className="text-[11px] text-white font-medium">{r.agente || "-"}</div>
                      {r.supervisor && <div className="text-[10px] text-gray-700">Sup: {r.supervisor}</div>}
                    </td>
                    {/* Coluna Conta */}
                    <td className="px-2 py-1.5">
                      <div className="text-[11px] text-gray-700">Ag: {r.agencia || "-"} · Cc: {r.contaCorrente || "-"}</div>
                      <div className="text-[10px] text-gray-700">
                        {r.dataOperacao
                          ? (r.dataOperacao instanceof Date
                            ? r.dataOperacao.toLocaleDateString("pt-BR")
                            : String(r.dataOperacao).split("T")[0])
                          : "-"}
                      </div>
                    </td>
                    {/* Coluna Valores */}
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <div className="font-bold text-green-700 text-[12px]">{r.comissao ? fmtMoeda(r.comissao) : "-"}</div>
                      <div className="text-[10px] text-gray-700">RBM: {fmtMoeda(r.rbm)}</div>
                    </td>
                    <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditRow({ ...r }); setEditModal(true); }}
                          className="p-1 text-blue-600 hover:bg-blue-900/30 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(r.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-700">
              Página {page + 1} de {totalPages} — {total.toLocaleString("pt-BR")} registros
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>{/* fim flex layout */}

      {/* Modal Importação */}
      <Dialog open={importModal} onOpenChange={setImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Planilha — Conta Corrente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setImportModo("inserir")}
                className={`p-3 rounded border-2 text-left transition ${importModo === "inserir" ? "border-blue-500 bg-blue-900/20" : "border-gray-700 hover:border-gray-300"}`}
              >
                <div className="font-semibold text-sm">Apenas Inserir</div>
                <div className="text-xs text-gray-700 mt-1">Adiciona somente registros novos.</div>
              </button>
              <button
                onClick={() => setImportModo("subscrever")}
                className={`p-3 rounded border-2 text-left transition ${importModo === "subscrever" ? "border-blue-500 bg-blue-900/20" : "border-gray-700 hover:border-gray-300"}`}
              >
                <div className="font-semibold text-sm">Subscrever</div>
                <div className="text-xs text-gray-700 mt-1">Adiciona todos os registros (pode duplicar).</div>
              </button>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Arquivo Excel (.xlsx)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: "block", width: "100%", padding: "10px", border: "2px dashed #d1d5db", borderRadius: 8, cursor: "pointer", fontSize: 13, background: "#f9fafb" }}
              />
              {importFileName && (
                <p className="text-xs text-gray-700 mt-1">📄 {importFileName} — {importRows.length} registros lidos</p>
              )}
            </div>
            <div className="bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Colunas esperadas na planilha:</p>
              <p>Agência | Conta Corrente | Chave J | Tipo Serv | Data | Produto | Modalidade | Ag Relacionamento | RBM | Comissão | Supervisor</p>
              <p className="mt-1 text-blue-600">✓ Empresa, Mês/Ano e Agente são preenchidos automaticamente</p>
            </div>
            {importing && (
              <div>
                <div className="flex justify-between text-xs text-gray-700 mb-1">
                  <span>Importando...</span><span>{importProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-900/200 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
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
              <DialogTitle>Editar Registro — {editRow.chaveJ || editRow.agente}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Empresa", key: "empresa" },
                { label: "Mês/Ano", key: "mesAno" },
                { label: "ChaveJ", key: "chaveJ" },
                { label: "Agente", key: "agente" },
                { label: "Agência", key: "agencia" },
                { label: "Conta Corrente", key: "contaCorrente" },
                { label: "Tipo Serv", key: "tipoServ" },
                { label: "Data (AAAA-MM-DD)", key: "dataOperacao" },
                { label: "Produto", key: "produto" },
                { label: "Modalidade", key: "modalidade" },
                { label: "Ag. Relacionamento", key: "agRelacionamento" },
                { label: "Supervisor", key: "supervisor" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={key === "dataOperacao" && editRow[key] instanceof Date
                      ? editRow[key].toISOString().split("T")[0]
                      : (editRow[key] ?? "")}
                    onChange={e => setEditRow((r: any) => ({ ...r, [key]: e.target.value }))}
                  />
                </div>
              ))}
              {[
                { label: "RBM", key: "rbm" },
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
                  chaveJ: editRow.chaveJ,
                  agente: editRow.agente,
                  agencia: editRow.agencia,
                  contaCorrente: editRow.contaCorrente,
                  tipoServ: editRow.tipoServ,
                  dataOperacao: editRow.dataOperacao instanceof Date
                    ? editRow.dataOperacao.toISOString().split("T")[0]
                    : editRow.dataOperacao,
                  produto: editRow.produto,
                  modalidade: editRow.modalidade,
                  agRelacionamento: editRow.agRelacionamento,
                  rbm: editRow.rbm ? parseFloat(editRow.rbm) : null,
                  percComissao: editRow.percComissao ? parseFloat(editRow.percComissao) : null,
                  comissao: editRow.comissao ? parseFloat(editRow.comissao) : null,
                  supervisor: editRow.supervisor,
                })}
                disabled={atualizarMutation.isPending}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Confirmação Exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId !== null && excluirMutation.mutate({ id: deleteId })}
              disabled={excluirMutation.isPending}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
