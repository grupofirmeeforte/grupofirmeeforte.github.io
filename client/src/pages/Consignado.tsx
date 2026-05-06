import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';

type Consignado = {
  id: number;
  empresa?: string | null;
  mes?: string | null;
  chaveJ?: string | null;
  nomeAgente?: string | null;
  convenio?: string | null;
  nrOperacao?: string | null;
  valorBruto?: string | null;
  valorLiquido?: string | null;
  rbm?: string | null;
  parcela?: number | null;
  prefixoBB?: string | null;
  dtContratacao?: string | Date | null;
  produto?: string | null;
  descricaoProduto?: string | null;
  juros?: string | null;
  tabelaMes?: string | null;
  percAVista?: string | null;
  restricaoSRCC?: string | null;
  percPago?: string | null;
  totalComissao?: string | null;
  difEmpresa?: string | null;
  tabela?: string | null;
  supervisor?: string | null;
};

type FormData = {
  empresa?: string;
  mes?: string;
  chaveJ?: string;
  nomeAgente?: string;
  convenio?: string;
  nrOperacao?: string;
  valorBruto?: string;
  valorLiquido?: string;
  rbm?: string;
  parcela?: number;
  prefixoBB?: string;
  dtContratacao?: string;
  produto?: string;
  descricaoProduto?: string;
  juros?: string;
  tabelaMes?: string;
  percAVista?: string;
  restricaoSRCC?: string;
  percPago?: string;
  totalComissao?: string;
  difEmpresa?: string;
  tabela?: string;
  supervisor?: string;
};

const EMPTY_FORM: FormData = {};

function moeda(val: string | null | undefined) {
  if (!val) return '-';
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(val: string | null | undefined) {
  if (!val) return '-';
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return (n * 100).toFixed(2).replace('.', ',') + '%';
}

function strVal(val: string | Date | null | undefined) {
  if (!val) return '-';
  if (val instanceof Date) return val.toLocaleDateString('pt-BR');
  return val;
}

export default function Consignado() {
  const [, setLocation] = useLocation();
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Estado para controlar quando calcular fórmulas (só quando chaveJ tem 7+ chars)
  const [calcInput, setCalcInput] = useState<{chaveJ: string; convenio?: string; juros?: string; meses?: string; valorLiquido?: string; rbm?: string} | null>(null);

  // Hook de cálculo automático
  const { data: formulasData } = trpc.consignado.calcularFormulas.useQuery(
    calcInput || { chaveJ: '' },
    { enabled: !!(calcInput && calcInput.chaveJ.length >= 5) }
  );

  const utils = trpc.useUtils();

  const { data: registros = [], isLoading } = trpc.consignado.listar.useQuery({
    mes: filtroMes || undefined,
    empresa: filtroEmpresa || undefined,
  });

  const { data: meses = [] } = trpc.consignado.listarMeses.useQuery();
  const { data: empresas = [] } = trpc.consignado.listarEmpresas.useQuery();

  const criar = trpc.consignado.criar.useMutation({
    onSuccess: () => { utils.consignado.listar.invalidate(); utils.consignado.listarMeses.invalidate(); utils.consignado.listarEmpresas.invalidate(); toast.success('Registro criado!'); setModalAberto(false); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const atualizar = trpc.consignado.atualizar.useMutation({
    onSuccess: () => { utils.consignado.listar.invalidate(); toast.success('Registro atualizado!'); setModalAberto(false); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const excluir = trpc.consignado.excluir.useMutation({
    onSuccess: () => { utils.consignado.listar.invalidate(); toast.success('Registro excluído!'); setConfirmandoExclusao(null); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const importar = trpc.consignado.importar.useMutation({
    onSuccess: (r) => { utils.consignado.listar.invalidate(); utils.consignado.listarMeses.invalidate(); utils.consignado.listarEmpresas.invalidate(); toast.success(`${r.count} registros importados!`); },
    onError: (e) => toast.error('Erro na importação: ' + e.message),
  });

  // Preencher campos automáticos quando formulasData chegar
  useEffect(() => {
    if (!formulasData || 'erro' in formulasData) return;
    setForm(prev => ({
      ...prev,
      empresa: formulasData.empresa || prev.empresa,
      nomeAgente: formulasData.nomeAgente || prev.nomeAgente,
      supervisor: formulasData.supervisor || prev.supervisor,
      percPago: formulasData.percPago || prev.percPago,
      totalComissao: formulasData.totalComissao || prev.totalComissao,
      difEmpresa: formulasData.difEmpresa || prev.difEmpresa,
    }));
  }, [formulasData]);

  function setField(field: keyof FormData, value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Recalcular fórmulas quando campos-chave mudam
      if (['chaveJ', 'convenio', 'juros', 'valorLiquido', 'rbm'].includes(field)) {
        const chaveJ = field === 'chaveJ' ? value : (prev.chaveJ || '');
        if (chaveJ.length >= 5) {
          setCalcInput({
            chaveJ,
            convenio: field === 'convenio' ? value : prev.convenio,
            juros: field === 'juros' ? value : prev.juros,
            valorLiquido: field === 'valorLiquido' ? value : prev.valorLiquido,
            rbm: field === 'rbm' ? value : prev.rbm,
          });
        }
      }
      return updated;
    });
  }

  function toggleSelecionado(id: number) {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  }

  function selecionarTodos() {
    if (selecionados.size === registros.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(registros.map(r => r.id)));
    }
  }

  async function deletarSelecionados() {
    if (selecionados.size === 0) {
      toast.error('Nenhum registro selecionado!');
      return;
    }
    
    const confirmar = window.confirm(`Tem certeza que deseja deletar ${selecionados.size} registro(s)?`);
    if (!confirmar) return;
    
    try {
      for (const id of Array.from(selecionados)) {
        await excluir.mutateAsync({ id });
      }
      setSelecionados(new Set());
      setModoSelecao(false);
      toast.success(`${selecionados.size} registro(s) deletado(s)!`);
    } catch (err) {
      toast.error('Erro ao deletar registros');
    }
  }

  function openNovo() {
    setForm(EMPTY_FORM);
    setEditandoId(null);
    setModalAberto(true);
  }

  function openEditar(r: Consignado) {
    setForm({
      empresa: r.empresa, mes: r.mes, chaveJ: r.chaveJ, nomeAgente: r.nomeAgente,
      convenio: r.convenio, nrOperacao: r.nrOperacao, valorBruto: r.valorBruto,
      valorLiquido: r.valorLiquido, rbm: r.rbm, parcela: r.parcela,
      prefixoBB: r.prefixoBB, dtContratacao: r.dtContratacao instanceof Date ? r.dtContratacao.toISOString().split('T')[0] : r.dtContratacao,
      produto: r.produto, descricaoProduto: r.descricaoProduto, juros: r.juros, tabelaMes: r.tabelaMes,
      percAVista: r.percAVista, restricaoSRCC: r.restricaoSRCC, percPago: r.percPago,
      totalComissao: r.totalComissao, difEmpresa: r.difEmpresa, tabela: r.tabela,
      supervisor: r.supervisor,
    } as FormData);
    setEditandoId(r.id);
    setModalAberto(true);
  }

  function handleSalvar() {
    // Converter null para undefined para compatibilidade com tRPC
    const cleanForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === null ? undefined : v])
    );
    if (editandoId !== null) {
      atualizar.mutate({ id: editandoId, ...cleanForm } as any);
    } else {
      criar.mutate(cleanForm as any);
    }
  }

  function handleImportar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        // Procurar aba Consignado
        const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('consig') && !n.toLowerCase().includes('extrato')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Encontrar linha de cabeçalho (linha com Empresa, Mês, etc.)
        let headerRow = -1;
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const row = data[i].map((c: any) => String(c).toLowerCase());
          if (row.some(c => c.includes('empresa') || c.includes('chave') || c.includes('convenio') || c.includes('convênio'))) {
            headerRow = i;
            break;
          }
        }
        if (headerRow === -1) { toast.error('Cabeçalho não encontrado na planilha'); return; }

        const headers: string[] = data[headerRow].map((h: any) => String(h).trim().toLowerCase()
          .replace('ê', 'e').replace('ã', 'a').replace('ç', 'c').replace('é', 'e').replace('á', 'a').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('_', ' ').replace('.', ' '));

        const colMap: Record<string, keyof FormData> = {
          'empresa': 'empresa',
          'mes': 'mes',
          'chave j': 'chaveJ', 'chave_j': 'chaveJ', 'chavej': 'chaveJ',
          'nome agente': 'nomeAgente', 'nomeagente': 'nomeAgente',
          'convenio': 'convenio', 'convênio': 'convenio',
          'nr operacao': 'nrOperacao', 'nr  operacao': 'nrOperacao', 'nroperacao': 'nrOperacao', 'nr. operacao': 'nrOperacao',
          'valor bruto': 'valorBruto', 'valorbruto': 'valorBruto',
          'vr liquido': 'valorLiquido', 'valor liquido': 'valorLiquido', 'valorliquido': 'valorLiquido', 'vr. liquido': 'valorLiquido',
          'rbm': 'rbm',
          'parcela': 'parcela',
          'prefixo bb': 'prefixoBB', 'prefixobb': 'prefixoBB', 'prefixo_bb': 'prefixoBB',
          'dt contratacao': 'dtContratacao', 'dtcontratacao': 'dtContratacao', 'data contratacao': 'dtContratacao',
          'produto': 'produto',
          'descricao produto': 'descricaoProduto', 'descricaoproduto': 'descricaoProduto', 'descricao_produto': 'descricaoProduto',
          'juros': 'juros',
          'tabela mes': 'tabelaMes', 'tabelames': 'tabelaMes', 'tabela_mes': 'tabelaMes',
          'perc  a vista': 'percAVista', 'perc a vista': 'percAVista', 'percavista': 'percAVista', 'perc_a_vista': 'percAVista',
          'restricao srcc': 'restricaoSRCC', 'restricaosrcc': 'restricaoSRCC', 'restricao_srcc': 'restricaoSRCC',
          'perc  pago': 'percPago', 'perc pago': 'percPago', 'percpago': 'percPago', 'perc_pago': 'percPago',
          'total comissao': 'totalComissao', 'totalcomissao': 'totalComissao', 'total_comissao': 'totalComissao',
          'dif  empresa': 'difEmpresa', 'dif empresa': 'difEmpresa', 'difempresa': 'difEmpresa', 'dif_empresa': 'difEmpresa',
          'tabela': 'tabela',
          'supervisor': 'supervisor',
        };

        const registros: FormData[] = [];
        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.every((c: any) => !c)) continue;
          // Pular linha de descrição (linha 6 do Excel com "coluna para importanão")
          if (String(row[0]).toLowerCase().includes('coluna')) continue;

          const reg: any = {};
          headers.forEach((h, idx) => {
            const field = colMap[h];
            if (field && row[idx] !== undefined && row[idx] !== '') {
              const val = row[idx];
              if (field === 'parcela') {
                reg[field] = parseInt(String(val)) || undefined;
              } else if (field === 'dtContratacao') {
                // Converter data do Excel ou texto
                if (typeof val === 'number') {
                  const d = XLSX.SSF.parse_date_code(val);
                  reg[field] = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
                } else {
                  // Tentar normalizar data em texto (DD/MM/AAAA ou DD-MM-AAAA)
                  const dateStr = String(val);
                  const dateMatch = dateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
                  if (dateMatch) {
                    const [, day, month, year] = dateMatch;
                    reg[field] = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  } else {
                    reg[field] = dateStr;
                  }
                }
              } else {
                reg[field] = String(val);
              }
            }
          });

          if (Object.keys(reg).length > 0) registros.push(reg);
        }

        if (registros.length === 0) { toast.error('Nenhum dado encontrado na planilha'); return; }
        importar.mutate(registros);
      } catch (err) {
        toast.error('Erro ao ler planilha: ' + String(err));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }

  const registrosFiltrados = registros.filter(r => {
    if (!filtroBusca) return true;
    const b = filtroBusca.toLowerCase();
    return (r.nomeAgente || '').toLowerCase().includes(b)
      || (r.chaveJ || '').toLowerCase().includes(b)
      || (r.convenio || '').toLowerCase().includes(b)
      || (r.nrOperacao || '').toLowerCase().includes(b);
  });

  // Totalizadores
  const totalVL = registrosFiltrados.reduce((s, r) => s + (parseFloat(r.valorLiquido || '0') || 0), 0);
  const totalComissao = registrosFiltrados.reduce((s, r) => s + (parseFloat(r.totalComissao || '0') || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Consignado</h1>
            <p className="text-sm text-gray-500">Operações de crédito consignado</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation('/')} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50">
              <Upload className="w-4 h-4" /> Importar
            </Button>
            <Button onClick={openNovo} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800">
              <Plus className="w-4 h-4" /> Novo
            </Button>
            {modoSelecao ? (
              <>
                <Button onClick={selecionarTodos} variant="outline" className="flex items-center gap-2">
                  {selecionados.size === registros.length ? 'Desselecionar Tudo' : 'Selecionar Tudo'}
                </Button>
                <Button onClick={deletarSelecionados} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
                  <Trash2 className="w-4 h-4" /> Deletar ({selecionados.size})
                </Button>
                <Button onClick={() => { setModoSelecao(false); setSelecionados(new Set()); }} variant="outline" className="flex items-center gap-2">
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={() => setModoSelecao(true)} variant="outline" className="flex items-center gap-2 border-red-500 text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Selecionar e Deletar
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportar} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filtroMes || '__all__'} onValueChange={v => setFiltroMes(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mês/Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os meses</SelectItem>
              {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filtroEmpresa || '__all__'} onValueChange={v => setFiltroEmpresa(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por agente, ChaveJ, convênio..."
              value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {(filtroMes || filtroEmpresa || filtroBusca) && (
            <Button variant="ghost" size="sm" onClick={() => { setFiltroMes(''); setFiltroEmpresa(''); setFiltroBusca(''); }}>
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}

          <span className="text-sm text-gray-500 ml-auto">{registrosFiltrados.length} registro(s)</span>
        </div>
      </div>

      {/* Totalizadores */}
      {registrosFiltrados.length > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b flex gap-6 text-sm">
          <span className="font-medium text-blue-800">Total Vr. Líquido: <span className="font-bold">{moeda(String(totalVL))}</span></span>
          <span className="font-medium text-green-800">Total Comissão: <span className="font-bold">{moeda(String(totalComissao))}</span></span>
        </div>
      )}

      {/* Tabela */}
      <div className="px-6 py-4 overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <table className="w-full text-xs border-collapse min-w-[2200px]">
            <thead>
              <tr className="bg-gradient-to-r from-blue-800 to-blue-600 text-white">
                {modoSelecao && (
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-8">
                    <input
                      type="checkbox"
                      checked={selecionados.size === registros.length && registros.length > 0}
                      onChange={selecionarTodos}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Empresa</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Mês</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">ChaveJ</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Nome Agente</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Convênio</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Nr. Operação</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Vr. Bruto</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Vr. Líquido</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">RBM</th>
                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Parcela</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Prefixo BB</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Dt. Contratação</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Produto</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Descrição Produto</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Juros</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Tabela Mês</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Perc. À Vista</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Restrição SRCC</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Perc. Pago</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Total Comissão</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Dif. Empresa</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Tabela</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Supervisor</th>
                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={24} className="text-center py-10 text-gray-400">
                    <p className="font-medium">Nenhum registro encontrado</p>
                    <p className="text-xs mt-1">Importe uma planilha ou cadastre manualmente</p>
                  </td>
                </tr>
              )}
              {registrosFiltrados.map((r, idx) => (
                <tr
                  key={r.id}
                  className={
                    idx % 2 === 0
                      ? 'bg-white hover:bg-blue-50 transition-colors'
                      : 'bg-blue-50/40 hover:bg-blue-100/60 transition-colors'
                  }
                >
                  {modoSelecao && (
                    <td className="px-2 py-1.5 border-b border-gray-100 text-center">
                      <input
                        type="checkbox"
                        checked={selecionados.has(r.id)}
                        onChange={() => toggleSelecionado(r.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5 border-b border-gray-100 font-medium text-blue-900">{strVal(r.empresa)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.mes)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 font-mono">{strVal(r.chaveJ)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 whitespace-nowrap">{strVal(r.nomeAgente)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.convenio)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 font-mono">{strVal(r.nrOperacao)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{moeda(r.valorBruto)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right font-semibold text-blue-800">{moeda(r.valorLiquido)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{moeda(r.rbm)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-center">{r.parcela ?? '-'}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.prefixoBB)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.dtContratacao)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.produto)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 max-w-32 truncate" title={r.descricaoProduto || ''}>{strVal(r.descricaoProduto)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{pct(r.juros)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.tabelaMes)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{pct(r.percAVista)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.restricaoSRCC)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{pct(r.percPago)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right font-semibold text-green-700">{moeda(r.totalComissao)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{moeda(r.difEmpresa)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.tabela)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.supervisor)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => openEditar(r)} className="p-1 rounded hover:bg-blue-100 text-blue-600" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmandoExclusao(r.id)} className="p-1 rounded hover:bg-red-100 text-red-500" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Edição/Criação */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Consignado' : 'Novo Consignado'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            {/* Linha 1 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Empresa</label>
              <Input value={form.empresa || ''} readOnly className="bg-blue-50 text-blue-800 font-medium cursor-default" placeholder="auto: busca pelo ChaveJ" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mês (MM/AAAA)</label>
              <Input value={form.mes || ''} onChange={e => setField('mes', e.target.value)} placeholder="05/2026" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">ChaveJ</label>
              <Input value={form.chaveJ || ''} onChange={e => setField('chaveJ', e.target.value)} placeholder="J1234567" />
            </div>
            {/* Linha 2 */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nome Agente</label>
              <Input value={form.nomeAgente || ''} readOnly className="bg-blue-50 text-blue-800 font-medium cursor-default" placeholder="auto: busca pelo ChaveJ" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Convênio</label>
              <Input value={form.convenio || ''} onChange={e => setField('convenio', e.target.value)} placeholder="INSS / SIAPE..." />
            </div>
            {/* Linha 3 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nr. Operação</label>
              <Input value={form.nrOperacao || ''} onChange={e => setField('nrOperacao', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Valor Bruto</label>
              <Input value={form.valorBruto || ''} onChange={e => setField('valorBruto', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Vr. Líquido</label>
              <Input value={form.valorLiquido || ''} onChange={e => setField('valorLiquido', e.target.value)} placeholder="0.00" />
            </div>
            {/* Linha 4 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">RBM</label>
              <Input value={form.rbm || ''} onChange={e => setField('rbm', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Parcela</label>
              <Input type="number" value={form.parcela || ''} onChange={e => setField('parcela', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Prefixo BB</label>
              <Input value={form.prefixoBB || ''} onChange={e => setField('prefixoBB', e.target.value)} />
            </div>
            {/* Linha 5 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Dt. Contratação</label>
              <Input type="date" value={form.dtContratacao || ''} onChange={e => setField('dtContratacao', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Produto</label>
              <Input value={form.produto || ''} onChange={e => setField('produto', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descrição Produto</label>
              <Input value={form.descricaoProduto || ''} onChange={e => setField('descricaoProduto', e.target.value)} />
            </div>
            {/* Linha 6 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Juros</label>
              <Input value={form.juros || ''} onChange={e => setField('juros', e.target.value)} placeholder="0.0195" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tabela Mês</label>
              <Input value={form.tabelaMes || ''} onChange={e => setField('tabelaMes', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Perc. À Vista</label>
              <Input value={form.percAVista || ''} onChange={e => setField('percAVista', e.target.value)} placeholder="0.0065" />
            </div>
            {/* Linha 7 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Restrição SRCC</label>
              <Input value={form.restricaoSRCC || ''} onChange={e => setField('restricaoSRCC', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Perc. Pago (fórmula)</label>
              <Input value={form.percPago || ''} readOnly className="bg-green-50 text-green-800 font-medium cursor-default" placeholder="auto: Tabela Comissão" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Total Comissão (fórmula)</label>
              <Input value={form.totalComissao || ''} readOnly className="bg-green-50 text-green-800 font-medium cursor-default" placeholder="auto: Vr.Líquido × Perc.Pago" />
            </div>
            {/* Linha 8 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Dif. Empresa (fórmula)</label>
              <Input value={form.difEmpresa || ''} readOnly className="bg-amber-50 text-amber-800 font-medium cursor-default" placeholder="auto: RBM − Total Comissão" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tabela (fórmula)</label>
              <Input value={form.tabela || ''} onChange={e => setField('tabela', e.target.value)} placeholder="calculado" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Supervisor (fórmula)</label>
              <Input value={form.supervisor || ''} readOnly className="bg-blue-50 text-blue-800 font-medium cursor-default" placeholder="auto: busca pelo ChaveJ" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={criar.isPending || atualizar.isPending} className="bg-blue-700 hover:bg-blue-800">
              {criar.isPending || atualizar.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <Dialog open={confirmandoExclusao !== null} onOpenChange={() => setConfirmandoExclusao(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoExclusao(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmandoExclusao && excluir.mutate({ id: confirmandoExclusao })} disabled={excluir.isPending}>
              {excluir.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
