import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import PageHeader from "@/components/PageHeader";
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

export default function MensagemHoroscopo() {
  const [, navigate] = useLocation();
  const [signoSelecionado, setSignoSelecionado] = useState("");
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const { data: horoscopo, isLoading, error } = trpc.horoscopo.getHoroscopo.useQuery(
    { signo: signoSelecionado },
    { enabled: !!signoSelecionado, refetchOnWindowFocus: false }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <PageHeader title="Horóscopo" onBack={() => navigate("/")} />
      {/* Header */}
      <div className="shadow-lg" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 60%, #c8960c 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col items-center">
        <Card className="border-0 shadow-2xl overflow-hidden w-full max-w-2xl">
          <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #1e3a5f, #c8960c)' }}>
            <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">
              ✨ Selecione seu signo
            </p>
          </div>
          <CardContent className="p-8 bg-white">
            {/* Grade de signos */}
            <div className="mb-6">
              <div className="grid grid-cols-4 gap-2">
                {TODOS_SIGNOS.map((signo) => (
                  <button
                    key={signo}
                    onClick={() => setSignoSelecionado(signo)}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all text-xs font-medium ${
                      signoSelecionado === signo
                        ? "border-yellow-500 bg-yellow-50 text-yellow-800"
                        : "border-gray-700 hover:border-blue-300 text-slate-600"
                    }`}
                  >
                    <span className="text-xl">{SIGNO_EMOJIS[signo]}</span>
                    <span className="mt-1 leading-tight text-center">{signo}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Estado inicial */}
            {!signoSelecionado && (
              <div className="flex flex-col items-center gap-3 py-6 text-slate-700">
                <Star className="w-12 h-12 text-yellow-200" />
                <p className="text-sm">Escolha seu signo acima para ver o horóscopo de hoje</p>
              </div>
            )}

            {/* Carregando */}
            {signoSelecionado && isLoading && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="animate-spin w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full" />
                <p className="text-slate-700 text-sm">Buscando e traduzindo horóscopo...</p>
                <p className="text-slate-300 text-xs">Isso pode levar alguns segundos na primeira vez</p>
              </div>
            )}

            {/* Erro */}
            {signoSelecionado && error && !isLoading && (
              <div className="text-center py-6 text-red-500 text-sm">
                Não foi possível carregar o horóscopo. Tente novamente mais tarde.
              </div>
            )}

            {/* Resultado */}
            {signoSelecionado && horoscopo && !isLoading && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{SIGNO_EMOJIS[signoSelecionado]}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{signoSelecionado}</h2>
                    <p className="text-xs text-slate-700 capitalize">{hoje}</p>
                  </div>
                </div>
                <div className="w-full h-0.5 rounded-full mb-5" style={{ background: 'linear-gradient(90deg, #1e3a5f, #c8960c)' }} />
                <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
                  {horoscopo.texto}
                </p>
                <p className="text-xs text-slate-300 mt-6 text-right">Fonte: Horóscopo Diário</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
