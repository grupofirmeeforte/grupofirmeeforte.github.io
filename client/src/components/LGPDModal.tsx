import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LGPDModalProps {
  onAccept: () => void;
  isLoading?: boolean;
}

export function LGPDModal({ onAccept, isLoading = false }: LGPDModalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    setScrolledToBottom(isAtBottom);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Política de Privacidade e LGPD</h2>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-700"
          onScroll={handleScroll}
        >
          <div className="space-y-4">
            <section>
              <h3 className="font-bold text-gray-900 mb-2">1. Introdução</h3>
              <p>
                A Grupo Firme & Forte ("Empresa") respeita sua privacidade e está comprometida em proteger seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">2. Dados Coletados</h3>
              <p>
                Coletamos informações pessoais necessárias para o funcionamento do sistema, incluindo:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Nome e dados de identificação</li>
                <li>Endereço de email</li>
                <li>Informações de acesso e navegação</li>
                <li>Dados de transações e operações</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">3. Finalidade do Tratamento</h3>
              <p>
                Seus dados são utilizados para:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Autenticação e gerenciamento de conta</li>
                <li>Prestação de serviços solicitados</li>
                <li>Conformidade com obrigações legais</li>
                <li>Melhorias no sistema e segurança</li>
                <li>Comunicações importantes sobre sua conta</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">4. Compartilhamento de Dados</h3>
              <p>
                Seus dados não serão compartilhados com terceiros sem seu consentimento, exceto quando exigido por lei ou para prestadores de serviço essenciais.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">5. Segurança</h3>
              <p>
                Implementamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado, alteração ou destruição.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">6. Seus Direitos</h3>
              <p>
                De acordo com a LGPD, você tem direito a:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou inexatos</li>
                <li>Solicitar exclusão de dados</li>
                <li>Revogar consentimento</li>
                <li>Portabilidade de dados</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">7. Contato</h3>
              <p>
                Para dúvidas sobre esta política ou para exercer seus direitos, entre em contato conosco através do email de suporte.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 mb-2">8. Consentimento</h3>
              <p>
                Ao aceitar esta política, você concorda com o tratamento de seus dados pessoais conforme descrito acima.
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {scrolledToBottom ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Você leu a política completa</span>
              </>
            ) : (
              <span className="text-gray-500">Role para baixo para aceitar</span>
            )}
          </div>
          <Button
            onClick={onAccept}
            disabled={!scrolledToBottom || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isLoading ? 'Processando...' : 'Aceitar e Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
