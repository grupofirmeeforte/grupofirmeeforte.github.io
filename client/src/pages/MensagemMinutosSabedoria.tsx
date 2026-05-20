import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, BookOpen, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function MensagemMinutosSabedoria() {
  const [, navigate] = useLocation();
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const { data: pensamento, isLoading, refetch, isFetching } = trpc.minutosSabedoria.getRandom.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: total } = trpc.minutosSabedoria.getCount.useQuery();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      {/* Header */}
      <div
        className="shadow-lg"
        style={{ background: 'linear-gradient(135deg, #002776 0%, #003d99 60%, #c8960c 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <div>
              <h1 className="text-xl font-bold text-white">Minutos de Sabedoria</h1>
              <p className="text-xs text-yellow-300 capitalize">{hoje}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white border-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <Card className="border-0 shadow-2xl overflow-hidden w-full max-w-2xl">
          <div
            className="px-8 py-3 text-center"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #c8960c)' }}
          >
            <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">
              {pensamento ? `Pensamento Nº ${pensamento.numero}` : 'Minutos de Sabedoria'}
            </p>
          </div>

          <CardContent className="p-10 text-center bg-white">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <BookOpen className="w-16 h-16 text-purple-200 animate-pulse" />
                <p className="text-slate-400">Carregando reflexão...</p>
              </div>
            ) : pensamento ? (
              <>
                <div className="mb-6 flex justify-center">
                  <div className="w-16 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #6d28d9, #c8960c)' }} />
                </div>

                {pensamento.titulo && (
                  <h2 className="text-xl font-bold text-purple-800 mb-6">{pensamento.titulo}</h2>
                )}

                <div className="text-slate-700 text-base leading-relaxed text-left whitespace-pre-line mb-8 px-2">
                  {pensamento.conteudo}
                </div>

                <div className="mb-6 flex justify-center">
                  <div className="w-16 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #c8960c, #6d28d9)' }} />
                </div>

                <p className="text-xs text-slate-400 italic mb-6">
                  C. Torres Pastorino — <em>Minutos de Sabedoria</em>
                </p>

                <Button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  variant="outline"
                  className="flex items-center gap-2 mx-auto border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  Novo pensamento
                </Button>

                {total != null && total > 0 && (
                  <p className="text-xs text-slate-400 mt-4">
                    {total} pensamento{total !== 1 ? 's' : ''} disponíve{total !== 1 ? 'is' : 'l'}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <BookOpen className="w-16 h-16 text-purple-200" />
                <p className="text-slate-500">Nenhum pensamento disponível no momento.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
