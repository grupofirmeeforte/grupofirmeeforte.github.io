import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useDisconnectNotification() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Verificar se há motivo de desconexão no localStorage
    const motivoDesconexao = localStorage.getItem('motivoDesconexao');
    
    if (motivoDesconexao) {
      // Mostrar toast/alerta
      console.log('Motivo de desconexão:', motivoDesconexao);
      
      // Mostrar alerta ao usuário
      alert(motivoDesconexao);
      
      // Limpar localStorage
      localStorage.removeItem('motivoDesconexao');
      
      // Redirecionar para login
      setLocation('/login');
    }
  }, [setLocation]);
}
