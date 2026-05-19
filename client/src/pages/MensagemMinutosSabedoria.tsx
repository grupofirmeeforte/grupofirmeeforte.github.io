import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, BookOpen, Clock } from "lucide-react";

export default function MensagemMinutosSabedoria() {
  const [, navigate] = useLocation();

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
            <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">Em Breve</p>
          </div>
          <CardContent className="p-12 text-center bg-white">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <BookOpen className="w-20 h-20 text-purple-300" />
                <Clock className="w-8 h-8 text-amber-500 absolute -bottom-1 -right-1 bg-white rounded-full p-1" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Minutos de Sabedoria</h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-6">
              Em breve, reflexões diárias do livro <strong className="text-purple-700">Minutos de Sabedoria</strong> de C. Torres Pastorino estarão disponíveis aqui.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700">
              <Sparkles className="w-4 h-4 inline mr-2" />
              O conteúdo será adicionado em breve com a versão digital do livro.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
