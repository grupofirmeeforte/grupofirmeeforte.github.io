/**
 * LoginFacial — Componente de login por reconhecimento facial
 * Abre a webcam, detecta o rosto automaticamente e faz login sem digitar nada.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Camera, X, Scan, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface LoginFacialProps {
  onSuccess: (data: { nomeAgente: string; cargo: string }) => void;
  onClose: () => void;
}

type Estado = "idle" | "iniciando" | "escaneando" | "processando" | "sucesso" | "erro";

export function LoginFacial({ onSuccess, onClose }: LoginFacialProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [estado, setEstado] = useState<Estado>("idle");
  const [mensagem, setMensagem] = useState("");
  const [nomeDetectado, setNomeDetectado] = useState("");

  const loginFacial = trpc.facial.loginFacial.useMutation();

  // Parar câmera
  const pararCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Capturar frame do vídeo como base64
  const capturarFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    // Retorna apenas o base64 sem o prefixo data:image/jpeg;base64,
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  }, []);

  // Iniciar câmera
  const iniciarCamera = useCallback(async () => {
    setEstado("iniciando");
    setMensagem("Iniciando câmera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEstado("escaneando");
      setMensagem("Posicione seu rosto no centro da câmera...");

      // Tentar reconhecimento a cada 2.5 segundos
      intervalRef.current = setInterval(async () => {
        if (estado === "processando" || estado === "sucesso") return;
        const frame = capturarFrame();
        if (!frame) return;

        setEstado("processando");
        setMensagem("Reconhecendo rosto...");

        try {
          const result = await loginFacial.mutateAsync({ imageBase64: frame });
          setEstado("sucesso");
          setNomeDetectado(result.nomeAgente || "");
          setMensagem(`Bem-vindo, ${result.nomeAgente}! 🎉`);
          pararCamera();
          setTimeout(() => onSuccess({ nomeAgente: result.nomeAgente, cargo: result.cargo ?? "" }), 1500);
        } catch (err: any) {
          const msg = err?.message || "Rosto não reconhecido.";
          if (msg.includes("Nenhum rosto detectado")) {
            setEstado("escaneando");
            setMensagem("Posicione seu rosto no centro da câmera...");
          } else if (msg.includes("não reconhecido")) {
            setEstado("escaneando");
            setMensagem("Rosto não reconhecido. Tente novamente ou use a senha.");
          } else {
            setEstado("erro");
            setMensagem(msg);
            pararCamera();
          }
        }
      }, 2500);
    } catch (err: any) {
      setEstado("erro");
      if (err.name === "NotAllowedError") {
        setMensagem("Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.");
      } else if (err.name === "NotFoundError") {
        setMensagem("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setMensagem("Erro ao acessar a câmera: " + err.message);
      }
    }
  }, [capturarFrame, loginFacial, onSuccess, pararCamera, estado]);

  // Limpar ao desmontar
  useEffect(() => {
    return () => pararCamera();
  }, [pararCamera]);

  const reiniciar = () => {
    pararCamera();
    setEstado("idle");
    setMensagem("");
    setNomeDetectado("");
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-800">Reconhecimento Facial</span>
        </div>
        <button onClick={() => { pararCamera(); onClose(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Área da câmera */}
      <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden bg-gray-900 border-2 border-gray-200 shadow-inner">
        {/* Vídeo */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover scale-x-[-1] ${estado === "idle" || estado === "erro" ? "hidden" : ""}`}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay de estado */}
        {estado === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-800 to-gray-900">
            <Camera className="w-16 h-16 text-gray-400" />
            <p className="text-gray-300 text-sm text-center px-4">Clique em "Iniciar" para ativar a câmera</p>
          </div>
        )}

        {estado === "iniciando" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            <p className="text-gray-300 text-sm">Iniciando câmera...</p>
          </div>
        )}

        {/* Moldura de escaneamento */}
        {(estado === "escaneando" || estado === "processando") && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Cantos da moldura */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />

            {/* Linha de escaneamento animada */}
            {estado === "escaneando" && (
              <div className="absolute left-4 right-4 h-0.5 bg-blue-400 opacity-80 animate-scan" style={{ top: "50%" }} />
            )}

            {/* Overlay de processando */}
            {estado === "processando" && (
              <div className="absolute inset-0 bg-blue-900/30 flex items-center justify-center">
                <div className="bg-white/90 rounded-full p-3">
                  <Scan className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sucesso */}
        {estado === "sucesso" && (
          <div className="absolute inset-0 bg-green-900/80 flex flex-col items-center justify-center gap-3">
            <CheckCircle2 className="w-16 h-16 text-green-300" />
            <p className="text-white font-semibold text-center px-4">{nomeDetectado}</p>
          </div>
        )}

        {/* Erro */}
        {estado === "erro" && (
          <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center gap-3 p-4">
            <AlertCircle className="w-12 h-12 text-red-300" />
            <p className="text-white text-sm text-center">{mensagem}</p>
          </div>
        )}
      </div>

      {/* Mensagem de status */}
      {estado !== "idle" && estado !== "erro" && (
        <p className={`text-sm text-center px-2 ${estado === "sucesso" ? "text-green-600 font-medium" : "text-gray-500"}`}>
          {mensagem}
        </p>
      )}

      {/* Botões */}
      <div className="flex gap-2 w-full">
        {estado === "idle" && (
          <Button onClick={iniciarCamera} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Camera className="w-4 h-4 mr-2" />
            Iniciar Câmera
          </Button>
        )}
        {(estado === "escaneando" || estado === "processando") && (
          <Button onClick={reiniciar} variant="outline" className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}
        {estado === "erro" && (
          <>
            <Button onClick={reiniciar} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              <Camera className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button onClick={() => { pararCamera(); onClose(); }} variant="outline" className="flex-1">
              Usar Senha
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Sem câmera? Use ChaveJ + Senha abaixo.
      </p>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-60px); opacity: 0.8; }
          50% { opacity: 1; }
          100% { transform: translateY(60px); opacity: 0.8; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
