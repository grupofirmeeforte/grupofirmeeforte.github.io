import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Monta telefones em string legível
function fones(row: Row): string {
  const pares = [
    [row.ddd01, row.tel01], [row.ddd02, row.tel02], [row.ddd03, row.tel03],
    [row.ddd04, row.tel04], [row.ddd05, row.tel05],
  ];
  return pares
    .filter(([d, t]) => t && t !== "0")
    .map(([d, t]) => d && d !== "0" ? `(${d}) ${t}` : t)
    .join(" | ");
}

// ─── Mapeamento de colunas Excel → campos ─────────────────────────────────────
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
  const { data: exportData } = trpc.mailingCrm.exportarTodos.useQuery(filters, { enabled: false });

  const criar = trpc.mailingCrm.criar.useMutation({
    onSuccess: () => { utils.mailingCrm.list.invalidate(); utils.mailingCrm.count.invalidate(); setModal(null); toast.success("Registro criado!"); },
  });
  const editar = trpc.mailingCrm.editar.useMutation({
    onSuccess: () => { utils.mailingCrm.list.invalidate(); setModal(null); toast.success("Registro atualizado!"); },
  });
  const deletar = trpc.mailingCrm.deletar.useMutation({
    onSuccess: () => { utils.mailingCrm.list.invalidate(); utils.mailingCrm.count.invalidate(); toast.success("Registro excluído!"); },
  });
  const importar = trpc.mailingCrm.importar.useMutation({
    onSuccess: (r) => { utils.mailingCrm.list.invalidate(); utils.mailingCrm.count.invalidate(); toast.success(`${r.inseridos} registros importados!`); },
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  // Exportar Excel
  const handleExport = async () => {
    const all = await utils.mailingCrm.exportarTodos.fetch(filters);
    if (!all || all.length === 0) { toast.warning("Nenhum dado para exportar."); return; }
    const ws = XLSX.utils.json_to_sheet(all.map(r => ({
      "NOME": r.nome ?? "",
      "IDADE": r.idade ?? "",
      "DTA_NASC": r.dtaNasc ?? "",
      "CPF": r.cpf ?? "",
      "SEXO": r.sexo ?? "",
      "CIDADE": r.cidade ?? "",
      "UF": r.sgUf ?? "",
      "TELEFONES": fones(r as Row),
      "AGENTE": r.agente ?? "",
      "CAMPANHA": r.campanha ?? "",
      "RESULTADO": r.resultado ?? "",
      "DATA CONTATO": r.dataContato ?? "",
      "DATA INSERIDO": r.dataInserido ?? "",
      "NR_C/C": r.nrCc ?? "",
      "MCI": r.mci ?? "",
      "SUPER": r.super ?? "",
      "NÃO PERTURBE": r.naoPerturbe ?? "",
      "DT INCLUSÃO": r.dtInclusao ?? "",
      "PRF_DEPE": r.prfDepe ?? "",
      "MCI_EMPREGADOR": r.mciEmpregador ?? "",
      "NR_CVN_CONSIG": r.nrCvnConsig ?? "",
      "NR_CVN_SALARIO": r.nrCvnSalario ?? "",
      "NR_CVN_13_SALARIO": r.nrCvn13Salario ?? "",
      "CD_IDFR_BNFC": r.cdIdfr ?? "",
      "DT_PRIMEIRO_PAGTO": r.dtPrimeiroPagto ?? "",
      "MAIOR_LIMITE_CREDITO": r.maiorLimiteCredito ?? "",
      "Cod_COBAN": r.codCoban ?? "",
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
  const openEdit = (r: Row) => { setEditRow(r); setModal("edit"); };
  const handleSave = () => {
    if (modal === "new") criar.mutate(editRow as any);
    else if (modal === "edit" && editRow.id) editar.mutate(editRow as any);
  };

  const field = (key: keyof Row, label: string, small = false) => (
    <div className={small ? "col-span-1" : "col-span-2"}>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <Input
        value={(editRow[key] as string) ?? ""}
        onChange={e => setEditRow(p => ({ ...p, [key]: e.target.value }))}
        className="bg-gray-800 border-gray-600 text-white text-sm h-8"
      />
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Mailing / CRM</h1>
          <p className="text-gray-400 text-sm">Total: {total} registros</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="border-blue-500 text-blue-400 hover:bg-blue-900">
            Importar Excel
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={handleExport} className="border-green-500 text-green-400 hover:bg-green-900">
            Exportar Excel
          </Button>
          <Button size="sm" onClick={openNew} className="bg-yellow-600 hover:bg-yellow-700 text-white">
            + Novo Registro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Input
          placeholder="Buscar nome ou CPF..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="bg-gray-700 border-gray-600 text-white text-sm h-8"
        />
        <Input
          placeholder="Agente..."
          value={filtAgente}
          onChange={e => { setFiltAgente(e.target.value); setPage(0); }}
          className="bg-gray-700 border-gray-600 text-white text-sm h-8"
        />
        <Select value={filtUf || "todos"} onValueChange={v => { setFiltUf(v === "todos" ? "" : v); setPage(0); }}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-8">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="todos">Todos UF</SelectItem>
            {filtros?.ufs.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Cidade..."
          value={filtCidade}
          onChange={e => { setFiltCidade(e.target.value); setPage(0); }}
          className="bg-gray-700 border-gray-600 text-white text-sm h-8"
        />
        <Select value={filtResultado || "todos"} onValueChange={v => { setFiltResultado(v === "todos" ? "" : v); setPage(0); }}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-8">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="todos">Todos Resultados</SelectItem>
            {filtros?.resultados.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtCampanha || "todos"} onValueChange={v => { setFiltCampanha(v === "todos" ? "" : v); setPage(0); }}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-8">
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="todos">Todas Campanhas</SelectItem>
            {filtros?.campanhas.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-xs text-gray-200 min-w-[1800px]">
          <thead>
            <tr className="bg-gray-800 text-gray-400 uppercase text-[10px]">
              <th className="px-2 py-2 text-left sticky left-0 bg-gray-800 z-10 min-w-[180px]">Nome</th>
              <th className="px-2 py-2 text-center min-w-[40px]">Sx</th>
              <th className="px-2 py-2 text-center min-w-[50px]">Idade</th>
              <th className="px-2 py-2 text-left min-w-[90px]">Nasc.</th>
              <th className="px-2 py-2 text-left min-w-[110px]">CPF</th>
              <th className="px-2 py-2 text-left min-w-[80px]">Cidade</th>
              <th className="px-2 py-2 text-center min-w-[40px]">UF</th>
              <th className="px-2 py-2 text-left min-w-[200px]">Telefones</th>
              <th className="px-2 py-2 text-left min-w-[100px]">Agente</th>
              <th className="px-2 py-2 text-left min-w-[100px]">Campanha</th>
              <th className="px-2 py-2 text-left min-w-[120px]">Resultado</th>
              <th className="px-2 py-2 text-left min-w-[80px]">Dt. Contato</th>
              <th className="px-2 py-2 text-left min-w-[80px]">Dt. Inserido</th>
              <th className="px-2 py-2 text-left min-w-[80px]">NR C/C</th>
              <th className="px-2 py-2 text-left min-w-[80px]">MCI</th>
              <th className="px-2 py-2 text-left min-w-[60px]">Super</th>
              <th className="px-2 py-2 text-left min-w-[80px]">Não Perturbe</th>
              <th className="px-2 py-2 text-left min-w-[80px]">Dt. Inclusão</th>
              <th className="px-2 py-2 text-left min-w-[60px]">Prf Depe</th>
              <th className="px-2 py-2 text-left min-w-[80px]">MCI Empreg.</th>
              <th className="px-2 py-2 text-left min-w-[80px]">CVN Consig</th>
              <th className="px-2 py-2 text-left min-w-[80px]">CVN Salário</th>
              <th className="px-2 py-2 text-left min-w-[80px]">CVN 13 Sal.</th>
              <th className="px-2 py-2 text-left min-w-[80px]">CD IDFR</th>
              <th className="px-2 py-2 text-left min-w-[80px]">1º Pagto</th>
              <th className="px-2 py-2 text-left min-w-[100px]">Maior Limite</th>
              <th className="px-2 py-2 text-left min-w-[70px]">Cod Coban</th>
              <th className="px-2 py-2 text-center min-w-[80px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={28} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={28} className="text-center py-8 text-gray-500">Nenhum registro encontrado.</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-t border-gray-700 hover:bg-gray-700/50 ${i % 2 === 0 ? "bg-gray-900" : "bg-gray-800/50"}`}
              >
                <td className="px-2 py-1.5 font-medium sticky left-0 bg-inherit z-10 whitespace-nowrap">{r.nome ?? "-"}</td>
                <td className="px-2 py-1.5 text-center">{r.sexo ?? "-"}</td>
                <td className="px-2 py-1.5 text-center">
                  {r.idade != null ? (
                    <Badge className="bg-blue-900/60 text-blue-300 text-[10px] px-1.5 py-0">{r.idade} anos</Badge>
                  ) : "-"}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.dtaNasc ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.cpf ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.cidade ?? "-"}</td>
                <td className="px-2 py-1.5 text-center">{r.sgUf ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-green-400">{fones(r as Row) || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.agente ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.campanha ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {r.resultado ? (
                    <span className="text-yellow-300">{r.resultado}</span>
                  ) : "-"}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.dataContato ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.dataInserido ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.nrCc ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.mci ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.super ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.naoPerturbe ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.dtInclusao ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.prfDepe ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.mciEmpregador ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.nrCvnConsig ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.nrCvnSalario ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.nrCvn13Salario ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.cdIdfr ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.dtPrimeiroPagto ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.maiorLimiteCredito ?? "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.codCoban ?? "-"}</td>
                <td className="px-2 py-1.5 text-center whitespace-nowrap">
                  <button onClick={() => openEdit(r as Row)} className="text-blue-400 hover:text-blue-300 mr-2 text-xs">Editar</button>
                  <button onClick={() => { if (confirm("Excluir este registro?")) deletar.mutate({ id: r.id }); }} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Página {page + 1} de {totalPages} — {total} registros</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(0)} className="border-gray-600 text-gray-300 h-7 text-xs">«</Button>
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="border-gray-600 text-gray-300 h-7 text-xs">‹ Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="border-gray-600 text-gray-300 h-7 text-xs">Próximo ›</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className="border-gray-600 text-gray-300 h-7 text-xs">»</Button>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Dialog open={modal !== null} onOpenChange={o => !o && setModal(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modal === "new" ? "Novo Registro CRM" : "Editar Registro"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-2">
            {field("nome", "Nome", false)}
            {field("sexo", "Sexo (M/F)", true)}
            {field("dtaNasc", "Data Nasc. (DD/MM/AAAA)", true)}
            {field("cpf", "CPF", true)}
            {field("cidade", "Cidade", false)}
            {field("sgUf", "UF", true)}
            {field("super", "Super", true)}
            {field("nrCc", "NR C/C", true)}
            {field("mci", "MCI", true)}
            {field("mciEmpregador", "MCI Empregador", true)}
            {field("nrCvnConsig", "CVN Consig", true)}
            {field("nrCvnSalario", "CVN Salário", true)}
            {field("nrCvn13Salario", "CVN 13 Sal.", true)}
            {field("naoPerturbe", "Não Perturbe", true)}
            {field("dtInclusao", "Dt. Inclusão", true)}
            {field("prfDepe", "Prf Depe", true)}
            {field("cdIdfr", "CD IDFR BNFC", true)}
            {field("dtPrimeiroPagto", "1º Pagto", true)}
            {field("maiorLimiteCredito", "Maior Limite Crédito", true)}
            {field("codCoban", "Cod COBAN", true)}
            {field("campanha", "Campanha", false)}
            {field("agente", "Agente", false)}
            {field("dataContato", "Data Contato", true)}
            {field("resultado", "Resultado", false)}
            {field("dataInserido", "Data Inserido", true)}
            {/* Telefones */}
            {([1,2,3,4,5,6,7,8,9,10] as const).map(n => {
              const pad = String(n).padStart(2, "0");
              return (
                <div key={n} className="col-span-2 grid grid-cols-2 gap-1">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">DDD {n}</label>
                    <Input value={(editRow[`ddd${pad}` as keyof Row] as string) ?? ""} onChange={e => setEditRow(p => ({ ...p, [`ddd${pad}`]: e.target.value }))} className="bg-gray-800 border-gray-600 text-white text-sm h-8" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tel {n}</label>
                    <Input value={(editRow[`tel${pad}` as keyof Row] as string) ?? ""} onChange={e => setEditRow(p => ({ ...p, [`tel${pad}`]: e.target.value }))} className="bg-gray-800 border-gray-600 text-white text-sm h-8" />
                  </div>
                </div>
              );
            })}
            <div className="col-span-4">
              <label className="text-xs text-gray-400 mb-1 block">Observação</label>
              <textarea
                value={(editRow.observacao as string) ?? ""}
                onChange={e => setEditRow(p => ({ ...p, observacao: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded p-2 h-20 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={handleSave} disabled={criar.isPending || editar.isPending} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              {criar.isPending || editar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
