import { useState, useRef, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { usePermissao } from "@/hooks/usePermissao";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Row = {
  id: number;
  sexo?: string | null;
  mciEmpregador?: string | null;
  nrCvn13Salario?: string | null;
  nrCvnConsig?: string | null;
  nrCvnSalario?: string | null;
  sgUf?: string | null;
  super?: string | null;
  cidade?: string | null;
  naoPerturbe?: string | null;
  dtInclusao?: string | null;
  prfDepe?: string | null;
  nrCc?: string | null;
  nome?: string | null;
  dtaNasc?: string | null;
  idade?: number | null;
  cpf?: string | null;
  ddd01?: string | null; tel01?: string | null;
  ddd02?: string | null; tel02?: string | null;
  ddd03?: string | null; tel03?: string | null;
  ddd04?: string | null; tel04?: string | null;
  ddd05?: string | null; tel05?: string | null;
  ddd06?: string | null; tel06?: string | null;
  ddd07?: string | null; tel07?: string | null;
  ddd08?: string | null; tel08?: string | null;
  ddd09?: string | null; tel09?: string | null;
  ddd10?: string | null; tel10?: string | null;
  mci?: string | null;
  cdIdfr?: string | null;
  dtPrimeiroPagto?: string | null;
  maiorLimiteCredito?: string | null;
  codCoban?: string | null;
  campanha?: string | null;
  agente?: string | null;
  dataContato?: string | null;
  resultado?: string | null;
  dataInserido?: string | null;
  observacao?: string | null;
};

const EMPTY: Partial<Row> = {};
const PER_PAGE = 50;

// Formata CPF: 000.000.000-00 (aceita qualquer entrada)
function formatCpf(v?: string | null): string {
  if (!v) return "";
  const d = String(v).replace(/\D/g, "").padStart(11, "0").slice(-11);
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

// Formata telefone: (DDD) 00000-0000 ou (DDD) 0000-0000
function formatTel(ddd?: string | null, tel?: string | null): string {
  const d = String(ddd ?? "").replace(/\D/g, "");
  const t = String(tel ?? "").replace(/\D/g, "");
  if (!t || t === "0") return "";
  const telFmt = t.length >= 9
    ? `${t.slice(0, 5)}-${t.slice(5, 9)}`
    : `${t.slice(0, 4)}-${t.slice(4, 8)}`;
  return d ? `(${d}) ${telFmt}` : telFmt;
}

// Monta lista de telefones com DDD
function fones(row: Row): string[] {
  const pares: [string | null | undefined, string | null | undefined][] = [
    [row.ddd01, row.tel01], [row.ddd02, row.tel02], [row.ddd03, row.tel03],
    [row.ddd04, row.tel04], [row.ddd05, row.tel05], [row.ddd06, row.tel06],
    [row.ddd07, row.tel07], [row.ddd08, row.tel08], [row.ddd09, row.tel09],
    [row.ddd10, row.tel10],
  ];
  return pares
    .map(([d, t]) => formatTel(d, t))
    .filter(Boolean);
}

// Mapeamento Excel → campos
// Colunas removidas: MCI_EMPREGADOR_CADASTRO, NR_CVN_13_SALARIO, NR_CVN_CONSIG, NR_CVN_SALARIO,
// SUPER, MCI, CD_IDFR_BNFC, DT_PRIMEIRO_PAGTO, MAIOR_LIMITE_DE_CREDITO_NOVO, Cod_COBAN, CAMPANHA, AGENTE
const EXCEL_MAP: Record<string, keyof Row> = {
  "SEXO": "sexo",
  "SG_UF": "sgUf",
  "CIDADE": "cidade",
  "NÃO_PERTUBE": "naoPerturbe",
  "DT INCLUSÃO": "dtInclusao",
  "PRF_DEPE": "prfDepe",
  "NR_C/C": "nrCc",
  "NOME": "nome",
  "DTA_NASC": "dtaNasc",
  "CPF": "cpf",
  "DDD_01": "ddd01", "TEL_01": "tel01",
  "DDD_02": "ddd02", "TEL_02": "tel02",
  "DDD_03": "ddd03", "TEL_03": "tel03",
  "DDD_04": "ddd04", "TEL_04": "tel04",
  "DDD_05": "ddd05", "TEL_05": "tel05",
  "DDD_06": "ddd06", "TEL_06": "tel06",
  "DDD_07": "ddd07", "TEL_07": "tel07",
  "DDD_08": "ddd08", "TEL_08": "tel08",
  "DDD_09": "ddd09", "TEL_09": "tel09",
  "DDD_10": "ddd10", "TEL_10": "tel10",
  "DATA": "dataContato",
  "RESULTADO": "resultado",
  "DATA Inserido": "dataInserido",
};

// Cor por resultado
function resultadoBadge(resultado?: string | null) {
  if (!resultado) return null;
  const r = resultado.toLowerCase();
  if (r.includes("venda") || r.includes("fechado") || r.includes("convertido"))
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{resultado}</span>;
  if (r.includes("sem resposta") || r.includes("não atend") || r.includes("nao atend"))
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">{resultado}</span>;
  if (r.includes("retornar") || r.includes("aguardando") || r.includes("pendente"))
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">{resultado}</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-100 font-medium">{resultado}</span>;
}

export default function MailingCrm() {
  useRegistrarModulo('Mailing/CRM');
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const { cargo } = usePermissao();
  const isPromotor = cargo === 'Promotor';

  // Filtros
  const [search, setSearch] = useState("");
  const [filtAgente, setFiltAgente] = useState("");
  const [filtUf, setFiltUf] = useState("");
  const [filtCidade, setFiltCidade] = useState("");
  const [filtResultado, setFiltResultado] = useState("");
  const [filtCampanha, setFiltCampanha] = useState("");
  const [filtNaoPerturbe, setFiltNaoPerturbe] = useState<"todos" | "bloqueados" | "liberados">("todos");
  const [page, setPage] = useState(0);

  // Modal
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<Partial<Row>>(EMPTY);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  const filters = {
    search: search || undefined,
    agente: filtAgente || undefined,
    sgUf: filtUf || undefined,
    cidade: filtCidade || undefined,
    resultado: filtResultado || undefined,
    campanha: filtCampanha || undefined,
  };

  const { data: rows = [], isLoading } = trpc.mailingCrm.list.useQuery({
    ...filters, limit: PER_PAGE, offset: page * PER_PAGE,
  });
  const { data: total = 0 } = trpc.mailingCrm.count.useQuery(filters);
  const { data: filtros } = trpc.mailingCrm.filtros.useQuery();

  const criar = trpc.mailingCrm.criar.useMutation({
    onSuccess: () => { utils.mailingCrm.list.invalidate(); utils.mailingCrm.count.invalidate(); setModal(null); toast.success("Registro criado!"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const editar = trpc.mailingCrm.editar.useMutation({
    onSuccess: () => { utils.mailingCrm.list.invalidate(); setModal(null); toast.success("Registro atualizado!"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const deletar = trpc.mailingCrm.deletar.useMutation({
    onSuccess: () => { utils.mailingCrm.list.invalidate(); utils.mailingCrm.count.invalidate(); setConfirmDel(null); toast.success("Registro excluído!"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const importar = trpc.mailingCrm.importar.useMutation({
    onError: (e) => toast.error("Erro ao importar: " + e.message),
  });
  const [importando, setImportando] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  // Limpeza em lote
  const [confirmLimpeza, setConfirmLimpeza] = useState<'falecidos' | 'acima78' | null>(null);
  const { data: contagem } = trpc.mailingCrm.contarParaLimpeza.useQuery(undefined, { staleTime: 30_000 });
  const removerFalecidos = trpc.mailingCrm.removerFalecidos.useMutation({
    onSuccess: () => {
      utils.mailingCrm.list.invalidate();
      utils.mailingCrm.count.invalidate();
      utils.mailingCrm.contarParaLimpeza.invalidate();
      setConfirmLimpeza(null);
      toast.success('Falecidos removidos com sucesso!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
  const removerAcima78 = trpc.mailingCrm.removerAcima78.useMutation({
    onSuccess: (r) => {
      utils.mailingCrm.list.invalidate();
      utils.mailingCrm.count.invalidate();
      utils.mailingCrm.contarParaLimpeza.invalidate();
      setConfirmLimpeza(null);
      toast.success(`${r.removidos} registros com mais de 78 anos removidos!`);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  // Deduplicar CPF
  const [confirmDedup, setConfirmDedup] = useState(false);
  const { data: contagemDup } = trpc.mailingCrm.contarDuplicados.useQuery(undefined, { staleTime: 30_000 });
  const deduplicarCpf = trpc.mailingCrm.deduplicarCpf.useMutation({
    onSuccess: (r) => {
      utils.mailingCrm.list.invalidate();
      utils.mailingCrm.count.invalidate();
      utils.mailingCrm.contarDuplicados.invalidate();
      setConfirmDedup(false);
      toast.success(`${r.removidos} duplicata(s) removida(s) — telefones mesclados no registro principal!`);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  // Verificar CPFs na lista Não Pertube
  const cpfsDaPagina = useMemo(() => rows.map(r => r.cpf ?? "").filter(Boolean), [rows]);
  const { data: naoPerturbeData } = trpc.naoPerturbe.verificarCpfs.useQuery(
    { cpfs: cpfsDaPagina },
    { enabled: cpfsDaPagina.length > 0, staleTime: 60_000 }
  );
  const cpfsBloqueados = useMemo(() => {
    const map = new Map<string, string>();
    naoPerturbeData?.bloqueados.forEach(b => {
      const norm = b.cpf.replace(/\D/g, "");
      map.set(norm, b.motivo);
    });
    return map;
  }, [naoPerturbeData]);

  // Filtrar rows pelo status Não Pertube
  const rowsFiltrados = useMemo(() => {
    if (filtNaoPerturbe === "todos" || !naoPerturbeData) return rows;
    return rows.filter(r => {
      const cpfNorm = (r.cpf ?? "").replace(/\D/g, "");
      const bloqueado = cpfNorm.length === 11 && cpfsBloqueados.has(cpfNorm);
      if (filtNaoPerturbe === "bloqueados") return bloqueado;
      if (filtNaoPerturbe === "liberados") return !bloqueado;
      return true;
    });
  }, [rows, filtNaoPerturbe, cpfsBloqueados, naoPerturbeData]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // Exportar Excel
  const handleExport = async () => {
    const all = await utils.mailingCrm.exportarTodos.fetch(filters);
    if (!all || all.length === 0) { toast.warning("Nenhum dado para exportar."); return; }
    const ws = XLSX.utils.json_to_sheet(all.map(r => ({
      "NOME": r.nome ?? "",
      "SEXO": r.sexo ?? "",
      "IDADE": r.idade ?? "",
      "DTA_NASC": r.dtaNasc ?? "",
      "CPF": r.cpf ?? "",
      "CIDADE": r.cidade ?? "",
      "SG_UF": r.sgUf ?? "",
      "NR_C/C": r.nrCc ?? "",
      "NÃO_PERTUBE": r.naoPerturbe ?? "",
      "DT INCLUSÃO": r.dtInclusao ?? "",
      "PRF_DEPE": r.prfDepe ?? "",
      "DATA": r.dataContato ?? "",
      "RESULTADO": r.resultado ?? "",
      "DATA Inserido": r.dataInserido ?? "",
      "DDD_01": r.ddd01 ?? "", "TEL_01": r.tel01 ?? "",
      "DDD_02": r.ddd02 ?? "", "TEL_02": r.tel02 ?? "",
      "DDD_03": r.ddd03 ?? "", "TEL_03": r.tel03 ?? "",
      "DDD_04": r.ddd04 ?? "", "TEL_04": r.tel04 ?? "",
      "DDD_05": r.ddd05 ?? "", "TEL_05": r.tel05 ?? "",
      "DDD_06": r.ddd06 ?? "", "TEL_06": r.tel06 ?? "",
      "DDD_07": r.ddd07 ?? "", "TEL_07": r.tel07 ?? "",
      "DDD_08": r.ddd08 ?? "", "TEL_08": r.tel08 ?? "",
      "DDD_09": r.ddd09 ?? "", "TEL_09": r.tel09 ?? "",
      "DDD_10": r.ddd10 ?? "", "TEL_10": r.tel10 ?? "",
      "OBSERVAÇÃO": r.observacao ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mailing CRM");
    XLSX.writeFile(wb, `mailing_crm_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Importar Excel — envia em lotes de 500 para evitar timeout
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array", cellDates: true });
        // Procura a planilha com dados (ignora planilha de instruções)
        const sheetName = wb.SheetNames.find(n => !n.toUpperCase().includes("INSTRU")) ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
        if (!json || json.length < 2) { toast.warning("Arquivo vazio ou sem dados."); return; }

        const normStr = (h: any) => String(h ?? "").trim().toUpperCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const rawHeaders = json[0] || [];
        const colMap: Record<string, number> = {};
        rawHeaders.forEach((h: any, i: number) => { colMap[normStr(h)] = i; });

        const NORM_MAP: Record<string, keyof Row> = {};
        for (const [k, v] of Object.entries(EXCEL_MAP)) {
          NORM_MAP[normStr(k)] = v;
        }

        // Padrões de linhas de instrução/exemplo a ignorar (em QUALQUER campo)
        const isLinhaInstrucao = (row: any[]) => {
          const vals = row.map(v => String(v ?? "").trim().toUpperCase());
          return vals.some(v =>
            v === "DD/MM/AAAA" || v === "DD/MM/AAAA (DATA CONTATO)" ||
            v.startsWith("EX:") || v === "M OU F" ||
            v === "NOME COMPLETO" || v.startsWith("SIGLA") ||
            v === "NUMERO DA CONTA"
          );
        };

        const mapped = json.slice(1)
          .filter(row => !isLinhaInstrucao(row))
          .map(row => {
            const nomeIdx = colMap[normStr("NOME")];
            const nome = String(nomeIdx !== undefined ? row[nomeIdx] : "").trim();
            if (!nome) return null;
            const obj: Partial<Row> = {};
            for (const [normKey, field] of Object.entries(NORM_MAP)) {
              const idx = colMap[normKey];
              if (idx === undefined) continue;
              const val = row[idx];
              if (val === undefined || val === null || String(val).trim() === "") continue;
              if (val instanceof Date && !isNaN(val.getTime())) {
                const d = val.getDate().toString().padStart(2, '0');
                const m = (val.getMonth() + 1).toString().padStart(2, '0');
                (obj as any)[field] = `${d}/${m}/${val.getFullYear()}`;
              } else {
                const s = String(val).trim();
                if (s === "0" || s === "") continue;
                if (field === "cpf") {
                  const digits = s.replace(/\D/g, "").padStart(11, "0").slice(-11);
                  (obj as any)[field] = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
                } else if (field.startsWith("ddd")) {
                  const digits = s.replace(/\D/g, "");
                  if (digits) (obj as any)[field] = digits;
                } else if (field.startsWith("tel")) {
                  const digits = s.replace(/\D/g, "");
                  if (digits && digits !== "0") {
                    (obj as any)[field] = digits.length >= 9
                      ? `${digits.slice(0,5)}-${digits.slice(5,9)}`
                      : `${digits.slice(0,4)}-${digits.slice(4,8)}`;
                  }
                } else {
                  (obj as any)[field] = s;
                }
              }
            }
            return obj;
          })
          .filter((r): r is Partial<Row> => !!r && !!r.nome);

        if (mapped.length === 0) { toast.warning("Nenhum registro válido encontrado."); return; }

        // Envia em lotes de 500 para não dar timeout
        const LOTE = 500;
        const totalLotes = Math.ceil(mapped.length / LOTE);
        setImportando(true);
        let totalInseridos = 0;
        for (let i = 0; i < totalLotes; i++) {
          const lote = mapped.slice(i * LOTE, (i + 1) * LOTE);
          setImportProgress(`Importando lote ${i + 1}/${totalLotes} (${Math.round(((i+1)/totalLotes)*100)}%)...`);
          const res = await importar.mutateAsync(lote as any);
          totalInseridos += res.inseridos;
        }
        setImportando(false);
        setImportProgress("");
        utils.mailingCrm.list.invalidate();
        utils.mailingCrm.count.invalidate();
        toast.success(`✅ ${totalInseridos} registros importados com sucesso!`);
      } catch (err: any) {
        setImportando(false);
        setImportProgress("");
        toast.error("Erro ao importar: " + (err?.message ?? "Erro desconhecido"));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const openNew = () => { setEditRow(EMPTY); setModal("new"); };
  const openEdit = (r: Row) => { setEditRow({ ...r }); setModal("edit"); };
  const handleSave = () => {
    if (modal === "new") criar.mutate(editRow as any);
    else if (modal === "edit" && editRow.id) editar.mutate(editRow as any);
  };

  const fld = (key: keyof Row, label: string, span = 1) => (
    <div className={`col-span-${span}`}>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <Input
        value={(editRow[key] as string) ?? ""}
        onChange={e => setEditRow(p => ({ ...p, [key]: e.target.value }))}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <div className="p-4 space-y-4 bg-gray-800 min-h-screen">
      <PageHeader title="Mailing CRM" actions={
        <div className="flex gap-1.5 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={() => !importando && fileRef.current?.click()} disabled={importando} className="gap-1 border-blue-400 text-blue-300 hover:bg-blue-400/20 bg-transparent text-[10px] h-6 px-2">
            <Upload className="w-3 h-3" /> {importando ? "..." : "Importar"}
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          {!isPromotor && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1 border-green-400 text-green-300 hover:bg-green-400/20 bg-transparent text-[10px] h-6 px-2">
              <Download className="w-3 h-3" /> Exportar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setConfirmLimpeza('falecidos')} className="gap-1 border-red-400 text-red-300 hover:bg-red-400/20 bg-transparent text-[10px] h-6 px-2">
            Falecidos {contagem?.falecidos ? `(${contagem.falecidos})` : ''}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmLimpeza('acima78')} className="gap-1 border-orange-400 text-orange-300 hover:bg-orange-400/20 bg-transparent text-[10px] h-6 px-2">
            +78 anos {contagem?.acima78 ? `(${contagem.acima78})` : ''}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmDedup(true)} className="gap-1 border-purple-400 text-purple-300 hover:bg-purple-400/20 bg-transparent text-[10px] h-6 px-2">
            Deduplicar {contagemDup?.registrosAfetados ? `(${contagemDup.registrosAfetados})` : ''}
          </Button>
          <Button size="sm" onClick={openNew} className="gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] h-6 px-2">
            + Novo
          </Button>
        </div>
      } />

      {/* Filtros */}
      <div className="bg-gray-900 rounded-xl border border-gray-700-sm border border-gray-700 p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Input
          placeholder="🔍 Nome ou CPF..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Agente..."
          value={filtAgente}
          onChange={e => { setFiltAgente(e.target.value); setPage(0); }}
          className="h-8 text-sm"
        />
        <Select value={filtUf || "todos"} onValueChange={v => { setFiltUf(v === "todos" ? "" : v); setPage(0); }}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos UF</SelectItem>
            {filtros?.ufs.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Cidade..."
          value={filtCidade}
          onChange={e => { setFiltCidade(e.target.value); setPage(0); }}
          className="h-8 text-sm"
        />
        <Select value={filtResultado || "todos"} onValueChange={v => { setFiltResultado(v === "todos" ? "" : v); setPage(0); }}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Resultados</SelectItem>
            {filtros?.resultados.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtCampanha || "todos"} onValueChange={v => { setFiltCampanha(v === "todos" ? "" : v); setPage(0); }}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas Campanhas</SelectItem>
            {filtros?.campanhas.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtNaoPerturbe} onValueChange={v => { setFiltNaoPerturbe(v as "todos" | "bloqueados" | "liberados"); setPage(0); }}>
          <SelectTrigger className="h-8 text-sm border-red-200">
            <SelectValue placeholder="Não Pertube" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos (Não Pertube)</SelectItem>
            <SelectItem value="bloqueados">⛔ Bloqueados</SelectItem>
            <SelectItem value="liberados">✓ Liberados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela estilo Consignado — linhas largas */}
      <div className="bg-gray-900 rounded-xl border border-gray-700-sm border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900/20 border-b border-blue-100 text-xs text-blue-700 uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left font-semibold">Cliente</th>
              <th className="px-3 py-2.5 text-left font-semibold">Telefones</th>
              <th className="px-3 py-2.5 text-left font-semibold">Localização / C/C</th>
              <th className="px-3 py-2.5 text-left font-semibold">Datas</th>
              <th className="px-3 py-2.5 text-left font-semibold">Resultado</th>
              <th className="px-3 py-2.5 text-center font-semibold w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhum registro encontrado.</td></tr>
            ) : rowsFiltrados.map((r, i) => {
              const tels = fones(r as Row);
              return (
                <tr
                  key={r.id}
                  className={`border-b border-gray-100 hover:bg-blue-900/30/40 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-blue-900/20/20"}`}
                >
                  {/* Coluna 1: Cliente */}
                  {(() => {
                    const cpfNorm = (r.cpf ?? "").replace(/\D/g, "");
                    const bloqueadoPorLista = cpfNorm.length === 11 && cpfsBloqueados.has(cpfNorm);
                    const motivoBloqueio = bloqueadoPorLista ? cpfsBloqueados.get(cpfNorm) : null;
                    const bloqueadoLegado = r.naoPerturbe && r.naoPerturbe !== "SEM RESTRIÇÃO";
                    return (
                      <td className="px-3 py-2.5 min-w-[180px]">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="font-semibold text-white text-[13px]">{r.nome ?? "—"}</span>
                          {r.sexo && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${r.sexo === "M" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                              {r.sexo}
                            </span>
                          )}
                          {bloqueadoPorLista && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold">
                              ⛔ NÃO PERTUBE
                            </span>
                          )}
                          {!bloqueadoPorLista && cpfNorm.length === 11 && naoPerturbeData && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                              ✓ OK
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {r.cpf && <span className="font-mono">{formatCpf(r.cpf)}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.dtaNasc && <span className="text-[10px] text-gray-400">Nasc: {r.dtaNasc}</span>}
                          {r.idade != null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                              {r.idade} anos
                            </span>
                          )}
                        </div>
                        {bloqueadoPorLista && motivoBloqueio && (
                          <div className="text-[10px] text-red-500 mt-0.5">⛔ {motivoBloqueio}</div>
                        )}
                        {!bloqueadoPorLista && bloqueadoLegado && (
                          <div className="text-[10px] text-red-500 mt-0.5">⛔ {r.naoPerturbe}</div>
                        )}
                      </td>
                    );
                  })()}

                  {/* Coluna 2: Telefones — oculto se NÃO PERTUBE */}
                  <td className="px-3 py-2.5 min-w-[180px]">
                    {(() => {
                      const np = (r.naoPerturbe ?? '').toLowerCase().trim();
                      const bloqueado = np !== '' && np !== 'sem restrição' && np !== 'sem restricao';
                      if (bloqueado) {
                        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">🚫 NÃO PERTUBE</span>;
                      }
                      return tels.length > 0 ? (
                        <div className="space-y-0.5">
                          {tels.slice(0, 4).map((t, idx) => (
                            <div key={idx} className="text-[11px] text-green-700 font-mono font-medium">{t}</div>
                          ))}
                          {tels.length > 4 && (
                            <div className="text-[10px] text-gray-400">+{tels.length - 4} mais</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-100">—</span>
                      );
                    })()}
                  </td>

                  {/* Coluna 3: Localização */}
                  <td className="px-3 py-2.5 min-w-[130px]">
                    <div className="flex items-center gap-1">
                      {r.cidade && <span className="text-[12px] text-white font-medium">{r.cidade}</span>}
                      {r.sgUf && <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-100 font-bold">{r.sgUf}</span>}
                    </div>
                    {r.dtInclusao && <div className="text-[10px] text-gray-400">Incl: {r.dtInclusao}</div>}
                    {r.prfDepe && <div className="text-[10px] text-gray-400">Prf: {r.prfDepe}</div>}
                    {r.nrCc && <div className="text-[10px] text-gray-400 font-mono">C/C: {r.nrCc}</div>}
                  </td>

                  {/* Coluna 4: Contato / Datas */}
                  <td className="px-3 py-2.5 min-w-[140px]">
                    {r.dataContato && <div className="text-[11px] text-white">Contato: {r.dataContato}</div>}
                    {r.dataInserido && <div className="text-[10px] text-gray-400">Inserido: {r.dataInserido}</div>}
                  </td>

                  {/* Coluna 6: Resultado */}
                  <td className="px-3 py-2.5 min-w-[130px]">
                    {resultadoBadge(r.resultado)}
                    {r.observacao && (
                      <div className="text-[10px] text-gray-400 mt-1 max-w-[150px] truncate" title={r.observacao}>
                        {r.observacao}
                      </div>
                    )}
                  </td>

                  {/* Coluna 7: Ações */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => openEdit(r as Row)}
                        className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDel(r.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
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
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Página {page + 1} de {totalPages} — {total} registros</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(0)} className="h-7 px-2 text-xs">«</Button>
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 px-3 text-xs">‹ Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 px-3 text-xs">Próximo ›</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className="h-7 px-2 text-xs">»</Button>
          </div>
        </div>
      )}

      {/* Confirm Deduplicar CPF */}
      <Dialog open={confirmDedup} onOpenChange={o => !o && setConfirmDedup(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🔄 Deduplicar CPFs</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-100">
            Foram encontrados <strong>{contagemDup?.duplicados ?? 0} CPF(s)</strong> com registros duplicados
            ({contagemDup?.registrosAfetados ?? 0} registro(s) serão removidos).
            <br /><br />
            O sistema irá <strong>mesclar os telefones únicos</strong> de todos os duplicados no registro mais antigo
            e depois excluir as cópias. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDedup(false)}>Cancelar</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={deduplicarCpf.isPending || (contagemDup?.registrosAfetados ?? 0) === 0}
              onClick={() => deduplicarCpf.mutate()}
            >
              {deduplicarCpf.isPending ? 'Processando...' : 'Confirmar e Deduplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Limpeza em Lote */}
      <Dialog open={confirmLimpeza !== null} onOpenChange={o => !o && setConfirmLimpeza(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmLimpeza === 'falecidos' ? '🪦 Remover Falecidos' : '👴 Remover maiores de 78 anos'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-100">
            {confirmLimpeza === 'falecidos'
              ? `Isso irá excluir permanentemente ${contagem?.falecidos ?? 0} registro(s) identificados como falecidos (campo NÃO PERTUBE contém indicação de óbito). Esta ação não pode ser desfeita.`
              : `Isso irá excluir permanentemente ${contagem?.acima78 ?? 0} registro(s) com mais de 78 anos calculados pela data de nascimento. Esta ação não pode ser desfeita.`
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLimpeza(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={removerFalecidos.isPending || removerAcima78.isPending}
              onClick={() => {
                if (confirmLimpeza === 'falecidos') removerFalecidos.mutate();
                else removerAcima78.mutate();
              }}
            >
              {(removerFalecidos.isPending || removerAcima78.isPending) ? 'Removendo...' : 'Confirmar e Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={confirmDel !== null} onOpenChange={o => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-100">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDel && deletar.mutate({ id: confirmDel })} disabled={deletar.isPending}>
              {deletar.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Criar/Editar */}
      <Dialog open={modal !== null} onOpenChange={o => !o && setModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modal === "new" ? "Novo Registro" : "Editar Registro"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 py-2">
            {fld("nome", "Nome", 3)}
            {fld("sexo", "Sexo (M/F)", 1)}
            {fld("dtaNasc", "Data Nasc. (DD/MM/AAAA)", 2)}
            {fld("cpf", "CPF", 2)}
            {fld("cidade", "Cidade", 2)}
            {fld("sgUf", "UF", 1)}
            {fld("nrCc", "NR C/C", 1)}
            {fld("naoPerturbe", "Não Perturbe", 2)}
            {fld("dtInclusao", "Dt. Inclusão", 2)}
            {fld("prfDepe", "Prf Depe", 2)}
            {fld("dataContato", "Data Contato", 2)}
            {fld("resultado", "Resultado", 2)}
            {fld("dataInserido", "Data Inserido", 2)}
            {/* Telefones */}
            {([1,2,3,4,5,6,7,8,9,10] as const).map(n => {
              const pad = String(n).padStart(2, "0");
              return (
                <div key={n} className="col-span-2 grid grid-cols-2 gap-1">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">DDD {n}</label>
                    <Input value={(editRow[`ddd${pad}` as keyof Row] as string) ?? ""} onChange={e => setEditRow(p => ({ ...p, [`ddd${pad}`]: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Telefone {n}</label>
                    <Input value={(editRow[`tel${pad}` as keyof Row] as string) ?? ""} onChange={e => setEditRow(p => ({ ...p, [`tel${pad}`]: e.target.value }))} className="h-8 text-sm" />
                  </div>
                </div>
              );
            })}
            <div className="col-span-4">
              <label className="text-xs text-gray-400 mb-1 block">Observação</label>
              <textarea
                value={(editRow.observacao as string) ?? ""}
                onChange={e => setEditRow(p => ({ ...p, observacao: e.target.value }))}
                className="w-full border border-gray-700 rounded-md text-sm p-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={criar.isPending || editar.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {criar.isPending || editar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
