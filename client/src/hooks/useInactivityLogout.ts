import { useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos em ms

export function useInactivityLogout() {
  const { logout, isAuthenticated } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      return;
    }

    // Função para resetar o timer
    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        console.log("Desconectando por inatividade...");
        logout();
      }, INACTIVITY_TIMEOUT);
    };

    // Inicializar timer
    resetTimer();

    // Eventos que indicam atividade do usuário
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    // Adicionar listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, true);
    });

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer, true);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isAuthenticated, logout]);
}
