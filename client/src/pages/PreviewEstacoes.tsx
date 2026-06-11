import { useState } from "react";
import { BoasVindasEstacao } from "@/components/BoasVindasEstacao";

type Estacao = "primavera" | "verao" | "outono" | "inverno";

const ESTACOES: { key: Estacao; label: string; emoji: string; desc: string; cor: string }[] = [
  {
    key: "primavera",
    label: "Primavera",
    emoji: "🌸",
    desc: "Flores de vários tipos sobem com a mensagem",
    cor: "#ff69b4",
  },
  {
    key: "verao",
    label: "Verão",
    emoji: "☀️",
    desc: "Sol, ondas e estrelas do mar sobem com a mensagem",
    cor: "#ffd700",
  },
  {
    key: "outono",
    label: "Outono",
    emoji: "🍂",
    desc: "Folhas douradas e alaranjadas sobem com a mensagem",
    cor: "#d2691e",
  },
  {
    key: "inverno",
    label: "Inverno",
    emoji: "❄️",
    desc: "Flocos de neve e cristais gelados sobem com a mensagem",
    cor: "#87ceeb",
  },
];

export default function PreviewEstacoes() {
  const [estacaoAtiva, setEstacaoAtiva] = useState<Estacao | null>(null);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        background: "linear-gradient(135deg, #0a0a1a 0%, #0d1a3d 50%, #0a0a1a 100%)",
      }}
    >
      {/* Título */}
      <div className="text-center mb-10">
        <img
          src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png"
          alt="Logo"
          className="w-16 h-16 object-contain mx-auto mb-4"
        />
        <h1 className="text-3xl font-black text-white mb-2">
          Preview — Animações das Estações
        </h1>
        <p className="text-gray-700 text-sm">
          Clique em cada estação para ver a animação completa (15 segundos)
        </p>
      </div>

      {/* Grid de botões */}
      <div className="grid grid-cols-2 gap-5 w-full max-w-lg">
        {ESTACOES.map((e) => (
          <button
            key={e.key}
            onClick={() => setEstacaoAtiva(e.key)}
            className="relative rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `2px solid ${e.cor}55`,
              boxShadow: `0 0 20px ${e.cor}22`,
            }}
            onMouseEnter={(el) => {
              (el.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 40px ${e.cor}44`;
              (el.currentTarget as HTMLButtonElement).style.borderColor = `${e.cor}99`;
            }}
            onMouseLeave={(el) => {
              (el.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${e.cor}22`;
              (el.currentTarget as HTMLButtonElement).style.borderColor = `${e.cor}55`;
            }}
          >
            <div className="text-5xl mb-3">{e.emoji}</div>
            <div className="font-bold text-white text-lg mb-1">{e.label}</div>
            <div className="text-xs text-gray-700 leading-relaxed">{e.desc}</div>
            <div
              className="mt-3 text-xs font-semibold px-3 py-1 rounded-full inline-block"
              style={{ background: `${e.cor}22`, color: e.cor }}
            >
              ▶ Ver animação
            </div>
          </button>
        ))}
      </div>

      <p className="mt-8 text-gray-300 text-xs text-center">
        No sistema real, aparece automaticamente nos primeiros 3 dias de cada estação,<br />
        uma vez por dia — e se repete a cada novo ano.
      </p>

      {/* Animação ativa */}
      {estacaoAtiva && (
        <BoasVindasEstacao
          forcarEstacao={estacaoAtiva}
          onClose={() => setEstacaoAtiva(null)}
        />
      )}
    </div>
  );
}
