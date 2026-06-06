import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissao } from "@/hooks/usePermissao";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";

/**
 * Modal de alerta de vencimento de certificação.
 * Aparece TODA vez que o promotor fizer login com certificação vencendo em ≤ 30 dias.
 * Não tem "não mostrar novamente" — é obrigatório fechar no X a cada acesso.
 */
export default function AlertaCertificacao() {
  const { cargo } = usePermissao();
  const isPromotor = cargo === "Promotor";
  const [aberto, setAberto] = useState(false);

  const { data: certif } = trpc.certificacoes.minhasCertificacoes.useQuery(undefined, {
    enabled: isPromotor,
    staleTime: 0, // sempre busca fresco ao entrar
  });

  useEffect(() => {
    if (!certif) return;
    // Verificar se alguma certificação está vencendo em ≤ 30 dias ou já vencida
    const dias1 = certif.diasFaltando;
    const dias2 = certif.diasFaltando2;
    const alertar =
      (dias1 !== null && dias1 !== undefined && dias1 <= 30) ||
      (dias2 !== null && dias2 !== undefined && dias2 <= 30);
    if (alertar) setAberto(true);
  }, [certif]);

  if (!aberto || !certif) return null;

  const dias1 = certif.diasFaltando;
  const dias2 = certif.diasFaltando2;

  function getCorDias(dias: number | null | undefined) {
    if (dias === null || dias === undefined) return "";
    if (dias <= 0) return "text-red-600";
    if (dias <= 7) return "text-red-500";
    if (dias <= 15) return "text-orange-500";
    return "text-yellow-600";
  }

  function getTextoDias(dias: number | null | undefined, tipo: string) {
    if (dias === null || dias === undefined) return null;
    if (dias > 30) return null;
    if (dias <= 0) return `⚠️ ${tipo}: VENCIDA há ${Math.abs(dias)} dia(s)!`;
    if (dias === 0) return `⚠️ ${tipo}: VENCE HOJE!`;
    return `⚠️ ${tipo}: vence em ${dias} dia(s)`;
  }

  const alerta1 = dias1 !== null && dias1 !== undefined && dias1 <= 30
    ? getTextoDias(dias1, "Certificação Consignado")
    : null;
  const alerta2 = dias2 !== null && dias2 !== undefined && dias2 <= 30
    ? getTextoDias(dias2, "Certificação PLDFT")
    : null;

  const critico = (dias1 !== null && dias1 !== undefined && dias1 <= 0) ||
                  (dias2 !== null && dias2 !== undefined && dias2 <= 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Cabeçalho */}
        <div className={`px-6 py-5 ${critico ? "bg-red-600" : "bg-amber-500"}`}>
          <div className="flex items-center gap-3">
            {critico
              ? <ShieldAlert className="w-8 h-8 text-white flex-shrink-0" />
              : <AlertTriangle className="w-8 h-8 text-white flex-shrink-0" />
            }
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {critico ? "CERTIFICAÇÃO VENCIDA!" : "Atenção: Certificação Vencendo!"}
              </h2>
              <p className="text-white/90 text-sm">
                {certif.nomeAgente || "Agente"}
              </p>
            </div>
          </div>
          {/* Botão X */}
          <button
            onClick={() => setAberto(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            title="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4">
          {/* Contagem regressiva */}
          <div className="space-y-2">
            {alerta1 && (
              <div className={`flex items-center gap-2 font-semibold text-base ${getCorDias(dias1)}`}>
                <span>{alerta1}</span>
              </div>
            )}
            {alerta2 && (
              <div className={`flex items-center gap-2 font-semibold text-base ${getCorDias(dias2)}`}>
                <span>{alerta2}</span>
              </div>
            )}
          </div>

          {/* Aviso do BB */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 font-semibold text-sm leading-relaxed">
              🏦 <strong>Banco do Brasil:</strong> sua Chave J será bloqueada
              no <strong>primeiro dia após o vencimento</strong> da certificação,
              impedindo qualquer operação no sistema.
            </p>
          </div>

          {/* Orientação */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm leading-relaxed">
              📋 <strong>O que fazer:</strong> Acesse o portal de certificações do BB
              e renove sua certificação <strong>antes do vencimento</strong> para evitar
              o bloqueio da sua Chave J e a interrupção das suas atividades.
            </p>
          </div>

          {/* Botão fechar */}
          <button
            onClick={() => setAberto(false)}
            className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${
              critico
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            Entendi — Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
