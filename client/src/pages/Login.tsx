import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { AlertCircle, Lock, PartyPopper, CheckCircle2 } from 'lucide-react';
import type { TRPCClientErrorLike } from '@trpc/client';

export default function Login() {
  const [chaveJ, setChaveJ] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [welcomeData, setWelcomeData] = useState<{
    nome: string;
    isAniversario: boolean;
  } | null>(null);
  const [, setLocation] = useLocation();

  const loginMutation = trpc.auth.loginCustom.useMutation({
    onSuccess: (data) => {
      // Mostrar mensagem de boas-vindas por 3 segundos antes de redirecionar
      setWelcomeData({
        nome: data.agente.nome || '',
        isAniversario: data.isAniversario,
      });
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    },
    onError: (err: TRPCClientErrorLike<any>) => {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      if (newAttemptCount >= 3) {
        setIsBlocked(true);
        setError('Sistema bloqueado após 3 tentativas falhas. Contate o administrador.');
      } else {
        setError(`Credenciais inválidas. Tentativas restantes: ${3 - newAttemptCount}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    // Validar horário de acesso
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Verificar se é dia útil (segunda a sexta)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setError('Acesso permitido apenas de segunda a sexta.');
      return;
    }

    // Verificar se está dentro do horário (07:30 às 19:30)
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    const startTime = 7 * 60 + 30;
    const endTime = 19 * 60 + 30;

    if (totalMinutes < startTime || totalMinutes >= endTime) {
      setError('Acesso permitido apenas entre 07:30 e 19:30.');
      return;
    }

    setError('');

    // Limpar cookies antigos
    document.cookie = 'app_session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    loginMutation.mutate({ chaveJ, senha });
  };

  // Tela de boas-vindas após login bem-sucedido
  if (welcomeData) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Fundo com bandeira do Brasil */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-green-700" />
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1200 800"
            preserveAspectRatio="xMidYMid slice"
          >
            <polygon points="600,100 1050,400 600,700 150,400" fill="#FCD116" />
            <circle cx="600" cy="400" r="200" fill="#002776" />
            <ellipse cx="600" cy="400" rx="180" ry="40" fill="white" />
            <text x="600" y="410" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#002776" fontFamily="serif">
              ORDEM E PROGRESSO
            </text>
          </svg>
        </div>

        {/* Card de boas-vindas */}
        <Card className="relative z-10 w-full max-w-lg bg-white/97 backdrop-blur shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="p-10 text-center">
            {welcomeData.isAniversario ? (
              <>
                {/* Aniversário */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                    <PartyPopper className="w-10 h-10 text-yellow-500" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  🎂 Feliz Aniversário!
                </h2>
                <p className="text-xl text-gray-700 mb-4">
                  Parabéns, <span className="font-bold text-green-700">{welcomeData.nome}</span>!
                </p>
                <p className="text-gray-500 mb-6">
                  Que este novo ano seja repleto de conquistas e sucesso! 🎉
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 font-medium">
                    🌟 Hoje é o seu dia especial! Seja muito bem-vindo(a) ao sistema.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Boas-vindas normal */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Seja bem-vindo(a)!
                </h2>
                <p className="text-xl text-gray-700 mb-4">
                  Olá, <span className="font-bold text-green-700">{welcomeData.nome}</span>! 👋
                </p>
                <p className="text-gray-500 mb-6">
                  Você entrou no sistema com sucesso. Tenha um ótimo dia de trabalho!
                </p>
              </>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Redirecionando para o sistema...
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-end justify-end relative overflow-hidden p-6">
      {/* Fundo com bandeira do Brasil */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-green-700" />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          <polygon points="600,100 1050,400 600,700 150,400" fill="#FCD116" />
          <circle cx="600" cy="400" r="200" fill="#002776" />
          <ellipse cx="600" cy="400" rx="180" ry="40" fill="white" />
          <text x="600" y="410" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#002776" fontFamily="serif">
            ORDEM E PROGRESSO
          </text>
        </svg>
      </div>

      {/* Card de login - Canto direito */}
      <Card className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur shadow-2xl">
        <div className="p-8">
          {/* Logo/Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Grupo Firme e Forte
            </h1>
            <p className="text-gray-600">Sistema de Gestão</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* ChaveJ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ChaveJ
              </label>
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

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
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

            {/* Mensagem de erro */}
            {error && (
              <div className={`flex items-start gap-3 p-3 rounded-lg ${
                isBlocked
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isBlocked ? 'text-red-600' : 'text-yellow-600'
                }`} />
                <p className={`text-sm ${
                  isBlocked ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {error}
                </p>
              </div>
            )}

            {/* Botão Entrar */}
            <Button
              type="submit"
              disabled={isBlocked || loginMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {isBlocked ? (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Sistema Bloqueado
                </span>
              ) : loginMutation.isPending ? (
                'Entrando...'
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Rodapé */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Sistema seguro com autenticação por ChaveJ
          </p>
        </div>
      </Card>
    </div>
  );
}
