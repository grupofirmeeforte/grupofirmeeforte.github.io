import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, Eye, Search, X, FileText, Image as ImageIcon, File, FolderOpen, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import PageHeader from '@/components/PageHeader';
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

const TIPOS_DOCUMENTO = [
  'Contrato',
  'RG',
  'CPF',
  'Comprovante de Endereço',
  'CNH',
  'Comprovante de Conta Bancária',
  'Foto 3x4',
  'Outros',
];

const CORES_TIPO: Record<string, string> = {
  'Contrato': 'bg-blue-100 text-blue-800',
  'RG': 'bg-green-100 text-green-800',
  'CPF': 'bg-yellow-100 text-yellow-800',
  'Comprovante de Endereço': 'bg-purple-100 text-purple-800',
  'CNH': 'bg-orange-100 text-orange-800',
  'Comprovante de Conta Bancária': 'bg-teal-100 text-teal-800',
  'Foto 3x4': 'bg-pink-100 text-pink-800',
  'Outros': 'bg-gray-100 text-white',
};

function formatBytes(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(tipo: string) {
  if (tipo?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (tipo === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-gray-800" />;
}

export default function DocumentacaoAgentes() {
  useRegistrarModulo('Documentação Agentes');
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Filtro da lista de agentes
  const [filtroBusca, setFiltroBusca] = useState('');

  // Agente selecionado para ver documentos
  const [agenteSelecionado, setAgenteSelecionado] = useState<{
    chaveJ: string; nomeAgente: string | null; empresa: string | null;
  } | null>(null);

  // Modal upload
  const [modalUpload, setModalUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    tipoDocumento: '',
    descricao: '',
    observacao: '',
  });
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal visualização
  const [docVisualizar, setDocVisualizar] = useState<any>(null);
  const [urlAssinada, setUrlAssinada] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  // Filtro de tipo nos documentos do agente
  const [filtroTipoDoc, setFiltroTipoDoc] = useState('');

  // Query: lista de agentes com contagem de docs
  const { data: agentesComDocs = [], isLoading: loadingAgentes, refetch: refetchAgentes } =
    trpc.documentosAgentes.listarAgentesComDocs.useQuery(
      { busca: filtroBusca || undefined },
      { refetchOnWindowFocus: false }
    );

  // Query: URL assinada para visualização
  const getUrlAssinadaQuery = trpc.documentosAgentes.getUrlAssinada.useQuery(
    { arquivoKey: docVisualizar?.arquivoKey ?? '' },
    { enabled: !!docVisualizar?.arquivoKey, refetchOnWindowFocus: false }
  );

  // Query: documentos do agente selecionado
  const { data: documentosAgente = [], isLoading: loadingDocs, refetch: refetchDocs } =
    trpc.documentosAgentes.listar.useQuery(
      { chaveJ: agenteSelecionado?.chaveJ },
      { enabled: !!agenteSelecionado, refetchOnWindowFocus: false }
    );

  // Mutations
  const uploadMutation = trpc.documentosAgentes.upload.useMutation({
    onSuccess: () => {
      utils.documentosAgentes.listar.invalidate();
      utils.documentosAgentes.listarAgentesComDocs.invalidate();
      toast.success('Documento enviado com sucesso!');
      setModalUpload(false);
      resetUploadForm();
    },
    onError: (e) => toast.error('Erro ao enviar documento: ' + e.message),
  });

  const deletarMutation = trpc.documentosAgentes.deletar.useMutation({
    onSuccess: () => {
      utils.documentosAgentes.listar.invalidate();
      utils.documentosAgentes.listarAgentesComDocs.invalidate();
      toast.success('Documento excluído!');
    },
    onError: (e) => toast.error('Erro ao excluir: ' + e.message),
  });

  function resetUploadForm() {
    setUploadForm({ tipoDocumento: '', descricao: '', observacao: '' });
    setArquivoSelecionado(null);
  }

  async function handleUpload() {
    if (!agenteSelecionado) return;
    if (!uploadForm.tipoDocumento) { toast.error('Selecione o tipo de documento'); return; }
    if (!arquivoSelecionado) { toast.error('Selecione um arquivo'); return; }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (arquivoSelecionado.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      uploadMutation.mutate({
        chaveJ: agenteSelecionado.chaveJ,
        nomeAgente: agenteSelecionado.nomeAgente ?? '',
        empresa: agenteSelecionado.empresa ?? '',
        tipoDocumento: uploadForm.tipoDocumento,
        descricao: uploadForm.descricao,
        observacao: uploadForm.observacao,
        arquivoNome: arquivoSelecionado.name,
        arquivoTipo: arquivoSelecionado.type,
        arquivoBase64: base64,
        tamanho: arquivoSelecionado.size,
      });
    };
    reader.readAsDataURL(arquivoSelecionado);
  }

  function confirmarExclusao(doc: any) {
    if (window.confirm(`Excluir o documento "${doc.arquivoNome}"?`)) {
      deletarMutation.mutate({ id: doc.id });
    }
  }

  const docsFiltrados = documentosAgente.filter(d =>
    !filtroTipoDoc || d.tipoDocumento === filtroTipoDoc
  );

  // ── VISÃO: Documentos do agente selecionado ──
  if (agenteSelecionado) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <PageHeader title="Documentação Agentes" />
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-blue-700 font-bold text-lg">{agenteSelecionado.chaveJ}</span>
                <span className="text-gray-800">—</span>
                <span className="font-semibold text-white text-lg">{agenteSelecionado.nomeAgente}</span>
                {agenteSelecionado.empresa && (
                  <span className="text-xs text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{agenteSelecionado.empresa}</span>
                )}
              </div>
              <p className="text-sm text-gray-800">Documentos do agente</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => { resetUploadForm(); setModalUpload(true); }}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800"
            >
              <Upload className="w-4 h-4" /> Adicionar Documento
            </Button>
            <Button
              size="sm"
              onClick={() => { setAgenteSelecionado(null); setFiltroTipoDoc(''); }}
              className="flex items-center gap-2 rounded-full font-semibold" style={{background:"linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%)",color:"#fff",border:"1.5px solid #3b82f6",boxShadow:"0 2px 12px rgba(59,130,246,0.35)"}}
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </div>
        </div>

        {/* Filtro tipo */}
        <div className="px-6 py-3 bg-gray-900 border-b border-gray-700 flex gap-3 items-center">
          <Select value={filtroTipoDoc || 'todos'} onValueChange={v => setFiltroTipoDoc(v === 'todos' ? '' : v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tipo de Documento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_DOCUMENTO.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-800">{docsFiltrados.length} documento(s)</span>
        </div>

        {/* Tabela de documentos */}
        <div className="px-6 py-4">
          <div className="bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold">Arquivo</th>
                    <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                    <th className="px-4 py-3 text-left font-semibold">Tamanho</th>
                    <th className="px-4 py-3 text-left font-semibold">Data</th>
                    <th className="px-4 py-3 text-center font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDocs ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-800">Carregando...</td></tr>
                  ) : docsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-gray-800">
                          <FolderOpen className="w-10 h-10" />
                          <p className="font-medium">Nenhum documento encontrado</p>
                          <p className="text-sm">Clique em "Adicionar Documento" para começar</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    docsFiltrados.map((doc, i) => (
                      <tr key={doc.id} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${CORES_TIPO[doc.tipoDocumento] ?? 'bg-gray-100 text-gray-800'}`}>
                            {doc.tipoDocumento}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.arquivoTipo ?? '')}
                            <span className="truncate max-w-[200px]" title={doc.arquivoNome ?? ''}>{doc.arquivoNome ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-800">{doc.descricao ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-800">{doc.tamanho ? formatBytes(doc.tamanho) : '—'}</td>
                        <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                          {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {doc.arquivoUrl && (
                              <Button size="sm" variant="outline" onClick={() => setDocVisualizar(doc)}
                                className="h-7 w-7 p-0 border-blue-300 text-blue-600 hover:bg-blue-900/30" title="Visualizar">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => confirmarExclusao(doc)}
                              className="h-7 w-7 p-0 border-red-300 text-red-600 hover:bg-red-50" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Upload */}
        <Dialog open={modalUpload} onOpenChange={(open) => { if (!open) { setModalUpload(false); resetUploadForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Adicionar Documento — {agenteSelecionado.nomeAgente}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Tipo de Documento <span className="text-red-500">*</span>
                </label>
                <Select value={uploadForm.tipoDocumento} onValueChange={v => setUploadForm(p => ({ ...p, tipoDocumento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Descrição</label>
                <Input placeholder="Ex: RG frente e verso..." value={uploadForm.descricao}
                  onChange={e => setUploadForm(p => ({ ...p, descricao: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Observação</label>
                <Input placeholder="Observações adicionais..." value={uploadForm.observacao}
                  onChange={e => setUploadForm(p => ({ ...p, observacao: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Arquivo <span className="text-red-500">*</span>
                  <span className="text-gray-800 font-normal ml-1">(PDF, JPG, PNG — máx. 10MB)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${arquivoSelecionado ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-900/30'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {arquivoSelecionado ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      {getFileIcon(arquivoSelecionado.type)}
                      <span className="font-medium truncate max-w-[200px]">{arquivoSelecionado.name}</span>
                      <span className="text-sm text-gray-800">({formatBytes(arquivoSelecionado.size)})</span>
                    </div>
                  ) : (
                    <div className="text-gray-800">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-800" />
                      <p className="text-sm">Clique para selecionar o arquivo</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  className="hidden" onChange={e => setArquivoSelecionado(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setModalUpload(false); resetUploadForm(); }}>Cancelar</Button>
              <Button onClick={handleUpload}
                disabled={uploadMutation.isPending || !uploadForm.tipoDocumento || !arquivoSelecionado}
                className="bg-blue-700 hover:bg-blue-800">
                {uploadMutation.isPending ? 'Enviando...' : 'Salvar Documento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Visualização */}
        <Dialog open={!!docVisualizar} onOpenChange={() => setDocVisualizar(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {docVisualizar && getFileIcon(docVisualizar.arquivoTipo ?? '')}
                {docVisualizar?.arquivoNome}
              </DialogTitle>
            </DialogHeader>
        {docVisualizar && (() => {
          const urlFinal = getUrlAssinadaQuery.data?.url ?? docVisualizar.arquivoUrl;
          const carregando = getUrlAssinadaQuery.isLoading;
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${CORES_TIPO[docVisualizar.tipoDocumento] ?? 'bg-gray-100 text-gray-800'}`}>
                  {docVisualizar.tipoDocumento}
                </span>
                {docVisualizar.descricao && <span className="text-gray-800">{docVisualizar.descricao}</span>}
              </div>
              <div className="border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ minHeight: 400 }}>
                {carregando ? (
                  <div className="text-center text-gray-800 py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p>Carregando arquivo...</p>
                  </div>
                ) : docVisualizar.arquivoTipo?.startsWith('image/') ? (
                  <img src={urlFinal} alt={docVisualizar.arquivoNome}
                    className="max-w-full max-h-[60vh] object-contain" />
                ) : docVisualizar.arquivoTipo === 'application/pdf' ? (
                  <iframe src={urlFinal} className="w-full" style={{ height: '60vh' }} title={docVisualizar.arquivoNome} />
                ) : (
                  <div className="text-center text-gray-800 py-8">
                    <File className="w-12 h-12 mx-auto mb-2" />
                    <p>Pré-visualização não disponível</p>
                    <a href={urlFinal} target="_blank" rel="noopener noreferrer"
                      className="mt-2 text-sm text-blue-600 hover:underline">Baixar arquivo</a>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-800">
                  {docVisualizar.createdAt ? new Date(docVisualizar.createdAt).toLocaleDateString('pt-BR') : '—'}
                </span>
                {!carregando && (
                  <a href={urlFinal} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Eye className="w-4 h-4" /> Abrir em nova aba
                  </a>
                )}
              </div>
            </div>
          );
        })()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── VISÃO: Lista de agentes ──
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader title="Documentação Agentes" />
      {/* Filtro */}
      <div className="px-6 py-3 bg-gray-900 border-b border-gray-700 flex gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800" />
          <Input
            placeholder="Buscar por Chave J ou Nome..."
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            className="pl-9"
          />
          {filtroBusca && (
            <button onClick={() => setFiltroBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-800" />
            </button>
          )}
        </div>
        <span className="text-sm text-gray-800">{agentesComDocs.length} agente(s)</span>
        <span className="text-xs text-gray-800">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />
          Com documentos
        </span>
      </div>

      {/* Tabela de agentes */}
      <div className="px-6 py-4">
        <div className="bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Chave J</th>
                  <th className="px-4 py-3 text-left font-semibold">Nome do Agente</th>
                  <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                  <th className="px-4 py-3 text-left font-semibold">Situação</th>
                  <th className="px-4 py-3 text-center font-semibold">Documentos</th>
                  <th className="px-4 py-3 text-center font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loadingAgentes ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-800">Carregando agentes...</td></tr>
                ) : agentesComDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-gray-800">
                        <Search className="w-10 h-10" />
                        <p className="font-medium">Nenhum agente encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  agentesComDocs.map((agente, i) => (
                    <tr
                      key={agente.chaveJ}
                      className={`cursor-pointer hover:bg-gray-800 transition-colors ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}
                      onClick={() => setAgenteSelecionado({ chaveJ: agente.chaveJ!, nomeAgente: agente.nomeAgente, empresa: agente.empresa })}
                    >
                      <td className="px-4 py-3 font-mono text-blue-700 font-semibold">{agente.chaveJ}</td>
                      <td className="px-4 py-3 font-medium">
                        <span className={agente.qtdDocumentos > 0 ? 'text-green-700 font-semibold' : 'text-white'}>
                          {agente.nomeAgente ?? '—'}
                        </span>
                        {agente.qtdDocumentos > 0 && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 align-middle" title="Tem documentos" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{agente.empresa ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-800">{agente.situacao ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {agente.qtdDocumentos > 0 ? (
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                            {agente.qtdDocumentos} doc{agente.qtdDocumentos !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-800 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ChevronRight className="w-4 h-4 text-gray-800 mx-auto" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
