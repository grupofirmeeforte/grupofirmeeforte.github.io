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

  // Parse Excel file
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "DD/MM/YYYY" });

      // First row is header
      const headers = (json[0] || []).map((h: any) => String(h).trim().toUpperCase());
      const colMap: Record<string, number> = {};
      headers.forEach((h: string, i: number) => { colMap[h] = i; });

      // Helper: parse number safely
      const parseNum = (v: any): number | undefined => {
        if (v === undefined || v === null || v === "") return undefined;
        const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\./g, "").replace(",", "."));
        return isNaN(n) ? undefined : n;
      };

      const registros: any[] = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;

        const get = (col: string) => {
          const idx = colMap[col];
          return idx !== undefined ? row[idx] : undefined;
        };

        const propostaRaw = get("PROPOSTA");
        if (propostaRaw === undefined || propostaRaw === null || propostaRaw === "") continue;
        // Proposta pode ser número inteiro no Excel — converter para string
        const proposta = String(propostaRaw).trim();

        // Parse date: xlsx com cellDates=true retorna Date object
        let solicitacao: string | undefined;
        const solRaw = get("SOLICITAÇÃO") || get("SOLICITACAO");
        if (solRaw) {
          if (solRaw instanceof Date) {
            solicitacao = solRaw.toLocaleDateString("pt-BR");
          } else {
            solicitacao = String(solRaw).trim() || undefined;
          }
        }

        const mesanoRaw = get("MESANO");
        const mesanoNum = mesanoRaw !== undefined && mesanoRaw !== "" ? parseInt(String(mesanoRaw)) : undefined;

        const finRaw = get("FINANCIADO");
        const financiado = parseNum(finRaw);

        const trocoRaw = get("TROCO");
        let troco = parseNum(trocoRaw);
        // Quando TROCO é 0 ou vazio, usar valor de FINANCIADO (bruto)
        if (!troco && financiado) {
          troco = financiado;
        }

        // Situação2 é a 11ª coluna (índice 10) com header 'Situação'
        const sit2Raw = get("SITUAÇÃO2") || get("SITUACAO2") || get("SITUAÇÃO2") || (headers.length >= 11 ? row[10] : undefined);
        const situacao2 = sit2Raw ? String(sit2Raw).trim() || undefined : undefined;

        registros.push({
          empresa: get("EMPRESA") ? String(get("EMPRESA")).trim() : undefined,
          mesano: mesanoNum !== undefined && !isNaN(mesanoNum) ? mesanoNum : undefined,
          proposta,
          linha: get("LINHA") ? parseInt(String(get("LINHA"))) || undefined : undefined,
          situacao: (get("SITUAÇÃO") || get("SITUACAO")) ? String(get("SITUAÇÃO") || get("SITUACAO")).trim() : undefined,
          operador: get("OPERADOR") ? String(get("OPERADOR")).trim() : undefined,
          solicitacao,
          prazo: get("PRAZO") ? String(get("PRAZO")).trim() : undefined,
          troco,
          financiado,
          situacao2,
        });
      }

      setImportData(registros);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImport() {
    if (importData.length === 0) {
      alert("Nenhum registro válido encontrado no arquivo.");
      return;
    }
    importarMutation.mutate({ modo: importModo, registros: importData });
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
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">SITUAÇÃO 2</th>
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
                      <td className="px-3 py-2">{row.situacao2 || "-"}</td>
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
      <Dialog open={importModal} onOpenChange={setImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Importar Relatório BB (Excel)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Modo de importação */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Modo de importação</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportModo("novo")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    importModo === "novo"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-sm">Novo</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Adiciona apenas registros com propostas novas. Ignora os que já existem.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportModo("subscrever")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    importModo === "subscrever"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-sm">Subscrever</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Adiciona novos E atualiza os existentes pelo número da proposta.
                  </div>
                </button>
              </div>
            </div>

            {/* Upload */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Arquivo Excel (.xlsx)</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {importFileName ? (
                  <div>
                    <p className="text-green-700 font-medium">{importFileName}</p>
                    <p className="text-sm text-gray-500 mt-1">{importData.length} registros encontrados</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Clique para selecionar o arquivo Excel</p>
                    <p className="text-xs text-gray-400 mt-1">Formato: EMPRESA, MESANO, PROPOSTA, LINHA, SITUAÇÃO, OPERADOR, SOLICITAÇÃO, PRAZO, TROCO, FINANCIADO</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Resultado */}
            {importResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-green-800">Importação concluída!</p>
                <div className="mt-1 space-y-0.5 text-green-700">
                  <p>✅ Adicionados: <strong>{importResult.adicionados}</strong></p>
                  <p>🔄 Atualizados: <strong>{importResult.atualizados}</strong></p>
                  <p>⏭ Ignorados: <strong>{importResult.ignorados}</strong></p>
                  <p>Total processados: <strong>{importResult.total}</strong></p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModal(false)}>Fechar</Button>
            <Button
              onClick={handleImport}
              disabled={importData.length === 0 || importarMutation.isPending}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {importarMutation.isPending ? "Importando..." : `Importar ${importData.length} registros`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
