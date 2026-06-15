import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";

export default function UploadDocumento() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

  const validateFile = (file: File): boolean => {
    // Verificar tipo MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG ou PNG.");
      return false;
    }

    // Verificar extensão como fallback
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("Extensão de arquivo não permitida. Use .pdf, .jpg, .jpeg ou .png");
      return false;
    }

    // Verificar tamanho
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Arquivo muito grande. Máximo: 5MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setUploadSuccess(false);
      toast.success(`Arquivo selecionado: ${selectedFile.name}`);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("arquivo", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadSuccess(true);
        toast.success("Arquivo enviado com sucesso!");
        setFile(null);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        toast.error("Erro ao enviar arquivo");
      }
    } catch (error) {
      toast.error("Falha na conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Upload de Documentos</h1>
          <p className="text-slate-400">Envie seus documentos de forma segura e rápida</p>
        </div>

        {/* Card Principal */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
          {/* Área de Drag and Drop */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-blue-500 bg-blue-50/10"
                : "border-slate-500 hover:border-slate-400 bg-slate-700/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />

            <div className="flex flex-col items-center gap-3">
              <Upload className={`w-12 h-12 ${dragActive ? "text-blue-500" : "text-slate-400"}`} />
              <div>
                <p className="text-lg font-semibold text-white mb-1">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-slate-400">
                  Formatos aceitos: PDF, JPG, PNG • Máximo: 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Arquivo Selecionado */}
          {file && (
            <div className="mt-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {file.name.split(".").pop()?.toUpperCase().slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{file.name}</p>
                    <p className="text-sm text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-2 hover:bg-slate-600 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {uploadSuccess && (
            <div className="mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-semibold text-green-400">Arquivo enviado com sucesso!</p>
                <p className="text-sm text-green-300">Seu documento foi armazenado com segurança</p>
              </div>
            </div>
          )}

          {/* Botão de Upload */}
          <div className="mt-8 flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={loading || !file}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3"
            >
              {loading ? "Enviando..." : "Enviar Arquivo"}
            </Button>
            {file && (
              <Button
                onClick={() => setFile(null)}
                variant="outline"
                className="px-6 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
            )}
          </div>

          {/* Informações de Segurança */}
          <div className="mt-8 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">
                <p className="font-semibold mb-1">Informações de Segurança</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Seus arquivos são armazenados com segurança</li>
                  <li>Máximo de 5MB por arquivo</li>
                  <li>Formatos permitidos: PDF, JPG, PNG</li>
                  <li>Acesso restrito a usuários autorizados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
