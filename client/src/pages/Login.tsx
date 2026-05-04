import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { AlertCircle, Lock } from 'lucide-react';
import type { TRPCClientErrorLike } from '@trpc/client';

export default function Login() {
  const [chaveJ, setChaveJ] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [, setLocation] = useLocation();

  const loginMutation = trpc.auth.loginCustom.useMutation({
    onSuccess: () => {
      setLocation('/');
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

    setError('');
    loginMutation.mutate({ chaveJ, senha });
  };

  return (
    <div className="min-h-screen flex items-end justify-end relative overflow-hidden p-6">
      {/* Fundo com bandeira do Brasil */}
      <div className="absolute inset-0 z-0">
        {/* Verde (fundo) */}
        <div className="absolute inset-0 bg-green-700" />

        {/* Amarelo (losango) */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Losango amarelo */}
          <polygon
            points="600,100 1050,400 600,700 150,400"
            fill="#FCD116"
          />

          {/* Círculo azul */}
          <circle cx="600" cy="400" r="200" fill="#002776" />

          {/* Faixa branca com texto */}
          <ellipse cx="600" cy="400" rx="180" ry="40" fill="white" />
          <text
            x="600"
            y="410"
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill="#002776"
            fontFamily="serif"
          >
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
