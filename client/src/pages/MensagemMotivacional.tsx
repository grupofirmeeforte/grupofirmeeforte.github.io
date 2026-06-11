import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { Zap, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function MensagemMotivacional() {
  const [, navigate] = useLocation();
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const { data: mensagem, isLoading } = trpc.mensagensMotivacionais.getDoDia.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: total } = trpc.mensagensMotivacionais.getCount.useQuery();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <PageHeader title="Motivacional" onBack={() => navigate("/")} />
      {/* Header */}
      <div
        className="shadow-lg"
        style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Zap className="w-6 h-6 text-white drop-shadow" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <Card className="border-0 shadow-2xl overflow-hidden w-full max-w-2xl" style={{ background: '#1e293b' }}>
          {/* Faixa topo */}
          <div
            className="px-8 py-3 text-center"
            style={{ background: 'linear-gradient(135deg, #b45309, #f59e0b)' }}
          >
            <p className="text-white text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              {mensagem ? `Mensagem Nº ${mensagem.numero}` : 'Mensagem Motivacional'}
              <Trophy className="w-4 h-4" />
            </p>
          </div>

          <CardContent className="p-10 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Zap className="w-16 h-16 text-amber-400 animate-pulse" />
                <p className="text-slate-400">Carregando sua mensagem do dia...</p>
              </div>
            ) : mensagem ? (
              <>
                {/* Linha decorativa */}
                <div className="mb-8 flex justify-center">
                  <div className="w-20 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #b45309, #f59e0b)' }} />
                </div>

                {/* Aspas abertas */}
                <div className="text-6xl font-serif text-amber-500/30 leading-none mb-2 text-left">"</div>

                {/* Conteúdo da mensagem */}
                <p className="text-white text-xl font-medium leading-relaxed text-center px-4 mb-4" style={{ fontStyle: 'italic' }}>
                  {mensagem.conteudo}
                </p>

                {/* Aspas fechadas */}
                <div className="text-6xl font-serif text-amber-500/30 leading-none text-right">"</div>

                {/* Linha decorativa */}
                <div className="my-6 flex justify-center">
                  <div className="w-20 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #b45309)' }} />
                </div>

                {/* Autor */}
                {mensagem.autor && (
                  <p className="text-amber-400 font-bold text-base tracking-wide uppercase">
                    — {mensagem.autor}
                  </p>
                )}

                {total != null && total > 0 && (
                  <p className="text-xs text-slate-500 mt-4">
                    {total} mensagem{total !== 1 ? 's' : ''} disponíve{total !== 1 ? 'is' : 'l'}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <Zap className="w-16 h-16 text-amber-400/30" />
                <p className="text-slate-400">Nenhuma mensagem disponível no momento.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frase de rodapé */}
        <p className="text-amber-600/60 text-xs mt-8 text-center italic">
          Uma nova mensagem a cada dia — exclusiva para você.
        </p>
      </div>
    </div>
  );
}
