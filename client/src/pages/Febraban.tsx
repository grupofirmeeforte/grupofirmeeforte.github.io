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
import { Search, Upload, Edit2, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";

// Converte número MESANO (ex: 126) para string legível (ex: "01/2026")
function mesanoToStr(mesano: number | null | undefined): string {
  if (!mesano) return "-";
  const s = String(mesano);
  const mes = s.slice(0, s.length - 2).padStart(2, "0");
  const ano = "20" + s.slice(-2);
  return `${mes}/${ano}`;
}

function formatCurrency(val: string | number | null | undefined): string {
  if (val == null || val === "") return "-";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "-";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  createdAt: Date;
  updatedAt: Date;
};

export default function FebrabanPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("__all__");
  const [mesano, setMesano] = useState<number | undefined>();
  const [situacao, setSituacao] = useState("__all__");
  const [operador, setOperador] = useState("__all__");
  const [page, setPage] = useState(0);

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
  };

  const { data: rows, refetch } = trpc.febraban.list.useQuery(queryParams);
  const { data: total } = trpc.febraban.count.useQuery({
    search: search || undefined,
    empresa: empresa !== "__all__" ? empresa : undefined,
    mesano: mesano,
    situacao: situacao !== "__all__" ? situacao : undefined,
    operador: operador !== "__all__" ? operador : undefined,
  });
  const { data: filtros } = trpc.febraban.filtros.useQuery();

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
    },
    onError: (err) => alert(`Erro ao salvar: ${err.message}`),
  });

  const deleteMutation = trpc.febraban.delete.useMutation({
    onSuccess: () => {
      utils.febraban.list.invalidate();
      utils.febraban.count.invalidate();
    },
    onError: (err) => alert(`Erro ao excluir: ${err.message}`),
  });

  const totalPages = total ? Math.ceil(total / LIMIT) : 0;

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
        const toDate = (v: any): string | undefined => {
          if (!v) return undefined;
          if (v instanceof Date && !isNaN(v.getTime())) {
            const d = String(v.getDate()).padStart(2, "0");
            const m = String(v.getMonth() + 1).padStart(2, "0");
            const y = v.getFullYear();
            return `${d}/${m}/${y}`;
          }
          // fallback: string já formatada
          return String(v).trim() || undefined;
        };

        const registros: any[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.every((c: any) => c === null || c === undefined || c === "")) continue;

          const propostaRaw = col(row, "PROPOSTA");
          if (propostaRaw === undefined || propostaRaw === null || propostaRaw === "") continue;
          const proposta = String(typeof propostaRaw === "number" ? Math.round(propostaRaw) : propostaRaw).trim();

          const financiado = toNum(col(row, "FINANCIADO"));
          const trocoRaw   = toNum(col(row, "TROCO"));
          // TROCO=0 → usar FINANCIADO como bruto
          const troco = (!trocoRaw || trocoRaw === 0) ? financiado : trocoRaw;

          const mesanoRaw = col(row, "MESANO");
          const mesano = mesanoRaw !== undefined && mesanoRaw !== "" ? (parseInt(String(mesanoRaw)) || undefined) : undefined;

          registros.push({
            empresa:    col(row, "EMPRESA")  ? String(col(row, "EMPRESA")).trim()  : undefined,
            mesano,
            proposta,
            linha:      col(row, "LINHA")    ? (parseInt(String(col(row, "LINHA"))) || undefined) : undefined,
            situacao:   (() => { const v = col(row, "SITUACAO"); return v != null && v !== "" ? String(v).trim() : undefined; })(),
            operador:   col(row, "OPERADOR") ? String(col(row, "OPERADOR")).trim() : undefined,
            solicitacao: toDate(col(row, "SOLICITACAO") ?? col(row, "SOLICITAÇÃO")),
            prazo:      col(row, "PRAZO")    ? String(col(row, "PRAZO")).trim()    : undefined,
            troco,
            financiado,
            situacao2:  undefined,
          });
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
    });
  }

  function handleDelete(id: number, proposta: string) {
    if (confirm(`Excluir o registro da proposta ${proposta}?`)) {
      deleteMutation.mutate({ id });
    }
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Febraban — Produção BB</h1>
          <p className="text-gray-600 mt-1">
            {total != null ? `Total: ${total.toLocaleString("pt-BR")} registros` : "Carregando..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/")}>← Voltar</Button>
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

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
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
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">SITUAÇÃO</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">TIPO</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {!rows ? (
                  <tr><td colSpan={12} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50 transition-colors">
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
                      <td className="px-3 py-2">{situacaoBadge(row.situacao)}</td>
                      <td className="px-3 py-2 text-center">{tipoBadge(row.situacao, row.troco, row.financiado)}</td>
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

      {/* Modal Importação */}
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
