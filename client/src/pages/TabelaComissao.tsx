import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

type TabelaRow = {
  id: number;
  empresa: string | null;
  faixa1: string | null; faixa2: string | null; faixa3: string | null;
  faixa4: string | null; faixa5: string | null;
  tabelaCalculo: string | null; referencia: string | null;
  convenio: string | null;
  txJurosDe: string | null; txJurosAte: string | null;
  valorMinimo: string | null;
  mesesDe: string | null; mesesAte: string | null;
  ativo01: string | null; ativo02: string | null; ativo03: string | null;
  ativo04: string | null; ativo05: string | null; ativo06: string | null;
  ativo07: string | null; ativo08: string | null;
  ativo09?: string | null; ativo10?: string | null;
};

type FormData = {
  empresa?: string; faixa1?: string; faixa2?: string; faixa3?: string;
  faixa4?: string; faixa5?: string; tabelaCalculo?: string; referencia?: string;
  convenio?: string; txJurosDe?: string; txJurosAte?: string; valorMinimo?: string;
  mesesDe?: string; mesesAte?: string;
  ativo01?: string; ativo02?: string; ativo03?: string; ativo04?: string;
  ativo05?: string; ativo06?: string; ativo07?: string; ativo08?: string;
  ativo09?: string; ativo10?: string;
};

const EMPTY_FORM: FormData = {};

function pct(val: string | null) {
  if (!val) return '-';
  const normalized = String(val).replace(',', '.');
  const n = parseFloat(normalized);
  if (isNaN(n)) return val;
  const pctVal = n > 1 ? n : n * 100;
  return pctVal.toFixed(2).replace('.', ',') + '%';
}

function moeda(val: string | null | undefined) {
  if (!val) return 'R$ 0,00';
  const normalized = String(val).replace(',', '.');
  const n = parseFloat(normalized);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// Componente de célula editável
function EditableCell({
  value,
  onSave,
  isSaving,
  format = 'text',
}: {
  value: string | null;
  onSave: (newValue: string) => void;
  isSaving: boolean;
  format?: 'text' | 'number' | 'percent';
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const handleSave = () => {
    if (tempValue !== value) {
      onSave(tempValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        type={format === 'number' ? 'number' : 'text'}
        step={format === 'number' ? '0.01' : undefined}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="w-full px-2 py-1 border border-blue-400 rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  const displayValue = format === 'percent' ? pct(value) : (value || '-');

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer px-2 py-1 rounded hover:bg-blue-100 transition-colors"
      title="Clique para editar"
    >
      {displayValue}
    </div>
  );
}

export default function TabelaComissao() {
  const [, setLocation] = useLocation();
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroConvenio, setFiltroConvenio] = useState('');
  const [busca, setBusca] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [valoresAtivos, setValoresAtivos] = useState<Record<string, string>>({
    'Ativo01': '',
    'Ativo02': '',
    'Ativo03': '',
    'Ativo04': '',
    'Ativo05': '',
    'Ativo06': '',
    'Ativo07': '',
    'Ativo08': '',
    'Ativo09': '',
    'Ativo10': '',
  });
  const [editingValor, setEditingValor] = useState<string | null>(null);
  const [tempValueValor, setTempValueValor] = useState<string>('');

  const utils = trpc.useUtils();

  const { data: rows = [], isLoading } = trpc.tabelaComissao.listar.useQuery({
    empresa: filtroEmpresa || undefined,
    convenio: filtroConvenio || undefined,
  });

  const { data: empresas = [] } = trpc.tabelaComissao.listarEmpresas.useQuery();
  const { data: convenios = [] } = trpc.tabelaComissao.listarConvenios.useQuery();

  // Carregar valores do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem('valoresAtivos');
    if (saved) {
      try {
        setValoresAtivos(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar valores:', e);
      }
    }
  }, []);

  const salvarValoresLocalmente = (valores: Record<string, string>) => {
    localStorage.setItem('valoresAtivos', JSON.stringify(valores));
    toast.success('Valores salvos!');
  };

  const criarMutation = trpc.tabelaComissao.criar.useMutation({
    onSuccess: () => {
      utils.tabelaComissao.listar.invalidate();
      utils.tabelaComissao.listarEmpresas.invalidate();
      utils.tabelaComissao.listarConvenios.invalidate();
      setModalOpen(false);
      toast.success('Registro criado com sucesso!');
    },
    onError: (e) => toast.error('Erro ao criar: ' + e.message),
  });

  const atualizarMutation = trpc.tabelaComissao.atualizar.useMutation({
    onSuccess: () => {
      utils.tabelaComissao.listar.invalidate();
      setSavingCell(null);
      setModalOpen(false);
      toast.success('Registro atualizado com sucesso!');
    },
    onError: (e) => {
      toast.error('Erro ao atualizar: ' + e.message);
      setSavingCell(null);
    },
  });

  const excluirMutation = trpc.tabelaComissao.excluir.useMutation({
    onSuccess: () => {
      utils.tabelaComissao.listar.invalidate();
      utils.tabelaComissao.listarEmpresas.invalidate();
      utils.tabelaComissao.listarConvenios.invalidate();
      setDeleteId(null);
      toast.success('Registro excluído com sucesso!');
    },
    onError: (e) => toast.error('Erro ao excluir: ' + e.message),
  });

  const filteredRows = useMemo(() => {
    if (!busca.trim()) return rows;
    const q = busca.toLowerCase();
    return rows.filter(r =>
      (r.empresa || '').toLowerCase().includes(q) ||
      (r.convenio || '').toLowerCase().includes(q) ||
      (r.txJurosDe || '').includes(q) ||
      (r.mesesDe || '').includes(q) ||
      (r.mesesAte || '').includes(q)
    );
  }, [rows, busca]);

  function openNovo() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditar(row: TabelaRow) {
    setEditingId(row.id);
    const f: FormData = {};
    Object.entries(row).forEach(([k, v]) => {
      if (k !== 'id') (f as Record<string, string>)[k] = v != null ? String(v) : '';
    });
    setForm(f);
    setModalOpen(true);
  }

  function handleSalvar() {
    const data: FormData = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? undefined : v])
    );

    if (editingId !== null) {
      atualizarMutation.mutate({ id: editingId, ...data });
    } else {
      criarMutation.mutate(data);
    }
  }

  function setField(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Função para salvar célula individual
  function handleCellSave(rowId: number, field: keyof TabelaRow, newValue: string) {
    setSavingCell(`${rowId}-${field}`);
    const cleanValue = newValue === '' ? undefined : newValue;
    atualizarMutation.mutate({ id: rowId, [field]: cleanValue } as any);
  }

  const isSaving = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Tabela de Comissão</h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredRows.length} registros
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setLocation('/')} className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-900 border-gray-800">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button onClick={openNovo} className="flex items-center gap-2" style={{ backgroundColor: '#002776' }}>
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </div>
        </div>
      </div>

      {/* Valores para Cálculo por Nível - Editáveis Inline */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-blue-900 block">Valores para Cálculo por Nível:</label>
            <Button
              onClick={() => {
                const dadosAtualizar: Record<string, string> = {};
                Object.keys(valoresAtivos).forEach(nivel => {
                  dadosAtualizar[nivel.toLowerCase()] = valoresAtivos[nivel];
                });
                salvarValoresLocalmente(valoresAtivos);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded"
            >
              💾 Salvar Tudo
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Object.keys(valoresAtivos).map((nivel) => (
              <div key={nivel}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{nivel.replace('Ativo', 'Ativo ')}</label>
                {editingValor === nivel ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      value={tempValueValor}
                      onChange={(e) => setTempValueValor(e.target.value)}
                      onBlur={() => {
                        setValoresAtivos({...valoresAtivos, [nivel]: tempValueValor});
                        const dadosAtualizar: Record<string, string> = {};
                        dadosAtualizar[nivel.toLowerCase()] = tempValueValor;
                        salvarValoresLocalmente(valoresAtivos);
                        setEditingValor(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setValoresAtivos({...valoresAtivos, [nivel]: tempValueValor});
                          const dadosAtualizar: Record<string, string> = {};
                          dadosAtualizar[nivel.toLowerCase()] = tempValueValor;
                          salvarValoresLocalmente(valoresAtivos);
                          setEditingValor(null);
                        } else if (e.key === 'Escape') {
                          setEditingValor(null);
                        }
                      }}
                      className="flex-1 px-2 py-1.5 border border-blue-400 rounded bg-white text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingValor(nivel);
                      setTempValueValor(valoresAtivos[nivel]);
                    }}
                    className="px-2 py-1.5 border border-gray-300 rounded bg-white text-right text-sm cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all"
                    title="Clique para editar"
                  >
                    {moeda(valoresAtivos[nivel])}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por empresa, convênio, juros..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="max-w-xs"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Select value={filtroEmpresa || '__all__'} onValueChange={v => setFiltroEmpresa(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {empresas.map(e => (
                <SelectItem key={e!} value={e!}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroConvenio || '__all__'} onValueChange={v => setFiltroConvenio(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Convênio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {convenios.map(c => (
                <SelectItem key={c!} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filtroEmpresa || filtroConvenio) && (
            <Button variant="ghost" size="sm" onClick={() => { setFiltroEmpresa(''); setFiltroConvenio(''); }}>
              <X className="w-4 h-4 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-6 py-2 bg-blue-50 border-b text-xs text-blue-700">
        💡 Clique em qualquer célula para editar. Pressione Enter para salvar ou Escape para cancelar.
      </div>

      {/* Tabela */}
      <div className="px-6 py-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{background: 'linear-gradient(90deg, #002776 0%, #003d99 40%, #0055cc 70%, #1a6ed8 100%)'}} className="text-white">
                  <th className="px-3 py-2.5 text-left whitespace-nowrap font-semibold tracking-wide">Empresa</th>
                  <th className="px-3 py-2.5 text-left whitespace-nowrap font-semibold tracking-wide">Convênio</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide">Tx Juros De</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide">Tx Juros Até</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide">Valor Mín.</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide">Meses De</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide">Meses Até</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.08)'}}>Ativo 01</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.08)'}}>Ativo 02</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.08)'}}>Ativo 03</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.08)'}}>Ativo 04</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.12)'}}>Ativo 05</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.12)'}}>Ativo 06</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.12)'}}>Ativo 07</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.12)'}}>Ativo 08</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.16)'}}>Ativo 09</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.16)'}}>Ativo 10</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={18} className="text-center py-8 text-gray-500">Carregando...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="text-center py-8 text-gray-500">Nenhum registro encontrado</td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/50 transition-colors' : 'bg-gradient-to-r from-blue-50/70 to-indigo-50/50 hover:from-blue-100/70 hover:to-indigo-100/50 transition-colors'}>
                      <td className="px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">
                        <EditableCell
                          value={row.empresa}
                          onSave={(v) => handleCellSave(row.id, 'empresa', v)}
                          isSaving={savingCell === `${row.id}-empresa`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[180px] truncate">
                        <EditableCell
                          value={row.convenio}
                          onSave={(v) => handleCellSave(row.id, 'convenio', v)}
                          isSaving={savingCell === `${row.id}-convenio`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">
                        <EditableCell
                          value={row.txJurosDe}
                          onSave={(v) => handleCellSave(row.id, 'txJurosDe', v)}
                          isSaving={savingCell === `${row.id}-txJurosDe`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">
                        <EditableCell
                          value={row.txJurosAte}
                          onSave={(v) => handleCellSave(row.id, 'txJurosAte', v)}
                          isSaving={savingCell === `${row.id}-txJurosAte`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">
                        <EditableCell
                          value={row.valorMinimo}
                          onSave={(v) => handleCellSave(row.id, 'valorMinimo', v)}
                          isSaving={savingCell === `${row.id}-valorMinimo`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">
                        <EditableCell
                          value={row.mesesDe}
                          onSave={(v) => handleCellSave(row.id, 'mesesDe', v)}
                          isSaving={savingCell === `${row.id}-mesesDe`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.mesesAte}
                          onSave={(v) => handleCellSave(row.id, 'mesesAte', v)}
                          isSaving={savingCell === `${row.id}-mesesAte`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo01}
                          onSave={(v) => handleCellSave(row.id, 'ativo01', v)}
                          isSaving={savingCell === `${row.id}-ativo01`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo02}
                          onSave={(v) => handleCellSave(row.id, 'ativo02', v)}
                          isSaving={savingCell === `${row.id}-ativo02`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo03}
                          onSave={(v) => handleCellSave(row.id, 'ativo03', v)}
                          isSaving={savingCell === `${row.id}-ativo03`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo04}
                          onSave={(v) => handleCellSave(row.id, 'ativo04', v)}
                          isSaving={savingCell === `${row.id}-ativo04`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo05}
                          onSave={(v) => handleCellSave(row.id, 'ativo05', v)}
                          isSaving={savingCell === `${row.id}-ativo05`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo06}
                          onSave={(v) => handleCellSave(row.id, 'ativo06', v)}
                          isSaving={savingCell === `${row.id}-ativo06`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo07}
                          onSave={(v) => handleCellSave(row.id, 'ativo07', v)}
                          isSaving={savingCell === `${row.id}-ativo07`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">
                        <EditableCell
                          value={row.ativo08}
                          onSave={(v) => handleCellSave(row.id, 'ativo08', v)}
                          isSaving={savingCell === `${row.id}-ativo08`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                        <EditableCell
                          value={(row as any).ativo09}
                          onSave={(v) => handleCellSave(row.id, 'ativo09' as any, v)}
                          isSaving={savingCell === `${row.id}-ativo09`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                        <EditableCell
                          value={(row as any).ativo10}
                          onSave={(v) => handleCellSave(row.id, 'ativo10' as any, v)}
                          isSaving={savingCell === `${row.id}-ativo10`}
                          format="percent"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => openEditar(row as TabelaRow)}
                            title="Editar tudo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteId(row.id)}
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
        </Card>
      </div>

      {/* Modal Editar/Criar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Empresa</label>
              <Input value={form.empresa || ''} onChange={e => setField('empresa', e.target.value)} placeholder="BMF, FLEX..." />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Convênio</label>
              <Input value={form.convenio || ''} onChange={e => setField('convenio', e.target.value)} placeholder="CONSIGNADO INSS, FEDERAL..." />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tx Juros De</label>
              <Input value={form.txJurosDe || ''} onChange={e => setField('txJurosDe', e.target.value)} placeholder="0.0185" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tx Juros Até</label>
              <Input value={form.txJurosAte || ''} onChange={e => setField('txJurosAte', e.target.value)} placeholder="acima ou 0.0199" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Valor Mínimo</label>
              <Input value={form.valorMinimo || ''} onChange={e => setField('valorMinimo', e.target.value)} placeholder=">=$1.000,00" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Meses De</label>
              <Input value={form.mesesDe || ''} onChange={e => setField('mesesDe', e.target.value)} placeholder="48" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Meses Até</label>
              <Input value={form.mesesAte || ''} onChange={e => setField('mesesAte', e.target.value)} placeholder="60" />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Valores dos Ativos</label>
              <div className="grid grid-cols-5 gap-2">
                {['ativo01', 'ativo02', 'ativo03', 'ativo04', 'ativo05', 'ativo06', 'ativo07', 'ativo08', 'ativo09', 'ativo10'].map((key) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">{key.replace('ativo', 'Ativo ')}</label>
                    <Input value={form[key as keyof FormData] || ''} onChange={e => setField(key as keyof FormData, e.target.value)} placeholder="0.0065" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={isSaving} className="bg-blue-700 hover:bg-blue-800">
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && excluirMutation.mutate({ id: deleteId })}
              disabled={excluirMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
