import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { AlertCircle, Lock, RefreshCw, Fingerprint, ScanFace, ChevronDown, ChevronUp } from 'lucide-react';
import type { TRPCClientErrorLike } from '@trpc/client';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

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

// ── Detectar suporte WebAuthn ────────────────────────────────────────────────
function useWebAuthnSupport() {
  const [supported, setSupported] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return;
    setSupported(true);
    // Verificar se há autenticador de plataforma (face/digital)
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(setPlatformAvailable)
        .catch(() => setPlatformAvailable(false));
    }
  }, []);

  return { supported, platformAvailable };
}

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

  // Biometria
  const { supported: webAuthnSupported, platformAvailable } = useWebAuthnSupport();
  const [bioChaveJ, setBioChaveJ] = useState('');
  const [bioStatus, setBioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bioMessage, setBioMessage] = useState('');
  const [showBioSection, setShowBioSection] = useState(false);

  // Verificar se o usuário já tem biometria cadastrada (ao digitar chaveJ)
  const hasBiometriaQuery = trpc.webauthn.hasBiometria.useQuery(
    { chaveJ: bioChaveJ },
    { enabled: bioChaveJ.length >= 4, staleTime: 30000 }
  );

  const loginMutation = trpc.auth.loginCustom.useMutation({
    onSuccess: (data) => {
      setWelcomeData({ nome: data.agente.nome || '', isAniversario: data.isAniversario });
      setTimeout(() => setLocation('/'), 3000);
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

  const registrationOptionsMutation = trpc.webauthn.registrationOptions.useMutation();
  const registrationVerifyMutation = trpc.webauthn.registrationVerify.useMutation();
  const authenticationOptionsMutation = trpc.webauthn.authenticationOptions.useMutation();
  const authenticationVerifyMutation = trpc.webauthn.authenticationVerify.useMutation();

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

    // Se isento de geo, faz login direto
    if (isIsentoGeo) {
      loginMutation.mutate({ chaveJ, senha });
      return;
    }

    // Verificar se geo já foi capturada
    if (geoCoords) {
      loginMutation.mutate({ chaveJ, senha, latitude: geoCoords.latitude, longitude: geoCoords.longitude });
      return;
    }

    // Solicitar geolocalização antes do login
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      setError('Geolocalização não suportada neste navegador. Acesso bloqueado.');
      return;
    }
    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        };
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

  // ── Cadastrar biometria (após login normal) ──────────────────────────────
  const handleRegistrarBiometria = async () => {
    if (!bioChaveJ) { setBioMessage('Digite sua ChaveJ primeiro.'); setBioStatus('error'); return; }
    setBioStatus('loading');
    setBioMessage('Aguarde, iniciando cadastro biométrico...');
    try {
      const options = await registrationOptionsMutation.mutateAsync({
        chaveJ: bioChaveJ,
        origin: window.location.origin,
        deviceName: navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')
          ? 'iPhone/iPad' : navigator.userAgent.includes('Android') ? 'Android'
          : navigator.userAgent.includes('Mac') ? 'Mac' : 'Computador',
      });
      const attResp = await startRegistration({ optionsJSON: options });
      await registrationVerifyMutation.mutateAsync({
        chaveJ: bioChaveJ,
        response: attResp,
        origin: window.location.origin,
      });
      setBioStatus('success');
      setBioMessage('✅ Biometria cadastrada com sucesso! Na próxima entrada, use o botão de biometria.');
    } catch (e: any) {
      setBioStatus('error');
      if (e.name === 'NotAllowedError') {
        setBioMessage('Acesso à biometria negado. Verifique as permissões do navegador.');
      } else if (e.name === 'InvalidStateError') {
        setBioMessage('Este dispositivo já está cadastrado para esta conta.');
      } else {
        setBioMessage(e.message || 'Erro ao cadastrar biometria.');
      }
    }
  };

  // ── Entrar com biometria ─────────────────────────────────────────────────
  const handleLoginBiometria = async () => {
    if (!bioChaveJ) { setBioMessage('Digite sua ChaveJ primeiro.'); setBioStatus('error'); return; }
    setBioStatus('loading');
    setBioMessage('Aguarde, verificando biometria...');
    try {
      const options = await authenticationOptionsMutation.mutateAsync({ chaveJ: bioChaveJ, origin: window.location.origin });
      const authResp = await startAuthentication({ optionsJSON: options });
      await authenticationVerifyMutation.mutateAsync({
        chaveJ: bioChaveJ,
        response: authResp,
        origin: window.location.origin,
        userAgent: navigator.userAgent,
      });
      setBioStatus('success');
      setBioMessage('✅ Biometria verificada! Entrando...');
      setTimeout(() => setLocation('/'), 1500);
    } catch (e: any) {
      setBioStatus('error');
      if (e.name === 'NotAllowedError') {
        setBioMessage('Biometria cancelada ou não reconhecida. Tente novamente.');
      } else {
        setBioMessage(e.message || 'Falha na autenticação biométrica.');
      }
    }
  };

  // ── Tela de boas-vindas ──────────────────────────────────────────────────
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
        <Card className="relative z-10 w-full max-w-lg bg-white shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="p-10 text-center">
            {welcomeData.isAniversario ? (
              <>
                <div className="flex justify-center mb-4">
                  <img src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png" alt="Grupo Firme & Forte" className="w-24 h-24 object-contain" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">🎂 Feliz Aniversário!</h2>
                <p className="text-xl text-gray-700 mb-4">Parabéns, <span className="font-bold text-blue-800">{welcomeData.nome}</span>!</p>
                <p className="text-gray-500 mb-6">Que este novo ano seja repleto de conquistas e sucesso! 🎉</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 font-medium">🌟 Hoje é o seu dia especial! Seja muito bem-vindo(a) ao sistema.</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <img src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png" alt="Grupo Firme & Forte" className="w-24 h-24 object-contain" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Seja bem-vindo(a)!</h2>
                <p className="text-xl text-gray-700 mb-4">Olá, <span className="font-bold text-blue-800">{welcomeData.nome}</span>! 👋</p>
                <p className="text-gray-500 mb-6">Você entrou no sistema com sucesso. Tenha um ótimo dia de trabalho!</p>
              </>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Redirecionando para o sistema...
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-end p-6 relative overflow-hidden"
      style={{
        backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663564665591/SMgJn6AGQCNfDq7mPzPqc9/coban-bg-972o7wqxPoimymB3vuTFrF.webp')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <Card className="relative z-10 w-full max-w-md bg-white shadow-2xl">
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src="/manus-storage/logo-firme-forte-v2_bac9b5e6.png" alt="Grupo Firme & Forte" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Grupo Firme & Forte</h1>
            <p className="text-gray-600 text-sm">Sistema de Gestão</p>
          </div>

          {/* ── SEÇÃO BIOMETRIA ─────────────────────────────────────────── */}
          {webAuthnSupported && platformAvailable && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setShowBioSection(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-800 font-medium text-sm"
              >
                <span className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5" />
                  <ScanFace className="w-5 h-5" />
                  Entrar com Digital ou Reconhecimento Facial
                </span>
                {showBioSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showBioSection && (
                <div className="mt-3 p-4 border border-blue-200 rounded-xl bg-blue-50 space-y-3">
                  <p className="text-xs text-blue-700 font-medium">
                    Use a biometria do seu dispositivo para entrar rapidamente.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sua ChaveJ</label>
                    <Input
                      type="text"
                      placeholder="Digite sua ChaveJ"
                      value={bioChaveJ}
                      onChange={(e) => { setBioChaveJ(e.target.value); setBioStatus('idle'); setBioMessage(''); }}
                      className="w-full text-sm"
                      autoComplete="off"
                    />
                  </div>

                  {/* Mensagem de status */}
                  {bioMessage && (
                    <div className={`text-xs px-3 py-2 rounded-lg ${
                      bioStatus === 'success' ? 'bg-green-100 text-green-800' :
                      bioStatus === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {bioMessage}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {/* Botão entrar com biometria */}
                    {hasBiometriaQuery.data && (
                      <Button
                        type="button"
                        onClick={handleLoginBiometria}
                        disabled={bioStatus === 'loading' || !bioChaveJ}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm py-2"
                      >
                        {bioStatus === 'loading' && authenticationOptionsMutation.isPending ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <>
                            <Fingerprint className="w-4 h-4" />
                            <ScanFace className="w-4 h-4" />
                          </>
                        )}
                        Entrar com Biometria
                      </Button>
                    )}

                    {/* Botão cadastrar biometria */}
                    <Button
                      type="button"
                      onClick={handleRegistrarBiometria}
                      disabled={bioStatus === 'loading' || !bioChaveJ}
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 text-sm py-2"
                    >
                      {bioStatus === 'loading' && registrationOptionsMutation.isPending ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <Fingerprint className="w-4 h-4" />
                      )}
                      {hasBiometriaQuery.data ? 'Adicionar Dispositivo' : 'Cadastrar Biometria'}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    🔒 Sua biometria nunca sai do dispositivo. Apenas uma chave criptográfica é armazenada.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── DIVISOR ─────────────────────────────────────────────────── */}
          {webAuthnSupported && platformAvailable && (
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">ou entre com senha</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

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
            Sistema seguro · Autenticação por ChaveJ{webAuthnSupported && platformAvailable ? ' · Biometria disponível' : ''}
          </p>
        </div>
      </Card>
    </div>
  );
}
