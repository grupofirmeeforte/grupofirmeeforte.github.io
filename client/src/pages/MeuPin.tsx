import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, KeyRound, ArrowLeft, Smartphone, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export default function MeuPin() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const meuPinQuery = trpc.loginRapido.meuPin.useQuery(undefined, { enabled: !!user });
  const cadastrarPin = trpc.loginRapido.cadastrarPin.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setPin('');
      setPinConfirm('');
      setSenhaConfirmacao('');
      setError('');
      meuPinQuery.refetch();
    },
    onError: (err) => {
      setError(err.message || 'Erro ao cadastrar PIN.');
      setSuccess('');
    },
  });

  const removerPin = trpc.loginRapido.removerPin.useMutation({
    onSuccess: () => {
      setSuccess('PIN removido com sucesso.');
      setError('');
      meuPinQuery.refetch();
    },
    onError: (err) => {
      setError(err.message || 'Erro ao remover PIN.');
      setSuccess('');
    },
  });

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!pin || pin.length < 4) {
      setError('O PIN deve ter no mínimo 4 dígitos.');
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setError('O PIN deve conter apenas números.');
      return;
    }
    if (pin !== pinConfirm) {
      setError('Os PINs não coincidem. Digite novamente.');
      return;
    }
    if (!senhaConfirmacao) {
      setError('Informe sua senha para confirmar o cadastro do PIN.');
      return;
    }

    cadastrarPin.mutate({ pin, senhaConfirmacao });
  };

  const handleRemover = () => {
    if (window.confirm('Deseja remover seu PIN de acesso rápido?')) {
      removerPin.mutate();
    }
  };

  const temPin = meuPinQuery.data?.temPin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Botão voltar */}
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 rounded-full font-semibold text-sm px-4 py-2"
          style={{background:'linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)',color:'#fff',border:'1.5px solid #3b82f6',boxShadow:'0 2px 12px rgba(59,130,246,0.35)'}}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao sistema
        </button>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-blue-700" />
              </div>
              Acesso Rápido — PIN
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre um PIN de 4 a 6 dígitos para entrar no sistema sem precisar digitar sua senha completa.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Status atual */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              temPin ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}>
              {temPin ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">PIN cadastrado</p>
                    <p className="text-xs text-green-600">Você pode usar o PIN para entrar na tela de login.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-gray-800 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Nenhum PIN cadastrado</p>
                    <p className="text-xs text-gray-500">Cadastre um PIN para agilizar seu acesso.</p>
                  </div>
                </>
              )}
            </div>

            {/* Informação sobre celular */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Acesso por Celular</p>
                <p className="text-xs text-blue-600">
                  Você também pode entrar usando os <strong>últimos 4 dígitos do seu celular</strong> cadastrado no perfil — sem precisar configurar nada aqui.
                </p>
              </div>
            </div>

            {/* Formulário de cadastro */}
            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {temPin ? 'Novo PIN' : 'PIN'} (4 a 6 dígitos)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="tracking-widest text-center text-lg font-bold"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  maxLength={6}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="tracking-widest text-center text-lg font-bold"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirme sua senha atual
                </label>
                <Input
                  type="password"
                  placeholder="Digite sua senha para confirmar"
                  value={senhaConfirmacao}
                  onChange={(e) => setSenhaConfirmacao(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-gray-800 mt-1">Por segurança, confirme sua senha para salvar o PIN.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={cadastrarPin.isPending}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {cadastrarPin.isPending ? 'Salvando...' : temPin ? 'Atualizar PIN' : 'Cadastrar PIN'}
              </Button>
            </form>

            {/* Remover PIN */}
            {temPin && (
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemover}
                  disabled={removerPin.isPending}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {removerPin.isPending ? 'Removendo...' : 'Remover PIN'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
