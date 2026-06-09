import { useEffect, useRef, useState } from "react";

// ── Tipos ────────────────────────────────────────────────────────────────────
type Estacao = "primavera" | "verao" | "outono" | "inverno";

interface EstacaoConfig {
  nome: string;
  emoji: string;
  mensagem: string;
  submensagem: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  titleColor: string;
  subtitleColor: string;
  particleColors: string[];
  particleShapes: ParticleShape[];
}

type ParticleShape = "flor-rosa" | "flor-margarida" | "flor-girassol" | "petalas" | "sol" | "onda" | "estrela-mar" | "concha" | "folha" | "folha-maple" | "bolota" | "neve" | "cristal" | "copo-de-leite";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  shape: ParticleShape;
  opacity: number;
  life: number;
  maxLife: number;
  sway: number;
  swaySpeed: number;
  swayOffset: number;
}

// ── Configurações de cada estação ────────────────────────────────────────────
const ESTACOES: Record<Estacao, EstacaoConfig> = {
  primavera: {
    nome: "Primavera",
    emoji: "🌸",
    mensagem: "Bem-vinda à Primavera! 🌸",
    submensagem: "A natureza floresce com alegria e cores vibrantes.\nQue esta estação traga renovação, leveza e muitas flores\npara iluminar os seus dias com beleza e esperança! 🌺🌼🌻",
    bgGradient: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #4a1a6e 60%, #6b2fa0 100%)",
    borderColor: "rgba(255,105,180,0.7)",
    glowColor: "rgba(255,105,180,0.4)",
    titleColor: "#ff69b4",
    subtitleColor: "#ffb3d9",
    particleColors: ["#ff69b4", "#ff1493", "#ffb6c1", "#ff85c2", "#ffd700", "#ff6347", "#da70d6", "#ff85a1", "#fff0f5", "#ff4da6"],
    particleShapes: ["flor-rosa", "flor-margarida", "flor-girassol", "petalas", "flor-rosa", "flor-margarida"],
  },
  verao: {
    nome: "Verão",
    emoji: "☀️",
    mensagem: "Bem-vindo ao Verão! ☀️",
    submensagem: "O sol brilha forte e o mar chama!\nQue esta estação traga calor, alegria e momentos inesquecíveis\ncom quem você ama. Aproveite cada onda! 🏖️🌊",
    bgGradient: "linear-gradient(135deg, #0a1a3e 0%, #0d2b6b 30%, #0a4a8a 60%, #0066cc 100%)",
    borderColor: "rgba(255,215,0,0.8)",
    glowColor: "rgba(255,165,0,0.5)",
    titleColor: "#ffd700",
    subtitleColor: "#ffe066",
    particleColors: ["#ffd700", "#ff8c00", "#ff6347", "#00bfff", "#87ceeb", "#fff176", "#ffb347", "#40e0d0", "#ff4500", "#ffa500"],
    particleShapes: ["sol", "onda", "estrela-mar", "concha", "sol", "onda"],
  },
  outono: {
    nome: "Outono",
    emoji: "🍂",
    mensagem: "Bem-vindo ao Outono! 🍂",
    submensagem: "As folhas dançam douradas ao vento em sua despedida.\nQue esta estação traga aconchego, gratidão e a beleza\nde cada transformação que a vida nos oferece. 🍁🍃",
    bgGradient: "linear-gradient(135deg, #1a0a00 0%, #3d1a00 30%, #6b3300 60%, #8b4513 100%)",
    borderColor: "rgba(210,105,30,0.8)",
    glowColor: "rgba(210,105,30,0.4)",
    titleColor: "#d2691e",
    subtitleColor: "#daa520",
    particleColors: ["#d2691e", "#ff8c00", "#daa520", "#b8860b", "#cd853f", "#a0522d", "#ff6347", "#8b4513", "#ffa500", "#c0392b"],
    particleShapes: ["folha", "folha-maple", "bolota", "folha", "folha-maple", "folha"],
  },
  inverno: {
    nome: "Inverno",
    emoji: "❄️",
    mensagem: "Bem-vindo ao Inverno! ❄️",
    submensagem: "O frio convida ao aconchego e à reflexão.\nQue esta estação traga paz, serenidade e a magia\nde cada floco de neve que cai silencioso e único. ⛄🌨️",
    bgGradient: "linear-gradient(135deg, #000a1a 0%, #001a3d 30%, #002b6b 60%, #003d8a 100%)",
    borderColor: "rgba(135,206,235,0.8)",
    glowColor: "rgba(135,206,235,0.4)",
    titleColor: "#87ceeb",
    subtitleColor: "#b0e0e6",
    particleColors: ["#ffffff", "#e0f7fa", "#b3e5fc", "#87ceeb", "#add8e6", "#e8f4f8", "#cce7ff", "#d4f1ff", "#f0f8ff", "#ddeeff"],
    particleShapes: ["neve", "cristal", "copo-de-leite", "neve", "cristal", "neve"],
  },
};

// ── Detectar estação atual (hemisfério sul - Brasil) ─────────────────────────
function detectarEstacao(): Estacao | null {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1; // 1-12
  const dia = hoje.getDate();

  // Primavera: 22/set a 21/dez
  if ((mes === 9 && dia >= 22) || mes === 10 || mes === 11 || (mes === 12 && dia <= 21)) return "primavera";
  // Verão: 22/dez a 20/mar
  if ((mes === 12 && dia >= 22) || mes === 1 || mes === 2 || (mes === 3 && dia <= 20)) return "verao";
  // Outono: 21/mar a 20/jun
  if ((mes === 3 && dia >= 21) || mes === 4 || mes === 5 || (mes === 6 && dia <= 20)) return "outono";
  // Inverno: 21/jun a 21/set
  if ((mes === 6 && dia >= 21) || mes === 7 || mes === 8 || (mes === 9 && dia <= 21)) return "inverno";

  return null;
}

// ── Verificar se está nos primeiros 3 dias da estação ───────────────────────
function estaNos3PrimeirossDias(): boolean {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const dia = hoje.getDate();

  // Primavera começa 22/set
  if (mes === 9 && dia >= 22 && dia <= 24) return true;
  // Verão começa 22/dez
  if (mes === 12 && dia >= 22 && dia <= 24) return true;
  // Outono começa 21/mar
  if (mes === 3 && dia >= 21 && dia <= 23) return true;
  // Inverno começa 21/jun
  if (mes === 6 && dia >= 21 && dia <= 23) return true;

  return false;
}

// ── Verificar se deve exibir (localStorage por ano+estação+dia) ──────────────
function deveExibir(estacao: Estacao): boolean {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const diaDoAno = `${hoje.getMonth() + 1}-${hoje.getDate()}`;
  const chave = `estacao_${estacao}_${ano}_${diaDoAno}`;
  return !localStorage.getItem(chave);
}

function marcarComoExibido(estacao: Estacao) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const diaDoAno = `${hoje.getMonth() + 1}-${hoje.getDate()}`;
  const chave = `estacao_${estacao}_${ano}_${diaDoAno}`;
  localStorage.setItem(chave, "1");
}

// ── Canvas de partículas ─────────────────────────────────────────────────────
function createParticle(w: number, h: number, config: EstacaoConfig): Particle {
  const shape = config.particleShapes[Math.floor(Math.random() * config.particleShapes.length)];
  const color = config.particleColors[Math.floor(Math.random() * config.particleColors.length)];

  return {
    x: Math.random() * w,
    y: h + 20 + Math.random() * 100, // começa de baixo
    vx: (Math.random() - 0.5) * 1.5,
    vy: -(1.5 + Math.random() * 3), // sobe
    size: 12 + Math.random() * 20,
    color,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 4,
    shape,
    opacity: 0,
    life: 0,
    maxLife: 200 + Math.random() * 150,
    sway: Math.random() * 2 - 1,
    swaySpeed: 0.02 + Math.random() * 0.03,
    swayOffset: Math.random() * Math.PI * 2,
  };
}

function drawFlowerRosa(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  const petalCount = 5;
  for (let i = 0; i < petalCount; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / petalCount);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.5, size * 0.25, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  // centro
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff176";
  ctx.fill();
  ctx.restore();
}

function drawFlowerMargarida(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  const petalCount = 8;
  for (let i = 0; i < petalCount; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / petalCount);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.55, size * 0.18, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd700";
  ctx.fill();
  ctx.restore();
}

function drawFlowerGirassol(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  const petalCount = 12;
  for (let i = 0; i < petalCount; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / petalCount);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.6, size * 0.15, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffa500";
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "#5d3a1a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "#3d2000";
  ctx.fill();
  ctx.restore();
}

function drawPetala(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.3, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawSol(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  // raios
  const rayCount = 12;
  for (let i = 0; i < rayCount; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / rayCount);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.08, -size * 0.38);
    ctx.lineTo(-size * 0.08, -size * 0.38);
    ctx.closePath();
    ctx.fillStyle = "#ffd700";
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd700";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#ffec00";
  ctx.fill();
  ctx.restore();
}

function drawOnda(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, 0);
  ctx.bezierCurveTo(-size * 0.3, -size * 0.4, size * 0.1, size * 0.4, size * 0.4, 0);
  ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.8, size * 0.1, size * 0.6, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function drawEstrelaMar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  const arms = 5;
  ctx.beginPath();
  for (let i = 0; i < arms * 2; i++) {
    const angle = (i * Math.PI) / arms - Math.PI / 2;
    const r = i % 2 === 0 ? size * 0.5 : size * 0.22;
    if (i === 0) ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle));
    else ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fillStyle = "#ff8c00";
  ctx.fill();
  ctx.restore();
}

function drawConcha(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.4, Math.PI, 0);
  ctx.lineTo(0, size * 0.1);
  ctx.closePath();
  ctx.fillStyle = "#f4a460";
  ctx.fill();
  // linhas da concha
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI + (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.1);
    ctx.lineTo(size * 0.4 * Math.cos(angle), size * 0.4 * Math.sin(angle));
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFolha(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.bezierCurveTo(size * 0.4, -size * 0.3, size * 0.4, size * 0.3, 0, size * 0.5);
  ctx.bezierCurveTo(-size * 0.4, size * 0.3, -size * 0.4, -size * 0.3, 0, -size * 0.5);
  ctx.fillStyle = color;
  ctx.fill();
  // nervura
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.lineTo(0, size * 0.5);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawFolhaMaple(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(3, -6);
  ctx.lineTo(7, -8);
  ctx.lineTo(5, -4);
  ctx.lineTo(10, -2);
  ctx.lineTo(6, 1);
  ctx.lineTo(8, 5);
  ctx.lineTo(3, 3);
  ctx.lineTo(2, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-2, 8);
  ctx.lineTo(-3, 3);
  ctx.lineTo(-8, 5);
  ctx.lineTo(-6, 1);
  ctx.lineTo(-10, -2);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-7, -8);
  ctx.lineTo(-3, -6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawBolota(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  // corpo da bolota
  ctx.beginPath();
  ctx.arc(0, size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "#8b6914";
  ctx.fill();
  // chapéu
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.15, size * 0.35, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#5d4037";
  ctx.fill();
  // palito
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.3);
  ctx.lineTo(0, -size * 0.5);
  ctx.strokeStyle = "#4a3728";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawNeve(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = "round";
  // 6 braços
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size * 0.5);
    ctx.stroke();
    // galhinhos
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.lineTo(size * 0.15, -size * 0.38);
    ctx.moveTo(0, -size * 0.25);
    ctx.lineTo(-size * 0.15, -size * 0.38);
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawCristal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.lineTo(size * 0.3, -size * 0.1);
  ctx.lineTo(size * 0.2, size * 0.5);
  ctx.lineTo(-size * 0.2, size * 0.5);
  ctx.lineTo(-size * 0.3, -size * 0.1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.7;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawCopoDeLite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  // pétalas brancas
  const petalCount = 6;
  for (let i = 0; i < petalCount; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / petalCount);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.4, size * 0.15, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = "#fffde7";
  ctx.fill();
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, p.opacity);

  switch (p.shape) {
    case "flor-rosa":
      drawFlowerRosa(ctx, p.x, p.y, p.size, p.rotation, p.color);
      break;
    case "flor-margarida":
      drawFlowerMargarida(ctx, p.x, p.y, p.size, p.rotation);
      break;
    case "flor-girassol":
      drawFlowerGirassol(ctx, p.x, p.y, p.size, p.rotation);
      break;
    case "petalas":
      drawPetala(ctx, p.x, p.y, p.size, p.rotation, p.color);
      break;
    case "sol":
      drawSol(ctx, p.x, p.y, p.size, p.rotation);
      break;
    case "onda":
      drawOnda(ctx, p.x, p.y, p.size, p.rotation, p.color);
      break;
    case "estrela-mar":
      drawEstrelaMar(ctx, p.x, p.y, p.size, p.rotation);
      break;
    case "concha":
      drawConcha(ctx, p.x, p.y, p.size, p.rotation);
      break;
    case "folha":
      drawFolha(ctx, p.x, p.y, p.size, p.rotation, p.color);
      break;
    case "folha-maple":
      drawFolhaMaple(ctx, p.x, p.y, p.size, p.rotation, p.color);
      break;
    case "bolota":
      drawBolota(ctx, p.x, p.y, p.size, p.rotation);
      break;
    case "neve":
      drawNeve(ctx, p.x, p.y, p.size, p.rotation, p.color);
      break;
    case "cristal":
      drawCristal(ctx, p.x, p.y, p.size, p.rotation, p.color);
      break;
    case "copo-de-leite":
      drawCopoDeLite(ctx, p.x, p.y, p.size, p.rotation);
      break;
  }

  ctx.restore();
}

function ParticleCanvas({ config, active }: { config: EstacaoConfig; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    let frame = 0;
    let animId: number;

    const spawn = () => {
      if (frame % 4 === 0 && particles.length < 80) {
        particles.push(createParticle(canvas.width, canvas.height, config));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        // movimento de subida com balanço
        p.x += p.vx + Math.sin(frame * p.swaySpeed + p.swayOffset) * p.sway;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life++;

        // fade in
        if (p.life < 30) {
          p.opacity = p.life / 30;
        }
        // fade out no final
        else if (p.life > p.maxLife * 0.75) {
          p.opacity = 1 - (p.life - p.maxLife * 0.75) / (p.maxLife * 0.25);
        } else {
          p.opacity = 1;
        }

        if (p.life >= p.maxLife || p.y < -50) {
          particles.splice(i, 1);
          continue;
        }

        drawParticle(ctx, p);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [active, config]);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100 }}
    />
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
interface BoasVindasEstacaoProps {
  onClose: () => void;
  /** Para preview/teste: forçar uma estação específica */
  forcarEstacao?: Estacao;
}

export function BoasVindasEstacao({ onClose, forcarEstacao }: BoasVindasEstacaoProps) {
  const estacao = forcarEstacao ?? detectarEstacao();
  const config = estacao ? ESTACOES[estacao] : null;
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [msgVisible, setMsgVisible] = useState(false);

  useEffect(() => {
    if (!config || !estacao) return;

    // Marcar como exibido
    if (!forcarEstacao) {
      marcarComoExibido(estacao);
    }

    // Mensagem aparece junto com as partículas (0.5s de delay)
    const t1 = setTimeout(() => setMsgVisible(true), 500);

    // Após 15 segundos, inicia fade out
    const t2 = setTimeout(() => setFadeOut(true), 15000);

    // Após 15.8s, fecha
    const t3 = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 15800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (!visible || !config || !estacao) return null;

  const linhasMensagem = config.submensagem.split("\n");

  return (
    <>
      <ParticleCanvas config={config} active={visible} />

      {/* Overlay escuro */}
      <div
        className="fixed inset-0 flex items-end justify-center pb-16 px-4"
        style={{
          zIndex: 200,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          transition: "opacity 0.8s ease",
          opacity: fadeOut ? 0 : 1,
          pointerEvents: fadeOut ? "none" : "auto",
        }}
      >
        {/* Card central */}
        <div
          style={{
            background: config.bgGradient,
            borderRadius: "1.5rem",
            border: `2px solid ${config.borderColor}`,
            boxShadow: `0 0 60px ${config.glowColor}, 0 0 120px rgba(0,0,0,0.6)`,
            maxWidth: "480px",
            width: "100%",
            overflow: "hidden",
            transform: msgVisible ? "translateY(0)" : "translateY(80px)",
            opacity: msgVisible ? 1 : 0,
            transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease",
          }}
        >
          {/* Barra superior colorida */}
          <div
            className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, transparent, ${config.borderColor}, transparent)` }}
          />

          <div className="p-8 text-center space-y-5">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-xl opacity-60"
                  style={{ background: `radial-gradient(circle, ${config.titleColor}, transparent)` }}
                />
                <img
                  src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png"
                  alt="Grupo Firme & Forte"
                  className="relative w-20 h-20 object-contain drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Emoji grande da estação */}
            <div
              className="text-6xl"
              style={{
                filter: "drop-shadow(0 0 20px rgba(255,255,255,0.3))",
                animation: "estacao-pulse 2s ease-in-out infinite",
              }}
            >
              {config.emoji}
            </div>

            {/* Título principal */}
            <div>
              <h1
                className="text-3xl font-black leading-tight"
                style={{
                  color: config.titleColor,
                  textShadow: `0 0 30px ${config.glowColor}`,
                }}
              >
                {config.mensagem}
              </h1>
              <div
                className="mt-2 mx-auto h-0.5 w-32"
                style={{ background: `linear-gradient(90deg, transparent, ${config.borderColor}, transparent)` }}
              />
            </div>

            {/* Submensagem */}
            <div className="space-y-1">
              {linhasMensagem.map((linha, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed"
                  style={{
                    color: i === 0 ? config.subtitleColor : "rgba(255,255,255,0.75)",
                    fontWeight: i === 0 ? 600 : 400,
                  }}
                >
                  {linha}
                </p>
              ))}
            </div>

            {/* Rodapé */}
            <p
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Grupo Firme & Forte — Sistema de Gestão
            </p>
          </div>

          {/* Barra inferior */}
          <div
            className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, transparent, ${config.borderColor}, transparent)` }}
          />
        </div>
      </div>

      {/* CSS para animação do emoji */}
      <style>{`
        @keyframes estacao-pulse {
          0%, 100% { transform: scale(1) rotate(-3deg); }
          50% { transform: scale(1.15) rotate(3deg); }
        }
      `}</style>
    </>
  );
}

// ── Hook para uso no App.tsx ─────────────────────────────────────────────────
export function useBoasVindasEstacao() {
  const [deveExibirEstacao, setDeveExibirEstacao] = useState(false);

  useEffect(() => {
    const estacao = detectarEstacao();
    if (!estacao) return;
    if (!estaNos3PrimeirossDias()) return;
    if (!deveExibir(estacao)) return;
    // Pequeno delay para não conflitar com outras modais
    const t = setTimeout(() => setDeveExibirEstacao(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return { deveExibirEstacao, setDeveExibirEstacao };
}
