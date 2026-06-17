import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X, Send, Sparkles, Star, Heart, MessageSquare, CheckCircle2, Crown, Shield, UserCheck, Headphones } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const DESTINATARIOS_OPCOES = [
  { value: "ceo", label: "CEO", icon: Crown, color: "#c8960c", bg: "rgba(200,150,12,0.15)", border: "rgba(200,150,12,0.5)" },
  { value: "admin", label: "Administração", icon: Shield, color: "#60a5fa", bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.5)" },
  { value: "supervisor", label: "Supervisor", icon: UserCheck, color: "#a78bfa", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.5)" },
  { value: "suporte", label: "Suporte", icon: Headphones, color: "#34d399", bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.5)" },
];

// ── Partículas de estrelas / confetes ────────────────────────────────────────
const COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98FB98", "#F0E68C", "#87CEEB", "#FFA07A", "#20B2AA"];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rotation: number; rotSpeed: number;
  shape: "star" | "circle" | "rect" | "diamond";
  opacity: number; life: number; maxLife: number;
}

function createParticle(w: number, h: number): Particle {
  const shapes: Particle["shape"][] = ["star", "circle", "rect", "diamond"];
  return {
    x: Math.random() * w,
    y: -20,
    vx: (Math.random() - 0.5) * 3,
    vy: 1.5 + Math.random() * 3,
    size: 6 + Math.random() * 14,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 6,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    opacity: 1,
    life: 0,
    maxLife: 180 + Math.random() * 120,
  };
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const ir = r * 0.4;
    if (i === 0) ctx.moveTo(r * Math.cos(-Math.PI / 2), r * Math.sin(-Math.PI / 2));
    ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
    ctx.lineTo(ir * Math.cos(angle + (2 * Math.PI) / 10), ir * Math.sin(angle + (2 * Math.PI) / 10));
  }
  ctx.closePath();
  ctx.restore();
}

function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: Particle[] = [];
    let frame = 0;
    let animId: number;

    const spawn = () => {
      if (frame % 3 === 0 && particles.length < 220) {
        particles.push(createParticle(canvas.width, canvas.height));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      spawn();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life++;
        p.vy += 0.04;
        p.vx *= 0.995;
        if (p.life > p.maxLife * 0.7) p.opacity = 1 - (p.life - p.maxLife * 0.7) / (p.maxLife * 0.3);
        if (p.life >= p.maxLife || p.y > canvas.height + 20) { particles.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        if (p.shape === "star") {
          drawStar(ctx, p.x, p.y, p.size / 2, p.rotation);
          ctx.fill();
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "rect") {
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, 0);
          ctx.lineTo(0, p.size / 2);
          ctx.lineTo(-p.size / 2, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }} />;
}

// ── Componente principal ─────────────────────────────────────────────────────
export function BoasVindasComemorativo({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"welcome" | "recado" | "enviado">("welcome");
  const [destinatario, setDestinatario] = useState<string>("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState("");

  const registrar = trpc.recados.registrarBoasVindas.useMutation();
  const enviar = trpc.recados.enviar.useMutation({
    onSuccess: () => setStep("enviado"),
    onError: (e) => setError(e.message || "Erro ao enviar recado."),
  });

  const handleFechar = () => {
    registrar.mutate();
    onClose();
  };

  const handleEnviar = () => {
    setError("");
    if (!destinatario) { setError("Selecione o destinatário."); return; }
    if (!mensagem.trim()) { setError("Escreva sua mensagem."); return; }
    enviar.mutate({ destinatario: destinatario as any, assunto: assunto || undefined, mensagem });
  };

  const primeiroNome = user?.name?.split(" ")[0] ?? "Bem-vindo";

  return (
    <>
      <ConfettiCanvas />
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 200 }}>
        <div
          className="relative w-full max-w-lg animate-in fade-in zoom-in duration-700"
          style={{
            background: "linear-gradient(135deg, #0a0a2e 0%, #001a4d 40%, #002776 70%, #003d99 100%)",
            borderRadius: "1.5rem",
            border: "2px solid rgba(200,150,12,0.6)",
            boxShadow: "0 0 60px rgba(200,150,12,0.3), 0 0 120px rgba(0,39,118,0.5)",
            overflow: "hidden",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {/* Botão fechar */}
          <button
            onClick={handleFechar}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            style={{ zIndex: 10 }}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Decoração superior */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #c8960c, #FFD700, #c8960c)" }} />

          {/* Estrelas decorativas */}
          <div className="absolute top-6 left-6 opacity-40">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
          <div className="absolute top-10 right-16 opacity-30">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>

          <div className="p-8 pt-10">
            {step === "welcome" && (
              <div className="text-center space-y-6">
                {/* Logo */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl opacity-60" style={{ background: "radial-gradient(circle, #c8960c, transparent)" }} />
                    <img
                      src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png"
                      alt="Grupo Firme & Forte"
                      className="relative w-24 h-24 object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>

                {/* Título principal */}
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 text-sm font-semibold tracking-widest uppercase">Sistema de Gestão</span>
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h1 className="text-4xl font-black text-white leading-tight" style={{ textShadow: "0 0 30px rgba(200,150,12,0.5)" }}>
                    Parabéns, {primeiroNome}! 🎉
                  </h1>
                  <div className="mt-2 flex justify-center">
                    <div className="h-0.5 w-32" style={{ background: "linear-gradient(90deg, transparent, #c8960c, transparent)" }} />
                  </div>
                </div>

                {/* Mensagem */}
                <div className="space-y-3 text-gray-200">
                  <p className="text-lg leading-relaxed">
                    🎉 <strong className="text-yellow-300">Agradecemos imensamente</strong> sua visita ao nosso sistema!
                  </p>
                  <p className="text-base leading-relaxed text-gray-300">
                    Você está no <strong className="text-white">Sistema de Gestão do Grupo Firme & Forte</strong> — uma plataforma desenvolvida com dedicação para facilitar o seu trabalho diário, centralizar informações e potencializar os resultados da nossa equipe.
                  </p>
                  <p className="text-base leading-relaxed text-gray-300">
                    Esperamos que use sempre com <Heart className="inline w-4 h-4 text-red-400 fill-red-400" /> e que este sistema seja uma ferramenta poderosa na sua jornada!
                  </p>
                </div>

                {/* Cards de destaque */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { icon: "🚀", title: "Produtividade", desc: "Acesso rápido a tudo" },
                    { icon: "🔒", title: "Segurança", desc: "Seus dados protegidos" },
                    { icon: "📊", title: "Resultados", desc: "Acompanhe em tempo real" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(200,150,12,0.3)" }}
                    >
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-xs font-bold text-yellow-300">{item.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setStep("recado")}
                    className="flex-1 font-bold py-3 text-sm"
                    style={{ background: "linear-gradient(135deg, #c8960c, #FFD700)", color: "#001a4d" }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Deixar um Recado
                  </Button>
                  <Button
                    onClick={handleFechar}
                    variant="outline"
                    className="flex-1 font-medium py-3 text-sm border-white/20 text-white hover:bg-white/10"
                  >
                    Entrar no Sistema
                  </Button>
                </div>
              </div>
            )}

            {step === "recado" && (
              <div className="space-y-5">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                  <h2 className="text-2xl font-bold text-white">Deixe seu Recado</h2>
                  <p className="text-gray-400 text-sm mt-1">Sua mensagem será entregue diretamente ao destinatário.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Destinatário *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DESTINATARIOS_OPCOES.map((opt) => {
                      const Icon = opt.icon;
                      const selecionado = destinatario === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDestinatario(opt.value)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                          style={{
                            background: selecionado ? opt.bg : "rgba(255,255,255,0.05)",
                            border: `1.5px solid ${selecionado ? opt.border : "rgba(255,255,255,0.1)"}`,
                            color: selecionado ? opt.color : "#9ca3af",
                            boxShadow: selecionado ? `0 0 12px ${opt.bg}` : "none",
                          }}
                        >
                          <Icon className="w-4 h-4 shrink-0" style={{ color: selecionado ? opt.color : "#6b7280" }} />
                          <span>{opt.label}</span>
                          {selecionado && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: opt.color }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Assunto (opcional)</label>
                  <Input
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    placeholder="Ex: Sugestão, Dúvida, Elogio..."
                    maxLength={100}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Mensagem *</label>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Escreva sua mensagem aqui... Pode ser uma sugestão, elogio, dúvida ou qualquer recado que queira deixar."
                    rows={4}
                    maxLength={2000}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{mensagem.length}/2000</p>
                </div>

                {error && (
                  <div className="text-sm text-red-400 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep("welcome")}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleEnviar}
                    disabled={enviar.isPending}
                    className="flex-1 font-bold"
                    style={{ background: "linear-gradient(135deg, #c8960c, #FFD700)", color: "#001a4d" }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {enviar.isPending ? "Enviando..." : "Enviar Recado"}
                  </Button>
                </div>
              </div>
            )}

            {step === "enviado" && (
              <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(200,150,12,0.2)", border: "2px solid #c8960c" }}>
                    <CheckCircle2 className="w-10 h-10 text-yellow-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Recado Enviado! 🎉</h2>
                  <p className="text-gray-300">Sua mensagem foi entregue com sucesso. Obrigado pelo seu contato!</p>
                </div>
                <Button
                  onClick={handleFechar}
                  className="w-full font-bold py-3"
                  style={{ background: "linear-gradient(135deg, #c8960c, #FFD700)", color: "#001a4d" }}
                >
                  Entrar no Sistema
                </Button>
              </div>
            )}
          </div>

          {/* Decoração inferior */}
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #c8960c, #FFD700, #c8960c)" }} />
        </div>
      </div>
    </>
  );
}
