import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const TIPOS_PAGTO = [
  "Agua", "Ajuda de Custo", "Aluguel", "Cancelado", "Comissão",
  "DespesasLoja", "DespesasViagem", "Energia", "Internet",
  "Outros", "Propaganda", "Reajuste", "Reembolso",
];

const TIPOS_CONTA = ["Corrente", "Poupança", "Salário", "Pagamento"];

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
};

const emptyForm = {
  mesAno: "", tipoPagto: "", cidadeUF: "", empresa: "", chaveJ: "",
  cadastro: "", nomeFavorecido: "", banco: "", agencia: "", conta: "",
  cpfCnpj: "", tipoConta: "", pix: "", valor: "", pago: false,
  dataPagto: "", dataVencer: "", observacao: "",
};

function formatCurrency(v: string | null | undefined) {
  if (!v) return "-";
  const n = parseFloat(v);
  if (isNaN(n)) return "-";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagamentosPage() {
  const [, navigate] = useLocation();

  // Filtros
  const [filtroMesAno, setFiltroMesAno] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroPago, setFiltroPago] = useState<"todos" | "sim" | "nao">("todos");
  const [filtroChaveJ, setFiltroChaveJ] = useState("");
  const [page, setPage] = useState(1);

  // Modal novo/editar
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Pagamento | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [buscandoAgente, setBuscandoAgente] = useState(false);
  const [chaveJBusca, setChaveJBusca] = useState("");

  // Modal confirmar exclusão
  const [deletandoId, setDeletandoId] = useState<number | null>(null);

  // Edição inline de Data Pagto
  const [editandoDtPagto, setEditandoDtPagto] = useState<number | null>(null);
  const [valorDtPagto, setValorDtPagto] = useState("");
  const dtPagtoRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const editarDtPagtoMutation = trpc.pagamentos.editar.useMutation({
    onSuccess: () => {
      utils.pagamentos.list.invalidate();
      setEditandoDtPagto(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const iniciarEdicaoDtPagto = (row: Pagamento) => {
    setEditandoDtPagto(row.id);
    setValorDtPagto(row.dataPagto ?? "");
    setTimeout(() => dtPagtoRef.current?.focus(), 50);
  };

  // Verifica se uma data DD/MM/AAAA já passou
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

  const salvarDtPagto = (id: number) => {
    // Se digitou uma data, marca como pago=true automaticamente
    const pago = !!valorDtPagto;
    editarDtPagtoMutation.mutate({ id, dataPagto: valorDtPagto || undefined, pago });
  };

  const queryParams = {
    mesAno: filtroMesAno || undefined,
    empresa: filtroEmpresa || undefined,
    tipoPagto: filtroTipo || undefined,
    pago: filtroPago,
    chaveJ: filtroChaveJ || undefined,
  };

  const { data: rows = [], refetch } = trpc.pagamentos.list.useQuery({ ...queryParams, page, limit: 100 });
  const { data: total = 0 } = trpc.pagamentos.count.useQuery(queryParams);

  // Busca automática de dados do agente ao digitar ChaveJ
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
    setForm({ ...emptyForm });
    setChaveJBusca("");
    setShowModal(true);
  }

  function abrirEditar(row: Pagamento) {
    setEditando(row);
    setForm({
      mesAno: row.mesAno ?? "",
      tipoPagto: row.tipoPagto ?? "",
      cidadeUF: row.cidadeUF ?? "",
      empresa: row.empresa ?? "",
      chaveJ: row.chaveJ ?? "",
      cadastro: row.cadastro ?? "",
      nomeFavorecido: row.nomeFavorecido ?? "",
      banco: row.banco ?? "",
      agencia: row.agencia ?? "",
      conta: row.conta ?? "",
      cpfCnpj: row.cpfCnpj ?? "",
      tipoConta: row.tipoConta ?? "",
      pix: row.pix ?? "",
      valor: row.valor ?? "",
      pago: row.pago,
      dataPagto: row.dataPagto ?? "",
      dataVencer: row.dataVencer ?? "",
      observacao: row.observacao ?? "",
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
      criarMutation.mutate({ ...form, origem: "manual" });
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
      "Mês Ano": r.mesAno,
      "Tipo Pagto": r.tipoPagto,
      "Cidade/UF": r.cidadeUF,
      "Empresa": r.empresa,
      "Chave J": r.chaveJ,
      "Cadastro": r.cadastro,
      "Nome Favorecido": r.nomeFavorecido,
      "Banco": r.banco,
      "Agencia": r.agencia,
      "Conta": r.conta,
      "CPF/CNPJ": r.cpfCnpj,
      "Tipo Conta": r.tipoConta,
      "Pix": r.pix,
      "Valor": r.valor ? parseFloat(r.valor) : "",
      "Pago": r.pago ? "Sim" : "Não",
      "DataPagto": r.dataPagto,
      "Data Vencer": r.dataVencer,
      "Observação": r.observacao,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagtos");
    XLSX.writeFile(wb, `pagamentos_${filtroMesAno || "todos"}.xlsx`);
    toast.success(`Excel exportado! (${exportRows.length} registros)`);
  }

  const totalPages = Math.ceil(total / 100);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Pagamentos</h1>
          <span className="text-sm text-gray-400">{total} registro{total !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarExcel} size="sm"
            className="bg-green-700 hover:bg-green-600 text-white">
            Exportar Excel
          </Button>
          <Button onClick={abrirNovo} size="sm"
            className="bg-blue-700 hover:bg-blue-600 text-white">
            + Novo Lançamento
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 flex items-center gap-1">
            ← Voltar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs text-gray-400">Mês/Ano</Label>
          <Input value={filtroMesAno} onChange={e => { setFiltroMesAno(e.target.value); setPage(1); }}
            placeholder="MM/AAAA" className="bg-gray-800 border-gray-600 text-white w-28 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Empresa</Label>
          <Input value={filtroEmpresa} onChange={e => { setFiltroEmpresa(e.target.value); setPage(1); }}
            placeholder="Empresa" className="bg-gray-800 border-gray-600 text-white w-32 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Tipo Pagto</Label>
          <Select value={filtroTipo} onValueChange={v => { setFiltroTipo(v === "todos" ? "" : v); setPage(1); }}>
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
        {(filtroMesAno || filtroEmpresa || filtroTipo || filtroChaveJ || filtroPago !== "todos") && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFiltroMesAno(""); setFiltroEmpresa(""); setFiltroTipo("");
            setFiltroPago("todos"); setFiltroChaveJ(""); setPage(1);
          }} className="text-gray-400 hover:text-white h-8 text-xs">
            Limpar
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-800 text-gray-300 uppercase text-xs">
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
                <td colSpan={18} className="text-center py-12 text-gray-500">
                  Nenhum pagamento encontrado. Clique em "+ Novo Lançamento" para começar.
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={row.id}
                className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  i % 2 === 0 ? "bg-gray-900/60" : "bg-gray-900/30"
                }`}>
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
                <td className="px-2 py-1.5 whitespace-nowrap max-w-[120px] truncate" title={row.pix ?? ""}>{row.pix || "-"}</td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium text-green-400">{formatCurrency(row.valor)}</td>
                <td className="px-2 py-1.5 text-center">
                  {row.dataPagto
                    ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-900/60 text-green-300 border border-green-700">Pago</span>
                    : isAtrasado(row.dataVencer)
                      ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-900/60 text-orange-300 border border-orange-600">Atrasado</span>
                      : <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/60 text-red-300 border border-red-700">Não</span>
                  }
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {editandoDtPagto === row.id ? (
                    <input
                      ref={dtPagtoRef}
                      type="text"
                      value={valorDtPagto}
                      onChange={(e) => setValorDtPagto(e.target.value)}
                      onBlur={() => salvarDtPagto(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") salvarDtPagto(row.id);
                        if (e.key === "Escape") setEditandoDtPagto(null);
                      }}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className="w-28 border border-blue-500 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-800 text-white"
                    />
                  ) : (
                    <span
                      onClick={() => iniciarEdicaoDtPagto(row as Pagamento)}
                      className="cursor-pointer hover:bg-blue-900/40 rounded px-1 py-0.5 min-w-[6rem] inline-block border border-transparent hover:border-blue-600"
                      title="Clique para editar"
                    >
                      {row.dataPagto || <span className="text-gray-500 italic text-xs">DD/MM/AAAA</span>}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.dataVencer || "-"}</td>
                <td className="px-2 py-1.5 text-center whitespace-nowrap">
                  <div className="flex gap-1 justify-center">
                    <Button size="sm" variant="outline"
                      onClick={() => abrirEditar(row as Pagamento)}
                      className="h-6 px-2 text-xs bg-blue-900/40 border-blue-700 text-blue-300 hover:bg-blue-800">
                      Editar
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => setDeletandoId(row.id)}
                      className="h-6 px-2 text-xs bg-red-900/40 border-red-700 text-red-300 hover:bg-red-800">
                      Apagar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 py-4 bg-gray-900 border-t border-gray-700">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="bg-gray-800 border-gray-600 text-white">← Anterior</Button>
          <span className="text-sm text-gray-400">Página {page} de {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className="bg-gray-800 border-gray-600 text-white">Próxima →</Button>
        </div>
      )}

      {/* Modal Novo/Editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editando ? "Editar Pagamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Mês/Ano */}
            <div>
              <Label className="text-xs text-gray-400">Mês/Ano *</Label>
              <Input value={form.mesAno} onChange={e => setForm(f => ({ ...f, mesAno: e.target.value }))}
                placeholder="MM/AAAA" className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Tipo Pagto */}
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

            {/* Chave J — ao digitar busca dados do agente */}
            <div>
              <Label className="text-xs text-gray-400">
                Chave J {fetchingAgente && <span className="text-yellow-400 text-xs">(buscando...)</span>}
              </Label>
              <Input
                value={form.chaveJ}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({ ...f, chaveJ: v }));
                  setChaveJBusca(v);
                }}
                placeholder="Ex: J12345"
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm font-mono"
              />
            </div>

            {/* Empresa */}
            <div>
              <Label className="text-xs text-gray-400">Empresa</Label>
              <Input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Cadastro */}
            <div>
              <Label className="text-xs text-gray-400">Cadastro</Label>
              <Input value={form.cadastro} onChange={e => setForm(f => ({ ...f, cadastro: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Cidade/UF */}
            <div>
              <Label className="text-xs text-gray-400">Cidade/UF</Label>
              <Input value={form.cidadeUF} onChange={e => setForm(f => ({ ...f, cidadeUF: e.target.value }))}
                placeholder="Ex: São Paulo/SP"
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Nome Favorecido — span 2 */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400">Nome Favorecido</Label>
              <Input value={form.nomeFavorecido} onChange={e => setForm(f => ({ ...f, nomeFavorecido: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Banco */}
            <div>
              <Label className="text-xs text-gray-400">Banco</Label>
              <Input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Agência */}
            <div>
              <Label className="text-xs text-gray-400">Agência</Label>
              <Input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Conta */}
            <div>
              <Label className="text-xs text-gray-400">Conta</Label>
              <Input value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Tipo Conta */}
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

            {/* CPF/CNPJ */}
            <div>
              <Label className="text-xs text-gray-400">CPF/CNPJ</Label>
              <Input value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm font-mono" />
            </div>

            {/* Pix */}
            <div>
              <Label className="text-xs text-gray-400">Pix</Label>
              <Input value={form.pix} onChange={e => setForm(f => ({ ...f, pix: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Valor */}
            <div>
              <Label className="text-xs text-gray-400">Valor (R$)</Label>
              <Input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00" className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Data Vencer */}
            <div>
              <Label className="text-xs text-gray-400">Data Vencer</Label>
              <Input value={form.dataVencer} onChange={e => setForm(f => ({ ...f, dataVencer: e.target.value }))}
                placeholder="DD/MM/AAAA" className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>

            {/* Pago */}
            <div className="flex items-center gap-3 pt-4">
              <input type="checkbox" id="pago-check" checked={form.pago}
                onChange={e => setForm(f => ({ ...f, pago: e.target.checked }))}
                className="w-4 h-4 accent-green-500" />
              <Label htmlFor="pago-check" className="text-sm text-gray-300 cursor-pointer">Pago</Label>
            </div>

            {/* Data Pagto — só aparece se pago */}
            {form.pago && (
              <div>
                <Label className="text-xs text-gray-400">Data Pagto</Label>
                <Input value={form.dataPagto} onChange={e => setForm(f => ({ ...f, dataPagto: e.target.value }))}
                  placeholder="DD/MM/AAAA" className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
              </div>
            )}

            {/* Observação */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400">Observação</Label>
              <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
              Cancelar
            </Button>
            <Button onClick={salvar}
              disabled={criarMutation.isPending || editarMutation.isPending}
              className="bg-blue-700 hover:bg-blue-600 text-white">
              {criarMutation.isPending || editarMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <Dialog open={deletandoId !== null} onOpenChange={() => setDeletandoId(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300 text-sm">Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletandoId(null)}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
              Cancelar
            </Button>
            <Button onClick={() => deletandoId && deletarMutation.mutate({ id: deletandoId })}
              disabled={deletarMutation.isPending}
              className="bg-red-700 hover:bg-red-600 text-white">
              {deletarMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
