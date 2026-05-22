import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, Search, X, Download, RefreshCw, Calculator } from 'lucide-react';
import * as XLSX from 'xlsx';
import PageHeader from "@/components/PageHeader";

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
  srcc?: string | null;
  vrLiquidoSrcc?: string | null;
  percPago?: string | null;
  totalComissao?: string | null;
  difEmpresa?: string | null;
  tabela?: string | null;
  supervisor?: string | null;
  isDuplicate?: boolean | null;
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
  srcc?: string;
  vrLiquidoSrcc?: string;
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
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Para juros: valor já é percentual direto (ex: 1.85 = 1,85%)
function pctJuros(val: string | null | undefined) {
  if (!val) return '-';
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toFixed(2).replace('.', ',') + '%';
}

// Para percPago: valor decimal que precisa ×100 (ex: 0.0065 → 0,65%)
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

function mesNumParaStr(mes: string | null | undefined): string {
  if (!mes) return '-';
  const s = String(mes).trim();
  if (/^\d{1,2}\/\d{4}$/.test(s)) return s;
  const n = parseInt(s, 10);
  if (isNaN(n) || n <= 0) return s;
  const aa = n % 100;
  const mm = Math.floor(n / 100);
  if (mm < 1 || mm > 12) return s;
  return `${String(mm).padStart(2, '0')}/20${String(aa).padStart(2, '0')}`;
}

export default function Consignado() {
  const [, setLocation] = useLocation();
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [mostrarTotalizador, setMostrarTotalizador] = useState(true);
  const [mesAnoTotalizador, setMesAnoTotalizador] = useState('');
  const [empresaTotalizador, setEmpresaTotalizador] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // Função para obter o valor do ativo baseado no nível do agente
  const getValorAtivo = (nivel?: string) => {
    if (!nivel) return 0;
    const chave = `Ativo${nivel.replace('Ativo', '').padStart(2, '0')}`;
    return parseFloat(valoresAtivos[chave] || '0');
  };
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);
  const [modalEnviarCalculo, setModalEnviarCalculo] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Estado para controlar quando calcular fórmulas (só quando chaveJ tem 7+ chars)
  const [calcInput, setCalcInput] = useState<{chaveJ: string; convenio?: string; descricaoProduto?: string; juros?: string; meses?: string; valorLiquido?: string; rbm?: string; mes?: string} | null>(null);

  // Hook de cálculo automático
  const { data: formulasData } = trpc.consignado.calcularFormulas.useQuery(
    calcInput || { chaveJ: '' },
    { enabled: !!(calcInput && calcInput.chaveJ.length >= 5), refetchInterval: 10000, refetchOnWindowFocus: true }
  );

  const utils = trpc.useUtils();

  const { data: registros = [], isLoading } = trpc.consignado.listar.useQuery({
    mes: filtroMes || undefined,
    empresa: filtroEmpresa || undefined,
  }, { refetchInterval: 10000, refetchOnWindowFocus: true });

  const { data: meses = [] } = trpc.consignado.listarMeses.useQuery(undefined, { refetchInterval: 10000, refetchOnWindowFocus: true });
  const { data: empresas = [] } = trpc.consignado.listarEmpresas.useQuery(undefined, { refetchInterval: 10000, refetchOnWindowFocus: true });

  // Query para totalizador
  const { data: totalizador } = trpc.consignado.obterTotalizador.useQuery(
    {
      mes: mesAnoTotalizador || undefined,
      empresa: empresaTotalizador || undefined,
    },
    { enabled: mostrarTotalizador && !!(mesAnoTotalizador || empresaTotalizador), refetchInterval: 10000, refetchOnWindowFocus: true }
  );

  const criar = trpc.consignado.criar.useMutation({
    onSuccess: () => {
      utils.consignado.listar.invalidate();
      utils.consignado.listarMeses.invalidate();
      utils.consignado.listarEmpresas.invalidate();
      marcarDuplicatas.mutate();
      toast.success('Registro criado!');
      setModalAberto(false);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const atualizar = trpc.consignado.atualizar.useMutation({
    onSuccess: () => {
      utils.consignado.listar.invalidate();
      marcarDuplicatas.mutate();
      toast.success('Registro atualizado!');
      setModalAberto(false);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const excluir = trpc.consignado.excluir.useMutation({
    onSuccess: () => {
      utils.consignado.listar.invalidate();
      marcarDuplicatas.mutate();
      toast.success('Registro excluído!');
      setConfirmandoExclusao(null);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const marcarDuplicatas = trpc.consignado.marcarDuplicatas.useMutation();

  const enviarParaCalculo = trpc.consignado.enviarParaCalculo.useMutation({
    onSuccess: (r) => {
      utils.consignado.listar.invalidate();
      toast.success(`Enviado! ${r.criados} criado(s) e ${r.atualizados} atualizado(s) no Cálculo.`);
      setModalEnviarCalculo(false);
      setSelecionados(new Set());
      setModoSelecao(false);
    },
    onError: (e) => toast.error('Erro ao enviar para cálculo: ' + e.message),
  });

  const recalcularMes = trpc.consignado.recalcularMes.useMutation({
    onSuccess: (r) => {
      utils.consignado.listar.invalidate();
      if ('mensagem' in r) {
        toast.error(r.mensagem as string);
      } else {
        toast.success(`Recalculado! ${r.count} de ${r.total} registros atualizados.`);
      }
    },
    onError: (e) => toast.error('Erro ao recalcular: ' + e.message),
  });

  const importar = trpc.consignado.importar.useMutation({
    onSuccess: (r) => {
      utils.consignado.listar.invalidate();
      utils.consignado.listarMeses.invalidate();
      utils.consignado.listarEmpresas.invalidate();
      toast.success(`${r.count} registros importados!`);
      // Marcar duplicatas apos importacao
      marcarDuplicatas.mutate();
    },
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
      
      // Calcular Vr. Líquido - SRCC quando srcc ou valorLiquido mudam
      if (field === 'srcc' || field === 'valorLiquido') {
        const vl = parseFloat(field === 'valorLiquido' ? value : (prev.valorLiquido || '0'));
        const srcc = parseFloat(field === 'srcc' ? value : (prev.srcc || '0'));
        if (!isNaN(vl) && !isNaN(srcc)) {
          updated.vrLiquidoSrcc = String(vl - srcc);
        }
      }
      
      // Recalcular fórmulas quando campos-chave mudam
      if (['chaveJ', 'convenio', 'descricaoProduto', 'juros', 'valorLiquido', 'rbm', 'tabelaMes', 'mes', 'parcela'].includes(field)) {
        const chaveJ = field === 'chaveJ' ? value : (prev.chaveJ || '');
        if (chaveJ.length >= 5) {
          setCalcInput({
            chaveJ,
            convenio: field === 'convenio' ? value : prev.convenio,
            descricaoProduto: field === 'descricaoProduto' ? value : prev.descricaoProduto,
            juros: field === 'juros' ? value : prev.juros,
            valorLiquido: field === 'valorLiquido' ? value : prev.valorLiquido,
            rbm: field === 'rbm' ? value : prev.rbm,
            meses: field === 'tabelaMes' ? value : (field === 'parcela' ? value : prev.tabelaMes),
            mes: field === 'mes' ? value : prev.mes,
          });
        }
      }
      return updated;
    });
  }
  // Salvar valores de ativos no localStorage
  useEffect(() => {
    localStorage.setItem('valoresAtivos', JSON.stringify(valoresAtivos));
  }, [valoresAtivos]);

  // Marcar duplicatas ao carregar página
  useEffect(() => {
    marcarDuplicatas.mutate();
  }, []);

  // Carregar valores de ativos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('valoresAtivos');
    if (saved) {
      try {
        setValoresAtivos(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar valores de ativos:', e);
      }
    }
  }, []);

  const toggleSelecionado = (id: number) => {   setSelecionados(prev => {
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
      percAVista: r.percAVista, restricaoSRCC: r.restricaoSRCC, srcc: r.srcc, vrLiquidoSrcc: r.vrLiquidoSrcc, percPago: r.percPago,
      totalComissao: r.totalComissao, difEmpresa: r.difEmpresa, tabela: r.tabela,
      supervisor: r.supervisor,
    } as FormData);
    // Disparar cálculo automático ao abrir edição
    if (r.chaveJ && r.chaveJ.length >= 5) {
      setCalcInput({
        chaveJ: r.chaveJ,
        convenio: r.convenio || undefined,
        descricaoProduto: r.descricaoProduto || undefined,
        juros: r.juros || undefined,
        valorLiquido: r.valorLiquido || undefined,
        rbm: r.rbm || undefined,
        meses: r.parcela ? String(r.parcela) : (r.tabelaMes || undefined),
        mes: r.mes || undefined,
      });
    }
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

        const normalizeHeader = (h: any) => String(h).trim().toLowerCase()
          .replace(/ê/g, 'e').replace(/ã/g, 'a').replace(/ç/g, 'c').replace(/é/g, 'e').replace(/á/g, 'a').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')
          .replace(/[_\.]/g, ' ').replace(/\s+/g, ' ').trim();
        const headers: string[] = data[headerRow].map(normalizeHeader);

        const colMap: Record<string, keyof FormData> = {
          'empresa': 'empresa',
          'mes': 'mes',
          'chave j': 'chaveJ', 'chave_j': 'chaveJ', 'chavej': 'chaveJ',
          'nome agente': 'nomeAgente', 'nomeagente': 'nomeAgente',
          'convenio': 'convenio', 'convênio': 'convenio',
          'nr operacao': 'nrOperacao', 'nroperacao': 'nrOperacao',
          'valor bruto': 'valorBruto', 'valorbruto': 'valorBruto',
          'vr liquido': 'valorLiquido', 'valor liquido': 'valorLiquido', 'valorliquido': 'valorLiquido',
          'rbm': 'rbm',
          'parcela': 'parcela',
          'prefixo bb': 'prefixoBB', 'prefixobb': 'prefixoBB', 'prefixo_bb': 'prefixoBB',
          'dt contratacao': 'dtContratacao', 'dtcontratacao': 'dtContratacao', 'data contratacao': 'dtContratacao',
          'produto': 'produto',
          'descricao produto': 'descricaoProduto', 'descricaoproduto': 'descricaoProduto', 'descricao_produto': 'descricaoProduto',
          'juros': 'juros',
          'tabela mes': 'tabelaMes', 'tabelames': 'tabelaMes', 'tabela_mes': 'tabelaMes',
          'perc a vista': 'percAVista', 'percavista': 'percAVista',
          'restricao srcc': 'restricaoSRCC', 'restricaosrcc': 'restricaoSRCC',
        };

        console.log('Headers detectados:', headers);
        console.log('Mapeamento:', headers.map(h => `${h} => ${colMap[h] || 'NAO MAPEADO'}`));

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
  const totalSRCC = registrosFiltrados
    .filter(r => r.restricaoSRCC === 'Sim' || r.restricaoSRCC === 'SIM' || r.restricaoSRCC === 'sim')
    .reduce((s, r) => s + (parseFloat(r.valorLiquido || '0') || 0), 0);
  const totalVrLiquidoSRCC = totalVL - totalSRCC;
  const totalComissao = registrosFiltrados.reduce((s, r) => s + (parseFloat(r.totalComissao || '0') || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Consignado</h1>
            <p className="text-xs text-gray-500">Operações de crédito consignado</p>
          </div>
          <div className="ml-auto flex gap-2">
            <a
              href="/manus-storage/template_consignado_cd6bf8bb.xlsx"
              download="template_consignado.xlsx"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-purple-500 text-purple-700 hover:bg-purple-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Template
            </a>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50">
              <Upload className="w-4 h-4" /> Importar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const mes = filtroMes || '';
                if (!mes) { toast.error('Selecione um mês no filtro antes de recalcular.'); return; }
                recalcularMes.mutate({ mes });
              }}
              disabled={recalcularMes.isPending}
              className="flex items-center gap-2 border-purple-500 text-purple-700 hover:bg-purple-50"
              title="Recalcular Perc. Pago para todos os registros do mês selecionado"
            >
              <RefreshCw className={`w-4 h-4 ${recalcularMes.isPending ? 'animate-spin' : ''}`} />
              {recalcularMes.isPending ? 'Calculando...' : 'Recalcular Mês'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalEnviarCalculo(true)}
              disabled={enviarParaCalculo.isPending}
              className="flex items-center gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              title="Enviar registros para a aba Cálculo"
            >
              <Calculator className="w-4 h-4" />
              Enviar p/ Cálculo
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

      {/* Totalizador */}
      {mostrarTotalizador && (
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 Totalizador por Empresa e Mês/Ano</h2>
            <div className="grid grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Empresa</label>
                <select
                  value={empresaTotalizador}
                  onChange={(e) => setEmpresaTotalizador(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">-- Selecione --</option>
                  {empresas.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Mês/Ano (MMYY)</label>
                <select
                  value={mesAnoTotalizador}
                  onChange={(e) => setMesAnoTotalizador(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">-- Selecione --</option>
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {mesNumParaStr(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Button
                  onClick={() => { setMesAnoTotalizador(''); setEmpresaTotalizador(''); }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>
          {totalizador && (mesAnoTotalizador || empresaTotalizador) && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-green-200">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Total Vr. Líquido</p>
                <p className="text-lg font-bold text-green-700">{moeda(String(totalizador.totalVrLiquido))}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Total Comissão</p>
                <p className="text-lg font-bold text-blue-700">{moeda(String(totalizador.totalComissao))}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Registros</p>
                <p className="text-lg font-bold text-gray-700">{totalizador.registros}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filtroMes || '__all__'} onValueChange={v => setFiltroMes(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mês/Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os meses</SelectItem>
              {meses.map(m => <SelectItem key={m} value={m}>{mesNumParaStr(m)}</SelectItem>)}
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
        <div className="px-6 py-3 bg-blue-50 border-b flex gap-6 text-sm flex-wrap">
          <span className="font-medium text-blue-800">Total Vr. Líquido: <span className="font-bold">{moeda(String(totalVL))}</span></span>
          <span className="font-medium text-amber-800">Total SRCC: <span className="font-bold">{moeda(String(totalSRCC))}</span></span>
          <span className="font-medium text-purple-800">Total Vr. Líquido-SRCC: <span className="font-bold">{moeda(String(totalVrLiquidoSRCC))}</span></span>
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
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Restrição SRCC</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Perc. Pago</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Total Comissão</th>
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
                  <td className="px-2 py-1.5 border-b border-gray-100">{mesNumParaStr(r.mes)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 font-mono">{strVal(r.chaveJ)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 whitespace-nowrap">{strVal(r.nomeAgente)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.convenio)}</td>
                  <td className={`px-2 py-1.5 border-b border-gray-100 font-mono ${
                    r.isDuplicate ? 'bg-red-100 text-red-900 font-bold' : ''
                  }`}>
                    {strVal(r.nrOperacao)}
                    {r.isDuplicate && <span className="ml-1 text-red-600">⚠️</span>}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{moeda(r.valorBruto)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right font-semibold text-blue-800">{moeda(r.valorLiquido)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{moeda(r.rbm)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-center">{r.parcela ?? '-'}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.prefixoBB)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.dtContratacao)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.produto)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 max-w-32 truncate" title={r.descricaoProduto || ''}>{strVal(r.descricaoProduto)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{pctJuros(r.juros)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{strVal(r.restricaoSRCC)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right">{pct(r.percPago)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right font-semibold text-green-700">{moeda(r.totalComissao)}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100">{r.tabela && r.tabela !== 'NULL' && r.tabela !== '0' ? r.tabela.replace(/^Ativo(\d+)$/, 'Ativo $1').replace(/^Tabela(\d+)$/, 'Tabela $1') : '-'}</td>
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
              <Input type="number" value={form.parcela ?? ''} onChange={e => setForm(prev => ({ ...prev, parcela: e.target.value === '' ? undefined : Number(e.target.value) }))} placeholder="0" />
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
              <label className="text-xs font-medium text-gray-600 mb-1 block">Restrição SRCC</label>
              <Input value={form.restricaoSRCC || ''} onChange={e => setField('restricaoSRCC', e.target.value)} placeholder="Sim / Não" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Supervisor</label>
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

      {/* Modal Enviar para Cálculo */}
      <Dialog open={modalEnviarCalculo} onOpenChange={setModalEnviarCalculo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Enviar para Cálculo
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">
              Escolha como deseja enviar os registros para a aba <strong>Cálculo</strong>:
            </p>
            <div className="bg-blue-50 rounded-md p-3 text-xs text-blue-800">
              <p className="font-semibold mb-1">ℹ️ Regras de envio:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Chaves repetidas são agrupadas e os totais são somados</li>
                <li>Se já existe registro no Cálculo para a chave+mês, o campo <strong>Comissão Consig</strong> é atualizado</li>
                <li>Se não existe, um novo registro é criado com os dados do agente</li>
              </ul>
            </div>
            {selecionados.size > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                <strong>{selecionados.size}</strong> registro(s) selecionado(s) para envio individual
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setModalEnviarCalculo(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            {selecionados.size > 0 && (
              <Button
                onClick={() => enviarParaCalculo.mutate({ ids: Array.from(selecionados) })}
                disabled={enviarParaCalculo.isPending}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
              >
                {enviarParaCalculo.isPending ? 'Enviando...' : `Enviar Selecionados (${selecionados.size})`}
              </Button>
            )}
            <Button
              onClick={() => {
                if (!filtroMes) { toast.error('Selecione um mês no filtro antes de enviar.'); return; }
                enviarParaCalculo.mutate({ mes: filtroMes });
              }}
              disabled={enviarParaCalculo.isPending}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              {enviarParaCalculo.isPending ? 'Enviando...' : `Enviar Todo o Mês${filtroMes ? ` (${filtroMes})` : ''}`}
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
