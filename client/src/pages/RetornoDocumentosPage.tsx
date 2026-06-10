import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RetornoDocumentos from "./RetornoDocumentos";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

export default function RetornoDocumentosPage() {
  useRegistrarModulo('Retorno Documentos');
  const [, navigate] = useLocation();

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="sm" className="gap-1 bg-gray-800 text-white hover:bg-gray-700" onClick={() => navigate('/febraban')}>
          <ArrowLeft className="w-3.5 h-3.5" />Voltar
        </Button>
        <h1 className="text-xl font-bold">Retorno Documentos</h1>
      </div>
      <RetornoDocumentos />
    </div>
  );
}
