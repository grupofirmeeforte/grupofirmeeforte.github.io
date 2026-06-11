import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Trash2, Search, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

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
  return (n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + "%";
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

function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s+/g, "");
}

const COLUNAS_SEGUROS = [
  { label: "Empresa", field: "empresa" },
  { label: "Mês/Ano", field: "mesAno" },
  { label: "Chave J", field: "chaveJ" },
  { label: "Nome Agente", field: "nomeAgente" },
  { label: "Dt. Operação", field: "dtOperacao", date: true },
  { label: "Banco", field: "banco" },
  { label: "Nr. Contrato", field: "nrContrato" },
  { label: "Vr. Empréstimo", field: "vrEmprestimo", moeda: true },
  { label: "Vr. Comissão", field: "vrComissao", moeda: true },
  { label: "% Comissão", field: "percComissao", pct: true },
  { label: "Comissão Agente", field: "comissaoAgente", moeda: true },
  { label: "Prazo", field: "prazo" },
  { label: "Parcela", field: "parcela" },
  { label: "Digitado Por", field: "digitadoPor" },
];

const MAPA_COLUNAS: Record<string, string[]> = {
  empresa: ["empresa","company","loja"],
  mesAno: ["mesano","mes/ano","mes","month","competencia","referencia","ref"],
  chaveJ: ["chavej","chave","chave_j","operador","agente_id","id_agente","matricula"],
  nomeAgente: ["nomeagente","nome_agente","agente","nome","operador_nome"],
  dtOperacao: ["dtoperacao","dt_operacao","data_operacao","data"],
  prazo: ["prazo","prazo_meses","meses"],
  banco: ["banco","bank","convenio"],
  nrContrato: ["nrcontrato","nr_contrato","contrato","numero_contrato","proposta"],
  vrEmprestimo: ["vremprestimo","vr_emprestimo","valor_emprestimo","valor","capital"],
  refinanciado: ["refinanciado","refin","refinanciamento"],
  dtPagto: ["dtpagto","dt_pagto","data_pagto","data_pagamento"],
  digitadoPor: ["digitadopor","digitado_por","digitador"],
  vrComissao: ["vrcomissao","vr_comissao","valor_comissao","comissao_total"],
  percComissao: ["perccomissao","perc_comissao","percentual_comissao","taxa_comissao"],
  incremento: ["incremento","acrescimo"],
  parcela: ["parcela","nr_parcela","numero_parcela"],
  comissaoAgente: ["comissaoagente","comissao_agente","comissao","commission"],
  observacao: ["observacao","obs","observações","nota"],
};

function mapearColunas(headers: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  headers.forEach((h, i) => {
    const hn = norm(h);
    for (const [campo, aliases] of Object.entries(MAPA_COLUNAS)) {
      if (aliases.some(a => norm(a) === hn || hn.includes(norm(a)))) {
        if (!(campo in mapa)) mapa[campo] = i;
      }
    }
  });
  return mapa;
}

export default function Seguros() {
  useRegistrarModulo('Seguros');
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("__all__");
  const [mesAno, setMesAno] = useState("__all__");
  const [page, setPage] = useState(0);
  const LIMIT = 100;

  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importModo, setImportModo] = useState<"inserir"|"subscrever">("subscrever");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [deleteId, setDeleteId] = useState<number|null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: filtros } = trpc.seguros.filtros.useQuery();
  const { data, isLoading, refetch } = trpc.seguros.listar.useQuery({
    empresa: empresa !== "__all__" ? empresa : undefined,
    mesAno: mesAno !== "__all__" ? mesAno : undefined,
    busca: search || undefined,
    page: page + 1,
    pageSize: LIMIT,
  });

  const importarMut = trpc.seguros.importar.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.inseridos} registros importados com sucesso!`);
      setImportModal(false);
      setImportRows([]);
      utils.seguros.listar.invalidate();
      utils.seguros.filtros.invalidate();
    },
    onError: (e) => toast.error("Erro ao importar: " + e.message),
  });

  const excluirMut = trpc.seguros.excluir.useMutation({
    onSuccess: () => {
      toast.success("Registro excluído!");
      setDeleteId(null);
      utils.seguros.listar.invalidate();
    },
    onError: (e) => toast.error("Erro ao excluir: " + e.message),
  });

  const limparMesMut = trpc.seguros.limparMes.useMutation({
    onSuccess: () => {
      toast.success("Mês limpo com sucesso!");
      utils.seguros.listar.invalidate();
    },
    onError: (e) => toast.error("Erro ao limpar: " + e.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "binary", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (raw.length < 2) { toast.error("Planilha vazia ou sem dados"); return; }
      const headers = raw[0].map((h: any) => String(h ?? ""));
      const mapa = mapearColunas(headers);
      const rows = raw.slice(1).filter(r => r.some((c: any) => c !== "")).map(r => {
        const get = (f: string) => mapa[f] !== undefined ? r[mapa[f]] : undefined;
        return {
          empresa: String(get("empresa") ?? "").trim() || undefined,
          mesAno: toMesAno(get("mesAno")) || undefined,
          chaveJ: String(get("chaveJ") ?? "").trim() || undefined,
          nomeAgente: String(get("nomeAgente") ?? "").trim() || undefined,
          dtOperacao: toDate(get("dtOperacao")) || null,
          prazo: parseInt(String(get("prazo") ?? "0"), 10) || null,
          banco: String(get("banco") ?? "").trim() || undefined,
          nrContrato: String(get("nrContrato") ?? "").trim() || undefined,
          vrEmprestimo: toNum(get("vrEmprestimo")) || null,
          refinanciado: get("refinanciado") ? Boolean(get("refinanciado")) : null,
          dtPagto: toDate(get("dtPagto")) || null,
          digitadoPor: String(get("digitadoPor") ?? "").trim() || undefined,
          vrComissao: toNum(get("vrComissao")) || null,
          percComissao: toNum(get("percComissao")) || null,
          incremento: toNum(get("incremento")) || null,
          parcela: parseInt(String(get("parcela") ?? "0"), 10) || null,
          comissaoAgente: toNum(get("comissaoAgente")) || null,
          observacao: String(get("observacao") ?? "").trim() || undefined,
        };
      });
      setImportRows(rows);
      setImportModal(true);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  async function handleImportar() {
    if (!importRows.length) return;
    setImporting(true);
    setImportProgress(0);
    try {
      if (importModo === "subscrever" && mesAno !== "__all__") {
        await limparMesMut.mutateAsync({ mesAno, empresa: empresa !== "__all__" ? empresa : undefined });
      }
      const BATCH = 50;
      for (let i = 0; i < importRows.length; i += BATCH) {
        await importarMut.mutateAsync({ registros: importRows.slice(i, i + BATCH) });
        setImportProgress(Math.round(((i + BATCH) / importRows.length) * 100));
      }
    } finally {
      setImporting(false);
    }
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader title="Seguros" />
      <div className="max-w-[1600px] mx-auto px-4 py-6">

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4 bg-gray-900 rounded-lg p-3 shadow-sm border">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar contrato, agente, chave J..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="h-8" />
          </div>
          <Select value={empresa} onValueChange={v => { setEmpresa(v); setPage(0); }}>
            <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as empresas</SelectItem>
              {filtros?.empresas.map(e => <SelectItem key={e!} value={e!}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mesAno} onValueChange={v => { setMesAno(v); setPage(0); }}>
            <SelectTrigger className="w-36 h-8"><SelectValue placeholder="Mês/Ano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os meses</SelectItem>
              {filtros?.meses.map(m => <SelectItem key={m!} value={m!}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-800 text-white">
                {COLUNAS_SEGUROS.map(c => (
                  <th key={c.field} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{c.label}</th>
                ))}
                <th className="px-3 py-2 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={COLUNAS_SEGUROS.length + 1} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={COLUNAS_SEGUROS.length + 1} className="text-center py-8 text-gray-400">Nenhum registro encontrado</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} className={i % 2 === 0 ? "bg-white hover:bg-blue-900/30" : "bg-blue-900/20/30 hover:bg-blue-100/40"}>
                  {COLUNAS_SEGUROS.map(c => {
                    const val = (row as any)[c.field];
                    let display: string;
                    if ((c as any).moeda) display = fmtMoeda(val);
                    else if ((c as any).pct) display = fmtPct(val);
                    else if ((c as any).date) display = toDate(val);
                    else display = val != null ? String(val) : "-";
                    return <td key={c.field} className="px-3 py-1.5 whitespace-nowrap">{display}</td>;
                  })}
                  <td className="px-3 py-1.5 text-center">
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-6 w-6 p-0" onClick={() => setDeleteId(row.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-sm text-gray-300">
            <span>{total} registros no total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="px-2 py-1">Pág. {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de importação */}
      <Dialog open={importModal} onOpenChange={setImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Seguros</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-300">Arquivo: <strong>{importFileName}</strong></p>
            <p className="text-sm text-gray-300">{importRows.length} registros encontrados</p>
            <div>
              <label className="text-sm font-medium">Modo de importação:</label>
              <Select value={importModo} onValueChange={v => setImportModo(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscrever">Substituir mês selecionado</SelectItem>
                  <SelectItem value="inserir">Adicionar aos existentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {importing && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModal(false)} disabled={importing}>Cancelar</Button>
            <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={handleImportar} disabled={importing || importRows.length === 0}>
              {importing ? "Importando..." : `Importar ${importRows.length} registros`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-300">Deseja excluir este registro? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && excluirMut.mutate({ id: deleteId })}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
