import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

// Monta lista de telefones com DDD
function fones(row: Row): string[] {
  const pares: [string | null | undefined, string | null | undefined][] = [
    [row.ddd01, row.tel01], [row.ddd02, row.tel02], [row.ddd03, row.tel03],
    [row.ddd04, row.tel04], [row.ddd05, row.tel05], [row.ddd06, row.tel06],
    [row.ddd07, row.tel07], [row.ddd08, row.tel08], [row.ddd09, row.tel09],
    [row.ddd10, row.tel10],
  ];
  return pares
    .filter(([, t]) => t && t !== "0")
    .map(([d, t]) => d && d !== "0" ? `(${d}) ${t}` : String(t));
}

// Mapeamento Excel → campos
const EXCEL_MAP: Record<string, keyof Row> = {
  "SEXO": "sexo",
  "MCI_EMPREGADOR_CADASTRO": "mciEmpregador",
  "NR_CVN_13_SALARIO": "nrCvn13Salario",
  "NR_CVN_CONSIG": "nrCvnConsig",
  "NR_CVN_SALARIO": "nrCvnSalario",
  "SG_UF": "sgUf",
  "SUPER": "super",
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
  "MCI": "mci",
  "CD_IDFR_BNFC": "cdIdfr",
  "DT_PRIMEIRO_PAGTO": "dtPrimeiroPagto",
  "MAIOR_LIMITE_DE_CREDITO_NOVO": "maiorLimiteCredito",
  "Cod_COBAN": "codCoban",
  "CAMPANHA": "campanha",
  "AGENTE": "agente",
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
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{resultado}</span>;
}

export default function MailingCrm() {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [filtAgente, setFiltAgente] = useState("");
  const [filtUf, setFiltUf] = useState("");
  const [filtCidade, setFiltCidade] = useState("");
  const [filtResultado, setFiltResultado] = useState("");
  const [filtCampanha, setFiltCampanha] = useState("");
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
    onSuccess: (r) => { utils.mailingCrm.list.invalidate(); utils.mailingCrm.count.invalidate(); toast.success(`${r.inseridos} registros importados!`); },
    onError: (e) => toast.error("Erro ao importar: " + e.message),
  });

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
      "UF": r.sgUf ?? "",
      "SUPER": r.super ?? "",
      "NR_C/C": r.nrCc ?? "",
      "NÃO PERTURBE": r.naoPerturbe ?? "",
      "DT INCLUSÃO": r.dtInclusao ?? "",
      "PRF_DEPE": r.prfDepe ?? "",
      "NR_CVN_CONSIG": r.nrCvnConsig ?? "",
      "NR_CVN_SALARIO": r.nrCvnSalario ?? "",
      "NR_CVN_13_SALARIO": r.nrCvn13Salario ?? "",
      "CD_IDFR_BNFC": r.cdIdfr ?? "",
      "DT_PRIMEIRO_PAGTO": r.dtPrimeiroPagto ?? "",
      "MAIOR_LIMITE_CREDITO": r.maiorLimiteCredito ?? "",
      "CAMPANHA": r.campanha ?? "",
      "AGENTE": r.agente ?? "",
      "DATA CONTATO": r.dataContato ?? "",
      "RESULTADO": r.resultado ?? "",
      "DATA INSERIDO": r.dataInserido ?? "",
      "DDD_01": r.ddd01 ?? "", "TEL_01": r.tel01 ?? "",
      "DDD_02": r.ddd02 ?? "", "TEL_02": r.tel02 ?? "",
      "DDD_03": r.ddd03 ?? "", "TEL_03": r.tel03 ?? "",
      "DDD_04": r.ddd04 ?? "", "TEL_04": r.tel04 ?? "",
      "DDD_05": r.ddd05 ?? "", "TEL_05": r.tel05 ?? "",
      "OBSERVAÇÃO": r.observacao ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mailing CRM");
    XLSX.writeFile(wb, `mailing_crm_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Importar Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const mapped = raw.map(r => {
        const obj: Partial<Row> = {};
        for (const [col, field] of Object.entries(EXCEL_MAP)) {
          const val = r[col];
          if (val !== undefined && val !== null && String(val).trim() !== "" && String(val) !== "0") {
            (obj as any)[field] = String(val).trim();
          }
        }
        return obj;
      }).filter(r => r.nome);
      if (mapped.length === 0) { toast.warning("Nenhum registro válido encontrado."); return; }
      importar.mutate(mapped as any);
    };
    reader.readAsBinaryString(file);
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
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <Input
        value={(editRow[key] as string) ?? ""}
        onChange={e => setEditRow(p => ({ ...p, [key]: e.target.value }))}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mailing / CRM</h1>
          <p className="text-gray-500 text-sm">{total} registros encontrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 border-blue-400 text-blue-600 hover:bg-blue-50">
            <Upload className="w-3.5 h-3.5" /> Importar Excel
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 border-green-500 text-green-600 hover:bg-green-50">
            <Download className="w-3.5 h-3.5" /> Exportar Excel
          </Button>
          <Button size="sm" onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            + Novo Registro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
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
      </div>

      {/* Tabela estilo Consignado — linhas largas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-50 border-b border-blue-100 text-xs text-blue-700 uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left font-semibold">Cliente</th>
              <th className="px-3 py-2.5 text-left font-semibold">Contato / Telefones</th>
              <th className="px-3 py-2.5 text-left font-semibold">Localização</th>
              <th className="px-3 py-2.5 text-left font-semibold">Dados Bancários</th>
              <th className="px-3 py-2.5 text-left font-semibold">Campanha / Agente</th>
              <th className="px-3 py-2.5 text-left font-semibold">Resultado</th>
              <th className="px-3 py-2.5 text-center font-semibold w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhum registro encontrado.</td></tr>
            ) : rows.map((r, i) => {
              const tels = fones(r as Row);
              return (
                <tr
                  key={r.id}
                  className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-blue-50/20"}`}
                >
                  {/* Coluna 1: Cliente */}
                  <td className="px-3 py-2.5 min-w-[180px]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-gray-800 text-[13px]">{r.nome ?? "—"}</span>
                      {r.sexo && (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${r.sexo === "M" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                          {r.sexo}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {r.cpf && <span className="font-mono">{r.cpf}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {r.dtaNasc && <span className="text-[10px] text-gray-400">Nasc: {r.dtaNasc}</span>}
                      {r.idade != null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                          {r.idade} anos
                        </span>
                      )}
                    </div>
                    {r.naoPerturbe && r.naoPerturbe !== "SEM RESTRIÇÃO" && (
                      <div className="text-[10px] text-red-500 mt-0.5">⛔ {r.naoPerturbe}</div>
                    )}
                  </td>

                  {/* Coluna 2: Telefones */}
                  <td className="px-3 py-2.5 min-w-[180px]">
                    {tels.length > 0 ? (
                      <div className="space-y-0.5">
                        {tels.slice(0, 4).map((t, idx) => (
                          <div key={idx} className="text-[11px] text-green-700 font-mono font-medium">{t}</div>
                        ))}
                        {tels.length > 4 && (
                          <div className="text-[10px] text-gray-400">+{tels.length - 4} mais</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </td>

                  {/* Coluna 3: Localização */}
                  <td className="px-3 py-2.5 min-w-[130px]">
                    <div className="flex items-center gap-1">
                      {r.cidade && <span className="text-[12px] text-gray-700 font-medium">{r.cidade}</span>}
                      {r.sgUf && <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">{r.sgUf}</span>}
                    </div>
                    {r.super && <div className="text-[10px] text-gray-400 mt-0.5">Super: {r.super}</div>}
                    {r.dtInclusao && <div className="text-[10px] text-gray-400">Incl: {r.dtInclusao}</div>}
                    {r.prfDepe && <div className="text-[10px] text-gray-400">Prf: {r.prfDepe}</div>}
                  </td>

                  {/* Coluna 4: Dados Bancários */}
                  <td className="px-3 py-2.5 min-w-[160px]">
                    {r.nrCc && <div className="text-[11px] text-gray-700 font-mono">C/C: {r.nrCc}</div>}
                    {r.cdIdfr && <div className="text-[10px] text-gray-500">IDFR: {r.cdIdfr}</div>}
                    {r.dtPrimeiroPagto && <div className="text-[10px] text-gray-500">1º Pagto: {r.dtPrimeiroPagto}</div>}
                    {r.maiorLimiteCredito && (
                      <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                        Limite: {r.maiorLimiteCredito}
                      </div>
                    )}
                    {r.nrCvnConsig && <div className="text-[10px] text-gray-400">CVN Consig: {r.nrCvnConsig}</div>}
                    {r.nrCvnSalario && <div className="text-[10px] text-gray-400">CVN Sal: {r.nrCvnSalario}</div>}
                    {r.nrCvn13Salario && <div className="text-[10px] text-gray-400">CVN 13: {r.nrCvn13Salario}</div>}
                  </td>

                  {/* Coluna 5: Campanha / Agente */}
                  <td className="px-3 py-2.5 min-w-[140px]">
                    {r.campanha && (
                      <div className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium inline-block mb-1">
                        {r.campanha}
                      </div>
                    )}
                    {r.agente && <div className="text-[12px] text-gray-700 font-medium">{r.agente}</div>}
                    {r.dataContato && <div className="text-[10px] text-gray-400 mt-0.5">Contato: {r.dataContato}</div>}
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
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Página {page + 1} de {totalPages} — {total} registros</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(0)} className="h-7 px-2 text-xs">«</Button>
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 px-3 text-xs">‹ Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 px-3 text-xs">Próximo ›</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className="h-7 px-2 text-xs">»</Button>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <Dialog open={confirmDel !== null} onOpenChange={o => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
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
            {fld("super", "Super", 1)}
            {fld("nrCc", "NR C/C", 2)}
            {fld("naoPerturbe", "Não Perturbe", 2)}
            {fld("dtInclusao", "Dt. Inclusão", 2)}
            {fld("prfDepe", "Prf Depe", 2)}
            {fld("cdIdfr", "CD IDFR BNFC", 2)}
            {fld("dtPrimeiroPagto", "1º Pagto", 2)}
            {fld("maiorLimiteCredito", "Maior Limite Crédito", 2)}
            {fld("nrCvnConsig", "CVN Consig", 2)}
            {fld("nrCvnSalario", "CVN Salário", 2)}
            {fld("nrCvn13Salario", "CVN 13 Salário", 2)}
            {fld("campanha", "Campanha", 2)}
            {fld("agente", "Agente", 2)}
            {fld("dataContato", "Data Contato", 2)}
            {fld("resultado", "Resultado", 2)}
            {fld("dataInserido", "Data Inserido", 2)}
            {/* Telefones */}
            {([1,2,3,4,5,6,7,8,9,10] as const).map(n => {
              const pad = String(n).padStart(2, "0");
              return (
                <div key={n} className="col-span-2 grid grid-cols-2 gap-1">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">DDD {n}</label>
                    <Input value={(editRow[`ddd${pad}` as keyof Row] as string) ?? ""} onChange={e => setEditRow(p => ({ ...p, [`ddd${pad}`]: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Telefone {n}</label>
                    <Input value={(editRow[`tel${pad}` as keyof Row] as string) ?? ""} onChange={e => setEditRow(p => ({ ...p, [`tel${pad}`]: e.target.value }))} className="h-8 text-sm" />
                  </div>
                </div>
              );
            })}
            <div className="col-span-4">
              <label className="text-xs text-gray-500 mb-1 block">Observação</label>
              <textarea
                value={(editRow.observacao as string) ?? ""}
                onChange={e => setEditRow(p => ({ ...p, observacao: e.target.value }))}
                className="w-full border border-gray-200 rounded-md text-sm p-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
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
