import { useLocation } from "wouter";
import { BookMarked, BookOpen, Sparkles, Star, Zap, ArrowLeft } from "lucide-react";

const cards = [
  {
    title: "Motivacional",
    subtitle: "Energia e superação para o seu dia",
    icon: Zap,
    path: "/mensagem-do-dia/motivacional",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    glow: "shadow-orange-500/40",
    emoji: "⚡",
    bg: "bg-gradient-to-br from-amber-900/60 to-orange-900/40",
    border: "border-amber-500/30",
  },
  {
    title: "Minutos de Sabedoria",
    subtitle: "Reflexões diárias de grandes pensadores",
    icon: Sparkles,
    path: "/mensagem-do-dia/minutos-sabedoria",
    gradient: "from-purple-500 via-violet-500 to-indigo-500",
    glow: "shadow-purple-500/40",
    emoji: "✨",
    bg: "bg-gradient-to-br from-purple-900/60 to-indigo-900/40",
    border: "border-purple-500/30",
  },
  {
    title: "Salmos",
    subtitle: "Palavras de fé e esperança do dia",
    icon: BookOpen,
    path: "/mensagem-do-dia/salmos",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    glow: "shadow-emerald-500/40",
    emoji: "🙏",
    bg: "bg-gradient-to-br from-emerald-900/60 to-teal-900/40",
    border: "border-emerald-500/30",
  },
  {
    title: "Versículos",
    subtitle: "Versículos bíblicos que fortalecem",
    icon: BookMarked,
    path: "/mensagem-do-dia/versiculos",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    glow: "shadow-rose-500/40",
    emoji: "📖",
    bg: "bg-gradient-to-br from-rose-900/60 to-pink-900/40",
    border: "border-rose-500/30",
  },
  {
    title: "Horóscopo",
    subtitle: "O que os astros dizem para você hoje",
    icon: Star,
    path: "/mensagem-do-dia/horoscopo",
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    glow: "shadow-blue-500/40",
    emoji: "⭐",
    bg: "bg-gradient-to-br from-blue-900/60 to-indigo-900/40",
    border: "border-blue-500/30",
  },
];

export default function MensagemDoDiaHub() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        </div>

        <div className="text-center">
          <div className="text-4xl mb-3">💌</div>
          <h1 className="text-3xl font-bold text-white mb-2">Mensagem do Dia</h1>
          <p className="text-slate-400 text-base">
            Escolha sua dose diária de inspiração
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-2xl mx-auto grid grid-cols-1 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className={`
                group relative w-full text-left rounded-2xl border ${card.border} ${card.bg}
                p-5 transition-all duration-300
                hover:scale-[1.02] hover:shadow-2xl ${card.glow}
                active:scale-[0.98]
                overflow-hidden
              `}
            >
              {/* Glow background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`} />

              <div className="relative flex items-center gap-4">
                {/* Emoji + Icon */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg ${card.glow}`}>
                  <span className="text-2xl">{card.emoji}</span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-lg leading-tight mb-1">
                    {card.title}
                  </h2>
                  <p className="text-slate-400 text-sm leading-snug">
                    {card.subtitle}
                  </p>
                </div>

                {/* Arrow */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity`}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer inspiracional */}
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <p className="text-slate-600 text-xs italic">
          "Cada dia é uma nova oportunidade de ser melhor que ontem."
        </p>
      </div>
    </div>
  );
}
