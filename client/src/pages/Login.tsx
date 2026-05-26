import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { AlertCircle, Lock, RefreshCw, Smartphone, KeyRound, ChevronDown, ChevronUp, ScanFace } from 'lucide-react';
import { LoginFacial } from '@/components/LoginFacial';
import type { TRPCClientErrorLike } from '@trpc/client';

// ── CAPTCHA matemático ───────────────────────────────────────────────────────
function gerarOperacao() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, resultado: number;
  if (op === '+') {
    a = Math.floor(Math.random() * 9) + 1;
    b = Math.floor(Math.random() * 9) + 1;
    resultado = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    resultado = a - b;
  } else {
    a = Math.floor(Math.random() * 5) + 2;
    b = Math.floor(Math.random() * 5) + 2;
    resultado = a * b;
  }
  return { pergunta: `Quanto é ${a} ${op} ${b}?`, resultado };
}

// ── Balões de aniversário ───────────────────────────────────────────────────
const BALLOON_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF6FD8', '#00C9FF', '#FF4E50', '#43E97B',
];

function BalloonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const balloons: {
      x: number; y: number; r: number; color: string;
      speed: number; sway: number; swaySpeed: number; swayOffset: number;
      stringLen: number;
    }[] = [];

    for (let i = 0; i < 35; i++) {
      balloons.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 400 + 50,
        r: 22 + Math.random() * 20,
        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        speed: 1.2 + Math.random() * 2.2,
        sway: 30 + Math.random() * 40,
        swaySpeed: 0.015 + Math.random() * 0.025,
        swayOffset: Math.random() * Math.PI * 2,
        stringLen: 35 + Math.random() * 25,
      });
    }

    let frame = 0;
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      balloons.forEach(b => {
        b.y -= b.speed;
        const bx = b.x + Math.sin(frame * b.swaySpeed + b.swayOffset) * b.sway;
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(bx, b.y, b.r, b.r * 1.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        const grad = ctx.createRadialGradient(bx - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.05, bx, b.y, b.r);
        grad.addColorStop(0, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.ellipse(bx, b.y, b.r, b.r * 1.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, b.y + b.r * 1.22, 4, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx, b.y + b.r * 1.22 + 4);
        ctx.bezierCurveTo(bx + 8, b.y + b.r * 1.22 + b.stringLen * 0.4, bx - 8, b.y + b.r * 1.22 + b.stringLen * 0.7, bx, b.y + b.r * 1.22 + b.stringLen);
        ctx.strokeStyle = 'rgba(180,180,180,0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 50 }} />;
}

// ── Tipo de acesso rápido ────────────────────────────────────────────────────
type MetodoRapido = 'celular' | 'pin';


export default function Login() {
  const [chaveJ, setChaveJ] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [welcomeData, setWelcomeData] = useState<{ nome: string; isAniversario: boolean } | null>(null);
  const [, setLocation] = useLocation();

  // Geolocalização
  const CHAVES_ISENTAS_GEO = ['J1234567', 'JBMF1234'];
  const isIsentoGeo = CHAVES_ISENTAS_GEO.includes(chaveJ.trim().toUpperCase());
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'>('idle');
  const [geoCoords, setGeoCoords] = useState<{ latitude: string; longitude: string } | null>(null);

  // CAPTCHA
  const [operacao, setOperacao] = useState(() => gerarOperacao());
  const [respostaMath, setRespostaMath] = useState('');
  const [mathError, setMathError] = useState(false);

  // ── Acesso Rápido (Celular / PIN) ────────────────────────────────────────
  const [showRapidoSection, setShowRapidoSection] = useState(true);
  const [metodoRapido, setMetodoRapido] = useState<MetodoRapido>('celular');
  const [rapidoChaveJ, setRapidoChaveJ] = useState('');
  const [digitosCelular, setDigitosCelular] = useState('');
  const [pinDigitado, setPinDigitado] = useState('');
  const [rapidoStatus, setRapidoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [rapidoMessage, setRapidoMessage] = useState('');

  const [showFacial, setShowFacial] = useState(false);

  // Sincronizar chaveJ do formulário principal com o campo de acesso rápido
  useEffect(() => {
    if (chaveJ.trim().length >= 4) setRapidoChaveJ(chaveJ.trim().toUpperCase());
  }, [chaveJ]);

  // Buscar métodos disponíveis para a ChaveJ digitada
  const metodosQuery = trpc.loginRapido.verificarMetodos.useQuery(
    { chaveJ: rapidoChaveJ },
    { enabled: rapidoChaveJ.length >= 4, staleTime: 30000 }
  );

  const loginCelularMutation = trpc.loginRapido.loginCelular.useMutation();
  const loginPinMutation = trpc.loginRapido.loginPin.useMutation();

  const loginMutation = trpc.auth.loginCustom.useMutation({
    onSuccess: (data) => {
      setWelcomeData({ nome: data.agente.nome || '', isAniversario: data.isAniversario });
      const delay = data.isAniversario ? 13000 : 3000;
      setTimeout(() => setLocation('/'), delay);
    },
    onError: (err: TRPCClientErrorLike<any>) => {
      const message = err.message || '';
      renovarOperacao();
      if (message.includes('segunda a sexta') || message.includes('07:30') || message.includes('Acesso permitido')) {
        setError(message); return;
      }
      if (message.includes('bloqueado após 3 tentativas')) {
        setIsBlocked(true); setError(message); return;
      }
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);
      if (newCount >= 3) {
        setIsBlocked(true);
        setError('Sistema bloqueado após 3 tentativas falhas. Contate o administrador.');
      } else {
        setError(`Credenciais inválidas. Tentativas restantes: ${3 - newCount}`);
      }
    },
  });

  const renovarOperacao = useCallback(() => {
    setOperacao(gerarOperacao());
    setRespostaMath('');
    setMathError(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;
    const respostaNum = parseInt(respostaMath.trim(), 10);
    if (isNaN(respostaNum) || respostaNum !== operacao.resultado) {
      setMathError(true);
      renovarOperacao();
      return;
    }
    setError('');
    setMathError(false);
    document.cookie = 'app_session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    if (isIsentoGeo) {
      loginMutation.mutate({ chaveJ, senha });
      return;
    }
    if (geoCoords) {
      loginMutation.mutate({ chaveJ, senha, latitude: geoCoords.latitude, longitude: geoCoords.longitude });
      return;
    }
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      setError('Geolocalização não suportada neste navegador. Acesso bloqueado.');
      return;
    }
    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) };
        setGeoCoords(coords);
        setGeoStatus('granted');
        loginMutation.mutate({ chaveJ, senha, latitude: coords.latitude, longitude: coords.longitude });
      },
      () => {
        setGeoStatus('denied');
        setError('Geolocalização negada. Permita o acesso à localização para entrar no sistema.');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  // ── Handler de acesso rápido ─────────────────────────────────────────────
  const handleAcessoRapido = async () => {
    if (!rapidoChaveJ) { setRapidoMessage('Digite sua ChaveJ.'); setRapidoStatus('error'); return; }
    setRapidoStatus('loading');
    setRapidoMessage('');
    try {
      let data: any;
      if (metodoRapido === 'celular') {
        if (!digitosCelular || digitosCelular.length !== 4) {
          setRapidoMessage('Digite os 4 últimos dígitos do seu celular.'); setRapidoStatus('error'); return;
        }
        data = await loginCelularMutation.mutateAsync({ chaveJ: rapidoChaveJ, digitosCelular });
      } else {
        if (!pinDigitado || pinDigitado.length < 4) {
          setRapidoMessage('Digite seu PIN (4 a 6 dígitos).'); setRapidoStatus('error'); return;
        }
        data = await loginPinMutation.mutateAsync({ chaveJ: rapidoChaveJ, pin: pinDigitado });
      }
      setRapidoStatus('success');
      setRapidoMessage('Acesso confirmado! Entrando...');
      setWelcomeData({ nome: data.agente.nome || '', isAniversario: data.isAniversario });
      const delay = data.isAniversario ? 13000 : 3000;
      setTimeout(() => setLocation('/'), delay);
    } catch (e: any) {
      setRapidoStatus('error');
      const msg = e.message || '';
      if (msg.includes('bloqueado')) {
        setRapidoMessage('Sistema bloqueado após 3 tentativas. Contate o administrador.');
      } else if (msg.includes('incorretos') || msg.includes('incorreto') || msg.includes('inválid')) {
        setRapidoMessage(msg);
      } else if (msg.includes('não cadastrado')) {
        setRapidoMessage(msg);
      } else {
        setRapidoMessage(msg || 'Erro ao verificar. Tente novamente.');
      }
    }
  };

  // ── Tela de boas-vindas ──────────────────────────────────────────────────
  const [showBalloons, setShowBalloons] = useState(true);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!welcomeData?.isAniversario) return;
    const t1 = setTimeout(() => setShowBalloons(false), 10000);
    const t2 = setTimeout(() => setShowMessage(true), 10200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [welcomeData?.isAniversario]);

  if (welcomeData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663564665591/SMgJn6AGQCNfDq7mPzPqc9/coban-bg-972o7wqxPoimymB3vuTFrF.webp')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/55" />
        {welcomeData.isAniversario && showBalloons && <BalloonCanvas />}
        <Card
          className="relative w-full max-w-lg bg-white shadow-2xl animate-in fade-in zoom-in duration-500"
          style={{ borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', zIndex: 10 }}
        >
          {welcomeData.isAniversario ? (
            <>
              <div className="text-6xl mb-4">🎂</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Feliz Aniversário, {welcomeData.nome.split(' ')[0]}!
              </h2>
              {showMessage && (
                <div className="animate-in fade-in duration-700">
                  <p className="text-gray-600 text-lg mb-4">
                    Que este novo ano seja repleto de conquistas, saúde e muito sucesso!
                  </p>
                  <p className="text-blue-700 font-semibold">
                    Com carinho, toda a equipe Grupo Firme & Forte 💙
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bem-vindo, {welcomeData.nome.split(' ')[0]}!
              </h2>
              <p className="text-gray-500">Carregando o sistema...</p>
            </>
          )}
        </Card>
      </div>
    );
  }

  // ── Tela de login ────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663564665591/SMgJn6AGQCNfDq7mPzPqc9/coban-bg-972o7wqxPoimymB3vuTFrF.webp')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/55" />
      <Card
        className="relative w-full max-w-md bg-white shadow-2xl"
        style={{ borderRadius: '1.5rem', zIndex: 10, maxHeight: '95vh', overflowY: 'auto' }}
      >
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png" alt="Grupo Firme & Forte" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Grupo Firme & Forte</h1>
            <p className="text-gray-600 text-sm">Sistema de Gestão</p>
          </div>

          {/* ── LOGIN FACIAL ─────────────────────────────────────────────── */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowFacial(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-indigo-800 font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                <ScanFace className="w-5 h-5" />
                Entrar com Reconhecimento Facial
              </span>
              {showFacial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showFacial && (
              <div className="mt-2 border border-indigo-200 rounded-xl overflow-hidden bg-white">
                <LoginFacial
                  onSuccess={(data) => {
                    setWelcomeData({ nome: data.nomeAgente, isAniversario: false });
                    setTimeout(() => setLocation('/'), 1500);
                  }}
                  onClose={() => setShowFacial(false)}
                />
              </div>
            )}
          </div>

          {/* ── SEÇÃO ACESSO RÁPIDO ─────────────────────────────────────── */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowRapidoSection(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-800 font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                <KeyRound className="w-5 h-5" />
                Acesso Rápido (Celular ou PIN)
              </span>
              {showRapidoSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRapidoSection && (
              <div className="mt-3 p-4 border border-blue-200 rounded-xl bg-blue-50 space-y-3">

                {/* ChaveJ */}
                {!rapidoChaveJ ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sua ChaveJ</label>
                    <Input
                      type="text"
                      placeholder="Digite sua ChaveJ"
                      value={rapidoChaveJ}
                      onChange={(e) => { setRapidoChaveJ(e.target.value.toUpperCase()); setRapidoStatus('idle'); setRapidoMessage(''); }}
                      className="w-full text-sm"
                      autoComplete="off"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2 font-medium flex items-center justify-between">
                    <span>ChaveJ: <span className="font-bold">{rapidoChaveJ}</span></span>
                    {metodosQuery.data && (
                      <span className="text-blue-500 text-xs">
                        {metodosQuery.data.temCelular && metodosQuery.data.temPin ? '📱 + 🔑' :
                         metodosQuery.data.temCelular ? '📱 celular' :
                         metodosQuery.data.temPin ? '🔑 PIN' : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Seletor de método */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setMetodoRapido('celular'); setRapidoStatus('idle'); setRapidoMessage(''); }}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      metodoRapido === 'celular'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Celular
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMetodoRapido('pin'); setRapidoStatus('idle'); setRapidoMessage(''); }}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      metodoRapido === 'pin'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    PIN
                  </button>
                </div>

                {/* Campo de entrada conforme método */}
                {metodoRapido === 'celular' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Últimos 4 dígitos do celular
                      {metodosQuery.data?.celularMascarado && (
                        <span className="text-blue-600 ml-1">({metodosQuery.data.celularMascarado})</span>
                      )}
                    </label>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Ex: 1234"
                      maxLength={4}
                      value={digitosCelular}
                      onChange={(e) => { setDigitosCelular(e.target.value.replace(/\D/g, '').slice(0, 4)); setRapidoStatus('idle'); setRapidoMessage(''); }}
                      className="w-full text-sm tracking-widest text-center text-lg font-bold"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-400 mt-1">Digite os 4 últimos dígitos do celular cadastrado no seu perfil.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">PIN de acesso (4 a 6 dígitos)</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      placeholder="••••"
                      maxLength={6}
                      value={pinDigitado}
                      onChange={(e) => { setPinDigitado(e.target.value.replace(/\D/g, '').slice(0, 6)); setRapidoStatus('idle'); setRapidoMessage(''); }}
                      className="w-full text-sm tracking-widest text-center text-lg font-bold"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-400 mt-1">PIN cadastrado no seu perfil. Não tem PIN? Entre com senha e cadastre em Configurações.</p>
                  </div>
                )}

                {/* Mensagem de status */}
                {rapidoMessage && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${
                    rapidoStatus === 'success' ? 'bg-green-100 text-green-800' :
                    rapidoStatus === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rapidoMessage}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleAcessoRapido}
                  disabled={rapidoStatus === 'loading' || !rapidoChaveJ}
                  className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm py-2"
                >
                  {rapidoStatus === 'loading' ? (
                    <span className="animate-spin">⏳</span>
                  ) : metodoRapido === 'celular' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  {rapidoStatus === 'loading' ? 'Verificando...' : 'Entrar com Acesso Rápido'}
                </Button>
              </div>
            )}
          </div>

          {/* ── DIVISOR ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou entre com senha</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── FORMULÁRIO SENHA ─────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ChaveJ</label>
              <Input
                type="text"
                placeholder="Digite sua ChaveJ"
                value={chaveJ}
                onChange={(e) => setChaveJ(e.target.value)}
                disabled={isBlocked}
                className="w-full"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                data-bm-ignore="true"
                spellCheck="false"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <Input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={isBlocked}
                className="w-full"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                data-bm-ignore="true"
              />
            </div>

            {/* CAPTCHA matemático */}
            <div className={`rounded-lg border p-4 ${mathError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Verificação de Segurança</label>
                <button type="button" onClick={renovarOperacao} className="text-gray-400 hover:text-gray-600 transition-colors" title="Nova operação">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-2">{operacao.pergunta}</p>
              <Input
                type="number"
                placeholder="Digite o resultado"
                value={respostaMath}
                onChange={(e) => { setRespostaMath(e.target.value); setMathError(false); }}
                disabled={isBlocked}
                className={`w-full ${mathError ? 'border-red-400' : ''}`}
                autoComplete="off"
              />
              {mathError && <p className="text-xs text-red-600 mt-1">Resposta incorreta. Tente a nova operação.</p>}
            </div>

            {/* Indicador de geolocalização */}
            {!isIsentoGeo && geoStatus === 'requesting' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <span className="animate-spin text-blue-600">&#8635;</span>
                <p className="text-sm text-blue-700">Aguardando permissão de localização...</p>
              </div>
            )}
            {!isIsentoGeo && geoStatus === 'granted' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="text-green-600">&#10003;</span>
                <p className="text-sm text-green-700">Localização capturada com sucesso.</p>
              </div>
            )}

            {error && (
              <div className={`flex items-start gap-3 p-3 rounded-lg ${isBlocked ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${isBlocked ? 'text-red-600' : 'text-yellow-600'}`} />
                <p className={`text-sm ${isBlocked ? 'text-red-700' : 'text-yellow-700'}`}>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isBlocked || loginMutation.isPending || geoStatus === 'requesting'}
              className="w-full text-white font-semibold py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#002776' }}
            >
              {isBlocked ? (
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Sistema Bloqueado</span>
              ) : geoStatus === 'requesting' ? 'Aguardando localização...' : loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Sistema seguro · Autenticação por ChaveJ · Acesso rápido disponível
          </p>
        </div>
      </Card>
    </div>
  );
}
