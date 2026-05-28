import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { ArrowLeft, Plus, Pencil, Trash2, Search, X, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import PageHeader from "@/components/PageHeader";

type TabelaRow = {
  id: number;
  empresa: string | null;
  codigo: string | null;
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
  empresa?: string; codigo?: string; faixa1?: string; faixa2?: string; faixa3?: string;
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
  const normalized = String(val).replace(',', '.').replace('%', '');
  const n = parseFloat(normalized);
  if (isNaN(n)) return val;
  // Banco guarda decimal (ex: 0.0065 = 0,65%), multiplica por 100 para exibir
  return (n * 100).toFixed(2).replace('.', ',') + '%';
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
    if (format === 'percent') {
      // Remove % e espaços, troca vírgula por ponto, converte para decimal
      const cleaned = tempValue.replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      // Usar toFixed(10) para evitar erros de ponto flutuante (ex: 0.40/100 = 0.003999...)
      const stored = isNaN(n) ? '' : parseFloat((n / 100).toFixed(10)).toString();
      // Sempre salva ao confirmar (não compara com value para evitar falsos negativos)
      onSave(stored);
    } else {
      if (tempValue !== value) onSave(tempValue);
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

  // Ao entrar em edição de percentual, mostra o valor já multiplicado por 100 (formato humano)
  const handleStartEdit = () => {
    if (format === 'percent' && value) {
      const n = parseFloat(String(value).replace(',', '.'));
      if (!isNaN(n)) {
        setTempValue((n * 100).toFixed(2).replace('.', ','));
      } else {
        setTempValue(value || '');
      }
    } else {
      setTempValue(value || '');
    }
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        type={format === 'number' ? 'number' : 'text'}
        step={format === 'number' ? '0.01' : undefined}
        placeholder={format === 'percent' ? 'Ex: 0,50' : undefined}
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
      onClick={handleStartEdit}
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
  const [showColSelector, setShowColSelector] = useState(false);
  const ALL_ATIVOS = ['ativo01','ativo02','ativo03','ativo04','ativo05','ativo06','ativo07','ativo08','ativo09','ativo10'] as const;
  const [colsVisiveis, setColsVisiveis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tabela_comissao_cols');
      return saved ? JSON.parse(saved) : [...ALL_ATIVOS];
    } catch { return [...ALL_ATIVOS]; }
  });
  const toggleCol = (col: string) => {
    setColsVisiveis(prev => {
      const next = prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col];
      localStorage.setItem('tabela_comissao_cols', JSON.stringify(next));
      return next;
    });
  };
  const NIVEIS = ['Ativo01','Ativo02','Ativo03','Ativo04','Ativo05','Ativo06','Ativo07','Ativo08','Ativo09','Ativo10'];
  const { user } = useAuth();
  const isAdminOuCeo = (user as any)?.cargo === 'CEO' || (user as any)?.cargo === 'SUPORTE' || (user as any)?.role === 'admin';
  const situacaoAgente: string | null = (user as any)?.situacao ?? null;
  // Mapeamento correto: Ativo → ativo01, Ativo01 → ativo01, Ativo02 → ativo02, ...
  const SITUACAO_TO_ATIVO: Record<string, string> = {
    'Ativo':   'ativo01',
    'Ativo01': 'ativo01', 'Ativo02': 'ativo02', 'Ativo03': 'ativo03',
    'Ativo04': 'ativo04', 'Ativo05': 'ativo05', 'Ativo06': 'ativo06',
    'Ativo07': 'ativo07', 'Ativo08': 'ativo08', 'Ativo09': 'ativo09', 'Ativo10': 'ativo10',
  };
  // Agente é considerado "ativo" se sua situação começa com 'Ativo'
  const isAgenteAtivo: boolean = situacaoAgente != null && situacaoAgente.startsWith('Ativo');
  const ativoAgente: string | null = isAgenteAtivo ? (SITUACAO_TO_ATIVO[situacaoAgente!] ?? 'ativo01') : null;
  const [valoresAtivos, setValoresAtivos] = useState<Record<string, string>>(
    NIVEIS.reduce((acc, n) => ({ ...acc, [n]: '', [`${n}De`]: '', [`${n}Ate`]: '' }), {})
  );
  const [editingValor, setEditingValor] = useState<string | null>(null);
  const [tempValueValor, setTempValueValor] = useState<string>('');

  const utils = trpc.useUtils();

  const { data: rows = [], isLoading } = trpc.tabelaComissao.listar.useQuery({
    empresa: filtroEmpresa || undefined,
    convenio: filtroConvenio || undefined,
  });

  const { data: empresas = [] } = trpc.tabelaComissao.listarEmpresas.useQuery();
  const { data: convenios = [] } = trpc.tabelaComissao.listarConvenios.useQuery();

  // Carregar valores do banco ao montar
  const { data: valoresDB } = trpc.valoresCalculo.obter.useQuery();
  useEffect(() => {
    if (!valoresDB) return;
    const novo: Record<string, string> = {};
    NIVEIS.forEach(n => {
      const db = valoresDB as Record<string, unknown>;
      const key = n.toLowerCase();
      novo[n] = db[key] != null ? String(db[key]) : '';
      novo[`${n}De`] = db[`${key}De`] != null ? String(db[`${key}De`]) : '';
      novo[`${n}Ate`] = db[`${key}Ate`] != null ? String(db[`${key}Ate`]) : '';
    });
    setValoresAtivos(novo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valoresDB]);

  const salvarValoresMutation = trpc.valoresCalculo.atualizar.useMutation({
    onSuccess: () => {
      utils.valoresCalculo.obter.invalidate();
      toast.success('Valores salvos no banco!');
    },
    onError: (e) => toast.error('Erro ao salvar: ' + e.message),
  });

  const salvarValoresNoBanco = (valores: Record<string, string>) => {
    const payload: Record<string, string> = {};
    NIVEIS.forEach(n => {
      if (valores[n] !== undefined) payload[n.toLowerCase()] = valores[n];
      if (valores[`${n}De`] !== undefined) payload[`${n.toLowerCase()}De`] = valores[`${n}De`];
      if (valores[`${n}Ate`] !== undefined) payload[`${n.toLowerCase()}Ate`] = valores[`${n}Ate`];
    });
    salvarValoresMutation.mutate(payload as any);
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

  // Mapa de cores por convênio (degradê por grupo)
  const CONVENIO_COLORS: Record<string, { row: string; badge: string }> = {
    'CONVENIOS BANCO DO BRASIL': { row: 'bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100', badge: 'bg-yellow-200 text-yellow-900 border border-yellow-400' },
    'CREDITO PESSOAL':           { row: 'bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100',       badge: 'bg-blue-200 text-blue-900 border border-blue-400' },
    'FEDERAL':                   { row: 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100', badge: 'bg-green-200 text-green-900 border border-green-400' },
    'FGTS':                      { row: 'bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100', badge: 'bg-orange-200 text-orange-900 border border-orange-400' },
    'INSS':                      { row: 'bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100', badge: 'bg-purple-200 text-purple-900 border border-purple-400' },
    'CONSIGNADO INSS':           { row: 'bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100', badge: 'bg-purple-200 text-purple-900 border border-purple-400' },
    'SIAPE':                     { row: 'bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100',       badge: 'bg-teal-200 text-teal-900 border border-teal-400' },
    'PREFEITURA':                { row: 'bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100',       badge: 'bg-rose-200 text-rose-900 border border-rose-400' },
  };

  function getConvenioColor(convenio: string | null) {
    if (!convenio) return { row: 'bg-white hover:bg-gray-50', badge: 'bg-gray-100 text-gray-700 border border-gray-300' };
    const upper = convenio.toUpperCase();
    for (const [key, val] of Object.entries(CONVENIO_COLORS)) {
      if (upper.includes(key)) return val;
    }
    // Fallback: gera cor baseada no hash do nome
    const hash = convenio.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const palettes = [
      { row: 'bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100', badge: 'bg-indigo-200 text-indigo-900 border border-indigo-400' },
      { row: 'bg-gradient-to-r from-lime-50 to-green-50 hover:from-lime-100 hover:to-green-100',   badge: 'bg-lime-200 text-lime-900 border border-lime-400' },
      { row: 'bg-gradient-to-r from-fuchsia-50 to-pink-50 hover:from-fuchsia-100 hover:to-pink-100', badge: 'bg-fuchsia-200 text-fuchsia-900 border border-fuchsia-400' },
      { row: 'bg-gradient-to-r from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100',       badge: 'bg-cyan-200 text-cyan-900 border border-cyan-400' },
      { row: 'bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100',       badge: 'bg-red-200 text-red-900 border border-red-400' },
    ];
    return palettes[hash % palettes.length];
  }

  const filteredRows = useMemo(() => {
    const filtered = !busca.trim() ? rows : (() => {
      const q = busca.toLowerCase();
      return rows.filter(r =>
        (r.empresa || '').toLowerCase().includes(q) ||
        (r.convenio || '').toLowerCase().includes(q) ||
        (r.txJurosDe || '').includes(q) ||
        (r.mesesDe || '').includes(q) ||
        (r.mesesAte || '').includes(q)
      );
    })();
    // Ordenar por: Empresa → Convênio → Juros (txJurosDe) → Prazo (mesesDe)
    return [...filtered].sort((a, b) => {
      const emp = (a.empresa || '').localeCompare(b.empresa || '', 'pt-BR');
      if (emp !== 0) return emp;
      const conv = (a.convenio || '').localeCompare(b.convenio || '', 'pt-BR');
      if (conv !== 0) return conv;
      const jurosA = parseFloat((a.txJurosDe || '0').replace(',', '.'));
      const jurosB = parseFloat((b.txJurosDe || '0').replace(',', '.'));
      if (jurosA !== jurosB) return jurosA - jurosB;
      const prazoA = parseInt(a.mesesDe || '0', 10);
      const prazoB = parseInt(b.mesesDe || '0', 10);
      return prazoA - prazoB;
    });
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

  // ── Importação em lote ──────────────────────────────────────────────────────
  const importarLoteMutation = trpc.tabelaComissao.importarLote.useMutation({
    onSuccess: (res) => {
      toast.success(`Importação concluída: ${res.atualizados} atualizados, ${res.criados} criados`);
      utils.tabelaComissao.listar.invalidate();
    },
    onError: (e) => toast.error('Erro na importação: ' + e.message),
  });

  function handleExportarTemplate() {
    // Exporta os dados atuais como template para edição
    // Campos que são percentuais salvos como decimal no banco (ex: 0.0065 = 0,65%)
    const ATIVOS = ['ativo01','ativo02','ativo03','ativo04','ativo05','ativo06','ativo07','ativo08','ativo09','ativo10'];
    const CAMPOS_PCT = [...ATIVOS, 'faixa1','faixa2','faixa3','faixa4','faixa5','tabelaCalculo','referencia'];
    // txJurosDe e txJurosAte são salvos como string direta (ex: '0.0175') e representam percentual
    const CAMPOS_JUROS = ['txJurosDe','txJurosAte'];
    const header = ['id','empresa','convenio','codigo','txJurosDe_%','txJurosAte_%','valorMinimo','mesesDe','mesesAte',...ATIVOS.map(a => a + '_%'),'faixa1_%','faixa2_%','faixa3_%','faixa4_%','faixa5_%','tabelaCalculo_%','referencia_%'];
    const headerKeys = ['id','empresa','convenio','codigo','txJurosDe','txJurosAte','valorMinimo','mesesDe','mesesAte',...ATIVOS,'faixa1','faixa2','faixa3','faixa4','faixa5','tabelaCalculo','referencia'];
    const dataRows = filteredRows.map(r => headerKeys.map(h => {
      const v = (r as any)[h];
      if (CAMPOS_PCT.includes(h) && v !== null && v !== undefined && v !== '') {
        const n = parseFloat(String(v).replace(',','.'));
        return isNaN(n) ? v : parseFloat((n * 100).toFixed(4));
      }
      if (CAMPOS_JUROS.includes(h) && v !== null && v !== undefined && v !== '') {
        const n = parseFloat(String(v).replace(',','.'));
        return isNaN(n) ? v : parseFloat((n * 100).toFixed(4));
      }
      return v ?? '';
    }));
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    // Estilo do cabeçalho
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[cell]) continue;
      ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: '002776' } }, font2: { color: { rgb: 'FFFFFF' } } };
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TabelaComissao');
    XLSX.writeFile(wb, 'template_tabela_comissao.xlsx');
    toast.success('Template exportado! Edite os valores e importe de volta.');
  }

  function handleImportarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { toast.error('Planilha vazia'); return; }
        const ATIVOS = ['ativo01','ativo02','ativo03','ativo04','ativo05','ativo06','ativo07','ativo08','ativo09','ativo10'];
        const FAIXAS = ['faixa1','faixa2','faixa3','faixa4','faixa5','tabelaCalculo','referencia'];
        const parsed = rows.map((r: any) => {
          const obj: any = {};
          // id
          if (r.id !== '' && r.id !== undefined) obj.id = Number(r.id);
          // campos texto simples
          ['empresa','convenio','codigo','valorMinimo','mesesDe','mesesAte'].forEach(k => {
            if (r[k] !== '' && r[k] !== undefined) obj[k] = String(r[k]);
          });
          // juros: aceita 'txJurosDe_%' (novo) ou 'txJurosDe' (legado)
          // No template novo, os juros já estão em percentual (ex: 1.75 = 1,75%)
          // Precisa dividir por 100 para salvar como decimal no banco
          ['txJurosDe','txJurosAte'].forEach(k => {
            const vNovo = r[k + '_%'];
            const vLegado = r[k];
            const raw = vNovo !== '' && vNovo !== undefined ? vNovo : vLegado;
            if (raw !== '' && raw !== undefined) {
              const n = parseFloat(String(raw).replace(',','.'));
              if (!isNaN(n)) obj[k] = (n / 100).toString();
              else obj[k] = String(raw);
            }
          });
          // ativos e faixas: aceita 'ativo01_%' (novo) ou 'ativo01' (legado)
          [...ATIVOS, ...FAIXAS].forEach(k => {
            const vNovo = r[k + '_%'];
            const vLegado = r[k];
            const raw = vNovo !== '' && vNovo !== undefined ? vNovo : vLegado;
            if (raw !== '' && raw !== undefined) {
              const n = parseFloat(String(raw).replace(',','.'));
              if (!isNaN(n)) obj[k] = (n / 100).toString();
            }
          });
          return obj;
        });
        importarLoteMutation.mutate(parsed);
      } catch (err) {
        toast.error('Erro ao ler planilha: ' + String(err));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Tabela de Comissão</h1>
            <p className="text-xs text-gray-500">{filteredRows.length} registros</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Exportar template */}
            <Button
              variant="outline"
              onClick={handleExportarTemplate}
              className="flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
              title="Exportar tabela atual como Excel para edição em massa"
            >
              <Download className="w-4 h-4" /> Exportar Template
            </Button>
            {/* Importar Excel */}
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportarExcel} />
              <Button
                variant="outline"
                asChild
                className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                title="Importar planilha editada de volta para o sistema"
              >
                <span>
                  <Upload className="w-4 h-4" />
                  {importarLoteMutation.isPending ? 'Importando...' : 'Importar Excel'}
                </span>
              </Button>
            </label>
            <Button onClick={openNovo} className="flex items-center gap-2" style={{ backgroundColor: '#002776' }}>
              <Plus className="w-4 h-4" /> Novo
            </Button>
          </div>
        </div>
      </div>

      {/* Valores para Cálculo por Nível - Editáveis Inline — só para admin/CEO */}
      {isAdminOuCeo && <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-blue-900 block">Valores para Cálculo por Nível:</label>
            <Button
              onClick={() => salvarValoresNoBanco(valoresAtivos)}
              disabled={salvarValoresMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded"
            >
              💾 Salvar Tudo
            </Button>
          </div>
          {/* Grid: cada Ativo ocupa uma coluna com label + campos De e Até */}
          <div className="grid grid-cols-5 gap-3">
            {NIVEIS.map((nivel) => {
              const keyDe = `${nivel}De`;
              const keyAte = `${nivel}Ate`;
              return (
                <div key={nivel} className="bg-white rounded-lg border border-blue-200 p-2">
                  <div className="text-xs font-semibold text-blue-800 mb-1.5 text-center">{nivel.replace('Ativo', 'Ativo ')}</div>
                  <div className="space-y-1">
                    <div>
                      <label className="text-[10px] text-gray-500">De</label>
                      <input
                        type="number"
                        step="0.01"
                        value={valoresAtivos[keyDe] || ''}
                        onChange={(e) => setValoresAtivos(prev => ({ ...prev, [keyDe]: e.target.value }))}
                        placeholder="0,00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Até</label>
                      <input
                        type="number"
                        step="0.01"
                        value={valoresAtivos[keyAte] || ''}
                        onChange={(e) => setValoresAtivos(prev => ({ ...prev, [keyAte]: e.target.value }))}
                        placeholder="0,00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>}

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

          {/* Seletor de colunas visíveis (só admin) */}
          {isAdminOuCeo && (
            <div className="relative ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColSelector(v => !v)}
                className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                Colunas ({colsVisiveis.length}/10)
              </Button>
              {showColSelector && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-52">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ativos visíveis</span>
                    <button onClick={() => setShowColSelector(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {ALL_ATIVOS.map((col, i) => (
                      <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 rounded px-1.5 py-1">
                        <input
                          type="checkbox"
                          checked={colsVisiveis.includes(col)}
                          onChange={() => toggleCol(col)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">Ativo {String(i + 1).padStart(2, '0')}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-2 pt-2 border-t">
                    <button onClick={() => { setColsVisiveis([...ALL_ATIVOS]); localStorage.setItem('tabela_comissao_cols', JSON.stringify([...ALL_ATIVOS])); }} className="text-xs text-blue-600 hover:underline">Todos</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => { setColsVisiveis([]); localStorage.setItem('tabela_comissao_cols', '[]'); }} className="text-xs text-red-500 hover:underline">Nenhum</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info — só para admin */}
      {isAdminOuCeo && (
        <div className="px-6 py-2 bg-blue-50 border-b text-xs text-blue-700">
          💡 Clique em qualquer célula para editar. Pressione Enter para salvar ou Escape para cancelar.
        </div>
      )}

      {/* Tabela */}
      <div className="px-6 py-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{background: 'linear-gradient(90deg, #002776 0%, #003d99 40%, #0055cc 70%, #1a6ed8 100%)'}} className="text-white">
                  <th className="px-3 py-2.5 text-left whitespace-nowrap font-semibold tracking-wide">Convênio</th>
                  {/* Colunas CEO: Recebo e Pago — invisíveis para promotores */}
                  {isAdminOuCeo && (
                    <>
                      <th className="px-1.5 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide text-xs" style={{background:'rgba(255,215,0,0.18)',color:'#ffe066',width:'60px'}}>Rec%</th>
                      <th className="px-2 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide text-xs" style={{background:'rgba(255,100,100,0.18)',color:'#ffb3b3'}}>Pago %</th>
                    </>
                  )}
                  <th className="px-3 py-2.5 text-left whitespace-nowrap font-semibold tracking-wide">Faixas</th>
                  {isAdminOuCeo ? (
                    <>
                      {ALL_ATIVOS.map((col, i) => colsVisiveis.includes(col) && (
                        <th key={col} className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:`rgba(255,255,255,${0.08 + i * 0.01})`}}>
                          Ativo {String(i + 1).padStart(2, '0')}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide">Ações</th>
                    </>
                  ) : ativoAgente ? (
                    <>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.08)'}}>Empresa</th>
                      <th className="px-3 py-2.5 text-center whitespace-nowrap font-semibold tracking-wide" style={{background:'rgba(255,255,255,0.12)'}}>Minha Comissão ({situacaoAgente})</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={isAdminOuCeo ? 13 : ativoAgente ? 4 : 2} className="text-center py-8 text-gray-500">Carregando...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={isAdminOuCeo ? 13 : ativoAgente ? 4 : 2} className="text-center py-8 text-gray-500">Nenhum registro encontrado</td></tr>
                ) : (
                  filteredRows.map((row) => {
                    const convColor = getConvenioColor(row.convenio);
                    return (
                      <tr key={row.id} className={`${convColor.row} transition-colors`}>
                        {/* Coluna Convênio: Empresa · Código + badge */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs mb-0.5">
                            {isAdminOuCeo ? (
                              <EditableCell value={row.empresa} onSave={(v) => handleCellSave(row.id, 'empresa', v)} isSaving={savingCell === `${row.id}-empresa`} />
                            ) : (
                              <span className="font-medium text-gray-800">{row.empresa || '-'}</span>
                            )}
                            {(row as any).codigo && <span className="text-gray-400">· {(row as any).codigo}</span>}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${convColor.badge}`}>
                            {row.convenio || '-'}
                          </span>
                        </td>
                        {/* Colunas CEO: Recebo e Pago */}
                        {isAdminOuCeo && (() => {
                          // Recebo: converte para percentual comparável
                          const receboRaw = (row as any).receboPct;
                          const receboNum = receboRaw ? parseFloat(String(receboRaw).replace(',','.').replace('%','')) : null;
                          // Recebo pode ser digitado como "1,96" (já em %) ou "0.0196" (decimal)
                          const receboPct2 = receboNum !== null
                            ? (receboNum < 1 ? receboNum * 100 : receboNum)
                            : null;
                          // Pago: calcula (ativo / recebo) * 100 para cada ativo
                          const ativos = ALL_ATIVOS.map((key, i) => {
                            const v = (row as any)[key];
                            if (!v) return null;
                            const ativoNum = parseFloat(String(v).replace(',','.').replace('%',''));
                            // Banco guarda decimal (ex: 0.0065 = 0,65%)
                            const ativoPct = ativoNum < 1 ? ativoNum * 100 : ativoNum;
                            // Percentual do recebo que está sendo pago: (ativo / recebo) * 100
                            const pagoProporcao = receboPct2 !== null && receboPct2 > 0
                              ? (ativoPct / receboPct2) * 100
                              : null;
                            const excede = pagoProporcao !== null && pagoProporcao >= 100;
                            const pagoPropStr = pagoProporcao !== null
                              ? pagoProporcao.toFixed(4).replace('.', ',') + '%'
                              : pct(v);
                            return { label: `A${String(i+1).padStart(2,'0')}`, value: pagoPropStr, excede };
                          }).filter(Boolean);
                          const temAlerta = ativos.some((a: any) => a.excede);
                          return (
                            <>
                              <td className="py-1 text-center whitespace-nowrap" style={{width:'60px'}}>
                                <EditableCell
                                  value={(row as any).receboPct}
                                  onSave={(v) => handleCellSave(row.id, 'receboPct' as any, v)}
                                  isSaving={savingCell === `${row.id}-receboPct`}
                                />
                              </td>
                              <td className={`px-2 py-1 text-left ${temAlerta ? 'bg-red-50' : ''}`} style={{maxWidth:'180px'}}>
                                {temAlerta && (
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-red-600 text-xs font-bold">⚠️ Pago &gt; Recebo!</span>
                                  </div>
                                )}
                                {ativos.length === 0 ? (
                                  <span className="text-gray-400 text-xs">-</span>
                                ) : (
                                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                                    {ativos.map((a: any) => (
                                      <span
                                        key={a.label}
                                        className="text-xs whitespace-nowrap"
                                        title={a.excede ? `⚠️ ${a.label} (${a.value}) é maior que o que você recebe!` : ''}
                                      >
                                        <span className="text-gray-400">{a.label}:</span>
                                        <span className={`font-medium ml-0.5 ${a.excede ? 'text-red-700 font-bold underline decoration-red-500' : 'text-red-600'}`}>{a.value}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </>
                          );
                        })()}
                        {/* Coluna Faixas: Juros, Valor Mín, Prazo */}
                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                          <div className="text-gray-700 flex items-center gap-1">
                            <span className="text-gray-400">Juros:</span>
                            {isAdminOuCeo ? (
                              <span className="inline-flex items-center gap-1">
                                <EditableCell value={row.txJurosDe} onSave={(v) => handleCellSave(row.id, 'txJurosDe', v)} isSaving={savingCell === `${row.id}-txJurosDe`} format="percent" />
                                <span className="text-gray-400">→</span>
                                <EditableCell value={row.txJurosAte} onSave={(v) => handleCellSave(row.id, 'txJurosAte', v)} isSaving={savingCell === `${row.id}-txJurosAte`} format="percent" />
                              </span>
                            ) : (
                              <span>{pct(row.txJurosDe)} → {pct(row.txJurosAte)}</span>
                            )}
                          </div>
                          <div className="text-gray-500 flex items-center gap-1">
                            <span className="text-gray-400">Mín:</span>
                            {isAdminOuCeo ? (
                              <EditableCell value={row.valorMinimo} onSave={(v) => handleCellSave(row.id, 'valorMinimo', v)} isSaving={savingCell === `${row.id}-valorMinimo`} />
                            ) : (
                              <span>{row.valorMinimo || '-'}</span>
                            )}
                          </div>
                          <div className="text-gray-500 flex items-center gap-1">
                            <span className="text-gray-400">Prazo:</span>
                            {isAdminOuCeo ? (
                              <span className="inline-flex items-center gap-1">
                                <EditableCell value={row.mesesDe} onSave={(v) => handleCellSave(row.id, 'mesesDe', v)} isSaving={savingCell === `${row.id}-mesesDe`} />
                                <span className="text-gray-400">→</span>
                                <EditableCell value={row.mesesAte} onSave={(v) => handleCellSave(row.id, 'mesesAte', v)} isSaving={savingCell === `${row.id}-mesesAte`} />
                              </span>
                            ) : (
                              <span>{row.mesesDe || '-'} → {row.mesesAte || '-'} meses</span>
                            )}
                          </div>
                        </td>
                        {/* Ativos: admin vê todos editáveis, agente vê só o dele */}
                        {isAdminOuCeo ? (
                          <>
                            {ALL_ATIVOS.map((key) => colsVisiveis.includes(key) && (
                              <td key={String(key)} className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">
                                <EditableCell
                                  value={(row as any)[key]}
                                  onSave={(v) => handleCellSave(row.id, key as keyof TabelaRow, v)}
                                  isSaving={savingCell === `${row.id}-${String(key)}`}
                                  format="percent"
                                />
                              </td>
                            ))}
                          </>
                        ) : ativoAgente ? (
                          <>
                            <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                              {row.empresa || '-'}
                            </td>
                            <td className="px-3 py-1.5 text-center font-bold whitespace-nowrap text-base" style={{color: (row as any)[ativoAgente] ? '#1d4ed8' : '#9ca3af'}}>
                              {(row as any)[ativoAgente] ? pct((row as any)[ativoAgente]) : '—'}
                            </td>
                          </>
                        ) : null}
                        {/* Ações: só admin */}
                        {isAdminOuCeo && (
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => openEditar(row as TabelaRow)} title="Editar tudo">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(row.id)} title="Excluir">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
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
             <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Empresa</label>
              <Input value={form.empresa || ''} onChange={e => setField('empresa', e.target.value)} placeholder="BMF, FLEX..." />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Código <span className="text-gray-400 text-xs">(até 5 códigos separados por /)</span></label>
              <Input value={form.codigo || ''} onChange={e => setField('codigo', e.target.value.slice(0,24))} placeholder="2880/2881/2882" maxLength={24} />
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
