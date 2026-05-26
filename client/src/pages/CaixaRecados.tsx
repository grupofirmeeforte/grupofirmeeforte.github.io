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
  ArrowLeft, Send, MessageSquare, Inbox, CheckCheck, RefreshCw,
  Clock, User, Crown, Shield, Headphones, UserCheck, Filter
} from "lucide-react";
import { toast } from "sonner";

const DESTINATARIOS = [
  { value: "ceo", label: "CEO", icon: Crown, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "admin", label: "Administração", icon: Shield, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "supervisor", label: "Supervisor", icon: UserCheck, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "suporte", label: "Suporte", icon: Headphones, color: "text-green-600 bg-green-50 border-green-200" },
];

function getDestinatarioInfo(dest: string) {
  return DESTINATARIOS.find(d => d.value === dest) ?? DESTINATARIOS[0];
}

function formatDate(ts: Date | string | null | undefined) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CaixaRecados() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Verificar se é CEO
  const openId = (user as any)?.openId ?? "";
  const cargo = (user as any)?.cargo ?? "";
  const isCeo = cargo.toLowerCase().includes("ceo") || openId === import.meta.env.VITE_OWNER_OPEN_ID;

  // ── Enviar recado ──────────────────────────────────────────────────────────
  const [destinatario, setDestinatario] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const utils = trpc.useUtils();
  const enviarMutation = trpc.recados.enviar.useMutation({
    onSuccess: () => {
      toast.success("Recado enviado com sucesso!");
      setDestinatario("");
      setAssunto("");
      setMensagem("");
      utils.recados.listar.invalidate();
      utils.recados.contarNaoLidos.invalidate();
    },
    onError: (e) => toast.error(e.message || "Erro ao enviar recado."),
  });

  const handleEnviar = () => {
    if (!destinatario) { toast.error("Selecione o destinatário."); return; }
    if (!mensagem.trim()) { toast.error("Escreva sua mensagem."); return; }
    enviarMutation.mutate({ destinatario: destinatario as any, assunto: assunto || undefined, mensagem });
  };

  // ── Recados recebidos ──────────────────────────────────────────────────────
  const [filtroDestinatario, setFiltroDestinatario] = useState("todos");
  const [filtroLido, setFiltroLido] = useState<"todos" | "nao_lidos">("todos");

  const recadosQuery = trpc.recados.listar.useQuery({
    destinatario: filtroDestinatario as any,
    apenasNaoLidos: filtroLido === "nao_lidos",
  }, { enabled: isCeo || cargo.toLowerCase().includes("admin") || cargo.toLowerCase().includes("supervisor") || cargo.toLowerCase().includes("suporte") });

  const marcarLidoMutation = trpc.recados.marcarLido.useMutation({
    onSuccess: () => { utils.recados.listar.invalidate(); utils.recados.contarNaoLidos.invalidate(); },
  });

  const marcarTodosLidosMutation = trpc.recados.marcarTodosLidos.useMutation({
    onSuccess: () => { toast.success("Todos os recados marcados como lidos."); utils.recados.listar.invalidate(); utils.recados.contarNaoLidos.invalidate(); },
  });

  const podeVerRecados = isCeo ||
    cargo.toLowerCase().includes("admin") ||
    cargo.toLowerCase().includes("supervisor") ||
    cargo.toLowerCase().includes("suporte");

  const naoLidos = recadosQuery.data?.filter(r => !r.lido).length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-700" />
            <h1 className="text-lg font-bold text-gray-900">Caixa de Recados</h1>
          </div>
          {naoLidos > 0 && podeVerRecados && (
            <Badge className="bg-red-500 text-white text-xs ml-1">{naoLidos} novo{naoLidos > 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue={podeVerRecados ? "recebidos" : "enviar"}>
          <TabsList className="mb-6">
            <TabsTrigger value="enviar" className="flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              Enviar Recado
            </TabsTrigger>
            {podeVerRecados && (
              <TabsTrigger value="recebidos" className="flex items-center gap-1.5">
                <Inbox className="w-4 h-4" />
                Recados Recebidos
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
                <p className="text-sm text-gray-500">Envie uma mensagem para a equipe de gestão.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Destinatário *</label>
                  <Select value={destinatario} onValueChange={setDestinatario}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o destinatário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DESTINATARIOS.map(d => (
                        <SelectItem key={d.value} value={d.value}>
                          <div className="flex items-center gap-2">
                            <d.icon className="w-4 h-4" />
                            {d.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          {podeVerRecados && (
            <TabsContent value="recebidos">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-blue-600" />
                      {isCeo ? "Todos os Recados" : "Recados Recebidos"}
                      {naoLidos > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">{naoLidos} não lido{naoLidos > 1 ? "s" : ""}</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Filtros CEO */}
                      {isCeo && (
                        <Select value={filtroDestinatario} onValueChange={setFiltroDestinatario}>
                          <SelectTrigger className="w-44 h-8 text-xs">
                            <Filter className="w-3 h-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os destinatários</SelectItem>
                            {DESTINATARIOS.map(d => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
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
                        const destInfo = getDestinatarioInfo(recado.destinatario);
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
                                    {isCeo && (
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
          )}
        </Tabs>
      </div>
    </div>
  );
}
