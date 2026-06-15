import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UploadDocumento() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Seleciona um arquivo primeiro");
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
        setMessage("Arquivo enviado com sucesso!");
        setFile(null);
      } else {
        setMessage("Erro ao enviar arquivo");
      }
    } catch (error) {
      setMessage("Falha na conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload de Documento</h1>

      <Input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <Button
        onClick={handleUpload}
        disabled={loading || !file}
        className="w-full"
      >
        {loading ? "Enviando..." : "Enviar Arquivo"}
      </Button>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
