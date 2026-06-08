import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from './useAuth';

/**
 * Hook que registra automaticamente o acesso a um módulo no log de auditoria.
 * Deve ser chamado no topo de cada página principal com o nome do módulo.
 * 
 * Exemplo de uso:
 *   useRegistrarModulo('Consignado');
 *   useRegistrarModulo('Mailing/CRM');
 *   useRegistrarModulo('Febraban');
 */
export function useRegistrarModulo(nomeModulo: string) {
  const { user } = useAuth();
  const registrado = useRef(false);
  const registrar = trpc.auditoria.registrarAcessoModulo.useMutation();

  useEffect(() => {
    // Só registra se o usuário estiver autenticado e for um agente (não CEO anônimo)
    if (!user || registrado.current) return;

    // Extrair agenteId do openId (formato: 'agente_123')
    let agenteId: number | null = null;
    if (user.openId?.startsWith('agente_')) {
      agenteId = parseInt(user.openId.replace('agente_', ''), 10);
    } else if (user.openId) {
      // CEO/admin — usar id 0 como placeholder
      agenteId = 0;
    }

    if (agenteId === null) return;

    const chaveJ = (user as any).chaveJ || user.openId || 'desconhecido';
    const nomeAgente = (user as any).nomeAgente || user.name || 'desconhecido';

    registrado.current = true;

    registrar.mutate({
      agenteId,
      chaveJ,
      nomeAgente,
      modulo: nomeModulo,
      userAgent: navigator.userAgent,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, nomeModulo]);
}
