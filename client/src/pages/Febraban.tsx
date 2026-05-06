import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Download, Edit2, Trash2, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';

type RelatorioBB = {
  id: number;
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
  const [tabelaCriada, setTabelaCriada] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<RelatorioBB>>({});
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
    },
    onError: (e) => toast.error('Erro na importação: ' + e.message),
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Normalizar nomes de colunas
      const normalized = data.map((row) => ({
        bmf: row['BMF'] || row['bmf'],
        mes: row['Mês'] || row['mes'] || row['MÊS'],
        proposta: row['PROPOSTA'] || row['proposta'],
        linha: row['LINHA'] || row['linha'],
        situacao: row['SITUAÇÃO'] || row['situacao'] || row['SITUACAO'],
        operador: row['OPERADOR'] || row['operador'],
        solicitacao: row['SOLICITAÇÃO'] || row['solicitacao'] || row['SOLICITACAO'],
        prazo: row['PRAZO'] || row['prazo'],
      }));

      if (modoImportacao === 'replace') {
        importar.mutate(normalized);
      } else {
        // Para append, precisamos manter dados antigos
        const dadosAntigos = registros.map(r => ({
          bmf: r.bmf,
          mes: r.mes,
          proposta: r.proposta,
          linha: r.linha,
          situacao: r.situacao,
          operador: r.operador,
          solicitacao: r.solicitacao,
          prazo: r.prazo,
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
        'SOLICITAÇÃO': new Date('2026-01-02'),
        PRAZO: '1meses',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, 'template_relatorio_bb.xlsx');
    toast.success('Template baixado!');
  };

  const editar = trpc.relatorioBB.editar.useMutation({
    onSuccess: () => {
      toast.success('Registro atualizado!');
      refetch();
      setEditandoId(null);
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

  const handleEdit = (registro: RelatorioBB) => {
    setEditandoId(registro.id);
    setEditData(registro);
  };

  const handleSaveEdit = () => {
    if (editandoId) {
      const data = {
        id: editandoId,
        bmf: editData.bmf || undefined,
        mes: editData.mes || undefined,
        proposta: editData.proposta || undefined,
        linha: editData.linha || undefined,
        situacao: editData.situacao || undefined,
        operador: editData.operador || undefined,
        solicitacao: editData.solicitacao ? (typeof editData.solicitacao === 'string' ? editData.solicitacao : new Date(editData.solicitacao).toISOString().split('T')[0]) : undefined,
        prazo: editData.prazo || undefined,
      };
      editar.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja deletar este registro?')) {
      deletar.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation('/')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Febraban - Relatório BB</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Importar Relatório</h2>
          
          <div className="space-y-4">
            {/* Modo de Importação */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="replace"
                  checked={modoImportacao === 'replace'}
                  onChange={(e) => setModoImportacao(e.target.value as 'replace' | 'append')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Substituir dados existentes</span>
              </label>
              <label className="flex items-center gap-2">
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

            {/* Botões */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                Importar Arquivo
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={importar.isPending}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Baixar Template
              </button>

              {importar.isPending && <span className="text-gray-600">Importando...</span>}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Registros ({registros.length})</h2>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-gray-600">Carregando...</div>
          ) : registros.length === 0 ? (
            <div className="p-6 text-center text-gray-600">Nenhum registro importado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">BMF</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Mês</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Proposta</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Linha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Situação</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Operador</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Solicitação</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Prazo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {editandoId ? (
                    <tr className="bg-yellow-50">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-4 gap-4">
                          <input
                            type="text"
                            placeholder="BMF"
                            value={editData.bmf || ''}
                            onChange={(e) => setEditData({ ...editData, bmf: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="number"
                            placeholder="Mês"
                            value={editData.mes || ''}
                            onChange={(e) => setEditData({ ...editData, mes: parseInt(e.target.value) })}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Proposta"
                            value={editData.proposta || ''}
                            onChange={(e) => setEditData({ ...editData, proposta: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Linha"
                            value={editData.linha || ''}
                            onChange={(e) => setEditData({ ...editData, linha: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Situação"
                            value={editData.situacao || ''}
                            onChange={(e) => setEditData({ ...editData, situacao: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Operador"
                            value={editData.operador || ''}
                            onChange={(e) => setEditData({ ...editData, operador: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="date"
                            value={editData.solicitacao ? new Date(editData.solicitacao).toISOString().split('T')[0] : ''}
                            onChange={(e) => setEditData({ ...editData, solicitacao: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Prazo"
                            value={editData.prazo || ''}
                            onChange={(e) => setEditData({ ...editData, prazo: e.target.value })}
                            className="px-2 py-1 border rounded"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {registros.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{r.bmf || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.mes || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.proposta || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.linha || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.situacao || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.operador || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {r.solicitacao
                          ? new Date(r.solicitacao).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.prazo || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
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
