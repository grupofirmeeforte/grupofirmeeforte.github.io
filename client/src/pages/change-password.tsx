import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

export default function ChangePasswordPage() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirm, setSenhaConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!senhaAtual || !senhaNova || !senhaConfirm) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (senhaNova.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (senhaNova !== senhaConfirm) {
      setError('As senhas não coincidem');
      return;
    }

    if (senhaAtual === senhaNova) {
      setError('A nova senha deve ser diferente da atual');
      return;
    }

    // Aqui você faria a chamada para a API
    setIsLoading(true);
    
    // Simular mudança de senha
    setTimeout(() => {
      setIsLoading(false);
      // Redirecionar para home após sucesso
      setLocation('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-100 p-3 rounded-full">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">
            Troca de Senha Obrigatória
          </h1>
          
          <p className="text-center text-gray-600 mb-6">
            Você deve trocar sua senha para continuar usando o sistema.
            {user && <span className="block mt-1 font-semibold">{user.name}</span>}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha Atual
              </label>
              <Input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha
              </label>
              <Input
                type="password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                placeholder="Digite a nova senha"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha
              </label>
              <Input
                type="password"
                value={senhaConfirm}
                onChange={(e) => setSenhaConfirm(e.target.value)}
                placeholder="Confirme a nova senha"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Processando...' : 'Confirmar Troca de Senha'}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Esta ação é obrigatória para continuar usando o sistema.
          </p>
        </div>
      </Card>
    </div>
  );
}
