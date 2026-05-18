import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ChaveJRespInput } from "@/components/ChaveJRespInput";

const TIPOS_PAGTO = [
  "Adto", "Agua", "Ajuda de Custo", "Aluguel", "Cancelado", "Comissão",
  "DespesasLoja", "DespesasViagem", "Energia", "Ferias", "Internet",
  "Outros", "Pagto", "Propaganda", "Reajuste", "Reembolso", "Salário",
];
const TIPOS_CONTA = ["Corrente", "Poupança", "Salário", "Pagamento"];

function maskMesAno(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}
function maskData(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

type UnifiedRow = {
  id: number;
  mesAno: string | null;
  tipoPagto: string | null;
  cidadeUF: string | null;
  empresa: string | null;
  chaveJ: string | null;
  cadastro: string | null;
  nomeFavorecido: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  cpfCnpj: string | null;
  tipoConta: string | null;
  pix: string | null;
  valor: string | null;
  pago: boolean;
  dataPagto: string | null;
  dataVencer: string | null;
  origem: string | null;
  observacao: string | null;
  chaveJResp: string | null;
  _fonte: 'pagamento' | 'despesa_fixa';
};

type Pagamento = {
  id: number;
  mesAno: string | null;
  tipoPagto: string | null;
  cidadeUF: string | null;
  empresa: string | null;
  chaveJ: string | null;
  cadastro: string | null;
  nomeFavorecido: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  cpfCnpj: string | null;
  tipoConta: string | null;
  pix: string | null;
  valor: string | null;
  pago: boolean;
  dataPagto: string | null;
  dataVencer: string | null;
  origem: string | null;
  observacao: string | null;
  chaveJResp: string | null;
};

const emptyForm = {
  mesAno: "", tipoPagto: "", cidadeUF: "", empresa: "", chaveJ: "",
  cadastro: "", nomeFavorecido: "", banco: "", agencia: "", conta: "",
  cpfCnpj: "", tipoConta: "", pix: "", tipoChave: "pix", valor: "", pago: false,
  dataPagto: "", dataVencer: "", observacao: "", chaveJResp: "",
};

function formatCurrency(v: string | null | undefined) {
  if (!v) return "-";
  const n = parseFloat(v);
  if (isNaN(n)) return "-";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagamentosPage() {
  const [, navigate] = useLocation();

  const [filtroMesAno, setFiltroMesAno] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroPago, setFiltroPago] = useState<"todos" | "sim" | "nao">("todos");
  const [filtroChaveJ, setFiltroChaveJ] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Pagamento | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [chaveJBusca, setChaveJBusca] = useState("");
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [deletandoDespId, setDeletandoDespId] = useState<number | null>(null);
  const [editandoDesp, setEditandoDesp] = useState<UnifiedRow | null>(null);
  const [formDesp, setFormDesp] = useState<{
    mesAno: string; tipoPagto: string; cidadeUF: string; empresa: string;
    chaveResp: string; nome: string; banco: string; agencia: string; conta: string;
    cpfCnpj: string; tipoConta: string; pix: string; valor: string;
    pago: boolean; dataPagto: string; dataVencer: string;
  }>({ mesAno: "", tipoPagto: "", cidadeUF: "", empresa: "", chaveResp: "", nome: "",
    banco: "", agencia: "", conta: "", cpfCnpj: "", tipoConta: "", pix: "",
    valor: "", pago: false, dataPagto: "", dataVencer: "" });

  const [editandoDtPagto, setEditandoDtPagto] = useState<number | null>(null);
  const [valorDtPagto, setValorDtPagto] = useState("");
  const dtPagtoRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: nextCodigo } = trpc.pagamentos.nextCodigo.useQuery();

  const editarDespMutation = trpc.despesasFixas.editar.useMutation({
    onSuccess: () => { toast.success("Despesa fixa atualizada!"); setEditandoDesp(null); utils.pagamentos.listUnificado.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deletarDespMutation = trpc.despesasFixas.deletar.useMutation({
    onSuccess: () => { toast.success("Despesa fixa excluída!"); setDeletandoDespId(null); utils.pagamentos.listUnificado.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const editarDtPagtoMutation = trpc.pagamentos.editar.useMutation({
    onSuccess: () => { utils.pagamentos.listUnificado.invalidate(); setEditandoDtPagto(null); },
    onError: (e) => toast.error(e.message),
  });

  const editarDtPagtoDesp = trpc.despesasFixas.editar.useMutation({
    onSuccess: () => { utils.pagamentos.listUnificado.invalidate(); setEditandoDtPagto(null); },
    onError: (e) => toast.error(e.message),
  });

  const iniciarEdicaoDtPagto = (row: UnifiedRow) => {
    setEditandoDtPagto(row.id);
    setValorDtPagto(row.dataPagto ?? "");
    setTimeout(() => dtPagtoRef.current?.focus(), 50);
  };

  const salvarDtPagtoDesp = (id: number) => {
    if (valorDtPagto && valorDtPagto.length < 10) { setEditandoDtPagto(null); return; }
    const pago = !!valorDtPagto;
    editarDtPagtoDesp.mutate({ id, dataPagto: valorDtPagto || undefined, pago });
  };

  const isAtrasado = (dataVencer: string | null) => {
    if (!dataVencer) return false;
    const partes = dataVencer.split("/");
    if (partes.length !== 3) return false;
    const [d, m, a] = partes;
    const dt = new Date(Number(a), Number(m) - 1, Number(d));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return dt < hoje;
  };
  const isHoje = (dataVencer: string | null) => {
    if (!dataVencer) return false;
    const partes = dataVencer.split("/");
    if (partes.length !== 3) return false;
    const [d, m, a] = partes;
    const dt = new Date(Number(a), Number(m) - 1, Number(d));
    const hoje = new Date();
    return dt.getFullYear() === hoje.getFullYear() && dt.getMonth() === hoje.getMonth() && dt.getDate() === hoje.getDate();
  };
  const rowBgClass = (row: UnifiedRow): string => {
    if (row.pago || row.dataPagto) return "";
    if (isAtrasado(row.dataVencer)) return "bg-red-950/50 border-l-4 border-l-red-500";
    if (isHoje(row.dataVencer)) return "bg-yellow-950/40 border-l-4 border-l-yellow-400";
    return "";
  };

  const salvarDtPagto = (id: number) => {
    // Só salva se a data estiver completa (DD/MM/AAAA = 10 chars) ou vazia (para desmarcar pago)
    if (valorDtPagto && valorDtPagto.length < 10) {
      // Data incompleta: cancela sem salvar
      setEditandoDtPagto(null);
      return;
    }
    const pago = !!valorDtPagto;
    editarDtPagtoMutation.mutate({ id, dataPagto: valorDtPagto || undefined, pago });
  };

  const queryParams = {
    mesAno: filtroMesAno || undefined,
    empresa: filtroEmpresa || undefined,
    tipoPagto: filtroTipo || undefined,
    pago: filtroPago,
    chaveJ: filtroChaveJ || undefined,
    nome: filtroNome || undefined,
  };

  const { data: unificadoData, refetch } = trpc.pagamentos.listUnificado.useQuery({ ...queryParams, page, limit: 100 });
  const rows: UnifiedRow[] = (unificadoData?.rows ?? []) as UnifiedRow[];
  const total = unificadoData?.total ?? 0;

  const { data: dadosAgente, isFetching: fetchingAgente } = trpc.pagamentos.buscarAgente.useQuery(
    { chaveJ: chaveJBusca },
    { enabled: chaveJBusca.length >= 3 }
  );

  useEffect(() => {
    if (dadosAgente && chaveJBusca && !editando) {
      setForm(prev => ({
        ...prev,
        empresa: dadosAgente.empresa ?? prev.empresa,
        cadastro: dadosAgente.numCadastro ?? prev.cadastro,
        nomeFavorecido: dadosAgente.favorecido || dadosAgente.nomeAgente || prev.nomeFavorecido,
        banco: dadosAgente.banco ?? prev.banco,
        agencia: dadosAgente.agencia ?? prev.agencia,
        conta: dadosAgente.conta ?? prev.conta,
        cpfCnpj: dadosAgente.cpfAgente ?? prev.cpfCnpj,
        tipoConta: dadosAgente.tipo ?? prev.tipoConta,
        pix: dadosAgente.pix ?? prev.pix,
        cidadeUF: dadosAgente.cidade && dadosAgente.uf
          ? `${dadosAgente.cidade}/${dadosAgente.uf}`
          : dadosAgente.cidade ?? prev.cidadeUF,
      }));
    }
  }, [dadosAgente, chaveJBusca]);

  const criarMutation = trpc.pagamentos.criar.useMutation({
    onSuccess: () => { toast.success("Pagamento lançado com sucesso!"); setShowModal(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const editarMutation = trpc.pagamentos.editar.useMutation({
    onSuccess: () => { toast.success("Pagamento atualizado!"); setShowModal(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deletarMutation = trpc.pagamentos.deletar.useMutation({
    onSuccess: () => { toast.success("Pagamento excluído!"); setDeletandoId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function abrirNovo() {
    setEditando(null);
    setForm({ ...emptyForm, chaveJ: nextCodigo ?? "" });
    setChaveJBusca("");
    setShowModal(true);
  }

  function abrirEditar(row: UnifiedRow) {
    if (row._fonte === 'despesa_fixa') {
      toast.info("Para editar despesas fixas, acesse a tela de Despesas Fixas.");
      return;
    }
    setEditando(row as Pagamento);
    setForm({
      mesAno: row.mesAno ?? "", tipoPagto: row.tipoPagto ?? "",
      cidadeUF: row.cidadeUF ?? "", empresa: row.empresa ?? "",
      chaveJ: row.chaveJ ?? "", cadastro: row.cadastro ?? "",
      nomeFavorecido: row.nomeFavorecido ?? "", banco: row.banco ?? "",
      agencia: row.agencia ?? "", conta: row.conta ?? "",
      cpfCnpj: row.cpfCnpj ?? "", tipoConta: row.tipoConta ?? "",
      pix: row.pix ?? "", tipoChave: "pix", valor: row.valor ?? "", pago: row.pago,
      dataPagto: row.dataPagto ?? "", dataVencer: row.dataVencer ?? "",
      observacao: row.observacao ?? "", chaveJResp: row.chaveJResp ?? "",
    });
    setChaveJBusca("");
    setShowModal(true);
  }

  function salvar() {
    if (!form.mesAno || !form.tipoPagto) {
      toast.error("Mês/Ano e Tipo de Pagamento são obrigatórios.");
      return;
    }
    if (editando) {
      editarMutation.mutate({ id: editando.id, ...form });
    } else {
      criarMutation.mutate({ ...form, chaveJResp: form.chaveJResp || undefined, origem: "manual" });
    }
  }

  const { refetch: fetchExportar } = trpc.pagamentos.exportar.useQuery(
    { mesAno: filtroMesAno || undefined, empresa: filtroEmpresa || undefined, tipoPagto: filtroTipo || undefined, pago: filtroPago },
    { enabled: false }
  );

  async function exportarExcel() {
    const result = await fetchExportar();
    const exportRows = result.data ?? [];
    if (exportRows.length === 0) { toast.error("Nenhum registro para exportar."); return; }
    const data = exportRows.map(r => ({
      "Mês Ano": r.mesAno, "Tipo Pagto": r.tipoPagto, "Cidade/UF": r.cidadeUF,
      "Empresa": r.empresa, "Chave J": r.chaveJ, "Cadastro": r.cadastro,
      "Nome Favorecido": r.nomeFavorecido, "Banco": r.banco, "Agencia": r.agencia,
      "Conta": r.conta, "CPF/CNPJ": r.cpfCnpj, "Tipo Conta": r.tipoConta,
      "Pix": r.pix, "Valor": r.valor ? parseFloat(r.valor) : null,
      "Pago": r.pago ? "Sim" : "Não", "Data Pagto": r.dataPagto,
      "Data Vencer": r.dataVencer, "Observação": r.observacao,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Pagamentos");
    XLSX.writeFile(wb, `pagamentos_${filtroMesAno || "todos"}.xlsx`);
    toast.success(`Excel exportado! (${exportRows.length} registros)`);
  }

  const totalPages = Math.max(1, Math.ceil(total / 100));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Pagamentos</h1>
          <span className="text-sm text-gray-400">{total} registro{total !== 1 ? "s" : ""} (pagamentos + despesas fixas)</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarExcel} size="sm" className="bg-green-700 hover:bg-green-600 text-white">Exportar Excel</Button>
          <Button onClick={abrirNovo} size="sm" className="bg-blue-700 hover:bg-blue-600 text-white">+ Novo Lançamento</Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">← Voltar</Button>
        </div>
      </div>

      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs text-gray-400">Mês/Ano</Label>
          <Input value={filtroMesAno} onChange={e => { setFiltroMesAno(maskMesAno(e.target.value)); setPage(1); }}
            placeholder="MM/AAAA" className="bg-gray-800 border-gray-600 text-white w-28 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Empresa</Label>
          <Input value={filtroEmpresa} onChange={e => { setFiltroEmpresa(e.target.value); setPage(1); }}
            placeholder="Empresa" className="bg-gray-800 border-gray-600 text-white w-32 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Tipo Pagto</Label>
          <Select value={filtroTipo || "todos"} onValueChange={v => { setFiltroTipo(v === "todos" ? "" : v); setPage(1); }}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white w-40 h-8 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="todos" className="text-white">Todos</SelectItem>
              {TIPOS_PAGTO.map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-400">Pago</Label>
          <div className="flex gap-1">
            {(["todos", "sim", "nao"] as const).map(v => (
              <button key={v} onClick={() => { setFiltroPago(v); setPage(1); }}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  filtroPago === v
                    ? v === "sim" ? "bg-green-700 border-green-500 text-white"
                      : v === "nao" ? "bg-red-700 border-red-500 text-white"
                      : "bg-blue-700 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                }`}>
                {v === "todos" ? "Todos" : v === "sim" ? "Pago" : "Não Pago"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-400">Chave J</Label>
          <Input value={filtroChaveJ} onChange={e => { setFiltroChaveJ(e.target.value); setPage(1); }}
            placeholder="Chave J" className="bg-gray-800 border-gray-600 text-white w-28 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Nome</Label>
          <Input value={filtroNome} onChange={e => { setFiltroNome(e.target.value); setPage(1); }}
            placeholder="Buscar por nome" className="bg-gray-800 border-gray-600 text-white w-36 h-8 text-sm" />
        </div>
        {(filtroMesAno || filtroEmpresa || filtroTipo || filtroChaveJ || filtroNome || filtroPago !== "todos") && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFiltroMesAno(""); setFiltroEmpresa(""); setFiltroTipo("");
            setFiltroPago("todos"); setFiltroChaveJ(""); setFiltroNome(""); setPage(1);
          }} className="text-gray-400 hover:text-white h-8 text-xs">✕ Limpar</Button>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 py-2 bg-gray-900 border-b border-gray-700">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-6 px-2">← Anterior</Button>
          <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-6 px-2">Próxima →</Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-800 text-gray-300 uppercase text-xs">
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Origem</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Mês Ano</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Tipo Pagto</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Cidade/UF</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Empresa</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Chave J</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Cadastro</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Nome Favorecido</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Banco</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Agência</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Conta</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">CPF/CNPJ</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Tipo Conta</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Pix</th>
              <th className="px-2 py-2 text-right border-b border-gray-700 whitespace-nowrap">Valor</th>
              <th className="px-2 py-2 text-center border-b border-gray-700 whitespace-nowrap">Pago</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Dt. Pagto</th>
              <th className="px-2 py-2 text-left border-b border-gray-700 whitespace-nowrap">Dt. Vencer</th>
              <th className="px-2 py-2 text-center border-b border-gray-700 whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={19} className="text-center py-12 text-gray-500">
                  Nenhum registro encontrado. Clique em "+ Novo Lançamento" para começar.
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={`${row._fonte}-${row.id}`}
                className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${rowBgClass(row) || (i % 2 === 0 ? "bg-gray-900/60" : "bg-gray-900/30")}`}>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {row._fonte === 'despesa_fixa'
                    ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-700">Desp. Fixa</span>
                    : <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700">Pagamento</span>
                  }
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.mesAno || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.tipoPagto || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.cidadeUF || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.empresa || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-mono">{row.chaveJ || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.cadastro || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap max-w-[160px] truncate" title={row.nomeFavorecido ?? ""}>{row.nomeFavorecido || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.banco || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.agencia || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.conta || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-mono">{row.cpfCnpj || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.tipoConta || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap max-w-[180px]">
                  {row.pix ? (
                    <span className="flex items-center gap-1 group">
                      <span className="truncate max-w-[155px] block" title={row.pix}>{row.pix.replace(/^\+55/, '')}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(row.pix!); toast.success("Copiado!"); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white flex-shrink-0"
                        title="Copiar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                      </button>
                    </span>
                  ) : "-"}
                </td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium text-green-400">{formatCurrency(row.valor)}</td>
                <td className="px-2 py-1.5 text-center">
                  {row.dataPagto
                    ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-900/60 text-green-300 border border-green-700">Pago</span>
                    : isAtrasado(row.dataVencer)
                      ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-700 text-white border border-red-500">Atrasado</span>
                      : isHoje(row.dataVencer)
                        ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-600 text-white border border-yellow-400">Hoje</span>
                        : <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/60 text-red-300 border border-red-700">Não</span>
                  }
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {editandoDtPagto === row.id ? (
                    <input ref={dtPagtoRef} type="text" value={valorDtPagto}
                      onChange={(e) => {
                        const v = maskData(e.target.value);
                        setValorDtPagto(v);
                        if (v.length === 10) {
                          const pago = true;
                          if (row._fonte === 'pagamento') {
                            editarDtPagtoMutation.mutate({ id: row.id, dataPagto: v, pago });
                          } else {
                            editarDtPagtoDesp.mutate({ id: row.id, dataPagto: v, pago });
                          }
                        }
                      }}
                      onBlur={() => row._fonte === 'pagamento' ? salvarDtPagto(row.id) : salvarDtPagtoDesp(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") row._fonte === 'pagamento' ? salvarDtPagto(row.id) : salvarDtPagtoDesp(row.id);
                        if (e.key === "Escape") setEditandoDtPagto(null);
                      }}
                      placeholder="DD/MM/AAAA" maxLength={10}
                      className="w-28 border border-blue-500 rounded px-1.5 py-0.5 text-xs focus:outline-none bg-gray-800 text-white" />
                  ) : (
                    <span onClick={() => iniciarEdicaoDtPagto(row)}
                      className="cursor-pointer hover:bg-blue-900/40 rounded px-1 py-0.5 min-w-[6rem] inline-block border border-transparent hover:border-blue-600"
                      title="Clique para editar">
                      {row.dataPagto || <span className="text-gray-500 italic text-xs">DD/MM/AAAA</span>}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {row.dataVencer
                    ? (
                      !row.pago && !row.dataPagto && isAtrasado(row.dataVencer)
                        ? <span className="font-bold text-red-400">⚠ {row.dataVencer}</span>
                        : !row.pago && !row.dataPagto && isHoje(row.dataVencer)
                          ? <span className="font-bold text-yellow-300">🔔 {row.dataVencer}</span>
                          : <span>{row.dataVencer}</span>
                    )
                    : <span className="text-gray-500">-</span>
                  }
                </td>
                <td className="px-2 py-1.5 text-center whitespace-nowrap">
                  <div className="flex gap-1 justify-center">
                    {row._fonte === 'pagamento' ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => abrirEditar(row)}
                          className="h-6 px-2 text-xs bg-blue-900/40 border-blue-700 text-blue-300 hover:bg-blue-800">Editar</Button>
                        <Button size="sm" variant="outline" onClick={() => setDeletandoId(row.id)}
                          className="h-6 px-2 text-xs bg-red-900/40 border-red-700 text-red-300 hover:bg-red-800">Apagar</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditandoDesp(row);
                          setFormDesp({
                            mesAno: row.mesAno ?? "", tipoPagto: row.tipoPagto ?? "",
                            cidadeUF: row.cidadeUF ?? "", empresa: row.empresa ?? "",
                            chaveResp: row.chaveJResp ?? "", nome: row.nomeFavorecido ?? "",
                            banco: row.banco ?? "", agencia: row.agencia ?? "",
                            conta: row.conta ?? "", cpfCnpj: row.cpfCnpj ?? "",
                            tipoConta: row.tipoConta ?? "", pix: row.pix ?? "",
                            valor: row.valor ?? "", pago: row.pago,
                            dataPagto: row.dataPagto ?? "", dataVencer: row.dataVencer ?? "",
                          });
                        }} className="h-6 px-2 text-xs bg-purple-900/40 border-purple-700 text-purple-300 hover:bg-purple-800">Editar</Button>
                        <Button size="sm" variant="outline" onClick={() => setDeletandoDespId(row.id)}
                          className="h-6 px-2 text-xs bg-red-900/40 border-red-700 text-red-300 hover:bg-red-800">Apagar</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 py-4 bg-gray-900 border-t border-gray-700">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="bg-gray-800 border-gray-600 text-white">← Anterior</Button>
          <span className="text-sm text-gray-400">Página {page} de {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className="bg-gray-800 border-gray-600 text-white">Próxima →</Button>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editando ? "Editar Pagamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 -mt-1">
            Preencha a Chave J para buscar dados do cadastro automaticamente, ou deixe em branco para lançamento avulso (sem cadastro).
          </p>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs text-gray-400">Mês/Ano *</Label>
              <Input value={form.mesAno} onChange={e => setForm(f => ({ ...f, mesAno: maskMesAno(e.target.value) }))}
                placeholder="MM/AAAA" maxLength={7} className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Tipo Pagto *</Label>
              <Select value={form.tipoPagto} onValueChange={v => setForm(f => ({ ...f, tipoPagto: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {TIPOS_PAGTO.map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">
                Chave J {fetchingAgente && <span className="text-yellow-400">(buscando...)</span>}
                {dadosAgente && chaveJBusca && <span className="text-green-400 ml-1">✓ encontrado</span>}
              </Label>
              <Input value={form.chaveJ}
                onChange={e => { const v = e.target.value; setForm(f => ({ ...f, chaveJ: v })); setChaveJBusca(v); }}
                placeholder="Opcional — preenche dados automaticamente"
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Empresa</Label>
              <Input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Cadastro</Label>
              <Input value={form.cadastro} onChange={e => setForm(f => ({ ...f, cadastro: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Cidade/UF</Label>
              <Input value={form.cidadeUF} onChange={e => setForm(f => ({ ...f, cidadeUF: e.target.value }))}
                placeholder="Ex: Salvador/BA" className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-400">Nome Favorecido</Label>
              <Input value={form.nomeFavorecido} onChange={e => setForm(f => ({ ...f, nomeFavorecido: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Banco</Label>
              <Input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Agência</Label>
              <Input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Conta</Label>
              <Input value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Tipo Conta</Label>
              <Select value={form.tipoConta} onValueChange={v => setForm(f => ({ ...f, tipoConta: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {TIPOS_CONTA.map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">CPF/CNPJ</Label>
              <Input value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Tipo Chave</Label>
              <Select value={(form as any).tipoChave ?? 'pix'} onValueChange={v => setForm(f => ({ ...f, tipoChave: v } as any))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="pix" className="text-white">Pix</SelectItem>
                  <SelectItem value="boleto" className="text-white">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">{((form as any).tipoChave ?? 'pix') === 'boleto' ? 'Código de Barras' : 'Pix'}</Label>
              <Input value={form.pix} onChange={e => setForm(f => ({ ...f, pix: e.target.value }))}
                placeholder={((form as any).tipoChave ?? 'pix') === 'boleto' ? 'Código de barras do boleto...' : ''}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Valor (R$)</Label>
              <Input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00" className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Data Vencer</Label>
              <Input value={form.dataVencer} onChange={e => setForm(f => ({ ...f, dataVencer: maskData(e.target.value) }))}
                placeholder="DD/MM/AAAA" maxLength={10} className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <input type="checkbox" id="pago-check" checked={form.pago}
                onChange={e => setForm(f => ({ ...f, pago: e.target.checked }))} className="w-4 h-4 accent-green-500" />
              <Label htmlFor="pago-check" className="text-sm text-gray-300 cursor-pointer">Pago</Label>
            </div>
            {form.pago && (
              <div>
                <Label className="text-xs text-gray-400">Data Pagto</Label>
                <Input value={form.dataPagto} onChange={e => setForm(f => ({ ...f, dataPagto: maskData(e.target.value) }))}
                  placeholder="DD/MM/AAAA" maxLength={10} className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400">Observação</Label>
              <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <ChaveJRespInput
                label="Chave J Responsável (quem responde por este lançamento)"
                value={form.chaveJResp}
                onChange={(chaveJ) => setForm(f => ({ ...f, chaveJResp: chaveJ }))}
                placeholder="Digite a Chave J ou nome do responsável..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">Cancelar</Button>
            <Button onClick={salvar} disabled={criarMutation.isPending || editarMutation.isPending}
              className="bg-blue-700 hover:bg-blue-600 text-white">
              {criarMutation.isPending || editarMutation.isPending ? "Salvando..." : editando ? "Salvar Alterações" : "Lançar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletandoId !== null} onOpenChange={() => setDeletandoId(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300">Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletandoId(null)}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">Cancelar</Button>
            <Button onClick={() => deletandoId && deletarMutation.mutate({ id: deletandoId })}
              disabled={deletarMutation.isPending} className="bg-red-700 hover:bg-red-600 text-white">
              {deletarMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Despesa Fixa */}
      <Dialog open={editandoDesp !== null} onOpenChange={() => setEditandoDesp(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-purple-300">Editar Despesa Fixa</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs text-gray-400">Mês/Ano</Label>
              <Input value={formDesp.mesAno} onChange={e => setFormDesp(f => ({ ...f, mesAno: maskMesAno(e.target.value) }))}
                placeholder="MM/AAAA" maxLength={7} className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Tipo Pagto</Label>
              <Select value={formDesp.tipoPagto} onValueChange={v => setFormDesp(f => ({ ...f, tipoPagto: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {TIPOS_PAGTO.map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">Empresa</Label>
              <Input value={formDesp.empresa} onChange={e => setFormDesp(f => ({ ...f, empresa: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Cidade/UF</Label>
              <Input value={formDesp.cidadeUF} onChange={e => setFormDesp(f => ({ ...f, cidadeUF: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-400">Nome</Label>
              <Input value={formDesp.nome} onChange={e => setFormDesp(f => ({ ...f, nome: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Banco</Label>
              <Input value={formDesp.banco} onChange={e => setFormDesp(f => ({ ...f, banco: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Agência</Label>
              <Input value={formDesp.agencia} onChange={e => setFormDesp(f => ({ ...f, agencia: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Conta</Label>
              <Input value={formDesp.conta} onChange={e => setFormDesp(f => ({ ...f, conta: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Tipo Conta</Label>
              <Select value={formDesp.tipoConta} onValueChange={v => setFormDesp(f => ({ ...f, tipoConta: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {TIPOS_CONTA.map(t => <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">CPF/CNPJ</Label>
              <Input value={formDesp.cpfCnpj} onChange={e => setFormDesp(f => ({ ...f, cpfCnpj: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Pix</Label>
              <Input value={formDesp.pix} onChange={e => setFormDesp(f => ({ ...f, pix: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Valor (R$)</Label>
              <Input value={formDesp.valor} onChange={e => setFormDesp(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00" className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Data Vencer</Label>
              <Input value={formDesp.dataVencer} onChange={e => setFormDesp(f => ({ ...f, dataVencer: maskData(e.target.value) }))}
                placeholder="DD/MM/AAAA" maxLength={10} className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <input type="checkbox" id="desp-pago-check" checked={formDesp.pago}
                onChange={e => setFormDesp(f => ({ ...f, pago: e.target.checked }))} className="w-4 h-4 accent-green-500" />
              <Label htmlFor="desp-pago-check" className="text-sm text-gray-300 cursor-pointer">Pago</Label>
            </div>
            {formDesp.pago && (
              <div>
                <Label className="text-xs text-gray-400">Data Pagto</Label>
                <Input value={formDesp.dataPagto} onChange={e => setFormDesp(f => ({ ...f, dataPagto: maskData(e.target.value) }))}
                  placeholder="DD/MM/AAAA" maxLength={10} className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-400">Chave Resp.</Label>
              <Input value={formDesp.chaveResp} onChange={e => setFormDesp(f => ({ ...f, chaveResp: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoDesp(null)}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">Cancelar</Button>
            <Button onClick={() => {
              if (!editandoDesp) return;
              editarDespMutation.mutate({ id: editandoDesp.id, ...formDesp });
            }} disabled={editarDespMutation.isPending}
              className="bg-purple-700 hover:bg-purple-600 text-white">
              {editarDespMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir Despesa Fixa */}
      <Dialog open={deletandoDespId !== null} onOpenChange={() => setDeletandoDespId(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300">Tem certeza que deseja excluir esta despesa fixa? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletandoDespId(null)}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">Cancelar</Button>
            <Button onClick={() => deletandoDespId && deletarDespMutation.mutate({ id: deletandoDespId })}
              disabled={deletarDespMutation.isPending} className="bg-red-700 hover:bg-red-600 text-white">
              {deletarDespMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
