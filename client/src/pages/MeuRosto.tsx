/**
 * MeuRosto — Página para o agente cadastrar ou remover seu rosto para login facial
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle2, AlertCircle, Loader2, Trash2, ArrowLeft, ScanFace } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Estado = "idle" | "iniciando" | "capturando" | "processando" | "sucesso" | "erro";

export default function MeuRosto() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [estado, setEstado] = useState<Estado>("idle");
  const [mensagem, setMensagem] = useState("");
  const [cameraAtiva, setCameraAtiva] = useState(false);

  const { data: info, refetch } = trpc.facial.verificarRosto.useQuery();
  const cadastrar = trpc.facial.cadastrarRosto.useMutation();
  const remover = trpc.facial.removerRosto.useMutation();

  const pararCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraAtiva(false);
  }, []);

  useEffect(() => () => pararCamera(), [pararCamera]);

  const iniciarCamera = async () => {
    setEstado("iniciando");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraAtiva(true);
      setEstado("capturando");
      setMensagem("Posicione seu rosto no centro e clique em 'Capturar'");
    } catch (err: any) {
      setEstado("erro");
      setMensagem(err.name === "NotAllowedError"
        ? "Permissão de câmera negada. Permita o acesso nas configurações do navegador."
        : "Erro ao acessar câmera: " + err.message);
    }
  };

  const capturarECadastrar = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];

    setEstado("processando");
    setMensagem("Enviando para reconhecimento...");
    pararCamera();

    try {
      const result = await cadastrar.mutateAsync({ imageBase64 });
      setEstado("sucesso");
      setMensagem(result.message);
      toast.success("Rosto cadastrado com sucesso!");
      refetch();
    } catch (err: any) {
      setEstado("erro");
      setMensagem(err.message || "Erro ao cadastrar rosto.");
      toast.error(err.message || "Erro ao cadastrar rosto.");
    }
  };

  const handleRemover = async () => {
    if (!confirm("Tem certeza que deseja remover seu rosto? Você não poderá mais usar o login facial.")) return;
    try {
      await remover.mutateAsync();
      toast.success("Rosto removido com sucesso.");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover rosto.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button size="sm" onClick={() => setLocation("/")} className="gap-1 rounded-full font-semibold" style={{background:'linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)',color:'#fff',border:'1.5px solid #3b82f6',boxShadow:'0 2px 12px rgba(59,130,246,0.35)'}}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ScanFace className="w-6 h-6 text-blue-600" />
              Login por Reconhecimento Facial
            </h1>
            <p className="text-sm text-gray-500">Cadastre seu rosto para entrar sem digitar nada</p>
          </div>
        </div>

        {/* Status atual */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            {info?.temRosto ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Rosto cadastrado ✅</p>
                    <p className="text-sm text-gray-500">Você pode entrar apenas olhando para a câmera</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleRemover} disabled={remover.isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50">
                  {remover.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Nenhum rosto cadastrado</p>
                  <p className="text-sm text-gray-500">Cadastre seu rosto para ativar o login facial</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Área de cadastro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {info?.temRosto ? "Atualizar Rosto" : "Cadastrar Rosto"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Câmera */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-900 border-2 border-gray-200">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover scale-x-[-1] ${!cameraAtiva ? "hidden" : ""}`}
                muted playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraAtiva && estado !== "processando" && estado !== "sucesso" && estado !== "erro" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-800 to-gray-900">
                  <Camera className="w-16 h-16 text-gray-700" />
                  <p className="text-gray-300 text-sm text-center px-4">
                    Clique em "Abrir Câmera" para começar
                  </p>
                </div>
              )}

              {estado === "iniciando" && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                </div>
              )}

              {estado === "processando" && (
                <div className="absolute inset-0 bg-blue-900/80 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                  <p className="text-white text-sm">Processando...</p>
                </div>
              )}

              {estado === "sucesso" && (
                <div className="absolute inset-0 bg-green-900/80 flex flex-col items-center justify-center gap-3">
                  <CheckCircle2 className="w-16 h-16 text-green-300" />
                  <p className="text-white font-semibold text-center px-4">Rosto cadastrado!</p>
                </div>
              )}

              {estado === "erro" && (
                <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center gap-3 p-4">
                  <AlertCircle className="w-12 h-12 text-red-300" />
                  <p className="text-white text-sm text-center">{mensagem}</p>
                </div>
              )}

              {/* Moldura quando câmera ativa */}
              {cameraAtiva && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                </div>
              )}
            </div>

            {/* Mensagem */}
            {mensagem && estado !== "erro" && (
              <p className={`text-sm text-center ${estado === "sucesso" ? "text-green-600 font-medium" : "text-gray-500"}`}>
                {mensagem}
              </p>
            )}

            {/* Botões */}
            {estado === "idle" || estado === "erro" ? (
              <Button onClick={iniciarCamera} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Camera className="w-4 h-4 mr-2" />
                Abrir Câmera
              </Button>
            ) : estado === "capturando" ? (
              <div className="flex gap-2 w-full">
                <Button onClick={capturarECadastrar} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Capturar e Cadastrar
                </Button>
                <Button onClick={() => { pararCamera(); setEstado("idle"); }} variant="outline">
                  Cancelar
                </Button>
              </div>
            ) : estado === "sucesso" ? (
              <Button onClick={() => { setEstado("idle"); setMensagem(""); }} variant="outline" className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Cadastrar Novamente
              </Button>
            ) : null}

            {/* Dicas */}
            <div className="w-full bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">💡 Dicas para melhor reconhecimento:</p>
              <p>• Boa iluminação no rosto (evite luz atrás)</p>
              <p>• Olhe diretamente para a câmera</p>
              <p>• Sem óculos escuros ou máscara</p>
              <p>• Rosto centralizado na moldura</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
