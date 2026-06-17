import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Download, Eye, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Arquivo {
  nome: string;
  tamanho: number;
  tamanhoFormatado: string;
  dataModificacao: string;
  dataModificacaoFormatada: string;
}

export default function ListaArquivos() {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; arquivo: string | null }>({
    open: false,
    arquivo: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    carregarArquivos();
  }, []);

  const carregarArquivos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/upload");
      if (res.ok) {
        const data = await res.json();
        setArquivos(data.arquivos || []);
      } else {
        toast.error("Erro ao carregar arquivos");
      }
    } catch (error) {
      toast.error("Falha na conexão");
    } finally {
      setLoading(false);
    }
  };

  const arquivosFiltrados = arquivos.filter((arquivo) =>
    arquivo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBaixar = (nomeArquivo: string) => {
    const link = document.createElement("a");
    link.href = `/api/upload/download/${nomeArquivo}`;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download iniciado");
  };

  const handleVisualizar = (nomeArquivo: string) => {
    window.open(`/api/upload/view/${nomeArquivo}`, "_blank");
    toast.info("Abrindo arquivo...");
  };

  const handleExcluir = async (nomeArquivo: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/upload/${encodeURIComponent(nomeArquivo)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Arquivo deletado com sucesso!");
        setArquivos(arquivos.filter((a) => a.nome !== nomeArquivo));
      } else {
        toast.error("Erro ao deletar arquivo");
      }
    } catch (error) {
      toast.error("Falha na conexão");
    } finally {
      setDeleting(false);
      setDeleteConfirm({ open: false, arquivo: null });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Meus Arquivos</h1>
            <p className="text-slate-400">Gerencie seus documentos enviados</p>
          </div>
          <Button
            onClick={() => navigate("/upload")}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Upload
          </Button>
        </div>

        {/* Card Principal */}
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
          {/* Barra de Busca */}
          <div className="p-6 border-b border-slate-700 bg-slate-700/50">
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar por nome do arquivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-600 border-slate-500 text-white placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {arquivosFiltrados.length} arquivo(s) encontrado(s)
            </p>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-slate-400">Carregando arquivos...</span>
              </div>
            ) : arquivos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-slate-400 text-lg">Nenhum arquivo enviado ainda</p>
                <p className="text-slate-500 text-sm mt-1">
                  Volte para a página de upload e envie seus documentos
                </p>
              </div>
            ) : arquivosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-slate-400 text-lg">Nenhum arquivo encontrado</p>
                <p className="text-slate-500 text-sm mt-1">
                  Tente uma busca diferente
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Nome do Arquivo
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Tamanho
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
                      Data de Envio
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {arquivosFiltrados.map((arquivo, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {arquivo.nome.split(".").pop()?.toUpperCase().slice(0, 3)}
                            </span>
                          </div>
                          <span className="text-white font-medium truncate">
                            {arquivo.nome}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{arquivo.tamanhoFormatado}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">
                          {arquivo.dataModificacaoFormatada}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => handleVisualizar(arquivo.nome)}
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleBaixar(arquivo.nome)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() =>
                              setDeleteConfirm({ open: true, arquivo: arquivo.nome })
                            }
                            size="sm"
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer com Info */}
          {arquivos.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-700/30">
              <p className="text-sm text-slate-400">
                Total de {arquivos.length} arquivo(s) • Espaço total:{" "}
                {(
                  arquivos.reduce((acc, f) => acc + f.tamanho, 0) /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => {
        if (!open) setDeleteConfirm({ open: false, arquivo: null });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo "{deleteConfirm.arquivo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirm.arquivo && handleExcluir(deleteConfirm.arquivo)
              }
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
