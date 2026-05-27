import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Check, CheckCheck, Bell } from "lucide-react";

interface Mensagem {
  id: number;
  remetenteId: number;
  remetenteNome: string;
  destinatarioId: number;
  destinatarioNome: string;
  conteudo: string;
  createdAt: Date | string;
  lida: boolean;
}

// Som de notificação via Web Audio API (sem arquivo externo)
function tocarSomNotificacao() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

// Mostrar notificação do browser
function mostrarNotificacaoBrowser(nome: string, mensagem: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`💬 ${nome}`, {
      body: mensagem,
      icon: "/favicon.ico",
    });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; nome: string } | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [erroEnvio, setErroEnvio] = useState("");
  // Badge: mapa de remetenteId -> quantidade de mensagens não lidas
  const [naoLidasPorRemetente, setNaoLidasPorRemetente] = useState<Record<number, number>>({});
  const [alertaAnimando, setAlertaAnimando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ultimoIdRef = useRef<number>(0); // último id de mensagem não lida visto

  // Extrair agenteId do openId (formato: "agente_123")
  const openId = (user as any)?.openId ?? "";
  const agenteId = openId.startsWith("agente_") ? parseInt(openId.replace("agente_", ""), 10) : null;
  const nomeAgente = (user as any)?.nomeAgente ?? user?.name ?? "Usuário";

  const utils = trpc.useUtils();

  // APIs
  const enviarMensagem = trpc.chat.enviarMensagem.useMutation();
  const marcarComoLidas = trpc.chat.marcarComoLidas.useMutation();

  const { data: usuariosConectados } = trpc.sessoes.getAtivas.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // Polling de mensagens não lidas (a cada 5s)
  const { data: naoLidasData } = trpc.chat.obterNaoLidas.useQuery(
    { usuarioId: agenteId ?? 0 },
    {
      enabled: !!agenteId,
      refetchInterval: 5000,
    }
  );

  // Mensagens da conversa aberta
  const { data: mensagensPrivadas, refetch: refetchMensagens } = trpc.chat.obterMensagensPrivadas.useQuery(
    selectedUser && agenteId
      ? { usuarioId: agenteId, outroUsuarioId: selectedUser.id }
      : { usuarioId: 0, outroUsuarioId: 0 },
    {
      enabled: !!selectedUser && !!agenteId,
      refetchInterval: selectedUser ? 3000 : false,
    }
  );

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Atualizar mensagens quando selecionado outro usuário
  useEffect(() => {
    if (mensagensPrivadas) {
      // Ordenar do mais antigo para o mais recente (a query retorna desc)
      const ordenadas = [...(mensagensPrivadas as Mensagem[])].reverse();
      setMensagens(ordenadas);
    }
  }, [mensagensPrivadas]);

  // Marcar como lidas ao abrir conversa
  useEffect(() => {
    if (selectedUser && agenteId) {
      marcarComoLidas.mutate({ usuarioId: agenteId, remetenteId: selectedUser.id });
      // Remover badge do remetente selecionado
      setNaoLidasPorRemetente(prev => {
        const next = { ...prev };
        delete next[selectedUser.id];
        return next;
      });
    }
  }, [selectedUser?.id]);

  // Processar mensagens não lidas e disparar notificações
  useEffect(() => {
    if (!naoLidasData || !agenteId) return;

    const msgs = naoLidasData as Mensagem[];
    if (msgs.length === 0) {
      setNaoLidasPorRemetente({});
      return;
    }

    // Agrupar por remetente
    const porRemetente: Record<number, { count: number; nome: string; ultimaMsg: Mensagem }> = {};
    for (const msg of msgs) {
      if (!porRemetente[msg.remetenteId]) {
        porRemetente[msg.remetenteId] = { count: 0, nome: msg.remetenteNome, ultimaMsg: msg };
      }
      porRemetente[msg.remetenteId].count++;
      // Manter a mais recente
      const atual = porRemetente[msg.remetenteId].ultimaMsg;
      if (new Date(msg.createdAt) > new Date(atual.createdAt)) {
        porRemetente[msg.remetenteId] = { ...porRemetente[msg.remetenteId], ultimaMsg: msg };
      }
    }

    // Detectar novas mensagens (id maior que o último visto)
    const maxId = Math.max(...msgs.map(m => m.id));
    if (maxId > ultimoIdRef.current) {
      // Há mensagens novas
      const novasNaoLidas = msgs.filter(m => m.id > ultimoIdRef.current);
      if (ultimoIdRef.current > 0 && novasNaoLidas.length > 0) {
        // Tocar som e mostrar alerta
        tocarSomNotificacao();
        setAlertaAnimando(true);
        setTimeout(() => setAlertaAnimando(false), 2000);
        // Notificação do browser
        const primeira = novasNaoLidas[0];
        mostrarNotificacaoBrowser(primeira.remetenteNome, primeira.conteudo);
      }
      ultimoIdRef.current = maxId;
    }

    // Atualizar badges (exceto para o usuário com conversa aberta)
    const novoBadge: Record<number, number> = {};
    for (const [remId, info] of Object.entries(porRemetente)) {
      const remIdNum = Number(remId);
      // Se a conversa com esse remetente está aberta, não mostrar badge
      if (selectedUser?.id === remIdNum) continue;
      novoBadge[remIdNum] = info.count;
    }
    setNaoLidasPorRemetente(novoBadge);
  }, [naoLidasData]);

  // Total de não lidas (para badge no botão flutuante)
  const totalNaoLidas = Object.values(naoLidasPorRemetente).reduce((a, b) => a + b, 0);

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim()) return;
    if (!selectedUser) { setErroEnvio("Selecione um usuário."); return; }
    if (!agenteId) { setErroEnvio("Usuário não identificado."); return; }
    setErroEnvio("");

    const conteudo = novaMensagem;
    setNovaMensagem("");

    try {
      await enviarMensagem.mutateAsync({
        remetenteId: agenteId,
        remetenteNome: nomeAgente,
        destinatarioId: selectedUser.id,
        destinatarioNome: selectedUser.nome,
        conteudo,
      });
      // Refetch para atualizar a conversa
      refetchMensagens();
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      setErroEnvio(error?.message || "Erro ao enviar mensagem.");
      setNovaMensagem(conteudo); // restaurar em caso de erro
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        // Botão flutuante com badge de não lidas
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            className={`rounded-full w-14 h-14 shadow-lg transition-transform ${alertaAnimando ? "scale-110 ring-4 ring-green-400" : ""}`}
            size="icon"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          {totalNaoLidas > 0 && (
            <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow ${alertaAnimando ? "animate-bounce" : ""}`}>
              {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
            </span>
          )}
        </div>
      ) : (
        <Card className="w-96 flex flex-col shadow-2xl border-0" style={{ height: "480px" }}>
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <h3 className="font-semibold text-white">
                {selectedUser ? selectedUser.nome : "Chat Interno"}
              </h3>
              {totalNaoLidas > 0 && !selectedUser && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {totalNaoLidas}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setIsOpen(false); setSelectedUser(null); }}
              className="text-white hover:bg-blue-500 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!selectedUser ? (
            // Lista de usuários conectados com badges
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Usuários conectados</p>
              <div className="space-y-1">
                {usuariosConectados?.filter((s: any) => s.agenteId !== agenteId).map((sessao: any) => {
                  const qtdNaoLidas = naoLidasPorRemetente[sessao.agenteId] ?? 0;
                  return (
                    <button
                      key={sessao.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200"
                      onClick={() => setSelectedUser({ id: sessao.agenteId, nome: sessao.nomeAgente })}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {sessao.nomeAgente?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${qtdNaoLidas > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                          {sessao.nomeAgente}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{sessao.modulo || "Online"}</p>
                      </div>
                      {qtdNaoLidas > 0 && (
                        <span className="flex-shrink-0 bg-green-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                          {qtdNaoLidas}
                        </span>
                      )}
                    </button>
                  );
                })}
                {(!usuariosConectados || usuariosConectados.filter((s: any) => s.agenteId !== agenteId).length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhum outro usuário conectado</p>
                )}
              </div>
            </div>
          ) : (
            // Chat privado
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                {mensagens.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                    <MessageCircle className="w-10 h-10 mb-2 text-gray-200" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-xs">Diga olá! 👋</p>
                  </div>
                )}
                {mensagens.map((msg) => {
                  const isMeu = msg.remetenteId === agenteId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMeu ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm ${
                          isMeu
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white text-gray-900 rounded-bl-sm border border-gray-100"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.conteudo}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMeu ? "justify-end" : "justify-start"}`}>
                          <p className={`text-[10px] ${isMeu ? "text-blue-200" : "text-gray-400"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {/* Ícone de lida/não lida (apenas para mensagens enviadas) */}
                          {isMeu && (
                            msg.lida
                              ? <CheckCheck className="w-3 h-3 text-blue-300" />
                              : <Check className="w-3 h-3 text-blue-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Erro de envio */}
              {erroEnvio && (
                <p className="px-4 py-1 text-xs text-red-500 bg-red-50 border-t border-red-100">{erroEnvio}</p>
              )}

              {/* Input */}
              <div className="p-3 border-t bg-white flex gap-2 items-center">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={novaMensagem}
                  onChange={(e) => { setNovaMensagem(e.target.value); setErroEnvio(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEnviarMensagem();
                    }
                  }}
                  className="flex-1 border-gray-200 focus:border-blue-400 rounded-full text-sm"
                />
                <Button
                  size="icon"
                  onClick={handleEnviarMensagem}
                  disabled={!novaMensagem.trim() || enviarMensagem.isPending}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Botão voltar */}
              <button
                className="w-full py-2 text-xs text-gray-500 hover:bg-gray-50 border-t flex items-center justify-center gap-1 transition-colors"
                onClick={() => setSelectedUser(null)}
              >
                ← Voltar para contatos
              </button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
