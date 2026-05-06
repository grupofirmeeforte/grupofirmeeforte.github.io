import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos em ms

export function useInactivityLogout() {
  const { logout, isAuthenticated } = useAuth({ redirectOnUnauthenticated: false });
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

      timerRef.current = setTimeout(async () => {
        console.log("Desconectando por inatividade...");
        try {
          await logout();
          window.location.href = "/login";
        } catch (error) {
          console.error("Erro ao desconectar:", error);
        }
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
