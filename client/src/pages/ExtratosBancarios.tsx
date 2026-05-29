import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Building2, TrendingUp, TrendingDown, DollarSign, Search, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const EMPRESAS = ["BMF", "FLEX"];
const TIPOS = ["CRÉDITO", "DÉBITO"];
const CATEGORIAS = [
  "Receita Operacional", "Comissões Pagas", "Despesas Fixas", "Despesas Variáveis",
  "Transferência", "Impostos", "Folha de Pagamento", "Fornecedores", "Outros",
];

function fmtBRL(v: number | string | null | undefined) {
  const n = parseFloat(String(v ?? 0)) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Gerar lista de meses MM/AAAA dos últimos 24 meses
function gerarMeses() {
  const meses: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const aaaa = String(d.getFullYear());
    meses.push(`${mm}/${aaaa}`);
  }
  return meses;
}

// Mês atual
function mesAtual() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export default function ExtratosBancarios() {
  const [, navigate] = useLocation();
  // Queriesltros
  const [empresa, setEmpresa] = useState<string>("Todas");
  const [mesRef, setMesRef] = useState<string>(mesAtual());
  const [contaId, setContaId] = useState<number | undefined>(undefined);
  const [tipo, setTipo] = useState<string>("Todos");
  const [busca, setBusca] = useState("");

  // Modal lançamento
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  // Modal conta
  const [modalConta, setModalConta] = useState(false);
  const [editandoConta, setEditandoConta] = useState<any>(null);
  const [formConta, setFormConta] = useState<any>({});

  // Aba ativa
  const [aba, setAba] = useState<"lancamentos" | "contas">("lancamentos");

  const utils = trpc.useUtils();

  // Queries
  const { data: contas = [], refetch: refetchContas } = trpc.extratosBancarios.listarContas.useQuery(
    { empresa: empresa !== "Todas" ? empresa : undefined }
  );

  const { data: lancamentos = [], isLoading, refetch } = trpc.extratosBancarios.listar.useQuery({
    empresa: empresa !== "Todas" ? empresa : undefined,
    mesRef: mesRef || undefined,
    contaId,
    tipo: tipo !== "Todos" ? tipo : undefined,
    busca: busca || undefined,
    page: 1,
    pageSize: 500,
  });

  const { data: totais } = trpc.extratosBancarios.totais.useQuery({
    empresa: empresa !== "Todas" ? empresa : undefined,
    mesRef: mesRef || undefined,
    contaId,
  });

  // Mutations
  const criarMut = trpc.extratosBancarios.criar.useMutation({
    onSuccess: () => { utils.extratosBancarios.listar.invalidate(); utils.extratosBancarios.totais.invalidate(); setModalAberto(false); toast.success("Lançamento criado!"); },
    onError: (e) => toast.error(e.message),
  });
  const editarMut = trpc.extratosBancarios.editar.useMutation({
    onSuccess: () => { utils.extratosBancarios.listar.invalidate(); utils.extratosBancarios.totais.invalidate(); setModalAberto(false); toast.success("Lançamento atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const excluirMut = trpc.extratosBancarios.excluir.useMutation({
    onSuccess: () => { utils.extratosBancarios.listar.invalidate(); utils.extratosBancarios.totais.invalidate(); toast.success("Excluído!"); },
    onError: (e) => toast.error(e.message),
  });
  const criarContaMut = trpc.extratosBancarios.criarConta.useMutation({
    onSuccess: () => { utils.extratosBancarios.listarContas.invalidate(); setModalConta(false); toast.success("Conta criada!"); },
    onError: (e) => toast.error(e.message),
  });
  const editarContaMut = trpc.extratosBancarios.editarConta.useMutation({
    onSuccess: () => { utils.extratosBancarios.listarContas.invalidate(); setModalConta(false); toast.success("Conta atualizada!"); },
    onError: (e) => toast.error(e.message),
  });
  const desativarContaMut = trpc.extratosBancarios.desativarConta.useMutation({
    onSuccess: () => { utils.extratosBancarios.listarContas.invalidate(); toast.success("Conta desativada!"); },
  });

  // Handlers lançamento
  function abrirNovo() {
    setEditando(null);
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, "0");
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const aaaa = hoje.getFullYear();
    setForm({
      data: `${dd}/${mm}/${aaaa}`,
      tipo: "CRÉDITO",
      empresa: empresa !== "Todas" ? empresa : "BMF",
      contaId: contaId ?? (contas[0]?.id ?? 0),
      valor: "",
      descricao: "",
      categoria: "",
      numeroDocumento: "",
      observacoes: "",
    });
    setModalAberto(true);
  }

  function abrirEditar(item: any) {
    setEditando(item);
    setForm({ ...item, valor: String(item.valor) });
    setModalAberto(true);
  }

  function salvarLancamento() {
    const payload = {
      contaId: Number(form.contaId),
      empresa: form.empresa,
      data: form.data,
      descricao: form.descricao,
      valor: parseFloat(String(form.valor).replace(",", ".")),
      tipo: form.tipo,
      categoria: form.categoria || undefined,
      numeroDocumento: form.numeroDocumento || undefined,
      observacoes: form.observacoes || undefined,
    };
    if (editando) {
      editarMut.mutate({ id: editando.id, ...payload });
    } else {
      criarMut.mutate(payload);
    }
  }

  // Handlers conta
  function abrirNovaConta() {
    setEditandoConta(null);
    setFormConta({ empresa: "BMF", banco: "", agencia: "", conta: "", tipoConta: "Corrente", descricao: "" });
    setModalConta(true);
  }

  function abrirEditarConta(c: any) {
    setEditandoConta(c);
    setFormConta({ ...c });
    setModalConta(true);
  }

  function salvarConta() {
    if (editandoConta) {
      editarContaMut.mutate({ id: editandoConta.id, ...formConta });
    } else {
      criarContaMut.mutate(formConta);
    }
  }

  const meses = useMemo(() => gerarMeses(), []);

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PageHeader title="Extratos Bancários" subtitle="Lançamentos e movimentações das contas bancárias" />

      {/* Abas */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAba("lancamentos")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === "lancamentos" ? "bg-blue-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
          >
            Lançamentos
          </button>
          <button
            onClick={() => setAba("contas")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === "contas" ? "bg-blue-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
          >
            Contas Bancárias
          </button>
        </div>

        {/* ── ABA LANÇAMENTOS ── */}
        {aba === "lancamentos" && (
          <>
            {/* Filtros */}
            <div className="bg-white/5 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-white/70 text-xs">Empresa</Label>
                <Select value={empresa} onValueChange={setEmpresa}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    {EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Mês</Label>
                <Select value={mesRef} onValueChange={setMesRef}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Conta</Label>
                <Select value={contaId ? String(contaId) : "todas"} onValueChange={v => setContaId(v === "todas" ? undefined : Number(v))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {contas.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.empresa} — {c.banco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Busca</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1.5 h-3 w-3 text-white/40" />
                  <Input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Descrição..."
                    className="bg-white/10 border-white/20 text-white h-8 text-xs pl-6"
                  />
                </div>
              </div>
            </div>

            {/* Cards de totais */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-900/40 border border-green-500/30 rounded-xl p-3 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-400 shrink-0" />
                <div>
                  <p className="text-green-300 text-xs">Total Créditos</p>
                  <p className="text-green-100 font-bold text-sm">{fmtBRL(totais?.totalCredito ?? 0)}</p>
                </div>
              </div>
              <div className="bg-red-900/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-red-400 shrink-0" />
                <div>
                  <p className="text-red-300 text-xs">Total Débitos</p>
                  <p className="text-red-100 font-bold text-sm">{fmtBRL(totais?.totalDebito ?? 0)}</p>
                </div>
              </div>
              <div className={`rounded-xl p-3 flex items-center gap-3 border ${(totais?.saldo ?? 0) >= 0 ? "bg-blue-900/40 border-blue-500/30" : "bg-orange-900/40 border-orange-500/30"}`}>
                <DollarSign className={`h-8 w-8 shrink-0 ${(totais?.saldo ?? 0) >= 0 ? "text-blue-400" : "text-orange-400"}`} />
                <div>
                  <p className={`text-xs ${(totais?.saldo ?? 0) >= 0 ? "text-blue-300" : "text-orange-300"}`}>Saldo</p>
                  <p className={`font-bold text-sm ${(totais?.saldo ?? 0) >= 0 ? "text-blue-100" : "text-orange-100"}`}>{fmtBRL(totais?.saldo ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-white/50 text-xs">{lancamentos.length} lançamento(s)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => refetch()} className="h-7 text-xs border-white/20 text-white/70 hover:bg-white/10">
                  <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
                </Button>
                <Button size="sm" onClick={abrirNovo} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-3 w-3 mr-1" /> Novo Lançamento
                </Button>
              </div>
            </div>

            {/* Tabela */}
            <div className="bg-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1a2d4a] text-white/70">
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Empresa</th>
                      <th className="px-3 py-2 text-left">Descrição</th>
                      <th className="px-3 py-2 text-left">Categoria</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                      <th className="px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr><td colSpan={8} className="text-center text-white/40 py-8">Carregando...</td></tr>
                    )}
                    {!isLoading && lancamentos.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-white/40 py-8">Nenhum lançamento encontrado</td></tr>
                    )}
                    {lancamentos.map((item: any, idx: number) => (
                      <tr key={item.id} className={`border-t border-white/5 hover:bg-white/5 ${idx % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                        <td className="px-3 py-1.5 text-white/80 whitespace-nowrap">{item.data}</td>
                        <td className="px-3 py-1.5">
                          <Badge className={`text-[10px] px-1 py-0 ${item.empresa === "BMF" ? "bg-blue-700" : "bg-purple-700"}`}>{item.empresa}</Badge>
                        </td>
                        <td className="px-3 py-1.5 text-white/80 max-w-[200px] truncate">{item.descricao}</td>
                        <td className="px-3 py-1.5 text-white/60">{item.categoria || "-"}</td>
                        <td className="px-3 py-1.5">
                          <Badge className={`text-[10px] px-1 py-0 ${item.tipo === "CRÉDITO" ? "bg-green-700" : "bg-red-700"}`}>{item.tipo}</Badge>
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono font-semibold ${item.tipo === "CRÉDITO" ? "text-green-400" : "text-red-400"}`}>
                          {item.tipo === "CRÉDITO" ? "+" : "-"}{fmtBRL(item.valor)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-white/60">{item.saldo ? fmtBRL(item.saldo) : "-"}</td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => abrirEditar(item)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => { if (confirm("Excluir este lançamento?")) excluirMut.mutate({ id: item.id }); }} className="p-1 hover:bg-red-900/30 rounded text-white/50 hover:text-red-400">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── ABA CONTAS ── */}
        {aba === "contas" && (
          <>
            <div className="flex justify-between items-center mb-3">
              <span className="text-white/50 text-xs">{contas.length} conta(s) ativa(s)</span>
              <Button size="sm" onClick={abrirNovaConta} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                <Plus className="h-3 w-3 mr-1" /> Nova Conta
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contas.map((c: any) => (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className={`text-xs mb-1 ${c.empresa === "BMF" ? "bg-blue-700" : "bg-purple-700"}`}>{c.empresa}</Badge>
                      <p className="text-white font-semibold text-sm">{c.banco}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEditarConta(c)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => { if (confirm("Desativar esta conta?")) desativarContaMut.mutate({ id: c.id }); }} className="p-1 hover:bg-red-900/30 rounded text-white/50 hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-white/60 text-xs space-y-0.5">
                    {c.agencia && <p>Agência: {c.agencia}</p>}
                    {c.conta && <p>Conta: {c.conta}</p>}
                    {c.tipoConta && <p>Tipo: {c.tipoConta}</p>}
                    {c.descricao && <p className="text-white/40">{c.descricao}</p>}
                  </div>
                </div>
              ))}
              {contas.length === 0 && (
                <div className="col-span-3 text-center text-white/40 py-8">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma conta cadastrada</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Lançamento */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#0f1f35] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-white/70 text-xs">Empresa *</Label>
              <Select value={form.empresa || "BMF"} onValueChange={v => setForm({ ...form, empresa: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Conta *</Label>
              <Select value={form.contaId ? String(form.contaId) : ""} onValueChange={v => setForm({ ...form, contaId: Number(v) })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {contas.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.empresa} — {c.banco}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Data (DD/MM/AAAA) *</Label>
              <Input value={form.data || ""} onChange={e => setForm({ ...form, data: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" placeholder="DD/MM/AAAA" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Tipo *</Label>
              <Select value={form.tipo || "CRÉDITO"} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-white/70 text-xs">Descrição *</Label>
              <Input value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" placeholder="Descrição da movimentação" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Valor (R$) *</Label>
              <Input value={form.valor || ""} onChange={e => setForm({ ...form, valor: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" placeholder="0,00" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Categoria</Label>
              <Select value={form.categoria || ""} onValueChange={v => setForm({ ...form, categoria: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Nº Documento</Label>
              <Input value={form.numeroDocumento || ""} onChange={e => setForm({ ...form, numeroDocumento: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" placeholder="Opcional" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Saldo após</Label>
              <Input value={form.saldo || ""} onChange={e => setForm({ ...form, saldo: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" placeholder="Opcional" />
            </div>
            <div className="col-span-2">
              <Label className="text-white/70 text-xs">Observações</Label>
              <Input value={form.observacoes || ""} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} className="border-white/20 text-white/70 hover:bg-white/10">Cancelar</Button>
            <Button onClick={salvarLancamento} disabled={criarMut.isPending || editarMut.isPending} className="bg-blue-600 hover:bg-blue-700">
              {criarMut.isPending || editarMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Conta */}
      <Dialog open={modalConta} onOpenChange={setModalConta}>
        <DialogContent className="bg-[#0f1f35] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoConta ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-white/70 text-xs">Empresa *</Label>
              <Select value={formConta.empresa || "BMF"} onValueChange={v => setFormConta({ ...formConta, empresa: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Banco *</Label>
              <Input value={formConta.banco || ""} onChange={e => setFormConta({ ...formConta, banco: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" placeholder="Nome do banco" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Agência</Label>
              <Input value={formConta.agencia || ""} onChange={e => setFormConta({ ...formConta, agencia: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Conta</Label>
              <Input value={formConta.conta || ""} onChange={e => setFormConta({ ...formConta, conta: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Tipo</Label>
              <Select value={formConta.tipoConta || "Corrente"} onValueChange={v => setFormConta({ ...formConta, tipoConta: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Corrente", "Poupança", "Pagamento", "Investimento"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Descrição</Label>
              <Input value={formConta.descricao || ""} onChange={e => setFormConta({ ...formConta, descricao: e.target.value })} className="bg-white/10 border-white/20 text-white h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConta(false)} className="border-white/20 text-white/70 hover:bg-white/10">Cancelar</Button>
            <Button onClick={salvarConta} disabled={criarContaMut.isPending || editarContaMut.isPending} className="bg-blue-600 hover:bg-blue-700">
              {criarContaMut.isPending || editarContaMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
