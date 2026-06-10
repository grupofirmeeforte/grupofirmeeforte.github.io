import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PhoneOff, Plus, Trash2, Upload, Search, ShieldAlert, FileSpreadsheet, ArrowLeft } from "lucide-react";
import * as XLSX from "xlsx";
import PageHeader from "@/components/PageHeader";
import { useLocation } from "wouter";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

export default function NaoPerturbe() {
  useRegistrarModulo('Não Perturbe');
  const [, setLocation] = useLocation();
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [novoTel, setNovoTel] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [textoImportar, setTextoImportar] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.naoPerturbe.listar.useQuery({
    busca: busca || undefined,
    pagina,
    porPagina: 50,
  });

  const { data: contagem } = trpc.naoPerturbe.contar.useQuery();

  const adicionar = trpc.naoPerturbe.adicionar.useMutation({
    onSuccess: () => {
      toast.success("Registro adicionado à lista Não Perturbe");
      setModalAdicionar(false);
      setNovoTel("");
      setNovoMotivo("");
      utils.naoPerturbe.listar.invalidate();
      utils.naoPerturbe.contar.invalidate();
    },
    onError: (e) => {
      if (e.data?.code === "CONFLICT") toast.error("CPF/Telefone já está na lista");
      else toast.error("Erro ao adicionar: " + e.message);
    },
  });

  const remover = trpc.naoPerturbe.remover.useMutation({
    onSuccess: () => {
      toast.success("Registro removido da lista");
      utils.naoPerturbe.listar.invalidate();
      utils.naoPerturbe.contar.invalidate();
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const importarPlanilhaBB = trpc.naoPerturbe.importarPlanilhaBB.useMutation({
    onSuccess: (r) => {
      toast.success(`Importação concluída! ${r.inseridos} inseridos, ${r.atualizados} atualizados, ${r.ignorados} ignorados.`);
      setModalImportar(false);
      utils.naoPerturbe.listar.invalidate();
      utils.naoPerturbe.contar.invalidate();
    },
    onError: (e) => toast.error("Erro na importação: " + e.message),
  });

  function handleXlsxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        // Procurar aba "NÃO PERTUBE" ou usar a primeira
        const sheetName = wb.SheetNames.find(n => n.toUpperCase().includes("PERTUBE")) ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        // Linha 1 é aviso, linha 2 é cabeçalho, dados a partir da linha 3
        const raw = XLSX.utils.sheet_to_json<any>(ws, { header: 1, raw: false });
        // Encontrar linha do cabeçalho: deve ter célula EXATAMENTE "NOME" e "CPF"
        let headerIdx = -1;
        for (let i = 0; i < Math.min(raw.length, 10); i++) {
          const row = raw[i] as any[];
          if (!row) continue;
          const cells = row.map((c: any) => String(c ?? "").trim().toUpperCase());
          // Linha de cabeçalho tem exatamente "NOME" e "CPF" como células separadas
          if (cells.includes("NOME") && cells.includes("CPF")) {
            headerIdx = i;
            break;
          }
        }
        if (headerIdx === -1) { toast.error("Cabeçalho não encontrado. Use o template correto."); return; }
        const headers = (raw[headerIdx] as any[]).map(h => String(h ?? "").trim().toUpperCase());
        const idxNome = headers.findIndex(h => h === "NOME");
        const idxCpf = headers.findIndex(h => h === "CPF");
        const idxRec = headers.findIndex(h => h.includes("RECLAMA"));
        const idxData = headers.findIndex(h => h.includes("INCLUS"));
        const idxMun = headers.findIndex(h => h.includes("MUNIC"));
        const idxUf = headers.findIndex(h => h === "UF");
        const idxOcup = headers.findIndex(h => h.includes("OCUPA"));
        const idxNP = headers.findIndex(h => h.includes("PERTUBE") || h.includes("NÃO PERTURBE"));

        const registros = [];
        for (let i = headerIdx + 1; i < raw.length; i++) {
          const row = raw[i] as any[];
          if (!row || row.every(c => !c)) continue;
          const get = (idx: number) => idx >= 0 ? String(row[idx] ?? "").trim() : "";
          // Formatar data se for objeto Date
          let dataInclusao = get(idxData);
          if (row[idxData] instanceof Date) {
            dataInclusao = row[idxData].toLocaleDateString("pt-BR");
          }
          registros.push({
            nome: get(idxNome),
            cpf: get(idxCpf),
            reclamacao: get(idxRec),
            dataInclusao,
            municipio: get(idxMun),
            uf: get(idxUf),
            ocupacao: get(idxOcup),
            naoPerturbe: get(idxNP) || "NÃO PERTUBE",
          });
        }
        if (registros.length === 0) { toast.error("Nenhum registro encontrado na planilha."); return; }
        toast.info(`${registros.length} registros encontrados. Importando...`);
        importarPlanilhaBB.mutate(registros);
      } catch (err) {
        toast.error("Erro ao ler planilha: " + String(err));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.ceil(total / 50);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Não Perturbe" />

      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <div>
            <h1 className="text-lg font-bold text-gray-800">Lista Não Perturbe</h1>
            <p className="text-xs text-gray-500">Clientes que solicitaram não ser contatados</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalImportar(true)} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Importar Planilha BB
            </Button>
            <Button size="sm" onClick={() => setModalAdicionar(true)} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <PhoneOff className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-gray-800">{contagem?.total ?? 0}</p>
                <p className="text-xs text-gray-500">Registros na lista</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF, município..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1); }}
            className="pl-10"
          />
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-800">
              {total} registro{total !== 1 ? "s" : ""} na lista
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">Nome</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">CPF</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">Município/UF</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">Ocupação</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">Inclusão</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">Reclamação</th>
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold">Origem</th>
                    <th className="text-center px-3 py-2 text-gray-600 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center p-8 text-gray-400">Carregando...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-8 text-gray-400">
                      {busca ? "Nenhum resultado encontrado" : "Lista vazia — importe a planilha BB ou adicione manualmente"}
                    </td></tr>
                  ) : rows.map(row => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="font-medium text-gray-800 text-xs">{row.nome || "—"}</span>
                        </div>
                        {row.telefoneFormatado && row.telefoneFormatado !== '' && (
                          <div className="text-xs text-gray-400 ml-5">{row.telefoneFormatado}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 font-mono">{row.cpf || "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {row.municipio ? `${row.municipio}${row.uf ? `/${row.uf}` : ""}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-[150px] truncate" title={row.ocupacao ?? ""}>{row.ocupacao || "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.dataInclusao || new Date(row.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-[120px] truncate" title={row.reclamacao ?? ""}>{row.reclamacao || row.motivo || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={row.origem === "manual" ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {row.origem === "planilha_bb" ? "BB" : row.origem === "manual" ? "Manual" : "Importação"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remover ${row.nome || row.cpf || row.telefoneFormatado} da lista?`)) {
                              remover.mutate({ id: row.id });
                            }
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex justify-center gap-2 p-4">
                <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
                <span className="text-gray-500 text-sm flex items-center px-2">{pagina} / {totalPaginas}</span>
                <Button variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Adicionar */}
      <Dialog open={modalAdicionar} onOpenChange={setModalAdicionar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar à Lista Não Perturbe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Telefone (opcional)</label>
              <Input
                placeholder="(77) 99999-0000"
                value={novoTel}
                onChange={e => setNovoTel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Motivo (opcional)</label>
              <Input
                placeholder="Ex: Solicitou não ser contatado"
                value={novoMotivo}
                onChange={e => setNovoMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAdicionar(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={adicionar.isPending || novoTel.length < 8}
              onClick={() => adicionar.mutate({ telefone: novoTel, motivo: novoMotivo || undefined })}
            >
              {adicionar.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Importar Planilha BB */}
      <Dialog open={modalImportar} onOpenChange={setModalImportar}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Planilha Não Perturbe (BB)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">Formato esperado (planilha BB):</p>
              <p>Colunas: <strong>NOME, CPF, Reclamação, INCLUSÃO, Município, UF, OCUPAÇÃO, NÃO PERTUBE</strong></p>
              <p className="mt-1 text-xs text-blue-600">A importação usa upsert por CPF — registros existentes serão atualizados automaticamente.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => xlsxRef.current?.click()}
                disabled={importarPlanilhaBB.isPending}
                className="gap-2 w-full"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {importarPlanilhaBB.isPending ? "Importando..." : "Selecionar Planilha (.xlsx)"}
              </Button>
              <input ref={xlsxRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsxUpload} />
            </div>
            {importarPlanilhaBB.isPending && (
              <p className="text-sm text-center text-gray-500">Processando registros, aguarde...</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalImportar(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
