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
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Chamar a API para trocar a senha
    // Por enquanto, apenas redirecionar após sucesso
    setTimeout(() => {
      // Redirecionar para home após sucesso
      setLocation('/');
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Trocar Senha</h1>
          </div>

          <p className="text-gray-300 text-center mb-6">
            Você precisa trocar sua senha para continuar usando o sistema.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Senha Atual
              </label>
              <Input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
                disabled={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nova Senha
              </label>
              <Input
                type="password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                placeholder="Digite sua nova senha"
                disabled={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Confirmar Nova Senha
              </label>
              <Input
                type="password"
                value={senhaConfirm}
                onChange={(e) => setSenhaConfirm(e.target.value)}
                placeholder="Confirme sua nova senha"
                disabled={false}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Trocar Senha
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
