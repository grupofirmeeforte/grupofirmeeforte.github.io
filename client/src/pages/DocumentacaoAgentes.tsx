import { useState, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, Eye, Search, X, FileText, Image, File } from 'lucide-react';
import { useLocation } from 'wouter';

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
  'Outros': 'bg-gray-100 text-gray-800',
};

function formatBytes(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(tipo: string) {
  if (tipo?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (tipo === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

export default function DocumentacaoAgentes() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Filtros
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Modal upload
  const [modalUpload, setModalUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    chaveJ: '',
    nomeAgente: '',
    empresa: '',
    tipoDocumento: '',
    descricao: '',
    observacao: '',
  });
  const [buscaAgente, setBuscaAgente] = useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal visualização
  const [docVisualizar, setDocVisualizar] = useState<any>(null);

  // Queries
  const { data: documentos = [], isLoading } = trpc.documentosAgentes.listar.useQuery({
    chaveJ: filtroBusca || undefined,
    nomeAgente: filtroBusca || undefined,
    tipoDocumento: filtroTipo || undefined,
  });

  const { data: agentesLista = [] } = trpc.documentosAgentes.buscarAgentes.useQuery(
    { busca: buscaAgente },
    { enabled: modalUpload } // carrega todos quando modal abre
  );

  // Filtrar sugestões localmente para resposta imediata
  const sugestoesFiltradas = agentesLista.filter(a => {
    if (!buscaAgente.trim()) return true;
    const b = buscaAgente.toLowerCase();
    return (a.chaveJ ?? '').toLowerCase().includes(b) || (a.nomeAgente ?? '').toLowerCase().includes(b);
  }).slice(0, 100);

  // Mutations
  const uploadMutation = trpc.documentosAgentes.upload.useMutation({
    onSuccess: () => {
      utils.documentosAgentes.listar.invalidate();
      toast.success('Documento enviado com sucesso!');
      setModalUpload(false);
      resetUploadForm();
    },
    onError: (e) => toast.error('Erro ao enviar documento: ' + e.message),
  });

  const deletarMutation = trpc.documentosAgentes.deletar.useMutation({
    onSuccess: () => {
      utils.documentosAgentes.listar.invalidate();
      toast.success('Documento excluído!');
    },
    onError: (e) => toast.error('Erro ao excluir: ' + e.message),
  });

  function resetUploadForm() {
    setUploadForm({ chaveJ: '', nomeAgente: '', empresa: '', tipoDocumento: '', descricao: '', observacao: '' });
    setBuscaAgente('');
    setArquivoSelecionado(null);
    setMostrarSugestoes(false);
  }

  function selecionarAgente(agente: { chaveJ: string | null; nomeAgente: string | null; empresa: string | null }) {
    setUploadForm(prev => ({
      ...prev,
      chaveJ: agente.chaveJ ?? '',
      nomeAgente: agente.nomeAgente ?? '',
      empresa: agente.empresa ?? '',
    }));
    setBuscaAgente(`${agente.chaveJ} — ${agente.nomeAgente}`);
    setMostrarSugestoes(false);
  }

  async function handleUpload() {
    if (!uploadForm.chaveJ) { toast.error('Selecione um agente'); return; }
    if (!uploadForm.tipoDocumento) { toast.error('Selecione o tipo de documento'); return; }
    if (!arquivoSelecionado) { toast.error('Selecione um arquivo'); return; }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (arquivoSelecionado.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      uploadMutation.mutate({
        ...uploadForm,
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

  // Filtrar localmente por busca (chaveJ ou nome)
  const docsFiltrados = documentos.filter(d => {
    const b = filtroBusca.toLowerCase();
    if (!b) return true;
    return (d.chaveJ ?? '').toLowerCase().includes(b) || (d.nomeAgente ?? '').toLowerCase().includes(b);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation('/cadastro')}
            className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 border-gray-800"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Documentação Agentes</h1>
            <p className="text-sm text-gray-500">Cópias de documentos por agente</p>
          </div>
        </div>
        <Button
          onClick={() => { resetUploadForm(); setModalUpload(true); }}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800"
        >
          <Upload className="w-4 h-4" /> Adicionar Documento
        </Button>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 bg-white border-b flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por Chave J ou Nome..."
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            className="pl-9"
          />
          {filtroBusca && (
            <button onClick={() => setFiltroBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <Select value={filtroTipo || 'todos'} onValueChange={v => setFiltroTipo(v === 'todos' ? '' : v)}>
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
        <span className="text-sm text-gray-500">{docsFiltrados.length} documento(s)</span>
      </div>

      {/* Tabela */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Chave J</th>
                  <th className="px-4 py-3 text-left font-semibold">Nome do Agente</th>
                  <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Arquivo</th>
                  <th className="px-4 py-3 text-left font-semibold">Tamanho</th>
                  <th className="px-4 py-3 text-left font-semibold">Adicionado por</th>
                  <th className="px-4 py-3 text-left font-semibold">Data</th>
                  <th className="px-4 py-3 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-500">Carregando...</td></tr>
                ) : docsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <FileText className="w-10 h-10" />
                        <p className="font-medium">Nenhum documento encontrado</p>
                        <p className="text-sm">Clique em "Adicionar Documento" para começar</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  docsFiltrados.map((doc, i) => (
                    <tr key={doc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                      <td className="px-4 py-3 font-mono text-blue-700 font-semibold">{doc.chaveJ}</td>
                      <td className="px-4 py-3 font-medium">{doc.nomeAgente ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.empresa ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${CORES_TIPO[doc.tipoDocumento] ?? 'bg-gray-100 text-gray-700'}`}>
                          {doc.tipoDocumento}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.arquivoTipo ?? '')}
                          <span className="truncate max-w-[160px]" title={doc.arquivoNome ?? ''}>
                            {doc.arquivoNome ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{doc.tamanho ? formatBytes(doc.tamanho) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.adicionadoPor ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {doc.arquivoUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDocVisualizar(doc)}
                              className="h-7 w-7 p-0 border-blue-300 text-blue-600 hover:bg-blue-50"
                              title="Visualizar"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmarExclusao(doc)}
                            className="h-7 w-7 p-0 border-red-300 text-red-600 hover:bg-red-50"
                            title="Excluir"
                          >
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
              Adicionar Documento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Busca de agente */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agente <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Digite Chave J ou Nome do agente..."
                  value={buscaAgente}
                  onChange={e => { setBuscaAgente(e.target.value); setMostrarSugestoes(true); setUploadForm(p => ({ ...p, chaveJ: '', nomeAgente: '', empresa: '' })); }}
                  onFocus={() => setMostrarSugestoes(true)}
                  className="pl-9"
                />
              </div>
              {mostrarSugestoes && !uploadForm.chaveJ && sugestoesFiltradas.length > 0 && (
                <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {sugestoesFiltradas.map(a => (
                    <button
                      key={a.chaveJ}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 text-sm"
                      onMouseDown={() => selecionarAgente(a)}
                    >
                      <span className="font-mono text-blue-700 font-semibold">{a.chaveJ}</span>
                      <span className="text-gray-700">{a.nomeAgente}</span>
                      {a.empresa && <span className="text-gray-400 text-xs ml-auto">{a.empresa}</span>}
                    </button>
                  ))}
                </div>
              )}
              {uploadForm.chaveJ && (
                <div className="mt-1 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                  <span className="font-mono font-semibold">{uploadForm.chaveJ}</span>
                  <span>—</span>
                  <span>{uploadForm.nomeAgente}</span>
                  {uploadForm.empresa && <span className="text-gray-500 text-xs">({uploadForm.empresa})</span>}
                </div>
              )}
            </div>

            {/* Tipo de documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento <span className="text-red-500">*</span>
              </label>
              <Select value={uploadForm.tipoDocumento} onValueChange={v => setUploadForm(p => ({ ...p, tipoDocumento: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <Input
                placeholder="Ex: RG frente e verso, Contrato 2026..."
                value={uploadForm.descricao}
                onChange={e => setUploadForm(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>

            {/* Observação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
              <Input
                placeholder="Observações adicionais..."
                value={uploadForm.observacao}
                onChange={e => setUploadForm(p => ({ ...p, observacao: e.target.value }))}
              />
            </div>

            {/* Arquivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arquivo <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(PDF, JPG, PNG — máx. 10MB)</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${arquivoSelecionado ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {arquivoSelecionado ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    {getFileIcon(arquivoSelecionado.type)}
                    <span className="font-medium truncate max-w-[200px]">{arquivoSelecionado.name}</span>
                    <span className="text-sm text-gray-500">({formatBytes(arquivoSelecionado.size)})</span>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Clique para selecionar o arquivo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                className="hidden"
                onChange={e => setArquivoSelecionado(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalUpload(false); resetUploadForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !uploadForm.chaveJ || !uploadForm.tipoDocumento || !arquivoSelecionado}
              className="bg-blue-700 hover:bg-blue-800"
            >
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
          {docVisualizar && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded font-mono font-semibold">{docVisualizar.chaveJ}</span>
                <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded">{docVisualizar.nomeAgente}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${CORES_TIPO[docVisualizar.tipoDocumento] ?? 'bg-gray-100 text-gray-700'}`}>
                  {docVisualizar.tipoDocumento}
                </span>
                {docVisualizar.descricao && <span className="text-gray-500">{docVisualizar.descricao}</span>}
              </div>
              <div className="border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ minHeight: 400 }}>
                {docVisualizar.arquivoTipo?.startsWith('image/') ? (
                  <img
                    src={docVisualizar.arquivoUrl}
                    alt={docVisualizar.arquivoNome}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                ) : docVisualizar.arquivoTipo === 'application/pdf' ? (
                  <iframe
                    src={docVisualizar.arquivoUrl}
                    className="w-full"
                    style={{ height: '60vh' }}
                    title={docVisualizar.arquivoNome}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <File className="w-12 h-12 mx-auto mb-2" />
                    <p>Pré-visualização não disponível</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Adicionado por: {docVisualizar.adicionadoPor ?? '—'} em {docVisualizar.createdAt ? new Date(docVisualizar.createdAt).toLocaleDateString('pt-BR') : '—'}
                </span>
                <a
                  href={docVisualizar.arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" /> Abrir em nova aba
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
