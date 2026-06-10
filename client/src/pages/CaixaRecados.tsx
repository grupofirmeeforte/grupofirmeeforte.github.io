import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send, MessageSquare, Inbox, CheckCheck, RefreshCw,
  Clock, Crown, Shield, Headphones, UserCheck, Filter, Users
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const DESTINATARIOS_CARGO = [
  { value: "ceo", label: "CEO", icon: Crown, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "admin", label: "Administração", icon: Shield, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "supervisor", label: "Supervisor", icon: UserCheck, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "suporte", label: "Suporte", icon: Headphones, color: "text-green-600 bg-green-50 border-green-200" },
];

const CARGOS_GESTAO = ["ceo", "admin", "administração", "administracao", "supervisor", "suporte"];

function isGestao(cargo: string) {
  const c = cargo.toLowerCase();
  return CARGOS_GESTAO.some(g => c.includes(g));
}

function getDestinatarioInfo(dest: string, destNome?: string | null) {
  if (dest === "promotor") {
    return { label: destNome ?? "Promotor", icon: Users, color: "text-orange-600 bg-orange-50 border-orange-200" };
  }
  return DESTINATARIOS_CARGO.find(d => d.value === dest) ?? DESTINATARIOS_CARGO[0];
}

function formatDate(ts: Date | string | null | undefined) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Tipo de destinatário selecionado
type TipoDestinatario = "cargo" | "promotor";

export default function CaixaRecados() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const cargo = (user as any)?.cargo ?? "";
  const euSouGestao = isGestao(cargo);
  const isCeo = cargo.toLowerCase().includes("ceo");
  const isPromotor = !euSouGestao;

  // ── Enviar recado ──────────────────────────────────────────────────────────
  const [tipoDestinatario, setTipoDestinatario] = useState<TipoDestinatario>("cargo");
  const [destinatarioCargo, setDestinatarioCargo] = useState("");
  const [destinatarioPromotorId, setDestinatarioPromotorId] = useState<string>("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const utils = trpc.useUtils();

  // Buscar lista de promotores (apenas para gestão)
  const promotoresQuery = trpc.recados.listarPromotores.useQuery(undefined, {
    enabled: euSouGestao,
  });

  const enviarMutation = trpc.recados.enviar.useMutation({
    onSuccess: () => {
      toast.success("Recado enviado com sucesso!");
      setDestinatarioCargo("");
      setDestinatarioPromotorId("");
      setAssunto("");
      setMensagem("");
      utils.recados.listar.invalidate();
      utils.recados.contarNaoLidos.invalidate();
    },
    onError: (e) => toast.error(e.message || "Erro ao enviar recado."),
  });

  const handleEnviar = () => {
    if (tipoDestinatario === "cargo") {
      if (!destinatarioCargo) { toast.error("Selecione o destinatário."); return; }
    } else {
      if (!destinatarioPromotorId) { toast.error("Selecione o promotor."); return; }
    }
    if (!mensagem.trim()) { toast.error("Escreva sua mensagem."); return; }

    if (tipoDestinatario === "cargo") {
      enviarMutation.mutate({ destinatario: destinatarioCargo as any, assunto: assunto || undefined, mensagem });
    } else {
      enviarMutation.mutate({ destinatarioId: parseInt(destinatarioPromotorId), assunto: assunto || undefined, mensagem });
    }
  };

  // ── Recados recebidos ──────────────────────────────────────────────────────
  const [filtroDestinatario, setFiltroDestinatario] = useState("todos");
  const [filtroLido, setFiltroLido] = useState<"todos" | "nao_lidos">("todos");

  // Promotores também podem ver recados recebidos da gestão
  const podeVerRecados = true;

  const recadosQuery = trpc.recados.listar.useQuery({
    destinatario: filtroDestinatario as any,
    apenasNaoLidos: filtroLido === "nao_lidos",
  });

  const marcarLidoMutation = trpc.recados.marcarLido.useMutation({
    onSuccess: () => { utils.recados.listar.invalidate(); utils.recados.contarNaoLidos.invalidate(); },
  });

  const marcarTodosLidosMutation = trpc.recados.marcarTodosLidos.useMutation({
    onSuccess: () => { toast.success("Todos os recados marcados como lidos."); utils.recados.listar.invalidate(); utils.recados.contarNaoLidos.invalidate(); },
  });

  const naoLidos = recadosQuery.data?.filter(r => !r.lido).length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <PageHeader title="Caixa de Recados" onBack={() => setLocation("/")} />
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-700" />
          <h1 className="text-lg font-bold text-gray-900">Caixa de Recados</h1>
          {naoLidos > 0 && (
            <Badge className="bg-red-500 text-white text-xs ml-1">{naoLidos} novo{naoLidos > 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue={isPromotor ? "enviar" : "recebidos"}>
          <TabsList className="mb-6">
            <TabsTrigger value="enviar" className="flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              Enviar Recado
            </TabsTrigger>
            {podeVerRecados && (
              <TabsTrigger value="recebidos" className="flex items-center gap-1.5">
                <Inbox className="w-4 h-4" />
                {isPromotor ? "Recados Recebidos" : "Recados Recebidos"}
                {naoLidos > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {naoLidos > 9 ? "9+" : naoLidos}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── ABA: Enviar ── */}
          <TabsContent value="enviar">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  Novo Recado
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {isPromotor
                    ? "Envie uma mensagem para a equipe de gestão."
                    : "Envie uma mensagem para a gestão ou para um promotor específico."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Seletor de tipo de destinatário — apenas para gestão */}
                {euSouGestao && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Destinatário</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTipoDestinatario("cargo")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          tipoDestinatario === "cargo"
                            ? "bg-blue-50 border-blue-400 text-blue-700"
                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <Crown className="w-4 h-4" />
                        Gestão (CEO/Admin/Supervisor/Suporte)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoDestinatario("promotor")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          tipoDestinatario === "promotor"
                            ? "bg-orange-50 border-orange-400 text-orange-700"
                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        Promotor de Vendas
                      </button>
                    </div>
                  </div>
                )}

                {/* Seletor de destinatário — botões visuais (sem z-index issues) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Destinatário *</label>
                  {tipoDestinatario === "cargo" || isPromotor ? (
                    <div className="grid grid-cols-2 gap-2">
                      {DESTINATARIOS_CARGO.map(d => {
                        const Icon = d.icon;
                        const sel = destinatarioCargo === d.value;
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setDestinatarioCargo(d.value)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                              sel ? d.color + " shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1">{d.label}</span>
                            {sel && <CheckCheck className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {promotoresQuery.isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Carregando promotores...
                        </div>
                      ) : !promotoresQuery.data?.length ? (
                        <p className="text-sm text-gray-400 py-3">Nenhum promotor ativo encontrado.</p>
                      ) : (
                        promotoresQuery.data.map(p => {
                          const sel = destinatarioPromotorId === String(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setDestinatarioPromotorId(String(p.id))}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                                sel
                                  ? "bg-orange-50 border-orange-400 text-orange-700 shadow-sm"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 text-sm font-bold text-orange-600">
                                {p.nomeAgente?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{p.nomeAgente}</p>
                                <p className="text-xs text-gray-400 font-mono">{p.chaveJ}</p>
                              </div>
                              {sel && <CheckCheck className="w-4 h-4 text-orange-500 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Assunto (opcional)</label>
                  <Input
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    placeholder="Ex: Sugestão, Dúvida, Elogio, Problema..."
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensagem *</label>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Escreva sua mensagem aqui..."
                    rows={5}
                    maxLength={2000}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{mensagem.length}/2000</p>
                </div>

                <Button
                  onClick={handleEnviar}
                  disabled={enviarMutation.isPending}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {enviarMutation.isPending ? "Enviando..." : "Enviar Recado"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA: Recebidos ── */}
          <TabsContent value="recebidos">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-blue-600" />
                    {isCeo ? "Todos os Recados" : isPromotor ? "Recados da Gestão" : "Recados Recebidos"}
                    {naoLidos > 0 && (
                      <Badge className="bg-red-500 text-white text-xs">{naoLidos} não lido{naoLidos > 1 ? "s" : ""}</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filtros CEO */}
                    {isCeo && (
                      <Select value={filtroDestinatario} onValueChange={setFiltroDestinatario}>
                        <SelectTrigger className="w-48 h-8 text-xs">
                          <Filter className="w-3 h-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os destinatários</SelectItem>
                          {DESTINATARIOS_CARGO.map(d => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                          <SelectItem value="promotor">Promotores</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={filtroLido} onValueChange={(v) => setFiltroLido(v as any)}>
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="nao_lidos">Não lidos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recadosQuery.refetch()}
                      className="h-8 px-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    {naoLidos > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => marcarTodosLidosMutation.mutate()}
                        disabled={marcarTodosLidosMutation.isPending}
                        className="h-8 text-xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5 mr-1" />
                        Marcar todos lidos
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recadosQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Carregando recados...
                  </div>
                ) : !recadosQuery.data?.length ? (
                  <div className="text-center py-12 text-gray-400">
                    <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Nenhum recado encontrado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recadosQuery.data.map((recado) => {
                      const destInfo = getDestinatarioInfo(recado.destinatario, recado.destinatarioNome);
                      const DestIcon = destInfo.icon;
                      return (
                        <div
                          key={recado.id}
                          className={`rounded-xl border p-4 transition-all ${
                            !recado.lido
                              ? "bg-blue-50/70 border-blue-200 shadow-sm"
                              : "bg-white border-gray-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Avatar remetente */}
                              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-sm font-bold text-slate-600">
                                {recado.remetenteNome?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-gray-900">{recado.remetenteNome}</span>
                                  {recado.remetenteChaveJ && (
                                    <span className="text-xs text-gray-400 font-mono">{recado.remetenteChaveJ}</span>
                                  )}
                                  {!recado.lido && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" title="Não lido" />
                                  )}
                                </div>
                                {recado.assunto && (
                                  <p className="text-sm font-medium text-gray-700 mt-0.5">{recado.assunto}</p>
                                )}
                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{recado.mensagem}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(recado.createdAt)}
                                  </span>
                                  {(isCeo || euSouGestao) && (
                                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${destInfo.color}`}>
                                      <DestIcon className="w-3 h-3" />
                                      Para: {destInfo.label}
                                    </span>
                                  )}
                                  {recado.lido && recado.lidoEm && (
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                      <CheckCheck className="w-3 h-3 text-green-500" />
                                      Lido em {formatDate(recado.lidoEm)}
                                      {recado.lidoPor ? ` por ${recado.lidoPor}` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!recado.lido && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => marcarLidoMutation.mutate({ id: recado.id })}
                                disabled={marcarLidoMutation.isPending}
                                className="h-7 text-xs shrink-0"
                              >
                                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                                Marcar lido
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
