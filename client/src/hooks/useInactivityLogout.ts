import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutos em ms (para testes - mudar para 30 * 60 * 1000 em produção)

export function useInactivityLogout() {
  const { logout, isAuthenticated } = useAuth();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetInactivityTimer = useCallback(() => {
    // Limpar timer anterior
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Atualizar último acesso
    lastActivityRef.current = Date.now();

    // Definir novo timer
    inactivityTimerRef.current = setTimeout(() => {
      if (isAuthenticated) {
        console.log("Desconectando por inatividade...");
        logout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [logout, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      return;
    }

    // Inicializar timer
    resetInactivityTimer();

    // Eventos que indicam atividade do usuário
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Adicionar listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isAuthenticated, resetInactivityTimer]);
}
