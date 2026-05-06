import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Download, Edit2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

type RelatorioBB = {
  id?: number;
  bmf?: string | null;
  mes?: number | null;
  proposta?: string | null;
  linha?: string | null;
  situacao?: string | null;
  operador?: string | null;
  solicitacao?: string | Date | null;
  prazo?: string | null;
};

export default function Febraban() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<RelatorioBB>({
    bmf: '',
    mes: undefined,
    proposta: '',
    linha: '',
    situacao: '',
    operador: '',
    solicitacao: '',
    prazo: '',
  });

  const [tabelaCriada, setTabelaCriada] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modoImportacao, setModoImportacao] = useState<'replace' | 'append'>('replace');

  const { data: registros = [], isLoading, refetch } = trpc.relatorioBB.listar.useQuery();
  const criarTabela = trpc.relatorioBB.criarTabela.useMutation();

  useEffect(() => {
    if (!tabelaCriada) {
      criarTabela.mutate(undefined, {
        onSuccess: () => setTabelaCriada(true),
      });
    }
  }, []);

  const importar = trpc.relatorioBB.importar.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.count} registros ${modoImportacao === 'append' ? 'adicionados' : 'importados'}!`);
      refetch();
      setModoImportacao('replace');
      handleLimpar();
    },
    onError: (e) => toast.error('Erro na importação: ' + e.message),
  });

  const editar = trpc.relatorioBB.editar.useMutation({
    onSuccess: () => {
      toast.success('Registro atualizado!');
      refetch();
      setEditandoId(null);
      handleLimpar();
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const deletar = trpc.relatorioBB.deletar.useMutation({
    onSuccess: () => {
      toast.success('Registro deletado!');
      refetch();
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'mes' ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Normalizar nomes de colunas
      const normalized = data.map((row) => ({
        bmf: row['BMF'] || row['bmf'] || '',
        mes: row['Mês'] || row['mes'] || row['MÊS'] || undefined,
        proposta: row['PROPOSTA'] || row['proposta'] || '',
        linha: row['LINHA'] || row['linha'] || '',
        situacao: row['SITUAÇÃO'] || row['situacao'] || row['SITUACAO'] || '',
        operador: row['OPERADOR'] || row['operador'] || '',
        solicitacao: row['SOLICITAÇÃO'] || row['solicitacao'] || row['SOLICITACAO'] || '',
        prazo: row['PRAZO'] || row['prazo'] || '',
      }));

      if (normalized.length === 0) {
        toast.error('Nenhum dado encontrado no arquivo');
        return;
      }

      if (modoImportacao === 'replace') {
        importar.mutate(normalized);
      } else {
        // Para append, manter dados antigos
        const dadosAntigos = registros.map(r => ({
          bmf: r.bmf || '',
          mes: r.mes || undefined,
          proposta: r.proposta || '',
          linha: r.linha || '',
          situacao: r.situacao || '',
          operador: r.operador || '',
          solicitacao: r.solicitacao || '',
          prazo: r.prazo || '',
        }));
        importar.mutate([...dadosAntigos, ...normalized]);
      }
    } catch (error) {
      toast.error('Erro ao ler arquivo: ' + (error as Error).message);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        BMF: 'BMF',
        'Mês': 126,
        PROPOSTA: '196088597',
        LINHA: '3100',
        'SITUAÇÃO': 'Contratada',
        OPERADOR: 'J9663101',
        'SOLICITAÇÃO': '2026-01-02',
        PRAZO: '1 mês',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, 'template_relatorio_bb.xlsx');
    toast.success('Template baixado!');
  };

  const handleEdit = (registro: RelatorioBB) => {
    setEditandoId(registro.id || null);
    setFormData(registro);
  };

  const handleSaveEdit = () => {
    if (editandoId) {
      editar.mutate({
        id: editandoId,
        bmf: formData.bmf || undefined,
        mes: formData.mes || undefined,
        proposta: formData.proposta || undefined,
        linha: formData.linha || undefined,
        situacao: formData.situacao || undefined,
        operador: formData.operador || undefined,
        solicitacao: formData.solicitacao ? (typeof formData.solicitacao === 'string' ? formData.solicitacao : new Date(formData.solicitacao).toISOString().split('T')[0]) : undefined,
        prazo: formData.prazo || undefined,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja deletar este registro?')) {
      deletar.mutate({ id });
    }
  };

  const handleLimpar = () => {
    setFormData({
      bmf: '',
      mes: undefined,
      proposta: '',
      linha: '',
      situacao: '',
      operador: '',
      solicitacao: '',
      prazo: '',
    });
    setEditandoId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation('/febraban')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Febraban - Relatório BB</h1>
            <p className="text-sm text-gray-600">Regulamentações e conformidade Febraban</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Dados de Entrada */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados de Entrada</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">BMF</label>
              <Input
                name="bmf"
                value={formData.bmf || ''}
                onChange={handleInputChange}
                placeholder="Ex: 426"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
              <Input
                name="mes"
                type="number"
                value={formData.mes || ''}
                onChange={handleInputChange}
                placeholder="Ex: 126"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proposta</label>
              <Input
                name="proposta"
                value={formData.proposta || ''}
                onChange={handleInputChange}
                placeholder="Ex: 196088597"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Linha</label>
              <Input
                name="linha"
                value={formData.linha || ''}
                onChange={handleInputChange}
                placeholder="Ex: 3100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Situação</label>
              <Input
                name="situacao"
                value={formData.situacao || ''}
                onChange={handleInputChange}
                placeholder="Ex: Contratada"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operador</label>
              <Input
                name="operador"
                value={formData.operador || ''}
                onChange={handleInputChange}
                placeholder="Ex: J9663101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Solicitação</label>
              <Input
                name="solicitacao"
                type="date"
                value={formData.solicitacao ? (typeof formData.solicitacao === 'string' ? formData.solicitacao : new Date(formData.solicitacao).toISOString().split('T')[0]) : ''}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prazo</label>
              <Input
                name="prazo"
                value={formData.prazo || ''}
                onChange={handleInputChange}
                placeholder="Ex: 1 mês"
              />
            </div>
          </div>

          {/* Modo de Importação */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">Modo de Importação</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="replace"
                  checked={modoImportacao === 'replace'}
                  onChange={(e) => setModoImportacao(e.target.value as 'replace' | 'append')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Substituir dados existentes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="append"
                  checked={modoImportacao === 'append'}
                  onChange={(e) => setModoImportacao(e.target.value as 'replace' | 'append')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Adicionar aos dados existentes</span>
              </label>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                onClick={(e) => (e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Arquivo
              </Button>
            </label>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Template
            </Button>
            {editandoId && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSaveEdit}
                >
                  Salvar Edição
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLimpar}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Registros */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Registros ({registros.length})
          </h2>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : registros.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum registro importado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">BMF</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Mês</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Proposta</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Linha</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Situação</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Operador</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Solicitação</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Prazo</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro, idx) => (
                    <tr key={registro.id || idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{registro.bmf || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{registro.mes || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{registro.proposta || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{registro.linha || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{registro.situacao || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{registro.operador || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {registro.solicitacao ? (typeof registro.solicitacao === 'string' ? registro.solicitacao : new Date(registro.solicitacao).toLocaleDateString('pt-BR')) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{registro.prazo || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(registro)}
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(registro.id || 0)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
