import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface Sessao {
  id: number;
  nomeAgente: string;
  horarioConexao: string | Date;
  ultimoAcesso: string | Date;
  modulo: string;
}

export function UsuariosConectados() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { data: sessoesData, refetch } = trpc.sessoes.getAtivas.useQuery();
  const desconectar = trpc.sessoes.desconectarForcado.useMutation({
    onSuccess: () => {
      toast.success('Usuário desconectado com sucesso!');
      refetch();
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  // Atualizar a cada 10 segundos
  useEffect(() => {
    if (sessoesData) {
      setSessoes(sessoesData as Sessao[]);
      setIsLoading(false);
    }
  }, [sessoesData]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [refetch]);

  const formatarHora = (data: string | Date) => {
    try {
      const d = typeof data === "string" ? new Date(data) : data;
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "--:--:--";
    }
  };

  const formatarData = (data: string | Date) => {
    try {
      const d = typeof data === "string" ? new Date(data) : data;
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "--/--/--";
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">
          Usuários Conectados ({sessoes.length})
        </h3>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Carregando...</div>
      ) : sessoes.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          Nenhum usuário conectado
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sessoes.map((sessao) => (
            <div
              key={sessao.id}
              className="bg-white rounded-lg p-3 border border-blue-100 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {sessao.nomeAgente}
                  </p>
                  <p className="text-xs text-gray-600">
                    Módulo: <span className="font-medium">{sessao.modulo || "Dashboard"}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  {user && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500 hover:bg-red-100 hover:text-red-700"
                      onClick={() => desconectar.mutate({ sessaoId: sessao.id })}
                      disabled={desconectar.isPending}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <p className="text-gray-600">Conectado em:</p>
                  <p className="text-gray-900 font-mono">
                    {formatarData(sessao.horarioConexao)} {formatarHora(sessao.horarioConexao)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Último acesso:</p>
                  <p className="text-gray-900 font-mono">
                    {formatarHora(sessao.ultimoAcesso)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600 text-center">
        Atualiza a cada 10 segundos
      </div>
    </Card>
  );
}
