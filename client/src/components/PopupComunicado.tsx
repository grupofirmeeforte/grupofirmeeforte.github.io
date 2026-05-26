/**
 * PopupComunicado
 * Popup flutuante para envio de prints, fotos e documentos para:
 * - Todos os agentes
 * - Apenas promotores
 * - Um agente específico (por nome)
 */

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  X, Upload, Image, FileText, Users, User, Globe,
  CheckCheck, Send, Paperclip, ChevronDown, Search
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

type TipoDestinatario = "todos" | "promotores" | "especifico";

const TIPOS = [
  {
    value: "todos" as TipoDestinatario,
    label: "Todos",
    sub: "Todos os agentes ativos",
    icon: Globe,
    color: "bg-blue-50 border-blue-400 text-blue-700",
    inactive: "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
  },
  {
    value: "promotores" as TipoDestinatario,
    label: "Promotores",
    sub: "Apenas promotores de vendas",
    icon: Users,
    color: "bg-orange-50 border-orange-400 text-orange-700",
    inactive: "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
  },
  {
    value: "especifico" as TipoDestinatario,
    label: "Específico",
    sub: "Um agente específico",
    icon: User,
    color: "bg-purple-50 border-purple-400 text-purple-700",
    inactive: "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "image/bmp"];

export function PopupComunicado({ onClose }: Props) {
  const [tipo, setTipo] = useState<TipoDestinatario>("todos");
  const [destinatarioId, setDestinatarioId] = useState<number | null>(null);
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const agentesQuery = trpc.comunicados.listarAgentes.useQuery(undefined, {
    enabled: tipo === "especifico",
  });

  const enviarMutation = trpc.comunicados.enviar.useMutation({
    onSuccess: () => {
      toast.success("Comunicado enviado com sucesso!");
      utils.comunicados.listar.invalidate();
      utils.comunicados.contarNaoLidos.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message || "Erro ao enviar comunicado."),
  });

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use imagens (JPG, PNG, GIF, WEBP) ou PDF.");
      return;
    }
    setArquivo(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleEnviar = async () => {
    if (!arquivo && !descricao.trim()) {
      toast.error("Adicione um arquivo ou escreva uma descrição.");
      return;
    }
    if (tipo === "especifico" && !destinatarioId) {
      toast.error("Selecione o destinatário específico.");
      return;
    }

    let arquivoBase64: string | undefined;
    if (arquivo) {
      arquivoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(arquivo);
      });
    }

    enviarMutation.mutate({
      tipoDestinatario: tipo,
      destinatarioId: tipo === "especifico" ? destinatarioId! : undefined,
      titulo: titulo || undefined,
      descricao: descricao || undefined,
      arquivoBase64,
      arquivoTipo: arquivo?.type,
      arquivoNome: arquivo?.name,
    });
  };

  const agentesFiltrados = (agentesQuery.data ?? []).filter(a =>
    busca.length < 2 ||
    a.nomeAgente?.toLowerCase().includes(busca.toLowerCase()) ||
    a.chaveJ?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-blue-700 to-blue-800 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <Paperclip className="w-5 h-5" />
            <h2 className="text-base font-bold">Enviar Comunicado</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tipo de destinatário */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Destinatário</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(t => {
                const Icon = t.icon;
                const sel = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setTipo(t.value); setDestinatarioId(null); setDestinatarioNome(""); setBusca(""); }}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium transition-all ${sel ? t.color : t.inactive}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{t.label}</span>
                    <span className="text-[10px] text-center opacity-70 leading-tight">{t.sub}</span>
                    {sel && <CheckCheck className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de agente específico */}
          {tipo === "especifico" && (
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Selecionar Agente *</label>
              <div
                className="flex items-center gap-2 border rounded-xl px-3 py-2.5 cursor-pointer hover:border-purple-400 transition-colors bg-white"
                onClick={() => setMostrarLista(!mostrarLista)}
              >
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span className={`flex-1 text-sm ${destinatarioNome ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                  {destinatarioNome || "Clique para selecionar..."}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
              {mostrarLista && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        autoFocus
                        className="flex-1 bg-transparent text-sm outline-none"
                        placeholder="Buscar por nome ou ChaveJ..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {agentesQuery.isLoading ? (
                      <p className="text-sm text-gray-400 p-3 text-center">Carregando...</p>
                    ) : agentesFiltrados.length === 0 ? (
                      <p className="text-sm text-gray-400 p-3 text-center">Nenhum agente encontrado</p>
                    ) : (
                      agentesFiltrados.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 transition-colors text-left"
                          onClick={() => {
                            setDestinatarioId(a.id);
                            setDestinatarioNome(a.nomeAgente ?? "");
                            setMostrarLista(false);
                            setBusca("");
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-600 shrink-0">
                            {a.nomeAgente?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{a.nomeAgente}</p>
                            <p className="text-xs text-gray-400 font-mono">{a.chaveJ} · {a.cargo}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Título (opcional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título (opcional)</label>
            <Input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Resultado do mês, Comunicado importante..."
              maxLength={255}
            />
          </div>

          {/* Área de upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Arquivo (print, foto, PDF)
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-red-50"
                    onClick={e => { e.stopPropagation(); setArquivo(null); setPreview(null); }}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ) : arquivo ? (
                <div className="flex items-center gap-3 p-4">
                  <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{arquivo.name}</p>
                    <p className="text-xs text-gray-400">{(arquivo.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    className="p-1 hover:bg-red-50 rounded-full"
                    onClick={e => { e.stopPropagation(); setArquivo(null); setPreview(null); }}
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                  <div className="flex gap-2">
                    <Image className="w-6 h-6" />
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
                  <p className="text-xs">JPG, PNG, GIF, WEBP, PDF — máx. 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Descrição / Mensagem (opcional)
            </label>
            <Textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Adicione uma mensagem ou contexto para o comunicado..."
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{descricao.length}/1000</p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={enviarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleEnviar}
              disabled={enviarMutation.isPending || (!arquivo && !descricao.trim())}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {enviarMutation.isPending ? "Enviando..." : "Enviar Comunicado"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
