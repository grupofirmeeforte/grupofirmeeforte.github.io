import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

// DESABILITADO TEMPORARIAMENTE - Aguardando migração de banco de dados
// O campo ultimaTrocaSenha precisa ser criado na tabela users
export function useCheckPasswordChange() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Desabilitado temporariamente
    return;
  }, [user, location, setLocation]);
}
