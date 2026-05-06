import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Upload } from 'lucide-react';
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
  const { data: registros = [], isLoading } = trpc.relatorioBB.listar.useQuery();
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
      toast.success(`${r.count} registros importados!`);
      utils.relatorioBB.listar.invalidate();
    },
    onError: (e) => toast.error('Erro na importação: ' + e.message),
  });

  const utils = trpc.useUtils();

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

      importar.mutate(normalized);
    } catch (error) {
      toast.error('Erro ao ler arquivo: ' + (error as Error).message);
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
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              Selecionar Arquivo
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={importar.isPending}
                className="hidden"
              />
            </label>
            {importar.isPending && <span className="text-gray-600">Importando...</span>}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
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
