import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { AlertCircle, Lock, PartyPopper, CheckCircle2, RefreshCw } from 'lucide-react';
import type { TRPCClientErrorLike } from '@trpc/client';

// Gera uma operação matemática simples
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

  // Estado da verificação matemática
  const [operacao, setOperacao] = useState(() => gerarOperacao());
  const [respostaMath, setRespostaMath] = useState('');
  const [mathError, setMathError] = useState(false);

  const renovarOperacao = useCallback(() => {
    setOperacao(gerarOperacao());
    setRespostaMath('');
    setMathError(false);
  }, []);

  const loginMutation = trpc.auth.loginCustom.useMutation({
    onSuccess: (data) => {
      setWelcomeData({
        nome: data.agente.nome || '',
        isAniversario: data.isAniversario,
      });
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    },
    onError: (err: TRPCClientErrorLike<any>) => {
      const message = err.message || '';
      renovarOperacao();
      // Erros de horário/dia não consomem tentativas de senha
      if (
        message.includes('segunda a sexta') ||
        message.includes('07:30') ||
        message.includes('Acesso permitido')
      ) {
        setError(message);
        return;
      }
      // Erros de credenciais bloqueadas pelo servidor também não incrementam
      if (message.includes('bloqueado após 3 tentativas')) {
        setIsBlocked(true);
        setError(message);
        return;
      }
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

    // Validar resposta matemática
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
    loginMutation.mutate({ chaveJ, senha });
  };

  // Tela de boas-vindas após login bem-sucedido
  if (welcomeData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#002776' }}>
        <Card className="w-full max-w-lg bg-white shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="p-10 text-center">
            {welcomeData.isAniversario ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                    <PartyPopper className="w-10 h-10 text-yellow-500" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  🎂 Feliz Aniversário!
                </h2>
                <p className="text-xl text-gray-700 mb-4">
                  Parabéns, <span className="font-bold text-blue-800">{welcomeData.nome}</span>!
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
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-blue-700" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Seja bem-vindo(a)!
                </h2>
                <p className="text-xl text-gray-700 mb-4">
                  Olá, <span className="font-bold text-blue-800">{welcomeData.nome}</span>! 👋
                </p>
                <p className="text-gray-500 mb-6">
                  Você entrou no sistema com sucesso. Tenha um ótimo dia de trabalho!
                </p>
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
    <div className="min-h-screen flex items-center justify-end p-6" style={{ backgroundColor: '#002776' }}>
      {/* Card de login - Canto direito */}
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <div className="p-8">
          {/* Logo/Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Grupo Firme & Forte
            </h1>
            <p className="text-gray-600">Sistema de Gestão</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
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

            {/* Verificação Matemática */}
            <div className={`rounded-lg border p-4 ${mathError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Verificação de Segurança
                </label>
                <button
                  type="button"
                  onClick={renovarOperacao}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Nova operação"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-2">
                {operacao.pergunta}
              </p>
              <Input
                type="number"
                placeholder="Digite o resultado"
                value={respostaMath}
                onChange={(e) => { setRespostaMath(e.target.value); setMathError(false); }}
                disabled={isBlocked}
                className={`w-full ${mathError ? 'border-red-400' : ''}`}
                autoComplete="off"
              />
              {mathError && (
                <p className="text-xs text-red-600 mt-1">Resposta incorreta. Tente a nova operação.</p>
              )}
            </div>

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

            <Button
              type="submit"
              disabled={isBlocked || loginMutation.isPending}
              className="w-full text-white font-semibold py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#002776' }}
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

          <p className="text-center text-xs text-gray-500 mt-6">
            Sistema seguro com autenticação por ChaveJ
          </p>
        </div>
      </Card>
    </div>
  );
}
