import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, BookOpen, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SIGNO_EMOJIS: Record<string, string> = {
  "Áries": "♈", "Touro": "♉", "Gêmeos": "♊", "Câncer": "♋",
  "Leão": "♌", "Virgem": "♍", "Libra": "♎", "Escorpião": "♏",
  "Sagitário": "♐", "Capricórnio": "♑", "Aquário": "♒", "Peixes": "♓",
};

const TODOS_SIGNOS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
];

function TabMinutos() {
  const { data: pensamento, isLoading } = trpc.minutosSabedoria.getDoDia.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: total } = trpc.minutosSabedoria.getCount.useQuery();

  return (
    <Card className="border-0 shadow-2xl overflow-hidden w-full max-w-2xl">
      <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #6d28d9, #c8960c)' }}>
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
            <p className="text-xs text-slate-400 italic mb-2">
              C. Torres Pastorino — <em>Minutos de Sabedoria</em>
            </p>
            {total != null && total > 0 && (
              <p className="text-xs text-slate-300 mt-1">
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
  );
}

function TabHoroscopo() {
  const [signoSelecionado, setSignoSelecionado] = useState("");

  const { data: horoscopo, isLoading, error } = trpc.horoscopo.getHoroscopo.useQuery(
    { signo: signoSelecionado },
    { enabled: !!signoSelecionado, refetchOnWindowFocus: false }
  );

  return (
    <Card className="border-0 shadow-2xl overflow-hidden w-full max-w-2xl">
      <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #1e3a5f, #c8960c)' }}>
        <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">
          ✨ Horóscopo do Dia
        </p>
      </div>
      <CardContent className="p-8 bg-white">
        {/* Seletor de signo */}
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-3 text-center">Selecione seu signo:</p>
          <div className="grid grid-cols-4 gap-2">
            {TODOS_SIGNOS.map((signo) => (
              <button
                key={signo}
                onClick={() => setSignoSelecionado(signo)}
                className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all text-xs font-medium ${
                  signoSelecionado === signo
                    ? "border-yellow-500 bg-yellow-50 text-yellow-800"
                    : "border-gray-200 hover:border-blue-300 text-slate-600"
                }`}
              >
                <span className="text-lg">{SIGNO_EMOJIS[signo]}</span>
                <span className="mt-1 leading-tight text-center">{signo}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Resultado */}
        {!signoSelecionado && (
          <div className="flex flex-col items-center gap-3 py-6 text-slate-400">
            <Star className="w-12 h-12 text-yellow-200" />
            <p className="text-sm">Escolha seu signo acima para ver o horóscopo de hoje</p>
          </div>
        )}

        {signoSelecionado && isLoading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full" />
            <p className="text-slate-400 text-sm">Buscando e traduzindo horóscopo...</p>
            <p className="text-slate-300 text-xs">Isso pode levar alguns segundos</p>
          </div>
        )}

        {signoSelecionado && error && (
          <div className="text-center py-6 text-red-500 text-sm">
            Não foi possível carregar o horóscopo. Tente novamente.
          </div>
        )}

        {signoSelecionado && horoscopo && !isLoading && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{SIGNO_EMOJIS[signoSelecionado]}</span>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{signoSelecionado}</h2>
                <p className="text-xs text-slate-400">
                  {new Date(horoscopo.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="w-full h-0.5 rounded-full mb-4" style={{ background: 'linear-gradient(90deg, #1e3a5f, #c8960c)' }} />
            <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
              {horoscopo.texto}
            </p>
            <p className="text-xs text-slate-300 mt-4 text-right">Fonte: Horóscopo Diário</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MensagemMinutosSabedoria() {
  const [, navigate] = useLocation();
  const [abaAtiva, setAbaAtiva] = useState<"sabedoria" | "horoscopo">("sabedoria");
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      {/* Header */}
      <div className="shadow-lg" style={{ background: 'linear-gradient(135deg, #002776 0%, #003d99 60%, #c8960c 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <div>
              <h1 className="text-xl font-bold text-white">Mensagem do Dia</h1>
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

        {/* Abas */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0">
          <button
            onClick={() => setAbaAtiva("sabedoria")}
            className={`px-5 py-2 text-sm font-semibold rounded-t-lg transition-all ${
              abaAtiva === "sabedoria"
                ? "bg-white text-purple-800"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            📖 Minutos de Sabedoria
          </button>
          <button
            onClick={() => setAbaAtiva("horoscopo")}
            className={`px-5 py-2 text-sm font-semibold rounded-t-lg transition-all ${
              abaAtiva === "horoscopo"
                ? "bg-white text-blue-800"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            ✨ Horóscopo
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col items-center justify-center">
        {abaAtiva === "sabedoria" ? <TabMinutos /> : <TabHoroscopo />}
      </div>
    </div>
  );
}
