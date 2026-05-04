import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send } from "lucide-react";

interface Mensagem {
  id: number;
  remetenteId: number;
  remetenteNome: string;
  destinatarioId: number;
  destinatarioNome: string;
  conteudo: string;
  createdAt: Date;
  lida: boolean;
}

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // APIs
  const enviarMensagem = trpc.chat.enviarMensagem.useMutation();
  const { data: usuariosConectados } = trpc.sessoes.getAtivas.useQuery(undefined, {
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });
  const { data: mensagensPrivadas } = trpc.chat.obterMensagensPrivadas.useQuery(
    selectedUser && user?.id ? { usuarioId: user.id, outroUsuarioId: selectedUser } : { usuarioId: 0, outroUsuarioId: 0 },
    { enabled: !!selectedUser && !!user?.id }
  );

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Atualizar mensagens quando selecionado outro usuário
  useEffect(() => {
    if (mensagensPrivadas) {
      setMensagens(mensagensPrivadas as Mensagem[]);
    }
  }, [mensagensPrivadas]);

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim() || !selectedUser || !user) return;

    try {
      await enviarMensagem.mutateAsync({
        remetenteId: user.id,
        remetenteNome: user.name || "Usuário",
        destinatarioId: selectedUser,
        destinatarioNome: "Destinatário",
        conteudo: novaMensagem,
      });

      // Adicionar mensagem localmente
      setMensagens([
        ...mensagens,
        {
          id: Date.now(),
          remetenteId: user.id,
          remetenteNome: user.name || "Você",
          destinatarioId: selectedUser,
          destinatarioNome: "Destinatário",
          conteudo: novaMensagem,
          createdAt: new Date(),
          lida: false,
        },
      ]);

      setNovaMensagem("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      ) : (
        <Card className="w-96 h-96 flex flex-col shadow-lg">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold">Chat</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                setSelectedUser(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!selectedUser ? (
            // Lista de usuários
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-gray-500 mb-4">Usuários conectados:</p>
              <div className="space-y-2">
                {usuariosConectados?.map((sessao: any) => (
                  <Button
                    key={sessao.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setSelectedUser(sessao.agenteId)}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    <span className="truncate">{sessao.nomeAgente}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            // Chat privado
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.remetenteId === user.id ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        msg.remetenteId === user.id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{msg.conteudo}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleEnviarMensagem();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleEnviarMensagem}
                  disabled={!novaMensagem.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Botão voltar */}
              <Button
                variant="ghost"
                className="w-full rounded-none border-t"
                onClick={() => setSelectedUser(null)}
              >
                ← Voltar
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
