import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, TrendingUp, Phone, CheckSquare, Mail, BarChart2,
  Plus, Search, ArrowLeft, Trash2, Edit, Eye, RefreshCw,
  PhoneCall, MessageCircle, MapPin, Send, X, ChevronLeft, ChevronRight,
  AlertCircle, Clock, CheckCircle2, XCircle, Upload
} from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================
type AbaType = "clientes" | "oportunidades" | "atendimentos" | "tarefas" | "mailing" | "relatorios";

const STATUS_OPORTUNIDADE: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-100 text-blue-800" },
  em_contato: { label: "Em Contato", color: "bg-yellow-100 text-yellow-800" },
  proposta_enviada: { label: "Proposta Enviada", color: "bg-purple-100 text-purple-800" },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-800" },
  fechado: { label: "Fechado", color: "bg-emerald-100 text-emerald-800" },
  perdido: { label: "Perdido", color: "bg-red-100 text-red-800" },
};

const STATUS_MAILING: Record<string, { label: string; color: string }> = {
  nao_contatado: { label: "Não Contatado", color: "bg-gray-100 text-gray-800" },
  em_contato: { label: "Em Contato", color: "bg-yellow-100 text-yellow-800" },
  convertido: { label: "Convertido", color: "bg-green-100 text-green-800" },
  sem_interesse: { label: "Sem Interesse", color: "bg-red-100 text-red-800" },
  invalido: { label: "Inválido", color: "bg-orange-100 text-orange-800" },
};

const STATUS_TAREFA: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  concluida: { label: "Concluída", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800", icon: XCircle },
};

const CANAL_ICONS: Record<string, any> = {
  telefone: PhoneCall,
  whatsapp: MessageCircle,
  presencial: MapPin,
  email: Mail,
  outro: Phone,
};

function fmtMoeda(v: any) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtData(v: any) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

// ============================================================================
// ABA RESUMO (RELATÓRIOS)
// ============================================================================
function AbaRelatorios() {
  const { data: resumo, isLoading } = trpc.crm.relatorios.resumo.useQuery();
  const { data: funil } = trpc.crm.relatorios.funil.useQuery();
  const { data: produtividade } = trpc.crm.relatorios.produtividadeAgentes.useQuery();

  const totalFunil = funil?.reduce((acc, f) => acc + Number(f.total), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Clientes Cadastrados", value: resumo?.totalClientes ?? 0, icon: Users, color: "text-blue-600" },
          { label: "Oportunidades Ativas", value: resumo?.oportunidadesAtivas ?? 0, icon: TrendingUp, color: "text-green-600" },
          { label: "Tarefas Pendentes", value: resumo?.tarefasPendentes ?? 0, icon: CheckSquare, color: "text-orange-600" },
          { label: "Mailing Não Contatado", value: resumo?.mailingNaoContatado ?? 0, icon: Mail, color: "text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Icon className={`w-8 h-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funil de oportunidades */}
      <Card>
        <CardHeader><CardTitle className="text-base">Funil de Oportunidades</CardTitle></CardHeader>
        <CardContent>
          {!funil || funil.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Nenhuma oportunidade cadastrada</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(STATUS_OPORTUNIDADE).map(([key, { label, color }]) => {
                const item = funil.find(f => f.status === key);
                const total = Number(item?.total ?? 0);
                const pct = totalFunil > 0 ? Math.round((total / totalFunil) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-gray-600 text-right">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                      <div className={`h-5 rounded-full ${color.replace("text-", "bg-").replace("-800", "-400").replace("-100", "-400")}`} style={{ width: `${pct}%`, minWidth: total > 0 ? "2rem" : 0 }} />
                    </div>
                    <span className="w-8 text-xs font-bold text-right">{total}</span>
                    <span className="w-8 text-xs text-gray-400">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Produtividade */}
      {produtividade && produtividade.oportunidades.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Produtividade por Agente</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Agente</th>
                    <th className="text-center py-2 px-2">Oportunidades</th>
                    <th className="text-center py-2 px-2">Fechadas</th>
                    <th className="text-center py-2 px-2">Atendimentos</th>
                  </tr>
                </thead>
                <tbody>
                  {produtividade.oportunidades.map((op, i) => {
                    const at = produtividade.atendimentos.find(a => a.chaveJ === op.chaveJ);
                    return (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{op.agente ?? op.chaveJ ?? "—"}</td>
                        <td className="text-center py-2 px-2">{op.total}</td>
                        <td className="text-center py-2 px-2 text-green-600 font-semibold">{op.fechados}</td>
                        <td className="text-center py-2 px-2">{at?.total ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// ABA CLIENTES
// ============================================================================
function AbaClientes() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crm.clientes.listar.useQuery({ busca, pagina, porPagina: 20 });
  const criar = trpc.crm.clientes.criar.useMutation({ onSuccess: () => { utils.crm.clientes.listar.invalidate(); toast.success("Cliente cadastrado!"); setModalAberto(false); setForm({}); } });
  const atualizar = trpc.crm.clientes.atualizar.useMutation({ onSuccess: () => { utils.crm.clientes.listar.invalidate(); toast.success("Cliente atualizado!"); setModalAberto(false); setEditando(null); setForm({}); } });
  const excluir = trpc.crm.clientes.excluir.useMutation({ onSuccess: () => { utils.crm.clientes.listar.invalidate(); toast.success("Cliente removido!"); } });

  const abrirNovo = () => { setEditando(null); setForm({ chaveJAgente: (user as any)?.chaveJ ?? "" }); setModalAberto(true); };
  const abrirEditar = (c: any) => { setEditando(c); setForm({ ...c }); setModalAberto(true); };
  const salvar = () => {
    if (!form.nome?.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editando) atualizar.mutate({ id: editando.id, ...form });
    else criar.mutate(form);
  };

  const totalPaginas = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por nome, CPF ou telefone..." className="pl-9" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} />
        </div>
        <Button onClick={abrirNovo} className="bg-sky-600 hover:bg-sky-700 text-white gap-1"><Plus className="w-4 h-4" /> Novo Cliente</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Nome", "CPF", "Telefone", "Convênio", "Margem", "Agente", "Ações"].map(h => (
                <th key={h} className="text-left py-2 px-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            ) : !data?.clientes.length ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum cliente cadastrado</td></tr>
            ) : data.clientes.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-medium">{c.nome}</td>
                <td className="py-2 px-3 text-gray-600">{c.cpf ?? "—"}</td>
                <td className="py-2 px-3">{c.telefone ?? "—"}</td>
                <td className="py-2 px-3">{c.convenio ?? "—"}</td>
                <td className="py-2 px-3">{fmtMoeda(c.margemDisponivel)}</td>
                <td className="py-2 px-3 text-gray-500 text-xs">{c.chaveJAgente ?? "—"}</td>
                <td className="py-2 px-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => abrirEditar(c)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:bg-red-50" onClick={() => { if (confirm("Excluir cliente?")) excluir.mutate({ id: c.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data?.total} clientes</span>
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span>{pagina} / {totalPaginas}</span>
            <Button size="sm" variant="outline" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "nome", label: "Nome *", required: true },
              { key: "cpf", label: "CPF" },
              { key: "dataNascimento", label: "Data Nascimento" },
              { key: "telefone", label: "Telefone" },
              { key: "telefone2", label: "Telefone 2" },
              { key: "email", label: "E-mail" },
              { key: "convenio", label: "Convênio" },
              { key: "matricula", label: "Matrícula" },
              { key: "margemDisponivel", label: "Margem Disponível" },
              { key: "beneficio", label: "Benefício" },
              { key: "banco", label: "Banco" },
              { key: "agencia", label: "Agência" },
              { key: "conta", label: "Conta" },
              { key: "origem", label: "Origem" },
              { key: "chaveJAgente", label: "ChaveJ Agente" },
              { key: "agenteResponsavel", label: "Agente Responsável" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input className="mt-1" value={form[key] ?? ""} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="col-span-2">
              <Label className="text-xs">Endereço</Label>
              <Input className="mt-1" value={form.endereco ?? ""} onChange={e => setForm((f: any) => ({ ...f, endereco: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Cidade</Label>
              <Input className="mt-1" value={form.cidade ?? ""} onChange={e => setForm((f: any) => ({ ...f, cidade: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">UF</Label>
              <Input className="mt-1 uppercase" maxLength={2} value={form.uf ?? ""} onChange={e => setForm((f: any) => ({ ...f, uf: e.target.value.toUpperCase() }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Observações</Label>
              <Textarea className="mt-1" rows={3} value={form.observacoes ?? ""} onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={criar.isPending || atualizar.isPending} className="bg-sky-600 hover:bg-sky-700 text-white">
              {criar.isPending || atualizar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ABA OPORTUNIDADES
// ============================================================================
function AbaOportunidades() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crm.oportunidades.listar.useQuery({
    busca: busca || undefined,
    status: filtroStatus !== "todos" ? filtroStatus : undefined,
  });
  const criar = trpc.crm.oportunidades.criar.useMutation({ onSuccess: () => { utils.crm.oportunidades.listar.invalidate(); toast.success("Oportunidade criada!"); setModalAberto(false); setForm({}); } });
  const atualizar = trpc.crm.oportunidades.atualizar.useMutation({ onSuccess: () => { utils.crm.oportunidades.listar.invalidate(); toast.success("Oportunidade atualizada!"); setModalAberto(false); setEditando(null); setForm({}); } });
  const excluir = trpc.crm.oportunidades.excluir.useMutation({ onSuccess: () => { utils.crm.oportunidades.listar.invalidate(); toast.success("Oportunidade removida!"); } });

  const abrirNovo = () => { setEditando(null); setForm({ status: "novo", chaveJAgente: (user as any)?.chaveJ ?? "" }); setModalAberto(true); };
  const abrirEditar = (o: any) => { setEditando(o); setForm({ ...o }); setModalAberto(true); };
  const salvar = () => {
    if (!form.clienteNome?.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    if (editando) atualizar.mutate({ id: editando.id, ...form });
    else criar.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por cliente..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_OPORTUNIDADE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={abrirNovo} className="bg-sky-600 hover:bg-sky-700 text-white gap-1"><Plus className="w-4 h-4" /> Nova Oportunidade</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Cliente", "Produto", "Valor Est.", "Status", "Previsão", "Agente", "Ações"].map(h => (
                <th key={h} className="text-left py-2 px-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            ) : !data?.length ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma oportunidade encontrada</td></tr>
            ) : data.map(o => {
              const st = STATUS_OPORTUNIDADE[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-800" };
              return (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{o.clienteNome}</td>
                  <td className="py-2 px-3 text-gray-600">{o.produto ?? "—"}</td>
                  <td className="py-2 px-3">{fmtMoeda(o.valorEstimado)}</td>
                  <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="py-2 px-3 text-gray-500">{o.previsaoFechamento ? fmtData(o.previsaoFechamento) : "—"}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{o.chaveJAgente ?? "—"}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => abrirEditar(o)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:bg-red-50" onClick={() => { if (confirm("Excluir?")) excluir.mutate({ id: o.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Cliente *</Label><Input className="mt-1" value={form.clienteNome ?? ""} onChange={e => setForm((f: any) => ({ ...f, clienteNome: e.target.value }))} /></div>
            <div><Label className="text-xs">Produto</Label><Input className="mt-1" value={form.produto ?? ""} onChange={e => setForm((f: any) => ({ ...f, produto: e.target.value }))} /></div>
            <div><Label className="text-xs">Valor Estimado</Label><Input className="mt-1" type="number" value={form.valorEstimado ?? ""} onChange={e => setForm((f: any) => ({ ...f, valorEstimado: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status ?? "novo"} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_OPORTUNIDADE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.status === "perdido" && <div><Label className="text-xs">Motivo da Perda</Label><Input className="mt-1" value={form.motivoPerda ?? ""} onChange={e => setForm((f: any) => ({ ...f, motivoPerda: e.target.value }))} /></div>}
            <div><Label className="text-xs">Previsão de Fechamento</Label><Input className="mt-1" type="date" value={form.previsaoFechamento ?? ""} onChange={e => setForm((f: any) => ({ ...f, previsaoFechamento: e.target.value }))} /></div>
            <div><Label className="text-xs">Agente Responsável</Label><Input className="mt-1" value={form.agenteResponsavel ?? ""} onChange={e => setForm((f: any) => ({ ...f, agenteResponsavel: e.target.value }))} /></div>
            <div><Label className="text-xs">ChaveJ</Label><Input className="mt-1" value={form.chaveJAgente ?? ""} onChange={e => setForm((f: any) => ({ ...f, chaveJAgente: e.target.value }))} /></div>
            <div><Label className="text-xs">Observações</Label><Textarea className="mt-1" rows={3} value={form.observacoes ?? ""} onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={criar.isPending || atualizar.isPending} className="bg-sky-600 hover:bg-sky-700 text-white">
              {criar.isPending || atualizar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ABA ATENDIMENTOS
// ============================================================================
function AbaAtendimentos() {
  const { user } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<any>({});

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crm.atendimentos.listar.useQuery({ porPagina: 50 });
  const criar = trpc.crm.atendimentos.criar.useMutation({ onSuccess: () => { utils.crm.atendimentos.listar.invalidate(); toast.success("Atendimento registrado!"); setModalAberto(false); setForm({}); } });
  const excluir = trpc.crm.atendimentos.excluir.useMutation({ onSuccess: () => { utils.crm.atendimentos.listar.invalidate(); toast.success("Atendimento removido!"); } });

  const abrirNovo = () => { setForm({ canal: "telefone", resultado: "contato_realizado", chaveJAgente: (user as any)?.chaveJ ?? "" }); setModalAberto(true); };
  const salvar = () => {
    if (!form.clienteNome?.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    criar.mutate(form);
  };

  const RESULTADO_LABELS: Record<string, string> = {
    contato_realizado: "Contato Realizado",
    sem_resposta: "Sem Resposta",
    retornar: "Retornar",
    proposta_aceita: "Proposta Aceita",
    proposta_recusada: "Proposta Recusada",
    encerrado: "Encerrado",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={abrirNovo} className="bg-sky-600 hover:bg-sky-700 text-white gap-1"><Plus className="w-4 h-4" /> Registrar Atendimento</Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-center text-gray-400 py-8">Carregando...</p>
        ) : !data?.length ? (
          <p className="text-center text-gray-400 py-8">Nenhum atendimento registrado</p>
        ) : data.map(a => {
          const CanalIcon = CANAL_ICONS[a.canal] ?? Phone;
          return (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <CanalIcon className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{a.clienteNome}</span>
                        <Badge variant="outline" className="text-xs">{a.canal}</Badge>
                        <Badge className={`text-xs ${a.resultado === "proposta_aceita" ? "bg-green-100 text-green-800" : a.resultado === "sem_resposta" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                          {RESULTADO_LABELS[a.resultado] ?? a.resultado}
                        </Badge>
                      </div>
                      {a.assunto && <p className="text-sm text-gray-600 mt-1">{a.assunto}</p>}
                      {a.descricao && <p className="text-xs text-gray-500 mt-1">{a.descricao}</p>}
                      {a.proximoPasso && <p className="text-xs text-blue-600 mt-1">Próximo passo: {a.proximoPasso}</p>}
                      <p className="text-xs text-gray-400 mt-1">{fmtData(a.dataAtendimento)} · {a.chaveJAgente ?? "—"}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:bg-red-50 flex-shrink-0" onClick={() => { if (confirm("Excluir atendimento?")) excluir.mutate({ id: a.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Atendimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Cliente *</Label><Input className="mt-1" value={form.clienteNome ?? ""} onChange={e => setForm((f: any) => ({ ...f, clienteNome: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={form.canal ?? "telefone"} onValueChange={v => setForm((f: any) => ({ ...f, canal: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["telefone","whatsapp","presencial","email","outro"].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Assunto</Label><Input className="mt-1" value={form.assunto ?? ""} onChange={e => setForm((f: any) => ({ ...f, assunto: e.target.value }))} /></div>
            <div><Label className="text-xs">Descrição</Label><Textarea className="mt-1" rows={3} value={form.descricao ?? ""} onChange={e => setForm((f: any) => ({ ...f, descricao: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Resultado</Label>
              <Select value={form.resultado ?? "contato_realizado"} onValueChange={v => setForm((f: any) => ({ ...f, resultado: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries({ contato_realizado: "Contato Realizado", sem_resposta: "Sem Resposta", retornar: "Retornar", proposta_aceita: "Proposta Aceita", proposta_recusada: "Proposta Recusada", encerrado: "Encerrado" }).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Próximo Passo</Label><Input className="mt-1" value={form.proximoPasso ?? ""} onChange={e => setForm((f: any) => ({ ...f, proximoPasso: e.target.value }))} /></div>
            <div><Label className="text-xs">ChaveJ Agente</Label><Input className="mt-1" value={form.chaveJAgente ?? ""} onChange={e => setForm((f: any) => ({ ...f, chaveJAgente: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={criar.isPending} className="bg-sky-600 hover:bg-sky-700 text-white">
              {criar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ABA TAREFAS
// ============================================================================
function AbaTarefas() {
  const { user } = useAuth();
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<any>({});

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crm.tarefas.listar.useQuery({ status: filtroStatus !== "todos" ? filtroStatus : undefined, porPagina: 50 });
  const criar = trpc.crm.tarefas.criar.useMutation({ onSuccess: () => { utils.crm.tarefas.listar.invalidate(); toast.success("Tarefa criada!"); setModalAberto(false); setForm({}); } });
  const atualizar = trpc.crm.tarefas.atualizar.useMutation({ onSuccess: () => { utils.crm.tarefas.listar.invalidate(); toast.success("Tarefa atualizada!"); } });
  const excluir = trpc.crm.tarefas.excluir.useMutation({ onSuccess: () => { utils.crm.tarefas.listar.invalidate(); toast.success("Tarefa removida!"); } });

  const abrirNovo = () => { setForm({ tipo: "ligar", prioridade: "media", chaveJAgente: (user as any)?.chaveJ ?? "" }); setModalAberto(true); };
  const salvar = () => {
    if (!form.titulo?.trim()) { toast.error("Título é obrigatório"); return; }
    criar.mutate(form);
  };
  const concluir = (id: number) => atualizar.mutate({ id, status: "concluida", dataConclusao: new Date().toISOString() });

  const PRIORIDADE_COLORS: Record<string, string> = { baixa: "bg-gray-100 text-gray-600", media: "bg-yellow-100 text-yellow-700", alta: "bg-red-100 text-red-700" };
  const TIPO_ICONS: Record<string, any> = { ligar: PhoneCall, whatsapp: MessageCircle, email: Mail, visita: MapPin, enviar_proposta: Send, outro: CheckSquare };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1">
          {["todos", "pendente", "em_andamento", "concluida", "cancelada"].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtroStatus === s ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s === "todos" ? "Todas" : STATUS_TAREFA[s]?.label ?? s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={abrirNovo} className="bg-sky-600 hover:bg-sky-700 text-white gap-1"><Plus className="w-4 h-4" /> Nova Tarefa</Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center text-gray-400 py-8">Carregando...</p>
        ) : !data?.length ? (
          <p className="text-center text-gray-400 py-8">Nenhuma tarefa encontrada</p>
        ) : data.map(t => {
          const TipoIcon = TIPO_ICONS[t.tipo] ?? CheckSquare;
          const st = STATUS_TAREFA[t.status] ?? { label: t.status, color: "bg-gray-100 text-gray-800", icon: CheckSquare };
          const vencida = t.dataVencimento && new Date(t.dataVencimento) < new Date() && t.status === "pendente";
          return (
            <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${vencida ? "border-red-200 bg-red-50" : "bg-white hover:bg-gray-50"} transition-colors`}>
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                <TipoIcon className="w-4 h-4 text-sky-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium text-sm ${t.status === "concluida" ? "line-through text-gray-400" : ""}`}>{t.titulo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDADE_COLORS[t.prioridade]}`}>{t.prioridade}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                  {vencida && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Vencida</span>}
                </div>
                {t.clienteNome && <p className="text-xs text-gray-500 mt-0.5">Cliente: {t.clienteNome}</p>}
                {t.dataVencimento && <p className="text-xs text-gray-400">Vence: {fmtData(t.dataVencimento)}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {t.status === "pendente" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:bg-green-50" onClick={() => concluir(t.id)} title="Concluir"><CheckCircle2 className="w-3.5 h-3.5" /></Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:bg-red-50" onClick={() => { if (confirm("Excluir tarefa?")) excluir.mutate({ id: t.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Título *</Label><Input className="mt-1" value={form.titulo ?? ""} onChange={e => setForm((f: any) => ({ ...f, titulo: e.target.value }))} /></div>
            <div><Label className="text-xs">Cliente</Label><Input className="mt-1" value={form.clienteNome ?? ""} onChange={e => setForm((f: any) => ({ ...f, clienteNome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo ?? "ligar"} onValueChange={v => setForm((f: any) => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["ligar","whatsapp","email","visita","enviar_proposta","outro"].map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.prioridade ?? "media"} onValueChange={v => setForm((f: any) => ({ ...f, prioridade: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["baixa","media","alta"].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Data de Vencimento</Label><Input className="mt-1" type="datetime-local" value={form.dataVencimento ?? ""} onChange={e => setForm((f: any) => ({ ...f, dataVencimento: e.target.value }))} /></div>
            <div><Label className="text-xs">Descrição</Label><Textarea className="mt-1" rows={3} value={form.descricao ?? ""} onChange={e => setForm((f: any) => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label className="text-xs">ChaveJ Agente</Label><Input className="mt-1" value={form.chaveJAgente ?? ""} onChange={e => setForm((f: any) => ({ ...f, chaveJAgente: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={criar.isPending} className="bg-sky-600 hover:bg-sky-700 text-white">
              {criar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ABA MAILING
// ============================================================================
function AbaMailing() {
  const [listaAtiva, setListaAtiva] = useState<string | null>(null);
  const [listaNomeAtiva, setListaNomeAtiva] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [modalImportar, setModalImportar] = useState(false);
  const [nomeNovaLista, setNomeNovaLista] = useState("");
  const [csvTexto, setCsvTexto] = useState("");

  const utils = trpc.useUtils();
  const { data: listas, isLoading: loadingListas } = trpc.crm.mailing.listarListas.useQuery();
  const { data: contatos, isLoading: loadingContatos } = trpc.crm.mailing.listarContatos.useQuery(
    { listaId: listaAtiva!, busca: busca || undefined, status: filtroStatus !== "todos" ? filtroStatus : undefined, pagina, porPagina: 30 },
    { enabled: !!listaAtiva }
  );
  const importar = trpc.crm.mailing.importar.useMutation({ onSuccess: (r) => { utils.crm.mailing.listarListas.invalidate(); toast.success(`${r.total} contatos importados!`); setModalImportar(false); setCsvTexto(""); setNomeNovaLista(""); } });
  const atualizarStatus = trpc.crm.mailing.atualizarStatus.useMutation({ onSuccess: () => utils.crm.mailing.listarContatos.invalidate() });
  const excluirLista = trpc.crm.mailing.excluirLista.useMutation({ onSuccess: () => { utils.crm.mailing.listarListas.invalidate(); setListaAtiva(null); toast.success("Lista excluída!"); } });

  const processarCSV = () => {
    if (!nomeNovaLista.trim()) { toast.error("Nome da lista é obrigatório"); return; }
    const linhas = csvTexto.trim().split("\n").filter(l => l.trim());
    if (linhas.length < 2) { toast.error("CSV deve ter pelo menos um cabeçalho e um registro"); return; }
    const cabecalho = linhas[0].split(/[,;]/).map(h => h.trim().toLowerCase());
    const contatos = linhas.slice(1).map(linha => {
      const cols = linha.split(/[,;]/);
      const obj: any = {};
      cabecalho.forEach((h, i) => { obj[h] = cols[i]?.trim() ?? ""; });
      return {
        nome: obj.nome || obj.name || "Sem nome",
        cpf: obj.cpf || undefined,
        telefone: obj.telefone || obj.tel || obj.phone || undefined,
        telefone2: obj.telefone2 || obj.tel2 || undefined,
        convenio: obj.convenio || obj.convênio || undefined,
        beneficio: obj.beneficio || obj.benefício || undefined,
        margemDisponivel: obj.margem || obj.margemdisponivel || undefined,
      };
    });
    importar.mutate({ listaNome: nomeNovaLista, contatos });
  };

  const totalPaginas = Math.ceil((contatos?.total ?? 0) / 30);

  if (listaAtiva) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" onClick={() => { setListaAtiva(null); setBusca(""); setFiltroStatus("todos"); setPagina(1); }} className="gap-1 bg-orange-500 hover:bg-orange-600 text-white"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
          <h3 className="font-semibold text-gray-800">{listaNomeAtiva}</h3>
          <span className="text-sm text-gray-500">{contatos?.total ?? 0} contatos</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar..." className="pl-9" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} />
          </div>
          <Select value={filtroStatus} onValueChange={v => { setFiltroStatus(v); setPagina(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_MAILING).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{["Nome", "CPF", "Telefone", "Convênio", "Margem", "Status", "Ação"].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loadingContatos ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : !contatos?.contatos.length ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum contato</td></tr>
              ) : contatos.contatos.map(c => {
                const st = STATUS_MAILING[c.status] ?? { label: c.status, color: "bg-gray-100 text-gray-800" };
                return (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{c.nome}</td>
                    <td className="py-2 px-3 text-gray-500">{c.cpf ?? "—"}</td>
                    <td className="py-2 px-3">{c.telefone ?? "—"}</td>
                    <td className="py-2 px-3 text-gray-500">{c.convenio ?? "—"}</td>
                    <td className="py-2 px-3">{fmtMoeda(c.margemDisponivel)}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="py-2 px-3">
                      <Select value={c.status} onValueChange={v => atualizarStatus.mutate({ id: c.id, status: v as any })}>
                        <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUS_MAILING).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{contatos?.total} contatos</span>
            <div className="flex gap-2 items-center">
              <Button size="sm" variant="outline" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <span>{pagina} / {totalPaginas}</span>
              <Button size="sm" variant="outline" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalImportar(true)} className="bg-sky-600 hover:bg-sky-700 text-white gap-1"><Upload className="w-4 h-4" /> Importar Lista</Button>
      </div>

      {loadingListas ? (
        <p className="text-center text-gray-400 py-8">Carregando...</p>
      ) : !listas?.length ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma lista de mailing</p>
          <p className="text-sm text-gray-400">Importe uma lista CSV para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listas.map(l => (
            <Card key={l.listaId} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setListaAtiva(l.listaId); setListaNomeAtiva(l.listaNome); }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">{l.listaNome}</h4>
                    <p className="text-sm text-gray-500 mt-1">{Number(l.total)} contatos</p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-gray-500">{Number(l.naoContatados)} não contatados</span>
                      <span className="text-green-600 font-medium">{Number(l.convertidos)} convertidos</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 h-7 px-2" onClick={e => { e.stopPropagation(); if (confirm("Excluir lista?")) excluirLista.mutate({ listaId: l.listaId }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalImportar} onOpenChange={setModalImportar}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar Lista de Mailing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome da Lista *</Label><Input className="mt-1" placeholder="Ex: Mailing INSS Maio 2026" value={nomeNovaLista} onChange={e => setNomeNovaLista(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Dados CSV (cole o conteúdo abaixo)</Label>
              <p className="text-xs text-gray-400 mt-0.5">Colunas aceitas: nome, cpf, telefone, telefone2, convenio, beneficio, margem</p>
              <Textarea className="mt-1 font-mono text-xs" rows={8} placeholder={"nome,cpf,telefone,convenio\nJoão Silva,123.456.789-00,11999999999,INSS"} value={csvTexto} onChange={e => setCsvTexto(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalImportar(false)}>Cancelar</Button>
            <Button onClick={processarCSV} disabled={importar.isPending} className="bg-sky-600 hover:bg-sky-700 text-white">
              {importar.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL CRM
// ============================================================================
const ABAS: { key: AbaType; label: string; icon: any }[] = [
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "oportunidades", label: "Oportunidades", icon: TrendingUp },
  { key: "atendimentos", label: "Atendimentos", icon: Phone },
  { key: "tarefas", label: "Tarefas / Follow-up", icon: CheckSquare },
  { key: "mailing", label: "Mailing", icon: Mail },
  { key: "relatorios", label: "Relatórios", icon: BarChart2 },
];

export default function CRMPage() {
  const [, navigate] = useLocation();
  const [abaAtiva, setAbaAtiva] = useState<AbaType>("clientes");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">CRM</h1>
          <p className="text-xs text-gray-500">Gestão de Relacionamento com Clientes</p>
        </div>
        <Button size="sm" onClick={() => navigate("/")} className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>

      {/* Abas */}
      <div className="bg-white border-b px-4">
        <div className="flex gap-0 overflow-x-auto">
          {ABAS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAbaAtiva(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                abaAtiva === key
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 max-w-7xl mx-auto">
        {abaAtiva === "clientes" && <AbaClientes />}
        {abaAtiva === "oportunidades" && <AbaOportunidades />}
        {abaAtiva === "atendimentos" && <AbaAtendimentos />}
        {abaAtiva === "tarefas" && <AbaTarefas />}
        {abaAtiva === "mailing" && <AbaMailing />}
        {abaAtiva === "relatorios" && <AbaRelatorios />}
      </div>
    </div>
  );
}
