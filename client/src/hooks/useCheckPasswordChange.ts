import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

export function useCheckPasswordChange() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Se não está autenticado ou já está na página de troca de senha, não fazer nada
    if (!user || location === '/change-password' || location === '/login') {
      return;
    }

    // Verificar se precisa trocar senha
    const hoje = new Date();
    const diaDoMes = hoje.getDate();

    // Se é dia 20 ou depois do dia 20, verificar se a última troca foi antes do dia 20
    if (diaDoMes >= 20) {
      // Verificar se ultimaTrocaSenha é null ou anterior ao dia 20 deste mês
      if (!user.ultimaTrocaSenha) {
        // Nunca trocou senha, redirecionar
        setLocation('/change-password');
        return;
      }

      const ultimaTroca = new Date(user.ultimaTrocaSenha);
      const diaUltimaTroca = ultimaTroca.getDate();
      const mesUltimaTroca = ultimaTroca.getMonth();
      const anoUltimaTroca = ultimaTroca.getFullYear();

      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();

      // Se a última troca foi em um mês anterior, ou no mesmo mês mas antes do dia 20
      if (
        anoUltimaTroca < anoAtual ||
        (anoUltimaTroca === anoAtual && mesUltimaTroca < mesAtual) ||
        (anoUltimaTroca === anoAtual && mesUltimaTroca === mesAtual && diaUltimaTroca < 20)
      ) {
        // Precisa trocar senha
        setLocation('/change-password');
      }
    }
  }, [user, location, setLocation]);
}
